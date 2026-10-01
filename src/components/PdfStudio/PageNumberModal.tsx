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
  Info,
  ZoomIn,
  ZoomOut,
  Trash2
} from 'lucide-react';
import {
  PageNumberConfig,
  PageNumberPosition,
  PageNumberFormat,
  PageNumberFilter,
  PdfStudioEngine
} from '../../services/pdfStudioEngine';
import { MS_WORD_FONTS } from './PdfEditorModal';

interface PageNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PageNumberConfig;
  onApply: (config: PageNumberConfig) => void;
  pdfBufferOrProxy: any;
  totalPages: number;
  currentPage: number;
  basePageDims: { width: number; height: number };
  pageRotations: Record<number, number>;
}

export const PageNumberModal: React.FC<PageNumberModalProps> = ({
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
  const [position, setPosition] = useState<PageNumberPosition>(config.position || 'bottom-center');
  const [format, setFormat] = useState<PageNumberFormat>(config.format || 'number');
  const [fontFamily, setFontFamily] = useState<string>(config.fontFamily || 'Microsoft Sans Serif');
  const [fontSize, setFontSize] = useState<number>(config.fontSize || 10);
  const [fontWeight, setFontWeight] = useState<'normal' | 'medium' | 'bold'>(config.fontWeight || 'normal');
  const [color, setColor] = useState<string>(config.color || '#000000');
  const [filterMode, setFilterMode] = useState<PageNumberFilter>(config.filterMode || 'all');
  const [startFrom, setStartFrom] = useState<number>(config.startFrom || 1);
  const [offsetY, setOffsetY] = useState<number>(config.offsetY || 24);
  const [specificPages, setSpecificPages] = useState<string>(config.specificPages || '');

  const [previewPage, setPreviewPage] = useState<number>(initialPage || 1);
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);
  const [baseCanvasDims, setBaseCanvasDims] = useState<{ width: number; height: number } | null>(null);
  const [addToTemplate, setAddToTemplate] = useState<boolean>(false);

  // Removal state
  const [showRemoveModal, setShowRemoveModal] = useState<boolean>(false);
  const [removeScope, setRemoveScope] = useState<'all' | 'odd' | 'even' | 'current' | 'specific'>('all');
  const [removeSpecificPages, setRemoveSpecificPages] = useState<string>('');

  // Collapsible sections
  const [contentOpen, setContentOpen] = useState<boolean>(true);
  const [positionOpen, setPositionOpen] = useState<boolean>(true);
  const [pageRangeOpen, setPageRangeOpen] = useState<boolean>(true);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (showRemoveModal) {
          setShowRemoveModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, showRemoveModal, onClose]);

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
        target.style.width = '100%';
        target.style.height = '100%';
        setBaseCanvasDims({ width: cssWidth, height: cssHeight });

        const ctx = target.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(canvas, 0, 0);

        let applies = false;
        if (filterMode === 'all') applies = true;
        else if (filterMode === 'odd') applies = previewPage % 2 !== 0;
        else if (filterMode === 'even') applies = previewPage % 2 === 0;
        else if (filterMode === 'specific' && specificPages) {
          const parts = specificPages.split(',').map((p) => p.trim());
          applies = parts.some((p) => {
            if (p.includes('-')) {
              const [a, b] = p.split('-').map(Number);
              return previewPage >= a && previewPage <= b;
            }
            return Number(p) === previewPage;
          });
        }

        if (applies) {
          const safeBaseW = (basePageDims && basePageDims.width > 0) ? basePageDims.width : (cssWidth || target.width || 595.28);
          const scale = target.width / safeBaseW;
          const calcFontSize = Math.max(8, fontSize * scale);
          const displayVal = startFrom + previewPage - 1;

          const toRoman = (num: number, upper = true) => {
            if (num <= 0) return String(num);
            const romanMap: [number, string][] = [
              [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
              [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
              [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
            ];
            let res = '';
            for (const [v, s] of romanMap) {
              while (num >= v) {
                res += s;
                num -= v;
              }
            }
            return upper ? res : res.toLowerCase();
          };

          let text = `${displayVal}`;
          if (format === 'page-x') text = `Page ${displayVal}`;
          else if (format === 'page-x-of-y') text = `Page ${displayVal} of ${totalPages || 1}`;
          else if (format === 'dash') text = `- ${displayVal} -`;
          else if (format === 'roman-upper') text = toRoman(displayVal, true);
          else if (format === 'roman-lower') text = toRoman(displayVal, false);

          ctx.save();
          ctx.font = `${fontWeight === 'bold' ? 'bold ' : fontWeight === 'medium' ? '500 ' : ''}${calcFontSize}px "${fontFamily}", sans-serif`;
          ctx.fillStyle = color;
          ctx.textBaseline = 'middle';

          let posX = 36 * scale;
          if (position.endsWith('center')) {
            posX = target.width / 2;
            ctx.textAlign = 'center';
          } else if (position.endsWith('right')) {
            posX = target.width - 36 * scale;
            ctx.textAlign = 'right';
          } else {
            ctx.textAlign = 'left';
          }

          let posY = target.height - offsetY * scale;
          if (position.startsWith('top')) {
            posY = offsetY * scale + calcFontSize / 2;
          } else if (position.startsWith('middle')) {
            posY = target.height / 2;
          }

          ctx.fillText(text, posX, posY);
          ctx.restore();
        }
      } catch (err) {
        console.error('Failed to render page number preview:', err);
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
    position,
    format,
    fontFamily,
    fontSize,
    fontWeight,
    color,
    filterMode,
    startFrom,
    offsetY,
    specificPages,
    basePageDims,
    pageRotations,
    totalPages,
  ]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({
      enabled: true,
      position,
      format,
      fontFamily,
      fontSize,
      fontWeight,
      color,
      filterMode,
      startFrom,
      offsetY,
      specificPages,
    });
    onClose();
  };

  const handleRemove = (scope: 'all' | 'odd' | 'even' | 'current' | 'specific') => {
    if (scope === 'all') {
      onApply({
        ...config,
        enabled: false,
      });
      onClose();
      return;
    }
    if (scope === 'odd') {
      onApply({
        ...config,
        enabled: true,
        filterMode: 'even',
      });
      onClose();
      return;
    }
    if (scope === 'even') {
      onApply({
        ...config,
        enabled: true,
        filterMode: 'odd',
      });
      onClose();
      return;
    }
    if (scope === 'current') {
      const remaining = Array.from({ length: totalPages || 1 }, (_, i) => i + 1)
        .filter((p) => p !== previewPage)
        .join(', ');
      onApply({
        ...config,
        enabled: true,
        filterMode: 'specific',
        specificPages: remaining,
      });
      onClose();
      return;
    }
    if (scope === 'specific') {
      const toRemoveSet = new Set(
        removeSpecificPages
          .split(',')
          .map((p) => p.trim())
          .flatMap((p) => {
            if (p.includes('-')) {
              const [a, b] = p.split('-').map(Number);
              const list: number[] = [];
              for (let n = a; n <= b; n++) list.push(n);
              return list;
            }
            return [Number(p)];
          })
      );
      const remaining = Array.from({ length: totalPages || 1 }, (_, i) => i + 1)
        .filter((p) => !toRemoveSet.has(p))
        .join(', ');
      onApply({
        ...config,
        enabled: true,
        filterMode: 'specific',
        specificPages: remaining,
      });
      onClose();
      return;
    }
  };

  const gridPositions: { id: PageNumberPosition; label: string }[] = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'middle-left', label: 'Middle Left' },
    { id: 'middle-center', label: 'Middle Center' },
    { id: 'middle-right', label: 'Middle Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ];

  let isPageApplies = false;
  if (filterMode === 'all') isPageApplies = true;
  else if (filterMode === 'odd') isPageApplies = previewPage % 2 !== 0;
  else if (filterMode === 'even') isPageApplies = previewPage % 2 === 0;
  else if (filterMode === 'specific' && specificPages) {
    const parts = specificPages.split(',').map((p) => p.trim());
    isPageApplies = parts.some((p) => {
      if (p.includes('-')) {
        const [a, b] = p.split('-').map(Number);
        return previewPage >= a && previewPage <= b;
      }
      return Number(p) === previewPage;
    });
  }

  const toRoman = (num: number, upper = true) => {
    if (num <= 0) return String(num);
    const romanMap: [number, string][] = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ];
    let res = '';
    for (const [v, s] of romanMap) {
      while (num >= v) {
        res += s;
        num -= v;
      }
    }
    return upper ? res : res.toLowerCase();
  };

  const displayVal = startFrom + previewPage - 1;
  let previewBadgeText = `${displayVal}`;
  if (format === 'page-x') previewBadgeText = `Page ${displayVal}`;
  else if (format === 'page-x-of-y') previewBadgeText = `Page ${displayVal} of ${totalPages || 1}`;
  else if (format === 'dash') previewBadgeText = `- ${displayVal} -`;
  else if (format === 'roman-upper') previewBadgeText = toRoman(displayVal, true);
  else if (format === 'roman-lower') previewBadgeText = toRoman(displayVal, false);

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs select-none">
      <div className="bg-[#1f232b] text-zinc-100 border border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[820px] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-[#191c23]">
          <h2 className="text-sm font-semibold text-zinc-200">Page Number</h2>
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
            {/* 1. Content Section */}
            <div className="space-y-2 border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => setContentOpen(!contentOpen)}
                className="flex items-center justify-between w-full text-zinc-300 font-bold text-xs uppercase tracking-wide hover:text-white"
              >
                <span>Content</span>
                {contentOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {contentOpen && (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Page number style</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as PageNumberFormat)}
                      className="w-full px-2 py-1.5 bg-[#14171d] border border-zinc-700 rounded-md text-zinc-200 text-xs"
                    >
                      <option value="number">1, 2, 3 (Plain Number)</option>
                      <option value="page-x">Page 1, Page 2</option>
                      <option value="page-x-of-y">Page 1 of {totalPages || 1}</option>
                      <option value="dash">- 1 -</option>
                      <option value="roman-upper">I, II, III (Roman Upper)</option>
                      <option value="roman-lower">i, ii, iii (Roman Lower)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Start page number</label>
                    <input
                      type="number"
                      min={1}
                      value={startFrom}
                      onChange={(e) => setStartFrom(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-1.5 bg-[#14171d] border border-zinc-700 rounded-md text-zinc-200 text-xs"
                    />
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="text-zinc-400 font-medium block mb-1">Font</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#14171d] border border-zinc-700 rounded-md text-zinc-200 text-xs"
                    >
                      {MS_WORD_FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Size, Color, Weight */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Size (pt)</label>
                      <input
                        type="number"
                        min={6}
                        max={36}
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 10)}
                        className="w-full px-2 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Weight</label>
                      <select
                        value={fontWeight}
                        onChange={(e) => setFontWeight(e.target.value as any)}
                        className="w-full px-2 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                      >
                        <option value="normal">Regular</option>
                        <option value="medium">Medium</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-0.5">Color</label>
                      <div className="relative flex flex-col items-center justify-center p-1 rounded border border-zinc-700 bg-[#14171d] cursor-pointer hover:border-zinc-500">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                        <span className="text-xs font-bold leading-none">A</span>
                        <span
                          className="w-3.5 h-1 mt-0.5 rounded-xs"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Position Section */}
            <div className="space-y-2 border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => setPositionOpen(!positionOpen)}
                className="flex items-center justify-between w-full text-zinc-300 font-bold text-xs uppercase tracking-wide hover:text-white"
              >
                <span>Position</span>
                {positionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {positionOpen && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-4">
                    {/* 3x3 Grid Position Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[#14171d] border border-zinc-700 rounded-lg w-28 h-28 shrink-0">
                      {gridPositions.map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setPosition(pos.id)}
                          className={`rounded-xs flex items-center justify-center transition-all ${
                            position === pos.id
                              ? 'bg-blue-500 shadow-sm ring-1 ring-blue-300'
                              : 'bg-zinc-800 hover:bg-zinc-700'
                          }`}
                          title={pos.label}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${position === pos.id ? 'bg-white' : 'bg-zinc-500'}`} />
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="text-[11px] text-zinc-300 font-semibold">
                        Selected: <span className="text-blue-400 capitalize">{position.replace('-', ' ')}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-zinc-400">Offset Y</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={offsetY}
                            onChange={(e) => setOffsetY(parseInt(e.target.value, 10) || 24)}
                            className="w-16 px-1.5 py-0.5 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                          />
                          <span className="text-[10px] text-zinc-400">pt</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Page Range Section */}
            <div className="space-y-2 pb-2">
              <button
                type="button"
                onClick={() => setPageRangeOpen(!pageRangeOpen)}
                className="flex items-center justify-between w-full text-zinc-300 font-bold text-xs uppercase tracking-wide hover:text-white"
              >
                <span>Page Range</span>
                {pageRangeOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {pageRangeOpen && (
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="radio"
                      name="filterMode"
                      checked={filterMode === 'all'}
                      onChange={() => setFilterMode('all')}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span>All pages</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="radio"
                      name="filterMode"
                      checked={filterMode === 'odd'}
                      onChange={() => setFilterMode('odd')}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span>Odd pages only</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="radio"
                      name="filterMode"
                      checked={filterMode === 'even'}
                      onChange={() => setFilterMode('even')}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span>Even pages only</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="radio"
                        name="filterMode"
                        checked={filterMode === 'specific'}
                        onChange={() => setFilterMode('specific')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>Custom</span>
                    </label>
                    <input
                      type="text"
                      value={specificPages}
                      onChange={(e) => setSpecificPages(e.target.value)}
                      placeholder="1, 3-5"
                      className="flex-1 px-2 py-0.5 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Live Document Page Preview */}
          <div
            className="flex-1 bg-[#12151b] flex flex-col items-center justify-between p-4 min-h-0 overflow-hidden"
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setPreviewZoom((z) => Math.min(2.5, Math.max(0.4, Math.round((z + (e.deltaY < 0 ? 0.1 : -0.1)) * 100) / 100)));
              }
            }}
          >
            <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-auto p-4 select-none">
              <div
                className="relative bg-white shadow-2xl rounded-xs overflow-hidden border border-zinc-300/40 dark:border-zinc-800 transition-all origin-center"
                style={{
                  width: baseCanvasDims ? `${Math.round(baseCanvasDims.width * previewZoom)}px` : 'auto',
                  height: baseCanvasDims ? `${Math.round(baseCanvasDims.height * previewZoom)}px` : 'auto',
                  maxWidth: 'none',
                }}
              >
                <canvas ref={previewCanvasRef} className="block w-full h-full" />
              </div>
            </div>

            {/* Bottom Controls: Zoom + Pagination */}
            <div className="flex items-center gap-3 bg-[#1a1d24] border border-zinc-800 rounded-lg px-3 py-1.5 shadow-md shrink-0">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2 border-r border-zinc-700 pr-3">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 100) / 100))}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.05"
                  value={previewZoom}
                  onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                  className="w-20 sm:w-24 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  title={`Zoom: ${Math.round(previewZoom * 100)}%`}
                />
                <button
                  type="button"
                  onClick={() => setPreviewZoom(1.0)}
                  className="font-mono text-[11px] text-zinc-300 hover:text-white px-1 font-semibold min-w-[36px] text-center"
                  title="Reset Zoom to 100%"
                >
                  {Math.round(previewZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(2.5, Math.round((z + 0.1) * 100) / 100))}
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

        {/* Bottom Bar: Remove, Add to template, Apply, Cancel */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-[#191c23]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowRemoveModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 hover:text-white text-xs font-semibold shadow-xs transition-colors"
              title="Remove or delete page numbers"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Remove Page Numbers</span>
            </button>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={addToTemplate}
                onChange={(e) => setAddToTemplate(e.target.checked)}
                className="rounded border-zinc-700 text-blue-600 focus:ring-0"
              />
              <span>Add to template</span>
            </label>
          </div>
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

        {/* Removal Options Modal */}
        {showRemoveModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
            <div className="bg-[#1f232b] text-zinc-100 border border-zinc-700 rounded-xl shadow-2xl p-5 max-w-md w-full">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-red-400">
                  <Trash2 className="w-4 h-4" />
                  <h3 className="font-semibold text-sm">Remove Page Numbers</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRemoveModal(false)}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 mb-4">
                Choose which pages you want to remove or exclude page numbers from:
              </p>

              <div className="space-y-2 mb-5">
                {[
                  { id: 'all', label: 'All Pages (completely disable)' },
                  { id: 'odd', label: 'Odd Pages Only' },
                  { id: 'even', label: 'Even Pages Only' },
                  { id: 'current', label: `Current Page Only (Page ${previewPage})` },
                  { id: 'specific', label: 'Specified Pages (custom list)' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer border text-xs transition-colors ${
                      removeScope === opt.id
                        ? 'bg-red-950/30 border-red-700/60 text-red-200'
                        : 'bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800/80 text-zinc-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="removeScope"
                      checked={removeScope === opt.id}
                      onChange={() => setRemoveScope(opt.id as any)}
                      className="text-red-600 focus:ring-0"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              {removeScope === 'specific' && (
                <div className="mb-4">
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Enter page numbers to remove (e.g. 1, 3, 5-8):
                  </label>
                  <input
                    type="text"
                    value={removeSpecificPages}
                    onChange={(e) => setRemoveSpecificPages(e.target.value)}
                    placeholder="e.g. 1, 3, 5-8"
                    className="w-full bg-[#12151b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRemoveModal(false)}
                  className="px-3.5 py-1.5 bg-[#262a34] hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleRemove(removeScope);
                    setShowRemoveModal(false);
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Confirm Removal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
