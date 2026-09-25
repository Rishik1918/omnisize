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
  Sparkles,
  Eye,
  Pipette,
  Palette,
  Strikethrough,
  Superscript,
  Subscript,
  AlignJustify,
  Sliders,
  ChevronDown,
  ChevronUp,
  Move
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
  // Wondershare PDFelement & Microsoft Modern Standard
  'Carlito',
  'Calibri',
  'Calibri Light',
  'Aptos',
  'Aptos Display',
  'Aptos Mono',
  'Aptos Serif',
  // Multilingual & Indic (Hindi / Devanagari)
  'Nirmala UI',
  'Mangal',
  'Kokila',
  'Utsaah',
  'Aparajita',
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

const sampleCanvasBgColor = (
  canvas: HTMLCanvasElement | null,
  cssX: number,
  cssY: number,
  cssW: number,
  cssH: number
): { hex: string; rgb: { r: number; g: number; b: number }; isDark: boolean } => {
  if (!canvas) return { hex: '#ffffff', rgb: { r: 1, g: 1, b: 1 }, isDark: false };
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { hex: '#ffffff', rgb: { r: 1, g: 1, b: 1 }, isDark: false };

    // Calculate canvas internal pixel ratio to accurately map from CSS coordinates to canvas pixel buffer
    const styleW = parseFloat(canvas.style.width) || canvas.clientWidth || 1;
    const styleH = parseFloat(canvas.style.height) || canvas.clientHeight || 1;
    const pixelRatioX = canvas.width / styleW;
    const pixelRatioY = canvas.height / styleH;

    const cx = cssX * pixelRatioX;
    const cy = cssY * pixelRatioY;
    const cw = cssW * pixelRatioX;
    const ch = cssH * pixelRatioY;

    // Sample pixels outside the text box perimeter
    const points = [
      { x: Math.max(2, cx - 6 * pixelRatioX), y: Math.max(2, cy - 4 * pixelRatioY) },
      { x: Math.max(2, cx + cw / 2), y: Math.max(2, cy - 4 * pixelRatioY) },
      { x: Math.min(canvas.width - 3, cx + cw + 6 * pixelRatioX), y: Math.max(2, cy - 4 * pixelRatioY) },
      { x: Math.max(2, cx - 6 * pixelRatioX), y: Math.min(canvas.height - 3, cy + ch + 4 * pixelRatioY) },
      { x: Math.min(canvas.width - 3, cx + cw + 6 * pixelRatioX), y: Math.min(canvas.height - 3, cy + ch + 4 * pixelRatioY) },
    ];

    let rSum = 0, gSum = 0, bSum = 0, valid = 0;
    for (const pt of points) {
      if (pt.x >= 0 && pt.x < canvas.width && pt.y >= 0 && pt.y < canvas.height) {
        const d = ctx.getImageData(Math.round(pt.x), Math.round(pt.y), 1, 1).data;
        if (d[3] > 30) {
          rSum += d[0];
          gSum += d[1];
          bSum += d[2];
          valid++;
        }
      }
    }

    if (valid > 0) {
      let r = Math.round(rSum / valid);
      let g = Math.round(gSum / valid);
      let b = Math.round(bSum / valid);

      // On standard white/light document papers (RGB >= 215), snap to pure #ffffff to prevent dirty gray boxes!
      if (r >= 215 && g >= 215 && b >= 215) {
        r = 255;
        g = 255;
        b = 255;
      }

      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      const isDark = (r * 0.299 + g * 0.587 + b * 0.114) < 128;
      return { hex, rgb: { r: r / 255, g: g / 255, b: b / 255 }, isDark };
    }
  } catch (e) {
    // Canvas context fallback
  }
  return { hex: '#ffffff', rgb: { r: 1, g: 1, b: 1 }, isDark: false };
};

export const resolveCssFontFamily = (family?: string): string => {
  if (!family) return `'Calibri', 'Segoe UI', Arial, sans-serif`;
  const fam = family.toLowerCase();
  if (fam.includes('nirmala') || fam.includes('mangal') || fam.includes('kokila') || fam.includes('utsaah') || fam.includes('devanagari') || fam.includes('hindi')) {
    return `'Nirmala UI', 'Mangal', 'Segoe UI', sans-serif`;
  }
  if (fam.includes('carlito')) {
    return `'Carlito', 'Calibri', 'Segoe UI', Arial, sans-serif`;
  }
  if (fam.includes('times') || fam.includes('roman') || (fam.includes('serif') && !fam.includes('sans'))) {
    return `'Times New Roman', Cambria, Georgia, serif`;
  }
  if (fam.includes('courier') || fam.includes('mono') || fam.includes('consolas')) {
    return `'Courier New', Consolas, monospace`;
  }
  return `'${family}', Calibri, 'Segoe UI', Arial, sans-serif`;
};

export const DOCUMENT_PALETTE = [
  '#000000', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#ffffff',
  '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#0284c7',
  '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#15803d', '#16a34a', '#84cc16',
  '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#c2410c', '#ea580c', '#d97706', '#f59e0b',
  '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#be185d', '#db2777', '#f43f5e', '#fb7185',
];

