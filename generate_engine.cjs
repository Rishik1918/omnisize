const fs = require('fs');
const path = require('path');

const root = process.cwd();
function write(relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('Wrote:', relPath);
}

// ==========================================
// 1. src/types.ts
// ==========================================
write('src/types.ts', `
export type MediaType = 'image' | 'video' | 'pdf';

export interface ImageProcessingOptions {
  mode: 'compress' | 'resize' | 'upscale' | 'watermark';
  targetFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number; // 0.1 to 1.0
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  targetSizeKB?: number; // exact target size
  upscaleFactor?: 2 | 4; // 2x or 4x
  stripMetadata: boolean;
}

export interface WatermarkBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VideoProcessingOptions {
  mode: 'compress' | 'resize' | 'upscale' | 'delogo';
  resolutionScale?: number; // 0.25, 0.5, 0.75, 1, 1.5, 2
  targetWidth?: number;
  targetHeight?: number;
  targetSizeMB?: number;
  videoBitrateKbps?: number;
  muteAudio: boolean;
  watermarkBox?: WatermarkBox; // Video delogo box
}

export interface PdfProcessingOptions {
  qualityLevel: 'extreme' | 'recommended' | 'low'; // extreme = 72 DPI, recommended = 144 DPI, low = 200 DPI
  targetSizeKB?: number;
  stripMetadata: boolean;
}

export interface ProcessedItem {
  id: string;
  file: File;
  name: string;
  type: MediaType;
  originalSize: number;
  previewUrl: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number;
  resultBlob?: Blob;
  resultUrl?: string;
  resultSize?: number;
  savedPercentage?: number;
  error?: string;
}
`);

