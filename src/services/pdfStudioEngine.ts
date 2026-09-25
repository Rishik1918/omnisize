import {
  PDFDocument,
  rgb,
  StandardFonts,
  degrees,
  PDFName,
  PDFString,
  PDFFont
} from 'pdf-lib';
import { getDocumentProxy } from 'unpdf';
import { UniversalDocumentLoader } from './universalDocumentLoader';

export interface TextOverlay {
  id: string;
  pageIndex: number; // 0-indexed
  text: string;
  x: number; // PDF points
  y: number; // PDF points (from bottom-left)
  size: number;
  color: string; // hex or rgb
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier' | string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  alignment?: 'left' | 'center' | 'right';
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

export interface ExistingTextItem {
  id: string;
  pageIndex: number; // 0-indexed
  originalText: string;
  currentText: string;
  x: number; // PDF points
  y: number; // PDF points (baseline)
  width: number; // PDF points
  height: number; // PDF points
  fontSize: number;
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier' | string;
  isBold?: boolean;
  isItalic?: boolean;
  color?: string;
  backgroundColor?: { r: number; g: number; b: number };
  isModified?: boolean;
}

export interface HyperlinkOverlay {
  id: string;
  pageIndex: number;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InsertBlankPageSpec {
  insertAfterIndex: number; // -1 for beginning, pageIndex for after that page
  width?: number;
  height?: number;
}

export interface PdfEditPayload {
  rotations?: Record<number, number>; // pageIndex -> degrees (90, 180, 270)
  deletedPages?: number[]; // list of 0-indexed page numbers to remove
  insertedBlankPages?: InsertBlankPageSpec[];
  textOverlays?: TextOverlay[];
  imageOverlays?: ImageOverlay[];
  textReplacements?: ExistingTextItem[];
  hyperlinks?: HyperlinkOverlay[];
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
      const buffer = (await file.arrayBuffer()).slice(0);
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
    const buffer = (await file.arrayBuffer()).slice(0);
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

