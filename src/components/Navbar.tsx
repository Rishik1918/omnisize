import React from 'react';
import { LayoutGrid, Layers, Image as ImageIcon, Film, FileText, KeyRound, RefreshCw, Edit3 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  appMode: 'home' | 'compress' | 'convert' | 'pdfstudio';
  setAppMode: (mode: 'home' | 'compress' | 'convert' | 'pdfstudio') => void;
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
    <header
      className="sticky top-0 z-30 w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800/80 transition-colors"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo & Brand Name (Returns Home) */}
          <div
            onClick={() => setAppMode('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            title="Return to Workspace Overview"
          >
            <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-zinc-900 border border-indigo-200/80 dark:border-zinc-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs group-hover:scale-105 transition-transform">
              <Layers className="h-4 w-4" strokeWidth={2} />
            </div>
            <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
              Omnisize
            </span>
          </div>

          {/* Desktop Mode Segmented Switcher */}
          <div className="hidden sm:flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs">
            <button
              onClick={() => setAppMode('home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all ${
                appMode === 'home'
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-zinc-200 dark:border-zinc-700 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                setAppMode('compress');
                if (activeTab === 'unlock') setActiveTab('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all ${
                appMode === 'compress' && activeTab !== 'unlock'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Compress</span>
            </button>

            <button
              onClick={() => setAppMode('convert')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all ${
                appMode === 'convert'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Convert & ZIP</span>
            </button>

            <button
              onClick={() => setAppMode('pdfstudio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all ${
                appMode === 'pdfstudio'
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-zinc-200 dark:border-zinc-700 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>PDF Studio</span>
            </button>

            <button
              onClick={() => {
                setAppMode('compress');
                setActiveTab('unlock');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all ${
                appMode === 'compress' && activeTab === 'unlock'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Unlock PDF</span>
            </button>
          </div>

          {/* Right Header Actions: Theme Switcher */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Horizontally Scrollable Mode Switcher Strip (Shifted to top for Android & Mobile) */}
        <div className="sm:hidden border-t border-zinc-200/80 dark:border-zinc-800/80 py-2 -mx-3 px-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 w-max">
            <button
              onClick={() => setAppMode('home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs whitespace-nowrap transition-all ${
                appMode === 'home'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                setAppMode('compress');
                if (activeTab === 'unlock') setActiveTab('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs whitespace-nowrap transition-all ${
                appMode === 'compress' && activeTab !== 'unlock'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Compress</span>
            </button>

            <button
              onClick={() => setAppMode('convert')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs whitespace-nowrap transition-all ${
                appMode === 'convert'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Convert & ZIP</span>
            </button>

            <button
              onClick={() => setAppMode('pdfstudio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs whitespace-nowrap transition-all ${
                appMode === 'pdfstudio'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>PDF Studio</span>
            </button>

            <button
              onClick={() => {
                setAppMode('compress');
                setActiveTab('unlock');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs whitespace-nowrap transition-all ${
                appMode === 'compress' && activeTab === 'unlock'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Unlock PDF</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs when in compress mode ONLY IF files are queued */}
        {appMode === 'compress' && activeTab !== 'unlock' && fileCounts.all > 0 && (
          <div className="flex items-center space-x-1.5 pb-2.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
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
                      ? 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white shadow-xs border border-zinc-700'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                        isActive
                          ? 'bg-zinc-700 text-zinc-100'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400'
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
