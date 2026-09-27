import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pipette, Check, X } from 'lucide-react';

interface ColorWheelPickerProps {
  color: string;
  onChange: (hex: string) => void;
  onClose?: () => void;
}

export const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({ color, onChange, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentHex, setCurrentHex] = useState<string>(color || '#000000');
  const [brightness, setBrightness] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Render the circular color wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = width / 2 - 2;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);

        const index = (y * width + x) * 4;
        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;

          const sat = Math.min(1, dist / radius);
          const [r, g, b] = hsvToRgb(angle, sat, brightness);

          data[index] = r;
          data[index + 1] = g;
          data[index + 2] = b;
          data[index + 3] = 255;
        } else {
          data[index + 3] = 0;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw boundary circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [brightness]);

  const handleCanvasInteraction = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = canvas.width / 2 - 2;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const sat = Math.min(1, dist / radius);
      const [r, g, b] = hsvToRgb(angle, sat, brightness);
      const hex = rgbToHex(r, g, b);
      setCurrentHex(hex);
      onChange(hex);
    },
    [brightness, onChange]
  );

  return (
    <div
      className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl w-64 select-none animate-fade-in text-zinc-900 dark:text-zinc-100 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Color Wheel</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Wheel Canvas */}
      <div className="flex justify-center mb-3">
        <canvas
          ref={canvasRef}
          width={180}
          height={180}
          className="cursor-crosshair rounded-full shadow-inner"
          onMouseDown={(e) => {
            setIsDragging(true);
            handleCanvasInteraction(e);
          }}
          onMouseMove={(e) => {
            if (isDragging) handleCanvasInteraction(e);
          }}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={(e) => {
            setIsDragging(true);
            handleCanvasInteraction(e);
          }}
          onTouchMove={(e) => {
            if (isDragging) handleCanvasInteraction(e);
          }}
          onTouchEnd={() => setIsDragging(false)}
        />
      </div>

      {/* Brightness Slider */}
      <div className="mb-3 space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-zinc-500">
          <span>Brightness</span>
          <span>{Math.round(brightness * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.02"
          value={brightness}
          onChange={(e) => {
            const b = parseFloat(e.target.value);
            setBrightness(b);
          }}
          className="w-full accent-indigo-600 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
        />
      </div>

      {/* Color Hex & Swatch */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-600 shadow-inner flex-shrink-0"
          style={{ backgroundColor: currentHex }}
        />
        <input
          type="text"
          value={currentHex}
          onChange={(e) => {
            setCurrentHex(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
              onChange(e.target.value);
            }
          }}
          className="w-full px-2 py-1 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 uppercase"
        />
      </div>

      {/* Presets */}
      <div className="grid grid-cols-7 gap-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        {[
          '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
          '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b', '#78350f', '#064e3b'
        ].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCurrentHex(c);
              onChange(c);
            }}
            style={{ backgroundColor: c }}
            className={`w-6 h-6 rounded-md border cursor-pointer hover:scale-110 transition-transform ${
              currentHex.toLowerCase() === c.toLowerCase()
                ? 'ring-2 ring-indigo-500 scale-105'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
            title={c}
          />
        ))}
      </div>
    </div>
  );
};

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
