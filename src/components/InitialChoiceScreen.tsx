import React from 'react';
import { Layers, RefreshCw, ArrowRight, ShieldCheck, Zap, Sparkles } from 'lucide-react';

interface InitialChoiceScreenProps {
  onSelectMode: (mode: 'compress' | 'convert') => void;
}

export const InitialChoiceScreen: React.FC<InitialChoiceScreenProps> = ({ onSelectMode }) => {
  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 px-2 sm:px-4 space-y-5 animate-fade-in">
      {/* Compact Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Private • Offline • Free Forever</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
          Select Your Workspace
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Choose a tool to begin. Switch anytime from the top bar.
        </p>
      </div>

      {/* Modern 2-Card Selection Grid (Snug & fits on one screen without scrolling) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Compressor */}
        <div
          onClick={() => onSelectMode('compress')}
          className="group cursor-pointer rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 sm:p-5 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all duration-200 shadow-sm flex flex-col justify-between active:scale-[0.99]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                Studio
              </span>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                Compress & Optimize
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Shrink videos, downsample 50MB PDFs to 2MB, resize photos to exact KB limits, AI upscale, and auto-unlock protected PDFs.
              </p>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] text-zinc-400 pt-1">
              <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">Target KB / MB</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">90% PDF Shrink</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">Aadhaar / PAN Unlock</span>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-1.5 text-xs font-medium text-emerald-400 group-hover:text-emerald-300">
            <span>Open Compressor</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Converter */}
        <div
          onClick={() => onSelectMode('convert')}
          className="group cursor-pointer rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 sm:p-5 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all duration-200 shadow-sm flex flex-col justify-between active:scale-[0.99]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-teal-500 group-hover:text-white transition-all">
                <RefreshCw className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                Universal
              </span>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-100 group-hover:text-teal-300 transition-colors">
                Universal Format Converter
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Convert across all formats: Word ⇄ PDF, Excel ⇄ CSV/PDF, PPTX ⇄ PDF, MP4 ⇄ WebM/HEVC, Images (JPG, PNG, WebP, SVG, ICO), Audio.
              </p>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] text-zinc-400 pt-1">
              <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">Word ⇄ PDF</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">Excel ⇄ CSV</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">All Images ⇄ PDF</span>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-1.5 text-xs font-medium text-teal-400 group-hover:text-teal-300">
            <span>Open Converter</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
