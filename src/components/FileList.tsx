import React from 'react';
import { Download, Trash2, Sliders, FileText, Film, Image as ImageIcon, Unlock } from 'lucide-react';
import { ProcessedItem } from '../types';

interface FileListProps {
  items: ProcessedItem[];
  onRemove: (id: string) => void;
  onOpenOptions: (item: ProcessedItem) => void;
  onOpenUnlocker: (item: ProcessedItem) => void;
  onProcessItem: (item: ProcessedItem) => void;
  onDownloadItem: (item: ProcessedItem) => void;
}

export const FileList: React.FC<FileListProps> = ({
  items,
  onRemove,
  onOpenOptions,
  onOpenUnlocker,
  onProcessItem,
  onDownloadItem,
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-xs"
        >
          {/* File Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200 dark:border-zinc-700">
              {item.type === 'image' ? (
                <img src={item.previewUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : item.type === 'video' ? (
                <Film className="w-5 h-5 text-emerald-500" />
              ) : (
                <FileText className="w-5 h-5 text-teal-500" />
              )}
            </div>

            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate max-w-xs sm:max-w-md">
                {item.name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                <span>{formatBytes(item.originalSize)}</span>
                {item.resultSize && (
                  <>
                    <span>→</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatBytes(item.resultSize)}</span>
                    {item.savedPercentage !== undefined && item.savedPercentage > 0 && (
                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                        -{item.savedPercentage}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {item.status === 'processing' && (
            <div className="flex-1 max-w-xs w-full">
              <div className="flex justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
                <span>Processing...</span>
                <span>{item.progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 self-end md:self-auto">
            {/* Quick Unlocker for PDFs */}
            {item.type === 'pdf' && (
              <button
                onClick={() => onOpenUnlocker(item)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-medium border border-slate-200 dark:border-zinc-700 transition-all shadow-xs"
                title="Unlock PDF / Remove Password (e.g. Aadhaar, PAN)"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Unlock PDF</span>
              </button>
            )}

            {item.status === 'idle' && (
              <>
                <button
                  onClick={() => onOpenOptions(item)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-medium border border-slate-200 dark:border-zinc-700 shadow-xs"
                  title="Configure dimensions & target file size"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Customize</span>
                </button>
                <button
                  onClick={() => onProcessItem(item)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-xs active:scale-[0.98]"
                >
                  Compress
                </button>
              </>
            )}

            {item.status === 'done' && (
              <button
                onClick={() => onDownloadItem(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-xs active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            )}

            <button
              onClick={() => onRemove(item.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Remove from list"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
