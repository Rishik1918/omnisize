import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Film, FileText, FileCode } from 'lucide-react';

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
    <div className="space-y-3">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border border-dashed p-6 sm:p-10 text-center transition-all ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-950/20'
            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
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
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300 shadow-sm">
            <Upload className="h-5 w-5" strokeWidth={1.5} />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-medium text-zinc-200">
              Select files or drag and drop
            </h3>
            <p className="text-xs text-zinc-400">
              Images, Videos, PDFs, and Office Documents
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Chips with Clean SVG Icons */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
          <span>Compress PDF</span>
        </button>

        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition-colors"
        >
          <ImageIcon className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
          <span>Resize Image</span>
        </button>

        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs transition-colors"
        >
          <Film className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
          <span>Compress Video</span>
        </button>
      </div>
    </div>
  );
};
