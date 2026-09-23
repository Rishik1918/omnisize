import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { getDocumentProxy } from 'unpdf';

export interface TextOverlay {
  id: string;
  pageIndex: number; // 0-indexed
  text: string;
  x: number; // PDF points
  y: number; // PDF points (from bottom-left)
  size: number;
  color: string; // hex or rgb
}

export interface ImageOverlay {
  id: string;
  pageIndex: number; // 0-indexed
  imageData: ArrayBuffer;
  imageType: 'png' | 'jpeg';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfEditPayload {
  rotations?: Record<number, number>; // pageIndex -> degrees (90, 180, 270)
  deletedPages?: number[]; // list of 0-indexed page numbers to remove
  textOverlays?: TextOverlay[];
  imageOverlays?: ImageOverlay[];
}

export class PdfStudioEngine {
  /**
   * Merge multiple PDF files into a single unified PDF
   */
  static async mergePdfs(files: File[], onProgress?: (pct: number) => void): Promise<Blob> {
    onProgress?.(10);
    const mergedDoc = await PDFDocument.create();

    const totalFiles = files.length;
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const buffer = await file.arrayBuffer();
      const donorDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const donorPages = await mergedDoc.copyPages(donorDoc, donorDoc.getPageIndices());

      for (const page of donorPages) {
        mergedDoc.addPage(page);
      }

      onProgress?.(15 + Math.round(((i + 1) / totalFiles) * 75));
    }

    onProgress?.(95);
    const pdfBytes = await mergedDoc.save();
    onProgress?.(100);
    const array = new Uint8Array(pdfBytes);
    return new Blob([array], { type: 'application/pdf' });
  }

  /**
   * Split a PDF into extracted pages based on range string (e.g. "1-3, 5, 7-9")
   */
  static async splitPdf(
    file: File | Blob,
    rangeString: string,
    onProgress?: (pct: number) => void
  ): Promise<{ blob: Blob; pageCount: number }> {
    onProgress?.(15);
    const buffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    const selectedIndices = this.parsePageRanges(rangeString, totalPages);
    if (selectedIndices.length === 0) {
      throw new Error(`No valid pages selected from range: "${rangeString}". Document has ${totalPages} pages.`);
    }

    onProgress?.(45);
    const splitDoc = await PDFDocument.create();
    const copiedPages = await splitDoc.copyPages(srcDoc, selectedIndices);

    for (const page of copiedPages) {
      splitDoc.addPage(page);
    }

    onProgress?.(85);
    const pdfBytes = await splitDoc.save();
    onProgress?.(100);
    const array = new Uint8Array(pdfBytes);
    return {
      blob: new Blob([array], { type: 'application/pdf' }),
      pageCount: selectedIndices.length,
    };
  }

  /**
   * Apply rich edits to PDF: text overlays, inserted photos/images, page rotations, and page removals
   */
  static async applyEdits(
    file: File | Blob,
    payload: PdfEditPayload,
    onProgress?: (pct: number) => void
  ): Promise<Blob> {
    onProgress?.(15);
    const buffer = await file.arrayBuffer();
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const helveticaFont = await doc.embedFont(StandardFonts.Helvetica);

    onProgress?.(30);

    // 1. Apply Rotations
    if (payload.rotations) {
      for (const [pageIdxStr, deg] of Object.entries(payload.rotations)) {
        const pageIdx = parseInt(pageIdxStr, 10);
        if (pageIdx >= 0 && pageIdx < doc.getPageCount()) {
          const page = doc.getPage(pageIdx);
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees((currentRotation + deg) % 360));
        }
      }
    }

    // 2. Insert Images / Photos
    if (payload.imageOverlays && payload.imageOverlays.length > 0) {
      for (const imgOverlay of payload.imageOverlays) {
        if (imgOverlay.pageIndex >= 0 && imgOverlay.pageIndex < doc.getPageCount()) {
          const page = doc.getPage(imgOverlay.pageIndex);
          const embeddedImage = imgOverlay.imageType === 'png'
            ? await doc.embedPng(imgOverlay.imageData)
            : await doc.embedJpg(imgOverlay.imageData);

          page.drawImage(embeddedImage, {
            x: imgOverlay.x,
            y: imgOverlay.y,
            width: imgOverlay.width,
            height: imgOverlay.height,
          });
        }
      }
    }

    // 3. Insert Text Overlays
    if (payload.textOverlays && payload.textOverlays.length > 0) {
      for (const textItem of payload.textOverlays) {
        if (textItem.pageIndex >= 0 && textItem.pageIndex < doc.getPageCount()) {
          const page = doc.getPage(textItem.pageIndex);
          const color = this.parseHexColor(textItem.color);

          page.drawText(textItem.text, {
            x: textItem.x,
            y: textItem.y,
            size: textItem.size || 12,
            font: helveticaFont,
            color,
          });
        }
      }
    }

    // 4. Delete Pages (must be deleted from highest index to lowest)
    if (payload.deletedPages && payload.deletedPages.length > 0) {
      const sortedToDelete = [...payload.deletedPages]
        .filter((idx) => idx >= 0 && idx < doc.getPageCount())
        .sort((a, b) => b - a);

      for (const pageIdx of sortedToDelete) {
        if (doc.getPageCount() > 1) {
          doc.removePage(pageIdx);
        }
      }
    }

    onProgress?.(85);
    const pdfBytes = await doc.save();
    onProgress?.(100);
    const array = new Uint8Array(pdfBytes);
    return new Blob([array], { type: 'application/pdf' });
  }

  /**
   * Render PDF page to HTML5 Canvas for real-time reader and visual editor preview
   */
  static async renderPageToCanvas(
    pdfBuffer: ArrayBuffer,
    pageNumber: number, // 1-indexed
    scale: number = 1.5
  ): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
    const proxy = await getDocumentProxy(new Uint8Array(pdfBuffer));
    const page = await proxy.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await (page.render as any)({
      canvasContext: ctx,
      viewport,
    }).promise;

    return { canvas, width: viewport.width, height: viewport.height };
  }

  /**
   * Helper to parse string ranges like "1-3, 5, 8-10" into 0-indexed page indices
   */
  private static parsePageRanges(rangeStr: string, totalPages: number): number[] {
    const indices = new Set<number>();
    const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = Math.max(1, parseInt(startStr, 10));
        const end = Math.min(totalPages, parseInt(endStr, 10));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let p = start; p <= end; p++) {
            indices.add(p - 1);
          }
        }
      } else {
        const page = parseInt(part, 10);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
          indices.add(page - 1);
        }
      }
    }

    return Array.from(indices).sort((a, b) => a - b);
  }

  private static parseHexColor(hex: string) {
    if (!hex || !hex.startsWith('#')) return rgb(0, 0, 0);
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16) / 255;
      const g = parseInt(clean.substring(2, 4), 16) / 255;
      const b = parseInt(clean.substring(4, 6), 16) / 255;
      return rgb(r, g, b);
    }
    return rgb(0, 0, 0);
  }
}
