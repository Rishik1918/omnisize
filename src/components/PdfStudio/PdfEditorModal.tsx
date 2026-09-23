import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Type,
  Edit3,
  Image as ImageIcon,
  RotateCw,
  Trash2,
  ScanText,
  Save,
  Loader2,
  Undo2,
  Redo2,
  Check,
  AlertCircle,
  FileText,
  Sparkles
} from 'lucide-react';
import {
  PdfStudioEngine,
  TextOverlay,
  ImageOverlay,
  ExistingTextItem
} from '../../services/pdfStudioEngine';
import { saveFile } from '../../utils/fileSaver';
import { getDocumentProxy } from 'unpdf';
import { PdfOcrModal } from './PdfOcrModal';

interface PdfEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File;
}

interface EditorSnapshot {
  modifiedTexts: Record<string, ExistingTextItem>;
  textOverlays: TextOverlay[];
  imageOverlays: ImageOverlay[];
  pageRotations: Record<number, number>;
  deletedPages: number[];
}

export const PdfEditorModal: React.FC<PdfEditorModalProps> = ({ isOpen, onClose, initialFile }) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(initialFile || null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1); // 1-indexed
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  const [activeTool, setActiveTool] = useState<'view' | 'edit-text' | 'add-text'>('edit-text');

  // Page dimensions & rendering
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [detectedTextItems, setDetectedTextItems] = useState<ExistingTextItem[]>([]);
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);

  // Edit operations state
  const [modifiedTexts, setModifiedTexts] = useState<Record<string, ExistingTextItem>>({});
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [imageOverlays, setImageOverlays] = useState<ImageOverlay[]>([]);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [deletedPages, setDeletedPages] = useState<number[]>([]);

  // Text overlay tool options
  const [pendingText, setPendingText] = useState<string>('New Text');
  const [textSize, setTextSize] = useState<number>(14);
  const [textColor, setTextColor] = useState<string>('#000000');

  // History stack for Undo / Redo
  const [history, setHistory] = useState<EditorSnapshot[]>([
    {
      modifiedTexts: {},
      textOverlays: [],
      imageOverlays: [],
      pageRotations: {},
      deletedPages: [],
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Modals & UI states
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfProxyRef = useRef<any>(null);

  // Record a snapshot in history
  const pushSnapshot = useCallback(
    (newSnapshot: Partial<EditorSnapshot>) => {
      const fullSnapshot: EditorSnapshot = {
        modifiedTexts: newSnapshot.modifiedTexts ?? modifiedTexts,
        textOverlays: newSnapshot.textOverlays ?? textOverlays,
        imageOverlays: newSnapshot.imageOverlays ?? imageOverlays,
        pageRotations: newSnapshot.pageRotations ?? pageRotations,
        deletedPages: newSnapshot.deletedPages ?? deletedPages,
      };

      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(fullSnapshot);
        return next;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex, modifiedTexts, textOverlays, imageOverlays, pageRotations, deletedPages]
  );

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetState = history[targetIndex];
      setModifiedTexts(targetState.modifiedTexts);
      setTextOverlays(targetState.textOverlays);
      setImageOverlays(targetState.imageOverlays);
      setPageRotations(targetState.pageRotations);
      setDeletedPages(targetState.deletedPages);
      setHistoryIndex(targetIndex);
    }
  }, [historyIndex, history]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetState = history[targetIndex];
      setModifiedTexts(targetState.modifiedTexts);
      setTextOverlays(targetState.textOverlays);
      setImageOverlays(targetState.imageOverlays);
      setPageRotations(targetState.pageRotations);
      setDeletedPages(targetState.deletedPages);
      setHistoryIndex(targetIndex);
    }
  }, [historyIndex, history]);

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!isInput) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (!isInput) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Load PDF buffer on file selection
  useEffect(() => {
    if (!file) return;
    let isMounted = true;

    file.arrayBuffer().then(async (buf) => {
      if (!isMounted) return;
      // Keep a safe clone so the original ArrayBuffer is NEVER detached
      const safeBuf = buf.slice(0);
      setArrayBuffer(safeBuf);

      try {
        const proxy = await getDocumentProxy(new Uint8Array(safeBuf.slice(0)));
        if (!isMounted) return;
        pdfProxyRef.current = proxy;
        setTotalPages(proxy.numPages);
        setCurrentPage(1);
        setModifiedTexts({});
        setTextOverlays([]);
        setImageOverlays([]);
        setPageRotations({});
        setDeletedPages([]);
        setHistory([
          {
            modifiedTexts: {},
            textOverlays: [],
            imageOverlays: [],
            pageRotations: {},
            deletedPages: [],
          },
        ]);
        setHistoryIndex(0);
      } catch (err: any) {
        if (isMounted) setError('Failed to parse PDF: ' + (err?.message || 'Invalid format'));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [file]);

  // Render current page to canvas and extract text items
  useEffect(() => {
    if ((!pdfProxyRef.current && !arrayBuffer) || totalPages === 0) return;

    let isMounted = true;
    setIsRendering(true);
    setError(null);

    const proxyOrBuf = pdfProxyRef.current || arrayBuffer;

    PdfStudioEngine.renderPageToCanvas(proxyOrBuf, currentPage, zoomScale)
      .then(async ({ canvas, width, height }) => {
        if (!isMounted || !canvasRef.current) return;
        const targetCanvas = canvasRef.current;
        targetCanvas.width = canvas.width;
        targetCanvas.height = canvas.height;
        const ctx = targetCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0);
        }
        setViewportDims({ width: canvas.width, height: canvas.height });

        // Extract selectable text elements for the current page
        try {
          const textItems = await PdfStudioEngine.extractPageTextItems(proxyOrBuf, currentPage);
          if (isMounted) {
            setDetectedTextItems(textItems);
          }
        } catch (textErr) {
          console.warn('Text extraction warning:', textErr);
        }
      })
      .catch((err) => {
        console.error('Page render error:', err);
        if (isMounted) setError('Rendering page failed: ' + (err?.message || 'Unknown error'));
      })
      .finally(() => {
        if (isMounted) setIsRendering(false);
      });

    return () => {
      isMounted = false;
    };
  }, [arrayBuffer, currentPage, zoomScale, pageRotations, totalPages]);

  // Handle clicking on page canvas to place new text overlay
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'add-text' || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pdfX = (clickX / rect.width) * (canvasRef.current.width / zoomScale);
    const pdfY = ((rect.height - clickY) / rect.height) * (canvasRef.current.height / zoomScale);

    const newOverlay: TextOverlay = {
      id: Math.random().toString(36).substring(2, 9),
      pageIndex: currentPage - 1,
      text: pendingText || 'New Text',
      x: Math.round(pdfX),
      y: Math.round(pdfY),
      size: textSize,
      color: textColor,
    };

    const nextOverlays = [...textOverlays, newOverlay];
    setTextOverlays(nextOverlays);
    pushSnapshot({ textOverlays: nextOverlays });
  };

  // Handle modifying existing text
  const handleExistingTextChange = (item: ExistingTextItem, newText: string) => {
    const updatedItem: ExistingTextItem = {
      ...item,
      currentText: newText,
      isModified: newText !== item.originalText,
    };

    const nextModified = {
      ...modifiedTexts,
      [item.id]: updatedItem,
    };

    setModifiedTexts(nextModified);
  };

  const handleFinishExistingTextEdit = () => {
    setActiveEditingId(null);
    pushSnapshot({ modifiedTexts });
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
        x: 72,
        y: 200,
        width: 150,
        height: 150,
      };

      const nextImages = [...imageOverlays, newImgOverlay];
      setImageOverlays(nextImages);
      pushSnapshot({ imageOverlays: nextImages });
      setActiveTool('view');
    } catch (err: any) {
      setError('Could not process image for PDF: ' + err.message);
    }
  };

  const handleRotateCurrentPage = () => {
    const pageIdx = currentPage - 1;
    const nextRotations = {
      ...pageRotations,
      [pageIdx]: ((pageRotations[pageIdx] || 0) + 90) % 360,
    };
    setPageRotations(nextRotations);
    pushSnapshot({ pageRotations: nextRotations });
  };

  const handleDeleteCurrentPage = () => {
    if (totalPages <= 1) {
      setError('Cannot delete the only page in the document.');
      return;
    }
    const pageIdx = currentPage - 1;
    const nextDeleted = [...deletedPages, pageIdx];
    setDeletedPages(nextDeleted);
    pushSnapshot({ deletedPages: nextDeleted });
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleSaveDocument = async () => {
    if (!file) return;

    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const textReplacements = Object.values(modifiedTexts).filter(
        (t) => t.isModified && t.currentText !== t.originalText
      );

      const editedBlob = await PdfStudioEngine.applyEdits(file, {
        rotations: pageRotations,
        deletedPages,
        textOverlays,
        imageOverlays,
        textReplacements,
      });

      const baseName = file.name.replace(/\.pdf$/i, '');
      const saveRes = await saveFile(editedBlob, `${baseName}_edited.pdf`);
      if (saveRes.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      setError('Failed to save edited PDF: ' + (err?.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const currentPageOverlays = textOverlays.filter((t) => t.pageIndex === currentPage - 1);
  const currentImageOverlays = imageOverlays.filter((img) => img.pageIndex === currentPage - 1);
  const isCurrentPageDeleted = deletedPages.includes(currentPage - 1);

  // Compute total modifications for badge
  const modifiedTextCount = Object.values(modifiedTexts).filter(
    (t) => t.isModified && t.currentText !== t.originalText
  ).length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 rounded-2xl w-full max-w-5xl h-[95vh] sm:h-[92vh] border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
          {/* Top Bar: Clean Adobe Acrobat / iLovePDF Header */}
          <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 gap-2">
            {/* Left: Document info & pages */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-xs sm:text-sm truncate max-w-[110px] sm:max-w-[200px]">
                  {file ? file.name : 'PDF Studio'}
                </span>
              </div>

              {totalPages > 0 && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] px-1 font-medium text-slate-700 dark:text-zinc-300">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Undo / Redo Buttons */}
              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1 rounded text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1 rounded text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Middle: Editing Tools Segment */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5">
              <button
                onClick={() => setActiveTool('edit-text')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'edit-text'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
                }`}
                title="Click any existing text on the page to edit in place"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit Text</span>
              </button>

              <button
                onClick={() => setActiveTool('add-text')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'add-text'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
                }`}
                title="Add new text overlay"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Text</span>
              </button>

              <label
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 cursor-pointer shadow-xs"
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
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700"
                title="Rotate Page 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleDeleteCurrentPage}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-zinc-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-zinc-700"
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
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs">
                <button
                  onClick={() => setZoomScale((z) => Math.max(0.75, z - 0.25))}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="font-mono text-[10px] w-8 text-center">{Math.round(zoomScale * 100)}%</span>
                <button
                  onClick={() => setZoomScale((z) => Math.min(2.5, z + 0.25))}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={handleSaveDocument}
                disabled={!file || isSaving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs shadow-xs active:scale-95 transition-all"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saveSuccess ? 'Saved!' : 'Save PDF'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Secondary Notification / Instruction Bar */}
          {activeTool === 'edit-text' && (
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-200 dark:border-zinc-800 bg-emerald-50 dark:bg-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  <strong>Interactive Text Editing:</strong> Click any word or line on the page to edit directly.
                </span>
              </span>
              {modifiedTextCount > 0 && (
                <span className="text-[11px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  {modifiedTextCount} edit(s) made
                </span>
              )}
            </div>
          )}

          {activeTool === 'add-text' && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-1.5 border-b border-slate-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Click page to place:</span>
              <input
                type="text"
                value={pendingText}
                onChange={(e) => setPendingText(e.target.value)}
                placeholder="Text overlay..."
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Size:</span>
                <select
                  value={textSize}
                  onChange={(e) => setTextSize(parseInt(e.target.value, 10))}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px]"
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
            className="flex-1 overflow-auto bg-slate-100 dark:bg-zinc-950 p-3 sm:p-6 flex flex-col items-center justify-start relative select-none"
          >
            {error && (
              <div className="mb-3 flex items-center gap-2 p-2.5 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 max-w-md shadow-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!file ? (
              <label className="my-auto border-2 border-dashed border-slate-300 dark:border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-white dark:bg-zinc-900 shadow-sm">
                <FileText className="w-12 h-12 text-slate-400 dark:text-zinc-600 mb-3 stroke-1" />
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Open a PDF Document in Studio</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Read, edit text, add photos, extract OCR, and rotate pages</p>
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
                  onClick={() => {
                    const nextDeleted = deletedPages.filter((p) => p !== currentPage - 1);
                    setDeletedPages(nextDeleted);
                    pushSnapshot({ deletedPages: nextDeleted });
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-800 text-white text-xs hover:bg-zinc-700"
                >
                  Undo Deletion
                </button>
              </div>
            ) : (
              <div
                className="relative shadow-2xl rounded-sm overflow-hidden bg-white border border-slate-300 dark:border-zinc-800 ring-1 ring-slate-900/5"
                style={{
                  width: viewportDims.width > 0 ? `${viewportDims.width}px` : 'auto',
                  height: viewportDims.height > 0 ? `${viewportDims.height}px` : 'auto',
                  transform: `rotate(${pageRotations[currentPage - 1] || 0}deg)`,
                  transition: 'transform 0.2s ease',
                }}
              >
                {isRendering && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className={`block ${activeTool === 'add-text' ? 'cursor-crosshair' : 'cursor-default'}`}
                />

                {/* Interactive Text Layer: Overlays bounding boxes on existing text */}
                {activeTool === 'edit-text' && canvasRef.current && viewportDims.width > 0 && (
                  <div className="absolute inset-0 pointer-events-auto z-10">
                    {detectedTextItems.map((item) => {
                      const modifiedItem = modifiedTexts[item.id] || item;
                      const isBeingEdited = activeEditingId === item.id;

                      // Exact PDF coordinate to screen coordinate mapping
                      const scale = zoomScale;
                      const pdfWidth = canvasRef.current!.width / scale;
                      const pdfHeight = canvasRef.current!.height / scale;

                      const screenX = (item.x / pdfWidth) * canvasRef.current!.width;
                      const screenY = (1 - (item.y + item.height) / pdfHeight) * canvasRef.current!.height;
                      const screenW = Math.max(16, (item.width / pdfWidth) * canvasRef.current!.width);
                      const screenH = Math.max(14, (item.height / pdfHeight) * canvasRef.current!.height * 1.3);

                      return (
                        <div
                          key={item.id}
                          style={{
                            position: 'absolute',
                            left: `${screenX}px`,
                            top: `${screenY}px`,
                            minWidth: `${screenW}px`,
                            height: `${screenH}px`,
                          }}
                          className={`group cursor-text transition-all ${
                            modifiedItem.isModified
                              ? 'bg-amber-100/90 dark:bg-amber-900/80 border border-amber-500 rounded-xs'
                              : 'hover:bg-emerald-500/20 hover:ring-1 hover:ring-emerald-500/50 rounded-xs'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEditingId(item.id);
                          }}
                        >
                          {isBeingEdited ? (
                            <input
                              type="text"
                              autoFocus
                              value={modifiedItem.currentText}
                              onChange={(e) => handleExistingTextChange(item, e.target.value)}
                              onBlur={handleFinishExistingTextEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleFinishExistingTextEdit();
                              }}
                              className="w-full h-full bg-white dark:bg-zinc-800 text-black dark:text-white px-1 font-sans text-xs border border-emerald-500 outline-none rounded-xs shadow-md"
                              style={{
                                fontSize: `${Math.max(10, item.fontSize * zoomScale * 0.9)}px`,
                              }}
                            />
                          ) : modifiedItem.isModified ? (
                            <div
                              className="w-full h-full flex items-center bg-white px-1 text-black font-sans truncate shadow-xs"
                              style={{
                                fontSize: `${Math.max(10, item.fontSize * zoomScale * 0.9)}px`,
                              }}
                            >
                              {modifiedItem.currentText}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Overlays Indicator Banner */}
                {(currentPageOverlays.length > 0 || currentImageOverlays.length > 0 || modifiedTextCount > 0) && (
                  <div className="absolute bottom-2 left-2 z-20 bg-slate-900/85 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full pointer-events-none flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {modifiedTextCount > 0 && `${modifiedTextCount} text line(s) edited • `}
                      {currentPageOverlays.length > 0 && `${currentPageOverlays.length} new text(s) • `}
                      {currentImageOverlays.length > 0 && `${currentImageOverlays.length} photo(s) added`}
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
