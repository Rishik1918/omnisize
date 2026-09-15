import React, { useState } from 'react';
import { Upload, RefreshCw, Download, Trash2, FileText, Film, Image as ImageIcon, Table, Music, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { ConversionEngine, ConversionTarget } from '../services/conversionEngine';

interface ConvertItem {
  id: string;
  file: File;
  name: string;
  targetFormat: string;
  availableTargets: ConversionTarget[];
  status: 'idle' | 'converting' | 'done' | 'error';
  progress: number;
  resultBlob?: Blob;
  resultFilename?: string;
  error?: string;
}

export const ConverterView: React.FC = () => {
  const [items, setItems] = useState<ConvertItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const getCategoryIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv', 'tsv'].includes(ext)) return Table;
    if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return Film;
    if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) return Music;
    if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'bmp', 'ico'].includes(ext)) return ImageIcon;
    return FileText;
  };

  const handleFiles = (files: File[]) => {
    const newItems: ConvertItem[] = files.map((file) => {
      const targets = ConversionEngine.getSupportedTargets(file.name);
      return {
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        targetFormat: targets[0]?.format || 'pdf',
        availableTargets: targets,
        status: 'idle',
        progress: 0,
      };
    });
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleTargetChange = (id: string, format: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, targetFormat: format, status: 'idle' } : i))
    );
  };

  const convertSingle = async (item: ConvertItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'converting', progress: 5 } : i))
    );

    try {
      const res = await ConversionEngine.convertFile(item.file, item.targetFormat, (p) => {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress: p } : i))
        );
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'done',
                progress: 100,
                resultBlob: res.blob,
                resultFilename: res.filename,
              }
            : i
        )
      );
    } catch (err: any) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'error', error: err.message || 'Conversion failed' } : i
        )
      );
    }
  };

  const handleConvertAll = async () => {
    for (const item of items) {
      if (item.status === 'idle') {
        await convertSingle(item);
      }
    }
  };

  const handleDownload = (item: ConvertItem) => {
    if (!item.resultBlob || !item.resultFilename) return;
    const url = URL.createObjectURL(item.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.resultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.onchange = (e: any) => {
            if (e.target.files) handleFiles(Array.from(e.target.files));
          };
          input.click();
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-950/20'
            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-100">
              Drop files here to convert
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Supports Word, PDF, Excel, PowerPoint, Text, Markdown, Videos, Photos & Audio
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[10px] sm:text-[11px] text-zinc-400">
            <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60">Word ⇄ PDF</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60">Excel ⇄ CSV / PDF</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60">PPTX ⇄ PDF</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60">Images ⇄ PDF / WebP</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60">MP4 ⇄ HEVC / Audio</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {items.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 gap-2">
          <div className="text-xs text-zinc-300">
            <span className="font-semibold text-zinc-100">{items.length}</span> file(s) selected
          </div>
          <button
            onClick={handleConvertAll}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Convert All</span>
          </button>
        </div>
      )}

      {/* Conversion Item List */}
      <div className="space-y-2.5">
        {items.map((item) => {
          const Icon = getCategoryIcon(item.name);
          return (
            <div
              key={item.id}
              className="bg-zinc-900 rounded-xl p-3.5 sm:p-4 border border-zinc-800 space-y-3"
            >
              {/* Top row: Icon + Filename + Size */}
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-medium text-zinc-200 truncate">
                      {item.name}
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors flex-shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom row: Target selector + Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[11px] text-zinc-400 flex-shrink-0 hidden xs:inline">To:</span>
                  <select
                    value={item.targetFormat}
                    onChange={(e) => handleTargetChange(item.id, e.target.value)}
                    disabled={item.status === 'converting'}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 outline-none w-full sm:w-auto max-w-[220px] truncate"
                  >
                    {item.availableTargets.map((t) => (
                      <option key={t.format} value={t.format}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.status === 'converting' && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>{item.progress}%</span>
                    </div>
                  )}

                  {item.status === 'idle' && (
                    <button
                      onClick={() => convertSingle(item)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all active:scale-[0.98]"
                    >
                      Convert
                    </button>
                  )}

                  {item.status === 'done' && (
                    <button
                      onClick={() => handleDownload(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 font-medium text-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  )}

                  {item.status === 'error' && (
                    <span className="text-[11px] text-red-400 truncate max-w-[150px]">
                      {item.error || 'Failed'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
