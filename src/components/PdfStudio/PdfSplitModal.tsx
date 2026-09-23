import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Scissors, Download, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { PdfStudioEngine } from '../../services/pdfStudioEngine';
import { saveFile } from '../../utils/fileSaver';
import { getDocumentProxy } from 'unpdf';
import { PdfPasswordPromptModal } from '../PdfPasswordPromptModal';

interface PdfSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PdfSplitModal: React.FC<PdfSplitModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [rangeInput, setRangeInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [splitResult, setSplitResult] = useState<{ blob: Blob; pageCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordModalFile, setPasswordModalFile] = useState<File | null>(null);

  const processLoadedFile = async (selected: File) => {
    setFile(selected);
    setSplitResult(null);
    setError(null);

    try {
      const buffer = await selected.arrayBuffer();
      const proxy = await getDocumentProxy(new Uint8Array(buffer));
      setTotalPages(proxy.numPages);
      setRangeInput(`1-${Math.min(proxy.numPages, 3)}`);
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (err?.name === 'PasswordException' || msg.toLowerCase().includes('password')) {
        setPasswordModalFile(selected);
      } else {
        setError('Could not read PDF metadata: ' + (err?.message || 'Invalid PDF'));
      }
    }
  };

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processLoadedFile(e.target.files[0]);
    }
  };

  const handleSplit = async () => {
    if (!file) {
      setError('Please select a PDF to split.');
      return;
    }
    if (!rangeInput.trim()) {
      setError('Please specify page numbers or ranges (e.g., 1-3, 5).');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const res = await PdfStudioEngine.splitPdf(file, rangeInput, (p) => setProgress(p));
      setSplitResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to split PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!splitResult || !file) return;
    const baseName = file.name.replace(/\.pdf$/i, '');
    const cleanRange = rangeInput.replace(/[^0-9,-]/g, '');
    await saveFile(splitResult.blob, `${baseName}_pages_${cleanRange}.pdf`);
  };

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
      <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl w-full max-w-lg border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Split & Extract PDF Pages</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Extract custom ranges, page subsets, or chapters</p>
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
              <FileText className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mb-2 stroke-1" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Click to Select a PDF Document</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Select any document from device storage</p>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleSelectFile}
              />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <FileText className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-zinc-400">{totalPages} total pages • {(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <label className="cursor-pointer text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex-shrink-0 font-medium">
                  Change
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={handleSelectFile}
                  />
                </label>
              </div>

              {/* Range Input */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Pages to Extract (Range or comma-separated)
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5, 8-10"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setRangeInput('1')}
                    className="px-2 py-1 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium text-zinc-600 dark:text-zinc-300 transition-colors"
                  >
                    First Page (1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangeInput(`1-${Math.min(totalPages, 5)}`)}
                    className="px-2 py-1 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium text-zinc-600 dark:text-zinc-300 transition-colors"
                  >
                    First 5 Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const odds = Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p % 2 !== 0)
                        .join(', ');
                      setRangeInput(odds);
                    }}
                    className="px-2 py-1 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium text-zinc-600 dark:text-zinc-300 transition-colors"
                  >
                    Odd Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const evens = Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p % 2 === 0)
                        .join(', ');
                      setRangeInput(evens);
                    }}
                    className="px-2 py-1 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-medium text-zinc-600 dark:text-zinc-300 transition-colors"
                  >
                    Even Pages
                  </button>
                </div>
              </div>

              {isProcessing && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                      Splitting pages...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {splitResult && !isProcessing && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Extracted {splitResult.pageCount} page(s) ({(splitResult.blob.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-sm active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save Extracted PDF</span>
                  </button>
                </div>
              )}
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
            onClick={handleSplit}
            disabled={!file || isProcessing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-sm active:scale-95"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <Scissors className="w-3.5 h-3.5" />
                <span>Split & Extract</span>
              </>
            )}
          </button>
        </div>
      </div>

      {passwordModalFile && (
        <PdfPasswordPromptModal
          isOpen={true}
          file={passwordModalFile}
          onSuccess={(unlockedFile) => {
            setPasswordModalFile(null);
            processLoadedFile(unlockedFile);
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
