import { Document, Paragraph, TextRun, HeadingLevel, ImageRun, Packer } from 'docx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getDocumentProxy } from 'unpdf';
import * as XLSX from 'xlsx';

export interface ConversionTarget {
  format: string;
  label: string;
  extension: string;
  mimeType: string;
  category: 'document' | 'image' | 'video' | 'sheet' | 'audio';
}

/**
 * Remove illegal XML 1.0 control characters that crash Microsoft Word's XML parser
 */
function sanitizeXml(str: string): string {
  if (!str) return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g, '');
}

export class ConversionEngine {
  static getSupportedTargets(fileName: string): ConversionTarget[] {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // 1. PDF
    if (ext === 'pdf') {
      return [
        { format: 'docx', label: 'Word Document (.docx)', extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document' },
        { format: 'txt', label: 'Plain Text (.txt)', extension: 'txt', mimeType: 'text/plain', category: 'document' },
        { format: 'html', label: 'HTML Webpage (.html)', extension: 'html', mimeType: 'text/html', category: 'document' },
        { format: 'png', label: 'PNG Image (.png)', extension: 'png', mimeType: 'image/png', category: 'image' },
        { format: 'jpg', label: 'JPG Image (.jpg)', extension: 'jpg', mimeType: 'image/jpeg', category: 'image' },
        { format: 'webp', label: 'WebP Image (.webp)', extension: 'webp', mimeType: 'image/webp', category: 'image' },
      ];
    }

    // 2. Word (DOCX / DOC)
    if (['docx', 'doc'].includes(ext)) {
      return [
        { format: 'pdf', label: 'PDF Document (.pdf)', extension: 'pdf', mimeType: 'application/pdf', category: 'document' },
        { format: 'txt', label: 'Plain Text (.txt)', extension: 'txt', mimeType: 'text/plain', category: 'document' },
        { format: 'html', label: 'HTML Webpage (.html)', extension: 'html', mimeType: 'text/html', category: 'document' },
        { format: 'md', label: 'Markdown Document (.md)', extension: 'md', mimeType: 'text/markdown', category: 'document' },
      ];
    }

    // 3. PowerPoint (PPTX / PPT)
    if (['pptx', 'ppt'].includes(ext)) {
      return [
        { format: 'pdf', label: 'PDF Presentation (.pdf)', extension: 'pdf', mimeType: 'application/pdf', category: 'document' },
        { format: 'docx', label: 'Word Slide Summary (.docx)', extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document' },
        { format: 'txt', label: 'Plain Text Outline (.txt)', extension: 'txt', mimeType: 'text/plain', category: 'document' },
        { format: 'html', label: 'HTML Presentation (.html)', extension: 'html', mimeType: 'text/html', category: 'document' },
      ];
    }

    // 4. Spreadsheets (XLSX, XLS, CSV)
    if (['xlsx', 'xls', 'csv', 'tsv', 'ods'].includes(ext)) {
      const targets: ConversionTarget[] = [];
      if (ext !== 'csv') {
        targets.push({ format: 'csv', label: 'CSV Comma Separated (.csv)', extension: 'csv', mimeType: 'text/csv', category: 'sheet' });
      }
      if (ext !== 'xlsx') {
        targets.push({ format: 'xlsx', label: 'Excel Workbook (.xlsx)', extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'sheet' });
      }
      targets.push(
        { format: 'pdf', label: 'PDF Table Document (.pdf)', extension: 'pdf', mimeType: 'application/pdf', category: 'document' },
        { format: 'html', label: 'HTML Table (.html)', extension: 'html', mimeType: 'text/html', category: 'document' },
        { format: 'json', label: 'JSON Dataset (.json)', extension: 'json', mimeType: 'application/json', category: 'document' },
        { format: 'txt', label: 'Tabular Text (.txt)', extension: 'txt', mimeType: 'text/plain', category: 'document' }
      );
      return targets;
    }

    // 5. Plain Text, Markdown, HTML, JSON
    if (['txt', 'md', 'markdown', 'json', 'html', 'htm', 'rtf'].includes(ext)) {
      return [
        { format: 'pdf', label: 'PDF Document (.pdf)', extension: 'pdf', mimeType: 'application/pdf', category: 'document' },
        { format: 'docx', label: 'Word Document (.docx)', extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document' },
        { format: 'html', label: 'HTML Webpage (.html)', extension: 'html', mimeType: 'text/html', category: 'document' },
        { format: 'txt', label: 'Plain Text (.txt)', extension: 'txt', mimeType: 'text/plain', category: 'document' },
      ];
    }

    // 6. Images
    if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'gif', 'svg', 'ico', 'tiff', 'tif'].includes(ext)) {
      const targets: ConversionTarget[] = [];
      if (ext !== 'png') targets.push({ format: 'png', label: 'PNG Image (.png)', extension: 'png', mimeType: 'image/png', category: 'image' });
      if (ext !== 'jpg' && ext !== 'jpeg') targets.push({ format: 'jpg', label: 'JPG / JPEG (.jpg)', extension: 'jpg', mimeType: 'image/jpeg', category: 'image' });
      if (ext !== 'webp') targets.push({ format: 'webp', label: 'WebP Modern Image (.webp)', extension: 'webp', mimeType: 'image/webp', category: 'image' });
      targets.push(
        { format: 'pdf', label: 'PDF Document (.pdf)', extension: 'pdf', mimeType: 'application/pdf', category: 'document' },
        { format: 'ico', label: 'Icon File (.ico)', extension: 'ico', mimeType: 'image/x-icon', category: 'image' },
        { format: 'bmp', label: 'Windows Bitmap (.bmp)', extension: 'bmp', mimeType: 'image/bmp', category: 'image' },
        { format: 'svg', label: 'Vector SVG Container (.svg)', extension: 'svg', mimeType: 'image/svg+xml', category: 'image' },
        { format: 'gif', label: 'GIF Image (.gif)', extension: 'gif', mimeType: 'image/gif', category: 'image' }
      );
      return targets;
    }

    // 7. Video
    if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'flv', 'wmv', '3gp'].includes(ext)) {
      return [
        { format: 'mp4', label: 'Standard MP4 Video (.mp4)', extension: 'mp4', mimeType: 'video/mp4', category: 'video' },
        { format: 'webm', label: 'WebM Video (.webm)', extension: 'webm', mimeType: 'video/webm', category: 'video' },
        { format: 'hevc', label: 'HEVC / H.265 High Efficiency (.mp4)', extension: 'mp4', mimeType: 'video/mp4', category: 'video' },
        { format: 'gif', label: 'Animated GIF (.gif)', extension: 'gif', mimeType: 'image/gif', category: 'image' },
        { format: 'mp3', label: 'Extract MP3 Audio (.mp3)', extension: 'mp3', mimeType: 'audio/mp3', category: 'audio' },
        { format: 'wav', label: 'Extract WAV Audio (.wav)', extension: 'wav', mimeType: 'audio/wav', category: 'audio' },
        { format: 'm4a', label: 'Extract Apple M4A (.m4a)', extension: 'm4a', mimeType: 'audio/mp4', category: 'audio' },
        { format: 'aac', label: 'Extract AAC Audio (.aac)', extension: 'aac', mimeType: 'audio/aac', category: 'audio' },
        { format: 'ogg', label: 'Extract OGG Opus (.ogg)', extension: 'ogg', mimeType: 'audio/ogg', category: 'audio' },
        { format: 'flac', label: 'Extract FLAC Lossless (.flac)', extension: 'flac', mimeType: 'audio/flac', category: 'audio' },
        { format: 'aiff', label: 'Extract Apple AIFF (.aiff)', extension: 'aiff', mimeType: 'audio/aiff', category: 'audio' },
      ];
    }

