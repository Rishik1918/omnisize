import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Type,
  Image as ImageIcon,
  RotateCw,
  Trash2,
  Download,
  ScanText,
  Save,
  Loader2,
  Plus,
  Check,
  AlertCircle
} from 'lucide-react';
import { PdfStudioEngine, TextOverlay, ImageOverlay } from '../../services/pdfStudioEngine';
import { saveFile } from '../../utils/fileSaver';
import { getDocumentProxy } from 'unpdf';
import { PdfOcrModal } from './PdfOcrModal';

interface PdfEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File;
}

export const PdfEditorModal: React.FC<PdfEditorModalProps> = ({ isOpen, onClose, initialFile }) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(initialFile || null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1); // 1-indexed
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  const [activeTool, setActiveTool] = useState<'view' | 'text' | 'image'>('view');

  // Edit operations
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [imageOverlays, setImageOverlays] = useState<ImageOverlay[]>([]);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({}); // pageIndex (0-indexed) -> deg
  const [deletedPages, setDeletedPages] = useState<number[]>([]); // 0-indexed

  // Text tool options
  const [pendingText, setPendingText] = useState<string>('Sample Text');
  const [textSize, setTextSize] = useState<number>(14);
  const [textColor, setTextColor] = useState<string>('#000000');

  // OCR modal trigger
  const [isOcrOpen, setIsOcrOpen] = useState(false);

  // Status & processing
  const [isRendering, setIsRendering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load PDF buffer on file selection
  useEffect(() => {
    if (!file) return;
    file.arrayBuffer().then(async (buf) => {
      setArrayBuffer(buf);
      try {
        const proxy = await getDocumentProxy(new Uint8Array(buf));
        setTotalPages(proxy.numPages);
        setCurrentPage(1);
        setTextOverlays([]);
        setImageOverlays([]);
        setPageRotations({});
        setDeletedPages([]);
      } catch (err: any) {
        setError('Failed to parse PDF: ' + (err?.message || 'Invalid format'));
      }
    });
  }, [file]);

  // Render current page to canvas
  useEffect(() => {
    if (!arrayBuffer || totalPages === 0) return;

    let isMounted = true;
    setIsRendering(true);

    PdfStudioEngine.renderPageToCanvas(arrayBuffer, currentPage, zoomScale)
      .then(({ canvas }) => {
        if (!isMounted || !canvasRef.current) return;
        const targetCanvas = canvasRef.current;
        targetCanvas.width = canvas.width;
        targetCanvas.height = canvas.height;
        const ctx = targetCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0);
        }
      })
      .catch((err) => {
        console.error('Page render error:', err);
      })
      .finally(() => {
        if (isMounted) setIsRendering(false);
      });

    return () => {
      isMounted = false;
    };
  }, [arrayBuffer, currentPage, zoomScale, pageRotations]);

  // Handle clicking on page canvas to place text
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'text' || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert screen coordinates to PDF points
    // PDF coordinates start at bottom-left
    const pdfX = (clickX / rect.width) * (canvasRef.current.width / zoomScale);
    const pdfY = ((rect.height - clickY) / rect.height) * (canvasRef.current.height / zoomScale);

    const newOverlay: TextOverlay = {
      id: Math.random().toString(36).substring(2, 9),
      pageIndex: currentPage - 1,
      text: pendingText || 'Sample Text',
      x: Math.round(pdfX),
      y: Math.round(pdfY),
      size: textSize,
      color: textColor,
    };

    setTextOverlays((prev) => [...prev, newOverlay]);
  };

  // Handle inserting an image / photo / signature
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const imgFile = e.target.files[0];

    try {
      const imgBuffer = await imgFile.arrayBuffer();
      const isPng = imgFile.type === 'image/png' || imgFile.name.toLowerCase().endsWith('.png');

      const newImgOverlay: ImageOverlay = {
        id: Math.random().toString(36).substring(2, 9),
        pageIndex: currentPage - 1,
        imageData: imgBuffer,
        imageType: isPng ? 'png' : 'jpeg',
        x: 72, // default 1 inch from left
        y: 200, // default position
        width: 150,
        height: 150,
      };

      setImageOverlays((prev) => [...prev, newImgOverlay]);
      setActiveTool('view');
    } catch (err: any) {
      setError('Could not process image for PDF: ' + err.message);
    }
  };

  const handleRotateCurrentPage = () => {
    const pageIdx = currentPage - 1;
    setPageRotations((prev) => ({
      ...prev,
      [pageIdx]: ((prev[pageIdx] || 0) + 90) % 360,
    }));
  };

  const handleDeleteCurrentPage = () => {
    if (totalPages <= 1) {
      setError('Cannot delete the only page in the document.');
      return;
    }
    const pageIdx = currentPage - 1;
    setDeletedPages((prev) => [...prev, pageIdx]);
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleSaveDocument = async () => {
    if (!file) return;

    try {
      setIsSaving(true);
      setError(null);

      const editedBlob = await PdfStudioEngine.applyEdits(file, {
        rotations: pageRotations,
        deletedPages,
        textOverlays,
        imageOverlays,
      });

      const baseName = file.name.replace(/\.pdf$/i, '');
      await saveFile(editedBlob, `${baseName}_edited.pdf`);
    } catch (err: any) {
      setError('Failed to save edited PDF: ' + (err?.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const currentPageOverlays = textOverlays.filter((t) => t.pageIndex === currentPage - 1);
  const currentImageOverlays = imageOverlays.filter((img) => img.pageIndex === currentPage - 1);
  const isCurrentPageDeleted = deletedPages.includes(currentPage - 1);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl w-full max-w-5xl h-[94vh] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
          {/* Top Bar: Navigation & Acrobat-grade Actions */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 gap-2">
            {/* Left: Document info & pages */}
            <div className="flex items-center gap-3">
              <span className="font-semibold text-xs truncate max-w-[140px] sm:max-w-[200px]">
                {file ? file.name : 'PDF Studio'}
              </span>

              {totalPages > 0 && (
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] px-1 font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Middle: Editing Tools */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <button
                onClick={() => setActiveTool('view')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'view'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                }`}
                title="Pan and Read"
              >
                <span>Read</span>
              </button>

              <button
                onClick={() => setActiveTool('text')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'text'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                }`}
                title="Add Text Overlay"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Text</span>
              </button>

              <label
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 cursor-pointer shadow-sm"
                title="Insert Photo or Signature"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Add Photo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>

              <button
                onClick={handleRotateCurrentPage}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
                title="Rotate Page 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleDeleteCurrentPage}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 border border-zinc-200 dark:border-zinc-700"
                title="Delete Current Page"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOcrOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-500/20"
                title="Optical Character Recognition (OCR)"
              >
                <ScanText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">OCR</span>
              </button>
            </div>

            {/* Right: Zoom & Save */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 px-1.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
                <button
                  onClick={() => setZoomScale((z) => Math.max(0.75, z - 0.25))}
                  className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="font-mono text-[10px] w-8 text-center">{Math.round(zoomScale * 100)}%</span>
                <button
                  onClick={() => setZoomScale((z) => Math.min(2.5, z + 0.25))}
                  className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={handleSaveDocument}
                disabled={!file || isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm active:scale-95 transition-all"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Secondary Toolbar for Active Tool (e.g., Text Tool) */}
          {activeTool === 'text' && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-amber-500/5 text-xs">
              <span className="font-semibold text-amber-600 dark:text-amber-400">Click on page to place:</span>
              <input
                type="text"
                value={pendingText}
                onChange={(e) => setPendingText(e.target.value)}
                placeholder="Text overlay..."
                className="px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-400">Size:</span>
                <select
                  value={textSize}
                  onChange={(e) => setTextSize(parseInt(e.target.value, 10))}
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px]"
                >
                  <option value={10}>10 pt</option>
                  <option value={12}>12 pt</option>
                  <option value={14}>14 pt</option>
                  <option value={18}>18 pt</option>
                  <option value={24}>24 pt</option>
                  <option value={32}>32 pt</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                {['#000000', '#dc2626', '#2563eb', '#16a34a'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setTextColor(c)}
                    className={`w-4 h-4 rounded-full border ${textColor === c ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main Visual Reader & Canvas Area */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto bg-zinc-200 dark:bg-zinc-950 p-4 flex flex-col items-center justify-start relative select-none"
          >
            {error && (
              <div className="mb-3 flex items-center gap-2 p-2.5 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 max-w-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!file ? (
              <label className="my-auto border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-white dark:bg-zinc-900 shadow-sm">
                <Type className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-3 stroke-1" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Open a PDF Document in Studio</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Read, edit text, add photos, extract OCR, and rotate pages</p>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                  }}
                />
              </label>
            ) : isCurrentPageDeleted ? (
              <div className="my-auto p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                <Trash2 className="w-10 h-10 mx-auto text-red-500 mb-2 stroke-1" />
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">Page {currentPage} is marked for deletion</p>
                <button
                  onClick={() => setDeletedPages((prev) => prev.filter((p) => p !== currentPage - 1))}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-800 text-white text-xs hover:bg-zinc-700"
                >
                  Undo Deletion
                </button>
              </div>
            ) : (
              <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white border border-zinc-300 dark:border-zinc-800">
                {isRendering && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className={`block ${activeTool === 'text' ? 'cursor-crosshair' : 'cursor-default'}`}
                  style={{
                    transform: `rotate(${pageRotations[currentPage - 1] || 0}deg)`,
                    transition: 'transform 0.2s ease',
                  }}
                />

                {/* Overlays Indicator Banner if any on this page */}
                {(currentPageOverlays.length > 0 || currentImageOverlays.length > 0) && (
                  <div className="absolute bottom-2 left-2 z-10 bg-black/75 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full pointer-events-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {currentPageOverlays.length} text edit(s) • {currentImageOverlays.length} photo(s) added
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OCR Modal */}
      {isOcrOpen && file && (
        <PdfOcrModal
          isOpen={isOcrOpen}
          onClose={() => setIsOcrOpen(false)}
          initialFile={file}
        />
      )}
    </>
  );
};
