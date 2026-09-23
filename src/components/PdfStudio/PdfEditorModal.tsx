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
  Printer,
  Link as LinkIcon,
  Plus,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  PanelLeftClose,
  PanelLeft,
  ExternalLink,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import {
  PdfStudioEngine,
  TextOverlay,
  ImageOverlay,
  ExistingTextItem,
  HyperlinkOverlay,
  InsertBlankPageSpec
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
  hyperlinks: HyperlinkOverlay[];
  pageRotations: Record<number, number>;
  deletedPages: number[];
  insertedBlankPages: InsertBlankPageSpec[];
}

export const MS_WORD_FONTS = [
  'Calibri',
  'Calibri Light',
  'Arial',
  'Arial Black',
  'Times New Roman',
  'Georgia',
  'Cambria',
  'Garamond',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Segoe UI',
  'Century Gothic',
  'Book Antiqua',
  'Palatino Linotype',
  'Comic Sans MS',
  'Courier New',
  'Consolas',
  'Impact',
  'Franklin Gothic Medium',
  'Lucida Sans',
  'Lucida Console',
  'Baskerville',
  'Rockwell',
  'Constantia',
  'Corbel',
  'Candara',
];

export const PdfEditorModal: React.FC<PdfEditorModalProps> = ({ isOpen, onClose, initialFile }) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(initialFile || null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1); // 1-indexed
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [activeTool, setActiveTool] = useState<
    'view' | 'edit-text' | 'add-text' | 'add-link' | 'add-image'
  >('edit-text');

  // Auto-Save feature
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('omnisize_autosave') === 'true';
    } catch {
      return false;
    }
  });

  // Close Confirmation Modal
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState<boolean>(false);

  // Sidebar & Layout
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [detectedTextItems, setDetectedTextItems] = useState<ExistingTextItem[]>([]);
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // Edit operations state
  const [modifiedTexts, setModifiedTexts] = useState<Record<string, ExistingTextItem>>({});
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [imageOverlays, setImageOverlays] = useState<ImageOverlay[]>([]);
  const [hyperlinks, setHyperlinks] = useState<HyperlinkOverlay[]>([]);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [deletedPages, setDeletedPages] = useState<number[]>([]);
  const [insertedBlankPages, setInsertedBlankPages] = useState<InsertBlankPageSpec[]>([]);

  // Text formatting options (for Add Text mode) - All MS Word fonts supported
  const [textValue, setTextValue] = useState<string>('Sample Text');
  const [fontFamily, setFontFamily] = useState<string>('Calibri');
  const [fontSize, setFontSize] = useState<number>(14);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [textColor, setTextColor] = useState<string>('#000000');

  // Link tool state
  const [pendingUrl, setPendingUrl] = useState<string>('https://');

  // History stack for Undo / Redo
  const [history, setHistory] = useState<EditorSnapshot[]>([
    {
      modifiedTexts: {},
      textOverlays: [],
      imageOverlays: [],
      hyperlinks: [],
      pageRotations: {},
      deletedPages: [],
      insertedBlankPages: [],
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Modals & UI states
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfProxyRef = useRef<any>(null);

  // Check if document has unsaved edits
  const hasUnsavedEdits =
    Object.keys(modifiedTexts).length > 0 ||
    textOverlays.length > 0 ||
    imageOverlays.length > 0 ||
    hyperlinks.length > 0 ||
    Object.keys(pageRotations).length > 0 ||
    deletedPages.length > 0 ||
    insertedBlankPages.length > 0;

  // Toggle Auto-Save
  const toggleAutoSave = () => {
    const nextVal = !autoSaveEnabled;
    setAutoSaveEnabled(nextVal);
    try {
      localStorage.setItem('omnisize_autosave', String(nextVal));
    } catch {}
  };

  // Push snapshot into history
  const pushSnapshot = useCallback(
    (newSnapshot: Partial<EditorSnapshot>) => {
      const fullSnapshot: EditorSnapshot = {
        modifiedTexts: newSnapshot.modifiedTexts ?? modifiedTexts,
        textOverlays: newSnapshot.textOverlays ?? textOverlays,
        imageOverlays: newSnapshot.imageOverlays ?? imageOverlays,
        hyperlinks: newSnapshot.hyperlinks ?? hyperlinks,
        pageRotations: newSnapshot.pageRotations ?? pageRotations,
        deletedPages: newSnapshot.deletedPages ?? deletedPages,
        insertedBlankPages: newSnapshot.insertedBlankPages ?? insertedBlankPages,
      };

      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(fullSnapshot);
        return next;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [
      historyIndex,
      modifiedTexts,
      textOverlays,
      imageOverlays,
      hyperlinks,
      pageRotations,
      deletedPages,
      insertedBlankPages,
    ]
  );

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetState = history[targetIndex];
      setModifiedTexts(targetState.modifiedTexts);
      setTextOverlays(targetState.textOverlays);
      setImageOverlays(targetState.imageOverlays);
      setHyperlinks(targetState.hyperlinks);
      setPageRotations(targetState.pageRotations);
      setDeletedPages(targetState.deletedPages);
      setInsertedBlankPages(targetState.insertedBlankPages);
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
      setHyperlinks(targetState.hyperlinks);
      setPageRotations(targetState.pageRotations);
      setDeletedPages(targetState.deletedPages);
      setInsertedBlankPages(targetState.insertedBlankPages);
      setHistoryIndex(targetIndex);
    }
  }, [historyIndex, history]);

  // Load PDF buffer on file selection
  useEffect(() => {
    if (!file) return;
    let isMounted = true;

    file.arrayBuffer().then(async (buf) => {
      if (!isMounted) return;
      const safeBuf = buf.slice(0);
      setArrayBuffer(safeBuf);

      try {
        const proxy = await getDocumentProxy(new Uint8Array(safeBuf.slice(0)));
        if (!isMounted) return;
        pdfProxyRef.current = proxy;
        setTotalPages(proxy.numPages);
        setCurrentPage(1);

        // Auto-scale to fit width on initial load (crucial for mobile phones)
        if (containerRef.current) {
          const containerW = containerRef.current.clientWidth;
          const firstPage = await proxy.getPage(1);
          const firstViewport = firstPage.getViewport({ scale: 1.0 });
          const padding = window.innerWidth < 640 ? 24 : 64;
          const optimalScale = Math.min(2.0, Math.max(0.4, (containerW - padding) / firstViewport.width));
          setZoomScale(Number(optimalScale.toFixed(2)));
        }

        setModifiedTexts({});
        setTextOverlays([]);
        setImageOverlays([]);
        setHyperlinks([]);
        setPageRotations({});
        setDeletedPages([]);
        setInsertedBlankPages([]);
        setHistory([
          {
            modifiedTexts: {},
            textOverlays: [],
            imageOverlays: [],
            hyperlinks: [],
            pageRotations: {},
            deletedPages: [],
            insertedBlankPages: [],
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

  // Render current page to canvas with high-DPI supersampling
  useEffect(() => {
    if ((!pdfProxyRef.current && !arrayBuffer) || totalPages === 0) return;

    let isMounted = true;
    setIsRendering(true);
    setError(null);

    const proxyOrBuf = pdfProxyRef.current || arrayBuffer;

    PdfStudioEngine.renderPageToCanvas(proxyOrBuf, currentPage, zoomScale)
      .then(async ({ canvas, cssWidth, cssHeight }) => {
        if (!isMounted || !canvasRef.current) return;
        const targetCanvas = canvasRef.current;
        targetCanvas.width = canvas.width;
        targetCanvas.height = canvas.height;
        targetCanvas.style.width = `${Math.round(cssWidth)}px`;
        targetCanvas.style.height = `${Math.round(cssHeight)}px`;

        const ctx = targetCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0);
        }
        setViewportDims({ width: cssWidth, height: cssHeight });

        // Extract selectable text elements for the current page
        try {
          const textItems = await PdfStudioEngine.extractPageTextItems(proxyOrBuf, currentPage);
          if (isMounted) {
            setDetectedTextItems(textItems);
          }
        } catch (e) {
          console.warn('Text item extraction warning:', e);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError('Failed to render page: ' + (err?.message || 'Render error'));
        }
      })
      .finally(() => {
        if (isMounted) setIsRendering(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentPage, zoomScale, arrayBuffer, totalPages]);

  // Save PDF Document
  const handleSave = async (): Promise<boolean> => {
    if (!file) return false;
    try {
      setIsSaving(true);
      setError(null);

      const editedBlob = await PdfStudioEngine.applyEdits(file, {
        rotations: pageRotations,
        deletedPages,
        insertedBlankPages,
        textOverlays,
        imageOverlays,
        textReplacements: Object.values(modifiedTexts),
        hyperlinks,
      });

      const baseName = file.name.replace(/\.pdf$/i, '');
      await saveFile(editedBlob, `${baseName}_edited.pdf`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to save PDF.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Close Request handler (checks for unsaved edits & autosave)
  const handleRequestClose = async () => {
    if (autoSaveEnabled && hasUnsavedEdits) {
      await handleSave();
      onClose();
      return;
    }
    if (hasUnsavedEdits) {
      setShowCloseConfirmModal(true);
      return;
    }
    onClose();
  };

  // Fit Width calculation
  const handleFitWidth = () => {
    if (!containerRef.current || viewportDims.width === 0) return;
    const padding = window.innerWidth < 640 ? 24 : 64;
    const containerW = containerRef.current.clientWidth - padding;
    const baseW = viewportDims.width / zoomScale;
    const newScale = Math.min(3.5, Math.max(0.3, containerW / baseW));
    setZoomScale(Number(newScale.toFixed(2)));
  };

  // Fit Page calculation
  const handleFitPage = () => {
    if (!containerRef.current || viewportDims.height === 0) return;
    const padding = window.innerWidth < 640 ? 32 : 64;
    const containerH = containerRef.current.clientHeight - padding;
    const baseH = viewportDims.height / zoomScale;
    const newScale = Math.min(3.0, Math.max(0.3, containerH / baseH));
    setZoomScale(Number(newScale.toFixed(2)));
  };

  // Insert Blank Page
  const handleInsertBlankPage = (position: 'after' | 'before' | 'end') => {
    let insertAfterIndex = currentPage - 1;
    if (position === 'before') insertAfterIndex = currentPage - 2;
    if (position === 'end') insertAfterIndex = totalPages - 1;

    const newInsert: InsertBlankPageSpec = {
      insertAfterIndex,
      width: 595.28,
      height: 841.89,
    };
    const nextInserts = [...insertedBlankPages, newInsert];
    setInsertedBlankPages(nextInserts);
    setTotalPages((prev) => prev + 1);
    pushSnapshot({ insertedBlankPages: nextInserts });
  };

  // Delete Page
  const handleDeleteCurrentPage = () => {
    if (totalPages <= 1) {
      setError('Cannot delete the only page in the document.');
      return;
    }
    const pageIndex = currentPage - 1;
    const nextDeleted = [...deletedPages, pageIndex];
    setDeletedPages(nextDeleted);
    pushSnapshot({ deletedPages: nextDeleted });

    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  // Rotate Page
  const handleRotatePage = () => {
    const pageIndex = currentPage - 1;
    const currentDeg = pageRotations[pageIndex] || 0;
    const nextDeg = (currentDeg + 90) % 360;
    const nextRotations = { ...pageRotations, [pageIndex]: nextDeg };
    setPageRotations(nextRotations);
    pushSnapshot({ pageRotations: nextRotations });
  };

  // Click on Canvas to Add Text or Hyperlink
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 0 || clickY < 0 || clickX > rect.width || clickY > rect.height) return;

    // Convert CSS click coordinates to PDF points (origin at bottom-left)
    const scaleFactor = zoomScale;
    const pdfX = clickX / scaleFactor;
    const pdfY = (rect.height - clickY) / scaleFactor;
    const pageIndex = currentPage - 1;

    if (activeTool === 'add-text') {
      const newOverlay: TextOverlay = {
        id: `txt_overlay_${Date.now()}`,
        pageIndex,
        text: textValue || 'Sample Text',
        x: pdfX,
        y: pdfY,
        size: fontSize,
        color: textColor,
        fontFamily,
        isBold,
        isItalic,
        isUnderline,
        alignment,
      };
      const nextOverlays = [...textOverlays, newOverlay];
      setTextOverlays(nextOverlays);
      setSelectedOverlayId(newOverlay.id);
      pushSnapshot({ textOverlays: nextOverlays });
    } else if (activeTool === 'add-link') {
      const linkUrl = prompt('Enter Destination URL for Hyperlink:', pendingUrl || 'https://');
      if (linkUrl && linkUrl.trim()) {
        const newLink: HyperlinkOverlay = {
          id: `link_${Date.now()}`,
          pageIndex,
          url: linkUrl.trim(),
          x: pdfX,
          y: pdfY - 14,
          width: 140,
          height: 18,
        };
        const nextLinks = [...hyperlinks, newLink];
        setHyperlinks(nextLinks);
        setSelectedOverlayId(newLink.id);
        pushSnapshot({ hyperlinks: nextLinks });
      }
    }
  };

  // Add Photo / Image Overlay
  const handleAddPhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      const isPng = imgFile.type === 'image/png';
      imgFile.arrayBuffer().then((buf) => {
        const newImg: ImageOverlay = {
          id: `img_${Date.now()}`,
          pageIndex: currentPage - 1,
          imageData: buf,
          imageType: isPng ? 'png' : 'jpeg',
          x: 50,
          y: 50,
          width: 150,
          height: 100,
        };
        const nextImages = [...imageOverlays, newImg];
        setImageOverlays(nextImages);
        setSelectedOverlayId(newImg.id);
        pushSnapshot({ imageOverlays: nextImages });
      });
    }
  };

  // Native Print PDF
  const handlePrint = async () => {
    if (!file) return;
    try {
      setIsPrinting(true);
      const editedBlob = await PdfStudioEngine.applyEdits(file, {
        rotations: pageRotations,
        deletedPages,
        insertedBlankPages,
        textOverlays,
        imageOverlays,
        textReplacements: Object.values(modifiedTexts),
        hyperlinks,
      });

      const blobUrl = URL.createObjectURL(editedBlob);
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.src = blobUrl;
      document.body.appendChild(printIframe);

      printIframe.onload = () => {
        setTimeout(() => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
          } catch (e) {
            window.print();
          }
          setTimeout(() => {
            document.body.removeChild(printIframe);
            URL.revokeObjectURL(blobUrl);
          }, 60000);
        }, 400);
      };
    } catch (err: any) {
      setError(err?.message || 'Print preview failed.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Wheel listener on central area
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoomScale((prev) => Math.min(4.0, Math.max(0.25, Number((prev + delta).toFixed(2)))));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-zinc-950 flex flex-col w-screen h-screen select-none animate-fade-in overflow-hidden">
      {/* TIER 1: Primary Header Bar (ALWAYS fully visible on Android & Desktop) */}
      <header className="px-3 sm:px-5 py-2 sm:py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-30 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Prominent Always-Visible Exit/Close Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRequestClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all shadow-xs active:scale-95 border border-zinc-200 dark:border-zinc-700"
              title="Close Document & Return"
            >
              <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              <span>Close</span>
            </button>

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="hidden sm:flex p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              title="Toggle Thumbnails Panel"
            >
              {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Center: File Title & Page Stepper */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[260px]">
              {file?.name || 'Untitled Document.pdf'}
            </span>
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700/60 text-xs flex-shrink-0">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded disabled:opacity-30"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 font-mono text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded disabled:opacity-30"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Auto-Save Toggle & Save PDF Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Auto-Save Toggle Button */}
            <button
              onClick={toggleAutoSave}
              className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                autoSaveEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500'
              }`}
              title="Automatically save changes on close or edits"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  autoSaveEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                }`}
              />
              <span className="hidden xs:inline">Auto-Save:</span>
              <span>{autoSaveEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm active:scale-95 ${
                saveSuccess ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
              title="Save Edited PDF to Device"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saveSuccess ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* TIER 2: Scrollable Mobile & Desktop Tools Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs flex-shrink-0">
        <button
          onClick={() => setActiveTool('edit-text')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTool === 'edit-text'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Text</span>
        </button>

        <button
          onClick={() => setActiveTool('add-text')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTool === 'add-text'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Add Text</span>
        </button>

        <button
          onClick={() => setActiveTool('add-link')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTool === 'add-link'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Hyperlink</span>
        </button>

        <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
          <input type="file" accept="image/*" onChange={handleAddPhotoInput} className="hidden" />
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Add Photo</span>
        </label>

        <button
          onClick={() => handleInsertBlankPage('after')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700"
          title="Insert Blank Page"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Blank Page</span>
        </button>

        <button
          onClick={handleRotatePage}
          className="p-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex-shrink-0"
          title="Rotate Page"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDeleteCurrentPage}
          className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex-shrink-0"
          title="Delete Page"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setIsOcrOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25 hover:bg-purple-500/20"
        >
          <ScanText className="w-3.5 h-3.5" />
          <span>OCR Engine</span>
        </button>

        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 flex-shrink-0 mx-1" />

        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="p-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 flex-shrink-0"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          className="p-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 flex-shrink-0"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex-shrink-0"
          title="Print (Ctrl+P)"
        >
          {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
          <span>Print</span>
        </button>
      </div>

      {/* TIER 3: Rich MS Word Font Selection & Styling Bar (When 'Add Text' is Active) */}
      {activeTool === 'add-text' && (
        <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-50/50 dark:bg-zinc-900 border-b border-emerald-500/20 text-xs z-20 flex-shrink-0 animate-fade-in overflow-x-auto no-scrollbar">
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Type text to place..."
            className="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs w-36 sm:w-52 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          {/* Full MS Word Fonts Dropdown */}
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {MS_WORD_FONTS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>

          {/* Size Stepper */}
          <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md">
            <button
              onClick={() => setFontSize((s) => Math.max(8, s - 1))}
              className="px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold"
            >
              -
            </button>
            <span className="px-1.5 text-xs font-mono font-semibold">{fontSize}pt</span>
            <button
              onClick={() => setFontSize((s) => Math.min(72, s + 1))}
              className="px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold"
            >
              +
            </button>
          </div>

          {/* Bold, Italic, Underline */}
          <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md">
            <button
              onClick={() => setIsBold(!isBold)}
              className={`p-1.5 transition-colors ${
                isBold ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold' : ''
              }`}
              title="Bold"
            >
              <Bold className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsItalic(!isItalic)}
              className={`p-1.5 transition-colors ${
                isItalic ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold' : ''
              }`}
              title="Italic"
            >
              <Italic className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsUnderline(!isUnderline)}
              className={`p-1.5 transition-colors ${
                isUnderline ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold' : ''
              }`}
              title="Underline"
            >
              <Underline className="w-3 h-3" />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md">
            <button
              onClick={() => setAlignment('left')}
              className={`p-1.5 ${alignment === 'left' ? 'text-emerald-600 bg-emerald-500/15' : ''}`}
            >
              <AlignLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => setAlignment('center')}
              className={`p-1.5 ${alignment === 'center' ? 'text-emerald-600 bg-emerald-500/15' : ''}`}
            >
              <AlignCenter className="w-3 h-3" />
            </button>
            <button
              onClick={() => setAlignment('right')}
              className={`p-1.5 ${alignment === 'right' ? 'text-emerald-600 bg-emerald-500/15' : ''}`}
            >
              <AlignRight className="w-3 h-3" />
            </button>
          </div>

          {/* Color Picker */}
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border border-zinc-300 dark:border-zinc-700 bg-transparent p-0"
            title="Text Color"
          />

          <span className="text-[11px] text-zinc-500 italic ml-auto hidden lg:inline">
            Tap anywhere on page to place text
          </span>
        </div>
      )}

      {/* Main Workspace Body: Sidebar + Scrollable Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Thumbnail Sidebar */}
        {showSidebar && totalPages > 0 && (
          <aside className="w-44 sm:w-52 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-20 flex-shrink-0 animate-fade-in shadow-xs">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <span>Pages ({totalPages})</span>
              <button
                onClick={() => handleInsertBlankPage('end')}
                className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Plus className="w-3 h-3" />
                <span>Add Blank</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {Array.from({ length: totalPages }, (_, idx) => {
                const pageNum = idx + 1;
                const isSelected = pageNum === currentPage;
                return (
                  <div
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`group cursor-pointer rounded-xl p-2 border transition-all flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/40'
                    }`}
                  >
                    <div className="w-20 h-28 bg-white rounded shadow-xs border border-zinc-300/80 flex items-center justify-center text-zinc-400 font-mono text-[11px] overflow-hidden relative">
                      <div className="absolute top-1 left-1 text-[9px] font-bold text-zinc-400">{pageNum}</div>
                      <FileText className="w-7 h-7 text-zinc-300" />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Page {pageNum}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Central Viewport Area */}
        <main
          ref={containerRef}
          onWheel={handleWheel}
          className="flex-1 overflow-auto bg-slate-200/70 dark:bg-zinc-950 p-3 sm:p-8 flex flex-col items-center relative"
        >
          {error && (
            <div className="mb-4 max-w-xl w-full flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Active Canvas Page Frame with High-DPI Resolution */}
          <div
            onClick={handleCanvasClick}
            className="relative bg-white shadow-2xl rounded-xs border border-zinc-300/70 dark:border-zinc-800 transition-all select-none"
            style={{
              width: viewportDims.width || 400,
              height: viewportDims.height || 600,
              cursor: activeTool === 'add-text' ? 'crosshair' : activeTool === 'add-link' ? 'pointer' : 'default',
            }}
          >
            {/* High-DPI Supersampled Canvas (Razor-Sharp) */}
            <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />

            {/* In-Place Interactive Existing Text Bounding Boxes (Edit Text Mode) */}
            {activeTool === 'edit-text' &&
              detectedTextItems.map((item) => {
                const currentTextVal = modifiedTexts[item.id]?.currentText ?? item.originalText;
                const isItemModified = modifiedTexts[item.id]?.isModified;
                const isEditing = activeEditingId === item.id;

                const scale = zoomScale;
                const cssX = item.x * scale;
                const cssY = viewportDims.height - item.y * scale - item.height * scale;
                const cssW = Math.max(12, item.width * scale);
                const cssH = Math.max(10, item.height * scale);

                const itemFontFamily = item.fontFamily === 'TimesRoman'
                  ? 'Times New Roman, serif'
                  : item.fontFamily === 'Courier'
                  ? 'Courier New, monospace'
                  : 'Arial, Helvetica, sans-serif';

                return (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEditingId(item.id);
                    }}
                    style={{
                      left: `${cssX - 2}px`,
                      top: `${cssY - 2}px`,
                      width: `${cssW + 4}px`,
                      height: `${cssH + 4}px`,
                    }}
                    className={`absolute rounded transition-all cursor-text ${
                      isEditing
                        ? 'ring-2 ring-emerald-500 z-40 bg-white'
                        : isItemModified
                        ? 'bg-emerald-500/20 border border-emerald-500/50 hover:ring-1 hover:ring-emerald-500'
                        : 'hover:bg-blue-500/10 hover:border hover:border-blue-400/40'
                    }`}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={currentTextVal}
                        onChange={(e) => {
                          const updatedText = e.target.value;
                          setModifiedTexts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...item,
                              currentText: updatedText,
                              isModified: true,
                            },
                          }));
                        }}
                        onBlur={() => {
                          setActiveEditingId(null);
                          pushSnapshot({ modifiedTexts });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            setActiveEditingId(null);
                            pushSnapshot({ modifiedTexts });
                          }
                        }}
                        style={{
                          fontFamily: itemFontFamily,
                          fontWeight: item.isBold ? 700 : 400,
                          fontStyle: item.isItalic ? 'italic' : 'normal',
                          fontSize: `${item.fontSize * scale}px`,
                          color: '#000000',
                          lineHeight: `${cssH}px`,
                        }}
                        className="w-full h-full p-0 m-0 border-0 outline-none bg-white text-zinc-900"
                      />
                    ) : (
                      isItemModified && (
                        <div
                          style={{
                            fontFamily: itemFontFamily,
                            fontWeight: item.isBold ? 700 : 400,
                            fontStyle: item.isItalic ? 'italic' : 'normal',
                            fontSize: `${item.fontSize * scale}px`,
                            lineHeight: `${cssH}px`,
                          }}
                          className="w-full h-full bg-white text-zinc-900 truncate px-0.5"
                        >
                          {currentTextVal}
                        </div>
                      )
                    )}
                  </div>
                );
              })}

            {/* Render Text Overlays */}
            {textOverlays
              .filter((t) => t.pageIndex === currentPage - 1)
              .map((t) => {
                const scale = zoomScale;
                const cssX = t.x * scale;
                const cssY = viewportDims.height - t.y * scale;
                const isSelected = selectedOverlayId === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOverlayId(t.id);
                    }}
                    style={{
                      left: `${cssX}px`,
                      top: `${cssY}px`,
                      fontSize: `${t.size * scale}px`,
                      fontFamily: t.fontFamily || 'Calibri, sans-serif',
                      fontWeight: t.isBold ? 700 : 400,
                      fontStyle: t.isItalic ? 'italic' : 'normal',
                      textDecoration: t.isUnderline ? 'underline' : 'none',
                      color: t.color,
                      textAlign: t.alignment || 'left',
                    }}
                    className={`absolute cursor-pointer px-1 py-0.5 rounded transition-all ${
                      isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : ''
                    }`}
                  >
                    {t.text}
                  </div>
                );
              })}

            {/* Render Hyperlink Overlays */}
            {hyperlinks
              .filter((l) => l.pageIndex === currentPage - 1)
              .map((l) => {
                const scale = zoomScale;
                const cssX = l.x * scale;
                const cssY = viewportDims.height - l.y * scale - l.height * scale;
                const isSelected = selectedOverlayId === l.id;

                return (
                  <div
                    key={l.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOverlayId(l.id);
                    }}
                    style={{
                      left: `${cssX}px`,
                      top: `${cssY}px`,
                      width: `${l.width * scale}px`,
                      height: `${l.height * scale}px`,
                    }}
                    className={`absolute flex items-center gap-1 px-1 rounded border border-blue-500/60 bg-blue-500/15 cursor-pointer z-30 group ${
                      isSelected ? 'ring-2 ring-blue-600' : ''
                    }`}
                    title={`Hyperlink: ${l.url}`}
                  >
                    <ExternalLink className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 font-mono truncate">
                      {l.url}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHyperlinks((prev) => prev.filter((item) => item.id !== l.id));
                        pushSnapshot({ hyperlinks: hyperlinks.filter((item) => item.id !== l.id) });
                      }}
                      className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}

            {/* Render Image Overlays */}
            {imageOverlays
              .filter((i) => i.pageIndex === currentPage - 1)
              .map((img) => {
                const scale = zoomScale;
                const cssX = img.x * scale;
                const cssY = viewportDims.height - img.y * scale - img.height * scale;
                const isSelected = selectedOverlayId === img.id;
                const url = URL.createObjectURL(new Blob([img.imageData]));

                return (
                  <img
                    key={img.id}
                    src={url}
                    alt="Overlay"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOverlayId(img.id);
                    }}
                    style={{
                      left: `${cssX}px`,
                      top: `${cssY}px`,
                      width: `${img.width * scale}px`,
                      height: `${img.height * scale}px`,
                    }}
                    className={`absolute cursor-pointer object-contain rounded ${
                      isSelected ? 'ring-2 ring-emerald-500' : ''
                    }`}
                  />
                );
              })}

            {/* Rendering Spinner */}
            {isRendering && (
              <div className="absolute inset-0 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center z-50 rounded">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading Page {currentPage}...</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* FOOTER: Clean Responsive Zoom Bar (NO Squished Text) */}
      <footer className="flex items-center justify-center sm:justify-between px-3 sm:px-6 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 z-30 text-xs text-zinc-600 dark:text-zinc-400 flex-shrink-0 shadow-xs">
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-[11px] text-zinc-400">
            {activeTool === 'edit-text'
              ? 'Click any text on the page to edit with original font & weight'
              : activeTool === 'add-text'
              ? 'Click anywhere on page to place formatted text'
              : activeTool === 'add-link'
              ? 'Click anywhere to create a clickable web hyperlink'
              : 'Viewing document • Scroll or use navigation buttons'}
          </span>
        </div>

        {/* Clean, Fully-Functional Zoom Controls for Mobile & Desktop */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center">
          <button
            onClick={handleFitWidth}
            className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
            title="Fit Width"
          >
            Fit Width
          </button>

          <button
            onClick={() => setZoomScale((prev) => Math.max(0.25, Number((prev - 0.15).toFixed(2))))}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <input
            type="range"
            min="0.25"
            max="3.5"
            step="0.05"
            value={zoomScale}
            onChange={(e) => setZoomScale(parseFloat(e.target.value))}
            className="w-24 sm:w-32 accent-emerald-600 h-1.5 cursor-pointer"
          />

          <span className="font-mono text-xs font-bold w-11 text-center">
            {Math.round(zoomScale * 100)}%
          </span>

          <button
            onClick={() => setZoomScale((prev) => Math.min(4.0, Number((prev + 0.15).toFixed(2))))}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleFitPage}
            className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
            title="Fit Page"
          >
            Fit Page
          </button>
        </div>
      </footer>

      {/* Close Confirmation Dialog (Clean, Fully Readable Layout on Android & iOS) */}
      {showCloseConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Save Changes Before Closing?
                </h3>
                <p className="text-xs text-zinc-500">
                  You have unsaved edits in this document.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Would you like to save your edited PDF to your device now, or discard all changes made during this session?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCloseConfirmModal(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCloseConfirmModal(false);
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
              >
                Discard & Close
              </button>
              <button
                onClick={async () => {
                  await handleSave();
                  setShowCloseConfirmModal(false);
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Engine Modal */}
      {isOcrOpen && file && (
        <PdfOcrModal
          isOpen={true}
          onClose={() => setIsOcrOpen(false)}
          initialFile={file}
          onOpenInEditor={(ocrPdfFile) => {
            setFile(ocrPdfFile);
            setIsOcrOpen(false);
          }}
        />
      )}
    </div>
  );
};
