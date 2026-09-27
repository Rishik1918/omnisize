import {
  PDFDocument,
  PDFPage,
  RGB,
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
  zIndex?: number;
  behindText?: boolean;
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
  zIndex?: number;
  behindText?: boolean;
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
  bgColorHex?: string;
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
  | 'callout'
  | 'heart'
  | 'lightning'
  | 'cloud';

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
  zIndex?: number;
  behindText?: boolean;
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
  cellBgColors?: Record<string, string>; // `${row}_${col}` -> hex
  mergedCells?: Array<{ startRow: number; startCol: number; endRow: number; endCol: number }>;
  rotation?: number;
  zIndex?: number;
  behindText?: boolean;
}

export interface InsertBlankPageSpec {
  insertAfterIndex: number; // -1 for beginning, pageIndex for after that page
  width?: number;
  height?: number;
}

export type PageBorderType =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'groove'
  | 'ridge'
  | 'corners'
  | 'frame'
  | 'inset'
  | 'outset';

export interface PageBorderConfig {
  enabled: boolean;
  type: PageBorderType;
  width: number;
  color: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type PageNumberPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type PageNumberFormat =
  | 'number'
  | 'page-x'
  | 'page-x-of-y'
  | 'dash'
  | 'roman-upper'
  | 'roman-lower';

export type PageNumberFilter =
  | 'all'
  | 'odd'
  | 'even'
  | 'range'
  | 'specific';

export interface PageNumberConfig {
  enabled: boolean;
  position: PageNumberPosition;
  format: PageNumberFormat;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'medium' | 'bold';
  color: string;
  filterMode: PageNumberFilter;
  startFrom: number;
  rangeStart?: number;
  rangeEnd?: number;
  specificPages?: string;
  offsetY?: number;
}

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawingStroke {
  id: string;
  pageIndex: number; // 0-indexed
  tool: 'pen' | 'pencil' | 'highlighter';
  color: string;
  width?: number;
  thickness: number;
  points: DrawingPoint[];
  opacity?: number;
  blendMode?: 'source-over' | 'multiply';
  isSnappedShape?: boolean;
}

export interface WatermarkConfig {
  enabled: boolean;
  type: 'text' | 'file';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  proportionOfPages: boolean;
  proportionPercent: number;
  position: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  xOffsetCm: number;
  yOffsetCm: number;
  tile: boolean;
  tileSpacingXCm: number;
  tileSpacingYCm: number;
  rotation: number;
  opacity: number;
  layer: 'front' | 'behind';
  pageScope: 'all' | 'custom' | 'odd' | 'even';
  customRange: string;
  fileDataUrl?: string;
  fileType?: string;
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
  pageBorders?: Record<number, PageBorderConfig>;
  pageNumberConfig?: PageNumberConfig;
  drawings?: DrawingStroke[];
  watermarkConfig?: WatermarkConfig;
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
  /**
   * Insert pages from another PDF document at the specified position
   */
  static async insertPagesFromOtherPdf(
    targetBuffer: ArrayBuffer,
    sourceBuffer: ArrayBuffer,
    insertPosition: 'before' | 'after' | 'start' | 'end',
    targetPageIndex: number, // 0-indexed
    sourcePageIndices?: number[]
  ): Promise<{ buffer: ArrayBuffer; newTotalPages: number }> {
    const targetDoc = await PDFDocument.load(targetBuffer, { ignoreEncryption: true });
    const sourceDoc = await PDFDocument.load(sourceBuffer, { ignoreEncryption: true });

    const indicesToCopy =
      sourcePageIndices && sourcePageIndices.length > 0
        ? sourcePageIndices.filter((idx) => idx >= 0 && idx < sourceDoc.getPageCount())
        : sourceDoc.getPageIndices();

    const copiedPages = await targetDoc.copyPages(sourceDoc, indicesToCopy);

    let insertIndex = 0;
    const currentTotal = targetDoc.getPageCount();
    if (insertPosition === 'start') {
      insertIndex = 0;
    } else if (insertPosition === 'end') {
      insertIndex = currentTotal;
    } else if (insertPosition === 'before') {
      insertIndex = Math.max(0, Math.min(currentTotal, targetPageIndex));
    } else {
      // 'after'
      insertIndex = Math.max(0, Math.min(currentTotal, targetPageIndex + 1));
    }

    for (let i = 0; i < copiedPages.length; i++) {
      targetDoc.insertPage(insertIndex + i, copiedPages[i]);
    }

    const savedBytes = await targetDoc.save();
    return {
      buffer: savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength),
      newTotalPages: targetDoc.getPageCount(),
    };
  }

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

