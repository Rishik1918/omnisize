import React from 'react';
import { Layers, RefreshCw, Edit3, ArrowRight, ShieldCheck, Sparkles, Scissors, ScanText } from 'lucide-react';

interface InitialChoiceScreenProps {
  onSelectMode: (mode: 'compress' | 'convert' | 'pdfstudio') => void;
}

export const InitialChoiceScreen: React.FC<InitialChoiceScreenProps> = ({ onSelectMode }) => {
  return (
    <div className="max-w-4xl mx-auto py-3 sm:py-6 px-2 sm:px-4 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Private • Offline • Free Forever</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Select Your Workspace
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
          Choose a workspace to begin. You can switch anytime using the navigation bar.
        </p>
      </div>

      {/* 3-Card Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: Compressor */}
        <div
          onClick={() => onSelectMode('compress')}
          className="group cursor-pointer rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between active:scale-[0.99]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <Layers className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                Fast
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Compress & Optimize
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Shrink videos, downsample 50MB PDFs to 2MB, resize photos to exact KB limits, and auto-unlock Aadhaar/PAN PDFs.
              </p>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] text-zinc-600 dark:text-zinc-400 pt-1">
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80">Target KB / MB</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80">90% PDF Shrink</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80">Aadhaar Unlock</span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span>Open Compressor</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Converter */}
        <div
          onClick={() => onSelectMode('convert')}
          className="group cursor-pointer rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 hover:border-teal-500/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between active:scale-[0.99]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-teal-500 group-hover:text-white transition-all">
                <RefreshCw className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                Universal
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                Format Converter & ZIP
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Convert Word ⇄ PDF, Excel ⇄ CSV, MP4 ⇄ WebM, Images, Audio (MP3, WAV, AAC, FLAC), and convert any file to ZIP.
              </p>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] text-zinc-600 dark:text-zinc-400 pt-1">
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80">Any File ➔ ZIP</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80">Word ⇄ PDF</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80">Audio Suite</span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs font-medium text-teal-600 dark:text-teal-400">
            <span>Open Converter</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: PDF Studio */}
        <div
          onClick={() => onSelectMode('pdfstudio')}
          className="group cursor-pointer rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 hover:border-purple-500/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between active:scale-[0.99]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-purple-500 group-hover:text-white transition-all">
                <Edit3 className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                Acrobat Pro
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                PDF Studio & OCR
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Combine/merge PDFs, split page ranges, edit text overlays, stamp photos & signatures, and run multi-page document OCR.
              </p>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] text-zinc-600 dark:text-zinc-400 pt-1">
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80">Combine & Split</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80">Edit Text & Photos</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80">Full-Doc OCR</span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs font-medium text-purple-600 dark:text-purple-400">
            <span>Open PDF Studio</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
