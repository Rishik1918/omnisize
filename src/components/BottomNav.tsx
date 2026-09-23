import React from 'react';
import { Layers, RefreshCw, KeyRound, Edit3 } from 'lucide-react';

interface BottomNavProps {
  appMode: 'compress' | 'convert' | 'pdfstudio';
  setAppMode: (mode: 'compress' | 'convert' | 'pdfstudio') => void;
  activeTab: string;
  setActiveTab: (tab: 'all' | 'image' | 'video' | 'pdf' | 'unlock') => void;
  onOpenUnlocker: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  appMode,
  setAppMode,
  activeTab,
  setActiveTab,
  onOpenUnlocker,
}) => {
  const isCompressActive = appMode === 'compress' && activeTab !== 'unlock';
  const isConvertActive = appMode === 'convert';
  const isPdfStudioActive = appMode === 'pdfstudio';
  const isUnlockActive = appMode === 'compress' && activeTab === 'unlock';

  return (
    <nav className="fixed bottom-3 inset-x-0 z-40 flex justify-center px-3 sm:hidden pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-xs">
        {/* Compress */}
        <button
          onClick={() => {
            setAppMode('compress');
            setActiveTab('all');
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-full font-medium transition-all ${
            isCompressActive
              ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Compress</span>
        </button>

        {/* Convert */}
        <button
          onClick={() => {
            setAppMode('convert');
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-full font-medium transition-all ${
            isConvertActive
              ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Convert</span>
        </button>

        {/* PDF Studio */}
        <button
          onClick={() => {
            setAppMode('pdfstudio');
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-full font-medium transition-all ${
            isPdfStudioActive
              ? 'bg-purple-600 text-white shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>PDF Studio</span>
        </button>

        {/* Unlock */}
        <button
          onClick={() => {
            setAppMode('compress');
            setActiveTab('unlock');
            onOpenUnlocker();
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-full font-medium transition-all ${
            isUnlockActive
              ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Unlock</span>
        </button>
      </div>
    </nav>
  );
};