          let bg: { r: number; g: number; b: number } = { r: 1, g: 1, b: 1 };
          if (rep.bgColorHex && /^#[0-9a-fA-F]{6}$/.test(rep.bgColorHex)) {
            const r = parseInt(rep.bgColorHex.slice(1, 3), 16) / 255;
            const g = parseInt(rep.bgColorHex.slice(3, 5), 16) / 255;
            const b = parseInt(rep.bgColorHex.slice(5, 7), 16) / 255;
            bg = { r, g, b };
          } else if (rep.backgroundColor) {
            bg = rep.backgroundColor;
          }

          // Only snap to 1.0 if strictly neutral and practically pure white (>0.985 with <0.01 delta)
          if (
            bg.r >= 0.985 &&
            bg.g >= 0.985 &&
            bg.b >= 0.985 &&
            Math.abs(bg.r - bg.g) <= 0.01 &&
            Math.abs(bg.r - bg.b) <= 0.01
          ) {
            bg = { r: 1, g: 1, b: 1 };
          }

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

          this.drawVectorShape(
            page,
            shape.type,
            shape.x,
            shape.y,
            shape.width,
            shape.height,
            stroke,
            fill,
            borderWidth,
            rot,
            op
          );
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
              const cellCustomHex = table.cellBgColors?.[`${r}_${c}`];
              const customBg = cellCustomHex ? this.parseHexColor(cellCustomHex) : undefined;
              const cellEffectiveBg = customBg || bg;

              // Check if cell is covered by a merge block
              const mergeBlock = (table.mergedCells || []).find(
                (m) => r >= m.startRow && r <= m.endRow && c >= m.startCol && c <= m.endCol
              );

              // If covered by merge and not the top-left cell, skip drawing
              if (mergeBlock && (r !== mergeBlock.startRow || c !== mergeBlock.startCol)) {
                cellX += cellW;
                continue;
              }

              let drawW = cellW;
              let drawH = rowH;
              let drawY = cellY;

              if (mergeBlock && r === mergeBlock.startRow && c === mergeBlock.startCol) {
                drawW = 0;
                for (let mc = mergeBlock.startCol; mc <= mergeBlock.endCol; mc++) {
                  drawW += colWidths[mc] || 0;
                }
                drawH = 0;
                for (let mr = mergeBlock.startRow; mr <= mergeBlock.endRow; mr++) {
                  drawH += rowHeights[mr] || 0;
                }
                drawY = currentTop - (drawH - rowH);
              }