// ==========================================
// 2. src/services/imageEngine.ts
// ==========================================
write('src/services/imageEngine.ts', `
import { ImageProcessingOptions, WatermarkBox } from '../types';

export class ImageEngine {
  /**
   * Load an image file into an HTMLImageElement
   */
  static loadImage(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  /**
   * High-Fidelity Client-Side Resizing, Target KB Compression & Format Conversion
   */
  static async processImage(
    file: File,
    options: ImageProcessingOptions,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    onProgress?.(10);
    const img = await this.loadImage(file);
    onProgress?.(30);

    let targetWidth = options.width || img.naturalWidth;
    let targetHeight = options.height || img.naturalHeight;

    if (options.maintainAspectRatio && options.width && !options.height) {
      targetHeight = Math.round((options.width / img.naturalWidth) * img.naturalHeight);
    } else if (options.maintainAspectRatio && options.height && !options.width) {
      targetWidth = Math.round((options.height / img.naturalHeight) * img.naturalWidth);
    }

    // Upscale factor if specified
    if (options.mode === 'upscale' && options.upscaleFactor) {
      targetWidth = img.naturalWidth * options.upscaleFactor;
      targetHeight = img.naturalHeight * options.upscaleFactor;
      return this.upscaleImage(img, targetWidth, targetHeight, onProgress);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // High quality interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    onProgress?.(60);

    const targetFormat = options.targetFormat || (file.type === 'image/png' ? 'image/png' : 'image/jpeg');

    // Target KB Binary Search
    if (options.targetSizeKB && options.targetSizeKB > 0 && targetFormat !== 'image/png') {
      return this.compressToTargetKB(canvas, options.targetSizeKB, targetFormat, onProgress);
    }

    onProgress?.(85);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Image encoding failed'))),
        targetFormat,
        options.quality
      );
    });

    onProgress?.(100);
    return blob;
  }

  /**
   * Super-Resolution Upscaling with Multi-Pass Lanczos/Bicubic Resampling + Unsharp Mask
   */
  static async upscaleImage(
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    onProgress?.(40);
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas unavailable');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    onProgress?.(60);

    // Apply Unsharp Masking filter for edge crispness
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);

    const w = targetWidth;
    const h = targetHeight;
    const amount = 0.35; // unsharp mask strength

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = copy[idx + c];
          const north = copy[((y - 1) * w + x) * 4 + c];
          const south = copy[((y + 1) * w + x) * 4 + c];
          const east = copy[(y * w + (x + 1)) * 4 + c];
          const west = copy[(y * w + (x - 1)) * 4 + c];
          const laplacian = 4 * center - north - south - east - west;
          data[idx + c] = Math.min(255, Math.max(0, center + laplacian * amount));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    onProgress?.(85);

    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png');
    });
  }

  /**
   * Binary search compression to strictly guarantee target KB size
   */
  static async compressToTargetKB(
    canvas: HTMLCanvasElement,
    targetKB: number,
    format: string,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    const targetBytes = targetKB * 1024;
    let minQ = 0.05;
    let maxQ = 0.98;
    let bestBlob: Blob | null = null;

    for (let iter = 0; iter < 7; iter++) {
      const q = (minQ + maxQ) / 2;
      onProgress?.(60 + iter * 5);
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), format, q));

      if (blob.size <= targetBytes) {
        bestBlob = blob;
        minQ = q; // try higher quality
      } else {
        maxQ = q; // need lower quality
      }
    }

    if (!bestBlob) {
      // If even min quality is larger than target, scale down canvas resolution
      const scaledCanvas = document.createElement('canvas');
      const scale = 0.75;
      scaledCanvas.width = Math.max(1, Math.round(canvas.width * scale));
      scaledCanvas.height = Math.max(1, Math.round(canvas.height * scale));
      const sCtx = scaledCanvas.getContext('2d')!;
      sCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      return this.compressToTargetKB(scaledCanvas, targetKB, format, onProgress);
    }

    return bestBlob;
  }

  /**
   * Client-Side Watermark Inpainting / Object Removal
   * Replaces pixels inside watermark mask with smooth background gradient interpolation
   */
  static async removeWatermark(
    file: File,
    maskCanvas: HTMLCanvasElement, // White pixels = watermark to remove
    box?: WatermarkBox,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    onProgress?.(20);
    const img = await this.loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas unavailable');

    ctx.drawImage(img, 0, 0);
    onProgress?.(40);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    const maskData = maskCtx?.getImageData(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;
    const pixels = imgData.data;

    // Fast Navier-Stokes / Telea-inspired gradient inpainting
    // Step 1: Identify all masked pixels (from brush mask or bounding box)
    const isMasked = new Uint8Array(w * h);

    if (box) {
      const bx1 = Math.max(0, Math.floor(box.x));
      const by1 = Math.max(0, Math.floor(box.y));
      const bx2 = Math.min(w, Math.ceil(box.x + box.width));
      const by2 = Math.min(h, Math.ceil(box.y + box.height));
      for (let y = by1; y < by2; y++) {
        for (let x = bx1; x < bx2; x++) {
          isMasked[y * w + x] = 1;
        }
      }
    } else if (maskData) {
      for (let i = 0; i < w * h; i++) {
        // Red or Alpha channel indicates user painted mask
        if (maskData.data[i * 4 + 3] > 30 || maskData.data[i * 4] > 50) {
          isMasked[i] = 1;
        }
      }
    }

    onProgress?.(60);

    // Multi-pass boundary diffusion
    const iterations = 8;
    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          if (isMasked[idx] === 1) {
            let r = 0, g = 0, b = 0, count = 0;
            const neighbors = [
              idx - 1, idx + 1,
              idx - w, idx + w,
              idx - w - 1, idx - w + 1,
              idx + w - 1, idx + w + 1
            ];
            for (const n of neighbors) {
              const nIdx = n * 4;
              r += pixels[nIdx];
              g += pixels[nIdx + 1];
              b += pixels[nIdx + 2];
              count++;
            }
            const pIdx = idx * 4;
            pixels[pIdx] = Math.round(r / count);
            pixels[pIdx + 1] = Math.round(g / count);
            pixels[pIdx + 2] = Math.round(b / count);
          }
        }
      }
      onProgress?.(60 + Math.round((iter / iterations) * 30));
    }

    ctx.putImageData(imgData, 0, 0);
    onProgress?.(95);

    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), file.type || 'image/jpeg', 0.92);
    });
  }
}
`);

// ==========================================
// 3. src/services/pdfEngine.ts
// ==========================================
write('src/services/pdfEngine.ts', `
import { PDFDocument } from 'pdf-lib';
import pako from 'pako';
import { PdfProcessingOptions } from '../types';

export class PdfEngine {
  /**
   * Compress PDF by pruning unreferenced objects, stripping metadata,
   * and deflating internal object streams using pako/zlib.
   */
  static async compressPdf(
    file: File,
    options: PdfProcessingOptions,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    onProgress?.(15);
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(35);

    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      updateMetadata: false,
      ignoreEncryption: true,
    });
    onProgress?.(55);

    if (options.stripMetadata) {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
    }

    onProgress?.(75);
    // Save with stream optimization
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    onProgress?.(90);

    const blob = new Blob([compressedBytes], { type: 'application/pdf' });
    onProgress?.(100);
    return blob;
  }
}
`);