    onProgress?.(90);
    const pdfBytes = await splitDoc.save();
    onProgress?.(100);
    return {
      blob: new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }),
      pageCount: selectedIndices.length,
    };
  }

  /**
   * Apply rich edits: font/weight matched text replacement, inserted text,
   * photos, blank page insertions, page deletions, rotations, and hyperlinks
   */
  static async applyEdits(
    file: File | Blob,
    payload: PdfEditPayload,
    onProgress?: (pct: number) => void
  ): Promise<Blob> {
    onProgress?.(10);

    // CRITICAL: Ensure document is a valid PDF before passing to pdf-lib
    // If the user modified a non-PDF tab (Images, DOCX, XLSX, TXT), convert it first
    let pdfFile: File | Blob = file;
    const isPdf =
      ((file as File).name?.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf');
    if (!isPdf && (file instanceof File || file instanceof Blob)) {
      pdfFile = await UniversalDocumentLoader.loadAsPdf(file as File);
    }

    const buffer = (await pdfFile.arrayBuffer()).slice(0);
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    // Pre-embed standard font combinations for precise matching
    const fontHelvetica = await doc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontHelveticaItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
    const fontHelveticaBoldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);

    const fontTimes = await doc.embedFont(StandardFonts.TimesRoman);
    const fontTimesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
    const fontTimesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const fontTimesBoldItalic = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);

    const fontCourier = await doc.embedFont(StandardFonts.Courier);
    const fontCourierBold = await doc.embedFont(StandardFonts.CourierBold);
    const fontCourierItalic = await doc.embedFont(StandardFonts.CourierOblique);
    const fontCourierBoldItalic = await doc.embedFont(StandardFonts.CourierBoldOblique);

    const selectFont = (family?: string, isBold?: boolean, isItalic?: boolean): PDFFont => {
      const fam = (family || 'Helvetica').toLowerCase();
      // Complete MS Word Serif Families -> Times Roman
      if (
        fam.includes('times') ||
        fam.includes('roman') ||
        fam.includes('serif') ||
        fam.includes('cambria') ||
        fam.includes('georgia') ||
        fam.includes('garamond') ||
        fam.includes('baskerville') ||
        fam.includes('palatino') ||
        fam.includes('constantia') ||
        fam.includes('book antiqua') ||
        fam.includes('bookman') ||
        fam.includes('century schoolbook') ||
        fam.includes('didot') ||
        fam.includes('rockwell') ||
        fam.includes('bell mt') ||
        fam.includes('bodoni') ||
        fam.includes('centaur') ||
        fam.includes('elephant') ||
        fam.includes('goudy') ||
        fam.includes('high tower') ||
        fam.includes('perpetua') ||
        fam.includes('poor richard')
      ) {
        if (isBold && isItalic) return fontTimesBoldItalic;
        if (isBold) return fontTimesBold;
        if (isItalic) return fontTimesItalic;
        return fontTimes;
      }
      // Complete MS Word Monospaced Families -> Courier
      if (
        fam.includes('courier') ||
        fam.includes('mono') ||
        fam.includes('consolas') ||
        fam.includes('cascadia') ||
        fam.includes('lucida console') ||
        fam.includes('ocr a')
      ) {
        if (isBold && isItalic) return fontCourierBoldItalic;
        if (isBold) return fontCourierBold;
        if (isItalic) return fontCourierItalic;
        return fontCourier;
      }
      // Complete MS Word Sans-Serif, Display, & Script Families -> Helvetica
      if (isBold && isItalic) return fontHelveticaBoldItalic;
      if (isBold) return fontHelveticaBold;
      if (isItalic) return fontHelveticaItalic;
      return fontHelvetica;
    };

    onProgress?.(25);

    // 0. Apply Existing Text Replacements (erases original bounding box with white cover, redraws matching font & weight)
    if (payload.textReplacements && payload.textReplacements.length > 0) {
      for (const rep of payload.textReplacements) {
        if (!rep.isModified && rep.currentText === rep.originalText) continue;
        if (rep.pageIndex >= 0 && rep.pageIndex < doc.getPageCount()) {
          const page = doc.getPage(rep.pageIndex);
          const chosenFont = selectFont(rep.fontFamily, rep.isBold, rep.isItalic);

          // Erase old text bounding box with white background rectangle
          const padY = Math.max(2, rep.fontSize * 0.22);
          const eraseY = Math.max(0, rep.y - padY);
          const eraseHeight = rep.height + padY * 1.5;
          const eraseWidth = Math.max(rep.width + 4, rep.currentText.length * rep.fontSize * 0.7);

          const bg = rep.backgroundColor || { r: 1, g: 1, b: 1 };
          page.drawRectangle({
            x: Math.max(0, rep.x - 2),
            y: eraseY,
            width: eraseWidth,
            height: eraseHeight,
            color: rgb(bg.r, bg.g, bg.b),
          });

          // Draw replacement text matching original coordinates, font, size & weight
          if (rep.currentText.trim().length > 0) {
            const textColor = rep.color ? this.parseHexColor(rep.color) : rgb(0.05, 0.05, 0.05);
            page.drawText(rep.currentText, {
              x: rep.x,
              y: rep.y,
              size: rep.fontSize || 12,
              font: chosenFont,
              color: textColor,
            });
          }
        }
      }
    }

    // 1. Insert Blank Pages
    if (payload.insertedBlankPages && payload.insertedBlankPages.length > 0) {
      // Sort by insertAfterIndex descending to preserve sequential insertions
      const sortedInserts = [...payload.insertedBlankPages].sort(
        (a, b) => b.insertAfterIndex - a.insertAfterIndex
      );
      for (const ins of sortedInserts) {
        const w = ins.width || 595.28;
        const h = ins.height || 841.89;
        const targetIndex = Math.min(doc.getPageCount(), Math.max(0, ins.insertAfterIndex + 1));
        doc.insertPage(targetIndex, [w, h]);
      }
    }

    // 2. Apply Rotations
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

    // 3. Insert Images / Photos
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

    // 4. Insert Text Overlays with rich font family, weight, style & alignment
    if (payload.textOverlays && payload.textOverlays.length > 0) {
      for (const textItem of payload.textOverlays) {
        if (textItem.pageIndex >= 0 && textItem.pageIndex < doc.getPageCount()) {
          const page = doc.getPage(textItem.pageIndex);
          const chosenFont = selectFont(textItem.fontFamily, textItem.isBold, textItem.isItalic);
          const color = this.parseHexColor(textItem.color);
          const size = textItem.size || 12;

          let posX = textItem.x;
          if (textItem.alignment === 'center' || textItem.alignment === 'right') {
            const measuredWidth = chosenFont.widthOfTextAtSize(textItem.text, size);
            if (textItem.alignment === 'center') posX -= measuredWidth / 2;
            else if (textItem.alignment === 'right') posX -= measuredWidth;
          }

          page.drawText(textItem.text, {
            x: posX,
            y: textItem.y,
            size,
            font: chosenFont,
            color,
          });

          // Underline if enabled
          if (textItem.isUnderline) {
            const textWidth = chosenFont.widthOfTextAtSize(textItem.text, size);
            page.drawLine({
              start: { x: posX, y: textItem.y - 1.5 },
              end: { x: posX + textWidth, y: textItem.y - 1.5 },
              thickness: Math.max(0.75, size * 0.06),
              color,
            });
          }
        }
      }
    }

    // 5. Add Clickable Hyperlink Annotations
    if (payload.hyperlinks && payload.hyperlinks.length > 0) {
      for (const link of payload.hyperlinks) {
        if (link.pageIndex >= 0 && link.pageIndex < doc.getPageCount()) {
          const page = doc.getPage(link.pageIndex);
          const linkAnnot = doc.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: [link.x, link.y, link.x + link.width, link.y + link.height],
            Border: [0, 0, 0],
            A: {
              Type: 'Action',
              S: 'URI',
              URI: PDFString.of(link.url.startsWith('http') ? link.url : `https://${link.url}`),
            },
          });
          const linkAnnotRef = doc.context.register(linkAnnot);
          let annots = page.node.Annots();
          if (!annots) {
            annots = doc.context.obj([]);
            page.node.set(PDFName.of('Annots'), annots);
          }
          annots.push(linkAnnotRef);
        }
      }
    }

    // 6. Delete Pages (must be deleted from highest index to lowest)
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
   * Render PDF page to HTML5 Canvas with High-DPI supersampling (eliminates blurriness)
   */
  static async renderPageToCanvas(
    pdfBufferOrProxy: ArrayBuffer | any,
    pageNumber: number, // 1-indexed
    scale: number = 1.25,
    dpr: number = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2
  ): Promise<{ canvas: HTMLCanvasElement; width: number; height: number; cssWidth: number; cssHeight: number }> {
    const proxy = typeof pdfBufferOrProxy?.getPage === 'function'
      ? pdfBufferOrProxy
      : await getDocumentProxy(new Uint8Array(pdfBufferOrProxy.slice(0)));

    const page = await proxy.getPage(pageNumber);
    // Base viewport at the requested display zoom scale
    const viewport = page.getViewport({ scale });

    // Safety clamp: Ensure supersampled canvas never exceeds browser/GPU max texture dimension (4096px)
    // or total pixel area, which would cause Chrome/WebView to fail allocation and render blank white!
    const MAX_CANVAS_DIM = 4096;
    let effectiveDpr = dpr;
    if (viewport.width * effectiveDpr > MAX_CANVAS_DIM || viewport.height * effectiveDpr > MAX_CANVAS_DIM) {
      effectiveDpr = Math.min(MAX_CANVAS_DIM / viewport.width, MAX_CANVAS_DIM / viewport.height);
    }
    const supersampledViewport = page.getViewport({ scale: scale * effectiveDpr });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(supersampledViewport.width);
    canvas.height = Math.round(supersampledViewport.height);
    canvas.style.width = `${Math.round(viewport.width)}px`;
    canvas.style.height = `${Math.round(viewport.height)}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await (page.render as any)({
      canvasContext: ctx,
      viewport: supersampledViewport,
    }).promise;

    return {
      canvas,
      width: supersampledViewport.width,
      height: supersampledViewport.height,
      cssWidth: viewport.width,
      cssHeight: viewport.height,
    };
  }

  /**
   * Extract selectable and editable text items from a PDF page with detected font & weight
   */
  static async extractPageTextItems(
    pdfBufferOrProxy: ArrayBuffer | any,
    pageNumber: number // 1-indexed
  ): Promise<ExistingTextItem[]> {
    try {
      const proxy = typeof pdfBufferOrProxy?.getPage === 'function'
        ? pdfBufferOrProxy
        : await getDocumentProxy(new Uint8Array(pdfBufferOrProxy.slice(0)));
      const page = await proxy.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageIndex = pageNumber - 1;

      const items: ExistingTextItem[] = [];

      for (let i = 0; i < textContent.items.length; i++) {
        const item: any = textContent.items[i];
        if (!item.str || !item.str.trim()) continue;

        const fontSize = Math.round(Math.hypot(item.transform[0], item.transform[1])) || 12;
        const x = item.transform[4];
        const y = item.transform[5];
        const width = item.width || Math.max(10, item.str.length * fontSize * 0.55);
        const height = item.height || fontSize;

        // Font style and weight detection
        const fontName = (item.fontName || '').toLowerCase();
        const fontStyle = textContent.styles ? textContent.styles[item.fontName] : null;
        const styleFamily = (fontStyle?.fontFamily || '').toLowerCase();

        const isBold = fontName.includes('bold') ||
          fontName.includes('black') ||
          fontName.includes('heavy') ||
          fontName.includes('semibold') ||
          fontName.includes('medium') ||
          (fontStyle?.fontWeight && (fontStyle.fontWeight === 'bold' || fontStyle.fontWeight >= 600));

        const isItalic = fontName.includes('italic') ||
          fontName.includes('oblique') ||
          fontStyle?.fontStyle === 'italic';

        let fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier' = 'Helvetica';
        if (fontName.includes('times') || fontName.includes('roman') || styleFamily.includes('serif')) {
          fontFamily = 'TimesRoman';
        } else if (fontName.includes('courier') || fontName.includes('mono') || styleFamily.includes('monospace')) {
          fontFamily = 'Courier';
        } else {
          fontFamily = 'Helvetica';
        }

        items.push({
          id: `txt_${pageIndex}_${i}_${Math.round(x)}_${Math.round(y)}`,
          pageIndex,
          originalText: item.str,
          currentText: item.str,
          x,
          y,
          width,
          height,
          fontSize,
          fontFamily,
          isBold,
          isItalic,
          isModified: false,
        });
      }

      return items;
    } catch (err) {
      console.error('Failed to extract page text items:', err);
      return [];
    }
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