              page.drawRectangle({
                x: cellX,
                y: drawY,
                width: drawW,
                height: drawH,
                borderColor: borderClr,
                borderWidth: borderW,
                color: cellEffectiveBg,
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
                  this.drawVectorShape(
                    page,
                    sData.type as ShapeType,
                    cellX + sPad,
                    cellY + sPad,
                    sW,
                    sH,
                    strokeClr,
                    fillClr,
                    sData.strokeWidth || 1.5
                  );
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

    // 6. Apply Page Borders
    if (payload.pageBorders) {
      for (let pIdx = 0; pIdx < doc.getPageCount(); pIdx++) {
        const border = payload.pageBorders[pIdx];
        if (!border || !border.enabled) continue;

        const page = doc.getPage(pIdx);
        const w = page.getWidth();
        const h = page.getHeight();
        const x1 = border.left;
        const y1 = border.bottom;
        const x2 = w - border.right;
        const y2 = h - border.top;
        const bw = Math.max(1, x2 - x1);
        const bh = Math.max(1, y2 - y1);
        const borderWidth = Math.max(0.5, border.width || 1);
        const strokeColor = this.parseHexColor(border.color || '#000000');

        switch (border.type) {
          case 'dashed':
            page.drawRectangle({
              x: x1,
              y: y1,
              width: bw,
              height: bh,
              borderColor: strokeColor,
              borderWidth,
              borderDashArray: [borderWidth * 4, borderWidth * 2],
            });
            break;

          case 'dotted':
            page.drawRectangle({
              x: x1,
              y: y1,
              width: bw,
              height: bh,
              borderColor: strokeColor,
              borderWidth,
              borderDashArray: [borderWidth, borderWidth * 1.5],
            });
            break;

          case 'double': {
            const innerInset = Math.max(2, borderWidth * 1.5);
            const lineThick = Math.max(0.6, borderWidth * 0.45);
            page.drawRectangle({
              x: x1,
              y: y1,
              width: bw,
              height: bh,
              borderColor: strokeColor,
              borderWidth: lineThick,
            });
            if (bw > innerInset * 2 && bh > innerInset * 2) {
              page.drawRectangle({
                x: x1 + innerInset,
                y: y1 + innerInset,
                width: bw - innerInset * 2,
                height: bh - innerInset * 2,
                borderColor: strokeColor,
                borderWidth: lineThick,
              });
            }
            break;
          }

          case 'corners': {
            const cornerLen = Math.min(Math.min(bw, bh) * 0.25, Math.max(20, borderWidth * 8));
            // Top-Left corner: (x1, y2)
            page.drawLine({ start: { x: x1, y: y2 }, end: { x: x1 + cornerLen, y: y2 }, color: strokeColor, thickness: borderWidth });
            page.drawLine({ start: { x: x1, y: y2 }, end: { x: x1, y: y2 - cornerLen }, color: strokeColor, thickness: borderWidth });
            // Top-Right corner: (x2, y2)
            page.drawLine({ start: { x: x2, y: y2 }, end: { x: x2 - cornerLen, y: y2 }, color: strokeColor, thickness: borderWidth });
            page.drawLine({ start: { x: x2, y: y2 }, end: { x: x2, y: y2 - cornerLen }, color: strokeColor, thickness: borderWidth });
            // Bottom-Left corner: (x1, y1)
            page.drawLine({ start: { x: x1, y: y1 }, end: { x: x1 + cornerLen, y: y1 }, color: strokeColor, thickness: borderWidth });
            page.drawLine({ start: { x: x1, y: y1 }, end: { x: x1, y: y1 + cornerLen }, color: strokeColor, thickness: borderWidth });
            // Bottom-Right corner: (x2, y1)
            page.drawLine({ start: { x: x2, y: y1 }, end: { x: x2 - cornerLen, y: y1 }, color: strokeColor, thickness: borderWidth });
            page.drawLine({ start: { x: x2, y: y1 }, end: { x: x2, y: y1 + cornerLen }, color: strokeColor, thickness: borderWidth });
            break;
          }

          case 'frame': {
            const frameInset = Math.max(3, borderWidth * 1.8);
            page.drawRectangle({
              x: x1,
              y: y1,
              width: bw,
              height: bh,
              borderColor: strokeColor,
              borderWidth,
            });
            if (bw > frameInset * 2 && bh > frameInset * 2) {
              page.drawRectangle({
                x: x1 + frameInset,
                y: y1 + frameInset,
                width: bw - frameInset * 2,
                height: bh - frameInset * 2,
                borderColor: strokeColor,
                borderWidth: Math.max(0.6, borderWidth * 0.4),
              });
              const sqSize = Math.max(3, borderWidth * 1.2);
              const drawCornerSq = (cx: number, cy: number) => {
                page.drawRectangle({
                  x: cx - sqSize / 2,
                  y: cy - sqSize / 2,
                  width: sqSize,
                  height: sqSize,
                  color: strokeColor,
                });
              };
              drawCornerSq(x1 + frameInset / 2, y2 - frameInset / 2);
              drawCornerSq(x2 - frameInset / 2, y2 - frameInset / 2);
              drawCornerSq(x1 + frameInset / 2, y1 + frameInset / 2);
              drawCornerSq(x2 - frameInset / 2, y1 + frameInset / 2);
            }
            break;
          }

          case 'groove':
          case 'ridge':
          case 'inset':
          case 'outset':
          case 'solid':
          default:
            page.drawRectangle({
              x: x1,
              y: y1,
              width: bw,
              height: bh,
              borderColor: strokeColor,
              borderWidth,
            });
            break;
        }
      }
    }

    // 7. Delete Pages (must be deleted from highest index to lowest)
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

    // 8. Apply Page Numbers
    if (payload.pageNumberConfig && payload.pageNumberConfig.enabled) {
      const cfg = payload.pageNumberConfig;
      const totalPages = doc.getPageCount();
      const chosenFont = selectFont(cfg.fontFamily, cfg.fontWeight === 'bold', false);
      const fontSize = cfg.fontSize || 10;
      const fontColor = this.parseHexColor(cfg.color || '#000000');
      const offsetY = cfg.offsetY || 24;

      for (let i = 0; i < totalPages; i++) {
        const pageNum = i + 1;

        // Filter check
        if (cfg.filterMode === 'odd' && pageNum % 2 === 0) continue;
        if (cfg.filterMode === 'even' && pageNum % 2 !== 0) continue;
        if (cfg.filterMode === 'range') {
          const s = cfg.rangeStart || 1;
          const e = cfg.rangeEnd || totalPages;
          if (pageNum < s || pageNum > e) continue;
        }
        if (cfg.filterMode === 'specific' && cfg.specificPages) {
          const parts = cfg.specificPages.split(',').map((p) => p.trim());
          const matched = parts.some((p) => {
            if (p.includes('-')) {
              const [a, b] = p.split('-').map(Number);
              return pageNum >= a && pageNum <= b;
            }
            return Number(p) === pageNum;
          });
          if (!matched) continue;
        }

        // Format number
        const startNum = cfg.startFrom || 1;
        const displayVal = startNum + i;
        let text = `${displayVal}`;
        if (cfg.format === 'page-x') {
          text = `Page ${displayVal}`;
        } else if (cfg.format === 'page-x-of-y') {
          text = `Page ${displayVal} of ${totalPages}`;
        } else if (cfg.format === 'dash') {
          text = `- ${displayVal} -`;
        } else if (cfg.format === 'roman-upper') {
          text = PdfStudioEngine.toRoman(displayVal, true);
        } else if (cfg.format === 'roman-lower') {
          text = PdfStudioEngine.toRoman(displayVal, false);
        }

        const page = doc.getPage(i);
        const pWidth = page.getWidth();
        const pHeight = page.getHeight();
        const textWidth = chosenFont.widthOfTextAtSize(text, fontSize);

        let posX = 36;
        if (cfg.position.endsWith('left')) {
          posX = 36;
        } else if (cfg.position.endsWith('center')) {
          posX = (pWidth - textWidth) / 2;
        } else if (cfg.position.endsWith('right')) {
          posX = pWidth - 36 - textWidth;
        }

        let posY = offsetY;
        if (cfg.position.startsWith('top')) {
          posY = pHeight - offsetY - fontSize;
        } else {
          posY = offsetY;
        }

        page.drawText(text, {
          x: posX,
          y: posY,
          size: fontSize,
          font: chosenFont,
          color: fontColor,
        });
      }
    }

    // 9. Apply Freehand Drawing Strokes (Pen, Pencil, Highlighter)
    if (payload.drawings && payload.drawings.length > 0) {
      for (const stroke of payload.drawings) {
        if (stroke.pageIndex >= 0 && stroke.pageIndex < doc.getPageCount() && stroke.points.length >= 2) {
          const page = doc.getPage(stroke.pageIndex);
          const color = this.parseHexColor(stroke.color || '#000000');
          const isHighlighter = stroke.tool === 'highlighter';
          const strokeWidth = stroke.thickness || stroke.width || (isHighlighter ? 18 : 2);
          const opacity = isHighlighter ? (stroke.opacity ?? 0.35) : (stroke.opacity ?? 1.0);

          for (let i = 0; i < stroke.points.length - 1; i++) {
            page.drawLine({
              start: stroke.points[i],
              end: stroke.points[i + 1],
              thickness: strokeWidth,
              color,
              opacity,
            });
          }
        }
      }
    }

    // 10. Apply Watermark (Images 1 & 2 design)
    if (payload.watermarkConfig && payload.watermarkConfig.enabled) {
      const wm = payload.watermarkConfig;
      const totalP = doc.getPageCount();
      const targetIndices: number[] = [];

      for (let p = 0; p < totalP; p++) {
        const pageNum = p + 1;
        if (wm.pageScope === 'all') {
          targetIndices.push(p);
        } else if (wm.pageScope === 'odd' && pageNum % 2 !== 0) {
          targetIndices.push(p);
        } else if (wm.pageScope === 'even' && pageNum % 2 === 0) {
          targetIndices.push(p);
        } else if (wm.pageScope === 'custom' && wm.customRange) {
          const ranges = this.parsePageRanges(wm.customRange, totalP);
          if (ranges.includes(p)) targetIndices.push(p);
        }
      }

      const wmFont = selectFont(wm.fontFamily || 'Helvetica', wm.isBold, wm.isItalic);
      const wmColor = this.parseHexColor(wm.color || '#888888');
      const opacity = Math.max(0.01, Math.min(1.0, (wm.opacity ?? 50) / 100));
      const rot = degrees(wm.rotation ?? -45);

      for (const pIdx of targetIndices) {
        const page = doc.getPage(pIdx);
        const { width: pW, height: pH } = page.getSize();
        const ptPerCm = 28.3465;
        const xOffsetPt = (wm.xOffsetCm || 0) * ptPerCm;
        const yOffsetPt = (wm.yOffsetCm || 0) * ptPerCm;

        let baseSize = wm.fontSize || 36;
        if (wm.proportionOfPages && wm.proportionPercent) {
          baseSize = Math.max(12, Math.round((pW * (wm.proportionPercent / 100)) / Math.max(1, (wm.text || 'CONFIDENTIAL').length * 0.6)));
        }

        const wmText = wm.text || 'CONFIDENTIAL';
        const textWidth = wmFont.widthOfTextAtSize(wmText, baseSize);

        if (wm.tile) {
          const stepX = Math.max(textWidth + 40, (wm.tileSpacingXCm || 6) * ptPerCm);
          const stepY = Math.max(baseSize + 40, (wm.tileSpacingYCm || 6) * ptPerCm);
          for (let tx = 0; tx < pW + 100; tx += stepX) {
            for (let ty = 0; ty < pH + 100; ty += stepY) {
              page.drawText(wmText, {
                x: tx + xOffsetPt,
                y: ty + yOffsetPt,
                font: wmFont,
                size: baseSize,
                color: wmColor,
                opacity,
                rotate: rot,
              });
            }
          }
        } else {
          let x = pW / 2 - textWidth / 2;
          let y = pH / 2;

          const pos = wm.position || 'center';
          if (pos.includes('left')) x = 36;
          else if (pos.includes('right')) x = pW - textWidth - 36;
          else x = pW / 2 - textWidth / 2;

          if (pos.includes('top')) y = pH - 72;
          else if (pos.includes('bottom')) y = 72;
          else y = pH / 2;

          x += xOffsetPt;
          y += yOffsetPt;

          page.drawText(wmText, {
            x,
            y,
            font: wmFont,
            size: baseSize,
            color: wmColor,
            opacity,
            rotate: rot,
          });
        }
      }
    }

    onProgress?.(85);
    const pdfBytes = await doc.save();
    onProgress?.(100);
    const array = new Uint8Array(pdfBytes);
    return new Blob([array], { type: 'application/pdf' });
  }

  static parsePageRange(rangeStr: string, totalPages: number): number[] {
    const pages: Set<number> = new Set();
    const parts = rangeStr.split(/[,;\s]+/);
    for (const part of parts) {
      if (!part.trim()) continue;
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(totalPages, Math.max(start, end));
          for (let p = min; p <= max; p++) pages.add(p);
        }
      } else if (part.includes('/')) {
        const p = parseInt(part.split('/')[0], 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) pages.add(p);
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) pages.add(p);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  private static toRoman(num: number, upper = true): string {
    if (num <= 0) return String(num);
    const romanMap: [number, string][] = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let res = '';
    for (const [v, s] of romanMap) {
      while (num >= v) {
        res += s;
        num -= v;
      }
    }
    return upper ? res : res.toLowerCase();
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
   * Extract existing hyperlink annotations from a PDF page
   */
  static async extractPageAnnotations(
    pdfBufferOrProxy: ArrayBuffer | any,
    pageNumber: number
  ): Promise<HyperlinkOverlay[]> {
    try {
      const proxy = typeof pdfBufferOrProxy?.getPage === 'function'
        ? pdfBufferOrProxy
        : await getDocumentProxy(new Uint8Array(pdfBufferOrProxy.slice(0)));
      const page = await proxy.getPage(pageNumber);
      const annotations = await page.getAnnotations();
      const pageIndex = pageNumber - 1;
      const links: HyperlinkOverlay[] = [];

      for (const annot of annotations) {
        if (annot.subtype === 'Link' && (annot.url || annot.unsafeUrl)) {
          const rect = annot.rect || [0, 0, 100, 20];
          const [x1, y1, x2, y2] = rect;
          links.push({
            id: `link_pdf_${pageIndex}_${links.length}_${Date.now()}`,
            pageIndex,
            url: annot.url || annot.unsafeUrl,
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.max(12, Math.abs(x2 - x1)),
            height: Math.max(10, Math.abs(y2 - y1)),
          });
        }
      }
      return links;
    } catch (err) {
      console.warn('Failed to extract page annotations:', err);
      return [];
    }
  }

  /**
   * Extract embedded images from a PDF page into interactive ImageOverlay items
   */
  static async extractPageImages(
    pdfBufferOrProxy: ArrayBuffer | any,
    pageNumber: number
  ): Promise<ImageOverlay[]> {
    try {
      const proxy = typeof pdfBufferOrProxy?.getPage === 'function'
        ? pdfBufferOrProxy
        : await getDocumentProxy(new Uint8Array(pdfBufferOrProxy.slice(0)));
      const page = await proxy.getPage(pageNumber);
      const opList = await page.getOperatorList();
      const pageIndex = pageNumber - 1;
      const images: ImageOverlay[] = [];

      let currentMatrix = [1, 0, 0, 1, 0, 0];
      const matrixStack: number[][] = [];

      const multiplyMatrices = (m1: number[], m2: number[]) => [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
      ];

      for (let i = 0; i < opList.fnArray.length; i++) {
        const fn = opList.fnArray[i];
        const args = opList.argsArray[i];

        if (fn === 10) {
          matrixStack.push([...currentMatrix]);
        } else if (fn === 11) {
          if (matrixStack.length > 0) currentMatrix = matrixStack.pop()!;
        } else if (fn === 12 && Array.isArray(args)) {
          currentMatrix = multiplyMatrices(currentMatrix, args);
        } else if ((fn === 82 || fn === 85) && args && args[0]) {
          const imgName = args[0];
          const obj = (page.objs && page.objs.get(imgName)) || (page.commonObjs && page.commonObjs.get(imgName));
          if (obj && obj.data && obj.width && obj.height) {
            const canvas = document.createElement('canvas');
            canvas.width = obj.width;
            canvas.height = obj.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const imgData = ctx.createImageData(obj.width, obj.height);
              if (obj.data.length === obj.width * obj.height * 4) {
                imgData.data.set(obj.data);
              } else if (obj.data.length === obj.width * obj.height * 3) {
                for (let p = 0, q = 0; p < obj.data.length; p += 3, q += 4) {
                  imgData.data[q] = obj.data[p];
                  imgData.data[q + 1] = obj.data[p + 1];
                  imgData.data[q + 2] = obj.data[p + 2];
                  imgData.data[q + 3] = 255;
                }
              } else {
                continue;
              }
              ctx.putImageData(imgData, 0, 0);
              const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
              if (blob) {
                const buf = await blob.arrayBuffer();
                const imgW = Math.max(16, Math.round(Math.abs(currentMatrix[0]) || obj.width));
                const imgH = Math.max(16, Math.round(Math.abs(currentMatrix[3]) || obj.height));
                const imgX = Math.round(currentMatrix[4] || 0);
                const imgY = Math.round(currentMatrix[5] || 0);
                images.push({
                  id: `img_extracted_${pageIndex}_${images.length}_${Date.now()}`,
                  pageIndex,
                  imageData: buf,
                  imageType: 'png',
                  x: imgX,
                  y: imgY,
                  width: imgW,
                  height: imgH,
                  rotation: 0,
                  opacity: 1,
                });
              }
            }
          }
        }
      }
      return images;
    } catch (err) {
      console.warn('Image extraction note:', err);
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

  public static drawVectorShape(
    page: PDFPage,
    type: ShapeType,
    x: number,
    y: number,
    width: number,
    height: number,
    stroke: RGB,
    fill?: RGB,
    borderWidth: number = 1.5,
    rot?: any,
    op: number = 1
  ) {
    if (type === 'circle') {
      const rx = width / 2;
      const ry = height / 2;
      page.drawEllipse({
        x: x + rx,
        y: y + ry,
        xScale: rx,
        yScale: ry,
        borderColor: stroke,
        borderWidth,
        color: fill,
        rotate: rot,
        opacity: op,
      });
    } else if (type === 'line') {
      page.drawLine({
        start: { x, y: y + height / 2 },
        end: { x: x + width, y: y + height / 2 },
        color: stroke,
        thickness: borderWidth,
        opacity: op,
      });
    } else if (type === 'arrow' || type === 'double-arrow') {
      page.drawLine({
        start: { x, y: y + height / 2 },
        end: { x: x + width, y: y + height / 2 },
        color: stroke,
        thickness: borderWidth,
        opacity: op,
      });
      const headSize = Math.min(12, Math.max(5, height * 0.35));
      const endX = x + width;
      const midY = y + height / 2;
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
      if (type === 'double-arrow') {
        const startX = x;
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
    } else if (type === 'triangle') {
      const p1 = { x: x + width / 2, y: y + height };
      const p2 = { x, y };
      const p3 = { x: x + width, y };
      page.drawLine({ start: p1, end: p2, color: stroke, thickness: borderWidth, opacity: op });
      page.drawLine({ start: p2, end: p3, color: stroke, thickness: borderWidth, opacity: op });
      page.drawLine({ start: p3, end: p1, color: stroke, thickness: borderWidth, opacity: op });
    } else if (type === 'diamond') {
      const p1 = { x: x + width / 2, y: y + height };
      const p2 = { x: x + width, y: y + height / 2 };
      const p3 = { x: x + width / 2, y };
      const p4 = { x, y: y + height / 2 };
      page.drawLine({ start: p1, end: p2, color: stroke, thickness: borderWidth, opacity: op });
      page.drawLine({ start: p2, end: p3, color: stroke, thickness: borderWidth, opacity: op });
      page.drawLine({ start: p3, end: p4, color: stroke, thickness: borderWidth, opacity: op });
      page.drawLine({ start: p4, end: p1, color: stroke, thickness: borderWidth, opacity: op });
    } else if (type === 'star') {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const outerR = Math.min(width, height) / 2 - borderWidth;
      const innerR = outerR * 0.4;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }
      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        page.drawLine({ start: pts[i], end: next, color: stroke, thickness: borderWidth, opacity: op });
      }
    } else if (type === 'pentagon' || type === 'hexagon') {
      const sides = type === 'pentagon' ? 5 : 6;
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = Math.min(width, height) / 2 - borderWidth;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }
      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        page.drawLine({ start: pts[i], end: next, color: stroke, thickness: borderWidth, opacity: op });
      }
    } else {
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor: stroke,
        borderWidth,
        color: fill,
        rotate: rot,
        opacity: op,
      });
    }
  }
}