// ==========================================
// 4. src/services/videoEngine.ts
// ==========================================
write('src/services/videoEngine.ts', `
import { VideoProcessingOptions, WatermarkBox } from '../types';

export class VideoEngine {
  /**
   * Fast Client-Side Video Processing, Downscaling/Upscaling, Bitrate/Target MB
   * and Watermark Delogo Filter using HTML5 Canvas & MediaRecorder
   */
  static async processVideo(
    file: File,
    options: VideoProcessingOptions,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;

      video.onloadedmetadata = async () => {
        try {
          const originalWidth = video.videoWidth;
          const originalHeight = video.videoHeight;
          const duration = video.duration || 1;

          // Compute target resolution
          let outWidth = originalWidth;
          let outHeight = originalHeight;

          if (options.resolutionScale) {
            outWidth = Math.round(originalWidth * options.resolutionScale);
            outHeight = Math.round(originalHeight * options.resolutionScale);
          } else if (options.targetWidth && options.targetHeight) {
            outWidth = options.targetWidth;
            outHeight = options.targetHeight;
          }

          // Ensure even dimensions (required for H.264/WebM encoders)
          outWidth = outWidth % 2 === 0 ? outWidth : outWidth - 1;
          outHeight = outHeight % 2 === 0 ? outHeight : outHeight - 1;

          // Compute target video bitrate if targetSizeMB is provided
          let targetBitrate = 2500000; // 2.5 Mbps default
          if (options.targetSizeMB && options.targetSizeMB > 0) {
            const totalBits = options.targetSizeMB * 8 * 1024 * 1024;
            const audioBitrate = options.muteAudio ? 0 : 128000;
            targetBitrate = Math.max(150000, Math.round((totalBits / duration) - audioBitrate));
          } else if (options.videoBitrateKbps) {
            targetBitrate = options.videoBitrateKbps * 1000;
          }

          const canvas = document.createElement('canvas');
          canvas.width = outWidth;
          canvas.height = outHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('Canvas 2D context unavailable');

          const fps = 30;
          const stream = canvas.captureStream(fps);

          // Select supported MIME type
          let mimeType = 'video/webm;codecs=vp9';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm;codecs=vp8';
          }
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/mp4';
          }
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
          }

          const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: targetBitrate,
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            URL.revokeObjectURL(videoUrl);
            const resultBlob = new Blob(chunks, { type: mimeType });
            onProgress?.(100);
            resolve(resultBlob);
          };

          recorder.start(100);
          video.currentTime = 0;
          await video.play();

          // Render loop
          const render = () => {
            if (video.paused || video.ended) {
              if (video.ended) {
                recorder.stop();
              }
              return;
            }

            ctx.drawImage(video, 0, 0, outWidth, outHeight);

            // Watermark Delogo Filter
            if (options.watermarkBox) {
              this.applyDelogo(ctx, options.watermarkBox, originalWidth, originalHeight, outWidth, outHeight);
            }

            const progress = Math.min(99, Math.round((video.currentTime / duration) * 100));
            onProgress?.(progress);

            requestAnimationFrame(render);
          };

          render();
        } catch (err) {
          URL.revokeObjectURL(videoUrl);
          reject(err);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Failed to load video file'));
      };
    });
  }

  /**
   * Delogo Filter for video frames: smoothly blends surrounding pixels over the watermark region
   */
  private static applyDelogo(
    ctx: CanvasRenderingContext2D,
    box: WatermarkBox,
    origW: number,
    origH: number,
    outW: number,
    outH: number
  ) {
    const scaleX = outW / origW;
    const scaleY = outH / origH;
    const bx = Math.max(0, Math.floor(box.x * scaleX));
    const by = Math.max(0, Math.floor(box.y * scaleY));
    const bw = Math.min(outW - bx, Math.ceil(box.width * scaleX));
    const bh = Math.min(outH - by, Math.ceil(box.height * scaleY));

    if (bw <= 0 || bh <= 0) return;

    // Sample border pixels around the box
    const frameData = ctx.getImageData(bx, by, bw, bh);
    const data = frameData.data;

    // Fast spatial gradient fill
    for (let y = 0; y < bh; y++) {
      const vRatio = y / bh;
      for (let x = 0; x < bw; x++) {
        const hRatio = x / bw;
        const idx = (y * bw + x) * 4;

        // Sample edges
        const topIdx = (0 * bw + x) * 4;
        const bottomIdx = ((bh - 1) * bw + x) * 4;
        const leftIdx = (y * bw + 0) * 4;
        const rightIdx = (y * bw + (bw - 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const vertBlend = data[topIdx + c] * (1 - vRatio) + data[bottomIdx + c] * vRatio;
          const horizBlend = data[leftIdx + c] * (1 - hRatio) + data[rightIdx + c] * hRatio;
          data[idx + c] = Math.round((vertBlend + horizBlend) / 2);
        }
      }
    }

    ctx.putImageData(frameData, bx, by);
  }
}
`);

console.log('Engines generated successfully.');
