import React from 'react';
import { Layers, RefreshCw, KeyRound } from 'lucide-react';

interface BottomNavProps {
  appMode: 'compress' | 'convert';
  setAppMode: (mode: 'compress' | 'convert') => void;
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
  const isUnlockActive = appMode === 'compress' && activeTab === 'unlock';

  return (
    <nav className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 sm:hidden pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-full bg-zinc-900/95 backdrop-blur-2xl border border-zinc-750 shadow-2xl shadow-black/90">
        {/* Compress */}
        <button
          onClick={() => {
            setAppMode('compress');
            setActiveTab('all');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
            isCompressActive
              ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" strokeWidth={1.5} />
          <span>Compress</span>
        </button>

        {/* Convert */}
        <button
          onClick={() => {
            setAppMode('convert');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
            isConvertActive
              ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          <span>Convert</span>
        </button>

        {/* Unlock */}
        <button
          onClick={() => {
            setAppMode('compress');
            setActiveTab('unlock');
            onOpenUnlocker();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
            isUnlockActive
              ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <KeyRound className="w-4 h-4" strokeWidth={1.5} />
          <span>Unlock PDF</span>
        </button>
      </div>
    </nav>
  );
};
