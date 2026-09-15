import React, { useState } from 'react';
import { X, Film } from 'lucide-react';
import { ProcessedItem, VideoProcessingOptions } from '../types';

interface VideoOptionsModalProps {
  item: ProcessedItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: VideoProcessingOptions) => void;
}

export const VideoOptionsModal: React.FC<VideoOptionsModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [scale, setScale] = useState<number>(0.75);
  const [targetMB, setTargetMB] = useState<number>(0);
  const [muteAudio, setMuteAudio] = useState<boolean>(false);

  const handleApply = () => {
    onSave({
      mode: 'compress',
      resolutionScale: scale,
      targetSizeMB: targetMB > 0 ? targetMB : undefined,
      muteAudio,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl w-full max-w-lg overflow-hidden border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Video Compression & Scaling</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs text-slate-300 block mb-2">Resolution Scaling</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '50%', value: 0.5 },
                { label: '75%', value: 0.75 },
                { label: '100%', value: 1.0 },
                { label: '150% (Upscale)', value: 1.5 },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setScale(s.value)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                    scale === s.value
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">
              Target File Size (MB) - (e.g. 25 MB for Discord/Email/WhatsApp)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="e.g. 25"
                value={targetMB || ''}
                onChange={(e) => setTargetMB(Number(e.target.value))}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-400 outline-none"
              />
              <span className="text-xs text-slate-400">MB</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Bitrate is calculated in real-time based on video duration.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={muteAudio}
              onChange={(e) => setMuteAudio(e.target.checked)}
              className="rounded text-blue-500 accent-blue-500"
            />
            <span>Mute / Strip audio track (reduces file size further)</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-900/60 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-400 transition-all shadow-md shadow-blue-500/20"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
