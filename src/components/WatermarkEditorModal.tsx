import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Square, RotateCcw, Sparkles } from 'lucide-react';
import { ProcessedItem, WatermarkBox } from '../types';
import { ImageEngine } from '../services/imageEngine';

interface WatermarkEditorModalProps {
  item: ProcessedItem;
  isOpen: boolean;
  onClose: () => void;
  onApply: (blob: Blob) => void;
}

export const WatermarkEditorModal: React.FC<WatermarkEditorModalProps> = ({
  item,
  isOpen,
  onClose,
  onApply,
}) => {
  if (!isOpen) return null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<'brush' | 'box'>('brush');
  const [brushSize, setBrushSize] = useState<number>(24);
  const [isDrawing, setIsDrawing] = useState(false);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<WatermarkBox | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgObj(img);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.naturalWidth;
      maskCanvas.height = img.naturalHeight;
      maskCanvasRef.current = maskCanvas;
    };
    img.src = item.previewUrl;
  }, [item]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tool === 'brush') {
      setIsDrawing(true);
      drawBrush(x, y);
    } else if (tool === 'box') {
      setBoxStart({ x, y });
      setCurrentBox({ x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tool === 'brush' && isDrawing) {
      drawBrush(x, y);
    } else if (tool === 'box' && boxStart) {
      const bx = Math.min(boxStart.x, x);
      const by = Math.min(boxStart.y, y);
      const bw = Math.abs(x - boxStart.x);
      const bh = Math.abs(y - boxStart.y);
      setCurrentBox({ x: bx, y: by, width: bw, height: bh });
      redrawCanvasWithBox({ x: bx, y: by, width: bw, height: bh });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setBoxStart(null);
  };

  const drawBrush = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    maskCtx.fillStyle = '#ff0000';
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
  };

  const redrawCanvasWithBox = (box: WatermarkBox) => {
    const canvas = canvasRef.current;
    if (!canvas || !imgObj) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgObj, 0, 0);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  };

  const handleReset = () => {
    if (!canvasRef.current || !imgObj) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgObj, 0, 0);

    if (maskCanvasRef.current) {
      const mCtx = maskCanvasRef.current.getContext('2d');
      mCtx?.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    setCurrentBox(null);
  };

  const handleApply = async () => {
    if (!maskCanvasRef.current) return;
    setIsProcessing(true);
    try {
      const resultBlob = await ImageEngine.removeWatermark(
        item.file,
        maskCanvasRef.current,
        currentBox || undefined
      );
      onApply(resultBlob);
      onClose();
    } catch (err: any) {
      alert('Watermark removal error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Eraser className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Watermark & Object Remover</h3>
              <p className="text-xs text-slate-400">Paint or draw a box over the watermark to erase it seamlessly</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-3 bg-slate-900/60 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool('brush')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                tool === 'brush' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Brush Tool</span>
            </button>
            <button
              onClick={() => setTool('box')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                tool === 'box' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>Box Selector</span>
            </button>

            {tool === 'brush' && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-slate-400">Size:</span>
                <input
                  type="range"
                  min="8"
                  max="80"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-24 accent-emerald-500"
                />
                <span className="text-slate-300 font-mono w-6">{brushSize}px</span>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Canvas</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/80">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="max-w-full max-h-[60vh] object-contain cursor-crosshair border border-slate-800 rounded-lg shadow-lg"
          />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <span className="text-xs text-slate-400">
            Uses fast client-side gradient inpainting. No external server used.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? 'Erasing...' : 'Erase Watermark'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
