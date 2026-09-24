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
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FolderOpen,
  FilePlus,
  Sparkles
} from 'lucide-react';
import {
  PdfStudioEngine,
  TextOverlay,
  ImageOverlay,
  ExistingTextItem,
  HyperlinkOverlay,
  InsertBlankPageSpec
} from '../../services/pdfStudioEngine';
import {
  PdfSignatureEngine,
  PdfSignatureInfo
} from '../../services/pdfSignatureEngine';
import { saveFile } from '../../utils/fileSaver';
import { getDocumentProxy } from 'unpdf';
import { createPortal } from 'react-dom';
import { PDFDocument } from 'pdf-lib';
import { OcrEngine } from '../../services/ocrEngine';
import { UniversalDocumentLoader } from '../../services/universalDocumentLoader';
import { PdfOcrModal } from './PdfOcrModal';
import { SignatureCertificateModal } from './SignatureCertificateModal';
import { PdfPasswordPromptModal } from '../PdfPasswordPromptModal';
import { PdfUnlocker } from '../../services/pdfUnlocker';

export const MS_WORD_FONTS = [
  // Microsoft Modern Standard
  'Aptos',
  'Aptos Display',
  'Aptos Mono',
  'Aptos Serif',
  'Calibri',
  'Calibri Light',
  // Classic Sans-Serif
  'Arial',
  'Arial Black',
  'Arial Narrow',
  'Arial Rounded MT Bold',
  'Bahnschrift',
  'Century Gothic',
  'Franklin Gothic Medium',
  'Franklin Gothic Book',
  'Franklin Gothic Demi',
  'Franklin Gothic Heavy',
  'Gill Sans MT',
  'Helvetica',
  'Impact',
  'Lucida Sans',
  'Lucida Sans Unicode',
  'Segoe UI',
  'Segoe UI Semibold',
  'Segoe UI Light',
  'Segoe UI Black',
  'Tahoma',
  'Trebuchet MS',
  'Tw Cen MT',
  'Tw Cen MT Condensed',
  'Verdana',
  // Classic Serif & Formal
  'Times New Roman',
  'Baskerville Old Face',
  'Bell MT',
  'Bodoni MT',
  'Bodoni MT Black',
  'Book Antiqua',
  'Bookman Old Style',
  'Cambria',
  'Centaur',
  'Century Schoolbook',
  'Constantia',
  'Didot',
  'Elephant',
  'Engravers MT',
  'Garamond',
  'Georgia',
  'Goudy Old Style',
  'High Tower Text',
  'Modern No. 20',
  'Palatino Linotype',
  'Perpetua',
  'Rockwell',
  'Rockwell Condensed',
  // Coding & Monospace
  'Cascadia Code',
  'Cascadia Mono',
  'Consolas',
  'Courier New',
  'Lucida Console',
  'OCR A Extended',
  // Display, Script & Calligraphy
  'Berlin Sans FB',
  'Bernard MT Condensed',
  'Blackadder ITC',
  'Bradley Hand ITC',
  'Broadway',
  'Brush Script MT',
  'Castellar',
  'Chiller',
  'Colonna MT',
  'Comic Sans MS',
  'Cooper Black',
  'Copperplate Gothic Bold',
  'Copperplate Gothic Light',
  'Curlz MT',
  'Edwardian Script ITC',
  'Felix Titling',
  'Forte',
  'Freestyle Script',
  'French Script MT',
  'Gabriola',
  'Gigi',
  'Gloucester MT Extra Condensed',
  'Haettenschweiler',
  'Harlow Solid Italic',
  'Harrington',
  'Informal Roman',
  'Jokerman',
  'Juice ITC',
  'Kristen ITC',
  'Kunstler Script',
  'Lucida Calligraphy',
  'Lucida Handwriting',
  'Magneto',
  'Maiandra GD',
  'Matura MT Script Capitals',
  'Mistral',
  'Monotype Corsiva',
  'Niagara Engraved',
  'Niagara Solid',
  'Old English Text MT',
  'Onyx',
  'Palace Script MT',
  'Papyrus',
  'Parchment',
  'Playbill',
  'Poor Richard',
  'Pristina',
  'Rage Italic',
  'Ravie',
  'Showcard Gothic',
  'Snap ITC',
  'Stencil',
  'Tempus Sans ITC',
  'Vivaldi',
  'Vladimir Script',
  'Wide Latin',
  // Modern Sans Web Favorites
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lato',
  'Poppins',
  'Symbol'
];

interface PdfEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: File;
  initialFiles?: File[];
}

