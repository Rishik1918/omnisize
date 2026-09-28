import React, { useState } from 'react';
import {
  Layers,
  Scissors,
  Edit3,
  ScanText,
  Upload,
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { PdfMergeModal } from './PdfMergeModal';
import { PdfSplitModal } from './PdfSplitModal';
import { PdfEditorModal } from './PdfEditorModal';
import { PdfOcrModal } from './PdfOcrModal';

import { attachFilePath } from '../../utils/fileSaver';

export const PdfStudioView: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'merge' | 'split' | 'edit' | 'ocr' | null>(null);
  const [droppedFile, setDroppedFile] = useState<File | undefined>(undefined);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).map(attachFilePath);
      setDroppedFiles(files);
      setDroppedFile(files[0]);
      setActiveModal('edit');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).map(attachFilePath);
      setDroppedFiles(files);
      setDroppedFile(files[0]);
      setActiveModal('edit');
    }
  };

  const studioTools = [
    {
      id: 'edit' as const,
      title: 'PDF Editor & Reader',
      description: 'Add text overlays, insert photos/signatures, rotate pages, or remove pages with Acrobat-style canvas view.',
      icon: Edit3,
      badge: 'Interactive',
      accentColor: 'indigo',
      gradient: 'from-indigo-500/15 via-indigo-500/5 to-transparent',
      borderColor: 'border-indigo-500/20 hover:border-indigo-500/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'merge' as const,
      title: 'Combine & Merge PDFs',
      description: 'Merge multiple PDF documents together in custom sequence with one-click re-ordering.',
      icon: Layers,
      badge: 'Batch',
      accentColor: 'blue',
      gradient: 'from-blue-500/15 via-blue-500/5 to-transparent',
      borderColor: 'border-blue-500/20 hover:border-blue-500/40',
      iconColor: 'text-blue-500',
    },
    {
      id: 'split' as const,
      title: 'Split & Extract Pages',
      description: 'Extract custom page ranges (e.g. 1-5, 8-12), odd/even subsets, or separate individual chapters.',
      icon: Scissors,
      badge: 'Precision',
      accentColor: 'amber',
      gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
      borderColor: 'border-amber-500/20 hover:border-amber-500/40',
      iconColor: 'text-amber-500',
    },
    {
      id: 'ocr' as const,
      title: 'Full-Document OCR Engine',
      description: 'Multi-page optical text recognition for scanned PDFs and images of any length and size with export.',
      icon: ScanText,
      badge: 'Unlimited Length',
      accentColor: 'purple',
      gradient: 'from-purple-500/15 via-purple-500/5 to-transparent',
      borderColor: 'border-purple-500/20 hover:border-purple-500/40',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-indigo-500/10 via-zinc-50 to-white dark:from-indigo-500/10 dark:via-zinc-900 dark:to-zinc-950 p-5 sm:p-7 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1.5">
            Omnisize PDF Studio & Reader
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Combine documents, split ranges, edit text overlays, stamp photos or signatures, and run multi-page optical OCR on any document.
          </p>
        </div>
      </div>

      {/* Quick Launch Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {studioTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setDroppedFile(undefined);
                setActiveModal(tool.id);
              }}
              className={`group text-left p-4 sm:p-5 rounded-2xl border ${tool.borderColor} bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-850/80 transition-all duration-200 shadow-xs relative overflow-hidden flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 ${tool.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {tool.badge}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <span>Launch Tool</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Drag & Drop Quick Opener */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-indigo-400'
        }`}
      >
        <FileText className="w-10 h-10 mx-auto text-zinc-400 dark:text-zinc-600 mb-2 stroke-1" />
        <p className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Drop any PDF document or image here to open directly in PDF Studio
        </p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 mb-3">
          Instant visual reading, editing, text overlaying, and optical character extraction
        </p>
        <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-sm active:scale-95">
          <Upload className="w-3.5 h-3.5" />
          <span>Browse Document</span>
          <input
            type="file"
            multiple
            accept="application/pdf,.pdf,image/*,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.xls,.csv,.txt,.md"
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
      </div>

      {/* Modals */}
      {activeModal === 'merge' && (
        <PdfMergeModal isOpen={true} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'split' && (
        <PdfSplitModal isOpen={true} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'edit' && (
        <PdfEditorModal
          isOpen={true}
          onClose={() => {
            setActiveModal(null);
            setDroppedFile(undefined);
            setDroppedFiles([]);
          }}
          initialFile={droppedFile}
          initialFiles={droppedFiles}
        />
      )}
      {activeModal === 'ocr' && (
        <PdfOcrModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          initialFile={droppedFile}
          onOpenInEditor={(ocrFile) => {
            setDroppedFile(ocrFile);
            setActiveModal('edit');
          }}
        />
      )}
    </div>
  );
};
