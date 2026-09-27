import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Sliders,
  Type,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Upload,
  Info
} from 'lucide-react';
import { WatermarkConfig, PdfStudioEngine } from '../../services/pdfStudioEngine';
import { MS_WORD_FONTS } from './PdfEditorModal';

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WatermarkConfig;
  onApply: (config: WatermarkConfig) => void;
  pdfBufferOrProxy: any;
  totalPages: number;
  currentPage: number;
  basePageDims: { width: number; height: number };
  pageRotations: Record<number, number>;
}

export const WatermarkModal: React.FC<WatermarkModalProps> = ({
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
  const [activeTab, setActiveTab] = useState<'text' | 'file'>(config.type || 'text');
  const [text, setText] = useState<string>(config.text || 'CONFIDENTIAL');
  const [fontFamily, setFontFamily] = useState<string>(config.fontFamily || 'Microsoft Sans Serif');
  const [fontSize, setFontSize] = useState<number>(config.fontSize || 24);
  const [color, setColor] = useState<string>(config.color || '#dc2626');
  const [isBold, setIsBold] = useState<boolean>(config.isBold ?? true);
  const [isItalic, setIsItalic] = useState<boolean>(config.isItalic ?? false);
  const [isUnderline, setIsUnderline] = useState<boolean>(config.isUnderline ?? false);
  const [proportionOfPages, setProportionOfPages] = useState<boolean>(config.proportionOfPages ?? true);
  const [proportionPercent, setProportionPercent] = useState<number>(config.proportionPercent ?? 50);

  const [position, setPosition] = useState<WatermarkConfig['position']>(config.position || 'center');
  const [xOffsetCm, setXOffsetCm] = useState<number>(config.xOffsetCm ?? 2.7);
  const [yOffsetCm, setYOffsetCm] = useState<number>(config.yOffsetCm ?? 2.4);
  const [tile, setTile] = useState<boolean>(config.tile ?? false);
  const [tileSpacingXCm, setTileSpacingXCm] = useState<number>(config.tileSpacingXCm ?? 2);
  const [tileSpacingYCm, setTileSpacingYCm] = useState<number>(config.tileSpacingYCm ?? 2);

  const [rotation, setRotation] = useState<number>(config.rotation ?? 45);
  const [opacity, setOpacity] = useState<number>(config.opacity ?? 100);
  const [layer, setLayer] = useState<'front' | 'behind'>(config.layer || 'front');

  const [pageScope, setPageScope] = useState<'all' | 'custom' | 'odd' | 'even'>(config.pageScope || 'all');
  const [customRange, setCustomRange] = useState<string>(config.customRange || `1/${totalPages || 1}`);
  const [scopeDropdown, setScopeDropdown] = useState<'all' | 'odd' | 'even'>('all');

  const [previewPage, setPreviewPage] = useState<number>(initialPage || 1);
  const [addToTemplate, setAddToTemplate] = useState<boolean>(false);

  // Collapsible sections
  const [contentOpen, setContentOpen] = useState<boolean>(true);
  const [positionOpen, setPositionOpen] = useState<boolean>(true);
  const [settingOpen, setSettingOpen] = useState<boolean>(true);
  const [pageRangeOpen, setPageRangeOpen] = useState<boolean>(true);

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

        // Check if watermark applies to this page
        let applies = false;
        if (pageScope === 'all') applies = true;
        else if (pageScope === 'odd') applies = previewPage % 2 !== 0;
        else if (pageScope === 'even') applies = previewPage % 2 === 0;
        else if (pageScope === 'custom') {
          const parts = customRange.split(',').map((s) => s.trim());
          applies = parts.some((p) => {
            if (p.includes('-')) {
              const [a, b] = p.split('-').map(Number);
              return previewPage >= a && previewPage <= b;
            }
            if (p.includes('/')) {
              const [a] = p.split('/').map(Number);
              return previewPage === a;
            }
            return Number(p) === previewPage;
          });
        }

        if (scopeDropdown === 'odd' && previewPage % 2 === 0) applies = false;
        if (scopeDropdown === 'even' && previewPage % 2 !== 0) applies = false;

        if (applies && text.trim()) {
          ctx.save();
          const scale = target.width / basePageDims.width;
          const ptPerCm = 28.3465 * scale;
          const xOffset = xOffsetCm * ptPerCm;
          const yOffset = yOffsetCm * ptPerCm;

          let calcSize = fontSize * scale;
          if (proportionOfPages) {
            calcSize = Math.max(12, Math.round((target.width * (proportionPercent / 100)) / Math.max(1, text.length * 0.6)));
          }

          const fontStyle = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${calcSize}px "${fontFamily}", sans-serif`;
          ctx.font = fontStyle;
          ctx.fillStyle = color;
          ctx.globalAlpha = Math.max(0.05, Math.min(1, opacity / 100));
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const rotRad = (rotation * Math.PI) / 180;

          if (tile) {
            const stepX = Math.max(100, tileSpacingXCm * ptPerCm * 2);
            const stepY = Math.max(100, tileSpacingYCm * ptPerCm * 2);
            for (let tx = 0; tx < target.width + 200; tx += stepX) {
              for (let ty = 0; ty < target.height + 200; ty += stepY) {
                ctx.save();
                ctx.translate(tx + xOffset, ty - yOffset);
                ctx.rotate(rotRad);
                ctx.fillText(text, 0, 0);
                if (isUnderline) {
                  const m = ctx.measureText(text);
                  ctx.lineWidth = Math.max(1, calcSize * 0.06);
                  ctx.strokeStyle = color;
                  ctx.beginPath();
                  ctx.moveTo(-m.width / 2, calcSize * 0.55);
                  ctx.lineTo(m.width / 2, calcSize * 0.55);
                  ctx.stroke();
                }
                ctx.restore();
              }
            }
          } else {
            let posX = target.width / 2;
            let posY = target.height / 2;

            if (position.includes('left')) posX = target.width * 0.2;
            else if (position.includes('right')) posX = target.width * 0.8;
            else posX = target.width / 2;

            if (position.includes('top')) posY = target.height * 0.15;
            else if (position.includes('bottom')) posY = target.height * 0.85;
            else posY = target.height / 2;

            posX += xOffset;
            posY -= yOffset;

            ctx.translate(posX, posY);
            ctx.rotate(rotRad);
            ctx.fillText(text, 0, 0);
            if (isUnderline) {
              const m = ctx.measureText(text);
              ctx.lineWidth = Math.max(1, calcSize * 0.06);
              ctx.strokeStyle = color;
              ctx.beginPath();
              ctx.moveTo(-m.width / 2, calcSize * 0.55);
              ctx.lineTo(m.width / 2, calcSize * 0.55);
              ctx.stroke();
            }
          }
          ctx.restore();
        }
      } catch (err) {
        console.error('Failed to render watermark preview:', err);
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
    text,
    fontFamily,
    fontSize,
    color,
    isBold,
    isItalic,
    isUnderline,
    proportionOfPages,
    proportionPercent,
    position,
    xOffsetCm,
    yOffsetCm,
    tile,
    tileSpacingXCm,
    tileSpacingYCm,
    rotation,
    opacity,
    layer,
    pageScope,
    customRange,
    scopeDropdown,
    basePageDims,
    pageRotations,
  ]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({
      enabled: true,
      type: activeTab,
      text,
      fontFamily,
      fontSize,
      color,
      isBold,
      isItalic,
      isUnderline,
      proportionOfPages,
      proportionPercent,
      position,
      xOffsetCm,
      yOffsetCm,
      tile,
      tileSpacingXCm,
      tileSpacingYCm,
      rotation,
      opacity,
      layer,
      pageScope,
      customRange,
    });
    onClose();
  };

  const gridPositions: { id: WatermarkConfig['position']; label: string }[] = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'middle-left', label: 'Middle Left' },
    { id: 'center', label: 'Center' },
    { id: 'middle-right', label: 'Middle Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ];

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs select-none">
      <div className="bg-[#1f232b] text-zinc-100 border border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[820px] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-[#191c23]">
          <h2 className="text-sm font-semibold text-zinc-200">Watermark</h2>
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
                  {/* Tabs */}
                  <div className="flex border-b border-zinc-700">
                    <button
                      type="button"
                      onClick={() => setActiveTab('text')}
                      className={`flex-1 pb-1.5 font-semibold text-center border-b-2 transition-colors ${
                        activeTab === 'text'
                          ? 'border-blue-500 text-blue-400 font-bold'
                          : 'border-transparent text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('file')}
                      className={`flex-1 pb-1.5 font-semibold text-center border-b-2 transition-colors ${
                        activeTab === 'file'
                          ? 'border-blue-500 text-blue-400 font-bold'
                          : 'border-transparent text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      File
                    </button>
                  </div>

                  {activeTab === 'text' ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Content"
                        className="w-full px-2.5 py-1.5 bg-[#14171d] border border-blue-500/80 rounded-md text-zinc-100 text-xs focus:outline-none resize-none font-medium"
                      />

                      {/* Font Family */}
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

                      {/* Font size, Color, Formatting */}
                      <div className="flex items-center gap-2">
                        <select
                          value={fontSize}
                          onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                          className="w-16 px-2 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                        >
                          {[12, 14, 18, 24, 30, 36, 48, 60, 72, 96].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        {/* Color Picker with 'A' and color bar underneath */}
                        <div className="relative flex flex-col items-center justify-center p-1 rounded border border-zinc-700 bg-[#14171d] cursor-pointer hover:border-zinc-500">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            title="Watermark Color"
                          />
                          <span className="text-xs font-bold leading-none">A</span>
                          <span
                            className="w-3.5 h-1 mt-0.5 rounded-xs"
                            style={{ backgroundColor: color }}
                          />
                        </div>

                        {/* Bold, Italic, Underline */}
                        <div className="flex items-center gap-1 border border-zinc-700 rounded p-0.5 bg-[#14171d]">
                          <button
                            type="button"
                            onClick={() => setIsBold(!isBold)}
                            className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                              isBold ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsItalic(!isItalic)}
                            className={`px-1.5 py-0.5 rounded italic font-serif transition-colors ${
                              isItalic ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsUnderline(!isUnderline)}
                            className={`px-1.5 py-0.5 rounded underline transition-colors ${
                              isUnderline ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            U
                          </button>
                        </div>
                      </div>

                      {/* Proportion of pages checkbox & spinner */}
                      <div className="space-y-1 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-zinc-300 font-medium">
                          <input
                            type="checkbox"
                            checked={proportionOfPages}
                            onChange={(e) => setProportionOfPages(e.target.checked)}
                            className="rounded border-zinc-700 text-blue-600 focus:ring-0"
                          />
                          <span>Proportion of pages</span>
                        </label>
                        {proportionOfPages && (
                          <div className="flex items-center gap-1.5 pl-6">
                            <input
                              type="number"
                              min={10}
                              max={100}
                              step={5}
                              value={proportionPercent}
                              onChange={(e) => setProportionPercent(parseInt(e.target.value, 10) || 50)}
                              className="w-20 px-2 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                            />
                            <span className="text-zinc-400">%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-2">
                      <label className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 bg-[#14171d]">
                        <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                        <span className="text-xs text-zinc-300 font-medium">Select Watermark Image / File</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setText(f.name);
                          }}
                        />
                      </label>
                    </div>
                  )}
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
                    {/* 3x3 Grid Box */}
                    <div className="grid grid-cols-3 gap-1 p-1 bg-[#14171d] border border-zinc-700 rounded-md w-24 h-24">
                      {gridPositions.map((gp) => (
                        <button
                          key={gp.id}
                          type="button"
                          onClick={() => setPosition(gp.id)}
                          className={`rounded-xs transition-colors ${
                            position === gp.id
                              ? 'bg-blue-500 shadow-sm'
                              : 'bg-zinc-800 hover:bg-zinc-700'
                          }`}
                          title={gp.label}
                        />
                      ))}
                    </div>

                    {/* Coordinates (cm) */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-zinc-400 font-medium">Y</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={0.1}
                            value={yOffsetCm}
                            onChange={(e) => setYOffsetCm(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                          />
                          <span className="text-[10px] text-zinc-400">cm</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-zinc-400 font-medium">X</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={0.1}
                            value={xOffsetCm}
                            onChange={(e) => setXOffsetCm(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                          />
                          <span className="text-[10px] text-zinc-400">cm</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tile checkbox */}
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300 font-medium">
                      <input
                        type="checkbox"
                        checked={tile}
                        onChange={(e) => setTile(e.target.checked)}
                        className="rounded border-zinc-700 text-blue-600 focus:ring-0"
                      />
                      <span>Tile</span>
                    </label>
                    {tile && (
                      <div className="grid grid-cols-2 gap-2 pl-6">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-400">X Spacing</span>
                          <input
                            type="number"
                            step={0.5}
                            value={tileSpacingXCm}
                            onChange={(e) => setTileSpacingXCm(parseFloat(e.target.value) || 2)}
                            className="w-14 px-1.5 py-0.5 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-400">Y Spacing</span>
                          <input
                            type="number"
                            step={0.5}
                            value={tileSpacingYCm}
                            onChange={(e) => setTileSpacingYCm(parseFloat(e.target.value) || 2)}
                            className="w-14 px-1.5 py-0.5 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Setting Section (Image 2) */}
            <div className="space-y-2 border-b border-zinc-800 pb-3">
              <button
                type="button"
                onClick={() => setSettingOpen(!settingOpen)}
                className="flex items-center justify-between w-full text-zinc-300 font-bold text-xs uppercase tracking-wide hover:text-white"
              >
                <span>Setting</span>
                {settingOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {settingOpen && (
                <div className="space-y-3 pt-1">
                  {/* Rotation buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
                    {[-45, 0, 45].map((deg) => (
                      <label key={deg} className="flex items-center gap-1 cursor-pointer text-zinc-300">
                        <input
                          type="radio"
                          name="rotation"
                          checked={rotation === deg}
                          onChange={() => setRotation(deg)}
                          className="text-blue-600 focus:ring-0"
                        />
                        <span>{deg}°</span>
                      </label>
                    ))}
                    <input
                      type="number"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value, 10) || 0)}
                      className="w-14 px-1.5 py-0.5 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200 text-center font-mono"
                    />
                    <span className="text-zinc-400">°</span>
                  </div>

                  {/* Opacity slider (Image 2) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="flex items-center gap-1 text-[11px] font-medium">
                        <Sliders className="w-3 h-3 text-zinc-400" />
                        <span>Opacity</span>
                      </span>
                      <span className="font-mono text-zinc-400">{opacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={opacity}
                      onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  {/* Layer Order: In front of text vs Behind text */}
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="radio"
                        name="layer"
                        checked={layer === 'front'}
                        onChange={() => setLayer('front')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>In front of text</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="radio"
                        name="layer"
                        checked={layer === 'behind'}
                        onChange={() => setLayer('behind')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>Behind text</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Page Range Section (Image 2) */}
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
                      name="pageScope"
                      checked={pageScope === 'all'}
                      onChange={() => setPageScope('all')}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span>All pages</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="radio"
                        name="pageScope"
                        checked={pageScope === 'custom'}
                        onChange={() => setPageScope('custom')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>Custom</span>
                    </label>
                    <input
                      type="text"
                      value={customRange}
                      onChange={(e) => setCustomRange(e.target.value)}
                      placeholder="1/1 or 1-5"
                      className="flex-1 px-2 py-0.5 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200"
                    />
                    <span title="Format: 1/1, 1-3, 5">
                      <Info className="w-3.5 h-3.5 text-zinc-500" />
                    </span>
                  </div>

                  <select
                    value={scopeDropdown}
                    onChange={(e) => setScopeDropdown(e.target.value as any)}
                    className="w-full px-2 py-1.5 bg-[#14171d] border border-zinc-700 rounded-md text-zinc-200 text-xs"
                  >
                    <option value="all">All Pages</option>
                    <option value="odd">Odd Pages Only</option>
                    <option value="even">Even Pages Only</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right Live Document Page Preview */}
          <div className="flex-1 bg-[#12151b] flex flex-col items-center justify-between p-4 min-h-0 overflow-hidden">
            <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-auto p-2">
              <div className="bg-white shadow-2xl rounded-xs overflow-hidden border border-zinc-300/40 dark:border-zinc-800">
                <canvas ref={previewCanvasRef} className="block max-h-[64vh] object-contain" />
              </div>
            </div>

            {/* Pagination controls at the bottom of preview (Images 1 & 2) */}
            <div className="flex items-center gap-1.5 bg-[#1a1d24] border border-zinc-800 rounded-lg px-3 py-1 shadow-md shrink-0">
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
