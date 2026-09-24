import React, { useEffect, useState } from 'react';
import { Sun, Moon, Sunset } from 'lucide-react';
import { ThemeManager, ThemeMode } from '../services/themeManager';

export const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [mode, setMode] = useState<ThemeMode>(ThemeManager.getThemeMode());
  const [isDark, setIsDark] = useState<boolean>(ThemeManager.isCurrentlyDark());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    return ThemeManager.subscribe((newMode, dark) => {
      setMode(newMode);
      setIsDark(dark);
    });
  }, []);

  const handleSelect = (selectedMode: ThemeMode) => {
    ThemeManager.setThemeMode(selectedMode);
    setMenuOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-all shadow-sm active:scale-95"
        title={`Theme: ${isDark ? 'Dark Mode' : 'Light Mode'}${mode === 'sunset' ? ' (Sunset Auto)' : ''}`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
        {!compact && (
          <span className="capitalize hidden sm:inline-block">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        )}
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 py-1.5 overflow-hidden text-xs animate-in fade-in zoom-in-95">
            <button
              onClick={() => handleSelect('light')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors ${
                mode === 'light' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light Mode</span>
            </button>

            <button
              onClick={() => handleSelect('dark')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors ${
                mode === 'dark' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dark Mode</span>
            </button>

            <div className="my-1 border-t border-zinc-200 dark:border-zinc-800/80" />

            <button
              onClick={() => handleSelect('sunset')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors ${
                mode === 'sunset' ? 'text-amber-500 dark:text-amber-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Sunset className="w-3.5 h-3.5 text-amber-500" />
              <div className="flex flex-col">
                <span>Sunset Auto</span>
                <span className="text-[10px] text-zinc-400 font-normal">Dark 6PM - 6AM</span>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