export interface EditorTabItem {
  id: string;
  name: string;
  file: File;
  modifiedTexts: Record<string, ExistingTextItem>;
  textOverlays: TextOverlay[];
  imageOverlays: ImageOverlay[];
  hyperlinks: HyperlinkOverlay[];
  pageRotations: Record<number, number>;
  deletedPages: number[];
  insertedBlankPages: InsertBlankPageSpec[];
  currentPage: number;
  zoomScale: number;
  history: EditorSnapshot[];
  historyIndex: number;
  hasUnsavedEdits: boolean;
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

export const PdfEditorModal: React.FC<PdfEditorModalProps> = ({ isOpen, onClose, initialFile, initialFiles }) => {
  if (!isOpen) return null;

  const initialTabIdRef = useRef<string>('tab_' + Date.now());
  const [tabs, setTabs] = useState<EditorTabItem[]>(() => {
    if (initialFiles && initialFiles.length > 0) {
      return initialFiles.map((f, i) => ({
        id: `tab_${Date.now()}_${i}`,
        name: f.name,
        file: f,
        modifiedTexts: {},
        textOverlays: [],
        imageOverlays: [],
        hyperlinks: [],
        pageRotations: {},
        deletedPages: [],
        insertedBlankPages: [],
        currentPage: 1,
        zoomScale: 1.0,
        history: [{
          modifiedTexts: {},
          textOverlays: [],
          imageOverlays: [],
          hyperlinks: [],
          pageRotations: {},
          deletedPages: [],
          insertedBlankPages: [],
        }],
        historyIndex: 0,
        hasUnsavedEdits: false,
      }));
    }
    if (initialFile) {
      return [{
        id: initialTabIdRef.current,
        name: initialFile.name,
        file: initialFile,
        modifiedTexts: {},
        textOverlays: [],
        imageOverlays: [],
        hyperlinks: [],
        pageRotations: {},
        deletedPages: [],
        insertedBlankPages: [],
        currentPage: 1,
        zoomScale: 1.0,
        history: [{
          modifiedTexts: {},
          textOverlays: [],
          imageOverlays: [],
          hyperlinks: [],
          pageRotations: {},
          deletedPages: [],
          insertedBlankPages: [],
        }],
        historyIndex: 0,
        hasUnsavedEdits: false,
      }];
    }
    return [];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (initialFiles && initialFiles.length > 0) return `tab_${Date.now()}_0`;
    return initialFile ? initialTabIdRef.current : '';
  });
  const [tabCloseConfirmTarget, setTabCloseConfirmTarget] = useState<EditorTabItem | null>(null);
  const [showMultiTabCloseModal, setShowMultiTabCloseModal] = useState<boolean>(false);

  const [file, setFile] = useState<File | null>(() => {
    if (initialFiles && initialFiles.length > 0) return initialFiles[0];
    return initialFile || null;
  });
  const [showInitialPrompt, setShowInitialPrompt] = useState<boolean>(!initialFile && (!initialFiles || initialFiles.length === 0));
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1); // 1-indexed
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [activeTool, setActiveTool] = useState<
    'view' | 'edit-text' | 'add-text' | 'add-link' | 'add-image'
  >('edit-text');

  // Digital Signature & Certificate State
  const [signatures, setSignatures] = useState<PdfSignatureInfo[]>([]);
  const [selectedSigForModal, setSelectedSigForModal] = useState<PdfSignatureInfo | null>(null);
  const [isVerifyingSignatures, setIsVerifyingSignatures] = useState<boolean>(false);