export function hsvToHex(h: number, s: number, v: number): string {
  s = s / 100;
  v = v / 100;
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
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
  >('view');

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
  const [selectedTextItemId, setSelectedTextItemId] = useState<string | null>(null);

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
  const [isStrikethrough, setIsStrikethrough] = useState<boolean>(false);
  const [isSuperscript, setIsSuperscript] = useState<boolean>(false);
  const [isSubscript, setIsSubscript] = useState<boolean>(false);
  const [lineSpacing, setLineSpacing] = useState<number>(1.15);
  const [characterSpacing, setCharacterSpacing] = useState<number>(0);
  const [paragraphSpacing, setParagraphSpacing] = useState<number>(0);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [textColor, setTextColor] = useState<string>('#000000');

  // Wondershare PDFelement Properties Panel & Advanced Color System
  const [showPropertiesPanel, setShowPropertiesPanel] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });
  const [showColorPickerModal, setShowColorPickerModal] = useState<boolean>(false);
  const [activeColorStudioTab, setActiveColorStudioTab] = useState<'palette' | 'wheel' | 'sliders'>('palette');
  const [hexInput, setHexInput] = useState<string>('#000000');
  const [rgbValues, setRgbValues] = useState<{ r: number; g: number; b: number }>({ r: 0, g: 0, b: 0 });
  const [recentColors, setRecentColors] = useState<string[]>([
    '#000000', '#1E40AF', '#DC2626', '#059669', '#D97706', '#7C3AED', '#0891B2', '#4B5563'
  ]);
  const [isSamplingColor, setIsSamplingColor] = useState<boolean>(false);

  // Update properties on the currently selected or active text item in-place
  const updateActiveTextItemProps = useCallback(
    (patch: Partial<ExistingTextItem>) => {
      const targetId = activeEditingId || selectedTextItemId;
      if (targetId) {
        const originalItem = detectedTextItems.find((t) => t.id === targetId);
        if (originalItem) {
          setModifiedTexts((prev) => {
            const existing = prev[targetId] || { ...originalItem, isModified: true };
            const updated: ExistingTextItem = {
              ...existing,
              ...patch,
              isModified: true,
            };
            return { ...prev, [targetId]: updated };
          });

          setDetectedTextItems((prev) =>
            prev.map((t) => (t.id === targetId ? { ...t, ...patch } : t))
          );
        }
      }

      if (selectedOverlayId) {
        setTextOverlays((prev) =>
          prev.map((t) => {
            if (t.id !== selectedOverlayId) return t;
            return {
              ...t,
              ...(patch.fontFamily ? { fontFamily: patch.fontFamily } : {}),
              ...(patch.fontSize ? { size: patch.fontSize } : {}),
              ...(patch.color ? { color: patch.color } : {}),
              ...(patch.isBold !== undefined ? { isBold: patch.isBold } : {}),
              ...(patch.isItalic !== undefined ? { isItalic: patch.isItalic } : {}),
              ...(patch.isUnderline !== undefined ? { isUnderline: patch.isUnderline } : {}),
              ...(patch.alignment ? { alignment: patch.alignment } : {}),
              ...(patch.lineSpacing !== undefined ? { lineSpacing: patch.lineSpacing } : {}),
              ...(patch.characterSpacing !== undefined ? { characterSpacing: patch.characterSpacing } : {}),
              ...(patch.paragraphSpacing !== undefined ? { paragraphSpacing: patch.paragraphSpacing } : {}),
              ...(patch.rotation !== undefined ? { rotation: patch.rotation } : {}),
            };
          })
        );
      }
    },
    [activeEditingId, selectedTextItemId, selectedOverlayId, detectedTextItems]
  );

  const applyNewColor = useCallback((color: string) => {
    setTextColor(color);
    setHexInput(color);
    updateActiveTextItemProps({ color });
    setRecentColors((prev) => [color, ...prev.filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, 12));
    // Parse hex to rgb
    try {
      const clean = color.replace('#', '');
      if (clean.length === 6) {
        setRgbValues({
          r: parseInt(clean.substring(0, 2), 16),
          g: parseInt(clean.substring(2, 4), 16),
          b: parseInt(clean.substring(4, 6), 16),
        });
      }
    } catch {
      // Ignored
    }
  }, [updateActiveTextItemProps]);

  const handleOpenEyedropper = async () => {
    if (typeof window !== 'undefined' && (window as any).EyeDropper) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const res = await eyeDropper.open();
        if (res && res.sRGBHex) {
          applyNewColor(res.sRGBHex);
        }
      } catch {
        // User dismissed
      }
    } else {
      // Fallback crosshair on document canvas
      setIsSamplingColor(true);
      setShowColorPickerModal(false);
    }
  };

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

            // Inpaint canvas ONLY for items that have been modified by the user
            const itemsToInpaint = Object.values(modifiedTexts).filter(
              (t) => t.pageIndex === currentPage - 1 && t.isModified && t.currentText !== t.originalText
            );

            if (itemsToInpaint && itemsToInpaint.length > 0) {
              const scaleX = targetCanvas.width / (cssWidth / zoomScale);
              const scaleY = targetCanvas.height / (cssHeight / zoomScale);
              for (const item of itemsToInpaint) {
                const bg = item.backgroundColor || { r: 1, g: 1, b: 1 };
                const r = Math.round(bg.r * 255);
                const g = Math.round(bg.g * 255);
                const b = Math.round(bg.b * 255);
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                const canvasX = item.x * scaleX;
                const canvasY = targetCanvas.height - (item.y + item.height) * scaleY;
                const canvasW = item.width * scaleX;
                const canvasH = item.height * scaleY;
                const padX = Math.max(1.5, scaleX * 0.4);
                const padY = Math.max(1.5, scaleY * 0.4);
                ctx.fillRect(canvasX - padX, canvasY - padY, canvasW + padX * 2, canvasH + padY * 2);
              }
            }
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

  // Rotate Selected Element (Text, Image, Signature) or Page
  const handleRotateCurrentSelectionOrPage = () => {
    if (selectedOverlayId) {
      const isText = textOverlays.some((t) => t.id === selectedOverlayId);
      if (isText) {
        setTextOverlays((prev) =>
          prev.map((t) =>
            t.id === selectedOverlayId ? { ...t, rotation: ((t.rotation || 0) + 90) % 360 } : t
          )
        );
        pushSnapshot({ textOverlays });
        return;
      }
      const isImg = imageOverlays.some((i) => i.id === selectedOverlayId);
      if (isImg) {
        setImageOverlays((prev) =>
          prev.map((i) =>
            i.id === selectedOverlayId ? { ...i, rotation: ((i.rotation || 0) + 90) % 360 } : i
          )
        );
        pushSnapshot({ imageOverlays });
        return;
      }
    } else if (activeEditingId || selectedTextItemId) {
      const targetId = activeEditingId || selectedTextItemId;
      const current = modifiedTexts[targetId!] || detectedTextItems.find((t) => t.id === targetId);
      const newRot = (((current?.rotation || 0) + 90) % 360);
      updateActiveTextItemProps({ rotation: newRot, isModified: true });
      return;
    }
    handleRotatePage();
  };

  // Click on Canvas to Add Text or Hyperlink
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 0 || clickY < 0 || clickX > rect.width || clickY > rect.height) return;

    if (isSamplingColor) {
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const pixelRatio = canvasRef.current.width / rect.width;
        const p = ctx.getImageData(Math.floor(clickX * pixelRatio), Math.floor(clickY * pixelRatio), 1, 1).data;
        const hex = `#${((1 << 24) + (p[0] << 16) + (p[1] << 8) + p[2]).toString(16).slice(1)}`;
        applyNewColor(hex);
      }
      setIsSamplingColor(false);
      return;
    }

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

  // Desktop Global Keyboard Shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+E, Ctrl+L, Ctrl+R, Ctrl+Z, Ctrl+Y, Ctrl+X, Ctrl+S, Ctrl+P)
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z (without shift)
      if (isCtrlOrMeta && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((isCtrlOrMeta && e.key.toLowerCase() === 'y') || (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Save: Ctrl+S
      if (isCtrlOrMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Print: Ctrl+P
      if (isCtrlOrMeta && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
        return;
      }

      // Bold: Ctrl+B
      if (isCtrlOrMeta && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        const next = !isBold;
        setIsBold(next);
        updateActiveTextItemProps({ isBold: next });
        return;
      }

      // Italic: Ctrl+I
      if (isCtrlOrMeta && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        const next = !isItalic;
        setIsItalic(next);
        updateActiveTextItemProps({ isItalic: next });
        return;
      }

      // Underline: Ctrl+U
      if (isCtrlOrMeta && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        const next = !isUnderline;
        setIsUnderline(next);
        updateActiveTextItemProps({ isUnderline: next });
        return;
      }

      // Align Center: Ctrl+E
      if (isCtrlOrMeta && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setAlignment('center');
        updateActiveTextItemProps({ alignment: 'center' });
        return;
      }

      // Align Left: Ctrl+L
      if (isCtrlOrMeta && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setAlignment('left');
        updateActiveTextItemProps({ alignment: 'left' });
        return;
      }

      // Align Right: Ctrl+R
      if (isCtrlOrMeta && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setAlignment('right');
        updateActiveTextItemProps({ alignment: 'right' });
        return;
      }

      // Cut: Ctrl+X (when text selected or item active)
      if (isCtrlOrMeta && e.key.toLowerCase() === 'x') {
        const activeItem = activeEditingId || selectedTextItemId;
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeItem && tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          const currentVal =
            modifiedTexts[activeItem]?.currentText ??
            detectedTextItems.find((t) => t.id === activeItem)?.originalText ??
            '';
          navigator.clipboard?.writeText(currentVal);
          updateActiveTextItemProps({ currentText: '', isModified: true });
          return;
        }
      }

      // Delete item when selected and not typing in an input
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedOverlayId || selectedTextItemId)) {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          if (selectedOverlayId) {
            setTextOverlays((prev) => prev.filter((t) => t.id !== selectedOverlayId));
            setImageOverlays((prev) => prev.filter((i) => i.id !== selectedOverlayId));
            setHyperlinks((prev) => prev.filter((h) => h.id !== selectedOverlayId));
            setSelectedOverlayId(null);
          } else if (selectedTextItemId) {
            updateActiveTextItemProps({ currentText: '', isModified: true });
          }
          return;
        }
      }

      // Escape: clear selection / cancel edit
      if (e.key === 'Escape') {
        setActiveEditingId(null);
        setSelectedTextItemId(null);
        setSelectedOverlayId(null);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    isOpen,
    isBold,
    isItalic,
    isUnderline,
    activeEditingId,
    selectedTextItemId,
    selectedOverlayId,
    detectedTextItems,
    modifiedTexts,
    handleUndo,
    handleRedo,
    updateActiveTextItemProps,
  ]);

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
              <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
              <span className="truncate">{tab.name}</span>
              {tabHasEdits && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 animate-pulse" title="Unsaved edits" />
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 border border-dashed border-zinc-800 hover:border-indigo-500/50 cursor-pointer transition-all flex-shrink-0 text-xs font-semibold"
          title="Open Document in New Tab (PDF, Word, Excel, Images, Text)"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
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
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500'
              }`}
              title="Automatically save changes on close or edits"
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  autoSaveEnabled ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-400'
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
                saveSuccess ? 'bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-500'
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
          onClick={() => {
            setActiveTool('view');
            setActiveEditingId(null);
            setSelectedTextItemId(null);
            setSelectedOverlayId(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTool === 'view'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700'
          }`}
          title="Read Mode - Pristine viewing without edit bounding boxes"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Read Mode</span>
        </button>

        <button
          onClick={() => {
            setActiveTool('edit-text');
            setSelectedOverlayId(null);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTool === 'edit-text'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700'
          }`}
          title="Edit Text - Click any text on page to edit in-place naturally"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Text</span>
        </button>

        <button
          onClick={() => {
            setActiveTool('add-text');
            setActiveEditingId(null);
            setSelectedTextItemId(null);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTool === 'add-text'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700'
          }`}
          title="Add Text - Insert new formatted text anywhere on document"
        >
          <Type className="w-3.5 h-3.5" />
          <span>Add Text</span>
        </button>

        <button
          onClick={() => setActiveTool('add-link')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeTool === 'add-link'
              ? 'bg-indigo-600 text-white shadow-xs'
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
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100/50 shadow-xs"
          title="Extract text with bounding boxes on current page to make scanned document editable"
        >
          {isOcrScanningPage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanText className="w-3.5 h-3.5 text-indigo-500" />}
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

        <button
          onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            showPropertiesPanel
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
          }`}
          title="Toggle Properties Sidebar"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Properties</span>
        </button>
      </div>

      {/* TIER 3: High-Contrast MS Word Formatting Bar (Active for both 'Edit Text' and 'Add Text') */}
      {(activeTool === 'edit-text' || activeTool === 'add-text') && (
        <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-1.5 bg-slate-100 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-800 text-xs z-20 flex-shrink-0 animate-fade-in overflow-x-auto no-scrollbar">
          {activeTool === 'add-text' && (
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Type text to place on page..."
              className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-xs w-36 sm:w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-xs"
            />
          )}

          {/* Full MS Word Fonts Dropdown - 100% High Contrast & Readable on Windows Desktop */}
          <select
            value={fontFamily}
            onChange={(e) => {
              const newFam = e.target.value;
              setFontFamily(newFam);
              updateActiveTextItemProps({ fontFamily: newFam });
            }}
            className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-xs shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer max-w-[160px] sm:max-w-[200px]"
            title="Font Family"
          >
            {MS_WORD_FONTS.map((font) => (
              <option
                key={font}
                value={font}
                style={{
                  fontFamily: font,
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                }}
                className="text-zinc-900 bg-white py-1"
              >
                {font}
              </option>
            ))}
          </select>

          {/* Font Size Stepper & Direct Input */}
          <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const newSize = Math.max(8, fontSize - 1);
                setFontSize(newSize);
                updateActiveTextItemProps({ fontSize: newSize });
              }}
              className="px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-colors"
              title="Decrease Font Size"
            >
              -
            </button>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 6 && val <= 120) {
                  setFontSize(val);
                  updateActiveTextItemProps({ fontSize: val });
                }
              }}
              className="w-10 text-center text-xs font-mono font-bold bg-transparent text-zinc-800 dark:text-zinc-200 border-x border-zinc-200 dark:border-zinc-700 py-0.5 focus:outline-none"
            />
            <span className="text-[10px] text-zinc-500 pr-1 select-none font-semibold">pt</span>
            <button
              type="button"
              onClick={() => {
                const newSize = Math.min(120, fontSize + 1);
                setFontSize(newSize);
                updateActiveTextItemProps({ fontSize: newSize });
              }}
              className="px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-colors"
              title="Increase Font Size"
            >
              +
            </button>
          </div>

          {/* Bold, Italic, Underline */}
          <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-xs overflow-hidden p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => {
                const next = !isBold;
                setIsBold(next);
                updateActiveTextItemProps({ isBold: next });
              }}
              className={`p-1.5 rounded-md transition-all ${
                isBold
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !isItalic;
                setIsItalic(next);
                updateActiveTextItemProps({ isItalic: next });
              }}
              className={`p-1.5 rounded-md transition-all ${
                isItalic
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !isUnderline;
                setIsUnderline(next);
                updateActiveTextItemProps({ isUnderline: next });
              }}
              className={`p-1.5 rounded-md transition-all ${
                isUnderline
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Alignment (Left, Center, Right) */}
          <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-xs overflow-hidden p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => {
                setAlignment('left');
                updateActiveTextItemProps({ alignment: 'left' });
              }}
              className={`p-1.5 rounded-md transition-all ${
                alignment === 'left'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Align Left (Ctrl+L)"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setAlignment('center');
                updateActiveTextItemProps({ alignment: 'center' });
              }}
              className={`p-1.5 rounded-md transition-all ${
                alignment === 'center'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Align Center (Ctrl+E)"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setAlignment('right');
                updateActiveTextItemProps({ alignment: 'right' });
              }}
              className={`p-1.5 rounded-md transition-all ${
                alignment === 'right'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Align Right (Ctrl+R)"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Text Color Picker, Eyedropper & Studio Trigger */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 shadow-xs">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">Color</label>
            <input
              type="color"
              value={textColor}
              onChange={(e) => {
                const newColor = e.target.value;
                setTextColor(newColor);
                updateActiveTextItemProps({ color: newColor });
              }}
              className="w-5 h-5 rounded cursor-pointer border border-zinc-300 dark:border-zinc-600 bg-transparent p-0"
              title="Pick Custom Text Color"
            />
            {['#000000', '#1e40af', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setTextColor(c);
                  updateActiveTextItemProps({ color: c });
                }}
                style={{ backgroundColor: c }}
                className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/20 transition-transform hover:scale-125"
                title={c}
              />
            ))}
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
            <button
              type="button"
              onClick={handleOpenEyedropper}
              className="p-1 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              title="Sample Color from Document (Eyedropper)"
            >
              <Pipette className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowColorPickerModal(true)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800 transition-colors"
              title="Open Color Studio (Color Wheel, Eyedropper, Palette, HEX/RGB)"
            >
              <Palette className="w-3 h-3" />
              <span>Studio</span>
            </button>
          </div>

          {/* Clear Text button when text item is selected */}
          {(activeEditingId || selectedTextItemId || selectedOverlayId) && (
            <button
              type="button"
              onClick={() => {
                if (selectedOverlayId) {
                  setTextOverlays((prev) => prev.filter((t) => t.id !== selectedOverlayId));
                  setImageOverlays((prev) => prev.filter((i) => i.id !== selectedOverlayId));
                  setHyperlinks((prev) => prev.filter((h) => h.id !== selectedOverlayId));
                  setSelectedOverlayId(null);
                } else if (activeEditingId || selectedTextItemId) {
                  updateActiveTextItemProps({ currentText: '', isModified: true });
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors text-xs font-semibold shadow-xs"
              title="Clear/Delete Text (Delete / Backspace)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Text</span>
            </button>
          )}

          <span className="text-[11px] text-zinc-500 font-medium italic ml-auto hidden lg:inline select-none">
            {activeTool === 'edit-text'
              ? activeEditingId
                ? 'Editing text in-place • Enter to save • Esc to cancel'
                : 'Click any text on the page to edit in-place'
              : 'Tap anywhere on the page to place formatted text'}
          </span>
        </div>
      )}

      {/* Main Workspace Body: Sidebar + Scrollable Viewport */}
      <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden relative">
        {/* Left Thumbnail Sidebar */}
        {showSidebar && totalPages > 0 && (
          <aside className="w-44 sm:w-52 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-20 flex-shrink-0 animate-fade-in shadow-xs">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <span>Pages ({totalPages})</span>
              <button
                onClick={() => handleInsertBlankPage('end')}
                className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
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
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
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
          className="flex-1 min-h-[35vh] overflow-auto bg-slate-200/70 dark:bg-zinc-950 relative"
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

            {/* Scanned Document / Image Detected Banner (Professional OCR extraction) */}
            {activeTool === 'edit-text' && detectedTextItems.length === 0 && !isRendering && (
              <div className="mb-4 max-w-2xl w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <ScanText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">Scanned Document Detected</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      No vector text layer found. Run OCR to recognize text and enable in-place editing.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={ocrLanguage}
                    onChange={(e) => setOcrLanguage(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="eng+hin">English + Hindi</option>
                    <option value="eng">English</option>
                    <option value="hin">Hindi</option>
                  </select>
                  <button
                    onClick={() => handleRunOcrOnCurrentPage(ocrLanguage)}
                    disabled={isOcrScanningPage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-xs active:scale-95 disabled:opacity-50 transition-colors"
                  >
                    {isOcrScanningPage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ScanText className="w-3.5 h-3.5" />
                    )}
                    <span>{isOcrScanningPage ? 'Extracting Text...' : 'Extract Text (OCR)'}</span>
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
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
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
                const currentItem = modifiedTexts[item.id] || item;
                const currentTextVal = currentItem.currentText ?? item.originalText;
                const isItemModified = currentItem.isModified;
                const isEditing = activeEditingId === item.id;
                const isSelected = selectedTextItemId === item.id;

                const itemFontFamily = currentItem.fontFamily ?? item.fontFamily ?? 'Calibri';
                const itemFontSize = currentItem.fontSize ?? item.fontSize ?? 12;
                const itemIsBold = currentItem.isBold ?? item.isBold ?? false;
                const itemIsItalic = currentItem.isItalic ?? item.isItalic ?? false;
                const itemIsUnderline = currentItem.isUnderline ?? item.isUnderline ?? false;
                const itemAlign = currentItem.alignment ?? item.alignment ?? 'left';

                const scale = zoomScale;
                const cssX = item.x * scale;
                const cssY = viewportDims.height - item.y * scale - item.height * scale;
                const cssW = Math.max(12, item.width * scale);
                const cssH = Math.max(10, item.height * scale);

                // Enclose full text line including descenders (g, j, p, q, y, commas) and ascenders
                // In PDF coordinates, (viewportDims.height - item.y * scale) is the baseline.
                // Descenders extend ~35% below the baseline, so we expand downwards and upwards to cover 100%
                const descenderDepth = Math.max(4, Math.round(itemFontSize * scale * 0.35));
                const ascenderExtra = Math.max(2, Math.round(itemFontSize * scale * 0.15));

                const boxX = Math.max(0, cssX - 2);
                const boxY = Math.max(0, cssY - ascenderExtra);
                const boxW = cssW + 6;
                const boxH = cssH + ascenderExtra + descenderDepth;

                const cssFontFamily = resolveCssFontFamily(itemFontFamily);
                const sampledBg = sampleCanvasBgColor(canvasRef.current, cssX, cssY, cssW, cssH);
                const textColor = currentItem.color || item.color || (sampledBg.isDark ? '#f8fafc' : '#0f172a');

                return (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEditingId(item.id);
                      setSelectedTextItemId(item.id);
                      setSelectedOverlayId(null);
                      setShowPropertiesPanel(true);
                      setFontFamily(itemFontFamily);
                      setFontSize(itemFontSize);
                      setIsBold(itemIsBold);
                      setIsItalic(itemIsItalic);
                      setIsUnderline(itemIsUnderline);
                      setIsStrikethrough(currentItem.isStrikethrough ?? false);
                      setIsSuperscript(currentItem.isSuperscript ?? false);
                      setIsSubscript(currentItem.isSubscript ?? false);
                      setLineSpacing(currentItem.lineSpacing ?? 1.15);
                      setCharacterSpacing(currentItem.characterSpacing ?? 0);
                      setAlignment(itemAlign);
                      setTextColor(textColor);
                      setHexInput(textColor);
                    }}
                    style={{
                      left: `${boxX}px`,
                      top: `${boxY}px`,
                      width: `${boxW}px`,
                      height: `${boxH}px`,
                      backgroundColor: isEditing || isItemModified ? sampledBg.hex : 'transparent',
                    }}
                    className={`absolute transition-all cursor-text rounded-none ${
                      isEditing
                        ? 'border-[1.5px] border-blue-500 ring-2 ring-blue-500/20 z-40'
                        : isSelected
                        ? 'border-[1.5px] border-blue-500 ring-1 ring-blue-500/10 z-30'
                        : 'border border-transparent hover:border-blue-400/40'
                    }`}
                  >
                    {/* 8 Wondershare PDFelement boundary selection handles */}
                    {(isEditing || isSelected) && (
                      <>
                        <span className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-blue-600 rounded-full z-50 pointer-events-none" />
                        <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-blue-600 rounded-full z-50 pointer-events-none" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-blue-600 rounded-full z-50 pointer-events-none" />
                        <span className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-white border border-blue-600 rounded-full z-50 pointer-events-none" />
                        <span className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-white border border-blue-600 rounded-full z-50 pointer-events-none" />
                        <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-blue-600 rounded-full z-50 pointer-events-none" />
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-blue-600 rounded-full z-50 pointer-events-none" />
                        <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-blue-600 rounded-full z-50 pointer-events-none" />
                      </>
                    )}

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
                              fontFamily: itemFontFamily,
                              fontSize: itemFontSize,
                              isBold: itemIsBold,
                              isItalic: itemIsItalic,
                              isUnderline: itemIsUnderline,
                              isStrikethrough: currentItem.isStrikethrough ?? false,
                              isSuperscript: currentItem.isSuperscript ?? false,
                              isSubscript: currentItem.isSubscript ?? false,
                              lineSpacing: currentItem.lineSpacing ?? 1.15,
                              characterSpacing: currentItem.characterSpacing ?? 0,
                              alignment: itemAlign,
                              color: textColor,
                              backgroundColor: item.backgroundColor || sampledBg.rgb,
                              isModified: true,
                            },
                          }));
                        }}
                        onBlur={() => {
                          setActiveEditingId(null);
                          pushSnapshot({ modifiedTexts });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setActiveEditingId(null);
                            pushSnapshot({ modifiedTexts });
                          } else if (e.key === 'Escape') {
                            setActiveEditingId(null);
                          }
                        }}
                        style={{
                          fontFamily: cssFontFamily,
                          fontWeight: itemIsBold ? 700 : 400,
                          fontStyle: itemIsItalic ? 'italic' : 'normal',
                          textDecoration: itemIsUnderline
                            ? 'underline'
                            : currentItem.isStrikethrough
                            ? 'line-through'
                            : 'none',
                          fontSize: `${itemFontSize * scale}px`,
                          color: textColor,
                          textAlign: itemAlign,
                          caretColor: '#2563eb',
                          backgroundColor: sampledBg.hex,
                          letterSpacing: `${(currentItem.characterSpacing ?? 0) * scale}px`,
                          lineHeight: currentItem.lineSpacing ? `${currentItem.lineSpacing}` : 'normal',
                          transform: currentItem.rotation ? `rotate(${currentItem.rotation}deg)` : undefined,
                        }}
                        className="w-full h-full p-0 m-0 border-0 outline-none select-text"
                      />
                    ) : isItemModified ? (
                      <div
                        style={{
                          fontFamily: cssFontFamily,
                          fontWeight: itemIsBold ? 700 : 400,
                          fontStyle: itemIsItalic ? 'italic' : 'normal',
                          textDecoration: itemIsUnderline
                            ? 'underline'
                            : currentItem.isStrikethrough
                            ? 'line-through'
                            : 'none',
                          fontSize: `${itemFontSize * scale}px`,
                          color: textColor,
                          textAlign: itemAlign,
                          backgroundColor: sampledBg.hex,
                          letterSpacing: `${(currentItem.characterSpacing ?? 0) * scale}px`,
                          lineHeight: currentItem.lineSpacing ? `${currentItem.lineSpacing}` : 'normal',
                          marginBottom: currentItem.paragraphSpacing ? `${currentItem.paragraphSpacing * scale}px` : undefined,
                          transform: currentItem.rotation ? `rotate(${currentItem.rotation}deg)` : undefined,
                        }}
                        className="w-full h-full truncate px-0 flex items-center select-text"
                      >
                        {currentTextVal}
                      </div>
                    ) : null}
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

      {/* Wondershare PDFelement Right Properties Sidebar / Mobile Bottom Sheet */}
      {showPropertiesPanel && (
        <aside className="w-full sm:w-72 max-h-[46vh] sm:max-h-none bg-white dark:bg-zinc-900 border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-20 flex-shrink-0 animate-fade-in shadow-xl sm:shadow-xs overflow-y-auto select-none">
          {/* Mobile Bottom Sheet Pull Handle */}
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-1.5 sm:hidden shrink-0" />

          {/* Panel Header */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Properties
            </div>
            <button
              onClick={() => setShowPropertiesPanel(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Close Properties Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-4 text-xs">
            {/* Type Indicator */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Type
              </div>
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
                {activeEditingId || selectedTextItemId ? 'Text' : selectedOverlayId ? 'Overlay Element' : 'Document Page'}
              </div>
            </div>

            {/* SECTION 1: FONTS */}
            <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                ▾ Fonts
              </div>

              {/* Font Family Dropdown */}
              <select
                value={fontFamily}
                onChange={(e) => {
                  const newFam = e.target.value;
                  setFontFamily(newFam);
                  updateActiveTextItemProps({ fontFamily: newFam });
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-xs shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {MS_WORD_FONTS.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>

              {/* Font Size & Color Row */}
              <div className="flex items-center gap-1.5">
                <div className="flex-1 flex items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-xs overflow-hidden">
                  <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 6 && val <= 120) {
                        setFontSize(val);
                        updateActiveTextItemProps({ fontSize: val });
                      }
                    }}
                    className="w-full text-center text-xs font-mono font-bold bg-transparent text-zinc-800 dark:text-zinc-200 py-1 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 pr-1.5 font-medium">pt</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newSize = Math.min(120, fontSize + 1);
                    setFontSize(newSize);
                    updateActiveTextItemProps({ fontSize: newSize });
                  }}
                  className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold transition-colors"
                  title="Increase Font Size (A^)"
                >
                  A<span className="text-[9px] align-super">▲</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newSize = Math.max(6, fontSize - 1);
                    setFontSize(newSize);
                    updateActiveTextItemProps({ fontSize: newSize });
                  }}
                  className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold transition-colors"
                  title="Decrease Font Size (A_)"
                >
                  A<span className="text-[9px] align-sub">▼</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowColorPickerModal(true)}
                  className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                  title="Open Color Wheel & Palette"
                >
                  <span
                    className="w-5 h-5 rounded-md border border-zinc-300 dark:border-zinc-600 shadow-xs block"
                    style={{ backgroundColor: textColor }}
                  />
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                </button>
              </div>

              {/* Styles Row: B, I, U, S, A^, A_ */}
              <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-0.5 gap-0.5 justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isBold;
                    setIsBold(next);
                    updateActiveTextItemProps({ isBold: next });
                  }}
                  className={`flex-1 py-1 text-center font-bold rounded-md transition-all ${
                    isBold ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isItalic;
                    setIsItalic(next);
                    updateActiveTextItemProps({ isItalic: next });
                  }}
                  className={`flex-1 py-1 text-center italic font-serif rounded-md transition-all ${
                    isItalic ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isUnderline;
                    setIsUnderline(next);
                    updateActiveTextItemProps({ isUnderline: next });
                  }}
                  className={`flex-1 py-1 text-center underline rounded-md transition-all ${
                    isUnderline ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Underline (Ctrl+U)"
                >
                  U
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isStrikethrough;
                    setIsStrikethrough(next);
                    updateActiveTextItemProps({ isStrikethrough: next });
                  }}
                  className={`flex-1 py-1 text-center line-through rounded-md transition-all ${
                    isStrikethrough ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Strikethrough"
                >
                  S
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isSuperscript;
                    setIsSuperscript(next);
                    if (next) setIsSubscript(false);
                    updateActiveTextItemProps({ isSuperscript: next, isSubscript: false });
                  }}
                  className={`flex-1 py-1 text-center text-[10px] rounded-md transition-all ${
                    isSuperscript ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Superscript (A^)"
                >
                  A²
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isSubscript;
                    setIsSubscript(next);
                    if (next) setIsSuperscript(false);
                    updateActiveTextItemProps({ isSubscript: next, isSuperscript: false });
                  }}
                  className={`flex-1 py-1 text-center text-[10px] rounded-md transition-all ${
                    isSubscript ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Subscript (A_)"
                >
                  A₂
                </button>
              </div>

              {/* Alignment Row */}
              <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-0.5 gap-0.5 justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setAlignment('left');
                    updateActiveTextItemProps({ alignment: 'left' });
                  }}
                  className={`flex-1 p-1 flex items-center justify-center rounded-md transition-all ${
                    alignment === 'left' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Align Left (Ctrl+L)"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAlignment('center');
                    updateActiveTextItemProps({ alignment: 'center' });
                  }}
                  className={`flex-1 p-1 flex items-center justify-center rounded-md transition-all ${
                    alignment === 'center' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Align Center (Ctrl+E)"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAlignment('right');
                    updateActiveTextItemProps({ alignment: 'right' });
                  }}
                  className={`flex-1 p-1 flex items-center justify-center rounded-md transition-all ${
                    alignment === 'right' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Align Right (Ctrl+R)"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAlignment('justify' as any);
                    updateActiveTextItemProps({ alignment: 'justify' as any });
                  }}
                  className={`flex-1 p-1 flex items-center justify-center rounded-md transition-all ${
                    (alignment as any) === 'justify' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                  title="Justify"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* SECTION 2: SPACING */}
            <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                ▾ Spacing
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-medium">↕ Line Spacing</label>
                  <input
                    type="number"
                    step="0.05"
                    value={lineSpacing}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setLineSpacing(val);
                        updateActiveTextItemProps({ lineSpacing: val });
                      }
                    }}
                    className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 font-medium">↔ Kerning (AV)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={characterSpacing}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setCharacterSpacing(val);
                        updateActiveTextItemProps({ characterSpacing: val });
                      }
                    }}
                    className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-medium">¶ Paragraph Spacing (pt)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={paragraphSpacing}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      setParagraphSpacing(val);
                      updateActiveTextItemProps({ paragraphSpacing: val });
                    }
                  }}
                  className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                />
              </div>
            </div>

            {/* SECTION 3: APPEARANCE */}
            <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                ▾ Appearance
              </div>
              {(() => {
                const targetItem = detectedTextItems.find((t) => t.id === (activeEditingId || selectedTextItemId)) ||
                  textOverlays.find((t) => t.id === selectedOverlayId);
                return (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-medium">Position X (pt)</label>
                      <div className="px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 font-mono">
                        {targetItem ? targetItem.x.toFixed(1) : '0.0'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-medium">Position Y (pt)</label>
                      <div className="px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 font-mono">
                        {targetItem ? targetItem.y.toFixed(1) : '0.0'}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* SECTION 4: ACTIONS */}
            <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                ▾ Actions
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRotateCurrentSelectionOrPage}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition-colors"
                  title={activeEditingId || selectedTextItemId || selectedOverlayId ? 'Rotate Selected Element 90° Clockwise' : 'Rotate Document Page 90° Clockwise'}
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{activeEditingId || selectedTextItemId || selectedOverlayId ? 'Rotate Element 90°' : 'Rotate Page 90°'}</span>
                </button>
                {(activeEditingId || selectedTextItemId || selectedOverlayId) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedOverlayId) {
                        setTextOverlays((prev) => prev.filter((t) => t.id !== selectedOverlayId));
                        setImageOverlays((prev) => prev.filter((i) => i.id !== selectedOverlayId));
                        setHyperlinks((prev) => prev.filter((h) => h.id !== selectedOverlayId));
                        setSelectedOverlayId(null);
                      } else if (activeEditingId || selectedTextItemId) {
                        updateActiveTextItemProps({ currentText: '', isModified: true });
                      }
                    }}
                    className="flex items-center justify-center p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition-colors"
                    title="Clear or Delete Element"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>

    {/* Advanced Color Studio Popover Modal */}
    {showColorPickerModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
        onClick={() => setShowColorPickerModal(false)}
      >
        <div
          className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Color Studio</span>
            </div>
            <button
              onClick={() => setShowColorPickerModal(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color Tabs */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveColorStudioTab('palette')}
              className={`flex-1 py-1 rounded-md text-center font-medium transition-colors ${
                activeColorStudioTab === 'palette'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Palette
            </button>
            <button
              onClick={() => setActiveColorStudioTab('wheel')}
              className={`flex-1 py-1 rounded-md text-center font-medium transition-colors ${
                activeColorStudioTab === 'wheel'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Wheel
            </button>
            <button
              onClick={() => setActiveColorStudioTab('sliders')}
              className={`flex-1 py-1 rounded-md text-center font-medium transition-colors ${
                activeColorStudioTab === 'sliders'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              RGB Sliders
            </button>
          </div>

          {/* Tab 1: Preset Swatches */}
          {activeColorStudioTab === 'palette' && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Document & Standard Colors
              </div>
              <div className="grid grid-cols-8 gap-1.5 py-1">
                {DOCUMENT_PALETTE.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => applyNewColor(swatch)}
                    className="w-6 h-6 rounded-md border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform shadow-xs"
                    style={{ backgroundColor: swatch }}
                    title={swatch}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Spectrum Wheel */}
          {activeColorStudioTab === 'wheel' && (
            <div className="py-2 flex flex-col items-center">
              <div
                className="w-36 h-36 rounded-full cursor-crosshair border border-zinc-200 dark:border-zinc-700 shadow-inner relative"
                style={{
                  background:
                    'radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0) 80%), conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left - rect.width / 2;
                  const y = e.clientY - rect.top - rect.height / 2;
                  const rad = Math.atan2(y, x);
                  const deg = (rad * 180 / Math.PI + 360) % 360;
                  const dist = Math.min(1, Math.sqrt(x * x + y * y) / (rect.width / 2));
                  const hex = hsvToHex(deg, dist * 100, 100);
                  applyNewColor(hex);
                }}
              />
              <div className="text-[10px] text-zinc-400 mt-2">Click anywhere on spectrum wheel to pick hue</div>
            </div>
          )}

          {/* Tab 3: RGB Sliders */}
          {activeColorStudioTab === 'sliders' && (
            <div className="space-y-2 py-1">
              {(['r', 'g', 'b'] as const).map((channel) => (
                <div key={channel} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="uppercase font-bold text-zinc-600 dark:text-zinc-400">{channel}</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">{rgbValues[channel]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={rgbValues[channel]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const nextRgb = { ...rgbValues, [channel]: val };
                      setRgbValues(nextRgb);
                      const hex = `#${((1 << 24) + (nextRgb.r << 16) + (nextRgb.g << 8) + nextRgb.b).toString(16).slice(1)}`;
                      applyNewColor(hex);
                    }}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Recent Colors
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {recentColors.map((color, idx) => (
                  <button
                    key={`${color}-${idx}`}
                    type="button"
                    onClick={() => applyNewColor(color)}
                    className="w-5 h-5 rounded-md border border-zinc-300 dark:border-zinc-600 hover:scale-110 transition-transform shadow-xs"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* HEX Input & Eyedropper Bar */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleOpenEyedropper}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors shrink-0"
              title="Sample Color from Screen or Document"
            >
              <Pipette className="w-3.5 h-3.5 text-blue-500" />
              <span>Eyedropper</span>
            </button>

            <div className="flex-1 flex items-center bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2 py-1">
              <span className="text-zinc-400 font-mono text-xs select-none pr-1">#</span>
              <input
                type="text"
                maxLength={7}
                value={hexInput.replace('#', '')}
                onChange={(e) => {
                  const val = '#' + e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                  setHexInput(val);
                  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                    applyNewColor(val);
                  }
                }}
                placeholder="000000"
                className="w-full text-xs font-mono font-bold bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none uppercase"
              />
              <div
                className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0 ml-1"
                style={{ backgroundColor: textColor }}
              />
            </div>
          </div>
        </div>
      </div>
    )}

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
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors"
              >
                Discard & Close
              </button>
              <button
                onClick={async () => {
                  await handleSave();
                  setShowCloseConfirmModal(false);
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
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
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
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
                className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors text-center shadow-xs"
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
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs"
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