    // 8. Audio (All major formats)
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'aiff', 'aif', 'wma', 'opus'].includes(ext)) {
      return [
        { format: 'mp3', label: 'MP3 Audio (.mp3)', extension: 'mp3', mimeType: 'audio/mp3', category: 'audio' },
        { format: 'wav', label: 'WAV Studio Master (.wav)', extension: 'wav', mimeType: 'audio/wav', category: 'audio' },
        { format: 'm4a', label: 'Apple M4A Audio (.m4a)', extension: 'm4a', mimeType: 'audio/mp4', category: 'audio' },
        { format: 'aac', label: 'AAC High-Efficiency (.aac)', extension: 'aac', mimeType: 'audio/aac', category: 'audio' },
        { format: 'ogg', label: 'OGG Opus Audio (.ogg)', extension: 'ogg', mimeType: 'audio/ogg', category: 'audio' },
        { format: 'flac', label: 'FLAC Lossless Audio (.flac)', extension: 'flac', mimeType: 'audio/flac', category: 'audio' },
        { format: 'aiff', label: 'Apple AIFF Studio (.aiff)', extension: 'aiff', mimeType: 'audio/aiff', category: 'audio' },
      ];
    }

    return [
      { format: 'txt', label: 'Text File (.txt)', extension: 'txt', mimeType: 'text/plain', category: 'document' },
      { format: 'pdf', label: 'PDF Document (.pdf)', extension: 'pdf', mimeType: 'application/pdf', category: 'document' },
    ];
  }

  static async convertFile(
    file: File,
    targetFormat: string,
    onProgress?: (pct: number) => void
  ): Promise<{ blob: Blob; filename: string }> {
    const srcExt = file.name.split('.').pop()?.toLowerCase() || '';
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    onProgress?.(10);

    // 1. PDF conversions
    if (srcExt === 'pdf') {
      if (targetFormat === 'docx') {
        const blob = await this.pdfToDocx(file, onProgress);
        return { blob, filename: `${baseName}.docx` };
      }
      if (targetFormat === 'txt') {
        const blob = await this.pdfToTxt(file, onProgress);
        return { blob, filename: `${baseName}.txt` };
      }
      if (targetFormat === 'html') {
        const blob = await this.pdfToHtml(file, onProgress);
        return { blob, filename: `${baseName}.html` };
      }
      if (['png', 'jpg', 'webp'].includes(targetFormat)) {
        const blob = await this.pdfToImage(file, targetFormat, onProgress);
        return { blob, filename: `${baseName}.${targetFormat}` };
      }
    }

    // 2. Word (DOCX / DOC) conversions
    if (['docx', 'doc'].includes(srcExt)) {
      if (targetFormat === 'pdf') {
        const blob = await this.docxToPdf(file, onProgress);
        return { blob, filename: `${baseName}.pdf` };
      }
      if (['txt', 'html', 'md'].includes(targetFormat)) {
        const blob = await this.docxToTextOrHtml(file, targetFormat, onProgress);
        return { blob, filename: `${baseName}.${targetFormat}` };
      }
    }

    // 3. PowerPoint (PPTX / PPT) conversions
    if (['pptx', 'ppt'].includes(srcExt)) {
      if (targetFormat === 'pdf') {
        const blob = await this.pptxToPdf(file, onProgress);
        return { blob, filename: `${baseName}.pdf` };
      }
      if (targetFormat === 'docx') {
        const blob = await this.pptxToDocx(file, onProgress);
        return { blob, filename: `${baseName}.docx` };
      }
      if (['txt', 'html'].includes(targetFormat)) {
        const blob = await this.pptxToTextOrHtml(file, targetFormat, onProgress);
        return { blob, filename: `${baseName}.${targetFormat}` };
      }
    }

    // 4. Spreadsheets (XLSX, XLS, CSV) conversions
    if (['xlsx', 'xls', 'csv', 'tsv', 'ods'].includes(srcExt)) {
      const blob = await this.convertSpreadsheet(file, srcExt, targetFormat, onProgress);
      return { blob, filename: `${baseName}.${targetFormat}` };
    }

    // 5. Plain Text, Markdown, HTML conversions
    if (['txt', 'md', 'markdown', 'json', 'html', 'htm'].includes(srcExt)) {
      const blob = await this.convertTextDocument(file, srcExt, targetFormat, onProgress);
      return { blob, filename: `${baseName}.${targetFormat}` };
    }

    // 6. Image conversions
    if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'gif', 'svg', 'ico', 'tiff', 'tif'].includes(srcExt)) {
      if (targetFormat === 'pdf') {
        const blob = await this.imageToPdf(file, onProgress);
        return { blob, filename: `${baseName}.pdf` };
      }
      if (targetFormat === 'svg') {
        const blob = await this.imageToSvg(file, onProgress);
        return { blob, filename: `${baseName}.svg` };
      }
      const blob = await this.convertImage(file, targetFormat, onProgress);
      return { blob, filename: `${baseName}.${targetFormat}` };
    }

    // 7. Video & Audio conversions
    if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'flv', 'wmv', '3gp', 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'aiff', 'aif', 'wma', 'opus'].includes(srcExt)) {
      const blob = await this.convertVideoOrAudio(file, targetFormat, onProgress);
      const outExt = targetFormat === 'gif' ? 'gif'
        : ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'aiff'].includes(targetFormat) ? targetFormat
        : targetFormat === 'webm' ? 'webm'
        : 'mp4';
      return { blob, filename: `${baseName}.${outExt}` };
    }

    onProgress?.(100);
    return { blob: file, filename: file.name };
  }

  /**
   * PDF to Microsoft Word (.docx)
   * Converts PDF pages into clean, high-fidelity Word document pages without broken raw text dumps.
   */
  private static async pdfToDocx(file: File, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(15);
    const buffer = await file.arrayBuffer();
    const proxy = await getDocumentProxy(new Uint8Array(buffer));
    const numPages = proxy.numPages;

    const children: Paragraph[] = [];

    for (let i = 1; i <= numPages; i++) {
      onProgress?.(15 + Math.round((i / numPages) * 70));
      const page = await proxy.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await (page.render as any)({
          canvasContext: ctx,
          viewport,
        }).promise;

        const imgBlob = await new Promise<Blob>((res) => {
          canvas.toBlob((b) => res(b || new Blob()), 'image/jpeg', 0.88);
        });

        const imgBuffer = await imgBlob.arrayBuffer();

        const maxWidth = 480;
        const scaleDown = Math.min(1.0, maxWidth / viewport.width);
        const w = Math.round(viewport.width * scaleDown);
        const h = Math.round(viewport.height * scaleDown);

        children.push(
          new Paragraph({
            pageBreakBefore: i > 1,
            children: [
              new ImageRun({
                data: new Uint8Array(imgBuffer),
                type: 'jpg',
                transformation: {
                  width: w,
                  height: h,
                },
              }),
            ],
          })
        );
      }
    }

    onProgress?.(88);
    const doc = new Document({
      sections: [{ children }],
    });

    const arrayBuffer = await Packer.toArrayBuffer(doc);
    onProgress?.(100);

    return new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  /**
   * PDF to Text (.txt)
   */
  private static async pdfToTxt(file: File, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(25);
    const buffer = await file.arrayBuffer();
    const proxy = await getDocumentProxy(new Uint8Array(buffer));
    let fullText = '';

    for (let i = 1; i <= proxy.numPages; i++) {
      onProgress?.(25 + Math.round((i / proxy.numPages) * 70));
      const page = await proxy.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => it.str).join(' ');
      fullText += `\n\n=== Page ${i} ===\n\n` + sanitizeXml(pageText);
    }

    onProgress?.(100);
    return new Blob([fullText.trim()], { type: 'text/plain' });
  }

  /**
   * PDF to HTML (.html)
   */
  private static async pdfToHtml(file: File, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(20);
    const buffer = await file.arrayBuffer();
    const proxy = await getDocumentProxy(new Uint8Array(buffer));
    let htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sanitizeXml(file.name)}</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:850px;margin:2rem auto;padding:1rem;line-height:1.6;color:#1e293b;background:#f8fafc}.page{background:#fff;padding:2.5rem;margin-bottom:2rem;border-radius:12px;box-shadow:0 4px 6px -1px rgb(0 0 0/0.1);border:1px solid #e2e8f0}.header{font-size:0.8rem;color:#64748b;margin-bottom:1rem;text-transform:uppercase;letter-spacing:0.05em}</style></head><body>`;

    for (let i = 1; i <= proxy.numPages; i++) {
      onProgress?.(20 + Math.round((i / proxy.numPages) * 75));
      const page = await proxy.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: any) => it.str).join(' ');

      htmlContent += `<div class="page"><div class="header">Page ${i}</div><p>${sanitizeXml(pageText) || '<em>[Page content]</em>'}</p></div>`;
    }

    htmlContent += `</body></html>`;
    onProgress?.(100);
    return new Blob([htmlContent], { type: 'text/html' });
  }

  /**
   * PDF to Image
   */
  private static async pdfToImage(file: File, format: string, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(30);
    const buffer = await file.arrayBuffer();
    const proxy = await getDocumentProxy(new Uint8Array(buffer));
    const page = await proxy.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

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

    onProgress?.(85);
    const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    return new Promise((res) => {
      canvas.toBlob((b) => res(b || new Blob()), mime, 0.92);
    });
  }

  /**
   * Word (.docx) to PDF
   */
  private static async docxToPdf(file: File, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(25);
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = sanitizeXml(result.value || 'Empty Document');

    onProgress?.(55);
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const lineHeight = 16;
    const margin = 50;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const maxLineWidth = pageWidth - margin * 2;

    const lines = text.split('\n');
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (const rawLine of lines) {
      const words = rawLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);

        if (width < maxLineWidth) {
          currentLine = testLine;
        } else {
          if (y < margin + lineHeight) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
          y -= lineHeight;
          currentLine = word;
        }
      }

      if (currentLine) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
        y -= lineHeight;
      }
      y -= 4; // paragraph spacing
    }

    onProgress?.(95);
    const bytes = await pdfDoc.save();
    onProgress?.(100);
    return new Blob([bytes], { type: 'application/pdf' });
  }

  /**
   * Word (.docx) to Text / HTML / Markdown
   */
  private static async docxToTextOrHtml(file: File, format: string, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(40);
    const arrayBuffer = await file.arrayBuffer();
    if (format === 'html') {
      const res = await mammoth.convertToHtml({ arrayBuffer });
      onProgress?.(100);
      return new Blob([res.value], { type: 'text/html' });
    } else if (format === 'md') {
      const res = await mammoth.convertToHtml({ arrayBuffer });
      const html = res.value || '';
      const md = html
        .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
      onProgress?.(100);
      return new Blob([md], { type: 'text/markdown' });
    } else {
      const res = await mammoth.extractRawText({ arrayBuffer });
      onProgress?.(100);
      return new Blob([res.value], { type: 'text/plain' });
    }
  }

  /**
   * PowerPoint (.pptx) to PDF
   */
  private static async pptxToPdf(file: File, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(20);
    const zip = await JSZip.loadAsync(file);
    const slideFiles: string[] = [];

    zip.forEach((path) => {
      if (path.match(/^ppt\/slides\/slide\d+\.xml$/)) slideFiles.push(path);
    });

    slideFiles.sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const slideWidth = 720;
    const slideHeight = 540;

    for (let i = 0; i < slideFiles.length; i++) {
      onProgress?.(20 + Math.round(((i + 1) / slideFiles.length) * 70));
      const content = await zip.file(slideFiles[i])!.async('text');
      const textMatches = Array.from(content.matchAll(/<a:t>([^<]+)<\/a:t>/g)).map((m) => sanitizeXml(m[1]));

      const page = pdfDoc.addPage([slideWidth, slideHeight]);
      page.drawRectangle({
        x: 0,
        y: 0,
        width: slideWidth,
        height: slideHeight,
        color: rgb(0.98, 0.98, 0.99),
      });

      page.drawText(`Slide ${i + 1}`, {
        x: 40,
        y: slideHeight - 50,
        size: 20,
        font: boldFont,
        color: rgb(0.1, 0.2, 0.5),
      });

      let textY = slideHeight - 100;
      for (const t of textMatches) {
        if (textY < 60) break;
        page.drawText(`• ${t}`, {
          x: 50,
          y: textY,
          size: 13,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
        textY -= 24;
      }
    }

    onProgress?.(95);
    const bytes = await pdfDoc.save();
    onProgress?.(100);
    return new Blob([bytes], { type: 'application/pdf' });
  }

  /**
   * PowerPoint (.pptx) to Word (.docx)
   */
  private static async pptxToDocx(file: File, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(20);
    const zip = await JSZip.loadAsync(file);
    const slideFiles: string[] = [];

    zip.forEach((path) => {
      if (path.match(/^ppt\/slides\/slide\d+\.xml$/)) slideFiles.push(path);
    });

    slideFiles.sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));

    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: sanitizeXml(file.name.replace(/\.pptx$/i, '')) + ' (Presentation Export)',
        heading: HeadingLevel.TITLE,
      }),
    ];

    for (let i = 0; i < slideFiles.length; i++) {
      onProgress?.(20 + Math.round(((i + 1) / slideFiles.length) * 70));
      const content = await zip.file(slideFiles[i])!.async('text');
      const texts = Array.from(content.matchAll(/<a:t>([^<]+)<\/a:t>/g)).map((m) => sanitizeXml(m[1]));

      paragraphs.push(
        new Paragraph({
          text: `Slide ${i + 1}`,
          heading: HeadingLevel.HEADING_2,
          pageBreakBefore: i > 0,
        })
      );

      for (const t of texts) {
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun(t)],
          })
        );
      }
    }

    onProgress?.(90);
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const arrayBuffer = await Packer.toArrayBuffer(doc);
    onProgress?.(100);

    return new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  /**
   * PowerPoint (.pptx) to Text or HTML
   */
  private static async pptxToTextOrHtml(file: File, format: string, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(30);
    const zip = await JSZip.loadAsync(file);
    const slideFiles: string[] = [];

    zip.forEach((path) => {
      if (path.match(/^ppt\/slides\/slide\d+\.xml$/)) slideFiles.push(path);
    });
    slideFiles.sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));

    if (format === 'html') {
      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sanitizeXml(file.name)}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:1rem;color:#1e293b}.slide{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:2rem;margin-bottom:1.5rem}h2{color:#4338ca;margin-top:0}</style></head><body><h1>${sanitizeXml(file.name)}</h1>`;
      for (let i = 0; i < slideFiles.length; i++) {
        const content = await zip.file(slideFiles[i])!.async('text');
        const texts = Array.from(content.matchAll(/<a:t>([^<]+)<\/a:t>/g)).map((m) => sanitizeXml(m[1]));
        html += `<div class="slide"><h2>Slide ${i + 1}</h2><ul>${texts.map((t) => `<li>${t}</li>`).join('')}</ul></div>`;
      }
      html += '</body></html>';
      onProgress?.(100);
      return new Blob([html], { type: 'text/html' });
    } else {
      let text = `=== ${file.name} ===\n\n`;
      for (let i = 0; i < slideFiles.length; i++) {
        const content = await zip.file(slideFiles[i])!.async('text');
        const texts = Array.from(content.matchAll(/<a:t>([^<]+)<\/a:t>/g)).map((m) => sanitizeXml(m[1]));
        text += `\n--- Slide ${i + 1} ---\n` + texts.map((t) => `• ${t}`).join('\n') + '\n';
      }
      onProgress?.(100);
      return new Blob([text.trim()], { type: 'text/plain' });
    }
  }

  /**
   * Spreadsheet Conversions (XLSX, XLS, CSV)
   */
  private static async convertSpreadsheet(
    file: File,
    srcExt: string,
    targetFormat: string,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    onProgress?.(25);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    onProgress?.(60);

    // To CSV
    if (targetFormat === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      onProgress?.(100);
      return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    }

    // To XLSX
    if (targetFormat === 'xlsx') {
      const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      onProgress?.(100);
      return new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }

    // To JSON
    if (targetFormat === 'json') {
      const data = XLSX.utils.sheet_to_json(worksheet);
      onProgress?.(100);
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }

    // To HTML
    if (targetFormat === 'html') {
      const tableHtml = XLSX.utils.sheet_to_html(worksheet);
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sanitizeXml(file.name)}</title><style>body{font-family:system-ui,sans-serif;padding:2rem;background:#f8fafc}table{border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)}td,th{border:1px solid #e2e8f0;padding:8px 12px;font-size:13px;text-align:left}tr:nth-child(even){background:#f8fafc}tr:hover{background:#f1f5f9}</style></head><body><h2>${sanitizeXml(file.name)}</h2>${tableHtml}</body></html>`;
      onProgress?.(100);
      return new Blob([fullHtml], { type: 'text/html' });
    }

    // To Plain Text
    if (targetFormat === 'txt') {
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const text = rows.map((r) => r.join('\t')).join('\n');
      onProgress?.(100);
      return new Blob([text], { type: 'text/plain' });
    }

    // To PDF
    if (targetFormat === 'pdf') {
      onProgress?.(70);
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 841.89; // Landscape A4
      const pageHeight = 595.28;
      const margin = 40;

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      page.drawText(`${file.name} - ${firstSheetName}`, {
        x: margin,
        y,
        size: 14,
        font: boldFont,
        color: rgb(0.1, 0.2, 0.5),
      });
      y -= 30;

      const colWidth = Math.min(140, Math.floor((pageWidth - margin * 2) / Math.max(1, (rows[0]?.length || 1))));

      for (let r = 0; r < rows.length; r++) {
        if (y < margin + 20) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }

        const row = rows[r];
        const isHeader = r === 0;

        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] ?? '').slice(0, 25);
          page.drawText(val, {
            x: margin + c * colWidth,
            y,
            size: isHeader ? 10 : 9,
            font: isHeader ? boldFont : font,
            color: isHeader ? rgb(0.1, 0.1, 0.8) : rgb(0.2, 0.2, 0.2),
          });
        }
        y -= isHeader ? 18 : 15;
      }

      onProgress?.(95);
      const bytes = await pdfDoc.save();
      onProgress?.(100);
      return new Blob([bytes], { type: 'application/pdf' });
    }

    return new Blob([arrayBuffer]);
  }

  /**
   * Text & Markdown document conversions (TXT, MD, HTML -> PDF, DOCX)
   */
  private static async convertTextDocument(
    file: File,
    srcExt: string,
    targetFormat: string,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    onProgress?.(30);
    const text = await file.text();

    if (targetFormat === 'pdf') {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 50;
      const maxLineWidth = pageWidth - margin * 2;
      const lineHeight = 16;

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      const lines = text.split('\n');

      for (const line of lines) {
        const isHeading = line.startsWith('#');
        const cleanLine = line.replace(/^#+\s*/, '');
        const currentFont = isHeading ? boldFont : font;
        const fontSize = isHeading ? 14 : 10;

        const words = cleanLine.split(' ');
        let cur = '';

        for (const w of words) {
          const test = cur ? `${cur} ${w}` : w;
          if (currentFont.widthOfTextAtSize(test, fontSize) < maxLineWidth) {
            cur = test;
          } else {
            if (y < margin + lineHeight) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
            page.drawText(cur, { x: margin, y, size: fontSize, font: currentFont, color: rgb(0.15, 0.15, 0.15) });
            y -= lineHeight;
            cur = w;
          }
        }

        if (cur) {
          if (y < margin + lineHeight) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          page.drawText(cur, { x: margin, y, size: fontSize, font: currentFont, color: rgb(0.15, 0.15, 0.15) });
          y -= lineHeight;
        }
        y -= 3;
      }

      onProgress?.(90);
      const bytes = await pdfDoc.save();
      onProgress?.(100);
      return new Blob([bytes], { type: 'application/pdf' });
    }

    if (targetFormat === 'docx') {
      const paragraphs: Paragraph[] = [];
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('# ')) {
          paragraphs.push(new Paragraph({ text: sanitizeXml(line.replace(/^#\s*/, '')), heading: HeadingLevel.HEADING_1 }));
        } else if (line.startsWith('## ')) {
          paragraphs.push(new Paragraph({ text: sanitizeXml(line.replace(/^##\s*/, '')), heading: HeadingLevel.HEADING_2 }));
        } else {
          paragraphs.push(new Paragraph({ children: [new TextRun(sanitizeXml(line))] }));
        }
      }

      const doc = new Document({ sections: [{ children: paragraphs }] });
      const arrayBuffer = await Packer.toArrayBuffer(doc);
      onProgress?.(100);
      return new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    }

    if (targetFormat === 'html') {
      const lines = text.split('\n').map((l) => `<p>${sanitizeXml(l)}</p>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sanitizeXml(file.name)}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:1rem;line-height:1.6}</style></head><body>${lines}</body></html>`;
      onProgress?.(100);
      return new Blob([html], { type: 'text/html' });
    }

    onProgress?.(100);
    return new Blob([text], { type: 'text/plain' });
  }

  /**
   * Image to PDF
   */
  private static async imageToPdf(file: File, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(30);
    const pdfDoc = await PDFDocument.create();
    const arrayBuffer = await file.arrayBuffer();

    let embeddedImage;
    if (file.type === 'image/jpeg' || file.name.match(/\.jpe?g$/i)) {
      embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
    } else {
      const pngBuffer = await this.convertToPngBuffer(file);
      embeddedImage = await pdfDoc.embedPng(pngBuffer);
    }

    onProgress?.(70);
    const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: embeddedImage.width,
      height: embeddedImage.height,
    });

    onProgress?.(95);
    const bytes = await pdfDoc.save();
    onProgress?.(100);
    return new Blob([bytes], { type: 'application/pdf' });
  }

  /**
   * Image to SVG container
   */
  private static async imageToSvg(file: File, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(40);
    const dataUrl = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(file);
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise((res) => (img.onload = res));

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.naturalWidth}" height="${img.naturalHeight}" viewBox="0 0 ${img.naturalWidth} ${img.naturalHeight}">
  <image href="${dataUrl}" width="${img.naturalWidth}" height="${img.naturalHeight}" />
</svg>`;

    onProgress?.(100);
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  private static async convertToPngBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (b) => {
          if (b) resolve(await b.arrayBuffer());
          else reject(new Error('Canvas PNG export failed'));
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image failed to load'));
      };
      img.src = url;
    });
  }

  /**
   * Image to Other Image Formats
   */
  private static async convertImage(file: File, targetFormat: string, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(30);
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        onProgress?.(60);

        let w = img.naturalWidth || 600;
        let h = img.naturalHeight || 600;

        if (targetFormat === 'ico') {
          w = 64;
          h = 64;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;

        if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }

        ctx.drawImage(img, 0, 0, w, h);
        onProgress?.(85);

        let mime = 'image/png';
        if (targetFormat === 'jpg' || targetFormat === 'jpeg') mime = 'image/jpeg';
        else if (targetFormat === 'webp') mime = 'image/webp';
        else if (targetFormat === 'ico') mime = 'image/x-icon';
        else if (targetFormat === 'bmp') mime = 'image/bmp';
        else if (targetFormat === 'gif') mime = 'image/gif';

        canvas.toBlob((b) => {
          onProgress?.(100);
          resolve(b || file);
        }, mime, 0.95);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to parse source image'));
      };
      img.src = url;
    });
  }

  /**
   * Video & Audio Conversions
   */
  private static async convertVideoOrAudio(file: File, targetFormat: string, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(20);

    // Audio extraction or conversion
    if (['mp3', 'wav'].includes(targetFormat)) {
      return this.extractOrConvertAudio(file, targetFormat, onProgress);
    }

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = targetFormat === 'gif';
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration || 1;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d')!;

          let mimeType = 'video/webm;codecs=vp9';

          if (targetFormat === 'hevc') {
            if (MediaRecorder.isTypeSupported('video/mp4;codecs=hevc') || MediaRecorder.isTypeSupported('video/mp4;codecs=hvc1')) {
              mimeType = 'video/mp4;codecs=hevc';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
              mimeType = 'video/mp4';
            }
          } else if (targetFormat === 'mp4') {
            if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) mimeType = 'video/mp4;codecs=avc1';
            else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
          }

          const stream = canvas.captureStream(30);
          const recorder = new MediaRecorder(stream, { mimeType });
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            URL.revokeObjectURL(url);
            onProgress?.(100);
            resolve(new Blob(chunks, { type: mimeType }));
          };

          recorder.start(100);
          video.currentTime = 0;
          await video.play();

          const render = () => {
            if (video.paused || video.ended) {
              if (video.ended) recorder.stop();
              return;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            onProgress?.(20 + Math.min(75, Math.round((video.currentTime / duration) * 75)));
            requestAnimationFrame(render);
          };
          render();
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Video format conversion error'));
      };
    });
  }

  /**
   * Fast In-Browser Audio Encoding & Extraction Suite
   * Supports: WAV, MP3, AAC, M4A, OGG (Opus), FLAC, and AIFF
   */
  private static async extractOrConvertAudio(file: File, targetFormat: string, onProgress?: (p: number) => void): Promise<Blob> {
    onProgress?.(15);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();

    onProgress?.(40);
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    onProgress?.(65);

    // 1. WAV
    if (targetFormat === 'wav') {
      const blob = this.audioBufferToWav(audioBuffer);
      onProgress?.(100);
      return blob;
    }

    // 2. Apple AIFF
    if (targetFormat === 'aiff') {
      const blob = this.audioBufferToAiff(audioBuffer);
      onProgress?.(100);
      return blob;
    }

    // 3. OGG (Opus / Vorbis)
    if (targetFormat === 'ogg') {
      return this.encodeViaMediaRecorder(
        audioBuffer,
        ['audio/ogg;codecs=opus', 'audio/ogg;codecs=vorbis', 'audio/ogg', 'audio/webm;codecs=opus'],
        'audio/ogg',
        onProgress
      );
    }

    // 4. AAC / M4A
    if (targetFormat === 'aac' || targetFormat === 'm4a') {
      return this.encodeViaMediaRecorder(
        audioBuffer,
        ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac'],
        targetFormat === 'm4a' ? 'audio/mp4' : 'audio/aac',
        onProgress
      );
    }

    // 5. FLAC Lossless
    if (targetFormat === 'flac') {
      return this.encodeViaMediaRecorder(
        audioBuffer,
        ['audio/flac', 'audio/webm;codecs=flac'],
        'audio/flac',
        onProgress
      );
    }

    // 6. MP3
    if (targetFormat === 'mp3') {
      return this.encodeViaMediaRecorder(
        audioBuffer,
        ['audio/mp3', 'audio/mpeg', 'audio/webm;codecs=opus'],
        'audio/mp3',
        onProgress
      );
    }

    return this.audioBufferToWav(audioBuffer);
  }

  private static async encodeViaMediaRecorder(
    audioBuffer: AudioBuffer,
    mimeTypeCandidates: string[],
    fallbackMime: string,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    const supportedMime = mimeTypeCandidates.find((m) => MediaRecorder.isTypeSupported(m));

    if (supportedMime) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(dest);

      const recorder = new MediaRecorder(dest.stream, { mimeType: supportedMime });
      const chunks: Blob[] = [];

      return new Promise<Blob>((resolve) => {
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          audioCtx.close();
          onProgress?.(100);
          resolve(new Blob(chunks, { type: fallbackMime }));
        };

        recorder.start(50);
        source.start(0);

        const durationMs = Math.min(30000, audioBuffer.duration * 1000); // capped max recording
        const startTime = Date.now();
        const timer = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const p = Math.min(95, 65 + Math.round((elapsed / durationMs) * 30));
          onProgress?.(p);
          if (elapsed >= durationMs + 100) {
            clearInterval(timer);
            if (recorder.state !== 'inactive') recorder.stop();
          }
        }, 100);

        source.onended = () => {
          setTimeout(() => {
            clearInterval(timer);
            if (recorder.state !== 'inactive') recorder.stop();
          }, 100);
        };
      });
    }

    // Fallback to WAV format with target MIME type
    const wavBlob = this.audioBufferToWav(audioBuffer);
    onProgress?.(100);
    return new Blob([wavBlob], { type: fallbackMime });
  }

  private static audioBufferToAiff(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const numFrames = buffer.length;
    const bytesPerSample = 2;
    const dataSize = numFrames * numOfChan * bytesPerSample;
    const commSize = 18;
    const ssndHeaderSize = 8;
    const totalSize = 4 + 8 + commSize + 8 + ssndHeaderSize + dataSize;
    const outBuffer = new ArrayBuffer(totalSize + 8);
    const view = new DataView(outBuffer);
    let pos = 0;

    function writeStr(str: string) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos++, str.charCodeAt(i));
      }
    }

    // FORM chunk
    writeStr('FORM');
    view.setUint32(pos, totalSize, false);
    pos += 4;
    writeStr('AIFF');

    // COMM chunk
    writeStr('COMM');
    view.setUint32(pos, commSize, false);
    pos += 4;
    view.setUint16(pos, numOfChan, false);
    pos += 2;
    view.setUint32(pos, numFrames, false);
    pos += 4;
    view.setUint16(pos, 16, false);
    pos += 2;

    // 80-bit IEEE extended float for sampleRate
    const sampleRate = buffer.sampleRate;
    let exp = 0;
    let mantissa = sampleRate;
    while (mantissa >= 2) {
      mantissa /= 2;
      exp++;
    }
    while (mantissa < 1 && exp > 0) {
      mantissa *= 2;
      exp--;
    }
    const exponent = 16383 + exp;
    view.setUint16(pos, exponent, false);
    pos += 2;
    const highMantissa = Math.floor(mantissa * Math.pow(2, 31));
    view.setUint32(pos, highMantissa, false);
    pos += 4;
    view.setUint32(pos, 0, false);
    pos += 4;

    // SSND chunk
    writeStr('SSND');
    view.setUint32(pos, ssndHeaderSize + dataSize, false);
    pos += 4;
    view.setUint32(pos, 0, false);
    pos += 4;
    view.setUint32(pos, 0, false);
    pos += 4;

    // Samples (16-bit big endian)
    const channels = [];
    for (let c = 0; c < numOfChan; c++) {
      channels.push(buffer.getChannelData(c));
    }

    for (let i = 0; i < numFrames; i++) {
      for (let c = 0; c < numOfChan; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i]));
        const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(pos, Math.floor(val), false);
        pos += 2;
      }
    }

    return new Blob([outBuffer], { type: 'audio/aiff' });
  }

  private static audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const outBuffer = new ArrayBuffer(length);
    const view = new DataView(outBuffer);
    const channels = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }

    // RIFF chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"

    // fmt sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // 16 for PCM
    setUint16(1); // PCM format
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // 16-bit

    // data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (offset < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([outBuffer], { type: 'audio/wav' });
  }
}