  // Auto-Save feature
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('omnisize_autosave') === 'true';
    } catch {
      return false;
    }
  });

  // Password Protected PDF Prompt
  const [passwordModalFile, setPasswordModalFile] = useState<File | null>(null);
  const [originalSignedBuffer, setOriginalSignedBuffer] = useState<ArrayBuffer | null>(null);

  // Sync initialFile or initialFiles prop changes
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const newTabs = initialFiles.map((f, i) => ({
        id: `tab_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
        name: f.name,
        file: f,
        modifiedTexts: {},
        textOverlays: [],
        imageOverlays: [],
        hyperlinks: [],
        pageRotations: {},
        deletedPages: [],
        insertedBlankPages: [],
        currentPage: 1,
        zoomScale: 1.0,
        history: [{
          modifiedTexts: {},
          textOverlays: [],
          imageOverlays: [],
          hyperlinks: [],
          pageRotations: {},
          deletedPages: [],
          insertedBlankPages: [],
        }],
        historyIndex: 0,
        hasUnsavedEdits: false,
      }));
      setTabs(newTabs);
      setActiveTabId(newTabs[0].id);
      setFile(newTabs[0].file);
      setShowInitialPrompt(false);
    } else if (initialFile) {
      setTabs((prev) => {
        const exists = prev.find((t) => t.file.name === initialFile.name);
        if (exists) {
          setActiveTabId(exists.id);
          setFile(exists.file);
          return prev;
        }
        const newId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        setActiveTabId(newId);
        setFile(initialFile);
        setShowInitialPrompt(false);
        return [
          ...prev,
          {
            id: newId,
            name: initialFile.name,
            file: initialFile,
            modifiedTexts: {},
            textOverlays: [],
            imageOverlays: [],
            hyperlinks: [],
            pageRotations: {},
            deletedPages: [],
            insertedBlankPages: [],
            currentPage: 1,
            zoomScale: 1.0,
            history: [{
              modifiedTexts: {},
              textOverlays: [],
              imageOverlays: [],
              hyperlinks: [],
              pageRotations: {},
              deletedPages: [],
              insertedBlankPages: [],
            }],
            historyIndex: 0,
            hasUnsavedEdits: false,
          },
        ];
      });
    }
  }, [initialFile, initialFiles]);

  // Lock body overflow when editor is open so background never scrolls
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  // Close Confirmation Modal
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState<boolean>(false);

  // Sidebar & Layout
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [basePageDims, setBasePageDims] = useState<{ width: number; height: number }>({ width: 595.28, height: 841.89 });
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
  const filePickerRef = useRef<HTMLInputElement | null>(null);

  // Stable reference to page container frame for 120 FPS GPU transform zooming
  const pageFrameRef = useRef<HTMLDivElement | null>(null);
  const zoomScaleRef = useRef<number>(zoomScale);
  useEffect(() => {
    zoomScaleRef.current = zoomScale;
  }, [zoomScale]);

  // Scanned Document OCR in-place editing state
  const [isOcrScanningPage, setIsOcrScanningPage] = useState<boolean>(false);
  const [ocrProgressText, setOcrProgressText] = useState<string>('');
  const [ocrLanguage, setOcrLanguage] = useState<string>('eng+hin');
  const pageOcrCache = useRef<Record<number, ExistingTextItem[]>>({});

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

  // Auto-populate tabs if a file is loaded but tabs array is empty
  useEffect(() => {
    if (file && tabs.length === 0) {
      const tabId = `tab_${Date.now()}`;
      setTabs([
        {
          id: tabId,
          name: file.name,
          file: file,
          modifiedTexts: {},
          textOverlays: [],
          imageOverlays: [],
          hyperlinks: [],
          pageRotations: {},
          deletedPages: [],
          insertedBlankPages: [],
          currentPage: 1,
          zoomScale: 1.0,
          history: [{
            modifiedTexts: {},
            textOverlays: [],
            imageOverlays: [],
            hyperlinks: [],
            pageRotations: {},
            deletedPages: [],
            insertedBlankPages: [],
          }],
          historyIndex: 0,
          hasUnsavedEdits: false,
        },
      ]);
      setActiveTabId(tabId);
    }
  }, [file, tabs.length]);

  // Run OCR on current page canvas to extract bounding boxes for in-place editing
  const handleRunOcrOnCurrentPage = async (lang: string = ocrLanguage) => {
    if (!canvasRef.current) return;
    try {
      setIsOcrScanningPage(true);
      setOcrProgressText('Initializing OCR optical recognition...');

      const items = await OcrEngine.extractTextBoundingBoxes(
        canvasRef.current,
        basePageDims.width,
        basePageDims.height,
        lang,
        currentPage - 1,
        (pct, status) => {
          setOcrProgressText(`${status} (${pct}%)`);
        }
      );

      pageOcrCache.current[currentPage] = items as ExistingTextItem[];
      setDetectedTextItems(items as ExistingTextItem[]);
      setActiveTool('edit-text');
    } catch (err: any) {
      console.error('OCR page recognition error:', err);
      setError('OCR text extraction failed: ' + (err?.message || 'Check document quality'));
    } finally {
      setIsOcrScanningPage(false);
      setOcrProgressText('');
    }
  };

  // Create Blank Document
  const handleCreateBlankDocument = async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595.28, 841.89]); // A4
    const pdfBytes = await doc.save();
    const blankBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const blankFile = new File([blankBlob], 'Blank_Document.pdf', { type: 'application/pdf' });
    const newId = `tab_${Date.now()}`;
    const newTab: EditorTabItem = {
      id: newId,
      name: blankFile.name,
      file: blankFile,
      modifiedTexts: {},
      textOverlays: [],
      imageOverlays: [],
      hyperlinks: [],
      pageRotations: {},
      deletedPages: [],
      insertedBlankPages: [],
      currentPage: 1,
      zoomScale: 1.0,
      history: [{
        modifiedTexts: {},
        textOverlays: [],
        imageOverlays: [],
        hyperlinks: [],
        pageRotations: {},
        deletedPages: [],
        insertedBlankPages: [],
      }],
      historyIndex: 0,
      hasUnsavedEdits: false,
    };
    setTabs([newTab]);
    setActiveTabId(newId);
    setFile(blankFile);
    setShowInitialPrompt(false);
  };

  // Select File from Device
  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const newTabs: EditorTabItem[] = selectedFiles.map((f, i) => ({
        id: `tab_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
        name: f.name,
        file: f,
        modifiedTexts: {},
        textOverlays: [],
        imageOverlays: [],
        hyperlinks: [],
        pageRotations: {},
        deletedPages: [],
        insertedBlankPages: [],
        currentPage: 1,
        zoomScale: 1.0,
        history: [{
          modifiedTexts: {},
          textOverlays: [],
          imageOverlays: [],
          hyperlinks: [],
          pageRotations: {},
          deletedPages: [],
          insertedBlankPages: [],
        }],
        historyIndex: 0,
        hasUnsavedEdits: false,
      }));
      setTabs(newTabs);
      setActiveTabId(newTabs[0].id);
      setFile(newTabs[0].file);
      setShowInitialPrompt(false);
    }
  };

  // Stamp Acrobat-grade verified green tick badge over unverified question mark
  const handleStampSignature = async () => {
    const targetBuf = arrayBuffer || originalSignedBuffer;
    if (!targetBuf || signatures.length === 0) return;
    try {
      setIsVerifyingSignatures(true);
      const verifiedBlob = await PdfSignatureEngine.applyVerifiedSignatureStamp(targetBuf, signatures[0]);
      const outName = file?.name ? file.name.replace(/\.pdf$/i, '_verified.pdf') : `verified_signed_${Date.now()}.pdf`;
      await saveFile(verifiedBlob, outName);
      // Reload editor with the new stamped PDF so user sees the green tick right away in the editor
      const newFile = new File([verifiedBlob], outName, { type: 'application/pdf' });
      setFile(newFile);
    } catch (e) {
      console.error('Failed to stamp signature:', e);
    } finally {
      setIsVerifyingSignatures(false);
    }
  };

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

  // Load PDF buffer on file selection and detect digital signatures
  useEffect(() => {
    if (!file) return;
    let isMounted = true;

    // Auto-convert non-PDF files (Images, Word docx, Excel xlsx/csv, Text) to high-fidelity PDF
    const isNonPdf = !file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf';
    if (isNonPdf) {
      UniversalDocumentLoader.loadAsPdf(file)
        .then((convertedPdf) => {
          if (isMounted) {
            setFile(convertedPdf);
            setTabs((prev) =>
              prev.map((t) => (t.id === activeTabId ? { ...t, file: convertedPdf, name: convertedPdf.name } : t))
            );
            setShowInitialPrompt(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError('Failed to open document: ' + (err?.message || 'Conversion error'));
          }
        });
      return () => {
        isMounted = false;
      };
    }

    file.arrayBuffer().then(async (buf) => {
      if (!isMounted) return;
      const safeBuf = buf.slice(0);
      setArrayBuffer(safeBuf);

      // Cryptographic Digital Signature & Certificate Detection
      // Run immediately on the initial file buffer so signatures survive password unlocking
      const sigSourceBuf = originalSignedBuffer || safeBuf;
      try {
        setIsVerifyingSignatures(true);
        const extractedSigs = await PdfSignatureEngine.extractSignatures(sigSourceBuf);
        if (extractedSigs.length > 0) {
          if (!originalSignedBuffer) {
            setOriginalSignedBuffer(sigSourceBuf);
          }
          const verifiedSigs: PdfSignatureInfo[] = [];
          for (const sig of extractedSigs) {
            const verified = await PdfSignatureEngine.verifySignature(sigSourceBuf, sig);
            verifiedSigs.push(verified);
          }
          if (isMounted) {
            setSignatures(verifiedSigs);
          }
        }
      } catch (err) {
        console.warn('Initial signature extraction note:', err);
      } finally {
        if (isMounted) setIsVerifyingSignatures(false);
      }

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
        if (!isMounted) return;
        const msg = String(err?.message || err || '');
        const isPasswordErr =
          err?.name === 'PasswordException' ||
          err?.code === 1 ||
          err?.code === 2 ||
          msg.toLowerCase().includes('password') ||
          msg.toLowerCase().includes('no password');

        if (isPasswordErr) {
          // If password required, store the original buffer for signature verification and open password prompt
          setOriginalSignedBuffer(safeBuf);
          setPasswordModalFile(file);
          setError(null);
        } else {
          setError('Failed to parse PDF: ' + (err?.message || 'Invalid format'));
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [file]);

  const handlePasswordUnlockSuccess = (unlockedFile: File) => {
    setPasswordModalFile(null);
    setError(null);
    setFile(unlockedFile);
  };

  // Ref to track last rendered page to avoid flashing loading spinner on zoom
  const lastRenderedPageRef = useRef<number>(-1);
  const zoomDebounceRef = useRef<any>(null);

  // Render current page to canvas with high-DPI supersampling
  useEffect(() => {
    if ((!pdfProxyRef.current && !arrayBuffer) || totalPages === 0) return;

    let isMounted = true;
    const isPageChange = lastRenderedPageRef.current !== currentPage;
    if (isPageChange) {
      setIsRendering(true);
      setError(null);
    }

    const proxyOrBuf = pdfProxyRef.current || arrayBuffer;

    if (zoomDebounceRef.current) {
      clearTimeout(zoomDebounceRef.current);
    }

    const executeRender = () => {
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
          const baseW = cssWidth / zoomScale;
          const baseH = cssHeight / zoomScale;
          setBasePageDims({ width: baseW, height: baseH });
          setViewportDims({ width: cssWidth, height: cssHeight });
          lastRenderedPageRef.current = currentPage;

          // Extract selectable text elements for the current page
          try {
            if (pageOcrCache.current[currentPage]) {
              if (isMounted) {
                setDetectedTextItems(pageOcrCache.current[currentPage]);
              }
            } else {
              const textItems = await PdfStudioEngine.extractPageTextItems(proxyOrBuf, currentPage);
              if (isMounted) {
                setDetectedTextItems(textItems);

                // Check page text items for signature timestamp (e.g., Aadhaar Date: 2020.09.11 23:26:28 IST)
                for (const item of textItems) {
                const dm = item.originalText.match(/Date:\s*([0-9]{4})[./-]([0-9]{2})[./-]([0-9]{2})\s+([0-9]{2}):([0-9]{2}):([0-9]{2})/i);
                if (dm) {
                  const yr = parseInt(dm[1], 10);
                  const mo = parseInt(dm[2], 10) - 1;
                  const da = parseInt(dm[3], 10);
                  const hr = parseInt(dm[4], 10);
                  const mi = parseInt(dm[5], 10);
                  const se = parseInt(dm[6], 10);
                  const utcMs = Date.UTC(yr, mo, da, hr, mi, se) - 5.5 * 3600 * 1000;
                  const parsedDate = new Date(utcMs);
                  setSignatures((prev) =>
                    prev.map((s) => ({
                      ...s,
                      signingTime: s.signingTime || parsedDate,
                    }))
                  );
                  break;
                }
              }
            }
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
          if (isMounted && isPageChange) {
            setIsRendering(false);
          }
        });
    };

    if (isPageChange) {
      executeRender();
    } else {
      // Smooth debounce on zoom changes so rapid pinch/wheel gestures don't choke the canvas
      zoomDebounceRef.current = setTimeout(executeRender, 80);
    }

    return () => {
      isMounted = false;
      if (zoomDebounceRef.current) {
        clearTimeout(zoomDebounceRef.current);
      }
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
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, hasUnsavedEdits: false } : t))
      );
      setTimeout(() => setSaveSuccess(false), 2500);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to save PDF.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Sync window global flag so Electron knows if unsaved edits exist
  useEffect(() => {
    const hasUnsaved = hasUnsavedEdits || tabs.some((t) => t.hasUnsavedEdits);
    (window as any).__hasUnsavedStudioEdits = hasUnsaved;
    return () => {
      (window as any).__hasUnsavedStudioEdits = false;
    };
  }, [hasUnsavedEdits, tabs]);

  // Switch Active Document Tab
  const switchTab = (targetTabId: string) => {
    if (targetTabId === activeTabId) return;

    // Snapshot current active tab state into tabs array
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              file: file!,
              modifiedTexts,
              textOverlays,
              imageOverlays,
              hyperlinks,
              pageRotations,
              deletedPages,
              insertedBlankPages,
              currentPage,
              zoomScale,
              history,
              historyIndex,
              hasUnsavedEdits,
            }
          : t
      )
    );

    const target = tabs.find((t) => t.id === targetTabId);
    if (!target) return;

    setActiveTabId(target.id);
    setFile(target.file);
    setModifiedTexts(target.modifiedTexts);
    setTextOverlays(target.textOverlays);
    setImageOverlays(target.imageOverlays);
    setHyperlinks(target.hyperlinks);
    setPageRotations(target.pageRotations);
    setDeletedPages(target.deletedPages);
    setInsertedBlankPages(target.insertedBlankPages);
    setCurrentPage(target.currentPage || 1);
    setZoomScale(target.zoomScale || 1.0);
    setHistory(target.history);
    setHistoryIndex(target.historyIndex);
    setShowInitialPrompt(false);
  };

  // Add one or more files as new document tabs
  const handleAddNewTabFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    for (let i = 0; i < selectedFiles.length; i++) {
      const rawFile = selectedFiles[i];
      try {
        const pdfFile = await UniversalDocumentLoader.loadAsPdf(rawFile);
        const newTabId = `tab_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
        const newTab: EditorTabItem = {
          id: newTabId,
          name: rawFile.name,
          file: pdfFile,
          modifiedTexts: {},
          textOverlays: [],
          imageOverlays: [],
          hyperlinks: [],
          pageRotations: {},
          deletedPages: [],
          insertedBlankPages: [],
          currentPage: 1,
          zoomScale: 1.0,
          history: [{
            modifiedTexts: {},
            textOverlays: [],
            imageOverlays: [],
            hyperlinks: [],
            pageRotations: {},
            deletedPages: [],
            insertedBlankPages: [],
          }],
          historyIndex: 0,
          hasUnsavedEdits: false,
        };

        setTabs((prev) => [...prev, newTab]);
        if (i === selectedFiles.length - 1) {
          setActiveTabId(newTabId);
          setFile(pdfFile);
          setModifiedTexts({});
          setTextOverlays([]);
          setImageOverlays([]);
          setHyperlinks([]);
          setPageRotations({});
          setDeletedPages([]);
          setInsertedBlankPages([]);
          setCurrentPage(1);
          setShowInitialPrompt(false);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to open document.');
      }
    }
    e.target.value = '';
  };

  // Request close for an individual tab
  const handleRequestCloseTab = (tabId: string) => {
    const targetTab = tabs.find((t) => t.id === tabId);
    if (!targetTab) return;

    const tabHasEdits = tabId === activeTabId ? hasUnsavedEdits : targetTab.hasUnsavedEdits;
    if (tabHasEdits) {
      setTabCloseConfirmTarget(targetTab);
    } else {
      performCloseTab(tabId);
    }
  };

  // Remove tab and switch to adjacent tab
  const performCloseTab = (tabId: string) => {
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);

    if (remaining.length === 0) {
      onClose();
      return;
    }

    if (tabId === activeTabId) {
      const nextActive = remaining[0];
      setActiveTabId(nextActive.id);
      setFile(nextActive.file);
      setModifiedTexts(nextActive.modifiedTexts);
      setTextOverlays(nextActive.textOverlays);
      setImageOverlays(nextActive.imageOverlays);
      setHyperlinks(nextActive.hyperlinks);
      setPageRotations(nextActive.pageRotations);
      setDeletedPages(nextActive.deletedPages);
      setInsertedBlankPages(nextActive.insertedBlankPages);
      setCurrentPage(nextActive.currentPage || 1);
      setZoomScale(nextActive.zoomScale || 1.0);
      setHistory(nextActive.history);
      setHistoryIndex(nextActive.historyIndex);
    }
  };

  // Close Request handler (checks for multiple tabs, unsaved edits & autosave)
  const handleRequestClose = async () => {
    if (autoSaveEnabled && hasUnsavedEdits) {
      await handleSave();
      if (tabs.length > 1) {
        setShowMultiTabCloseModal(true);
      } else {
        onClose();
      }
      return;
    }

    if (tabs.length > 1) {
      setShowMultiTabCloseModal(true);
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

  // Two-Finger Pinch-to-Zoom & Pan Gesture Support (High Performance Compositor Driven)
  const isGesturingRef = useRef<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let initialDist = 0;
    let initialScale = 1;
    let currentRatio = 1;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isGesturingRef.current = true;
        initialDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = zoomScaleRef.current;
        currentRatio = 1;
        if (pageFrameRef.current) {
          pageFrameRef.current.style.transition = 'none';
          pageFrameRef.current.style.willChange = 'transform';
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDist > 0 && isGesturingRef.current) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        currentRatio = dist / initialDist;
        const tempScale = initialScale * currentRatio;
        const clampedScale = Math.min(4.0, Math.max(0.25, tempScale));
        const visualRatio = clampedScale / initialScale;

        // Apply fast GPU transform scaling on compositor thread with ZERO React re-renders!
        if (pageFrameRef.current) {
          pageFrameRef.current.style.transform = `scale(${visualRatio})`;
          pageFrameRef.current.style.transformOrigin = 'center center';
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isGesturingRef.current && e.touches.length < 2) {
        isGesturingRef.current = false;
        initialDist = 0;
        if (pageFrameRef.current) {
          pageFrameRef.current.style.transform = 'none';
          pageFrameRef.current.style.willChange = 'auto';
        }
        const finalScale = Math.min(4.0, Math.max(0.25, Number((initialScale * currentRatio).toFixed(2))));
        if (Math.abs(finalScale - zoomScaleRef.current) > 0.01) {
          setZoomScale(finalScale);
        }
      }
    };

    let wheelTimeout: any = null;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        const next = Math.min(4.0, Math.max(0.25, Number((zoomScaleRef.current + delta).toFixed(2))));
        zoomScaleRef.current = next;
        if (pageFrameRef.current) {
          pageFrameRef.current.style.transition = 'transform 0.05s ease-out';
        }
        if (wheelTimeout) clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          setZoomScale(next);
        }, 50);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, []);

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] bg-slate-100 dark:bg-zinc-950 flex flex-col w-screen h-screen select-none overflow-hidden m-0 p-0"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 999999,
      }}
    >
      {/* TIER 0: Multi-Document Tab Bar (Always Visible Acrobat / Chrome Style) */}
      <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-zinc-950 border-b border-zinc-800 overflow-x-auto no-scrollbar flex-shrink-0 z-30 select-none">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const tabHasEdits = isActive ? hasUnsavedEdits : tab.hasUnsavedEdits;
          return (
            <div
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer max-w-[190px] sm:max-w-[240px] transition-all flex-shrink-0 text-xs ${
                isActive
                  ? 'bg-zinc-800 text-white font-medium border border-zinc-700 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className="truncate">{tab.name}</span>
              {tabHasEdits && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" title="Unsaved edits" />
              )}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestCloseTab(tab.id);
                  }}
                  className="p-0.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors ml-1"
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add New Tab Button (+) */}
        <label
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 border border-dashed border-zinc-800 hover:border-emerald-500/50 cursor-pointer transition-all flex-shrink-0 text-xs font-semibold"
          title="Open Document in New Tab (PDF, Word, Excel, Images, Text)"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-medium">New Document</span>
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.docx,.xlsx,.xls,.csv,.txt,.md,application/pdf,image/*"
            className="hidden"
            onChange={handleAddNewTabFiles}
          />
        </label>
      </div>

      {/* TIER 1: Primary Header Bar (ALWAYS clean & comfortable on Desktop & Android) */}
      <header
        className="px-3 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-30 flex-shrink-0"
        style={{
          paddingTop: 'max(0.4rem, env(safe-area-inset-top, 0px))',
        }}
      >
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
              title="Toggle Page Thumbnails"
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
                {currentPage}/{totalPages || 1}
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

      {/* DIGITAL SIGNATURE BANNER (Acrobat-style genuine verification banner) */}
      {signatures.length > 0 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 border-b text-xs flex-shrink-0 transition-colors ${
            signatures[0].status === 'valid'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
              : signatures[0].status === 'untrusted_cert'
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300'
              : 'bg-red-500/10 border-red-500/25 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            {signatures[0].status === 'valid' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : signatures[0].status === 'untrusted_cert' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span className="font-semibold truncate">
              {signatures[0].status === 'valid'
                ? `Signed & Valid: ${signatures[0].signerName}`
                : signatures[0].status === 'untrusted_cert'
                ? `Signed by ${signatures[0].signerName} (Validity Unknown)`
                : `Invalid Digital Signature (Modified)`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {signatures[0].status === 'untrusted_cert' && (
              <button
                onClick={async () => {
                  if (signatures[0].certificate) {
                    PdfSignatureEngine.trustCertificate(signatures[0].certificate.serialNumber);
                    const buf = originalSignedBuffer || arrayBuffer;
                    if (buf) {
                      const reVer = await PdfSignatureEngine.verifySignature(buf, signatures[0]);
                      setSignatures([reVer]);
                    }
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] shadow-xs active:scale-95 whitespace-nowrap"
              >
                Trust Certificate
              </button>
            )}
            <button
              onClick={handleStampSignature}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-xs active:scale-95 whitespace-nowrap"
              title="Apply verified green checkmark badge in place of unverified yellow question mark and save PDF"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Verify & Stamp Green Tick</span>
            </button>
            <button
              onClick={() => setSelectedSigForModal(signatures[0])}
              className="px-2.5 py-1 rounded-lg border border-current font-medium text-[11px] hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
            >
              Certificate Details
            </button>
          </div>
        </div>
      )}

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

        <button
          onClick={() => handleRunOcrOnCurrentPage(ocrLanguage)}
          disabled={isOcrScanningPage}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 shadow-xs"
          title="Extract text with bounding boxes on current page to make scanned document editable"
        >
          {isOcrScanningPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-500" />}
          <span>{isOcrScanningPage ? 'Scanning...' : 'OCR to Edit'}</span>
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
              <option key={font} value={font} style={{ fontFamily: font }}>
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
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
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
          className="flex-1 overflow-auto bg-slate-200/70 dark:bg-zinc-950 relative"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          <div
            className="w-fit h-fit p-4 sm:p-8 flex flex-col items-center"
            style={{
              minWidth: '100%',
              minHeight: '100%',
              display: 'flex',
              justifyContent: 'safe center',
              alignItems: 'safe center',
            }}
          >
            {error && (
              <div className="mb-4 max-w-xl w-full flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Scanned Document / Image Detected Banner (1-Click OCR & Make Editable) */}
            {activeTool === 'edit-text' && detectedTextItems.length === 0 && !isRendering && (
              <div className="mb-4 max-w-2xl w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-pulse" />
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">Scanned Document / Image Detected</div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      No digital text layer found. Run OCR to make all text clickable & editable in-place!
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={ocrLanguage}
                    onChange={(e) => setOcrLanguage(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-amber-500/30 bg-white dark:bg-zinc-800 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="eng+hin">English + Hindi</option>
                    <option value="eng">English</option>
                    <option value="hin">Hindi</option>
                  </select>
                  <button
                    onClick={() => handleRunOcrOnCurrentPage(ocrLanguage)}
                    disabled={isOcrScanningPage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isOcrScanningPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isOcrScanningPage ? 'Scanning...' : '⚡ OCR & Make Text Editable'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Active Canvas Page Frame with High-DPI Resolution & GPU transform */}
            <div
              ref={pageFrameRef}
              onClick={handleCanvasClick}
              className="relative bg-white shadow-2xl rounded-xs border border-zinc-300/70 dark:border-zinc-800 select-none flex-shrink-0"
              style={{
                width: Math.max(100, Math.round((basePageDims.width || 595) * zoomScale)),
                height: Math.max(100, Math.round((basePageDims.height || 842) * zoomScale)),
                cursor: activeTool === 'add-text' ? 'crosshair' : activeTool === 'add-link' ? 'pointer' : 'default',
                transformOrigin: 'center center',
              }}
            >
              {/* High-DPI Supersampled Canvas (Razor-Sharp) */}
              <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />

              {/* OCR Scanning Overlay */}
              {isOcrScanningPage && (
                <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-50 rounded space-y-2 p-4 text-center">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Optical Character Recognition in Progress
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    {ocrProgressText || 'Extracting words and layout...'}
                  </div>
                </div>
              )}

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

            {/* Interactive Digital Signature Hotspots on Canvas */}
            {signatures
              .filter((sig) => (sig.rect ? sig.rect.pageIndex === currentPage - 1 : currentPage === 1))
              .map((sig) => {
                const scale = zoomScale;
                let rect = sig.rect || { x: 58, y: 312, width: 110, height: 74 };
                const isAadhaarLayout =
                  (rect.x >= 0 && rect.x <= 140 && rect.y >= 290 && rect.y <= 400) ||
                  (sig.signerName && sig.signerName.toLowerCase().includes('unique identification authority'));

                if (isAadhaarLayout) {
                  rect = { x: 58, y: 312, width: 110, height: 74, pageIndex: 0 };
                }

                const cssX = rect.x * scale;
                const cssY = viewportDims.height - (rect.y + rect.height) * scale;
                const cssW = rect.width * scale;
                const cssH = rect.height * scale;

                return (
                  <div
                    key={sig.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSigForModal(sig);
                    }}
                    style={{
                      left: `${cssX}px`,
                      top: `${cssY}px`,
                      width: `${cssW}px`,
                      height: `${cssH}px`,
                    }}
                    className="absolute rounded cursor-pointer z-30 transition-all select-none hover:bg-blue-500/10 hover:ring-1 hover:ring-blue-400/50 group"
                    title={`Digital Signature: ${sig.signerName} • Click to view certificate details & properties`}
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
        </div>
      </main>
    </div>

      {/* FOOTER: Clean Responsive Zoom Bar (NO Squished Text, fully visible above Android navigation bar) */}
      <footer
        className="flex items-center justify-center sm:justify-between px-3 sm:px-6 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 z-30 text-xs text-zinc-600 dark:text-zinc-400 flex-shrink-0 shadow-xs"
        style={{
          paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 8px))',
        }}
      >
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

        {/* Clean, Non-Clipping Touch Zoom Bar */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center">
          <button
            onClick={handleFitWidth}
            className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap flex-shrink-0"
            title="Fit Page Width"
          >
            Width
          </button>

          <button
            onClick={() => setZoomScale((prev) => Math.max(0.25, Number((prev - 0.15).toFixed(2))))}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
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
            className="w-20 sm:w-32 accent-emerald-600 h-1.5 cursor-pointer flex-shrink-0"
          />

          <span className="font-mono text-xs font-bold w-12 text-center flex-shrink-0">
            {Math.round(zoomScale * 100)}%
          </span>

          <button
            onClick={() => setZoomScale((prev) => Math.min(4.0, Number((prev + 0.15).toFixed(2))))}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleFitPage}
            className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap flex-shrink-0"
            title="Fit Entire Page"
          >
            Page
          </button>
        </div>
      </footer>

      {/* INITIAL PROMPT POPUP (When Studio is opened without document) */}
      {showInitialPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-3xl w-full max-w-lg border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold">Welcome to Omnisize PDF Studio</h3>
              <p className="text-xs text-zinc-500 max-w-sm">
                How would you like to start your PDF editing and reading session?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {/* Option 1: Open Document */}
              <button
                onClick={() => filePickerRef.current?.click()}
                className="group p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-emerald-500/5 transition-all text-left flex flex-col justify-between gap-3 shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Open Document</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Browse and edit an existing PDF from your device storage
                  </div>
                </div>
              </button>

              {/* Option 2: Blank Document */}
              <button
                onClick={handleCreateBlankDocument}
                className="group p-5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-emerald-500/5 transition-all text-left flex flex-col justify-between gap-3 shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FilePlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Blank Page</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Start with a fresh, clean A4 page for notes, text, or signing
                  </div>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Cancel & Exit
              </button>
              <span className="text-[11px] text-zinc-400">100% Offline • Private</span>
            </div>

            <input
              ref={filePickerRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.docx,.xlsx,.xls,.csv,.txt,.md,application/pdf,image/*"
              onChange={handleSelectFile}
              className="hidden"
            />
          </div>
        </div>
      )}

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

      {/* Multi-Tab Close Choice Modal */}
      {showMultiTabCloseModal && (
        <div className="fixed inset-0 z-[9999999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Multiple Documents Open ({tabs.length} Tabs)
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Do you want to close all open document tabs or close only the current active tab?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowMultiTabCloseModal(false);
                  handleRequestCloseTab(activeTabId);
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors text-center"
              >
                Close Current Tab Only
              </button>

              <button
                onClick={() => {
                  setShowMultiTabCloseModal(false);
                  const anyUnsaved = tabs.some((t) => t.hasUnsavedEdits) || hasUnsavedEdits;
                  if (anyUnsaved) {
                    setShowCloseConfirmModal(true);
                  } else {
                    onClose();
                  }
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors text-center shadow-xs"
              >
                Close All Tabs
              </button>

              <button
                onClick={() => setShowMultiTabCloseModal(false)}
                className="w-full py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Tab Unsaved Edits Confirmation Modal */}
      {tabCloseConfirmTarget && (
        <div className="fixed inset-0 z-[9999999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Save Changes to "{tabCloseConfirmTarget.name}"?
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  This document has unsaved edits. If you close without saving, your changes will be discarded.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 sm:justify-end">
              <button
                onClick={() => setTabCloseConfirmTarget(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = tabCloseConfirmTarget.id;
                  setTabCloseConfirmTarget(null);
                  performCloseTab(id);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                Don't Save
              </button>
              <button
                onClick={async () => {
                  const id = tabCloseConfirmTarget.id;
                  setTabCloseConfirmTarget(null);
                  await handleSave();
                  performCloseTab(id);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Signature & Certificate Inspection Modal */}
      {selectedSigForModal && (
        <SignatureCertificateModal
          isOpen={true}
          onClose={() => setSelectedSigForModal(null)}
          signature={selectedSigForModal}
          pdfBuffer={originalSignedBuffer || arrayBuffer}
          onSignatureUpdated={(updated) => {
            setSignatures([updated]);
            setSelectedSigForModal(updated);
          }}
        />
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

      {/* Password Prompt Modal for Encrypted PDFs */}
      {passwordModalFile && (
        <PdfPasswordPromptModal
          isOpen={true}
          file={passwordModalFile}
          onSuccess={handlePasswordUnlockSuccess}
          onCancel={() => {
            setPasswordModalFile(null);
            onClose();
          }}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
