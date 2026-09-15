import React from 'react';
import { Layers, Image as ImageIcon, Film, FileText, KeyRound, RefreshCw } from 'lucide-react';

interface NavbarProps {
  appMode: 'compress' | 'convert';
  setAppMode: (mode: 'compress' | 'convert') => void;
  activeTab: 'all' | 'image' | 'video' | 'pdf' | 'unlock';
  setActiveTab: (tab: 'all' | 'image' | 'video' | 'pdf' | 'unlock') => void;
  fileCounts: { all: number; image: number; video: number; pdf: number; unlock: number };
}

export const Navbar: React.FC<NavbarProps> = ({
  appMode,
  setAppMode,
  activeTab,
  setActiveTab,
  fileCounts,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-sm">
              <Layers className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
            </div>
            <span className="font-semibold text-base text-zinc-100 tracking-tight">Omnisize</span>
          </div>

          {/* Desktop Mode Segmented Switcher */}
          <div className="hidden sm:flex items-center p-1 bg-zinc-900 rounded-full border border-zinc-800 text-xs">
            <button
              onClick={() => {
                setAppMode('compress');
                if (activeTab === 'unlock') setActiveTab('all');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                appMode === 'compress' && activeTab !== 'unlock'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Compress</span>
            </button>
            <button
              onClick={() => setAppMode('convert')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                appMode === 'convert'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Convert</span>
            </button>
            <button
              onClick={() => {
                setAppMode('compress');
                setActiveTab('unlock');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                appMode === 'compress' && activeTab === 'unlock'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Unlock PDF</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs when in compress mode */}
        {appMode === 'compress' && activeTab !== 'unlock' && (
          <div className="flex items-center space-x-1.5 pb-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {[
              { id: 'all', label: 'All Files', icon: Layers, count: fileCounts.all },
              { id: 'image', label: 'Images', icon: ImageIcon, count: fileCounts.image },
              { id: 'video', label: 'Videos', icon: Film, count: fileCounts.video },
              { id: 'pdf', label: 'Documents', icon: FileText, count: fileCounts.pdf },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                    isActive
                      ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                        isActive ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
