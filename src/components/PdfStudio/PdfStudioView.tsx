import React, { useState } from 'react';
import {
  Layers,
  Scissors,
  Edit3,
  ScanText,
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { PdfMergeModal } from './PdfMergeModal';
import { PdfSplitModal } from './PdfSplitModal';
import { PdfEditorModal } from './PdfEditorModal';
import { PdfOcrModal } from './PdfOcrModal';

export const PdfStudioView: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'merge' | 'split' | 'edit' | 'ocr' | null>(null);
  const [droppedFile, setDroppedFile] = useState<File | undefined>(undefined);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setDroppedFile(file);
      setActiveModal('edit');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDroppedFile(file);
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
      accentColor: 'emerald',
      gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
      borderColor: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconColor: 'text-emerald-500',
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
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-emerald-500/10 via-zinc-50 to-white dark:from-emerald-500/10 dark:via-zinc-900 dark:to-zinc-950 p-5 sm:p-7 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold mb-3">
            <Sparkles className="w-3 h-3" />
            <span>Adobe Acrobat Alternative • 100% Offline & Client-Side</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1.5">
            Omnisize PDF Studio & Reader
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Combine documents, split ranges, edit text overlays, stamp photos or signatures, and run multi-page optical OCR on any document length with zero privacy exposure.
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
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
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
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30'
        }`}
      >
        <FileText className="w-10 h-10 mx-auto text-zinc-400 dark:text-zinc-600 mb-2 stroke-1" />
        <p className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Drop any PDF document here to open directly in PDF Studio
        </p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 mb-3">
          Instant visual reading, editing, text overlaying, and optical character extraction
        </p>
        <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-sm active:scale-95">
          <Upload className="w-3.5 h-3.5" />
          <span>Browse Document</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="flex items-center gap-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Zero cloud uploads, 100% private</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400">
          <FileCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>High-fidelity vector PDF preservation</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Desktop & Android file storage integration</span>
        </div>
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
          onClose={() => setActiveModal(null)}
          initialFile={droppedFile}
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
