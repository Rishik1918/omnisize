export type MediaType = 'image' | 'video' | 'pdf' | 'document';

export interface ImageProcessingOptions {
  mode: 'compress' | 'resize' | 'upscale' | 'watermark';
  targetFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  targetSizeKB?: number;
  upscaleFactor?: 2 | 4;
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
  resolutionScale?: number;
  targetWidth?: number;
  targetHeight?: number;
  targetSizeMB?: number;
  videoBitrateKbps?: number;
  muteAudio: boolean;
  watermarkBox?: WatermarkBox;
}

export interface DocumentProcessingOptions {
  targetSizeKB?: number;
  qualityLevel: 'maximum' | 'balanced' | 'high';
  compressEmbeddedImages: boolean;
  maxImageDimension: number;
  stripMetadata: boolean;
}

export type PdfProcessingOptions = DocumentProcessingOptions;

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
