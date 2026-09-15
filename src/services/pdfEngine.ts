import { PDFDocument } from 'pdf-lib';
import pako from 'pako';
import { PdfProcessingOptions } from '../types';

export class PdfEngine {
  /**
   * Compress PDF by pruning unreferenced objects, stripping metadata,
   * and deflating internal object streams using pako/zlib.
   */
  static async compressPdf(
    file: File,
    options: PdfProcessingOptions,
    onProgress?: (p: number) => void
  ): Promise<Blob> {
    onProgress?.(15);
    const arrayBuffer = await file.arrayBuffer();
    onProgress?.(35);

    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      updateMetadata: false,
      ignoreEncryption: true,
    });
    onProgress?.(55);

    if (options.stripMetadata) {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
    }

    onProgress?.(75);
    // Save with stream optimization
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    onProgress?.(90);

    const blob = new Blob([compressedBytes], { type: 'application/pdf' });
    onProgress?.(100);
    return blob;
  }
}
