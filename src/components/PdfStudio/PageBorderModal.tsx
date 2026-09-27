import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  PageBorderConfig,
  PageBorderType,
  PdfStudioEngine
} from '../../services/pdfStudioEngine';

interface PageBorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PageBorderConfig;
  onApply: (config: PageBorderConfig, scope: 'all' | 'current' | 'odd' | 'even') => void;
  pdfBufferOrProxy: any;
  totalPages: number;
  currentPage: number;
  basePageDims: { width: number; height: number };
  pageRotations: Record<number, number>;
}

export const PageBorderModal: React.FC<PageBorderModalProps> = ({
  isOpen,
  onClose,
  config,
  onApply,
  pdfBufferOrProxy,
  totalPages,
  currentPage: initialPage,
  basePageDims,
  pageRotations,
}) => {
  const [enabled, setEnabled] = useState<boolean>(config.enabled ?? true);
  const [type, setType] = useState<PageBorderType>(config.type || 'solid');
  const [width, setWidth] = useState<number>(config.width || 1);
  const [color, setColor] = useState<string>(config.color || '#000000');
  const [top, setTop] = useState<number>(config.top ?? 36);
  const [bottom, setBottom] = useState<number>(config.bottom ?? 36);
  const [left, setLeft] = useState<number>(config.left ?? 36);
  const [right, setRight] = useState<number>(config.right ?? 36);
  const [scope, setScope] = useState<'all' | 'current' | 'odd' | 'even'>('all');

  const [previewPage, setPreviewPage] = useState<number>(initialPage || 1);
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);
  const [addToTemplate, setAddToTemplate] = useState<boolean>(false);

  // Collapsible sections
  const [typeOpen, setTypeOpen] = useState<boolean>(true);
  const [styleOpen, setStyleOpen] = useState<boolean>(true);
  const [marginsOpen, setMarginsOpen] = useState<boolean>(true);
  const [scopeOpen, setScopeOpen] = useState<boolean>(true);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render live preview on canvas
  useEffect(() => {
    if (!isOpen || !pdfBufferOrProxy || !previewCanvasRef.current) return;
    let isMounted = true;

    const renderPreview = async () => {
      try {
        const { canvas, cssWidth, cssHeight } = await PdfStudioEngine.renderPageToCanvas(
          pdfBufferOrProxy,
          previewPage,
          0.85,
          pageRotations[previewPage - 1] || 0
        );
        if (!isMounted || !previewCanvasRef.current) return;

        const target = previewCanvasRef.current;
        target.width = canvas.width;
        target.height = canvas.height;
        target.style.width = `${Math.round(cssWidth)}px`;
        target.style.height = `${Math.round(cssHeight)}px`;

        const ctx = target.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(canvas, 0, 0);

        if (enabled) {
          let applies = false;
          if (scope === 'all') applies = true;
          else if (scope === 'current') applies = previewPage === initialPage;
          else if (scope === 'odd') applies = previewPage % 2 !== 0;
          else if (scope === 'even') applies = previewPage % 2 === 0;

          if (applies) {
            const scale = target.width / basePageDims.width;
            const scaledTop = top * scale;
            const scaledBottom = bottom * scale;
            const scaledLeft = left * scale;
            const scaledRight = right * scale;
            const bw = target.width - scaledLeft - scaledRight;
            const bh = target.height - scaledTop - scaledBottom;

            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1, width * scale);

            if (type === 'dashed') {
              ctx.setLineDash([width * scale * 4, width * scale * 2]);
              ctx.strokeRect(scaledLeft, scaledTop, bw, bh);
            } else if (type === 'dotted') {
              ctx.setLineDash([width * scale, width * scale * 1.5]);
              ctx.strokeRect(scaledLeft, scaledTop, bw, bh);
            } else if (type === 'double') {
              const inset = Math.max(2, width * scale * 1.5);
              ctx.strokeRect(scaledLeft, scaledTop, bw, bh);
              if (bw > inset * 2 && bh > inset * 2) {
                ctx.strokeRect(scaledLeft + inset, scaledTop + inset, bw - inset * 2, bh - inset * 2);
              }
            } else if (type === 'corners') {
              const cornerLen = Math.min(Math.min(bw, bh) * 0.25, Math.max(20, width * scale * 8));
              // Top-left
              ctx.beginPath();
              ctx.moveTo(scaledLeft, scaledTop + cornerLen);
              ctx.lineTo(scaledLeft, scaledTop);
              ctx.lineTo(scaledLeft + cornerLen, scaledTop);
              // Top-right
              ctx.moveTo(scaledLeft + bw - cornerLen, scaledTop);
              ctx.lineTo(scaledLeft + bw, scaledTop);
              ctx.lineTo(scaledLeft + bw, scaledTop + cornerLen);
              // Bottom-left
              ctx.moveTo(scaledLeft, scaledTop + bh - cornerLen);
              ctx.lineTo(scaledLeft, scaledTop + bh);
              ctx.lineTo(scaledLeft + cornerLen, scaledTop + bh);
              // Bottom-right
              ctx.moveTo(scaledLeft + bw - cornerLen, scaledTop + bh);
              ctx.lineTo(scaledLeft + bw, scaledTop + bh);
              ctx.lineTo(scaledLeft + bw, scaledTop + bh - cornerLen);
              ctx.stroke();
            } else {
              ctx.strokeRect(scaledLeft, scaledTop, bw, bh);
            }
            ctx.restore();
          }
        }
      } catch (err) {
        console.error('Failed to render border preview:', err);
      }
    };

    renderPreview();
    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    pdfBufferOrProxy,
    previewPage,
    enabled,
    type,
    width,
    color,
    top,
    bottom,
    left,
    right,
    scope,
    basePageDims,
    pageRotations,
    initialPage,
  ]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(
      {
        enabled: true,
        type,
        width,
        color,
        top,
        bottom,
        left,
        right,
      },
      scope
    );
    onClose();
  };

  const borderTypes: { id: PageBorderType; label: string }[] = [
    { id: 'solid', label: 'Solid Line' },
    { id: 'dashed', label: 'Dashed' },
    { id: 'dotted', label: 'Dotted' },
    { id: 'double', label: 'Double Line' },
    { id: 'corners', label: 'Corners Only' },
    { id: 'frame', label: 'Decorative Frame' },
    { id: 'groove', label: 'Groove 3D' },
    { id: 'ridge', label: 'Ridge 3D' },
    { id: 'inset', label: 'Inset' },
    { id: 'outset', label: 'Outset' },
  ];

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs select-none">
      <div className="bg-[#1f232b] text-zinc-100 border border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[820px] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-[#191c23]">
          <h2 className="text-sm font-semibold text-zinc-200">Page Borders</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Left Settings + Right Live Page Preview */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Settings Panel */}
          <div className="w-full md:w-96 border-r border-zinc-800 flex flex-col overflow-y-auto p-4 space-y-4 text-xs">
            {/* 1. Border Scope Section */}
            <div className="space-y-2 border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => setScopeOpen(!scopeOpen)}
                className="flex items-center justify-between w-full text-zinc-300 font-bold text-xs uppercase tracking-wide hover:text-white"
              >
                <span>Target Pages</span>
                {scopeOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {scopeOpen && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setScope('current')}
                    className={`py-1 px-2 rounded-lg border text-center transition-colors ${
                      scope === 'current'
                        ? 'bg-blue-600 border-blue-500 text-white font-bold'
                        : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    Page {initialPage} Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('all')}
                    className={`py-1 px-2 rounded-lg border text-center transition-colors ${
                      scope === 'all'
                        ? 'bg-blue-600 border-blue-500 text-white font-bold'
                        : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    All Pages ({totalPages})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('odd')}
                    className={`py-1 px-2 rounded-lg border text-center transition-colors ${
                      scope === 'odd'
                        ? 'bg-blue-600 border-blue-500 text-white font-bold'
                        : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    Odd Pages Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('even')}
                    className={`py-1 px-2 rounded-lg border text-center transition-colors ${
                      scope === 'even'
                        ? 'bg-blue-600 border-blue-500 text-white font-bold'
                        : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    Even Pages Only
                  </button>
                </div>
              )}
            </div>

            {/* 2. Border Style / Type */}
            <div className="space-y-2 border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => setTypeOpen(!typeOpen)}
                className="flex items-center justify-between w-full text-zinc-300 font-bold text-xs uppercase tracking-wide hover:text-white"
              >
                <span>Border Style</span>
                {typeOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {typeOpen && (
                <div className="grid grid-cols-2 gap-1 text-xs pt-1">
                  {borderTypes.map((t) => {
                    const isSel = type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-left text-[11px] transition-colors ${
                          isSel
                            ? 'bg-blue-600 text-white font-semibold border-blue-500'
                            : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <span>{t.label}</span>
                        {isSel && <Check className="w-3 h-3 text-white flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Thickness & Color */}
            <div className="space-y-2 border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => setStyleOpen(!styleOpen)}
                className="flex items-center justify-between w-full text-zinc-300 font-bold text-xs uppercase tracking-wide hover:text-white"
              >
                <span>Thickness & Color</span>
                {styleOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {styleOpen && (
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-zinc-400 mb-1">
                      <span>Thickness</span>
                      <span className="font-mono text-blue-400">{width} pt</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={12}
                      step={0.5}
                      value={width}
                      onChange={(e) => setWidth(parseFloat(e.target.value) || 1)}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                      <span>Color</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-zinc-400">{color}</span>
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border border-zinc-600 bg-transparent p-0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['#000000', '#1e3a8a', '#475569', '#dc2626', '#d97706', '#15803d', '#7e22ce', '#0891b2'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className="w-5 h-5 rounded-full border border-white/20 shadow-xs hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Margins Section */}
            <div className="space-y-2 pb-2">
              <button
                type="button"
                onClick={() => setMarginsOpen(!marginsOpen)}
                className="flex items-center justify-between w-full text-zinc-300 font-bold text-xs uppercase tracking-wide hover:text-white"
              >
                <span>Border Margins (pt)</span>
                {marginsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {marginsOpen && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1 mb-1">
                    <button
                      type="button"
                      onClick={() => { setTop(18); setBottom(18); setLeft(18); setRight(18); }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                    >
                      18pt
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTop(36); setBottom(36); setLeft(36); setRight(36); }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                    >
                      36pt
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTop(72); setBottom(72); setLeft(72); setRight(72); }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                    >
                      72pt
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-xs font-mono">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Top</label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={top}
                        onChange={(e) => setTop(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-1.5 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Bottom</label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={bottom}
                        onChange={(e) => setBottom(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-1.5 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Left</label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={left}
                        onChange={(e) => setLeft(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-1.5 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Right</label>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={right}
                        onChange={(e) => setRight(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-1.5 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Live Document Page Preview */}
          <div className="flex-1 bg-[#12151b] flex flex-col items-center justify-between p-4 min-h-0 overflow-hidden">
            <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-auto p-2">
              <div
                className="bg-white shadow-2xl rounded-xs overflow-hidden border border-zinc-300/40 dark:border-zinc-800 transition-transform origin-center"
                style={{ transform: `scale(${previewZoom})` }}
              >
                <canvas ref={previewCanvasRef} className="block max-h-[64vh] object-contain" />
              </div>
            </div>

            {/* Bottom Controls: Zoom + Pagination */}
            <div className="flex items-center gap-3 bg-[#1a1d24] border border-zinc-800 rounded-lg px-3 py-1 shadow-md shrink-0">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border-r border-zinc-700 pr-2">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(0.4, Math.round((z - 0.15) * 100) / 100))}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(1.0)}
                  className="font-mono text-[11px] text-zinc-300 hover:text-white px-1 font-semibold"
                  title="Reset Zoom to 100%"
                >
                  {Math.round(previewZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100))}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewPage(1)}
                  disabled={previewPage <= 1}
                  className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  disabled={previewPage <= 1}
                  className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs px-2 text-zinc-300">
                  {previewPage} / {totalPages || 1}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewPage((p) => Math.min(totalPages || 1, p + 1))}
                  disabled={previewPage >= totalPages}
                  className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPage(totalPages || 1)}
                  disabled={previewPage >= totalPages}
                  className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Add to template, Apply, Cancel */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-[#191c23]">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={addToTemplate}
              onChange={(e) => setAddToTemplate(e.target.checked)}
              className="rounded border-zinc-700 text-blue-600 focus:ring-0"
            />
            <span>Add to template</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#262a34] hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
