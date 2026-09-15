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
