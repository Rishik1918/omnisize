import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ScanText,
  Download,
  Copy,
  Check,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  Edit3,
  FileType
} from 'lucide-react';
import { OcrEngine, OcrProgress, OcrPageResult } from '../../services/ocrEngine';
import { saveFile } from '../../utils/fileSaver';
import JSZip from 'jszip';
import { PdfPasswordPromptModal } from '../PdfPasswordPromptModal';

interface PdfOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File;
  onOpenInEditor?: (ocrPdfFile: File) => void;
}

export const PdfOcrModal: React.FC<PdfOcrModalProps> = ({
  isOpen,
  onClose,
  initialFile,
  onOpenInEditor,
}) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(initialFile || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'jpg' | 'png' | 'txt'>('pdf');
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
  const [passwordModalFile, setPasswordModalFile] = useState<File | null>(null);

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
      const msg = String(err?.message || err || '');
      if (err?.name === 'PasswordException' || msg.toLowerCase().includes('password')) {
        setPasswordModalFile(file);
      } else {
        setError(err?.message || 'Optical Character Recognition encountered an error.');
      }
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

  const handleExport = async () => {
    if (!file || pageResults.length === 0) return;
    try {
      setIsExporting(true);
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      if (exportFormat === 'pdf') {
        const pdfBlob = await OcrEngine.exportToPdf(pageResults);
        await saveFile(pdfBlob, `${baseName}_ocr.pdf`);
      } else if (exportFormat === 'docx') {
        const docxBlob = await OcrEngine.exportToDocx(pageResults, baseName);
        await saveFile(docxBlob, `${baseName}_ocr.docx`);
      } else if (exportFormat === 'txt') {
        const txtBlob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
        await saveFile(txtBlob, `${baseName}_ocr.txt`);
      } else if (exportFormat === 'png' || exportFormat === 'jpg') {
        const fmt = exportFormat === 'png' ? 'png' : 'jpeg';
        const ext = exportFormat === 'png' ? 'png' : 'jpg';
        const imgResults = await OcrEngine.exportToImages(file, fmt);

        if (imgResults.length === 1) {
          await saveFile(imgResults[0].blob, `${baseName}_page1.${ext}`);
        } else {
          // Zip multi-page images
          const zip = new JSZip();
          imgResults.forEach((img) => {
            zip.file(`${baseName}_page_${img.pageNumber}.${ext}`, img.blob);
          });
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          await saveFile(zipBlob, `${baseName}_images_${ext}.zip`);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenInEditor = async () => {
    if (!file || pageResults.length === 0) return;
    try {
      setIsExporting(true);
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const pdfBlob = await OcrEngine.exportToPdf(pageResults);
      const ocrFile = new File([pdfBlob], `${baseName}_ocr.pdf`, { type: 'application/pdf' });
      if (onOpenInEditor) {
        onOpenInEditor(ocrFile);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to open in editor.');
    } finally {
      setIsExporting(false);
    }
  };

  const currentPageText = pageResults.find((p) => p.pageNumber === activePageTab)?.text || extractedText;

  const modalNode = (
    <div
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
      }}
    >
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ScanText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Full-Document OCR Engine</h3>
              <p className="text-[11px] text-zinc-500">Optical Character Recognition & Multi-Format Document Export</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* File Picker */}
          {!file ? (
            <label className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-950/50">
              <input
                type="file"
                accept="application/pdf,.pdf,image/*"
                onChange={handleSelectFile}
                className="hidden"
              />
              <ScanText className="w-10 h-10 text-emerald-500 mb-3" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Choose Scanned PDF or Image for OCR
              </span>
              <span className="text-[11px] text-zinc-500 text-center max-w-sm">
                Recognize and convert scanned papers, books, receipts, and images into editable, searchable text
              </span>
            </label>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-7 h-7 text-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200">{file.name}</div>
                  <div className="text-[11px] text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              </div>
              {!isProcessing && (
                <button
                  onClick={() => {
                    setFile(null);
                    setExtractedText('');
                    setPageResults([]);
                  }}
                  className="text-xs text-zinc-500 hover:text-red-500 px-2 py-1 rounded transition-colors"
                >
                  Change
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Progress Indicator */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {progress.status}
                </span>
                <span>{progress.percent}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* OCR Results & Export Hub */}
          {pageResults.length > 0 && (
            <div className="space-y-3">
              {/* Page Tabs */}
              {pageResults.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {pageResults.map((p) => (
                    <button
                      key={p.pageNumber}
                      onClick={() => setActivePageTab(p.pageNumber)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                        activePageTab === p.pageNumber
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      Page {p.pageNumber}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Toolbar with Format Dropdown */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-medium">Format:</span>
                  <select
                    value={exportFormat}
                    onChange={(e: any) => setExportFormat(e.target.value)}
                    className="text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="docx">Word Document (.docx)</option>
                    <option value="png">PNG Images (.png)</option>
                    <option value="jpg">JPEG Images (.jpg)</option>
                    <option value="txt">Plain Text (.txt)</option>
                  </select>

                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Export {exportFormat.toUpperCase()}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  {onOpenInEditor && (
                    <button
                      onClick={handleOpenInEditor}
                      disabled={isExporting}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      title="Open directly in PDF Editor to edit text"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit in Studio</span>
                    </button>
                  )}
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
                  rows={11}
                  className="w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  placeholder="Extracted optical text will appear here..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-[11px] text-zinc-400">
            {pageResults.length > 0 && `${pageResults.length} page(s) recognized`}
          </div>
          <div className="flex items-center gap-2.5">
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
                  <span>{pageResults.length > 0 ? 'Re-scan with OCR' : 'Extract Text with OCR'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {passwordModalFile && (
        <PdfPasswordPromptModal
          isOpen={true}
          file={passwordModalFile}
          onSuccess={(unlockedFile) => {
            setPasswordModalFile(null);
            setFile(unlockedFile);
            setError(null);
          }}
          onCancel={() => {
            setPasswordModalFile(null);
          }}
        />
      )}
    </div>
  );

  return createPortal(modalNode, document.body);
};
