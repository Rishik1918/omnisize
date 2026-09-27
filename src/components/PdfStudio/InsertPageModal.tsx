import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FilePlus,
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Plus,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { PdfStudioEngine } from '../../services/pdfStudioEngine';
import { MS_WORD_PAGE_SIZES } from './PdfEditorModal';

interface InsertPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertBlankPage: (position: 'before' | 'after' | 'end', sizeSpecId: string) => void;
  onInsertPdfPages: (file: File, position: 'before' | 'after' | 'start' | 'end', pageRange?: string) => void;
  pdfBufferOrProxy: any;
  totalPages: number;
  currentPage: number;
  basePageDims: { width: number; height: number };
  pageRotations: Record<number, number>;
  initialMode?: 'blank' | 'other-pdf';
}

export const InsertPageModal: React.FC<InsertPageModalProps> = ({
  isOpen,
  onClose,
  onInsertBlankPage,
  onInsertPdfPages,
  pdfBufferOrProxy,
  totalPages,
  currentPage: initialPage,
  basePageDims,
  pageRotations,
  initialMode = 'blank',
}) => {
  const [activeTab, setActiveTab] = useState<'blank' | 'other-pdf'>(initialMode);

  // Blank Page state
  const [blankPosition, setBlankPosition] = useState<'after' | 'before' | 'end'>('after');
  const [blankSizeId, setBlankSizeId] = useState<string>('same');

  // Other PDF state
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [donorTotalPages, setDonorTotalPages] = useState<number>(0);
  const [pdfPosition, setPdfPosition] = useState<'after' | 'before' | 'start' | 'end'>('after');
  const [pdfPageRange, setPdfPageRange] = useState<string>('all');
  const [customDonorRange, setCustomDonorRange] = useState<string>('');

  const [previewPage, setPreviewPage] = useState<number>(initialPage || 1);
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const donorFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load donor PDF metadata when chosen
  useEffect(() => {
    if (!selectedPdfFile) {
      setDonorTotalPages(0);
      return;
    }
    selectedPdfFile.arrayBuffer().then(async (buf) => {
      try {
        const { PDFDocument } = await import('pdf-lib');
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        setDonorTotalPages(doc.getPageCount());
      } catch (err) {
        console.error('Failed to parse donor PDF:', err);
      }
    });
  }, [selectedPdfFile]);

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
      } catch (err) {
        console.error('Failed to render insert page preview:', err);
      }
    };

    renderPreview();
    return () => {
      isMounted = false;
    };
  }, [isOpen, pdfBufferOrProxy, previewPage, pageRotations]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (activeTab === 'blank') {
      onInsertBlankPage(blankPosition, blankSizeId);
      onClose();
    } else if (activeTab === 'other-pdf') {
      if (!selectedPdfFile) {
        alert('Please choose a PDF file to insert pages from.');
        return;
      }
      const range = pdfPageRange === 'all' ? undefined : customDonorRange;
      onInsertPdfPages(selectedPdfFile, pdfPosition, range);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs select-none">
      <div className="bg-[#1f232b] text-zinc-100 border border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[820px] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-[#191c23]">
          <h2 className="text-sm font-semibold text-zinc-200">Insert Pages</h2>
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
            {/* Tab switch: Blank Page vs From Other PDF */}
            <div className="flex border-b border-zinc-700 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('blank')}
                className={`flex-1 pb-1.5 font-semibold text-center border-b-2 transition-colors ${
                  activeTab === 'blank'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Blank Page
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('other-pdf')}
                className={`flex-1 pb-1.5 font-semibold text-center border-b-2 transition-colors ${
                  activeTab === 'other-pdf'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                From Another PDF
              </button>
            </div>

            {activeTab === 'blank' ? (
              <div className="space-y-4">
                {/* Position */}
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Insert Position
                  </div>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setBlankPosition('after')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
                        blankPosition === 'after'
                          ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                          : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span>Insert After Page {initialPage}</span>
                      {blankPosition === 'after' && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlankPosition('before')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
                        blankPosition === 'before'
                          ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                          : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span>Insert Before Page {initialPage}</span>
                      {blankPosition === 'before' && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlankPosition('end')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors ${
                        blankPosition === 'end'
                          ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                          : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span>Insert at End (Page {totalPages + 1})</span>
                      {blankPosition === 'end' && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Page Size Selection */}
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Page Size Specification
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlankSizeId('same')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border mb-2 text-left transition-colors ${
                      blankSizeId === 'same'
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-semibold'
                        : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">Same as Current Page</div>
                      <div className="text-[10px] opacity-75">
                        {Math.round(basePageDims.width)} × {Math.round(basePageDims.height)} pt
                      </div>
                    </div>
                    {blankSizeId === 'same' && <Check className="w-4 h-4 text-blue-400" />}
                  </button>

                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 pt-1">
                    Or MS Word Standard Sizes
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {MS_WORD_PAGE_SIZES.filter((s) => s.id !== 'same').map((spec) => (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => setBlankSizeId(spec.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-colors ${
                          blankSizeId === spec.id
                            ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                            : 'border-zinc-700/60 hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-xs">{spec.name}</div>
                          <div className="text-[10px] text-zinc-400">{spec.description}</div>
                        </div>
                        {blankSizeId === spec.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Choose Source PDF */}
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Source PDF Document
                  </div>
                  <input
                    ref={donorFileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setSelectedPdfFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => donorFileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center p-4 border border-dashed border-zinc-700 rounded-lg hover:border-zinc-500 bg-[#14171d] text-center cursor-pointer transition-colors"
                  >
                    <Upload className="w-6 h-6 text-blue-400 mb-1.5" />
                    <span className="text-xs font-semibold text-zinc-200">
                      {selectedPdfFile ? selectedPdfFile.name : 'Select PDF to Insert Pages From'}
                    </span>
                    {selectedPdfFile && donorTotalPages > 0 && (
                      <span className="text-[10px] text-zinc-400 mt-1">
                        Contains {donorTotalPages} page(s)
                      </span>
                    )}
                  </button>
                </div>

                {/* Target Position */}
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Insert At
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPdfPosition('after')}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        pdfPosition === 'after'
                          ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                          : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      After Page {initialPage}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfPosition('before')}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        pdfPosition === 'before'
                          ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                          : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      Before Page {initialPage}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfPosition('start')}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        pdfPosition === 'start'
                          ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                          : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      At the Beginning
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfPosition('end')}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        pdfPosition === 'end'
                          ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                          : 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      At the End
                    </button>
                  </div>
                </div>

                {/* Source Page Range */}
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Pages to Insert
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input
                        type="radio"
                        name="pdfPageRange"
                        checked={pdfPageRange === 'all'}
                        onChange={() => setPdfPageRange('all')}
                        className="text-blue-600 focus:ring-0"
                      />
                      <span>All pages {donorTotalPages > 0 ? `(1-${donorTotalPages})` : ''}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                        <input
                          type="radio"
                          name="pdfPageRange"
                          checked={pdfPageRange === 'custom'}
                          onChange={() => setPdfPageRange('custom')}
                          className="text-blue-600 focus:ring-0"
                        />
                        <span>Custom pages:</span>
                      </label>
                      <input
                        type="text"
                        value={customDonorRange}
                        onChange={(e) => setCustomDonorRange(e.target.value)}
                        placeholder="e.g. 1-3, 5"
                        disabled={pdfPageRange !== 'custom'}
                        className="flex-1 px-2 py-1 bg-[#14171d] border border-zinc-700 rounded text-xs text-zinc-200 disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
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

        {/* Bottom Bar: Apply, Cancel */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-zinc-800 bg-[#191c23] gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#262a34] hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
};
