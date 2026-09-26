import { OcrEngine } from './ocrEngine';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export class UniversalDocumentLoader {
  /**
   * Convert any supported file type (PDF, Word, Excel, Images, Text) into a valid PDF File
   */
  static async loadAsPdf(file: File): Promise<File> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // 1. Native PDF
    if (ext === 'pdf' || file.type === 'application/pdf') {
      return file;
    }

    // 2. Image formats
    const isImage = file.type.startsWith('image/') ||
      ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg'].includes(ext);

    if (isImage) {
      return await OcrEngine.convertImageToPdf(file);
    }

    // 3. Word Documents (.docx)
    if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const arrayBuf = await file.arrayBuffer();
        const { value: rawText } = await mammoth.extractRawText({ arrayBuffer: arrayBuf });
        const pdfBlob = await OcrEngine.exportToPdf([
          {
            pageNumber: 1,
            text: rawText || 'Empty Word document',
            confidence: 100,
          },
        ]);
        return new File([pdfBlob], file.name.replace(/\.[^/.]+$/, '') + '.pdf', {
          type: 'application/pdf',
        });
      } catch (err) {
        console.warn('Word document parsing warning:', err);
      }
    }

    // 4. Excel Spreadsheets (.xlsx, .xls, .csv)
    if (['xlsx', 'xls', 'csv'].includes(ext) || file.type.includes('spreadsheet') || file.type.includes('excel')) {
      try {
        const arrayBuf = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuf, { type: 'array' });
        const sheetPages = workbook.SheetNames.map((sheetName, idx) => {
          const sheet = workbook.Sheets[sheetName];
          const csvText = XLSX.utils.sheet_to_csv(sheet);
          return {
            pageNumber: idx + 1,
            text: `[Sheet: ${sheetName}]\n\n` + csvText,
            confidence: 100,
          };
        });

        const pdfBlob = await OcrEngine.exportToPdf(
          sheetPages.length > 0 ? sheetPages : [{ pageNumber: 1, text: 'Empty spreadsheet', confidence: 100 }]
        );
        return new File([pdfBlob], file.name.replace(/\.[^/.]+$/, '') + '.pdf', {
          type: 'application/pdf',
        });
      } catch (err) {
        console.warn('Spreadsheet parsing warning:', err);
      }
    }

    // 4.5. PowerPoint Presentations (.pptx)
    if (ext === 'pptx' || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const slideFiles = Object.keys(zip.files)
          .filter((f) => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/[^0-9]/g, '') || '0', 10);
            const numB = parseInt(b.replace(/[^0-9]/g, '') || '0', 10);
            return numA - numB;
          });

        const pages = [];
        for (let i = 0; i < slideFiles.length; i++) {
          const slideXml = await zip.files[slideFiles[i]].async('text');
          const textMatches = slideXml.match(/<a:t[^>]*>(.*?)<\/a:t>/gs) || [];
          const slideText = textMatches
            .map((m) => m.replace(/<[^>]+>/g, '').trim())
            .filter(Boolean)
            .join('\n');
          pages.push({
            pageNumber: i + 1,
            text: slideText || `Slide ${i + 1}`,
            confidence: 100,
          });
        }
        if (pages.length > 0) {
          const pdfBlob = await OcrEngine.exportToPdf(pages);
          return new File([pdfBlob], file.name.replace(/\.[^/.]+$/, '') + '.pdf', {
            type: 'application/pdf',
          });
        }
      } catch (err) {
        console.warn('PowerPoint presentation parsing warning:', err);
      }
    }

    // 5. Plain text, Markdown, JSON, Log files
    if (['txt', 'md', 'json', 'log', 'rtf'].includes(ext) || file.type.startsWith('text/')) {
      try {
        const text = await file.text();
        const pdfBlob = await OcrEngine.exportToPdf([
          {
            pageNumber: 1,
            text: text || 'Empty text file',
            confidence: 100,
          },
        ]);
        return new File([pdfBlob], file.name.replace(/\.[^/.]+$/, '') + '.pdf', {
          type: 'application/pdf',
        });
      } catch (err) {
        console.warn('Text file parsing warning:', err);
      }
    }

    // Fallback: Attempt image-to-PDF if unknown binary
    try {
      return await OcrEngine.convertImageToPdf(file);
    } catch {
      throw new Error(`Unsupported document format (.${ext}). Omnisize supports PDF, Images, Word, Excel, and Text files.`);
    }
  }
}
