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
  lineSpacing?: number;
  characterSpacing?: number;
  paragraphSpacing?: number;
  rotation?: number;
  isStrikethrough?: boolean;
  isSuperscript?: boolean;
  isSubscript?: boolean;
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
  rotation?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge';
  borderRadius?: number;
  brightness?: number; // percentage, e.g. 100
  contrast?: number; // percentage, e.g. 100
  saturation?: number; // percentage, e.g. 100
  hue?: number; // degrees, -180 to 180
  temperature?: number; // -100 to 100
  grayscale?: boolean;
  invert?: boolean;
  flipH?: boolean;
  flipV?: boolean;
  opacity?: number;
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
  isUnderline?: boolean;
  isStrikethrough?: boolean;
  isSuperscript?: boolean;
  isSubscript?: boolean;
  alignment?: 'left' | 'center' | 'right';
  lineSpacing?: number;
  characterSpacing?: number;
  paragraphSpacing?: number;
  rotation?: number;
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

export type ShapeType =
  | 'rectangle'
  | 'rounded-rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'double-arrow'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'callout';

export interface ShapeOverlay {
  id: string;
  pageIndex: number;
  type: ShapeType;
  x: number; // PDF points
  y: number; // PDF points
  width: number;
  height: number;
  strokeColor: string; // hex
  fillColor: string; // hex or 'transparent'
  strokeWidth: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  rotation?: number; // 0 to 360
}

export interface TableOverlay {
  id: string;
  pageIndex: number;
  x: number; // PDF points
  y: number; // PDF points
  width: number; // PDF points
  height: number; // PDF points
  rows: number;
  cols: number;
  cells: string[][]; // [row][col]
  colWidths?: number[];
  rowHeights?: number[];
  headerRow?: boolean;
  borderColor?: string;
  headerBgColor?: string;
  cellBgColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double';
  cellImages?: Record<string, string>; // `${row}_${col}` -> dataURL
  cellImageProps?: Record<string, {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    hue?: number;
    temperature?: number;
    grayscale?: boolean;
    invert?: boolean;
    flipH?: boolean;
    flipV?: boolean;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    borderStyle?: string;
  }>;
  cellShapes?: Record<string, {
    type: ShapeType;
    strokeColor?: string;
    fillColor?: string;
    strokeWidth?: number;
  }>;
  cellSubtables?: Record<string, {
    rows: number;
    cols: number;
    cells: string[][];
  }>;
  rotation?: number;
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
  shapes?: ShapeOverlay[];
  tables?: TableOverlay[];
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
        (fam.includes('times') ||
        fam.includes('roman') ||
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
        fam.includes('poor richard') ||
        fam.includes('serif')) &&
        !fam.includes('sans')
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

