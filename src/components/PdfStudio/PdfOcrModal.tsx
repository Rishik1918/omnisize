import React, { useState } from 'react';
import { X, ScanText, Download, Copy, Check, FileText, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { OcrEngine, OcrProgress, OcrPageResult } from '../../services/ocrEngine';
import { saveFile } from '../../utils/fileSaver';

interface PdfOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File;
}

export const PdfOcrModal: React.FC<PdfOcrModalProps> = ({ isOpen, onClose, initialFile }) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(initialFile || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrProgress>({
    currentPage: 0,
    totalPages: 0,
    status: '',
    percent: 0,
  });
  const [extractedText, setExtractedText] = useState<string>('');
  const [pageResults, setPageResults] = useState<OcrPageResult[]>([]);
  const [activePageTab, setActivePageTab] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setExtractedText('');
      setPageResults([]);
      setError(null);
    }
  };

  const handleRunOcr = async () => {
    if (!file) {
      setError('Please select a PDF document or image file first.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setExtractedText('');
      setPageResults([]);

      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

      if (isPdf) {
        const res = await OcrEngine.runOcrOnPdf(file, undefined, (p) => setProgress(p));
        setExtractedText(res.fullText);
        setPageResults(res.pages);
        if (res.pages.length > 0) setActivePageTab(res.pages[0].pageNumber);
      } else {
        const text = await OcrEngine.runOcrOnImage(file, (p) => setProgress(p));
        setExtractedText(text);
        setPageResults([{ pageNumber: 1, text, confidence: 95 }]);
        setActivePageTab(1);
      }
    } catch (err: any) {
      setError(err?.message || 'Optical Character Recognition encountered an error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const handleDownloadText = async () => {
    if (!extractedText || !file) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    await saveFile(blob, `${baseName}_ocr_text.txt`);
  };

  const currentPageText = pageResults.find((p) => p.pageNumber === activePageTab)?.text || extractedText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ScanText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Full-Document OCR Engine</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Optical character recognition for any PDF size, scanned book, or image</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!file ? (
            <label className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
              <ScanText className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mb-2 stroke-1" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Click to Select Scanned PDF or Image for OCR</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Accepts multi-page PDFs, scans, photos, PNG, JPG, and WebP</p>
              <input
                type="file"
                accept="application/pdf,.pdf,image/*"
                className="hidden"
                onChange={handleSelectFile}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <FileText className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-zinc-400">{(file.size / 1024).toFixed(0)} KB • Ready for Optical Scanning</p>
                </div>
              </div>
              <label className="cursor-pointer text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex-shrink-0 font-medium">
                Change File
                <input
                  type="file"
                  accept="application/pdf,.pdf,image/*"
                  className="hidden"
                  onChange={handleSelectFile}
                />
              </label>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {progress.status || 'Scanning document characters...'}
                </span>
                <span className="font-mono text-zinc-500">{progress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              {progress.totalPages > 1 && (
                <div className="text-[11px] text-zinc-400">
                  Processing page {progress.currentPage} of {progress.totalPages}
                </div>
              )}
            </div>
          )}

          {extractedText && !isProcessing && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-2">
                {pageResults.length > 1 ? (
                  <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-[60%]">
                    {pageResults.map((page) => (
                      <button
                        key={page.pageNumber}
                        onClick={() => setActivePageTab(page.pageNumber)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                          activePageTab === page.pageNumber
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        Page {page.pageNumber}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Optical text extracted</span>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy All'}</span>
                  </button>
                  <button
                    onClick={handleDownloadText}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-sm active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save .txt</span>
                  </button>
                </div>
              </div>

              {/* Editable Text Area */}
              <div className="relative">
                <textarea
                  value={pageResults.length > 1 ? currentPageText : extractedText}
                  onChange={(e) => {
                    const newTxt = e.target.value;
                    if (pageResults.length > 1) {
                      setPageResults((prev) =>
                        prev.map((p) => (p.pageNumber === activePageTab ? { ...p, text: newTxt } : p))
                      );
                      const updatedAll = pageResults
                        .map((p) =>
                          p.pageNumber === activePageTab
                            ? `--- PAGE ${p.pageNumber} ---\n\n${newTxt}`
                            : `--- PAGE ${p.pageNumber} ---\n\n${p.text}`
                        )
                        .join('\n\n\n');
                      setExtractedText(updatedAll);
                    } else {
                      setExtractedText(newTxt);
                    }
                  }}
                  rows={12}
                  className="w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  placeholder="Extracted optical text will appear here..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleRunOcr}
            disabled={!file || isProcessing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-sm active:scale-95"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <ScanText className="w-3.5 h-3.5" />
                <span>Extract Text with OCR</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
