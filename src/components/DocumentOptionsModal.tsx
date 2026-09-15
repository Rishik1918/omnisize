import React, { useState } from 'react';
import { X, FileText, Shield, Image, Zap, Check } from 'lucide-react';
import { ProcessedItem, DocumentProcessingOptions } from '../types';

interface DocumentOptionsModalProps {
  item: ProcessedItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: DocumentProcessingOptions) => void;
}

export const DocumentOptionsModal: React.FC<DocumentOptionsModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const ext = item.name.split('.').pop()?.toUpperCase() || 'DOCUMENT';
  const isPdf = ext === 'PDF';
  const isOfficeDoc = ['DOCX', 'PPTX', 'XLSX', 'DOC', 'PPT', 'XLS'].includes(ext);

  const [qualityLevel, setQualityLevel] = useState<'maximum' | 'balanced' | 'high'>('maximum');
  const [targetSizeKB, setTargetSizeKB] = useState<number>(0);
  const [compressImages, setCompressImages] = useState<boolean>(true);
  const [maxImageDim, setMaxImageDim] = useState<number>(1280);
  const [stripMetadata, setStripMetadata] = useState<boolean>(true);

  const handleApply = () => {
    onSave({
      qualityLevel,
      targetSizeKB: targetSizeKB > 0 ? targetSizeKB : undefined,
      compressEmbeddedImages: compressImages,
      maxImageDimension: maxImageDim,
      stripMetadata,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">{ext} Compression Settings</h3>
              <p className="text-xs text-slate-400">Choose compression strength and image downsampling</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Compression Level Presets */}
          <div>
            <label className="text-xs text-slate-300 block mb-2 font-medium">Compression Strength</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'maximum', label: 'Maximum', desc: '90%+ reduction (Smallest file)', badge: 'Recommended' },
                { id: 'balanced', label: 'Balanced', desc: '75-85% reduction (Crisp text)', badge: null },
                { id: 'high', label: 'Crisp Print', desc: '50% reduction (Print quality)', badge: null },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setQualityLevel(lvl.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    qualityLevel === lvl.id
                      ? 'border-indigo-500 bg-indigo-950/30 text-indigo-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {lvl.badge && (
                    <span className="absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.2 bg-indigo-600 text-white rounded-full">
                      {lvl.badge}
                    </span>
                  )}
                  <div className="text-xs font-semibold text-white">{lvl.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-tight">{lvl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            💡 Large PDFs and papers (like remote sensing or scanned docs) are 95% high-res photos and charts. <strong>Maximum Compression</strong> downsamples these bloated images while preserving readable text and layout.
          </div>

          {/* Target File Size */}
          <div>
            <label className="text-xs text-slate-300 block mb-1 font-medium">
              Target File Size (KB) - Optional
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="e.g. 5000 (for < 5 MB) or 500 (for < 500 KB)"
                value={targetSizeKB || ''}
                onChange={(e) => setTargetSizeKB(Number(e.target.value))}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 outline-none"
              />
              <span className="text-xs text-slate-400">KB</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Leave blank to automatically compress with the chosen compression strength.
            </p>
          </div>

          {/* Embedded Image Downsampling Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-indigo-400" />
                <span className="font-medium">Downscale Embedded Photos & Charts</span>
              </div>
              <input
                type="checkbox"
                checked={compressImages}
                onChange={(e) => setCompressImages(e.target.checked)}
                className="rounded text-indigo-600 accent-indigo-600"
              />
            </label>
            <p className="text-[10px] text-slate-400">
              Crucial for shrinking PDFs from 50+ MB down to 2–5 MB. Turning this off only deflates metadata.
            </p>
          </div>

          {/* Metadata Stripping */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Remove Author & Revision Metadata</span>
              </div>
              <input
                type="checkbox"
                checked={stripMetadata}
                onChange={(e) => setStripMetadata(e.target.checked)}
                className="rounded text-indigo-600 accent-indigo-600"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-900/80 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
          >
            Apply & Compress
          </button>
        </div>
      </div>
    </div>
  );
};