    // 0. Apply Existing Text Replacements (erases original bounding box with sampled cover, redraws matching font, weight, style & alignment)
    if (payload.textReplacements && payload.textReplacements.length > 0) {
      for (const rep of payload.textReplacements) {
        if (!rep.isModified && rep.currentText === rep.originalText) continue;
        if (rep.pageIndex >= 0 && rep.pageIndex < doc.getPageCount()) {
          const page = doc.getPage(rep.pageIndex);
          const chosenFont = selectFont(rep.fontFamily, rep.isBold, rep.isItalic);
          const size = rep.fontSize || 12;

          // Erase old text bounding box covering ascenders and descenders completely!
          const descenderPt = Math.max(2.5, size * 0.32);
          const ascenderPt = Math.max(1.5, size * 0.15);
          const eraseY = Math.max(0, rep.y - descenderPt);
          const eraseHeight = Math.max(rep.height + descenderPt + ascenderPt, size * 1.35);
          const eraseWidth = rep.width + 4;

          const rawBg = rep.backgroundColor || { r: 1, g: 1, b: 1 };
          // If background is near-white (>= 0.88), snap to pure 1.0 white to prevent muddy gray boxes
          const bg = (rawBg.r >= 0.88 && rawBg.g >= 0.88 && rawBg.b >= 0.88)
            ? { r: 1, g: 1, b: 1 }
            : rawBg;

          page.drawRectangle({
            x: Math.max(0, rep.x - 2),
            y: eraseY,
            width: eraseWidth,
            height: eraseHeight,
            color: rgb(bg.r, bg.g, bg.b),
          });

          // Draw replacement text matching original coordinates, font, size, weight & alignment
          if (rep.currentText.trim().length > 0) {
            const textColor = rep.color ? this.parseHexColor(rep.color) : rgb(0.05, 0.05, 0.05);
            let posX = rep.x;
            if (rep.alignment === 'center' || rep.alignment === 'right') {
              const measuredWidth = chosenFont.widthOfTextAtSize(rep.currentText, size);
              if (rep.alignment === 'center') posX += Math.max(0, (rep.width - measuredWidth) / 2);
              else if (rep.alignment === 'right') posX += Math.max(0, rep.width - measuredWidth);
            }

            page.drawText(rep.currentText, {
              x: posX,
              y: rep.y,
              size,
              font: chosenFont,
              color: textColor,
              rotate: rep.rotation ? degrees(rep.rotation) : undefined,
            });

            // Underline if enabled
            if (rep.isUnderline) {
              const textWidth = chosenFont.widthOfTextAtSize(rep.currentText, size);
              page.drawLine({
                start: { x: posX, y: rep.y - 1.5 },
                end: { x: posX + textWidth, y: rep.y - 1.5 },
                thickness: Math.max(0.75, size * 0.06),
                color: textColor,
              });
            }
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
            rotate: imgOverlay.rotation ? degrees(imgOverlay.rotation) : undefined,
          });

          if (imgOverlay.borderWidth && imgOverlay.borderWidth > 0 && imgOverlay.borderColor) {
            try {
              page.drawRectangle({
                x: imgOverlay.x,
                y: imgOverlay.y,
                width: imgOverlay.width,
                height: imgOverlay.height,
                borderWidth: imgOverlay.borderWidth,
                borderColor: this.parseHexColor(imgOverlay.borderColor),
                rotate: imgOverlay.rotation ? degrees(imgOverlay.rotation) : undefined,
              });
            } catch (_) {}
          }
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
            rotate: textItem.rotation ? degrees(textItem.rotation) : undefined,
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

    // 4.5. Insert Basic & Word Shapes
    if (payload.shapes && payload.shapes.length > 0) {
      for (const shape of payload.shapes) {
        if (shape.pageIndex >= 0 && shape.pageIndex < doc.getPageCount()) {
          const page = doc.getPage(shape.pageIndex);
          const stroke = this.parseHexColor(shape.strokeColor || '#000000');
          const hasFill = shape.fillColor && shape.fillColor !== 'transparent' && shape.fillColor !== 'none';
          const fill = hasFill ? this.parseHexColor(shape.fillColor) : undefined;
          const borderWidth = shape.strokeWidth || 1;
          const rot = shape.rotation ? degrees(shape.rotation) : undefined;
          const op = shape.opacity ?? 1;

          if (shape.type === 'circle') {
            const rx = shape.width / 2;
            const ry = shape.height / 2;
            page.drawEllipse({
              x: shape.x + rx,
              y: shape.y + ry,
              xScale: rx,
              yScale: ry,
              borderColor: stroke,
              borderWidth,
              color: fill,
              rotate: rot,
              opacity: op,
            });
          } else if (shape.type === 'line') {
            page.drawLine({
              start: { x: shape.x, y: shape.y },
              end: { x: shape.x + shape.width, y: shape.y + shape.height },
              color: stroke,
              thickness: borderWidth,
              opacity: op,
            });
          } else if (shape.type === 'arrow' || shape.type === 'double-arrow') {
            page.drawLine({
              start: { x: shape.x, y: shape.y + shape.height / 2 },
              end: { x: shape.x + shape.width, y: shape.y + shape.height / 2 },
              color: stroke,
              thickness: borderWidth,
              opacity: op,
            });
            const headSize = Math.min(12, Math.max(5, shape.height * 0.35));
            const endX = shape.x + shape.width;
            const midY = shape.y + shape.height / 2;
            page.drawLine({
              start: { x: endX - headSize, y: midY - headSize * 0.6 },
              end: { x: endX, y: midY },
              color: stroke,
              thickness: borderWidth,
              opacity: op,
            });
            page.drawLine({
              start: { x: endX - headSize, y: midY + headSize * 0.6 },
              end: { x: endX, y: midY },
              color: stroke,
              thickness: borderWidth,
              opacity: op,
            });
            if (shape.type === 'double-arrow') {
              const startX = shape.x;
              page.drawLine({
                start: { x: startX + headSize, y: midY - headSize * 0.6 },
                end: { x: startX, y: midY },
                color: stroke,
                thickness: borderWidth,
                opacity: op,
              });
              page.drawLine({
                start: { x: startX + headSize, y: midY + headSize * 0.6 },
                end: { x: startX, y: midY },
                color: stroke,
                thickness: borderWidth,
                opacity: op,
              });
            }
          } else if (shape.type === 'triangle') {
            const p1 = { x: shape.x + shape.width / 2, y: shape.y + shape.height };
            const p2 = { x: shape.x, y: shape.y };
            const p3 = { x: shape.x + shape.width, y: shape.y };
            page.drawLine({ start: p1, end: p2, color: stroke, thickness: borderWidth });
            page.drawLine({ start: p2, end: p3, color: stroke, thickness: borderWidth });
            page.drawLine({ start: p3, end: p1, color: stroke, thickness: borderWidth });
          } else if (shape.type === 'diamond') {
            const p1 = { x: shape.x + shape.width / 2, y: shape.y + shape.height };
            const p2 = { x: shape.x + shape.width, y: shape.y + shape.height / 2 };
            const p3 = { x: shape.x + shape.width / 2, y: shape.y };
            const p4 = { x: shape.x, y: shape.y + shape.height / 2 };
            page.drawLine({ start: p1, end: p2, color: stroke, thickness: borderWidth });
            page.drawLine({ start: p2, end: p3, color: stroke, thickness: borderWidth });
            page.drawLine({ start: p3, end: p4, color: stroke, thickness: borderWidth });
            page.drawLine({ start: p4, end: p1, color: stroke, thickness: borderWidth });
          } else {
            page.drawRectangle({
              x: shape.x,
              y: shape.y,
              width: shape.width,
              height: shape.height,
              borderColor: stroke,
              borderWidth,
              color: fill,
              rotate: rot,
              opacity: op,
            });
          }
        }
      }
    }

    // 4.6. Insert Vector Tables
    if (payload.tables && payload.tables.length > 0) {
      for (const table of payload.tables) {
        if (table.pageIndex >= 0 && table.pageIndex < doc.getPageCount()) {
          const page = doc.getPage(table.pageIndex);
          const cols = Math.max(1, table.cols);
          const rows = Math.max(1, table.rows);

          const colWidths =
            table.colWidths && table.colWidths.length === cols
              ? table.colWidths
              : Array(cols).fill(table.width / cols);
          const rowHeights =
            table.rowHeights && table.rowHeights.length === rows
              ? table.rowHeights
              : Array(rows).fill(table.height / rows);

          const borderClr = this.parseHexColor(table.borderColor || '#000000');
          const borderW = table.borderWidth || 1;
          const headerBg = table.headerRow
            ? table.headerBgColor
              ? this.parseHexColor(table.headerBgColor)
              : rgb(0.93, 0.95, 0.98)
            : undefined;
          const defaultCellBg = table.cellBgColor ? this.parseHexColor(table.cellBgColor) : undefined;
          const txtColor = this.parseHexColor(table.textColor || '#000000');
          const cellFontSize = table.fontSize || 10;

          const totalH = rowHeights.reduce((a, b) => a + b, 0);

          let currentTop = table.y + totalH;
          for (let r = 0; r < rows; r++) {
            const rowH = rowHeights[r];
            const cellY = currentTop - rowH;
            currentTop -= rowH;
            const isHeader = r === 0 && table.headerRow;
            const bg = isHeader ? headerBg : defaultCellBg;

            let cellX = table.x;
            for (let c = 0; c < cols; c++) {
              const cellW = colWidths[c];

              page.drawRectangle({
                x: cellX,
                y: cellY,
                width: cellW,
                height: rowH,
                borderColor: borderClr,
                borderWidth: borderW,
                color: bg,
              });

              const cellImgKey = `${r}_${c}`;
              if (table.cellImages && table.cellImages[cellImgKey]) {
                try {
                  const raw = table.cellImages[cellImgKey];
                  const parts = raw.split(',');
                  if (parts.length === 2) {
                    const mime = parts[0].includes('image/png') ? 'png' : 'jpeg';
                    const binary = atob(parts[1]);
                    const bytes = new Uint8Array(binary.length);
                    for (let bi = 0; bi < binary.length; bi++) {
                      bytes[bi] = binary.charCodeAt(bi);
                    }
                    const emb = mime === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
                    const pad = 2;
                    page.drawImage(emb, {
                      x: cellX + pad,
                      y: cellY + pad,
                      width: Math.max(1, cellW - pad * 2),
                      height: Math.max(1, rowH - pad * 2),
                    });
                  }
                } catch (imgErr) {
                  console.error('Failed to embed cell image in PDF:', imgErr);
                }
              }

              // Cell Shape
              if (table.cellShapes && table.cellShapes[cellImgKey]) {
                try {
                  const sData = table.cellShapes[cellImgKey];
                  const sPad = 2;
                  const sW = Math.max(2, cellW - sPad * 2);
                  const sH = Math.max(2, rowH - sPad * 2);
                  const strokeClr = this.parseHexColor(sData.strokeColor || '#2563eb');
                  const fillClr = sData.fillColor && sData.fillColor !== 'transparent' ? this.parseHexColor(sData.fillColor) : undefined;
                  if (sData.type === 'circle') {
                    page.drawEllipse({
                      x: cellX + sPad + sW / 2,
                      y: cellY + sPad + sH / 2,
                      xScale: sW / 2,
                      yScale: sH / 2,
                      borderColor: strokeClr,
                      borderWidth: sData.strokeWidth || 1.5,
                      color: fillClr,
                    });
                  } else {
                    page.drawRectangle({
                      x: cellX + sPad,
                      y: cellY + sPad,
                      width: sW,
                      height: sH,
                      borderColor: strokeClr,
                      borderWidth: sData.strokeWidth || 1.5,
                      color: fillClr,
                    });
                  }
                } catch (_) {}
              }

              // Cell Subtable
              if (table.cellSubtables && table.cellSubtables[cellImgKey]) {
                try {
                  const sub = table.cellSubtables[cellImgKey];
                  const subColW = cellW / sub.cols;
                  const subRowH = rowH / sub.rows;
                  for (let sr = 0; sr < sub.rows; sr++) {
                    for (let sc = 0; sc < sub.cols; sc++) {
                      const sx = cellX + sc * subColW;
                      const sy = cellY + (sub.rows - 1 - sr) * subRowH;
                      page.drawRectangle({
                        x: sx,
                        y: sy,
                        width: subColW,
                        height: subRowH,
                        borderColor: rgb(0.65, 0.65, 0.65),
                        borderWidth: 0.5,
                      });
                      const stxt = sub.cells?.[sr]?.[sc] || '';
                      if (stxt.trim()) {
                        page.drawText(stxt.trim(), {
                          x: sx + 2,
                          y: sy + (subRowH - 7) / 2 + 1,
                          size: 7,
                          font: fontHelvetica,
                          color: txtColor,
                          maxWidth: Math.max(5, subColW - 4),
                        });
                      }
                    }
                  }
                } catch (_) {}
              }

              const cellText = table.cells?.[r]?.[c] || '';
              if (cellText && cellText.trim()) {
                const textY = cellY + (rowH - cellFontSize) / 2 + 1;
                const textX = cellX + 4;
                try {
                  page.drawText(cellText.trim(), {
                    x: textX,
                    y: textY,
                    size: cellFontSize,
                    font: isHeader ? fontHelveticaBold : fontHelvetica,
                    color: txtColor,
                    maxWidth: Math.max(10, cellW - 8),
                  });
                } catch (_) {}
              }
              cellX += cellW;
            }
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
    rotation: number = 0,
    dpr?: number
  ): Promise<{ canvas: HTMLCanvasElement; width: number; height: number; cssWidth: number; cssHeight: number }> {
    const proxy = typeof pdfBufferOrProxy?.getPage === 'function'
      ? pdfBufferOrProxy
      : await getDocumentProxy(new Uint8Array(pdfBufferOrProxy.slice(0)));

    const page = await proxy.getPage(pageNumber);
    const rawRotation = ((page.rotate || 0) + (rotation || 0)) % 360;
    // PDF.js PageViewport strictly enforces that rotation must be a multiple of 90 degrees (0, 90, 180, 270)
    const effectiveRotation = ((Math.round(rawRotation / 90) * 90) % 360 + 360) % 360;
    // Base viewport at the requested display zoom scale with rotation
    const viewport = page.getViewport({ scale: Math.max(0.1, scale), rotation: effectiveRotation });

    // Safety clamp: Ensure supersampled canvas never exceeds browser/GPU max texture dimension (4096px)
    // or total pixel area, which would cause Chrome/WebView to fail allocation and render blank white!
    const MAX_CANVAS_DIM = 4096;
    const defaultDpr = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2;
    let effectiveDpr = (typeof dpr === 'number' && dpr > 0.1) ? dpr : defaultDpr;
    if (viewport.width * effectiveDpr > MAX_CANVAS_DIM || viewport.height * effectiveDpr > MAX_CANVAS_DIM) {
      effectiveDpr = Math.max(0.5, Math.min(MAX_CANVAS_DIM / Math.max(1, viewport.width), MAX_CANVAS_DIM / Math.max(1, viewport.height)));
    }
    const supersampledViewport = page.getViewport({ scale: Math.max(0.1, scale * effectiveDpr), rotation: effectiveRotation });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(supersampledViewport.width));
    canvas.height = Math.max(1, Math.round(supersampledViewport.height));
    canvas.style.width = `${Math.max(1, Math.round(viewport.width))}px`;
    canvas.style.height = `${Math.max(1, Math.round(viewport.height))}px`;

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

        const hSize = Math.abs(item.transform[3]) || 0;
        const wSize = Math.abs(item.transform[0]) || 0;
        const fontSize = Math.round(Math.max(hSize, wSize)) || Math.round(Math.hypot(item.transform[0], item.transform[1])) || 12;
        const x = item.transform[4];
        const y = item.transform[5];
        const width = item.width || Math.max(10, item.str.length * fontSize * 0.55);
        const height = item.height || fontSize;

        // Accurate Font style, family, and weight detection
        let resolvedFontName = (item.fontName || '').toLowerCase();
        let isBold = false;
        let isItalic = false;

        try {
          const fontObj = page.commonObjs?.get?.(item.fontName) || (page as any).objs?.get?.(item.fontName);
          if (fontObj) {
            if (fontObj.name) resolvedFontName = fontObj.name.toLowerCase();
            else if (fontObj.loadedName) resolvedFontName = fontObj.loadedName.toLowerCase();
            else if (fontObj.fallbackName) resolvedFontName = fontObj.fallbackName.toLowerCase();

            if (fontObj.bold || fontObj.black || (fontObj.weight && fontObj.weight >= 600)) {
              isBold = true;
            }
          }
        } catch {}

        const fontStyle = textContent.styles ? textContent.styles[item.fontName] : null;
        const styleFamily = (fontStyle?.fontFamily || '').toLowerCase();

        if (
          !isBold && (
            resolvedFontName.includes('bold') ||
            resolvedFontName.includes('black') ||
            resolvedFontName.includes('heavy') ||
            resolvedFontName.includes('semibold') ||
            resolvedFontName.includes('medium') ||
            resolvedFontName.includes('-b') ||
            (fontStyle?.fontWeight && (fontStyle.fontWeight === 'bold' || fontStyle.fontWeight >= 600))
          )
        ) {
          isBold = true;
        }

        if (
          resolvedFontName.includes('italic') ||
          resolvedFontName.includes('oblique') ||
          resolvedFontName.includes('-i') ||
          fontStyle?.fontStyle === 'italic'
        ) {
          isItalic = true;
        }

        const isSans =
          resolvedFontName.includes('calibri') ||
          resolvedFontName.includes('arial') ||
          resolvedFontName.includes('helvetica') ||
          resolvedFontName.includes('aptos') ||
          resolvedFontName.includes('segoe') ||
          resolvedFontName.includes('tahoma') ||
          resolvedFontName.includes('trebuchet') ||
          resolvedFontName.includes('verdana') ||
          resolvedFontName.includes('inter') ||
          resolvedFontName.includes('roboto') ||
          resolvedFontName.includes('lato') ||
          resolvedFontName.includes('poppins') ||
          resolvedFontName.includes('montserrat') ||
          resolvedFontName.includes('century gothic') ||
          resolvedFontName.includes('franklin') ||
          resolvedFontName.includes('gill') ||
          styleFamily.includes('sans');

        const isMono =
          resolvedFontName.includes('courier') ||
          resolvedFontName.includes('mono') ||
          resolvedFontName.includes('consolas') ||
          resolvedFontName.includes('cascadia') ||
          resolvedFontName.includes('lucida console') ||
          resolvedFontName.includes('ocr') ||
          styleFamily.includes('mono');

        const isSerif =
          !isSans && (
            resolvedFontName.includes('times') ||
            resolvedFontName.includes('roman') ||
            resolvedFontName.includes('cambria') ||
            resolvedFontName.includes('georgia') ||
            resolvedFontName.includes('garamond') ||
            resolvedFontName.includes('baskerville') ||
            resolvedFontName.includes('palatino') ||
            resolvedFontName.includes('century') ||
            resolvedFontName.includes('bookman') ||
            resolvedFontName.includes('bodoni') ||
            resolvedFontName.includes('didot') ||
            (styleFamily.includes('serif') && !styleFamily.includes('sans'))
          );

        let fontFamily = 'Calibri';
        if (resolvedFontName.includes('arial')) fontFamily = 'Arial';
        else if (resolvedFontName.includes('calibri')) fontFamily = 'Calibri';
        else if (resolvedFontName.includes('aptos')) fontFamily = 'Aptos';
        else if (resolvedFontName.includes('segoe')) fontFamily = 'Segoe UI';
        else if (resolvedFontName.includes('georgia')) fontFamily = 'Georgia';
        else if (resolvedFontName.includes('cambria')) fontFamily = 'Cambria';
        else if (resolvedFontName.includes('consolas')) fontFamily = 'Consolas';
        else if (resolvedFontName.includes('courier')) fontFamily = 'Courier New';
        else if (resolvedFontName.includes('verdana')) fontFamily = 'Verdana';
        else if (resolvedFontName.includes('tahoma')) fontFamily = 'Tahoma';
        else if (resolvedFontName.includes('trebuchet')) fontFamily = 'Trebuchet MS';
        else if (resolvedFontName.includes('helvetica')) fontFamily = 'Helvetica';
        else if (isSerif) fontFamily = 'Times New Roman';
        else if (isMono) fontFamily = 'Courier New';
        else fontFamily = 'Calibri';

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
    if (!hex) return rgb(0, 0, 0);
    if (hex.startsWith('rgb')) {
      const m = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (m) {
        return rgb(parseInt(m[1], 10) / 255, parseInt(m[2], 10) / 255, parseInt(m[3], 10) / 255);
      }
    }
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16) / 255;
      const g = parseInt(clean[1] + clean[1], 16) / 255;
      const b = parseInt(clean[2] + clean[2], 16) / 255;
      return rgb(r, g, b);
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16) / 255;
      const g = parseInt(clean.substring(2, 4), 16) / 255;
      const b = parseInt(clean.substring(4, 6), 16) / 255;
      return rgb(r, g, b);
    }
    return rgb(0, 0, 0);
  }
}
