import React, { useState } from 'react';
import { X, FileText, Layers, Copy, Check, Loader2, Sparkles, FolderOpen, ArrowRight } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { saveFile } from '../utils/fileSaver';

export interface ImageToPdfItem {
  name: string;
  path?: string;
  data: ArrayBuffer | Uint8Array;
  mimeType?: string;
}

interface ImageToPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageToPdfItem[];
  onOpenPdfInStudio?: (pdfFile: File) => void;
}

export const ImageToPdfModal: React.FC<ImageToPdfModalProps> = ({
  isOpen,
  onClose,
  images,
  onOpenPdfInStudio,
}) => {
  const [mode, setMode] = useState<'combine' | 'separate'>('combine');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [convertedPdfs, setConvertedPdfs] = useState<{ name: string; file: File }[]>([]);

  if (!isOpen || images.length === 0) return null;

  const handleConvert = async () => {
    setIsProcessing(true);
    setProgress(10);
    const electronAPI = (window as any).electronAPI;

    try {
      if (mode === 'combine') {
        const pdfDoc = await PDFDocument.create();
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const rawBuffer = img.data instanceof Uint8Array ? img.data.buffer : img.data;

          let embedded;
          if (img.name.match(/\.jpe?g$/i) || img.mimeType === 'image/jpeg') {
            embedded = await pdfDoc.embedJpg(rawBuffer);
          } else {
            // PNG or other formats: convert via HTML Image to PNG if necessary or direct embed
            try {
              embedded = await pdfDoc.embedPng(rawBuffer);
            } catch {
              const blob = new Blob([rawBuffer], { type: img.mimeType || 'image/png' });
              const url = URL.createObjectURL(blob);
              const pngBuffer = await new Promise<ArrayBuffer>((res, rej) => {
                const htmlImg = new Image();
                htmlImg.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = htmlImg.naturalWidth;
                  canvas.height = htmlImg.naturalHeight;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(htmlImg, 0, 0);
                  canvas.toBlob((b) => {
                    URL.revokeObjectURL(url);
                    if (b) b.arrayBuffer().then(res).catch(rej);
                    else rej(new Error('Canvas error'));
                  }, 'image/png');
                };
                htmlImg.onerror = rej;
                htmlImg.src = url;
              });
              embedded = await pdfDoc.embedPng(pngBuffer);
            }
          }

          const page = pdfDoc.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, {
            x: 0,
            y: 0,
            width: embedded.width,
            height: embedded.height,
          });

          setProgress(Math.round(10 + ((i + 1) / images.length) * 75));
        }

        const pdfBytes = await pdfDoc.save();
        const baseName = images[0].name.replace(/\.[^/.]+$/, '');
        const combinedName = images.length === 1 ? `${baseName}.pdf` : `Combined_Images_${images.length}.pdf`;
        const combinedFile = new File([pdfBytes], combinedName, { type: 'application/pdf' });

        if (electronAPI?.saveFileDirect) {
          let targetPath = undefined;
          if (images[0].path) {
            const dir = images[0].path.replace(/[/\\][^/\\]+$/, '');
            targetPath = `${dir}\\${combinedName}`;
          }
          await electronAPI.saveFileDirect(targetPath, pdfBytes, combinedName);
        } else {
          await saveFile(combinedFile, combinedName);
        }

        setConvertedPdfs([{ name: combinedName, file: combinedFile }]);
      } else {
        // Separate PDFs for each image
        const results: { name: string; file: File }[] = [];
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const pdfDoc = await PDFDocument.create();
          const rawBuffer = img.data instanceof Uint8Array ? img.data.buffer : img.data;

          let embedded;
          if (img.name.match(/\.jpe?g$/i) || img.mimeType === 'image/jpeg') {
            embedded = await pdfDoc.embedJpg(rawBuffer);
          } else {
            try {
              embedded = await pdfDoc.embedPng(rawBuffer);
            } catch {
              const blob = new Blob([rawBuffer], { type: img.mimeType || 'image/png' });
              const url = URL.createObjectURL(blob);
              const pngBuffer = await new Promise<ArrayBuffer>((res, rej) => {
                const htmlImg = new Image();
                htmlImg.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = htmlImg.naturalWidth;
                  canvas.height = htmlImg.naturalHeight;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(htmlImg, 0, 0);
                  canvas.toBlob((b) => {
                    URL.revokeObjectURL(url);
                    if (b) b.arrayBuffer().then(res).catch(rej);
                    else rej(new Error('Canvas error'));
                  }, 'image/png');
                };
                htmlImg.onerror = rej;
                htmlImg.src = url;
              });
              embedded = await pdfDoc.embedPng(pngBuffer);
            }
          }

          const page = pdfDoc.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, {
            x: 0,
            y: 0,
            width: embedded.width,
            height: embedded.height,
          });

          const pdfBytes = await pdfDoc.save();
          const singleName = `${img.name.replace(/\.[^/.]+$/, '')}.pdf`;
          const singleFile = new File([pdfBytes], singleName, { type: 'application/pdf' });

          if (electronAPI?.saveFileDirect) {
            let targetPath = undefined;
            if (img.path) {
              const dir = img.path.replace(/[/\\][^/\\]+$/, '');
              targetPath = `${dir}\\${singleName}`;
            }
            await electronAPI.saveFileDirect(targetPath, pdfBytes, singleName);
          } else {
            await saveFile(singleFile, singleName);
          }

          results.push({ name: singleName, file: singleFile });
          setProgress(Math.round(10 + ((i + 1) / images.length) * 85));
        }

        setConvertedPdfs(results);
      }

      setProgress(100);
      setIsComplete(true);
    } catch (err) {
      console.error('Image conversion error:', err);
      alert('Error converting images: ' + (err as any).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Convert Photos to PDF
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {images.length} {images.length === 1 ? 'photo' : 'photos'} selected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!isComplete ? (
            <>
              {/* Photo preview pill list */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800 max-h-36 overflow-y-auto space-y-1.5 no-scrollbar">
                {images.slice(0, 10).map((img, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300">
                    <span className="truncate max-w-[340px] font-medium">• {img.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono flex-shrink-0">
                      {(img.data.byteLength / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
                {images.length > 10 && (
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium pt-1">
                    + {images.length - 10} more photos
                  </div>
                )}
              </div>

              {/* Conversion Mode Selection */}
              <div className="space-y-2.5 pt-1">
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Select Output Mode
                </div>

                <div
                  onClick={() => setMode('combine')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    mode === 'combine'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                      <span>Combine everything into one PDF</span>
                      {mode === 'combine' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Merges all {images.length} photos into a single multi-page PDF document in order.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setMode('separate')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    mode === 'separate'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                      <span>Convert each into separate PDFs</span>
                      {mode === 'separate' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Creates {images.length} individual PDF documents, matching original file names.
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar if processing */}
              {isProcessing && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Converting images to PDF...
                    </span>
                    <span className="font-mono font-bold">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Complete State */
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Conversion Complete!
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Successfully converted {images.length} {images.length === 1 ? 'photo' : 'photos'} to PDF.
                </p>
              </div>

              {convertedPdfs.length > 0 && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left text-xs space-y-1 max-h-32 overflow-y-auto">
                  {convertedPdfs.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                      <FileText className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          {!isComplete ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvert}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <span>Convert Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {convertedPdfs.length === 1 && onOpenPdfInStudio && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPdfInStudio(convertedPdfs[0].file);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open in PDF Studio</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
