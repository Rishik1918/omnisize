import { getDocumentProxy } from 'unpdf';
import { recognize } from 'tesseract.js';

export interface OcrProgress {
  currentPage: number;
  totalPages: number;
  status: string;
  percent: number;
}

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
}

export class OcrEngine {
  /**
   * Run OCR on any image file (PNG, JPG, WebP, etc.)
   */
  static async runOcrOnImage(
    file: File | Blob,
    onProgress?: (p: OcrProgress) => void
  ): Promise<string> {
    onProgress?.({
      currentPage: 1,
      totalPages: 1,
      status: 'Analyzing image characters...',
      percent: 15,
    });

    const result = await recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress) {
          onProgress?.({
            currentPage: 1,
            totalPages: 1,
            status: 'Recognizing text...',
            percent: 20 + Math.round(m.progress * 75),
          });
        }
      },
    });

    onProgress?.({
      currentPage: 1,
      totalPages: 1,
      status: 'OCR Completed',
      percent: 100,
    });

    return result.data.text.trim();
  }

  /**
   * Run OCR across all or selected pages of any PDF document of arbitrary length
   */
  static async runOcrOnPdf(
    file: File | Blob,
    pageRange?: number[], // 1-indexed, optional
    onProgress?: (p: OcrProgress) => void
  ): Promise<{ fullText: string; pages: OcrPageResult[] }> {
    onProgress?.({
      currentPage: 0,
      totalPages: 0,
      status: 'Loading PDF document...',
      percent: 5,
    });

    const arrayBuffer = await file.arrayBuffer();
    const proxy = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const totalPdfPages = proxy.numPages;

    const targetPages: number[] = pageRange && pageRange.length > 0
      ? pageRange.filter((p) => p >= 1 && p <= totalPdfPages)
      : Array.from({ length: totalPdfPages }, (_, i) => i + 1);

    const totalToProcess = targetPages.length;
    const pageResults: OcrPageResult[] = [];

    for (let index = 0; index < totalToProcess; index++) {
      const pageNum = targetPages[index];
      const pageBasePercent = Math.round((index / totalToProcess) * 90);

      onProgress?.({
        currentPage: pageNum,
        totalPages: totalPdfPages,
        status: `Rendering page ${pageNum} for OCR...`,
        percent: pageBasePercent + 2,
      });

      // Render PDF page to canvas
      const page = await proxy.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x for sharp optical recognition

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

      onProgress?.({
        currentPage: pageNum,
        totalPages: totalPdfPages,
        status: `Recognizing text on page ${pageNum} of ${totalPdfPages}...`,
        percent: pageBasePercent + 10,
      });

      const ocrRes = await recognize(canvas, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress) {
            const pageStep = Math.round(m.progress * (80 / totalToProcess));
            onProgress?.({
              currentPage: pageNum,
              totalPages: totalPdfPages,
              status: `Processing page ${pageNum} (${Math.round(m.progress * 100)}%)...`,
              percent: Math.min(95, pageBasePercent + pageStep),
            });
          }
        },
      });

      const pageText = ocrRes.data.text.trim();
      pageResults.push({
        pageNumber: pageNum,
        text: pageText,
        confidence: ocrRes.data.confidence || 0,
      });
    }

    onProgress?.({
      currentPage: totalPdfPages,
      totalPages: totalPdfPages,
      status: 'OCR Completed Successfully',
      percent: 100,
    });

    const fullText = pageResults
      .map((p) => `--- PAGE ${p.pageNumber} ---\n\n${p.text}`)
      .join('\n\n\n');

    return { fullText, pages: pageResults };
  }
}
