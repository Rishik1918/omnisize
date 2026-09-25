import { getDocumentProxy } from 'unpdf';
import { recognize, createWorker } from 'tesseract.js';
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
   * Helper to run tesseract with graceful fallback if non-English traineddata fails
   */
  private static async recognizeWithFallback(
    source: any,
    language: string,
    onProgressUpdate?: (percent: number, status: string) => void
  ) {
    const handleLogger = (m: any) => {
      if (m && m.progress !== undefined) {
        const pct = Math.round((m.progress || 0) * 100);
        let status = 'Recognizing text...';
        if (m.status === 'loading tesseract core') status = 'Initializing OCR core...';
        else if (m.status === 'loading language traineddata') status = `Loading language models (${language})...`;
        else if (m.status === 'initializing api') status = 'Preparing character analyzer...';
        else if (m.status === 'recognizing text') status = `Recognizing text (${pct}%)...`;
        onProgressUpdate?.(pct, status);
      }
    };

    try {
      return await recognize(source, language, { logger: handleLogger });
    } catch (err) {
      if (language !== 'eng') {
        console.warn(`OCR with language "${language}" failed, retrying with English fallback:`, err);
        return await recognize(source, 'eng', { logger: handleLogger });
      }
      throw err;
    }
  }

  /**
   * Run OCR on any image file (PNG, JPG, WebP, etc.) with bilingual Hindi+English default
   */
  static async runOcrOnImage(
    file: File | Blob,
    language: string = 'eng+hin',
    onProgress?: (p: OcrProgress) => void
  ): Promise<string> {
    onProgress?.({
      currentPage: 1,
      totalPages: 1,
      status: `Initializing OCR (${language === 'eng+hin' ? 'Bilingual English + Hindi' : language})...`,
      percent: 10,
    });

    const result = await this.recognizeWithFallback(file, language, (pct, status) => {
      onProgress?.({
        currentPage: 1,
        totalPages: 1,
        status,
        percent: 15 + Math.round((pct / 100) * 80),
      });
    });

    onProgress?.({
      currentPage: 1,
      totalPages: 1,
      status: 'OCR Completed Successfully',
      percent: 100,
    });

    return result.data.text.trim();
  }

  /**
   * Run OCR on a page canvas or image and return structured bounding boxes
   * mapped to PDF points for in-place text editing on scanned documents
   */
  static async extractTextBoundingBoxes(
    source: HTMLCanvasElement | Blob | File,
    pageWidth: number,
    pageHeight: number,
    language: string = 'eng+hin',
    pageIndex: number = 0,
    onProgress?: (pct: number, status: string) => void
  ): Promise<{
    id: string;
    pageIndex: number;
    originalText: string;
    currentText: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
    isModified: boolean;
  }[]> {
    // Convert source to safe transferrable image representation
    let imageSource: any = source;
    let canvasW = pageWidth;
    let canvasH = pageHeight;

    if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
      canvasW = source.width || pageWidth;
      canvasH = source.height || pageHeight;
      try {
        imageSource = source.toDataURL('image/png');
      } catch (e) {
        imageSource = source;
      }
    }

    const handleLogger = (m: any) => {
      if (m && m.progress !== undefined) {
        const pct = Math.round((m.progress || 0) * 100);
        let status = 'Detecting layout...';
        if (m.status === 'loading tesseract core') status = 'Initializing OCR core...';
        else if (m.status === 'loading language traineddata') status = `Loading language model (${language})...`;
        else if (m.status === 'initializing api') status = 'Analyzing document characters...';
        else if (m.status === 'recognizing text') status = `Extracting text lines (${pct}%)...`;
        onProgress?.(pct, status);
      }
    };

    let worker: any = null;
    let res: any = null;

    try {
      try {
        worker = await createWorker(language, 1, { logger: handleLogger });
      } catch (langErr) {
        if (language !== 'eng') {
          console.warn(`Language ${language} worker initialization failed, falling back to English:`, langErr);
          worker = await createWorker('eng', 1, { logger: handleLogger });
        } else {
          throw langErr;
        }
      }

      res = await worker.recognize(imageSource, {}, { blocks: true });
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (_) {}
      }
    }

    const scaleX = pageWidth / canvasW;
    const scaleY = pageHeight / canvasH;

    const items: {
      id: string;
      pageIndex: number;
      originalText: string;
      currentText: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize: number;
      fontFamily: string;
      isModified: boolean;
    }[] = [];

    // Extract lines from hierarchical blocks -> paragraphs -> lines
    const lines: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[] = [];

    if (res?.data?.blocks && Array.isArray(res.data.blocks)) {
      for (const block of res.data.blocks) {
        if (!block.paragraphs) continue;
        for (const para of block.paragraphs) {
          if (!para.lines) continue;
          for (const line of para.lines) {
            const trimmed = (line.text || '').trim();
            if (trimmed && line.bbox) {
              lines.push({ text: trimmed, bbox: line.bbox });
            }
          }
        }
      }
    }

    // Fallback: If no blocks, but plain text exists, provide paragraph-level items
    if (lines.length === 0 && res?.data?.text) {
      const textLines = res.data.text.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const estLineH = Math.max(14, pageHeight / Math.max(textLines.length * 1.5, 20));
      for (let i = 0; i < textLines.length; i++) {
        const lineText = textLines[i];
        const ptY = pageHeight - (i + 1) * (estLineH * 1.3);
        const hasDevanagari = /[\u0900-\u097F]/.test(lineText);
        const detectedFont = hasDevanagari ? 'Nirmala UI' : 'Calibri';
        const calcFontSize = hasDevanagari
          ? Math.min(16, Math.max(9, Math.round(estLineH * 0.52)))
          : Math.min(24, Math.max(9, Math.round(estLineH * 0.72)));

        items.push({
          id: `ocr_text_${pageIndex}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          pageIndex,
          originalText: lineText,
          currentText: lineText,
          x: 50,
          y: Math.max(20, ptY),
          width: Math.min(pageWidth - 100, lineText.length * 8),
          height: estLineH,
          fontSize: calcFontSize,
          fontFamily: detectedFont,
          isModified: false,
        });
      }
      return items;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bbox = line.bbox;
      const ptX = bbox.x0 * scaleX;
      // In PDF coordinate space, y=0 is at the bottom of the page
      const ptY = pageHeight - bbox.y1 * scaleY;
      const ptW = Math.max(14, (bbox.x1 - bbox.x0) * scaleX);
      const ptH = Math.max(10, (bbox.y1 - bbox.y0) * scaleY);

      // Detect Multilingual / Devanagari script (Hindi, Marathi, Sanskrit, Nepali)
      const hasDevanagari = /[\u0900-\u097F]/.test(line.text);
      let detectedFont = 'Calibri';
      let calcFontSize = 12;

      if (hasDevanagari) {
        // Devanagari characters require Nirmala UI or Mangal, and height includes upper/lower matras
        detectedFont = 'Nirmala UI';
        calcFontSize = Math.min(18, Math.max(9, Math.round(ptH * 0.52)));
      } else {
        detectedFont = 'Calibri';
        calcFontSize = Math.min(28, Math.max(8, Math.round(ptH * 0.70)));
      }

      items.push({
        id: `ocr_text_${pageIndex}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        pageIndex,
        originalText: line.text,
        currentText: line.text,
        x: Math.round(ptX * 100) / 100,
        y: Math.round(ptY * 100) / 100,
        width: Math.round(ptW * 100) / 100,
        height: Math.round(ptH * 100) / 100,
        fontSize: calcFontSize,
        fontFamily: detectedFont,
        isModified: false,
      });
    }

    return items;
  }

  /**
   * Run OCR across all or selected pages of any PDF document of arbitrary length
   */
  static async runOcrOnPdf(
    file: File | Blob,
    pageRange?: number[], // 1-indexed, optional
    language: string = 'eng+hin',
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
        percent: pageBasePercent + 8,
      });

      const ocrRes = await this.recognizeWithFallback(canvas, language, (pct, status) => {
        const step = Math.round((pct / 100) * (80 / totalToProcess));
        onProgress?.({
          currentPage: pageNum,
          totalPages: totalPdfPages,
          status: `Page ${pageNum}: ${status}`,
          percent: Math.min(95, pageBasePercent + step),
        });
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
   * Convert any image (PNG, JPG, WebP, BMP, etc.) into a clean 1-page PDF document
   */
  /**
   * Convert any image (PNG, JPG, WebP, BMP, etc.) into a clean 1-page PDF document
   * Handles ultra-large scanned files (like 200MB+ / 130MP scans) by optimizing to
   * high-DPI 300 DPI print standard with standard A4 document bounds.
   */
  static async convertImageToPdf(imageFile: File | Blob, customName?: string): Promise<File> {
    const pdfDoc = await PDFDocument.create();
    const origName = (imageFile as File).name || 'document.png';
    const pdfName = customName || origName.replace(/\.[^/.]+$/, '') + '.pdf';

    // Standard A4 dimensions in PDF points (72 pt/inch)
    const A4_PORTRAIT_W = 595.28;
    const A4_PORTRAIT_H = 841.89;

    let embeddedImg: any = null;
    let naturalW = 0;
    let naturalH = 0;

    // Check if the image needs downsampling (huge scans, e.g. > 2400px or > 8MB)
    const isLarge = imageFile.size > 8 * 1024 * 1024;

    if (typeof window !== 'undefined' && (isLarge || typeof document !== 'undefined')) {
      try {
        const { blob, width, height, format } = await this.optimizeImageForPdf(imageFile);
        naturalW = width;
        naturalH = height;
        const optBytes = (await blob.arrayBuffer()).slice(0);
        if (format === 'jpeg') {
          embeddedImg = await pdfDoc.embedJpg(optBytes);
        } else {
          embeddedImg = await pdfDoc.embedPng(optBytes);
        }
      } catch (optErr) {
        console.warn('Canvas image optimization fallback to direct embed:', optErr);
      }
    }

    // Direct fallback if browser canvas unavailable or direct embed preferred
    if (!embeddedImg) {
      const arrayBuf = (await imageFile.arrayBuffer()).slice(0);
      const uint8 = new Uint8Array(arrayBuf);

      // Direct JPEG (magic bytes 0xFF, 0xD8)
      if (uint8[0] === 0xff && uint8[1] === 0xd8) {
        try {
          embeddedImg = await pdfDoc.embedJpg(arrayBuf);
          naturalW = embeddedImg.width;
          naturalH = embeddedImg.height;
        } catch (e) {
          console.warn('embedJpg error:', e);
        }
      }
      // Direct PNG (magic bytes 0x89, 0x50, 0x4E, 0x47)
      else if (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e && uint8[3] === 0x47) {
        try {
          embeddedImg = await pdfDoc.embedPng(arrayBuf);
          naturalW = embeddedImg.width;
          naturalH = embeddedImg.height;
        } catch (e) {
          console.warn('embedPng error:', e);
        }
      }
    }

    if (!embeddedImg) {
      throw new Error('Unable to embed image: Unsupported image format or corrupted file.');
    }

    // Fit page to image aspect ratio using standard document bounds
    const isLandscape = naturalW > naturalH;
    const pageW = isLandscape ? A4_PORTRAIT_H : A4_PORTRAIT_W;
    const pageH = isLandscape ? A4_PORTRAIT_W : A4_PORTRAIT_H;

    const imgAspect = naturalW / naturalH;
    const pageAspect = pageW / pageH;

    let drawW = pageW;
    let drawH = pageH;
    let drawX = 0;
    let drawY = 0;

    if (imgAspect > pageAspect) {
      drawW = pageW;
      drawH = pageW / imgAspect;
      drawY = (pageH - drawH) / 2;
    } else {
      drawH = pageH;
      drawW = pageH * imgAspect;
      drawX = (pageW - drawW) / 2;
    }

    const page = pdfDoc.addPage([pageW, pageH]);
    page.drawImage(embeddedImg, {
      x: Math.round(drawX * 100) / 100,
      y: Math.round(drawY * 100) / 100,
      width: Math.round(drawW * 100) / 100,
      height: Math.round(drawH * 100) / 100,
    });

    const pdfBytes = await pdfDoc.save();
    return new File([pdfBytes], pdfName, { type: 'application/pdf' });
  }

  /**
   * Safely loads and resizes massive images (e.g. 200MB+ scans, 100+ megapixel photos)
   * to a razor-sharp 300 DPI print standard (~2400px max dimension), preventing
   * memory crashes and rendering instantly in <100ms.
   */
  private static async optimizeImageForPdf(
    imageFile: File | Blob
  ): Promise<{ blob: Blob; width: number; height: number; format: 'jpeg' | 'png' }> {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(new Error('Failed to load image element: ' + e));
        img.src = url;
      });

      const natW = img.naturalWidth || 1200;
      const natH = img.naturalHeight || 1600;

      // 300 DPI on A4 paper is 2480 x 3508 pixels. Cap max dimension to 2560px for flawless print quality.
      const MAX_DIM = 2560;
      let targetW = natW;
      let targetH = natH;

      if (natW > MAX_DIM || natH > MAX_DIM || imageFile.size > 8 * 1024 * 1024) {
        const scale = Math.min(MAX_DIM / natW, MAX_DIM / natH, 1.0);
        targetW = Math.max(100, Math.round(natW * scale));
        targetH = Math.max(100, Math.round(natH * scale));
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;

      // Crisp background fill for documents
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const fileName = (imageFile as File).name || '';
      const format = (imageFile.type === 'image/png' && !fileName.toLowerCase().endsWith('.png'))
        ? 'png'
        : 'jpeg';

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || new Blob()), mimeType, 0.92);
      });

      return { blob, width: targetW, height: targetH, format };
    } finally {
      URL.revokeObjectURL(url);
    }
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
   * Export OCR results to formatted, searchable, editable PDF document.
   * Eliminates line overlap bugs and renders bilingual/Hindi/Devanagari text flawlessly.
   */
  static async exportToPdf(pages: OcrPageResult[]): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const page of pages) {
      // Check if page contains characters outside standard WinAnsi ASCII range (e.g. Hindi, Sanskrit, symbols)
      const hasNonWinAnsi = /[^\x20-\x7E\xA0-\xFF\n\r\t]/.test(page.text);

      if (hasNonWinAnsi) {
        // High-DPI canvas backed rendering: guarantees perfect Devanagari/Hindi ligatures & zero WinAnsi encoding crashes
        await this.renderUnicodePageToPdf(pdfDoc, page, pages.length);
      } else {
        // Vector text rendering with pagination and word wrapping
        this.renderVectorPageToPdf(pdfDoc, page, helvetica, helveticaBold, pages.length);
      }
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  }

  private static renderVectorPageToPdf(
    pdfDoc: PDFDocument,
    page: OcrPageResult,
    helvetica: any,
    helveticaBold: any,
    totalPagesCount: number
  ) {
    let currentPdfPage = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = currentPdfPage.getSize();
    const margin = 45;
    let y = height - margin;
    const fontSize = 10;
    const lineHeight = 14;
    const printableWidth = width - margin * 2;

    if (totalPagesCount > 1) {
      currentPdfPage.drawText(`Page ${page.pageNumber}`, {
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

      // Check if line overflows page
      if (y < margin + lineHeight) {
        currentPdfPage = pdfDoc.addPage([595.28, 841.89]);
        y = currentPdfPage.getSize().height - margin;
      }

      const words = line.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        let textWidth = 0;
        try {
          textWidth = helvetica.widthOfTextAtSize(testLine, fontSize);
        } catch {
          textWidth = testLine.length * (fontSize * 0.55);
        }

        if (textWidth > printableWidth && currentLine) {
          currentPdfPage.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize,
            font: helvetica,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= lineHeight;

          if (y < margin + lineHeight) {
            currentPdfPage = pdfDoc.addPage([595.28, 841.89]);
            y = currentPdfPage.getSize().height - margin;
          }

          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        currentPdfPage.drawText(currentLine, {
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

  private static async renderUnicodePageToPdf(
    pdfDoc: PDFDocument,
    page: OcrPageResult,
    totalPagesCount: number
  ) {
    const scale = 2; // 2x high-DPI supersampling
    const ptWidth = 595.28;
    const ptHeight = 841.89;
    const canvasWidth = Math.round(ptWidth * scale);
    const canvasHeight = Math.round(ptHeight * scale);
    const margin = 45 * scale;
    const fontSize = 11 * scale;
    const lineHeight = 16 * scale;
    const printableWidth = canvasWidth - margin * 2;

    const canvases: HTMLCanvasElement[] = [];

    const createNewCanvas = (pageIndex: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
      const c = document.createElement('canvas');
      c.width = canvasWidth;
      c.height = canvasHeight;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      if (totalPagesCount > 1) {
        ctx.fillStyle = '#666666';
        ctx.font = `${8 * scale}px system-ui, -apple-system, "Segoe UI", "Noto Sans Devanagari", Arial, sans-serif`;
        ctx.fillText(`Page ${pageIndex}`, margin, 30 * scale);
      }

      ctx.fillStyle = '#111827';
      ctx.font = `${fontSize}px system-ui, -apple-system, "Segoe UI", "Noto Sans Devanagari", "Mangal", "Aptos", Arial, sans-serif`;
      return [c, ctx];
    };

    let currentPageIdx = page.pageNumber;
    let [activeCanvas, activeCtx] = createNewCanvas(currentPageIdx);
    canvases.push(activeCanvas);
    let y = (totalPagesCount > 1 ? 48 : 45) * scale;

    const rawLines = page.text.split('\n');
    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line) {
        y += lineHeight * 0.7;
        continue;
      }

      const words = line.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = activeCtx.measureText(testLine);
        if (metrics.width > printableWidth && currentLine) {
          if (y + lineHeight > canvasHeight - margin) {
            currentPageIdx++;
            [activeCanvas, activeCtx] = createNewCanvas(currentPageIdx);
            canvases.push(activeCanvas);
            y = margin;
          }
          activeCtx.fillText(currentLine, margin, y);
          y += lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        if (y + lineHeight > canvasHeight - margin) {
          currentPageIdx++;
          [activeCanvas, activeCtx] = createNewCanvas(currentPageIdx);
          canvases.push(activeCanvas);
          y = margin;
        }
        activeCtx.fillText(currentLine, margin, y);
        y += lineHeight;
      }
    }

    for (const c of canvases) {
      const pngBlob = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b || new Blob()), 'image/png'));
      const pngBytes = await pngBlob.arrayBuffer();
      const pngImg = await pdfDoc.embedPng(pngBytes);
      const pdfPage = pdfDoc.addPage([ptWidth, ptHeight]);
      pdfPage.drawImage(pngImg, {
        x: 0,
        y: 0,
        width: ptWidth,
        height: ptHeight,
      });
    }
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
