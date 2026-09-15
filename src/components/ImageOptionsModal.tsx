import React, { useState } from 'react';
import { X, Sliders, Maximize2, Zap, Eraser } from 'lucide-react';
import { ProcessedItem, ImageProcessingOptions } from '../types';

interface ImageOptionsModalProps {
  item: ProcessedItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: ImageProcessingOptions) => void;
  onOpenWatermarkModal: () => void;
}

export const ImageOptionsModal: React.FC<ImageOptionsModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  onOpenWatermarkModal,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'compress' | 'resize' | 'upscale'>('compress');
  const [quality, setQuality] = useState<number>(0.85);
  const [targetSizeKB, setTargetSizeKB] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [maintainRatio, setMaintainRatio] = useState<boolean>(true);
  const [upscaleFactor, setUpscaleFactor] = useState<2 | 4>(2);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');

  const handleApply = () => {
    onSave({
      mode,
      quality,
      targetSizeKB: targetSizeKB > 0 ? targetSizeKB : undefined,
      width: width > 0 ? width : undefined,
      height: height > 0 ? height : undefined,
      maintainAspectRatio: maintainRatio,
      upscaleFactor: mode === 'upscale' ? upscaleFactor : undefined,
      targetFormat: format,
      stripMetadata: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl w-full max-w-lg overflow-hidden border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Image Options</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'compress', label: 'Compress', icon: Zap },
              { id: 'resize', label: 'Resize (Px)', icon: Maximize2 },
              { id: 'upscale', label: 'AI Upscale', icon: Maximize2 },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    mode === m.id ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {mode === 'compress' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Quality</span>
                  <span>{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Target File Size (KB) - Optional
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="e.g. 50 (for < 50 KB)"
                    value={targetSizeKB || ''}
                    onChange={(e) => setTargetSizeKB(Number(e.target.value))}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-400 outline-none"
                  />
                  <span className="text-xs text-slate-400">KB</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Binary search will iteratively tune compression to guarantee size fits within target.
                </p>
              </div>
            </div>
          )}

          {mode === 'resize' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Width (px)</label>
                  <input
                    type="number"
                    placeholder="Width"
                    value={width || ''}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Height (px)</label>
                  <input
                    type="number"
                    placeholder="Height"
                    value={height || ''}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-400 outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintainRatio}
                  onChange={(e) => setMaintainRatio(e.target.checked)}
                  className="rounded text-emerald-500 accent-emerald-500"
                />
                <span>Maintain aspect ratio</span>
              </label>
            </div>
          )}

          {mode === 'upscale' && (
            <div className="space-y-4">
              <label className="text-xs text-slate-300 block">Upscale Multiplier</label>
              <div className="grid grid-cols-2 gap-3">
                {[2, 4].map((factor) => (
                  <button
                    key={factor}
                    onClick={() => setUpscaleFactor(factor as any)}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                      upscaleFactor === factor
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-700 bg-slate-900 text-slate-400'
                    }`}
                  >
                    {factor}x Resolution
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Enhances resolution with multi-pass Lanczos interpolation and unsharp edge enhancement.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                onClose();
                onOpenWatermarkModal();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-semibold transition-all"
            >
              <Eraser className="w-4 h-4" />
              <span>Launch Watermark & Object Remover</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-900/60 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
