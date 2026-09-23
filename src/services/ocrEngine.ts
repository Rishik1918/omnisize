import { getDocumentProxy } from 'unpdf';
import { recognize } from 'tesseract.js';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

    const arrayBuffer = (await file.arrayBuffer()).slice(0);
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

  /**
   * Export OCR results to Microsoft Word (.docx) document
   */
  static async exportToDocx(pages: OcrPageResult[], documentTitle?: string): Promise<Blob> {
    const docChildren: (Paragraph)[] = [];

    if (documentTitle) {
      docChildren.push(
        new Paragraph({
          text: documentTitle,
          heading: HeadingLevel.TITLE,
          spacing: { after: 200 },
        })
      );
    }

    for (const page of pages) {
      if (pages.length > 1) {
        docChildren.push(
          new Paragraph({
            text: `Page ${page.pageNumber}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          })
        );
      }

      const paragraphs = page.text.split(/\n\s*\n/);
      for (const para of paragraphs) {
        const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;

        const textRuns = lines.map((line, idx) => 
          new TextRun({
            text: line + (idx < lines.length - 1 ? ' ' : ''),
            size: 22, // 11pt
            font: 'Calibri',
          })
        );

        docChildren.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 160 },
          })
        );
      }
    }

    const doc = new Document({
      sections: [{ children: docChildren }],
    });

    return await Packer.toBlob(doc);
  }

  /**
   * Export OCR results to formatted, searchable, editable PDF document
   */
  static async exportToPdf(pages: OcrPageResult[]): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const page of pages) {
      const pdfPage = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = pdfPage.getSize();
      const margin = 45;
      let y = height - margin;
      const fontSize = 10;
      const lineHeight = 13.5;
      const printableWidth = width - margin * 2;

      // Page Header
      if (pages.length > 1) {
        pdfPage.drawText(`Page ${page.pageNumber}`, {
          x: margin,
          y,
          size: 8,
          font: helveticaBold,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 18;
      }

      const rawLines = page.text.split('\n');
      for (const rawLine of rawLines) {
        const line = rawLine.trim();
        if (!line) {
          y -= lineHeight * 0.7;
          continue;
        }

        // New page check
        if (y < margin + lineHeight) {
          const newPdfPage = pdfDoc.addPage([595.28, 841.89]);
          y = newPdfPage.getSize().height - margin;
        }

        // Word wrapping
        const words = line.split(' ');
        let currentLine = '';
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = helvetica.widthOfTextAtSize(testLine, fontSize);
          if (textWidth > printableWidth && currentLine) {
            pdfPage.drawText(currentLine, {
              x: margin,
              y,
              size: fontSize,
              font: helvetica,
              color: rgb(0.1, 0.1, 0.1),
            });
            y -= lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          pdfPage.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize,
            font: helvetica,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= lineHeight;
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  }

  /**
   * Export PDF or Image pages as high-resolution JPG or PNG blobs
   */
  static async exportToImages(
    file: File | Blob,
    format: 'png' | 'jpeg' = 'png',
    scale: number = 2.0
  ): Promise<{ pageNumber: number; blob: Blob }[]> {
    const results: { pageNumber: number; blob: Blob }[] = [];
    const isPdf = (file as File).name?.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    if (isPdf) {
      const buffer = (await file.arrayBuffer()).slice(0);
      const proxy = await getDocumentProxy(new Uint8Array(buffer));
      for (let i = 1; i <= proxy.numPages; i++) {
        const page = await proxy.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await (page.render as any)({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b || new Blob()), format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
        });
        results.push({ pageNumber: i, blob });
      }
    } else {
      // For images, render to canvas and convert
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || new Blob()), format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
      });
      results.push({ pageNumber: 1, blob });
    }

    return results;
  }
}
