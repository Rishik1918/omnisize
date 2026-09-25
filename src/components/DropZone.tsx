import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Film, FileText } from 'lucide-react';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  onPresetSelect?: (preset: string) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesAdded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragOver(true);
    } else if (e.type === 'dragleave') {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3.5">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-10 text-center transition-all shadow-xs ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-indigo-500/50 hover:bg-slate-50/80 dark:hover:bg-zinc-900/80'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,.pdf,.docx,.pptx,.xlsx,.doc,.ppt,.xls"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
            <Upload className="h-6 w-6 stroke-[1.75]" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-zinc-100">
              Select files or drag and drop
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Images, Videos, PDFs, and Office Documents
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 text-xs font-medium transition-colors shadow-xs"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-500" strokeWidth={1.5} />
          <span>Compress PDF</span>
        </button>

        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 text-xs font-medium transition-colors shadow-xs"
        >
          <ImageIcon className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} />
          <span>Resize Image</span>
        </button>

        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 text-xs font-medium transition-colors shadow-xs"
        >
          <Film className="w-3.5 h-3.5 text-purple-500" strokeWidth={1.5} />
          <span>Compress Video</span>
        </button>
      </div>
    </div>
  );
};
