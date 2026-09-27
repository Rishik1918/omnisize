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
  LayoutGrid,
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
  Move,
  Shapes,
  Table as TableIcon,
  Crop,
  List,
  ListOrdered,
  CornerRightDown,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Settings,
  Copy,
  Square,
  Hash,
  Pen,
  Highlighter,
  Eraser,
  PenTool,
  Stamp,
  Layers,
  Spline,
  FileUp,
  FilePlus2
} from 'lucide-react';
import {
  PdfStudioEngine,
  TextOverlay,
  ImageOverlay,
  ShapeOverlay,
  TableOverlay,
  ShapeType,
  ExistingTextItem,
  HyperlinkOverlay,
  InsertBlankPageSpec,
  PageBorderConfig,
  PageBorderType,
  PageNumberConfig,
  PageNumberPosition,
  PageNumberFormat,
  PageNumberFilter,
  DrawingStroke,
  DrawingPoint,
  WatermarkConfig
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
import { WatermarkModal } from './WatermarkModal';
import { PageNumberModal } from './PageNumberModal';
import { PageBorderModal } from './PageBorderModal';
import { InsertPageModal } from './InsertPageModal';
import {
  saveActivePdfSession,
  loadActivePdfSession,
  clearActivePdfSession,
} from '../../utils/pdfSessionPersistence';

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

export interface PageSizeSpec {
  id: string;
  name: string;
  width: number; // in pt (1 inch = 72 pt)
  height: number; // in pt
  description: string;
}

export const MS_WORD_PAGE_SIZES: PageSizeSpec[] = [
  { id: 'same', name: 'Same as Document', width: 0, height: 0, description: 'Match current document size' },
  { id: 'letter', name: 'Letter', width: 612, height: 792, description: '8.5" × 11" (215.9 × 279.4 mm)' },
  { id: 'a4', name: 'A4', width: 595.28, height: 841.89, description: '8.27" × 11.69" (210 × 297 mm)' },
  { id: 'legal', name: 'Legal', width: 612, height: 1008, description: '8.5" × 14" (215.9 × 355.6 mm)' },
  { id: 'tabloid', name: 'Tabloid', width: 792, height: 1224, description: '11" × 17" (279.4 × 431.8 mm)' },
  { id: 'executive', name: 'Executive', width: 522, height: 756, description: '7.25" × 10.5" (184.1 × 266.7 mm)' },
  { id: 'a3', name: 'A3', width: 841.89, height: 1190.55, description: '11.69" × 16.54" (297 × 420 mm)' },
  { id: 'a5', name: 'A5', width: 419.53, height: 595.28, description: '5.83" × 8.27" (148 × 210 mm)' },
  { id: 'b4-jis', name: 'B4 (JIS)', width: 728.50, height: 1031.81, description: '10.12" × 14.33" (257 × 364 mm)' },
  { id: 'b5-jis', name: 'B5 (JIS)', width: 515.91, height: 728.50, description: '7.17" × 10.12" (182 × 257 mm)' },
  { id: 'statement', name: 'Statement', width: 396, height: 612, description: '5.5" × 8.5" (139.7 × 215.9 mm)' },
  { id: 'folio', name: 'Folio', width: 612, height: 936, description: '8.5" × 13" (215.9 × 330.2 mm)' },
];

export interface MarginPreset {
  id: string;
  name: string;
  top: number; // in pt (72 pt = 1 inch)
  bottom: number;
  left: number;
  right: number;
  description: string;
}

export const MS_WORD_MARGINS: MarginPreset[] = [
  {
    id: 'normal',
    name: 'Normal',
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
    description: 'Top: 1", Bottom: 1", Left: 1", Right: 1" (2.54 cm)',
  },
  {
    id: 'narrow',
    name: 'Narrow',
    top: 36,
    bottom: 36,
    left: 36,
    right: 36,
    description: 'Top: 0.5", Bottom: 0.5", Left: 0.5", Right: 0.5" (1.27 cm)',
  },
  {
    id: 'moderate',
    name: 'Moderate',
    top: 72,
    bottom: 72,
    left: 54,
    right: 54,
    description: 'Top: 1", Bottom: 1", Left: 0.75", Right: 0.75"',
  },
  {
    id: 'wide',
    name: 'Wide',
    top: 72,
    bottom: 72,
    left: 144,
    right: 144,
    description: 'Top: 1", Bottom: 1", Left: 2", Right: 2" (5.08 cm)',
  },
  {
    id: 'mirrored',
    name: 'Mirrored',
    top: 72,
    bottom: 72,
    left: 90,
    right: 72,
    description: 'Top: 1", Bottom: 1", Inside: 1.25", Outside: 1"',
  },
  {
    id: 'office2003',
    name: 'Office 2003 Default',
    top: 72,
    bottom: 72,
    left: 90,
    right: 90,
    description: 'Top: 1", Bottom: 1", Left: 1.25", Right: 1.25"',
  },
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
  detectedTextItems?: ExistingTextItem[];
  pageOcrCache?: Record<number, ExistingTextItem[]>;
  textOverlays: TextOverlay[];
  imageOverlays: ImageOverlay[];
  shapes: ShapeOverlay[];
  tables: TableOverlay[];
  hyperlinks: HyperlinkOverlay[];
  pageRotations: Record<number, number>;
  deletedPages: number[];
  insertedBlankPages: InsertBlankPageSpec[];
  currentPage: number;
  zoomScale: number;
  history: EditorSnapshot[];
  historyIndex: number;
  hasUnsavedEdits: boolean;
  pageBorders?: Record<number, PageBorderConfig>;
  pageNumberConfig?: PageNumberConfig;
  drawings?: DrawingStroke[];
  watermarkConfig?: WatermarkConfig;
  autoSaveEnabled?: boolean;
}

interface EditorSnapshot {
  modifiedTexts: Record<string, ExistingTextItem>;
  textOverlays: TextOverlay[];
  imageOverlays: ImageOverlay[];
  shapes: ShapeOverlay[];
  tables: TableOverlay[];
  hyperlinks: HyperlinkOverlay[];
  pageRotations: Record<number, number>;
  deletedPages: number[];
  insertedBlankPages: InsertBlankPageSpec[];
  pageBorders?: Record<number, PageBorderConfig>;
  pageNumberConfig?: PageNumberConfig;
  drawings?: DrawingStroke[];
  watermarkConfig?: WatermarkConfig;
}

const sampleCanvasBgColor = (
  canvas: HTMLCanvasElement | null,
  cssX: number,
  cssY: number,
  cssW: number,
  cssH: number,
  preferItemBg?: string
): { hex: string; rgb: { r: number; g: number; b: number }; isDark: boolean } => {
  if (preferItemBg && /^#[0-9a-fA-F]{6}$/.test(preferItemBg)) {
    const r = parseInt(preferItemBg.slice(1, 3), 16);
    const g = parseInt(preferItemBg.slice(3, 5), 16);
    const b = parseInt(preferItemBg.slice(5, 7), 16);
    const isDark = (r * 0.299 + g * 0.587 + b * 0.114) < 128;
    return { hex: preferItemBg, rgb: { r: r / 255, g: g / 255, b: b / 255 }, isDark };
  }

  if (!canvas) return { hex: '#ffffff', rgb: { r: 1, g: 1, b: 1 }, isDark: false };
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { hex: '#ffffff', rgb: { r: 1, g: 1, b: 1 }, isDark: false };

    // Calculate canvas internal pixel ratio to accurately map from CSS coordinates to canvas pixel buffer
    const styleW = parseFloat(canvas.style.width) || canvas.clientWidth || 1;
    const styleH = parseFloat(canvas.style.height) || canvas.clientHeight || 1;
    const pixelRatioX = canvas.width / styleW;
    const pixelRatioY = canvas.height / styleH;

    const cx = Math.round(cssX * pixelRatioX);
    const cy = Math.round(cssY * pixelRatioY);
    const cw = Math.round(cssW * pixelRatioX);
    const ch = Math.round(cssH * pixelRatioY);

    const marginX = Math.max(2, Math.round(3 * pixelRatioX));
    const marginY = Math.max(2, Math.round(3 * pixelRatioY));

    const samples: { r: number; g: number; b: number }[] = [];
    const sampleAt = (x: number, y: number) => {
      const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
      const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
      const d = ctx.getImageData(sx, sy, 1, 1).data;
      if (d[3] > 40) {
        samples.push({ r: d[0], g: d[1], b: d[2] });
      }
    };

    // Top & Bottom perimeter border lines
    const stepX = Math.max(1, Math.floor(cw / 10));
    for (let x = cx; x <= cx + cw; x += stepX) {
      sampleAt(x, cy - marginY);
      sampleAt(x, cy + ch + marginY);
    }
    // Left & Right perimeter border lines
    const stepY = Math.max(1, Math.floor(ch / 6));
    for (let y = cy; y <= cy + ch; y += stepY) {
      sampleAt(cx - marginX, y);
      sampleAt(cx + cw + marginX, y);
    }

    if (samples.length > 0) {
      // Use median per channel to reject dark glyph strokes or border edge pixels
      const rVals = samples.map((s) => s.r).sort((a, b) => a - b);
      const gVals = samples.map((s) => s.g).sort((a, b) => a - b);
      const bVals = samples.map((s) => s.b).sort((a, b) => a - b);
      const mid = Math.floor(samples.length / 2);
      let r = rVals[mid];
      let g = gVals[mid];
      let b = bVals[mid];

      // Only snap to pure #ffffff if it is genuinely neutral pure white (> 250 on all channels with delta <= 3)
      if (
        r >= 250 &&
        g >= 250 &&
        b >= 250 &&
        Math.abs(r - g) <= 3 &&
        Math.abs(r - b) <= 3 &&
        Math.abs(g - b) <= 3
      ) {
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

// Accurately sample the original text ink foreground color from high-DPI canvas
export const sampleCanvasTextColor = (
  canvas: HTMLCanvasElement | null,
  cssX: number,
  cssY: number,
  cssW: number,
  cssH: number,
  bgRgb: { r: number; g: number; b: number }
): string => {
  if (!canvas) return '#0f172a';
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#0f172a';

    const styleW = parseFloat(canvas.style.width) || canvas.clientWidth || 1;
    const styleH = parseFloat(canvas.style.height) || canvas.clientHeight || 1;
    const pixelRatioX = canvas.width / styleW;
    const pixelRatioY = canvas.height / styleH;

    const startX = Math.max(0, Math.floor(cssX * pixelRatioX));
    const startY = Math.max(0, Math.floor(cssY * pixelRatioY));
    const width = Math.min(canvas.width - startX, Math.max(1, Math.ceil(cssW * pixelRatioX)));
    const height = Math.min(canvas.height - startY, Math.max(1, Math.ceil(cssH * pixelRatioY)));

    const imgData = ctx.getImageData(startX, startY, width, height).data;
    const bgR = Math.round(bgRgb.r * 255);
    const bgG = Math.round(bgRgb.g * 255);
    const bgB = Math.round(bgRgb.b * 255);

    const candidates: { r: number; g: number; b: number; diff: number }[] = [];
    for (let i = 0; i < imgData.length; i += 4) {
      const a = imgData[i + 3];
      if (a < 50) continue;
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      if (diff > 45) {
        candidates.push({ r, g, b, diff });
      }
    }

    if (candidates.length > 0) {
      // Sort by contrast distance descending to pick strong core glyph pixels
      candidates.sort((a, b) => b.diff - a.diff);
      const topCount = Math.max(1, Math.floor(candidates.length * 0.4));
      let sumR = 0, sumG = 0, sumB = 0;
      for (let i = 0; i < topCount; i++) {
        sumR += candidates[i].r;
        sumG += candidates[i].g;
        sumB += candidates[i].b;
      }
      const finR = Math.round(sumR / topCount);
      const finG = Math.round(sumG / topCount);
      const finB = Math.round(sumB / topCount);
      return `#${finR.toString(16).padStart(2, '0')}${finG.toString(16).padStart(2, '0')}${finB.toString(16).padStart(2, '0')}`;
    }
  } catch (e) {
    console.error('sampleCanvasTextColor error:', e);
  }
  const isDark = (bgRgb.r * 0.299 + bgRgb.g * 0.587 + bgRgb.b * 0.114) < 0.5;
  return isDark ? '#f8fafc' : '#0f172a';
};

export const BULLET_STYLES = [
  { id: 'disc', label: 'Solid Circle (•)', bullet: '• ' },
  { id: 'circle', label: 'Hollow Circle (◦)', bullet: '◦ ' },
  { id: 'square', label: 'Square (■)', bullet: '■ ' },
  { id: 'diamond', label: 'Diamond (◆)', bullet: '◆ ' },
  { id: 'arrow', label: 'Arrow (➢)', bullet: '➢ ' },
  { id: 'check', label: 'Checkmark (✓)', bullet: '✓ ' },
  { id: 'number', label: '1, 2, 3...', type: 'number' },
  { id: 'alpha-upper', label: 'A, B, C...', type: 'alpha-upper' },
  { id: 'alpha-lower', label: 'a, b, c...', type: 'alpha-lower' },
  { id: 'roman', label: 'I, II, III...', type: 'roman' },
];

export const applyBulletToText = (text: string, bulletType: string): string => {
  const lines = text.split('\n');
  const bulletChars: Record<string, string> = {
    disc: '• ',
    circle: '◦ ',
    square: '■ ',
    diamond: '◆ ',
    arrow: '➢ ',
    check: '✓ ',
  };

  const stripBullet = (line: string): string => {
    return line.replace(/^([•◦■◆➢✓\-\*]\s*|\d+[\.\)]\s*|[a-zA-Z][\.\)]\s*|[ivxlcdmIVXLCDM]+[\.\)]\s*)/, '');
  };

  if (bulletType === 'none') {
    return lines.map(stripBullet).join('\n');
  }

  return lines.map((line, idx) => {
    const raw = stripBullet(line.trim());
    if (!raw && lines.length > 1) return line;

    if (bulletType === 'number') {
      return `${idx + 1}. ${raw}`;
    } else if (bulletType === 'alpha-upper') {
      const letter = String.fromCharCode(65 + (idx % 26));
      return `${letter}. ${raw}`;
    } else if (bulletType === 'alpha-lower') {
      const letter = String.fromCharCode(97 + (idx % 26));
      return `${letter}. ${raw}`;
    } else if (bulletType === 'roman') {
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      const r = romanNumerals[idx % romanNumerals.length];
      return `${r}. ${raw}`;
    } else {
      const symbol = bulletChars[bulletType] || '• ';
      return `${symbol}${raw}`;
    }
  }).join('\n');
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

/**
 * Geometric shape recognizer for freehand drawing strokes
 * Snaps hand-drawn curves to clean straight lines, circles, ellipses, triangles, and rectangles
 */
export function snapStrokeToGeometricShape(points: DrawingPoint[]): DrawingPoint[] {
  if (points.length < 5) return points;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let totalLength = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (i > 0) {
      const prev = points[i - 1];
      totalLength += Math.hypot(p.x - prev.x, p.y - prev.y);
    }
  }

  const pStart = points[0];
  const pEnd = points[points.length - 1];
  const chordDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
  const bboxW = Math.max(1, maxX - minX);
  const bboxH = Math.max(1, maxY - minY);
  const diag = Math.hypot(bboxW, bboxH);

  // 1. Straight line check: chord length is almost equal to total contour length
  if (totalLength > 10 && chordDist / totalLength > 0.88) {
    return [pStart, pEnd];
  }

  // 2. Closed shape check: end point is close to start point
  const isClosed = chordDist < Math.max(30, 0.30 * totalLength);
  if (isClosed) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = bboxW / 2;
    const ry = bboxH / 2;

    // Radius variance test from center
    const distances = points.map((p) => Math.hypot(p.x - cx, p.y - cy));
    const avgR = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((acc, d) => acc + Math.pow(d - avgR, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);

    // If low variance from center -> Circle or Ellipse
    if (stdDev / avgR < 0.28) {
      const circlePoints: DrawingPoint[] = [];
      const numSteps = 40;
      for (let i = 0; i <= numSteps; i++) {
        const theta = (i / numSteps) * 2 * Math.PI;
        circlePoints.push({
          x: cx + rx * Math.cos(theta),
          y: cy + ry * Math.sin(theta),
        });
      }
      return circlePoints;
    }

    // Douglas-Peucker polygon corner reduction
    const simplified = ramerDouglasPeucker(points, Math.max(8, diag * 0.07));
    const vertexCount = Math.max(0, simplified.length - 1); // exclude closing point

    // Triangle: 3 vertices
    if (vertexCount === 3) {
      return [...simplified.slice(0, 3), simplified[0]];
    }

    // Rectangle or Square: 4-5 vertices
    if (vertexCount >= 4 && vertexCount <= 5) {
      return [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
        { x: minX, y: minY },
      ];
    }
  }

  return points;
}

function ramerDouglasPeucker(points: DrawingPoint[], epsilon: number): DrawingPoint[] {
  if (points.length <= 2) return points;
  let dmax = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
    const recResults2 = ramerDouglasPeucker(points.slice(index), epsilon);
    return recResults1.slice(0, -1).concat(recResults2);
  } else {
    return [start, end];
  }
}

function perpendicularDistance(p: DrawingPoint, p1: DrawingPoint, p2: DrawingPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
  return Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / len;
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
        shapes: [],
        tables: [],
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
          shapes: [],
          tables: [],
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
        shapes: [],
        tables: [],
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
          shapes: [],
          tables: [],
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
    'view' | 'edit-text' | 'add-text' | 'add-link' | 'add-image' | 'add-shape' | 'add-table' | 'pen' | 'pencil' | 'highlighter' | 'eraser'
  >('view');

  // Freehand Drawing Tools (Pen, Pencil, Highlighter, Eraser)
  const [drawings, setDrawings] = useState<DrawingStroke[]>([]);
  const [drawingColor, setDrawingColor] = useState<string>('#000000');
  const [penThickness, setPenThickness] = useState<number>(3);
  const [pencilThickness, setPencilThickness] = useState<number>(1.5);
  const [highlighterColor, setHighlighterColor] = useState<string>('#f97316');
  const [highlighterThickness, setHighlighterThickness] = useState<number>(14);
  const [eraserRadius, setEraserRadius] = useState<number>(12); // radius in px
  const [snapToShape, setSnapToShape] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [eraserCursorPos, setEraserCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isDrawingMouseDown, setIsDrawingMouseDown] = useState<boolean>(false);
  const [showDrawDropdown, setShowDrawDropdown] = useState<boolean>(false);
  const drawBtnRef = useRef<HTMLButtonElement | null>(null);

  // Watermark Feature State
  const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
    enabled: true,
    type: 'text',
    text: 'CONFIDENTIAL',
    fontFamily: 'Calibri',
    fontSize: 48,
    color: '#dc2626',
    isBold: true,
    isItalic: false,
    isUnderline: false,
    proportionOfPages: false,
    proportionPercent: 50,
    position: 'center',
    xOffsetCm: 0,
    yOffsetCm: 0,
    tile: false,
    tileSpacingXCm: 2,
    tileSpacingYCm: 2,
    rotation: -45,
    opacity: 35,
    layer: 'front',
    pageScope: 'all',
    customRange: '',
  };
  const [watermarkConfig, setWatermarkConfig] = useState<WatermarkConfig | null>(null);
  const [showWatermarkModal, setShowWatermarkModal] = useState<boolean>(false);
  const [showWatermarkDropdown, setShowWatermarkDropdown] = useState<boolean>(false);
  const watermarkBtnRef = useRef<HTMLButtonElement | null>(null);

  // Insert Page & Dialog States (Desktop popup modal vs Android dropdown)
  const [showInsertPageModal, setShowInsertPageModal] = useState<boolean>(false);
  const [insertPageInitialMode, setInsertPageInitialMode] = useState<'blank' | 'other-pdf'>('blank');
  const [showInsertPageDropdown, setShowInsertPageDropdown] = useState<boolean>(false);
  const [showBorderModal, setShowBorderModal] = useState<boolean>(false);
  const [showPageNumberDropdown, setShowPageNumberDropdown] = useState<boolean>(false);
  const insertPageBtnRef = useRef<HTMLButtonElement | null>(null);
  const donorPdfInputRef = useRef<HTMLInputElement | null>(null);

  // Shapes & Tables State
  const [shapes, setShapes] = useState<ShapeOverlay[]>([]);
  const [tables, setTables] = useState<TableOverlay[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableCell, setSelectedTableCell] = useState<{ row: number; col: number; tableId?: string } | null>(null);

  // Rotation tool & popover states
  const [showRotationPopover, setShowRotationPopover] = useState<boolean>(false);
  const [customRotationInput, setCustomRotationInput] = useState<number>(0);

  // Shapes & Tables dropdown menus
  const [showShapesDropdown, setShowShapesDropdown] = useState<boolean>(false);
  const [showTableDropdown, setShowTableDropdown] = useState<boolean>(false);
  const [showBulletsDropdown, setShowBulletsDropdown] = useState<boolean>(false);
  const [showBlankPageDropdown, setShowBlankPageDropdown] = useState<boolean>(false);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState<boolean>(false);
  const [tableGridHover, setTableGridHover] = useState<{ rows: number; cols: number }>({ rows: 3, cols: 3 });
  const [customTableRows, setCustomTableRows] = useState<number>(3);
  const [customTableCols, setCustomTableCols] = useState<number>(3);

  // Trigger refs for portaled dropdown positioning (prevents overflow-x-auto clipping)
  const shapesBtnRef = useRef<HTMLButtonElement | null>(null);
  const tableBtnRef = useRef<HTMLButtonElement | null>(null);
  const rotationBtnRef = useRef<HTMLButtonElement | null>(null);
  const bulletsBtnRef = useRef<HTMLButtonElement | null>(null);
  const blankPageBtnRef = useRef<HTMLButtonElement | null>(null);
  const pageSizeBtnRef = useRef<HTMLButtonElement | null>(null);
  const marginBtnRef = useRef<HTMLButtonElement | null>(null);
  const borderBtnRef = useRef<HTMLButtonElement | null>(null);
  const pageNumberBtnRef = useRef<HTMLButtonElement | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // MS Word Margins State - Default guidelines hidden for a clean canvas
  const [selectedMarginId, setSelectedMarginId] = useState<string>('normal');
  const [customMargins, setCustomMargins] = useState<{ top: number; bottom: number; left: number; right: number }>({
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
  });
  const [showMarginDropdown, setShowMarginDropdown] = useState<boolean>(false);
  const [showMarginGuidelines, setShowMarginGuidelines] = useState<boolean>(false);

  // Page Border Feature State
  const [pageBorders, setPageBorders] = useState<Record<number, PageBorderConfig>>({});
  const [showBorderDropdown, setShowBorderDropdown] = useState<boolean>(false);
  const [selectedBorderPage, setSelectedBorderPage] = useState<number | null>(null);
  const [activeBorderScope, setActiveBorderScope] = useState<'current' | 'all' | 'odd' | 'even'>('all');
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState<boolean>(false);
  const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState<boolean>(false);
  const [interactiveBorderHandles, setInteractiveBorderHandles] = useState<boolean>(false);
  const [borderDragState, setBorderDragState] = useState<{
    pageIndex: number;
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';
    startX: number;
    startY: number;
    origBorder: PageBorderConfig;
  } | null>(null);

  // Page Numbering Feature State
  const [pageNumberConfig, setPageNumberConfig] = useState<PageNumberConfig>({
    enabled: false,
    position: 'bottom-center',
    format: 'number',
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'normal',
    color: '#000000',
    filterMode: 'all',
    startFrom: 1,
    offsetY: 24,
  });
  const [showPageNumberModal, setShowPageNumberModal] = useState<boolean>(false);

  // Formats page number display text based on targeted filter rules
  const formatPageNumberDisplay = useCallback(
    (pageIndex: number, totalDocPages: number, config: PageNumberConfig): string | null => {
      if (!config.enabled) return null;
      const pageNum = pageIndex + 1;

      // Filter rules
      if (config.filterMode === 'odd' && pageNum % 2 === 0) return null;
      if (config.filterMode === 'even' && pageNum % 2 !== 0) return null;
      if (config.filterMode === 'range') {
        const s = config.rangeStart || 1;
        const e = config.rangeEnd || totalDocPages;
        if (pageNum < s || pageNum > e) return null;
      }
      if (config.filterMode === 'specific' && config.specificPages) {
        const parts = config.specificPages.split(',').map((p) => p.trim());
        const matched = parts.some((p) => {
          if (p.includes('-')) {
            const [a, b] = p.split('-').map(Number);
            return pageNum >= a && pageNum <= b;
          }
          return Number(p) === pageNum;
        });
        if (!matched) return null;
      }

      const startNum = config.startFrom || 1;
      const displayVal = startNum + pageIndex;

      const toRomanNum = (num: number, upper = true) => {
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

      switch (config.format) {
        case 'page-x':
          return `Page ${displayVal}`;
        case 'page-x-of-y':
          return `Page ${displayVal} of ${totalDocPages}`;
        case 'dash':
          return `- ${displayVal} -`;
        case 'roman-upper':
          return toRomanNum(displayVal, true);
        case 'roman-lower':
          return toRomanNum(displayVal, false);
        case 'number':
        default:
          return `${displayVal}`;
      }
    },
    []
  );

  // Auto-fits all page content (text overlays, tables, shapes, images) within border or margin boundaries
  const fitAllContentToBounds = useCallback(
    (
      targetPageIndex: number | 'all',
      bounds: { left: number; right: number; top: number; bottom: number },
      pWidth?: number,
      pHeight?: number
    ) => {
      const pw = pWidth || 595.28;
      const ph = pHeight || 841.89;
      const minX = Math.max(0, bounds.left + 5);
      const maxX = Math.max(minX + 30, pw - bounds.right - 5);
      const availableW = Math.max(30, maxX - minX);

      const minY = Math.max(0, bounds.bottom + 5);
      const maxY = Math.max(minY + 30, ph - bounds.top - 5);
      const availableH = Math.max(30, maxY - minY);

      // 1. Text overlays
      setTextOverlays((prev) =>
        prev.map((t) => {
          if (targetPageIndex !== 'all' && t.pageIndex !== targetPageIndex) return t;
          const estW = (t.text?.length || 1) * (t.size || 12) * 0.55;
          const estH = (t.size || 12) * 1.2;
          let newX = t.x;
          let newY = t.y;
          if (newX < minX) newX = minX;
          if (newX + estW > maxX) newX = Math.max(minX, maxX - estW);
          if (newY < minY) newY = minY;
          if (newY + estH > maxY) newY = Math.max(minY, maxY - estH);

          return { ...t, x: Math.round(newX), y: Math.round(newY) };
        })
      );

      // 2. Tables
      setTables((prev) =>
        prev.map((tbl) => {
          if (targetPageIndex !== 'all' && tbl.pageIndex !== targetPageIndex) return tbl;
          let curW = tbl.width;
          let curH = tbl.height;
          let newColWidths = tbl.colWidths ? [...tbl.colWidths] : undefined;
          let newRowHeights = tbl.rowHeights ? [...tbl.rowHeights] : undefined;

          if (curW > availableW) {
            const ratio = availableW / curW;
            curW = availableW;
            if (newColWidths) {
              newColWidths = newColWidths.map((w) => Math.max(10, Math.round(w * ratio)));
            }
          }
          if (curH > availableH) {
            const ratio = availableH / curH;
            curH = availableH;
            if (newRowHeights) {
              newRowHeights = newRowHeights.map((h) => Math.max(8, Math.round(h * ratio)));
            }
          }

          let newX = tbl.x;
          let newY = tbl.y;
          if (newX < minX) newX = minX;
          if (newX + curW > maxX) newX = Math.max(minX, maxX - curW);
          if (newY < minY) newY = minY;
          if (newY + curH > maxY) newY = Math.max(minY, maxY - curH);

          return {
            ...tbl,
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(curW),
            height: Math.round(curH),
            colWidths: newColWidths,
            rowHeights: newRowHeights,
          };
        })
      );

      // 3. Shapes
      setShapes((prev) =>
        prev.map((shp) => {
          if (targetPageIndex !== 'all' && shp.pageIndex !== targetPageIndex) return shp;
          let newW = shp.width;
          let newH = shp.height;
          if (newW > availableW) newW = availableW;
          if (newH > availableH) newH = availableH;

          let newX = shp.x;
          let newY = shp.y;
          if (newX < minX) newX = minX;
          if (newX + newW > maxX) newX = Math.max(minX, maxX - newW);
          if (newY < minY) newY = minY;
          if (newY + newH > maxY) newY = Math.max(minY, maxY - newH);

          return {
            ...shp,
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newW),
            height: Math.round(newH),
          };
        })
      );

      // 4. Image overlays
      setImageOverlays((prev) =>
        prev.map((img) => {
          if (targetPageIndex !== 'all' && img.pageIndex !== targetPageIndex) return img;
          let newW = img.width;
          let newH = img.height;
          if (newW > availableW) {
            const ratio = availableW / newW;
            newW = availableW;
            newH = Math.round(newH * ratio);
          }
          if (newH > availableH) {
            const ratio = availableH / newH;
            newH = availableH;
            newW = Math.round(newW * ratio);
          }

          let newX = img.x;
          let newY = img.y;
          if (newX < minX) newX = minX;
          if (newX + newW > maxX) newX = Math.max(minX, maxX - newW);
          if (newY < minY) newY = minY;
          if (newY + newH > maxY) newY = Math.max(minY, maxY - newH);

          return {
            ...img,
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newW),
            height: Math.round(newH),
          };
        })
      );
    },
    []
  );

  const fitTextOverlaysToBorder = (
    targetPageIndex: number | 'all',
    newBorder: PageBorderConfig,
    pWidth?: number,
    pHeight?: number
  ) => {
    fitAllContentToBounds(targetPageIndex, newBorder, pWidth, pHeight);
  };

  // Last clicked cursor position on page canvas for accurate object insertion
  const lastClickedPageInfoRef = useRef<{ pageIndex: number; x: number; y: number } | null>(null);

  const updateLastClickedCoords = (
    e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
    pageIndex: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoomScale;
    const clickY = (rect.height - (e.clientY - rect.top)) / zoomScale;
    lastClickedPageInfoRef.current = {
      pageIndex,
      x: Math.max(10, Math.min((basePageDims.width || 595) - 20, clickX)),
      y: Math.max(10, Math.min((basePageDims.height || 842) - 20, clickY)),
    };
  };

  const getInsertionCoords = (w: number, h: number) => {
    const pageIndex = lastClickedPageInfoRef.current?.pageIndex ?? (currentPage - 1);
    const pWidth = basePageDims.width || 595;
    const pHeight = basePageDims.height || 842;
    let targetX = pWidth / 2;
    let targetY = pHeight / 2;

    if (lastClickedPageInfoRef.current) {
      targetX = lastClickedPageInfoRef.current.x;
      targetY = lastClickedPageInfoRef.current.y;
    } else if (containerRef.current) {
      const pageEl = document.getElementById(`pdf-page-frame-${pageIndex + 1}`);
      if (pageEl) {
        const pRect = pageEl.getBoundingClientRect();
        const cRect = containerRef.current.getBoundingClientRect();
        const visibleMidClientY = Math.max(pRect.top, cRect.top) / 2 + Math.min(pRect.bottom, cRect.bottom) / 2;
        const offsetFromPageTop = (visibleMidClientY - pRect.top) / zoomScale;
        targetY = pHeight - offsetFromPageTop;
      }
    }

    // Automatically constrain within active border or margins
    const activeBorder = pageBorders[pageIndex];
    const leftMargin = activeBorder?.enabled
      ? activeBorder.left
      : (selectedMarginId === 'custom' ? customMargins.left : (MS_WORD_MARGINS.find((m) => m.id === selectedMarginId)?.left || 20));
    const rightMargin = activeBorder?.enabled
      ? activeBorder.right
      : (selectedMarginId === 'custom' ? customMargins.right : (MS_WORD_MARGINS.find((m) => m.id === selectedMarginId)?.right || 20));
    const topMargin = activeBorder?.enabled
      ? activeBorder.top
      : (selectedMarginId === 'custom' ? customMargins.top : (MS_WORD_MARGINS.find((m) => m.id === selectedMarginId)?.top || 20));
    const bottomMargin = activeBorder?.enabled
      ? activeBorder.bottom
      : (selectedMarginId === 'custom' ? customMargins.bottom : (MS_WORD_MARGINS.find((m) => m.id === selectedMarginId)?.bottom || 20));

    const minX = leftMargin + 5;
    const maxX = Math.max(minX, pWidth - rightMargin - w - 5);
    const minY = bottomMargin + 5;
    const maxY = Math.max(minY, pHeight - topMargin - h - 5);

    const clampedX = Math.round(Math.max(minX, Math.min(maxX, targetX - w / 2)));
    const clampedY = Math.round(Math.max(minY, Math.min(maxY, targetY - h / 2)));
    return { pageIndex, x: clampedX, y: clampedY };
  };

  const handleContainerScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerMid = container.scrollTop + container.clientHeight / 2;
    let closestPage = currentPage;
    let minDiff = Infinity;
    for (let p = 1; p <= totalPages; p++) {
      const el = document.getElementById(`pdf-page-frame-${p}`);
      if (el) {
        const pageMid = el.offsetTop + el.offsetHeight / 2;
        const diff = Math.abs(containerMid - pageMid);
        if (diff < minDiff) {
          minDiff = diff;
          closestPage = p;
        }
      }
    }
    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
    }
  };

  // Image manipulation & Crop state
  const [cropImageId, setCropImageId] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState<{ xPct: number; yPct: number; wPct: number; hPct: number }>({
    xPct: 0.05,
    yPct: 0.05,
    wPct: 0.9,
    hPct: 0.9,
  });

  // Dragging & Resizing Canvas State
  const [draggingItem, setDraggingItem] = useState<{
    id: string;
    type: 'overlay' | 'image' | 'shape' | 'table';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [resizingItem, setResizingItem] = useState<{
    id: string;
    type: 'overlay' | 'image' | 'shape' | 'table';
    handle: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    aspectRatio?: number;
    initialColWidths?: number[];
    initialRowHeights?: number[];
  } | null>(null);

  // Interactive On-Canvas Rotation Pointer State (MS Word Style)
  const [rotatingItem, setRotatingItem] = useState<{
    id: string;
    type: 'overlay' | 'image' | 'shape' | 'table';
    centerX: number;
    centerY: number;
    startAngle: number;
    initialRot: number;
  } | null>(null);

  // Table / Shape / Picture Right-Click Context Menu State
  const [tableContextMenu, setTableContextMenu] = useState<{
    x: number;
    y: number;
    tableId: string;
    row: number;
    col: number;
  } | null>(null);

  const [elementContextMenu, setElementContextMenu] = useState<{
    x: number;
    y: number;
    type: 'shape' | 'image' | 'table';
    id: string;
    tableRow?: number;
    tableCol?: number;
  } | null>(null);

  const clipboardRef = useRef<{
    type: 'shape' | 'table' | 'image' | 'text';
    data: any;
  } | null>(null);

  // Page Deletion & Reordering States
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  const [pageThumbnailContextMenu, setPageThumbnailContextMenu] = useState<{
    x: number;
    y: number;
    pageNum: number;
  } | null>(null);
  const [draggingPageNum, setDraggingPageNum] = useState<number | null>(null);
  const [dragOverPageNum, setDragOverPageNum] = useState<number | null>(null);

  // Interactive Table Column & Row Resizing State
  const [resizingCol, setResizingCol] = useState<{
    tableId: string;
    colIdx: number;
    startX: number;
    initialWidth: number;
    initialColWidths: number[];
  } | null>(null);

  const [resizingRow, setResizingRow] = useState<{
    tableId: string;
    rowIdx: number;
    startY: number;
    initialHeight: number;
    initialRowHeights: number[];
    initialTableY: number;
    initialTotalHeight: number;
  } | null>(null);

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
      const newTabs: EditorTabItem[] = initialFiles.map((f, i) => ({
        id: `tab_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
        name: f.name,
        file: f,
        modifiedTexts: {},
        textOverlays: [],
        imageOverlays: [],
        shapes: [],
        tables: [],
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
          shapes: [],
          tables: [],
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
        const newTab: EditorTabItem = {
          id: newId,
          name: initialFile.name,
          file: initialFile,
          modifiedTexts: {},
          textOverlays: [],
          imageOverlays: [],
          shapes: [],
          tables: [],
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
            shapes: [],
            tables: [],
            hyperlinks: [],
            pageRotations: {},
            deletedPages: [],
            insertedBlankPages: [],
          }],
          historyIndex: 0,
          hasUnsavedEdits: false,
        };
        return [...prev, newTab];
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
  const [textColor, setTextColor] = useState<string>('#000000');
  const [itemBgColor, setItemBgColor] = useState<string>('#ffffff');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const isSwitchingTabsRef = useRef<boolean>(false);
  const activeTabIdRef = useRef<string>(activeTabId);
  activeTabIdRef.current = activeTabId;

  // Multi-selection, in-place text editing, and Link modal states
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [linkModalData, setLinkModalData] = useState<{
    text: string;
    url: string;
    targetTextItemId?: string | null;
    targetOverlayId?: string | null;
  }>({ text: '', url: 'https://' });
  const cellImageInputRef = useRef<HTMLInputElement>(null);
  const [activeTableImgCell, setActiveTableImgCell] = useState<string | null>(null);
  const [imageBorderRadius, setImageBorderRadius] = useState<number>(0);
  const [imageBrightness, setImageBrightness] = useState<number>(100);
  const [imageContrast, setImageContrast] = useState<number>(100);

  // Auto-restore active session if re-opening app after Android discarded WebView
  useEffect(() => {
    if (!initialFile && (!initialFiles || initialFiles.length === 0)) {
      loadActivePdfSession().then((session) => {
        if (session && session.fileBuffer) {
          try {
            const restoredFile = new File([session.fileBuffer], session.fileName, { type: session.fileType });
            setFile(restoredFile);
            setArrayBuffer(session.fileBuffer);
            setCurrentPage(session.currentPage || 1);
            setPageRotations(session.pageRotations || {});
            setDeletedPages(session.deletedPages || []);
            setInsertedBlankPages(session.insertedBlankPages || []);
            setTextOverlays(session.textOverlays || []);
            setImageOverlays(session.imageOverlays || []);
            setShapes(session.shapes || []);
            setTables(session.tables || []);
            setHyperlinks(session.hyperlinks || []);
            const modMap: Record<string, ExistingTextItem> = {};
            (session.modifiedTexts || []).forEach((item: ExistingTextItem) => {
              modMap[item.id] = item;
            });
            setModifiedTexts(modMap);
            setShowInitialPrompt(false);
          } catch (e) {
            console.warn('Could not restore session:', e);
          }
        }
      });
    }
  }, []);

  // Save session when switching apps (visibilitychange / pagehide) without draining battery
  useEffect(() => {
    const handleSaveSession = () => {
      const isDirty =
        Object.keys(modifiedTexts).length > 0 ||
        textOverlays.length > 0 ||
        imageOverlays.length > 0 ||
        shapes.length > 0 ||
        tables.length > 0 ||
        hyperlinks.length > 0 ||
        Object.keys(pageRotations).length > 0 ||
        deletedPages.length > 0 ||
        insertedBlankPages.length > 0;

      if (isDirty && file && arrayBuffer) {
        saveActivePdfSession({
          fileName: file.name,
          fileType: file.type || 'application/pdf',
          fileBuffer: arrayBuffer,
          currentPage,
          pageRotations,
          deletedPages,
          insertedBlankPages,
          textOverlays,
          imageOverlays,
          shapes,
          tables,
          modifiedTexts: Object.values(modifiedTexts),
          hyperlinks,
          updatedAt: Date.now(),
        });
      } else if (!isDirty) {
        clearActivePdfSession();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleSaveSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleSaveSession);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleSaveSession);
    };
  }, [file, arrayBuffer, currentPage, pageRotations, deletedPages, insertedBlankPages, textOverlays, imageOverlays, shapes, tables, modifiedTexts, hyperlinks]);

  // Active Debounced Auto-Save (2s) when autoSaveEnabled is true
  useEffect(() => {
    if (!autoSaveEnabled || !file || !arrayBuffer) return;
    const isDirty =
      Object.keys(modifiedTexts).length > 0 ||
      textOverlays.length > 0 ||
      imageOverlays.length > 0 ||
      shapes.length > 0 ||
      tables.length > 0 ||
      hyperlinks.length > 0 ||
      Object.keys(pageRotations).length > 0 ||
      deletedPages.length > 0 ||
      insertedBlankPages.length > 0;

    if (!isDirty) return;

    const timer = setTimeout(() => {
      if (activeTabId) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? {
                  ...t,
                  modifiedTexts: { ...modifiedTexts },
                  detectedTextItems: [...detectedTextItems],
                  pageOcrCache: { ...pageOcrCache.current },
                  textOverlays: [...textOverlays],
                  imageOverlays: [...imageOverlays],
                  shapes: [...shapes],
                  tables: [...tables],
                  hyperlinks: [...hyperlinks],
                  pageRotations: { ...pageRotations },
                  deletedPages: [...deletedPages],
                  insertedBlankPages: [...insertedBlankPages],
                  currentPage,
                  zoomScale,
                  history: [...history],
                  historyIndex,
                  hasUnsavedEdits: false,
                  pageBorders: { ...pageBorders },
                  pageNumberConfig: pageNumberConfig ? { ...pageNumberConfig } : undefined,
                }
              : t
          )
        );
      }
      saveActivePdfSession({
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileBuffer: arrayBuffer,
        currentPage,
        pageRotations,
        deletedPages,
        insertedBlankPages,
        textOverlays,
        imageOverlays,
        shapes,
        tables,
        modifiedTexts: Object.values(modifiedTexts),
        hyperlinks,
        updatedAt: Date.now(),
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    autoSaveEnabled,
    file,
    arrayBuffer,
    activeTabId,
    modifiedTexts,
    detectedTextItems,
    textOverlays,
    imageOverlays,
    shapes,
    tables,
    hyperlinks,
    pageRotations,
    deletedPages,
    insertedBlankPages,
    currentPage,
    zoomScale,
    pageBorders,
    pageNumberConfig,
  ]);

  const handleItemSelect = (
    id: string,
    type: 'overlay' | 'image' | 'shape' | 'table' | 'text',
    e?: React.MouseEvent | React.TouchEvent
  ) => {
    const isCtrl = e && 'ctrlKey' in e && (e.ctrlKey || e.metaKey);
    if (isCtrl) {
      setMultiSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setMultiSelectedIds([id]);
    }

    if (type === 'overlay' || type === 'image') {
      setSelectedOverlayId(id);
      setSelectedShapeId(null);
      setSelectedTableId(null);
      setSelectedTableCell(null);
      setSelectedTextItemId(null);
    } else if (type === 'shape') {
      setSelectedShapeId(id);
      setSelectedOverlayId(null);
      setSelectedTableId(null);
      setSelectedTableCell(null);
      setSelectedTextItemId(null);
    } else if (type === 'table') {
      setSelectedTableId(id);
      setSelectedTableCell(null);
      setSelectedOverlayId(null);
      setSelectedShapeId(null);
      setSelectedTextItemId(null);
    } else if (type === 'text') {
      setSelectedTextItemId(id);
      setSelectedOverlayId(null);
      setSelectedShapeId(null);
      setSelectedTableId(null);
      setSelectedTableCell(null);
    }

    if (!/android/i.test(navigator.userAgent)) {
      setShowPropertiesPanel(true);
    }
  };

  // Wondershare PDFelement Properties Panel & Advanced Color System
  // On Android app, properties panel does not auto-open (user opens manually); Desktop defaults open
  const [showPropertiesPanel, setShowPropertiesPanel] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth >= 768 && !/android/i.test(navigator.userAgent)
  );
  const [propertiesTouchStartY, setPropertiesTouchStartY] = useState<number | null>(null);
  const [showColorPickerModal, setShowColorPickerModal] = useState<boolean>(false);
  const [colorTarget, setColorTarget] = useState<'text' | 'text-bg' | 'image-border' | 'table-border' | 'table-fill' | 'shape-stroke' | 'shape-fill'>('text');
  const lastPageSwitchRef = useRef<number>(0);
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
    setHexInput(color);
    setRecentColors((prev) => [color, ...prev.filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, 12));
    try {
      const clean = color.replace('#', '');
      if (clean.length === 6) {
        setRgbValues({
          r: parseInt(clean.substring(0, 2), 16),
          g: parseInt(clean.substring(2, 4), 16),
          b: parseInt(clean.substring(4, 6), 16),
        });
      }
    } catch {}

    if (colorTarget === 'image-border' && selectedOverlayId) {
      setImageOverlays((prev) =>
        prev.map((i) => (i.id === selectedOverlayId ? { ...i, borderColor: color } : i))
      );
    } else if (colorTarget === 'table-border' && selectedTableId) {
      setTables((prev) =>
        prev.map((t) => (t.id === selectedTableId ? { ...t, borderColor: color } : t))
      );
    } else if (colorTarget === 'table-fill' && selectedTableId) {
      setTables((prev) =>
        prev.map((t) => (t.id === selectedTableId ? { ...t, cellBgColor: color } : t))
      );
    } else if (colorTarget === 'shape-stroke' && selectedShapeId) {
      setShapes((prev) =>
        prev.map((s) => (s.id === selectedShapeId ? { ...s, strokeColor: color } : s))
      );
    } else if (colorTarget === 'shape-fill' && selectedShapeId) {
      setShapes((prev) =>
        prev.map((s) => (s.id === selectedShapeId ? { ...s, fillColor: color } : s))
      );
    } else if (colorTarget === 'text-bg') {
      setItemBgColor(color);
      updateActiveTextItemProps({ bgColorHex: color });
    } else {
      setTextColor(color);
      updateActiveTextItemProps({ color });
    }
  }, [colorTarget, selectedOverlayId, selectedTableId, selectedShapeId, updateActiveTextItemProps]);

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
      shapes: [],
      tables: [],
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
  const pageCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
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
    shapes.length > 0 ||
    tables.length > 0 ||
    hyperlinks.length > 0 ||
    Object.keys(pageRotations).length > 0 ||
    deletedPages.length > 0 ||
    insertedBlankPages.length > 0 ||
    Object.values(pageBorders).some((b) => b?.enabled) ||
    pageNumberConfig.enabled ||
    drawings.length > 0 ||
    Boolean(watermarkConfig?.enabled);

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
        shapes: newSnapshot.shapes ?? shapes,
        tables: newSnapshot.tables ?? tables,
        hyperlinks: newSnapshot.hyperlinks ?? hyperlinks,
        pageRotations: newSnapshot.pageRotations ?? pageRotations,
        deletedPages: newSnapshot.deletedPages ?? deletedPages,
        insertedBlankPages: newSnapshot.insertedBlankPages ?? insertedBlankPages,
        pageBorders: newSnapshot.pageBorders ?? pageBorders,
        pageNumberConfig: newSnapshot.pageNumberConfig ?? pageNumberConfig,
        drawings: newSnapshot.drawings ?? drawings,
        watermarkConfig: newSnapshot.watermarkConfig !== undefined ? newSnapshot.watermarkConfig : (watermarkConfig || undefined),
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
      shapes,
      tables,
      hyperlinks,
      pageRotations,
      deletedPages,
      insertedBlankPages,
      pageBorders,
      pageNumberConfig,
      drawings,
      watermarkConfig,
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
          shapes: [],
          tables: [],
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
            shapes: [],
            tables: [],
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
      setOcrProgressText('Initializing PaddleOCR (PP-OCRv4) ONNX...');

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
      shapes: [],
      tables: [],
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
        shapes: [],
        tables: [],
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
        shapes: [],
        tables: [],
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
          shapes: [],
          tables: [],
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
      setShapes(targetState.shapes || []);
      setTables(targetState.tables || []);
      setHyperlinks(targetState.hyperlinks);
      setPageRotations(targetState.pageRotations);
      setDeletedPages(targetState.deletedPages);
      setInsertedBlankPages(targetState.insertedBlankPages);
      if (targetState.pageBorders) setPageBorders(targetState.pageBorders);
      if (targetState.pageNumberConfig) setPageNumberConfig(targetState.pageNumberConfig);
      if (targetState.drawings) setDrawings(targetState.drawings);
      if (targetState.watermarkConfig !== undefined) setWatermarkConfig(targetState.watermarkConfig);
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
      setShapes(targetState.shapes || []);
      setTables(targetState.tables || []);
      setHyperlinks(targetState.hyperlinks);
      setPageRotations(targetState.pageRotations);
      setDeletedPages(targetState.deletedPages);
      setInsertedBlankPages(targetState.insertedBlankPages);
      if (targetState.pageBorders) setPageBorders(targetState.pageBorders);
      if (targetState.pageNumberConfig) setPageNumberConfig(targetState.pageNumberConfig);
      if (targetState.drawings) setDrawings(targetState.drawings);
      if (targetState.watermarkConfig !== undefined) setWatermarkConfig(targetState.watermarkConfig);
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

        if (!isSwitchingTabsRef.current) {
          setModifiedTexts({});
          setTextOverlays([]);
          setImageOverlays([]);
          setShapes([]);
          setTables([]);
          setHyperlinks([]);
          setPageRotations({});
          setDeletedPages([]);
          setInsertedBlankPages([]);
          setHistory([
            {
              modifiedTexts: {},
              textOverlays: [],
              imageOverlays: [],
              shapes: [],
              tables: [],
              hyperlinks: [],
              pageRotations: {},
              deletedPages: [],
              insertedBlankPages: [],
            },
          ]);
          setHistoryIndex(0);
        } else {
          isSwitchingTabsRef.current = false;
        }
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

    const renderPageCanvas = async (p: number) => {
      const targetCanvas = pageCanvasesRef.current.get(p) || (p === currentPage ? canvasRef.current : null);
      if (!targetCanvas) return;
      try {
        const { canvas, cssWidth, cssHeight } = await PdfStudioEngine.renderPageToCanvas(
          proxyOrBuf,
          p,
          zoomScale,
          pageRotations[p - 1] || 0
        );
        if (!isMounted) return;
        if (canvas.width > 0 && canvas.height > 0) {
          targetCanvas.width = canvas.width;
          targetCanvas.height = canvas.height;
          targetCanvas.style.width = `${Math.round(cssWidth)}px`;
          targetCanvas.style.height = `${Math.round(cssHeight)}px`;

          const ctx = targetCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, 0);

            // Inpaint canvas ONLY for items that have been modified by the user
            const itemsToInpaint = Object.values(modifiedTexts).filter(
              (t) => t.pageIndex === p - 1 && t.isModified && t.currentText !== t.originalText
            );

            if (itemsToInpaint && itemsToInpaint.length > 0) {
              const scaleX = targetCanvas.width / (cssWidth / zoomScale);
              const scaleY = targetCanvas.height / (cssHeight / zoomScale);
              for (const item of itemsToInpaint) {
                let r = 255;
                let g = 255;
                let b = 255;
                if (item.bgColorHex) {
                  const clean = item.bgColorHex.replace('#', '');
                  if (clean.length === 6) {
                    r = parseInt(clean.substring(0, 2), 16);
                    g = parseInt(clean.substring(2, 4), 16);
                    b = parseInt(clean.substring(4, 6), 16);
                  }
                } else if (item.backgroundColor) {
                  r = Math.round(item.backgroundColor.r * 255);
                  g = Math.round(item.backgroundColor.g * 255);
                  b = Math.round(item.backgroundColor.b * 255);
                }
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
        }
        if (p === currentPage) {
          const baseW = cssWidth / zoomScale;
          const baseH = cssHeight / zoomScale;
          setBasePageDims({ width: baseW, height: baseH });
          setViewportDims({ width: cssWidth, height: cssHeight });
          lastRenderedPageRef.current = currentPage;
        }
      } catch (err: any) {
        console.error(`Error rendering page ${p}:`, err);
      }
    };

    const executeRender = () => {
      renderPageCanvas(currentPage)
        .then(async () => {
          if (!isMounted) return;
          setIsRendering(false);

          // Render all other pages continuously in background
          for (let p = 1; p <= totalPages; p++) {
            if (p !== currentPage) {
              renderPageCanvas(p);
            }
          }

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
  }, [currentPage, zoomScale, arrayBuffer, totalPages, pageRotations]);

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
        shapes,
        tables,
        textReplacements: Object.values(modifiedTexts),
        hyperlinks,
        pageBorders,
        pageNumberConfig,
        drawings,
        watermarkConfig: watermarkConfig || undefined,
      });

      const baseName = file.name.replace(/\.pdf$/i, '');
      await saveFile(editedBlob, `${baseName}_edited.pdf`);
      await clearActivePdfSession();
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

    // Snapshot current active tab state into tabs array synchronously
    const updatedTabs = tabs.map((t) =>
      t.id === activeTabId
        ? {
            ...t,
            file: file!,
            modifiedTexts: { ...modifiedTexts },
            detectedTextItems: [...detectedTextItems],
            pageOcrCache: { ...pageOcrCache.current },
            textOverlays: [...textOverlays],
            imageOverlays: [...imageOverlays],
            shapes: [...shapes],
            tables: [...tables],
            hyperlinks: [...hyperlinks],
            pageRotations: { ...pageRotations },
            deletedPages: [...deletedPages],
            insertedBlankPages: [...insertedBlankPages],
            currentPage,
            zoomScale,
            history: [...history],
            historyIndex,
            hasUnsavedEdits,
            pageBorders: { ...pageBorders },
            pageNumberConfig: pageNumberConfig ? { ...pageNumberConfig } : undefined,
            drawings: [...drawings],
            watermarkConfig: watermarkConfig ? { ...watermarkConfig } : undefined,
          }
        : t
    );
    setTabs(updatedTabs);

    const target = updatedTabs.find((t) => t.id === targetTabId);
    if (!target) return;

    // Mark tab switching so file loader effect does not reset our working state
    isSwitchingTabsRef.current = true;

    setActiveTabId(target.id);
    activeTabIdRef.current = target.id;
    setFile(target.file);
    setModifiedTexts(target.modifiedTexts || {});
    setDetectedTextItems(target.detectedTextItems || []);
    pageOcrCache.current = target.pageOcrCache ? { ...target.pageOcrCache } : {};
    setTextOverlays(target.textOverlays || []);
    setImageOverlays(target.imageOverlays || []);
    setShapes(target.shapes || []);
    setTables(target.tables || []);
    setHyperlinks(target.hyperlinks || []);
    setPageRotations(target.pageRotations || {});
    setDeletedPages(target.deletedPages || []);
    setInsertedBlankPages(target.insertedBlankPages || []);
    setCurrentPage(target.currentPage || 1);
    setZoomScale(target.zoomScale || 1.0);
    setHistory(target.history && target.history.length > 0 ? target.history : []);
    setHistoryIndex(target.historyIndex || 0);
    setPageBorders(target.pageBorders || {});
    setDrawings(target.drawings || []);
    setWatermarkConfig(target.watermarkConfig || null);
    setPageNumberConfig(
      target.pageNumberConfig || {
        enabled: false,
        position: 'bottom-center',
        format: 'number',
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'normal',
        color: '#000000',
        filterMode: 'all',
        startFrom: 1,
        offsetY: 24,
      }
    );
    setShowInitialPrompt(false);
  };

  // Add one or more files as new document tabs
  const handleAddNewTabFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    // Save active tab state before creating and activating any new tabs!
    let currentTabs = tabs;
    if (activeTabId && file) {
      currentTabs = currentTabs.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              file: file!,
              modifiedTexts: { ...modifiedTexts },
              detectedTextItems: [...detectedTextItems],
              pageOcrCache: { ...pageOcrCache.current },
              textOverlays: [...textOverlays],
              imageOverlays: [...imageOverlays],
              shapes: [...shapes],
              tables: [...tables],
              hyperlinks: [...hyperlinks],
              pageRotations: { ...pageRotations },
              deletedPages: [...deletedPages],
              insertedBlankPages: [...insertedBlankPages],
              currentPage,
              zoomScale,
              history: [...history],
              historyIndex,
              hasUnsavedEdits,
              pageBorders: { ...pageBorders },
              pageNumberConfig: pageNumberConfig ? { ...pageNumberConfig } : undefined,
              drawings: [...drawings],
              watermarkConfig: watermarkConfig ? { ...watermarkConfig } : undefined,
            }
          : t
      );
    }

    const newlyCreatedTabs: EditorTabItem[] = [];
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
          detectedTextItems: [],
          pageOcrCache: {},
          textOverlays: [],
          imageOverlays: [],
          shapes: [],
          tables: [],
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
            shapes: [],
            tables: [],
            hyperlinks: [],
            pageRotations: {},
            deletedPages: [],
            insertedBlankPages: [],
          }],
          historyIndex: 0,
          hasUnsavedEdits: false,
        };
        newlyCreatedTabs.push(newTab);
      } catch (err: any) {
        setError(err?.message || 'Failed to open document.');
      }
    }

    if (newlyCreatedTabs.length > 0) {
      const allTabs = [...currentTabs, ...newlyCreatedTabs];
      setTabs(allTabs);
      const lastTab = newlyCreatedTabs[newlyCreatedTabs.length - 1];
      isSwitchingTabsRef.current = false;
      setActiveTabId(lastTab.id);
      activeTabIdRef.current = lastTab.id;
      setFile(lastTab.file);
      setModifiedTexts({});
      setDetectedTextItems([]);
      pageOcrCache.current = {};
      setTextOverlays([]);
      setImageOverlays([]);
      setShapes([]);
      setTables([]);
      setHyperlinks([]);
      setPageRotations({});
      setDeletedPages([]);
      setInsertedBlankPages([]);
      setCurrentPage(1);
      setShowInitialPrompt(false);
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
      isSwitchingTabsRef.current = true;
      setActiveTabId(nextActive.id);
      activeTabIdRef.current = nextActive.id;
      setFile(nextActive.file);
      setModifiedTexts(nextActive.modifiedTexts || {});
      setDetectedTextItems(nextActive.detectedTextItems || []);
      pageOcrCache.current = nextActive.pageOcrCache ? { ...nextActive.pageOcrCache } : {};
      setTextOverlays(nextActive.textOverlays || []);
      setImageOverlays(nextActive.imageOverlays || []);
      setShapes(nextActive.shapes || []);
      setTables(nextActive.tables || []);
      setHyperlinks(nextActive.hyperlinks || []);
      setPageRotations(nextActive.pageRotations || {});
      setDeletedPages(nextActive.deletedPages || []);
      setInsertedBlankPages(nextActive.insertedBlankPages || []);
      setCurrentPage(nextActive.currentPage || 1);
      setZoomScale(nextActive.zoomScale || 1.0);
      setHistory(nextActive.history || []);
      setHistoryIndex(nextActive.historyIndex || 0);
      setPageBorders(nextActive.pageBorders || {});
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

  // Insert Blank Page with matched dimensions or MS Word Page Size catalogue
  const handleInsertBlankPage = async (
    position: 'after' | 'before' | 'end' = 'after',
    specId: string = 'same',
    specificPageNum?: number
  ) => {
    try {
      setIsSaving(true);
      setError(null);
      if (!arrayBuffer) {
        setError('No active document loaded.');
        return;
      }

      let targetW = basePageDims.width || 595.28;
      let targetH = basePageDims.height || 841.89;

      if (specId !== 'same') {
        const found = MS_WORD_PAGE_SIZES.find((s) => s.id === specId);
        if (found && found.width > 0) {
          targetW = found.width;
          targetH = found.height;
        }
      }

      const refPage = specificPageNum !== undefined ? specificPageNum : currentPage;
      let insertIndex = refPage; // 1-indexed insertion position
      if (position === 'before') insertIndex = Math.max(0, refPage - 1);
      if (position === 'after') insertIndex = refPage;
      if (position === 'end') insertIndex = totalPages;

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDoc.insertPage(insertIndex, [targetW, targetH]);
      const savedBytes = await pdfDoc.save();
      const newBuffer = savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength);

      setArrayBuffer(newBuffer);
      const newProxy = await getDocumentProxy(new Uint8Array(newBuffer.slice(0)));
      pdfProxyRef.current = newProxy;

      const newTotal = pdfDoc.getPageCount();
      setTotalPages(newTotal);

      // Shift overlays on and after insertIndex
      setTextOverlays((prev) =>
        prev.map((t) => (t.pageIndex >= insertIndex ? { ...t, pageIndex: t.pageIndex + 1 } : t))
      );
      setImageOverlays((prev) =>
        prev.map((i) => (i.pageIndex >= insertIndex ? { ...i, pageIndex: i.pageIndex + 1 } : i))
      );
      setShapes((prev) =>
        prev.map((s) => (s.pageIndex >= insertIndex ? { ...s, pageIndex: s.pageIndex + 1 } : s))
      );
      setTables((prev) =>
        prev.map((t) => (t.pageIndex >= insertIndex ? { ...t, pageIndex: t.pageIndex + 1 } : t))
      );
      setHyperlinks((prev) =>
        prev.map((h) => (h.pageIndex >= insertIndex ? { ...h, pageIndex: h.pageIndex + 1 } : h))
      );
      setSignatures((prev) =>
        prev.map((s) => (s.rect && s.rect.pageIndex >= insertIndex ? { ...s, rect: { ...s.rect, pageIndex: s.rect.pageIndex + 1 } } : s))
      );
      setPageRotations((prev) => {
        const next: Record<number, number> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const idx = parseInt(k, 10);
          if (idx >= insertIndex) {
            next[idx + 1] = v;
          } else {
            next[idx] = v;
          }
        });
        return next;
      });

      setCurrentPage(insertIndex + 1);
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, hasUnsavedEdits: true } : t))
      );
      setShowBlankPageDropdown(false);
    } catch (err: any) {
      console.error('Failed to insert blank page:', err);
      setError('Failed to insert blank page: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Resize Current Page (Complete MS Word Page Size Catalogue)
  const handleResizeCurrentPage = async (specId: string) => {
    try {
      if (!arrayBuffer) {
        setError('No active document loaded.');
        return;
      }
      const found = MS_WORD_PAGE_SIZES.find((s) => s.id === specId);
      if (!found || found.width <= 0) return;
      setIsSaving(true);
      setError(null);
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const page = pdfDoc.getPage(currentPage - 1);
      page.setSize(found.width, found.height);
      const savedBytes = await pdfDoc.save();
      const newBuffer = savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength);

      setArrayBuffer(newBuffer);
      const newProxy = await getDocumentProxy(new Uint8Array(newBuffer.slice(0)));
      pdfProxyRef.current = newProxy;
      setBasePageDims({ width: found.width, height: found.height });
      setShowPageSizeDropdown(false);
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, hasUnsavedEdits: true } : t))
      );
    } catch (err: any) {
      setError('Failed to resize page: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Page prompt
  const handleDeleteCurrentPage = () => {
    if (totalPages <= 1) {
      setError('Cannot delete the only page in the document.');
      return;
    }
    setPageToDelete(currentPage);
  };

  // Perform genuine page deletion on PDFDocument and re-render
  const performDeletePage = async (targetPageNum: number) => {
    try {
      if (totalPages <= 1) {
        setError('Cannot delete the only page in the document.');
        setPageToDelete(null);
        return;
      }
      if (!arrayBuffer) {
        setError('No active document loaded.');
        setPageToDelete(null);
        return;
      }
      setIsSaving(true);
      setError(null);

      const targetIdx = targetPageNum - 1;
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDoc.removePage(targetIdx);
      const savedBytes = await pdfDoc.save();
      const newBuffer = savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength);

      setArrayBuffer(newBuffer);
      const newProxy = await getDocumentProxy(new Uint8Array(newBuffer.slice(0)));
      pdfProxyRef.current = newProxy;

      const newTotal = pdfDoc.getPageCount();
      setTotalPages(newTotal);

      // Remap & filter page items
      setTextOverlays((prev) =>
        prev.filter((t) => t.pageIndex !== targetIdx).map((t) => (t.pageIndex > targetIdx ? { ...t, pageIndex: t.pageIndex - 1 } : t))
      );
      setImageOverlays((prev) =>
        prev.filter((i) => i.pageIndex !== targetIdx).map((i) => (i.pageIndex > targetIdx ? { ...i, pageIndex: i.pageIndex - 1 } : i))
      );
      setShapes((prev) =>
        prev.filter((s) => s.pageIndex !== targetIdx).map((s) => (s.pageIndex > targetIdx ? { ...s, pageIndex: s.pageIndex - 1 } : s))
      );
      setTables((prev) =>
        prev.filter((t) => t.pageIndex !== targetIdx).map((t) => (t.pageIndex > targetIdx ? { ...t, pageIndex: t.pageIndex - 1 } : t))
      );
      setHyperlinks((prev) =>
        prev.filter((h) => h.pageIndex !== targetIdx).map((h) => (h.pageIndex > targetIdx ? { ...h, pageIndex: h.pageIndex - 1 } : h))
      );
      setSignatures((prev) =>
        prev
          .filter((s) => s.rect?.pageIndex !== targetIdx)
          .map((s) => (s.rect && s.rect.pageIndex > targetIdx ? { ...s, rect: { ...s.rect, pageIndex: s.rect.pageIndex - 1 } } : s))
      );
      setPageRotations((prev) => {
        const next: Record<number, number> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const idx = parseInt(k, 10);
          if (idx < targetIdx) next[idx] = v;
          else if (idx > targetIdx) next[idx - 1] = v;
        });
        return next;
      });

      // Clear selected items
      setSelectedTableId(null);
      setSelectedTableCell(null);
      setSelectedShapeId(null);
      setSelectedOverlayId(null);
      setSelectedTextItemId(null);
      setMultiSelectedIds([]);
      setActiveEditingId(null);

      // Adjust current page
      if (currentPage > newTotal) {
        setCurrentPage(newTotal);
      } else if (currentPage === targetPageNum) {
        setCurrentPage(Math.min(targetPageNum, newTotal));
      }

      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, hasUnsavedEdits: true } : t))
      );
    } catch (err: any) {
      console.error('Failed to delete page:', err);
      setError('Failed to delete page: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
      setPageToDelete(null);
    }
  };

  // Reorder pages via drag and drop thumbnail
  const handleReorderPage = async (fromPage: number, toPage: number) => {
    if (fromPage === toPage || !arrayBuffer) return;
    try {
      setIsSaving(true);
      setError(null);
      const fromIdx = fromPage - 1;
      const toIdx = toPage - 1;

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [fromIdx]);
      pdfDoc.removePage(fromIdx);
      pdfDoc.insertPage(toIdx, copiedPage);

      const savedBytes = await pdfDoc.save();
      const newBuffer = savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength);

      setArrayBuffer(newBuffer);
      const newProxy = await getDocumentProxy(new Uint8Array(newBuffer.slice(0)));
      pdfProxyRef.current = newProxy;

      const remapIdx = (idx: number) => {
        if (idx === fromIdx) return toIdx;
        if (fromIdx < toIdx) {
          if (idx > fromIdx && idx <= toIdx) return idx - 1;
        } else {
          if (idx >= toIdx && idx < fromIdx) return idx + 1;
        }
        return idx;
      };

      setTextOverlays((prev) => prev.map((t) => ({ ...t, pageIndex: remapIdx(t.pageIndex) })));
      setImageOverlays((prev) => prev.map((i) => ({ ...i, pageIndex: remapIdx(i.pageIndex) })));
      setShapes((prev) => prev.map((s) => ({ ...s, pageIndex: remapIdx(s.pageIndex) })));
      setTables((prev) => prev.map((t) => ({ ...t, pageIndex: remapIdx(t.pageIndex) })));
      setHyperlinks((prev) => prev.map((h) => ({ ...h, pageIndex: remapIdx(h.pageIndex) })));
      setSignatures((prev) =>
        prev.map((s) => (s.rect ? { ...s, rect: { ...s.rect, pageIndex: remapIdx(s.rect.pageIndex) } } : s))
      );
      setPageRotations((prev) => {
        const next: Record<number, number> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const idx = parseInt(k, 10);
          next[remapIdx(idx)] = v;
        });
        return next;
      });

      setCurrentPage(toPage);
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, hasUnsavedEdits: true } : t))
      );
    } catch (err: any) {
      console.error('Failed to reorder page:', err);
      setError('Failed to reorder page: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Rotate specific page
  const handleRotatePageNum = (pageNum: number, degDelta: number) => {
    const pageIndex = pageNum - 1;
    const currentDeg = pageRotations[pageIndex] || 0;
    const nextDeg = ((Math.round((currentDeg + degDelta) / 90) * 90) % 360 + 360) % 360;
    const nextRotations = { ...pageRotations, [pageIndex]: nextDeg };
    setPageRotations(nextRotations);
    pushSnapshot({ pageRotations: nextRotations });
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, hasUnsavedEdits: true } : t))
    );
  };

  // Rotate Page by relative degrees (+90, -90, +180) - strictly snaps to multiples of 90 for PDF specs
  const handleRotatePageBy = (degDelta: number) => {
    const pageIndex = currentPage - 1;
    const currentDeg = pageRotations[pageIndex] || 0;
    const nextDeg = ((Math.round((currentDeg + degDelta) / 90) * 90) % 360 + 360) % 360;
    const nextRotations = { ...pageRotations, [pageIndex]: nextDeg };
    setPageRotations(nextRotations);
    pushSnapshot({ pageRotations: nextRotations });
  };

  // Set Page rotation to exact degree (strictly snapped to 0, 90, 180, 270)
  const handleSetPageRotation = (exactDeg: number) => {
    const pageIndex = currentPage - 1;
    const snapped = ((Math.round(exactDeg / 90) * 90) % 360 + 360) % 360;
    const nextRotations = { ...pageRotations, [pageIndex]: snapped };
    setPageRotations(nextRotations);
    pushSnapshot({ pageRotations: nextRotations });
  };

  // Standard Rotate Page 90° Clockwise
  const handleRotatePage = () => {
    handleRotatePageBy(90);
  };

  // Safe Popover Anchoring & Toggle functions (avoids overflow-x-auto clipping)
  const toggleShapesDropdown = () => {
    if (showShapesDropdown) {
      setShowShapesDropdown(false);
      return;
    }
    const rect = shapesBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 276)),
      });
    }
    setShowShapesDropdown(true);
    setShowTableDropdown(false);
    setShowRotationPopover(false);
    setShowBulletsDropdown(false);
    setShowBlankPageDropdown(false);
    setShowPageSizeDropdown(false);
  };

  const toggleTableDropdown = () => {
    if (showTableDropdown) {
      setShowTableDropdown(false);
      return;
    }
    const rect = tableBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 240)),
      });
    }
    setShowTableDropdown(true);
    setShowShapesDropdown(false);
    setShowRotationPopover(false);
    setShowBulletsDropdown(false);
    setShowBlankPageDropdown(false);
    setShowPageSizeDropdown(false);
  };

  const toggleRotationPopover = () => {
    if (showRotationPopover) {
      setShowRotationPopover(false);
      return;
    }
    const rect = rotationBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 250)),
      });
    }
    setShowRotationPopover(true);
    setShowShapesDropdown(false);
    setShowTableDropdown(false);
    setShowBulletsDropdown(false);
    setShowBlankPageDropdown(false);
    setShowPageSizeDropdown(false);
  };

  const toggleBulletsDropdown = () => {
    if (showBulletsDropdown) {
      setShowBulletsDropdown(false);
      return;
    }
    const rect = bulletsBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 230)),
      });
    }
    setShowBulletsDropdown(true);
    setShowShapesDropdown(false);
    setShowTableDropdown(false);
    setShowRotationPopover(false);
    setShowBlankPageDropdown(false);
    setShowPageSizeDropdown(false);
  };

  const toggleBlankPageDropdown = () => {
    if (showBlankPageDropdown) {
      setShowBlankPageDropdown(false);
      return;
    }
    const rect = blankPageBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 260)),
      });
    }
    setShowBlankPageDropdown(true);
    setShowShapesDropdown(false);
    setShowTableDropdown(false);
    setShowRotationPopover(false);
    setShowBulletsDropdown(false);
    setShowPageSizeDropdown(false);
    setShowMarginDropdown(false);
  };

  const togglePageSizeDropdown = () => {
    if (showPageSizeDropdown) {
      setShowPageSizeDropdown(false);
      return;
    }
    const rect = pageSizeBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 260)),
      });
    }
    setShowPageSizeDropdown(true);
    setShowMarginDropdown(false);
    setShowBlankPageDropdown(false);
    setShowShapesDropdown(false);
    setShowTableDropdown(false);
    setShowRotationPopover(false);
    setShowBulletsDropdown(false);
  };

  const toggleMarginDropdown = () => {
    if (showMarginDropdown) {
      setShowMarginDropdown(false);
      return;
    }
    const rect = marginBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 320)),
      });
    }
    setShowMarginDropdown(true);
    setShowPageSizeDropdown(false);
    setShowBlankPageDropdown(false);
    setShowShapesDropdown(false);
    setShowTableDropdown(false);
    setShowRotationPopover(false);
    setShowBulletsDropdown(false);
  };

  const toggleBorderDropdown = () => {
    if (showBorderDropdown) {
      setShowBorderDropdown(false);
      return;
    }
    const rect = borderBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 340)),
      });
    }
    setShowBorderDropdown(true);
    setShowMarginDropdown(false);
    setShowPageSizeDropdown(false);
    setShowBlankPageDropdown(false);
    setShowShapesDropdown(false);
    setShowTableDropdown(false);
    setShowRotationPopover(false);
    setShowBulletsDropdown(false);
    setShowPageNumberModal(false);
    setShowPageNumberDropdown(false);
  };

  const togglePageNumberModal = () => {
    if (showPageNumberDropdown) {
      setShowPageNumberDropdown(false);
      return;
    }
    const rect = pageNumberBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownCoords({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)),
      });
    }
    setShowPageNumberDropdown(true);
    setShowPageNumberModal(false);
    setShowBorderDropdown(false);
    setShowMarginDropdown(false);
    setShowPageSizeDropdown(false);
    setShowBlankPageDropdown(false);
    setShowShapesDropdown(false);
    setShowTableDropdown(false);
    setShowRotationPopover(false);
    setShowBulletsDropdown(false);
  };

  const updatePageBorderConfig = (
    partial: Partial<PageBorderConfig>,
    scope: 'current' | 'all' | 'odd' | 'even' = activeBorderScope
  ) => {
    const currentIdx = currentPage - 1;
    const baseBorder: PageBorderConfig = pageBorders[currentIdx] || {
      enabled: true,
      type: 'solid',
      width: 1,
      color: '#000000',
      top: 36,
      bottom: 36,
      left: 36,
      right: 36,
    };
    const updated: PageBorderConfig = { ...baseBorder, ...partial };

    setPageBorders((prev) => {
      const next = { ...prev };
      if (scope === 'all') {
        for (let i = 0; i < totalPages; i++) {
          next[i] = { ...updated };
        }
      } else if (scope === 'odd') {
        for (let i = 0; i < totalPages; i++) {
          if (i % 2 === 0) next[i] = { ...updated };
        }
      } else if (scope === 'even') {
        for (let i = 0; i < totalPages; i++) {
          if (i % 2 === 1) next[i] = { ...updated };
        }
      } else {
        next[currentIdx] = updated;
      }
      return next;
    });

    if (updated.enabled) {
      fitTextOverlaysToBorder(scope === 'all' ? 'all' : currentIdx, updated);
    }
    pushSnapshot({ pageBorders: { ...pageBorders, [currentIdx]: updated } });
  };

  const removePageBorder = (scope: 'current' | 'all' | 'odd' | 'even' = activeBorderScope) => {
    const currentIdx = currentPage - 1;
    setPageBorders((prev) => {
      const next = { ...prev };
      if (scope === 'all') {
        for (let i = 0; i < totalPages; i++) {
          if (next[i]) next[i] = { ...next[i], enabled: false };
        }
      } else if (scope === 'odd') {
        for (let i = 0; i < totalPages; i++) {
          if (i % 2 === 0 && next[i]) next[i] = { ...next[i], enabled: false };
        }
      } else if (scope === 'even') {
        for (let i = 0; i < totalPages; i++) {
          if (i % 2 === 1 && next[i]) next[i] = { ...next[i], enabled: false };
        }
      } else {
        if (next[currentIdx]) next[currentIdx] = { ...next[currentIdx], enabled: false };
      }
      return next;
    });
    pushSnapshot({ pageBorders });
  };

  const updatePageNumberConfig = (partial: Partial<PageNumberConfig>) => {
    setPageNumberConfig((prev) => {
      const next = { ...prev, ...partial };
      pushSnapshot({ pageNumberConfig: next });
      return next;
    });
  };

  const removePageNumbers = () => {
    setPageNumberConfig((prev) => {
      const next = { ...prev, enabled: false };
      pushSnapshot({ pageNumberConfig: next });
      return next;
    });
  };

  // Set Rotation for the currently selected Element (Text, Shape, Image, Table) or Document Page
  const handleSetElementRotation = (exactDeg: number) => {
    const nextDeg = ((exactDeg % 360) + 360) % 360;
    if (selectedShapeId) {
      setShapes((prev) => {
        const next = prev.map((s) => (s.id === selectedShapeId ? { ...s, rotation: nextDeg } : s));
        pushSnapshot({ shapes: next });
        return next;
      });
      return;
    }
    if (selectedTableId) {
      setTables((prev) => {
        const next = prev.map((t) => (t.id === selectedTableId ? { ...t, rotation: nextDeg } : t));
        pushSnapshot({ tables: next });
        return next;
      });
      return;
    }
    if (selectedOverlayId) {
      const isText = textOverlays.some((t) => t.id === selectedOverlayId);
      if (isText) {
        setTextOverlays((prev) => {
          const next = prev.map((t) => (t.id === selectedOverlayId ? { ...t, rotation: nextDeg } : t));
          pushSnapshot({ textOverlays: next });
          return next;
        });
        return;
      }
      const isImg = imageOverlays.some((i) => i.id === selectedOverlayId);
      if (isImg) {
        setImageOverlays((prev) => {
          const next = prev.map((i) => (i.id === selectedOverlayId ? { ...i, rotation: nextDeg } : i));
          pushSnapshot({ imageOverlays: next });
          return next;
        });
        return;
      }
    }
    if (activeEditingId || selectedTextItemId) {
      updateActiveTextItemProps({ rotation: nextDeg, isModified: true });
      return;
    }
    handleSetPageRotation(exactDeg);
  };

  // Rotate Selected Element (Text, Image, Shape, Table) or Page by 90°
  const handleRotateCurrentSelectionOrPage = () => {
    if (selectedShapeId) {
      const shp = shapes.find((s) => s.id === selectedShapeId);
      handleSetElementRotation(((shp?.rotation || 0) + 90) % 360);
      return;
    }
    if (selectedTableId) {
      const tbl = tables.find((t) => t.id === selectedTableId);
      handleSetElementRotation(((tbl?.rotation || 0) + 90) % 360);
      return;
    }
    if (selectedOverlayId) {
      const isText = textOverlays.some((t) => t.id === selectedOverlayId);
      if (isText) {
        const cur = textOverlays.find((t) => t.id === selectedOverlayId);
        handleSetElementRotation(((cur?.rotation || 0) + 90) % 360);
        return;
      }
      const isImg = imageOverlays.some((i) => i.id === selectedOverlayId);
      if (isImg) {
        const cur = imageOverlays.find((i) => i.id === selectedOverlayId);
        handleSetElementRotation(((cur?.rotation || 0) + 90) % 360);
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

  // Insert MS Word Shape into current document page or selected table cell
  const handleAddShape = (type: ShapeType) => {
    if (selectedTableCell) {
      const { tableId, row, col } = selectedTableCell;
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== tableId) return t;
          const nextCellShapes = {
            ...(t.cellShapes || {}),
            [`${row}_${col}`]: {
              type,
              strokeColor: '#2563eb',
              fillColor: '#dbeafe',
              strokeWidth: 2,
            },
          };
          const curRowH = t.rowHeights?.[row] || (t.height / t.rows) || 28;
          const curColW = t.colWidths?.[col] || (t.width / t.cols) || 80;
          const nextRowHeights = [...(t.rowHeights || Array(t.rows).fill(t.height / t.rows || 28))];
          const nextColWidths = [...(t.colWidths || Array(t.cols).fill(t.width / t.cols || 80))];
          nextRowHeights[row] = Math.max(curRowH, 110);
          nextColWidths[col] = Math.max(curColW, 140);
          const totalW = nextColWidths.reduce((a, b) => a + b, 0);
          const totalH = nextRowHeights.reduce((a, b) => a + b, 0);
          const diffH = totalH - (t.height || totalH);
          return {
            ...t,
            cellShapes: nextCellShapes,
            rowHeights: nextRowHeights,
            colWidths: nextColWidths,
            width: totalW,
            height: totalH,
            y: Math.max(10, (t.y || 100) - diffH),
          };
        })
      );
      setShowShapesDropdown(false);
      pushSnapshot({ tables });
      return;
    }

    const id = `shape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isLineOrArrow = type === 'line' || type === 'arrow' || type === 'double-arrow';
    const shapeW = isLineOrArrow ? 140 : 120;
    const shapeH = isLineOrArrow ? 30 : 80;
    const { pageIndex: targetPage, x: shapeX, y: shapeY } = getInsertionCoords(shapeW, shapeH);

    const newShape: ShapeOverlay = {
      id,
      pageIndex: targetPage,
      type,
      x: shapeX,
      y: shapeY,
      width: shapeW,
      height: shapeH,
      strokeColor: '#2563eb',
      fillColor: isLineOrArrow ? 'transparent' : '#dbeafe',
      strokeWidth: 2,
      strokeStyle: 'solid',
      opacity: 1,
      rotation: 0,
    };
    const nextShapes = [...shapes, newShape];
    setShapes(nextShapes);
    setSelectedShapeId(id);
    setSelectedTableId(null);
    setSelectedOverlayId(null);
    setActiveEditingId(null);
    const isMobile = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
    if (!isMobile) {
      setShowPropertiesPanel(true);
    }
    setShowShapesDropdown(false);
    pushSnapshot({ shapes: nextShapes });
  };

  // Insert Word Table into current document page or subtable into selected cell
  const handleAddTable = (rows: number, cols: number) => {
    if (selectedTableCell) {
      const { tableId, row, col } = selectedTableCell;
      const subR = Math.max(1, Math.min(5, rows));
      const subC = Math.max(1, Math.min(5, cols));
      const subCells: string[][] = Array.from({ length: subR }, () => Array(subC).fill(''));
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== tableId) return t;
          const nextSubtables = {
            ...(t.cellSubtables || {}),
            [`${row}_${col}`]: {
              rows: subR,
              cols: subC,
              cells: subCells,
            },
          };
          const curRowH = t.rowHeights?.[row] || (t.height / t.rows) || 28;
          const curColW = t.colWidths?.[col] || (t.width / t.cols) || 80;
          const nextRowHeights = [...(t.rowHeights || Array(t.rows).fill(t.height / t.rows || 28))];
          const nextColWidths = [...(t.colWidths || Array(t.cols).fill(t.width / t.cols || 80))];
          nextRowHeights[row] = Math.max(curRowH, subR * 34, 90);
          nextColWidths[col] = Math.max(curColW, subC * 70, 140);
          const totalW = nextColWidths.reduce((a, b) => a + b, 0);
          const totalH = nextRowHeights.reduce((a, b) => a + b, 0);
          const diffH = totalH - (t.height || totalH);
          return {
            ...t,
            cellSubtables: nextSubtables,
            rowHeights: nextRowHeights,
            colWidths: nextColWidths,
            width: totalW,
            height: totalH,
            y: Math.max(10, (t.y || 100) - diffH),
          };
        })
      );
      setShowTableDropdown(false);
      pushSnapshot({ tables });
      return;
    }

    const id = `table_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const r = Math.max(1, Math.min(20, rows));
    const c = Math.max(1, Math.min(10, cols));
    const totalW = Math.min(480, Math.max(180, c * 80));
    const colW = totalW / c;
    const rowH = 28;
    const totalH = r * rowH;

    const cells: string[][] = [];
    for (let i = 0; i < r; i++) {
      const row: string[] = [];
      for (let j = 0; j < c; j++) {
        row.push('');
      }
      cells.push(row);
    }

    const { pageIndex: targetPage, x: tableX, y: tableY } = getInsertionCoords(totalW, totalH);

    const newTable: TableOverlay = {
      id,
      pageIndex: targetPage,
      x: tableX,
      y: tableY,
      width: totalW,
      height: totalH,
      rows: r,
      cols: c,
      cells,
      colWidths: Array(c).fill(colW),
      rowHeights: Array(r).fill(rowH),
      headerRow: false,
      borderColor: '#000000',
      borderWidth: 1,
      borderStyle: 'solid',
      fontSize: 10,
      fontFamily: 'Calibri',
      textColor: '#000000',
      rotation: 0,
    };

    const nextTables = [...tables, newTable];
    setTables(nextTables);
    setSelectedTableId(id);
    setSelectedShapeId(null);
    setSelectedOverlayId(null);
    setActiveEditingId(null);
    setSelectedTextItemId(null);
    const isMobile = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
    if (!isMobile) {
      setShowPropertiesPanel(true);
    }
    setShowTableDropdown(false);
    pushSnapshot({ tables: nextTables });
  };

  // Open Link Dialog for selected text or insert fresh link
  const handleOpenLinkModal = () => {
    const activeDetected = activeEditingId || selectedTextItemId;
    if (activeDetected) {
      const item = detectedTextItems.find((t) => t.id === activeDetected);
      const existingTxt = item ? (modifiedTexts[activeDetected]?.currentText ?? item.originalText) : '';
      setLinkModalData({
        text: existingTxt,
        url: 'https://',
        targetTextItemId: activeDetected,
      });
      setShowLinkModal(true);
      return;
    }
    const activeOverlay = selectedOverlayId ? textOverlays.find((t) => t.id === selectedOverlayId) : null;
    if (activeOverlay) {
      setLinkModalData({
        text: activeOverlay.text,
        url: 'https://',
        targetOverlayId: activeOverlay.id,
      });
      setShowLinkModal(true);
      return;
    }
    // Nothing selected on page
    setLinkModalData({
      text: 'Visit Link',
      url: 'https://',
    });
    setShowLinkModal(true);
  };

  // Apply hyperlink to selected text or insert fresh text link
  const handleApplyLink = (displayTxt: string, targetUrl: string) => {
    setShowLinkModal(false);
    if (!targetUrl || !targetUrl.trim()) return;
    const cleanUrl = targetUrl.trim().startsWith('http://') || targetUrl.trim().startsWith('https://')
      ? targetUrl.trim()
      : `https://${targetUrl.trim()}`;
    const pageIndex = currentPage - 1;

    if (linkModalData.targetTextItemId) {
      const item = detectedTextItems.find((t) => t.id === linkModalData.targetTextItemId);
      if (item) {
        updateActiveTextItemProps({ color: '#2563eb', isUnderline: true, isModified: true });
        const newLink: HyperlinkOverlay = {
          id: `link_${Date.now()}`,
          pageIndex,
          url: cleanUrl,
          x: item.x,
          y: item.y,
          width: Math.max(30, item.width),
          height: Math.max(14, item.height),
        };
        const nextLinks = [...hyperlinks, newLink];
        setHyperlinks(nextLinks);
        pushSnapshot({ hyperlinks: nextLinks });
        return;
      }
    }

    if (linkModalData.targetOverlayId) {
      const ov = textOverlays.find((t) => t.id === linkModalData.targetOverlayId);
      if (ov) {
        const updatedOverlays = textOverlays.map((t) => (t.id === ov.id ? { ...t, color: '#2563eb', isUnderline: true } : t));
        setTextOverlays(updatedOverlays);
        const newLink: HyperlinkOverlay = {
          id: `link_${Date.now()}`,
          pageIndex,
          url: cleanUrl,
          x: ov.x,
          y: ov.y,
          width: Math.max(30, ov.text.length * (ov.size || 12) * 0.65),
          height: Math.max(16, (ov.size || 12) * 1.3),
        };
        const nextLinks = [...hyperlinks, newLink];
        setHyperlinks(nextLinks);
        pushSnapshot({ textOverlays: updatedOverlays, hyperlinks: nextLinks });
        return;
      }
    }

    // Nothing selected: insert both text and link
    const centerX = Math.max(40, (basePageDims.width || 595) / 2 - 60);
    const centerY = Math.max(40, (basePageDims.height || 842) / 2);
    const finalTxt = displayTxt && displayTxt.trim() ? displayTxt.trim() : cleanUrl;
    const newText: TextOverlay = {
      id: `txt_overlay_${Date.now()}`,
      pageIndex,
      text: finalTxt,
      x: centerX,
      y: centerY,
      size: fontSize || 14,
      color: '#2563eb',
      fontFamily: fontFamily || 'Calibri',
      isUnderline: true,
    };
    const newLink: HyperlinkOverlay = {
      id: `link_${Date.now()}`,
      pageIndex,
      url: cleanUrl,
      x: centerX,
      y: centerY - 4,
      width: Math.max(60, finalTxt.length * (fontSize || 14) * 0.65),
      height: Math.max(18, (fontSize || 14) * 1.3),
    };
    const nextOverlays = [...textOverlays, newText];
    const nextLinks = [...hyperlinks, newLink];
    setTextOverlays(nextOverlays);
    setHyperlinks(nextLinks);
    pushSnapshot({ textOverlays: nextOverlays, hyperlinks: nextLinks });
  };

  // Insert image into specific table cell
  const handleInsertCellImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedTableCell) {
      const imgFile = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const { tableId, row, col } = selectedTableCell;
        const img = new Image();
        img.onload = () => {
          const aspect = (img.naturalWidth || 100) / (img.naturalHeight || 100);
          let desiredW = 160;
          let desiredH = Math.round(desiredW / aspect);
          if (desiredH > 180) {
            desiredH = 180;
            desiredW = Math.round(desiredH * aspect);
          }
          if (desiredW < 120) desiredW = 120;
          if (desiredH < 90) desiredH = 90;

          setTables((prev) =>
            prev.map((t) => {
              if (t.id !== tableId) return t;
              const nextCellImages = { ...(t.cellImages || {}), [`${row}_${col}`]: dataUrl };
              const curRowH = t.rowHeights?.[row] || (t.height / t.rows) || 28;
              const curColW = t.colWidths?.[col] || (t.width / t.cols) || 80;
              const nextRowHeights = [...(t.rowHeights || Array(t.rows).fill(t.height / t.rows || 28))];
              const nextColWidths = [...(t.colWidths || Array(t.cols).fill(t.width / t.cols || 80))];
              nextRowHeights[row] = Math.max(curRowH, desiredH);
              nextColWidths[col] = Math.max(curColW, desiredW);
              const totalW = nextColWidths.reduce((a, b) => a + b, 0);
              const totalH = nextRowHeights.reduce((a, b) => a + b, 0);
              const diffH = totalH - (t.height || totalH);
              return {
                ...t,
                cellImages: nextCellImages,
                rowHeights: nextRowHeights,
                colWidths: nextColWidths,
                width: totalW,
                height: totalH,
                y: Math.max(10, (t.y || 100) - diffH),
              };
            })
          );
          setActiveTableImgCell(`${tableId}_${row}_${col}`);
          pushSnapshot({ tables });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(imgFile);
      e.target.value = '';
    }
  };

  const handleRemoveCellImage = (tableId: string, row: number, col: number) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const nextCellImages = { ...(t.cellImages || {}) };
        delete nextCellImages[`${row}_${col}`];
        return { ...t, cellImages: nextCellImages };
      })
    );
    if (activeTableImgCell === `${tableId}_${row}_${col}`) {
      setActiveTableImgCell(null);
    }
    pushSnapshot({ tables });
  };

  const updateActiveTableCellImageProps = (patch: Partial<any>) => {
    if (!selectedTableCell) return;
    const { tableId, row, col } = selectedTableCell;
    const key = `${row}_${col}`;
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const currentProps = t.cellImageProps?.[key] || {};
        const nextProps = { ...(t.cellImageProps || {}), [key]: { ...currentProps, ...patch } };
        return { ...t, cellImageProps: nextProps };
      })
    );
    pushSnapshot({ tables });
  };

  const updateActiveTableCellShapeProps = (patch: Partial<any>) => {
    if (!selectedTableCell) return;
    const { tableId, row, col } = selectedTableCell;
    const key = `${row}_${col}`;
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const currentShape = t.cellShapes?.[key];
        if (!currentShape) return t;
        const nextShapes = { ...(t.cellShapes || {}), [key]: { ...currentShape, ...patch } };
        return { ...t, cellShapes: nextShapes };
      })
    );
    pushSnapshot({ tables });
  };

  const handleRemoveCellShape = (tableId: string, row: number, col: number) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const nextShapes = { ...(t.cellShapes || {}) };
        delete nextShapes[`${row}_${col}`];
        return { ...t, cellShapes: nextShapes };
      })
    );
    pushSnapshot({ tables });
  };

  const handleRemoveCellSubtable = (tableId: string, row: number, col: number) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const nextSubs = { ...(t.cellSubtables || {}) };
        delete nextSubs[`${row}_${col}`];
        return { ...t, cellSubtables: nextSubs };
      })
    );
    pushSnapshot({ tables });
  };

  const handleUpdateSubtableCell = (tableId: string, row: number, col: number, subR: number, subC: number, val: string) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId || !t.cellSubtables?.[`${row}_${col}`]) return t;
        const sub = t.cellSubtables[`${row}_${col}`];
        const nextCells = sub.cells.map((r, ri) =>
          ri === subR ? r.map((c, ci) => (ci === subC ? val : c)) : r
        );
        const nextSubs = {
          ...t.cellSubtables,
          [`${row}_${col}`]: { ...sub, cells: nextCells },
        };
        return { ...t, cellSubtables: nextSubs };
      })
    );
  };

  // Apply Bullet formatting to selected text item or overlay
  const handleApplyBullet = (bulletId: string) => {
    setShowBulletsDropdown(false);
    const activeItem = activeEditingId || selectedTextItemId;
    if (activeItem) {
      const currentVal =
        modifiedTexts[activeItem]?.currentText ??
        detectedTextItems.find((t) => t.id === activeItem)?.originalText ??
        '';
      const bulleted = applyBulletToText(currentVal, bulletId);
      updateActiveTextItemProps({ currentText: bulleted, isModified: true });
      pushSnapshot({ modifiedTexts });
      return;
    }
    if (selectedOverlayId) {
      const target = textOverlays.find((t) => t.id === selectedOverlayId);
      if (target) {
        const bulleted = applyBulletToText(target.text, bulletId);
        setTextOverlays((prev) => {
          const next = prev.map((t) => (t.id === selectedOverlayId ? { ...t, text: bulleted } : t));
          pushSnapshot({ textOverlays: next });
          return next;
        });
      }
    }
  };

  // Apply Crop to Image Overlay
  const handleApplyCrop = async (imageId: string) => {
    const img = imageOverlays.find((i) => i.id === imageId);
    if (!img) return;

    try {
      const blob = new Blob([img.imageData]);
      const imgBitmap = await createImageBitmap(blob);
      const cropPxX = Math.round(cropBox.xPct * imgBitmap.width);
      const cropPxY = Math.round(cropBox.yPct * imgBitmap.height);
      const cropPxW = Math.max(1, Math.round(cropBox.wPct * imgBitmap.width));
      const cropPxH = Math.max(1, Math.round(cropBox.hPct * imgBitmap.height));

      const offCanvas = document.createElement('canvas');
      offCanvas.width = cropPxW;
      offCanvas.height = cropPxH;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(imgBitmap, cropPxX, cropPxY, cropPxW, cropPxH, 0, 0, cropPxW, cropPxH);

      const mimeType = img.imageType === 'png' ? 'image/png' : 'image/jpeg';
      const croppedBlob = await new Promise<Blob | null>((resolve) => offCanvas.toBlob(resolve, mimeType, 0.95));
      if (!croppedBlob) return;
      const newBuf = await croppedBlob.arrayBuffer();

      const newWidth = Math.max(20, Math.round(img.width * cropBox.wPct));
      const newHeight = Math.max(20, Math.round(img.height * cropBox.hPct));
      const newX = img.x + img.width * cropBox.xPct;
      const newY = img.y + img.height * (1 - cropBox.yPct - cropBox.hPct);

      const nextImages = imageOverlays.map((item) =>
        item.id === imageId
          ? {
              ...item,
              imageData: newBuf,
              width: newWidth,
              height: newHeight,
              x: newX,
              y: newY,
            }
          : item
      );
      setImageOverlays(nextImages);
      pushSnapshot({ imageOverlays: nextImages });
      setCropImageId(null);
    } catch (e) {
      console.error('Failed to crop image:', e);
    }
  };

  // Render SVG Vector for Shape Overlay
  const renderShapeSvg = (shape: ShapeOverlay) => {
    const w = shape.width;
    const h = shape.height;
    const stroke = shape.strokeColor || '#2563eb';
    const fill = shape.fillColor || 'transparent';
    const sw = shape.strokeWidth || 2;
    const strokeDash = shape.strokeStyle === 'dashed' ? '6,4' : undefined;

    switch (shape.type) {
      case 'rectangle':
        return <rect x={sw / 2} y={sw / 2} width={Math.max(1, w - sw)} height={Math.max(1, h - sw)} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />;
      case 'rounded-rectangle':
        return <rect x={sw / 2} y={sw / 2} width={Math.max(1, w - sw)} height={Math.max(1, h - sw)} rx="10" ry="10" fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />;
      case 'circle':
        return <ellipse cx={w / 2} cy={h / 2} rx={Math.max(1, (w - sw) / 2)} ry={Math.max(1, (h - sw) / 2)} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />;
      case 'triangle':
        return <polygon points={`${w / 2},${sw} ${w - sw},${h - sw} ${sw},${h - sw}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />;
      case 'diamond':
        return <polygon points={`${w / 2},${sw} ${w - sw},${h / 2} ${w / 2},${h - sw} ${sw},${h / 2}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />;
      case 'line':
        return <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />;
      case 'arrow':
        return (
          <g>
            <line x1={0} y1={h / 2} x2={Math.max(0, w - 12)} y2={h / 2} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />
            <polygon points={`${w},${h / 2} ${Math.max(0, w - 12)},${h / 2 - 6} ${Math.max(0, w - 12)},${h / 2 + 6}`} fill={stroke} />
          </g>
        );
      case 'double-arrow':
        return (
          <g>
            <line x1={12} y1={h / 2} x2={Math.max(12, w - 12)} y2={h / 2} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />
            <polygon points={`${w},${h / 2} ${Math.max(0, w - 12)},${h / 2 - 6} ${Math.max(0, w - 12)},${h / 2 + 6}`} fill={stroke} />
            <polygon points={`0,${h / 2} 12,${h / 2 - 6} 12,${h / 2 + 6}`} fill={stroke} />
          </g>
        );
      case 'star': {
        const cx = w / 2;
        const cy = h / 2;
        const outerR = Math.min(w, h) / 2 - sw;
        const innerR = outerR * 0.4;
        const pts: string[] = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />;
      }
      case 'callout': {
        const bubbleH = h * 0.75;
        return (
          <path
            d={`M 8 0 L ${w - 8} 0 Q ${w} 0 ${w} 8 L ${w} ${bubbleH - 8} Q ${w} ${bubbleH} ${w - 8} ${bubbleH} L 32 ${bubbleH} L 16 ${h} L 20 ${bubbleH} L 8 ${bubbleH} Q 0 ${bubbleH} 0 ${bubbleH - 8} L 0 8 Q 0 0 8 0 Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeDasharray={strokeDash}
          />
        );
      }
      case 'heart': {
        return (
          <path
            d={`M ${w * 0.5} ${h * 0.85} C ${w * 0.15} ${h * 0.55}, 0 ${h * 0.35}, 0 ${h * 0.2} C 0 ${h * 0.05}, ${w * 0.25} 0, ${w * 0.5} ${h * 0.25} C ${w * 0.75} 0, ${w} ${h * 0.05}, ${w} ${h * 0.2} C ${w} ${h * 0.35}, ${w * 0.85} ${h * 0.55}, ${w * 0.5} ${h * 0.85} Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeDasharray={strokeDash}
          />
        );
      }
      case 'lightning': {
        return (
          <polygon
            points={`${w * 0.5},0 ${w * 0.15},${h * 0.55} ${w * 0.45},${h * 0.55} ${w * 0.3},${h} ${w * 0.85},${h * 0.4} ${w * 0.55},${h * 0.4}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeDasharray={strokeDash}
          />
        );
      }
      case 'cloud': {
        return (
          <path
            d={`M ${w * 0.25} ${h * 0.8} C ${w * 0.1} ${h * 0.8} 0 ${h * 0.65} 0 ${h * 0.5} C 0 ${h * 0.35} ${w * 0.15} ${h * 0.22} ${w * 0.3} ${h * 0.25} C ${w * 0.38} ${h * 0.08} ${w * 0.62} ${h * 0.08} ${w * 0.7} ${h * 0.25} C ${w * 0.85} ${h * 0.22} ${w} ${h * 0.35} ${w} ${h * 0.5} C ${w} ${h * 0.65} ${w * 0.9} ${h * 0.8} ${w * 0.75} ${h * 0.8} Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            strokeDasharray={strokeDash}
          />
        );
      }
      case 'pentagon': {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) / 2 - sw;
        const pts: string[] = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />;
      }
      case 'hexagon': {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) / 2 - sw;
        const pts: string[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
          pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
        }
        return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={strokeDash} />;
      }
      default:
        return <rect x={0} y={0} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
  };

  // Render 8 Resize Handles and MS Word-Style Rotation Handle on selected Element
  const renderResizeHandles = (
    id: string,
    type: 'overlay' | 'image' | 'shape' | 'table',
    origX: number,
    origY: number,
    origW: number,
    origH: number,
    initialColWidths?: number[],
    initialRowHeights?: number[]
  ) => {
    const handles = [
      { pos: 'nw', style: { top: -4, left: -4, cursor: 'nwse-resize' } },
      { pos: 'n', style: { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
      { pos: 'ne', style: { top: -4, right: -4, cursor: 'nesw-resize' } },
      { pos: 'e', style: { top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' } },
      { pos: 'se', style: { bottom: -4, right: -4, cursor: 'nwse-resize' } },
      { pos: 's', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
      { pos: 'sw', style: { bottom: -4, left: -4, cursor: 'nesw-resize' } },
      { pos: 'w', style: { top: '50%', left: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' } },
    ];
    return (
      <>
        {/* MS Word-Style Rotation Stem & Circular Handle (Top Center) */}
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto cursor-grab active:cursor-grabbing z-50 group"
          onMouseDown={(e) => {
            e.stopPropagation();
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const rect = parent.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              const curAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
              let initialRot = 0;
              if (type === 'shape') {
                initialRot = shapes.find((s) => s.id === id)?.rotation || 0;
              } else if (type === 'table') {
                initialRot = tables.find((t) => t.id === id)?.rotation || 0;
              } else if (type === 'image') {
                initialRot = imageOverlays.find((i) => i.id === id)?.rotation || 0;
              } else if (type === 'overlay') {
                initialRot = textOverlays.find((t) => t.id === id)?.rotation || 0;
              }
              setRotatingItem({
                id,
                type,
                centerX: cx,
                centerY: cy,
                startAngle: curAngle,
                initialRot,
              });
            }
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            if (e.touches.length > 0) {
              const touch = e.touches[0];
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const rect = parent.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const curAngle = Math.atan2(touch.clientY - cy, touch.clientX - cx) * (180 / Math.PI);
                let initialRot = 0;
                if (type === 'shape') {
                  initialRot = shapes.find((s) => s.id === id)?.rotation || 0;
                } else if (type === 'table') {
                  initialRot = tables.find((t) => t.id === id)?.rotation || 0;
                } else if (type === 'image') {
                  initialRot = imageOverlays.find((i) => i.id === id)?.rotation || 0;
                } else if (type === 'overlay') {
                  initialRot = textOverlays.find((t) => t.id === id)?.rotation || 0;
                }
                setRotatingItem({
                  id,
                  type,
                  centerX: cx,
                  centerY: cy,
                  startAngle: curAngle,
                  initialRot,
                });
              }
            }
          }}
          title="Drag to Rotate (0° to 360°)"
        >
          {/* Real-time Angle Tooltip shown seamlessly without delay */}
          {rotatingItem && rotatingItem.id === id && (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-50">
              {(() => {
                let r = 0;
                if (type === 'shape') r = shapes.find((s) => s.id === id)?.rotation || 0;
                else if (type === 'table') r = tables.find((t) => t.id === id)?.rotation || 0;
                else if (type === 'image') r = imageOverlays.find((i) => i.id === id)?.rotation || 0;
                else if (type === 'overlay') r = textOverlays.find((t) => t.id === id)?.rotation || 0;
                return `${Math.round(r)}°`;
              })()}
            </div>
          )}
          <div className="w-5 h-5 rounded-full bg-white dark:bg-zinc-800 border-2 border-indigo-600 shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-transform">
            <RotateCw className="w-3 h-3 text-indigo-600" />
          </div>
          <div className="w-0.5 h-2 bg-indigo-500" />
        </div>

        {/* 4-Direction Move Handle positioned near the rotation point */}
        <div
          className="absolute -top-8 left-[calc(50%+24px)] flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-move z-50 pointer-events-auto hover:scale-110 active:scale-95 transition-all"
          title="Click and drag to move table or element"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setDraggingItem({
              id,
              type,
              startX: e.clientX,
              startY: e.clientY,
              origX,
              origY,
            });
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            if (e.touches.length > 0) {
              const touch = e.touches[0];
              setDraggingItem({
                id,
                type,
                startX: touch.clientX,
                startY: touch.clientY,
                origX,
                origY,
              });
            }
          }}
        >
          <Move className="w-3.5 h-3.5" />
        </div>

        {handles.map((h) => (
          <span
            key={h.pos}
            onMouseDown={(e) => {
              e.stopPropagation();
              setResizingItem({
                id,
                type,
                handle: h.pos,
                startX: e.clientX,
                startY: e.clientY,
                origX,
                origY,
                origW,
                origH,
                initialColWidths,
                initialRowHeights,
              });
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              if (e.touches.length > 0) {
                setResizingItem({
                  id,
                  type,
                  handle: h.pos,
                  startX: e.touches[0].clientX,
                  startY: e.touches[0].clientY,
                  origX,
                  origY,
                  origW,
                  origH,
                  initialColWidths,
                  initialRowHeights,
                });
              }
            }}
            style={h.style as any}
            className="absolute w-3 h-3 sm:w-2.5 sm:h-2.5 bg-white border-2 sm:border border-blue-600 rounded-xs shadow-xs z-50 pointer-events-auto touch-none before:content-[''] before:absolute before:-inset-2 sm:before:inset-0"
          />
        ))}
      </>
    );
  };

  // Global mouse & touch move / up listeners for smooth canvas dragging, resizing, rotating, and table sizing
  useEffect(() => {
    if (!draggingItem && !resizingItem && !rotatingItem && !resizingCol && !resizingRow) return;

    const handlePointerMove = (clientX: number, clientY: number) => {
      const scale = zoomScale;

      if (rotatingItem) {
        const currentAngle = Math.atan2(clientY - rotatingItem.centerY, clientX - rotatingItem.centerX) * (180 / Math.PI);
        const delta = currentAngle - rotatingItem.startAngle;
        let newRot = Math.round((rotatingItem.initialRot + delta + 360) % 360);
        if (rotatingItem.type === 'shape') {
          setShapes((prev) => prev.map((s) => (s.id === rotatingItem.id ? { ...s, rotation: newRot } : s)));
        } else if (rotatingItem.type === 'table') {
          setTables((prev) => prev.map((t) => (t.id === rotatingItem.id ? { ...t, rotation: newRot } : t)));
        } else if (rotatingItem.type === 'image') {
          setImageOverlays((prev) => prev.map((i) => (i.id === rotatingItem.id ? { ...i, rotation: newRot } : i)));
        } else if (rotatingItem.type === 'overlay') {
          setTextOverlays((prev) => prev.map((t) => (t.id === rotatingItem.id ? { ...t, rotation: newRot } : t)));
        }
        return;
      }

      if (resizingCol || resizingRow) {
        const deltaX = resizingCol ? (clientX - resizingCol.startX) / scale : 0;
        const deltaY = resizingRow ? (clientY - resizingRow.startY) / scale : 0;
        const targetTableId = resizingCol?.tableId || resizingRow?.tableId;

        setTables((prev) =>
          prev.map((t) => {
            if (t.id !== targetTableId) return t;
            let updated = { ...t };
            if (resizingCol) {
              const widths = [...resizingCol.initialColWidths];
              const newW = Math.max(30, resizingCol.initialWidth + deltaX);
              widths[resizingCol.colIdx] = newW;
              updated.colWidths = widths;
              updated.width = widths.reduce((a, b) => a + b, 0);
            }
            if (resizingRow) {
              const heights = [...resizingRow.initialRowHeights];
              const newH = Math.max(22, resizingRow.initialHeight + deltaY);
              heights[resizingRow.rowIdx] = newH;
              const newTotalH = heights.reduce((a, b) => a + b, 0);
              const newY = (resizingRow.initialTableY + resizingRow.initialTotalHeight) - newTotalH;
              updated.rowHeights = heights;
              updated.height = newTotalH;
              updated.y = newY;
            }
            return updated;
          })
        );
        return;
      }

      if (draggingItem) {
        // Continuous inter-page dragging: check target page under pointer
        const pageEl = document.elementsFromPoint(clientX, clientY).find((el) => el.hasAttribute('data-page-number'));
        if (pageEl) {
          const targetPage = parseInt(pageEl.getAttribute('data-page-number')!, 10);
          const targetPageIndex = targetPage - 1;
          const rect = pageEl.getBoundingClientRect();

          let itemW = 100;
          let itemH = 60;
          if (draggingItem.type === 'shape') {
            const sh = shapes.find((s) => s.id === draggingItem.id);
            if (sh) { itemW = sh.width; itemH = sh.height; }
          } else if (draggingItem.type === 'table') {
            const tb = tables.find((t) => t.id === draggingItem.id);
            if (tb) { itemW = tb.width; itemH = tb.height; }
          } else if (draggingItem.type === 'image') {
            const im = imageOverlays.find((i) => i.id === draggingItem.id);
            if (im) { itemW = im.width; itemH = im.height; }
          } else if (draggingItem.type === 'overlay') {
            const tx = textOverlays.find((t) => t.id === draggingItem.id);
            if (tx) { itemW = 120; itemH = 30; }
          }

          // Calculate coordinates relative to this page, strictly clamped within page boundaries so nothing is ever in the gap
          const rawX = (clientX - rect.left) / scale - itemW / 2;
          const rawY = (rect.height - (clientY - rect.top)) / scale - itemH / 2;
          const clampedX = Math.round(Math.max(10, Math.min((basePageDims.width || 595) - itemW - 10, rawX)) * 10) / 10;
          const clampedY = Math.round(Math.max(10, Math.min((basePageDims.height || 842) - itemH - 10, rawY)) * 10) / 10;

          if (draggingItem.type === 'shape') {
            setShapes((prev) => prev.map((s) => (s.id === draggingItem.id ? { ...s, pageIndex: targetPageIndex, x: clampedX, y: clampedY } : s)));
          } else if (draggingItem.type === 'table') {
            setTables((prev) => prev.map((t) => (t.id === draggingItem.id ? { ...t, pageIndex: targetPageIndex, x: clampedX, y: clampedY } : t)));
          } else if (draggingItem.type === 'image') {
            setImageOverlays((prev) => prev.map((i) => (i.id === draggingItem.id ? { ...i, pageIndex: targetPageIndex, x: clampedX, y: clampedY } : i)));
          } else if (draggingItem.type === 'overlay') {
            setTextOverlays((prev) => prev.map((t) => (t.id === draggingItem.id ? { ...t, pageIndex: targetPageIndex, x: clampedX, y: clampedY } : t)));
          }
          if (currentPage !== targetPage) {
            setCurrentPage(targetPage);
          }
          return;
        }

        // Pointer over inter-page gap: clamp position safely within current page
        const deltaX = (clientX - draggingItem.startX) / scale;
        const deltaY = -(clientY - draggingItem.startY) / scale;
        const newX = Math.round(Math.max(10, Math.min((basePageDims.width || 595) - 60, draggingItem.origX + deltaX)) * 10) / 10;
        const newY = Math.round(Math.max(10, Math.min((basePageDims.height || 842) - 40, draggingItem.origY + deltaY)) * 10) / 10;

        if (draggingItem.type === 'shape') {
          setShapes((prev) => prev.map((s) => (s.id === draggingItem.id ? { ...s, x: newX, y: newY } : s)));
        } else if (draggingItem.type === 'table') {
          setTables((prev) => prev.map((t) => (t.id === draggingItem.id ? { ...t, x: newX, y: newY } : t)));
        } else if (draggingItem.type === 'image') {
          setImageOverlays((prev) => prev.map((i) => (i.id === draggingItem.id ? { ...i, x: newX, y: newY } : i)));
        } else if (draggingItem.type === 'overlay') {
          setTextOverlays((prev) => prev.map((t) => (t.id === draggingItem.id ? { ...t, x: newX, y: newY } : t)));
        }
      } else if (resizingItem) {
        // Delta in screen points:
        // deltaX > 0 means moving right, deltaX < 0 means moving left
        // deltaY > 0 means moving down, deltaY < 0 means moving up
        const deltaX = (clientX - resizingItem.startX) / scale;
        const deltaY = (clientY - resizingItem.startY) / scale;
        const h = resizingItem.handle;

        let nextW = resizingItem.origW;
        let nextH = resizingItem.origH;
        let nextX = resizingItem.origX;
        let nextY = resizingItem.origY;

        // East: right handle (drag right to increase width, left edge stays fixed)
        if (h.includes('e')) {
          nextW = Math.max(20, resizingItem.origW + deltaX);
        }
        // West: left handle (drag left to increase width, right edge stays fixed)
        if (h.includes('w')) {
          const proposedW = Math.max(20, resizingItem.origW - deltaX);
          nextX = resizingItem.origX + resizingItem.origW - proposedW;
          nextW = proposedW;
        }
        // South: bottom handle on screen (drag down to increase height, top edge in PDF stays fixed)
        if (h.includes('s')) {
          const proposedH = Math.max(15, resizingItem.origH + deltaY);
          nextY = (resizingItem.origY + resizingItem.origH) - proposedH;
          nextH = proposedH;
        }
        // North: top handle on screen (drag up to increase height, bottom edge in PDF stays fixed)
        if (h.includes('n')) {
          const proposedH = Math.max(15, resizingItem.origH - deltaY);
          nextY = resizingItem.origY;
          nextH = proposedH;
        }

        if (resizingItem.type === 'shape') {
          setShapes((prev) =>
            prev.map((s) =>
              s.id === resizingItem.id ? { ...s, x: nextX, y: nextY, width: nextW, height: nextH } : s
            )
          );
        } else if (resizingItem.type === 'table') {
          setTables((prev) =>
            prev.map((t) => {
              if (t.id !== resizingItem.id) return t;
              const wRatio = nextW / Math.max(1, resizingItem.origW);
              const hRatio = nextH / Math.max(1, resizingItem.origH);
              const baseCols = resizingItem.initialColWidths || t.colWidths || Array(t.cols).fill(resizingItem.origW / t.cols);
              const baseRows = resizingItem.initialRowHeights || t.rowHeights || Array(t.rows).fill(resizingItem.origH / t.rows);
              const newColWidths = baseCols.map((cw: number) => cw * wRatio);
              const newRowHeights = baseRows.map((rh: number) => rh * hRatio);
              return {
                ...t,
                x: nextX,
                y: nextY,
                width: nextW,
                height: nextH,
                colWidths: newColWidths,
                rowHeights: newRowHeights,
              };
            })
          );
        } else if (resizingItem.type === 'image') {
          setImageOverlays((prev) =>
            prev.map((i) =>
              i.id === resizingItem.id ? { ...i, x: nextX, y: nextY, width: nextW, height: nextH } : i
            )
          );
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onPointerUp = () => {
      if (draggingItem) {
        pushSnapshot({ shapes, tables, imageOverlays, textOverlays });
        setDraggingItem(null);
      }
      if (resizingItem) {
        pushSnapshot({ shapes, tables, imageOverlays, textOverlays });
        setResizingItem(null);
      }
      if (rotatingItem) {
        pushSnapshot({ shapes, tables, imageOverlays, textOverlays });
        setRotatingItem(null);
      }
      if (resizingCol || resizingRow) {
        pushSnapshot({ tables });
        setResizingCol(null);
        setResizingRow(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onPointerUp, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [
    draggingItem,
    resizingItem,
    rotatingItem,
    resizingCol,
    resizingRow,
    zoomScale,
    shapes,
    tables,
    imageOverlays,
    textOverlays,
    pushSnapshot,
  ]);

  // Click on Canvas to Add Text or Hyperlink
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>, pageNumOverride?: number) => {
    const activePage = pageNumOverride ?? currentPage;
    const targetCanvas = pageCanvasesRef.current.get(activePage) || canvasRef.current;
    if (!targetCanvas) return;
    const rect = targetCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 0 || clickY < 0 || clickX > rect.width || clickY > rect.height) return;

    if (isSamplingColor) {
      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const pixelRatio = targetCanvas.width / rect.width;
        const p = ctx.getImageData(Math.floor(clickX * pixelRatio), Math.floor(clickY * pixelRatio), 1, 1).data;
        const hex = `#${((1 << 24) + (p[0] << 16) + (p[1] << 8) + p[2]).toString(16).slice(1)}`;
        applyNewColor(hex);
      }
      setIsSamplingColor(false);
      return;
    }

    if (['pen', 'pencil', 'highlighter', 'eraser'].includes(activeTool)) {
      return;
    }

    if (activeTool !== 'add-text' && activeTool !== 'add-link') {
      setSelectedTableId(null);
      setSelectedTableCell(null);
      setSelectedShapeId(null);
      setSelectedOverlayId(null);
      setSelectedTextItemId(null);
      setMultiSelectedIds([]);
      setActiveEditingId(null);
      setActiveTableImgCell(null);
      return;
    }

    const scaleFactor = zoomScale;
    const pdfX = clickX / scaleFactor;
    const pdfY = (rect.height - clickY) / scaleFactor;
    const pageIndex = activePage - 1;

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
        alignment: alignment === 'justify' ? 'left' : alignment,
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

  // Drawing Event Handlers (Pen, Pencil, Highlighter, Eraser)
  const handleDrawingStart = (e: React.PointerEvent<HTMLDivElement>, pageIndex: number) => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = clientX / zoomScale;
    const y = clientY / zoomScale;

    setIsDrawingMouseDown(true);

    if (activeTool === 'eraser') {
      setEraserCursorPos({ x: clientX, y: clientY });
      eraseStrokesAtPoint(pageIndex, x, y, eraserRadius / zoomScale);
      return;
    }

    let thickness = penThickness;
    let color = drawingColor;
    let opacity = 1;
    let blendMode: 'source-over' | 'multiply' = 'source-over';

    if (activeTool === 'pencil') {
      thickness = pencilThickness;
      color = drawingColor;
      opacity = 0.85;
    } else if (activeTool === 'highlighter') {
      thickness = highlighterThickness;
      color = highlighterColor;
      opacity = 0.45;
      blendMode = 'multiply';
    }

    const newStroke: DrawingStroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tool: activeTool as any,
      pageIndex,
      points: [{ x, y, pressure: e.pressure || 0.5 }],
      color,
      thickness,
      opacity,
      blendMode,
    };

    setCurrentStroke(newStroke);
  };

  const handleDrawingMove = (e: React.PointerEvent<HTMLDivElement>, pageIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = clientX / zoomScale;
    const y = clientY / zoomScale;

    if (activeTool === 'eraser') {
      setEraserCursorPos({ x: clientX, y: clientY });
      if (isDrawingMouseDown) {
        eraseStrokesAtPoint(pageIndex, x, y, eraserRadius / zoomScale);
      }
      return;
    }

    if (!isDrawingMouseDown || !currentStroke) return;

    setCurrentStroke((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y, pressure: e.pressure || 0.5 }],
      };
    });
  };

  const handleDrawingEnd = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (e) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    setIsDrawingMouseDown(false);

    if (activeTool === 'eraser') {
      return;
    }

    if (!currentStroke || currentStroke.points.length < 2) {
      setCurrentStroke(null);
      return;
    }

    let finalPoints = currentStroke.points;
    if (snapToShape) {
      finalPoints = snapStrokeToGeometricShape(currentStroke.points);
    }

    const completedStroke: DrawingStroke = {
      ...currentStroke,
      points: finalPoints,
    };

    const nextDrawings = [...drawings, completedStroke];
    setDrawings(nextDrawings);
    setCurrentStroke(null);
    pushSnapshot({ drawings: nextDrawings });
  };

  const eraseStrokesAtPoint = (pageIndex: number, x: number, y: number, radius: number) => {
    setDrawings((prev) => {
      const remaining = prev.filter((stroke) => {
        if (stroke.pageIndex !== pageIndex) return true;
        const hit = stroke.points.some((p) => {
          const dx = p.x - x;
          const dy = p.y - y;
          const strThick = stroke.thickness || stroke.width || 2;
          return Math.hypot(dx, dy) <= radius + strThick / 2;
        });
        return !hit;
      });
      if (remaining.length !== prev.length) {
        pushSnapshot({ drawings: remaining });
      }
      return remaining;
    });
  };

  // Insert Pages from Other PDF
  const handleInsertPagesFromOtherPdf = async (
    donorFile: File,
    position: 'before' | 'after' | 'start' | 'end',
    rangeString?: string
  ) => {
    if (!file) return;
    try {
      setIsSaving(true);
      const targetBuffer = arrayBuffer || (await file.arrayBuffer());
      const donorBuffer = await donorFile.arrayBuffer();

      let pageIndices: number[] | undefined = undefined;
      if (rangeString && rangeString.trim() !== '') {
        const indices: number[] = [];
        const parts = rangeString.split(',').map((p) => p.trim());
        for (const part of parts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                indices.push(i - 1);
              }
            }
          } else {
            const p = parseInt(part, 10);
            if (!isNaN(p)) indices.push(p - 1);
          }
        }
        if (indices.length > 0) {
          pageIndices = Array.from(new Set(indices));
        }
      }

      const targetIdx = currentPage - 1;
      const { buffer, newTotalPages } = await PdfStudioEngine.insertPagesFromOtherPdf(
        targetBuffer,
        donorBuffer,
        position,
        targetIdx,
        pageIndices
      );

      const mergedBlob = new Blob([buffer], { type: 'application/pdf' });
      const mergedFile = new File([mergedBlob], file.name, { type: 'application/pdf' });

      setArrayBuffer(buffer);
      setFile(mergedFile);
      setTotalPages(newTotalPages);

      let nextCurrent = currentPage;
      if (position === 'start') nextCurrent = 1;
      else if (position === 'after') nextCurrent = currentPage + 1;
      else if (position === 'end') nextCurrent = newTotalPages;
      setCurrentPage(Math.min(nextCurrent, newTotalPages));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('Failed to insert pages from other PDF:', err);
      setError('Failed to insert pages: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDonorFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const donorFile = e.target.files[0];
      await handleInsertPagesFromOtherPdf(donorFile, 'after');
      e.target.value = '';
      setShowInsertPageDropdown(false);
    }
  };

  // Add Photo / Image Overlay or insert into selected table cell
  const handleAddPhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];

      if (selectedTableCell) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const { tableId, row, col } = selectedTableCell;
          const img = new Image();
          img.onload = () => {
            const aspect = (img.naturalWidth || 100) / (img.naturalHeight || 100);
            let desiredW = 160;
            let desiredH = Math.round(desiredW / aspect);
            if (desiredH > 180) {
              desiredH = 180;
              desiredW = Math.round(desiredH * aspect);
            }
            if (desiredW < 120) desiredW = 120;
            if (desiredH < 90) desiredH = 90;

            setTables((prev) =>
              prev.map((t) => {
                if (t.id !== tableId) return t;
                const nextCellImages = { ...(t.cellImages || {}), [`${row}_${col}`]: dataUrl };
                const curRowH = t.rowHeights?.[row] || (t.height / t.rows) || 28;
                const curColW = t.colWidths?.[col] || (t.width / t.cols) || 80;
                const nextRowHeights = [...(t.rowHeights || Array(t.rows).fill(t.height / t.rows || 28))];
                const nextColWidths = [...(t.colWidths || Array(t.cols).fill(t.width / t.cols || 80))];
                nextRowHeights[row] = Math.max(curRowH, desiredH);
                nextColWidths[col] = Math.max(curColW, desiredW);
                const totalW = nextColWidths.reduce((a, b) => a + b, 0);
                const totalH = nextRowHeights.reduce((a, b) => a + b, 0);
                const diffH = totalH - (t.height || totalH);
                return {
                  ...t,
                  cellImages: nextCellImages,
                  rowHeights: nextRowHeights,
                  colWidths: nextColWidths,
                  width: totalW,
                  height: totalH,
                  y: Math.max(10, (t.y || 100) - diffH),
                };
              })
            );
            setActiveTableImgCell(`${tableId}_${row}_${col}`);
            pushSnapshot({ tables });
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(imgFile);
        e.target.value = '';
        return;
      }

      const isPng = imgFile.type === 'image/png';
      imgFile.arrayBuffer().then((buf) => {
        const imgW = 160;
        const imgH = 120;
        const { pageIndex: targetPage, x: imgX, y: imgY } = getInsertionCoords(imgW, imgH);

        const newImg: ImageOverlay = {
          id: `img_${Date.now()}`,
          pageIndex: targetPage,
          imageData: buf,
          imageType: isPng ? 'png' : 'jpeg',
          x: imgX,
          y: imgY,
          width: imgW,
          height: imgH,
        };
        const nextImages = [...imageOverlays, newImg];
        setImageOverlays(nextImages);
        setSelectedOverlayId(newImg.id);
        pushSnapshot({ imageOverlays: nextImages });
      });
      e.target.value = '';
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
        shapes,
        tables,
        textReplacements: Object.values(modifiedTexts),
        hyperlinks,
        pageBorders,
        pageNumberConfig,
        drawings,
        watermarkConfig: watermarkConfig || undefined,
      });

      const isMobileNative = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
      if (isMobileNative) {
        await saveFile(editedBlob, `print_${file.name || 'document'}.pdf`);
        return;
      }

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
  const currentPageRef = useRef<number>(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);
  const totalPagesRef = useRef<number>(totalPages);
  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

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
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        const next = Math.min(4.0, Math.max(0.25, Number((zoomScaleRef.current + delta).toFixed(2))));
        zoomScaleRef.current = next;
        if (wheelTimeout) clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          setZoomScale(next);
        }, 50);
      }
      // Native continuous scrolling operates freely without wheel interception
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

      // Copy: Ctrl+C (when shape, table, image, text selected and not typing in an input)
      if (isCtrlOrMeta && e.key.toLowerCase() === 'c') {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          if (selectedShapeId) {
            const shp = shapes.find((s) => s.id === selectedShapeId);
            if (shp) clipboardRef.current = { type: 'shape', data: { ...shp } };
            return;
          }
          if (selectedTableId) {
            const tbl = tables.find((t) => t.id === selectedTableId);
            if (tbl) clipboardRef.current = { type: 'table', data: JSON.parse(JSON.stringify(tbl)) };
            return;
          }
          if (selectedOverlayId) {
            const img = imageOverlays.find((i) => i.id === selectedOverlayId);
            if (img) {
              clipboardRef.current = { type: 'image', data: { ...img } };
              return;
            }
            const txt = textOverlays.find((t) => t.id === selectedOverlayId);
            if (txt) {
              clipboardRef.current = { type: 'text', data: { ...txt } };
              return;
            }
          }
        }
      }

      // Paste: Ctrl+V (when not typing in an input)
      if (isCtrlOrMeta && e.key.toLowerCase() === 'v') {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && clipboardRef.current) {
          e.preventDefault();
          const pageIndex = currentPage - 1;
          if (clipboardRef.current.type === 'shape') {
            const newShape: ShapeOverlay = {
              ...clipboardRef.current.data,
              id: `shape_${Date.now()}`,
              pageIndex,
              x: clipboardRef.current.data.x + 20,
              y: clipboardRef.current.data.y - 20,
            };
            setShapes((prev) => {
              const next = [...prev, newShape];
              pushSnapshot({ shapes: next });
              return next;
            });
            setSelectedShapeId(newShape.id);
            setSelectedTableId(null);
            setSelectedTableCell(null);
            setSelectedOverlayId(null);
            return;
          }
          if (clipboardRef.current.type === 'table') {
            const newTable: TableOverlay = {
              ...clipboardRef.current.data,
              id: `tbl_${Date.now()}`,
              pageIndex,
              x: clipboardRef.current.data.x + 20,
              y: clipboardRef.current.data.y - 20,
            };
            setTables((prev) => {
              const next = [...prev, newTable];
              pushSnapshot({ tables: next });
              return next;
            });
            setSelectedTableId(newTable.id);
            setSelectedTableCell(null);
            setSelectedShapeId(null);
            setSelectedOverlayId(null);
            return;
          }
          if (clipboardRef.current.type === 'image') {
            const newImg: ImageOverlay = {
              ...clipboardRef.current.data,
              id: `img_${Date.now()}`,
              pageIndex,
              x: clipboardRef.current.data.x + 20,
              y: clipboardRef.current.data.y - 20,
            };
            setImageOverlays((prev) => {
              const next = [...prev, newImg];
              pushSnapshot({ imageOverlays: next });
              return next;
            });
            setSelectedOverlayId(newImg.id);
            setSelectedShapeId(null);
            setSelectedTableId(null);
            setSelectedTableCell(null);
            return;
          }
          if (clipboardRef.current.type === 'text') {
            const newTxt: TextOverlay = {
              ...clipboardRef.current.data,
              id: `txt_overlay_${Date.now()}`,
              pageIndex,
              x: clipboardRef.current.data.x + 20,
              y: clipboardRef.current.data.y - 20,
            };
            setTextOverlays((prev) => {
              const next = [...prev, newTxt];
              pushSnapshot({ textOverlays: next });
              return next;
            });
            setSelectedOverlayId(newTxt.id);
            setSelectedShapeId(null);
            setSelectedTableId(null);
            setSelectedTableCell(null);
            return;
          }
        }
      }

      // Cut: Ctrl+X (when text selected or item active)
      if (isCtrlOrMeta && e.key.toLowerCase() === 'x') {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          const activeItem = activeEditingId || selectedTextItemId;
          if (activeItem) {
            e.preventDefault();
            const currentVal =
              modifiedTexts[activeItem]?.currentText ??
              detectedTextItems.find((t) => t.id === activeItem)?.originalText ??
              '';
            navigator.clipboard?.writeText(currentVal);
            updateActiveTextItemProps({ currentText: '', isModified: true });
            return;
          }
          if (selectedShapeId) {
            e.preventDefault();
            const shp = shapes.find((s) => s.id === selectedShapeId);
            if (shp) clipboardRef.current = { type: 'shape', data: { ...shp } };
            setShapes((prev) => {
              const next = prev.filter((s) => s.id !== selectedShapeId);
              pushSnapshot({ shapes: next });
              return next;
            });
            setSelectedShapeId(null);
            return;
          }
          if (selectedTableId) {
            e.preventDefault();
            const tbl = tables.find((t) => t.id === selectedTableId);
            if (tbl) clipboardRef.current = { type: 'table', data: JSON.parse(JSON.stringify(tbl)) };
            setTables((prev) => {
              const next = prev.filter((t) => t.id !== selectedTableId);
              pushSnapshot({ tables: next });
              return next;
            });
            setSelectedTableId(null);
            setSelectedTableCell(null);
            return;
          }
          if (selectedOverlayId) {
            e.preventDefault();
            const img = imageOverlays.find((i) => i.id === selectedOverlayId);
            if (img) clipboardRef.current = { type: 'image', data: { ...img } };
            const txt = textOverlays.find((t) => t.id === selectedOverlayId);
            if (txt) clipboardRef.current = { type: 'text', data: { ...txt } };

            setTextOverlays((prev) => {
              const next = prev.filter((t) => t.id !== selectedOverlayId);
              pushSnapshot({ textOverlays: next });
              return next;
            });
            setImageOverlays((prev) => {
              const next = prev.filter((i) => i.id !== selectedOverlayId);
              pushSnapshot({ imageOverlays: next });
              return next;
            });
            setHyperlinks((prev) => {
              const next = prev.filter((h) => h.id !== selectedOverlayId);
              pushSnapshot({ hyperlinks: next });
              return next;
            });
            setSelectedOverlayId(null);
            return;
          }
        }
      }

      // Delete key handler
      const hasSelectedItem = Boolean(
        selectedTableCell || selectedOverlayId || selectedTextItemId || selectedShapeId || selectedTableId || selectedBorderPage !== null
      );

      if (e.key === 'Delete' || (e.key === 'Backspace' && hasSelectedItem)) {
        const activeEl = document.activeElement;
        const tag = (activeEl?.tagName || '').toLowerCase();
        const isEditable = tag === 'input' || tag === 'textarea' || (activeEl as HTMLElement)?.isContentEditable;
        if (!isEditable) {
          e.preventDefault();

          // 0. If page border is selected, delete the border immediately without popup
          if (selectedBorderPage !== null) {
            let nextBorders: Record<number, PageBorderConfig> = {};
            setPageBorders((prev) => {
              const next = { ...prev };
              delete next[selectedBorderPage];
              nextBorders = next;
              return next;
            });
            pushSnapshot({ pageBorders: nextBorders });
            setSelectedBorderPage(null);
            return;
          }

          // 1. If inside a table cell and cell has element (photo, shape, subtable), delete that element
          if (selectedTableCell) {
            const { tableId, row, col } = selectedTableCell;
            const cellKey = `${row}_${col}`;
            const targetTable = tables.find((t) => t.id === tableId);
            const hasCellImg = Boolean(targetTable?.cellImages?.[cellKey]);
            const hasCellShape = Boolean(targetTable?.cellShapes?.[cellKey]);
            const hasCellSub = Boolean(targetTable?.cellSubtables?.[cellKey]);

            if (hasCellImg || hasCellShape || hasCellSub) {
              setTables((prev) => {
                const next = prev.map((t) => {
                  if (t.id !== tableId) return t;
                  const nextImgs = { ...(t.cellImages || {}) };
                  delete nextImgs[cellKey];
                  const nextShapes = { ...(t.cellShapes || {}) };
                  delete nextShapes[cellKey];
                  const nextSubs = { ...(t.cellSubtables || {}) };
                  delete nextSubs[cellKey];
                  const nextProps = { ...(t.cellImageProps || {}) };
                  delete nextProps[cellKey];
                  return {
                    ...t,
                    cellImages: nextImgs,
                    cellShapes: nextShapes,
                    cellSubtables: nextSubs,
                    cellImageProps: nextProps,
                  };
                });
                pushSnapshot({ tables: next });
                return next;
              });
              setActiveTableImgCell(null);
              return;
            }
          }

          // 2. If entire table is selected, delete the table
          if (selectedTableId) {
            setTables((prev) => {
              const next = prev.filter((t) => t.id !== selectedTableId);
              pushSnapshot({ tables: next });
              return next;
            });
            setSelectedTableId(null);
            setSelectedTableCell(null);
            setActiveTableImgCell(null);
            return;
          }

          // 3. If shape is selected, delete shape
          if (selectedShapeId) {
            setShapes((prev) => {
              const next = prev.filter((s) => s.id !== selectedShapeId);
              pushSnapshot({ shapes: next });
              return next;
            });
            setSelectedShapeId(null);
            return;
          }

          // 4. If image or text overlay is selected, delete it
          if (selectedOverlayId) {
            setTextOverlays((prev) => {
              const next = prev.filter((t) => t.id !== selectedOverlayId);
              pushSnapshot({ textOverlays: next });
              return next;
            });
            setImageOverlays((prev) => {
              const next = prev.filter((i) => i.id !== selectedOverlayId);
              pushSnapshot({ imageOverlays: next });
              return next;
            });
            setHyperlinks((prev) => {
              const next = prev.filter((h) => h.id !== selectedOverlayId);
              pushSnapshot({ hyperlinks: next });
              return next;
            });
            setSelectedOverlayId(null);
            return;
          }

          // 5. If document text item is selected
          if (selectedTextItemId) {
            updateActiveTextItemProps({ currentText: '', isModified: true });
            return;
          }

          // 6. If nothing is selected, do NOT prompt to delete page (only explicit toolbar button triggers page deletion)
        }
      }

      const activeEl = document.activeElement;
      const tag = (activeEl?.tagName || '').toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || (activeEl as HTMLElement)?.isContentEditable;

      if (!isEditable) {
        // Drawing tools shortcuts
        if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          if (e.shiftKey) {
            setActiveTool('pencil');
          } else {
            setActiveTool('pen');
          }
          return;
        }
        if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          setActiveTool('highlighter');
          return;
        }
        if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          setActiveTool('eraser');
          return;
        }
        if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          setSnapToShape((prev) => !prev);
          return;
        }

        // Alt shortcuts for dialogs
        if (e.altKey && (e.key === 'w' || e.key === 'W')) {
          e.preventDefault();
          const isAndroid = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
          if (isAndroid) {
            setShowWatermarkDropdown((prev) => !prev);
          } else {
            setShowWatermarkModal(true);
          }
          return;
        }
        if (e.altKey && (e.key === 'n' || e.key === 'N')) {
          e.preventDefault();
          const isAndroid = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
          if (isAndroid) {
            setShowPageNumberDropdown((prev) => !prev);
          } else {
            setShowPageNumberModal(true);
          }
          return;
        }
        if (e.altKey && (e.key === 'b' || e.key === 'B')) {
          e.preventDefault();
          const isAndroid = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
          if (isAndroid) {
            setShowBorderDropdown((prev) => !prev);
          } else {
            setShowBorderModal(true);
          }
          return;
        }
        if (e.altKey && (e.key === 'i' || e.key === 'I')) {
          e.preventDefault();
          const isAndroid = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
          if (isAndroid) {
            setShowInsertPageDropdown((prev) => !prev);
          } else {
            setInsertPageInitialMode('blank');
            setShowInsertPageModal(true);
          }
          return;
        }
      }

      // Escape: clear selection / cancel edit / close popups
      if (e.key === 'Escape') {
        setActiveEditingId(null);
        setSelectedTextItemId(null);
        setSelectedOverlayId(null);
        setSelectedShapeId(null);
        setSelectedTableId(null);
        setSelectedTableCell(null);
        setSelectedBorderPage(null);
        setCropImageId(null);
        setShowWatermarkModal(false);
        setShowBorderModal(false);
        setShowInsertPageModal(false);
        setShowPageNumberModal(false);
        setShowDrawDropdown(false);
        setShowWatermarkDropdown(false);
        setShowInsertPageDropdown(false);
        setShowPageNumberDropdown(false);
        if (['pen', 'pencil', 'highlighter', 'eraser'].includes(activeTool)) {
          setActiveTool('view');
        }
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
    selectedShapeId,
    selectedTableId,
    selectedTableCell,
    selectedBorderPage,
    tables,
    shapes,
    imageOverlays,
    textOverlays,
    currentPage,
    detectedTextItems,
    modifiedTexts,
    handleUndo,
    handleRedo,
    updateActiveTextItemProps,
    pushSnapshot,
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
      <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-zinc-950 border-b border-zinc-800 overflow-x-auto no-scrollbar flex-shrink-0 z-30 select-none">
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
              {/* Chrome-Style Individual Close Button on EVERY tab */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (tabs.length <= 1) {
                    handleRequestClose();
                  } else {
                    handleRequestCloseTab(tab.id);
                  }
                }}
                className="p-1 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors ml-1"
                title="Close Tab"
              >
                <X className="w-3 h-3" />
              </button>
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

        {/* Far Right: Integrated Close Window/Editor Button */}
        <div className="ml-auto flex items-center pl-2 flex-shrink-0">
          <button
            onClick={handleRequestClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-rose-600/80 transition-colors text-xs font-semibold"
            title="Close Editor"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Close</span>
          </button>
        </div>
      </div>

      {/* TIER 1: Primary Header Bar (ALWAYS clean & comfortable on Desktop & Android) */}
      <header
        className="px-3 sm:px-5 py-2 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 z-30 flex-shrink-0 min-h-[42px]"
        style={{
          paddingTop: 'max(0.4rem, env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Thumbnail Sidebar Toggle (Clean & unobtrusive, close is now integrated into tabs) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800 shadow-2xs transition-colors"
              title="Toggle Page Thumbnails"
            >
              {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Center: File Title & High-Contrast Page Stepper */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[260px]">
              {file?.name || 'Untitled Document.pdf'}
            </span>
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-300 dark:border-zinc-700 text-xs flex-shrink-0 shadow-2xs">
              <button
                onClick={() => {
                const target = Math.max(1, currentPage - 1);
                setCurrentPage(target);
                document.getElementById(`pdf-page-frame-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
                disabled={currentPage <= 1}
                className="p-1 bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 rounded disabled:opacity-30 border border-zinc-200 dark:border-zinc-600 shadow-2xs transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-zinc-800 dark:text-zinc-200" />
              </button>
              <span className="px-1.5 font-mono text-[11px] font-bold text-zinc-900 dark:text-zinc-100 select-none">
                {currentPage}/{totalPages || 1}
              </span>
              <button
                onClick={() => {
                const target = Math.min(totalPages, currentPage + 1);
                setCurrentPage(target);
                document.getElementById(`pdf-page-frame-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
                disabled={currentPage >= totalPages}
                className="p-1 bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 rounded disabled:opacity-30 border border-zinc-200 dark:border-zinc-600 shadow-2xs transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5 text-zinc-800 dark:text-zinc-200" />
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

            {/* Ribbon Collapse Toggle Button */}
            <button
              onClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
              className={`p-1.5 rounded-lg border text-xs flex items-center justify-center transition-colors ${
                isRibbonCollapsed
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={isRibbonCollapsed ? 'Expand Tools Ribbon (Right-click ribbon also toggles)' : 'Collapse Tools Ribbon (Right-click ribbon also toggles)'}
            >
              {isRibbonCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
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

      {/* TIER 2: Classified & Categorized Mobile & Desktop Tools Strip */}
      {!isRibbonCollapsed && (
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          setIsRibbonCollapsed((prev) => !prev);
        }}
        className="flex items-center gap-2 overflow-x-auto touch-pan-x overscroll-x-contain no-scrollbar px-3 py-1.5 pr-16 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs flex-shrink-0 flex-nowrap whitespace-nowrap min-h-[40px]"
      >
        {/* GROUP 1: EDIT */}
        <div className="flex items-center bg-white dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 gap-0.5 shadow-2xs flex-shrink-0">
          <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase px-1.5 select-none tracking-wider">
            EDIT
          </span>

          <button
            onClick={() => {
              setActiveTool('view');
              setActiveEditingId(null);
              setSelectedTextItemId(null);
              setSelectedOverlayId(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
              activeTool === 'view'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
            title="Read Mode - Pristine viewing without edit bounding boxes"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Read</span>
          </button>

          <button
            onClick={() => {
              setActiveTool('edit-text');
              setSelectedOverlayId(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
              activeTool === 'edit-text'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
              activeTool === 'add-text'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
            title="Add Text - Insert new formatted text anywhere on document"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Add Text</span>
          </button>

          <button
            onClick={() => {
              setActiveTool('add-link');
              handleOpenLinkModal();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
              activeTool === 'add-link'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
            title="Add Hyperlink to selected text or insert fresh link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link</span>
          </button>
        </div>

        {/* GROUP 2: INSERT */}
        <div className="flex items-center bg-white dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 gap-0.5 shadow-2xs flex-shrink-0">
          <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase px-1.5 select-none tracking-wider">
            INSERT
          </span>

          <label
            className="flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
            title="Insert Image / Photo"
          >
            <input type="file" accept="image/*" onChange={handleAddPhotoInput} className="hidden" />
            <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>Photo</span>
          </label>

          {/* MS Word Shapes Dropdown */}
          <div className="flex-shrink-0">
            <button
              ref={shapesBtnRef}
              onClick={toggleShapesDropdown}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
                showShapesDropdown
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="MS Word Shapes Toolset"
            >
              <Shapes className="w-3.5 h-3.5 text-indigo-500" />
              <span>Shapes</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showShapesDropdown &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowShapesDropdown(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-64 max-w-[calc(100vw-24px)] max-h-[45vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 animate-fade-in select-none text-zinc-900 dark:text-zinc-100 overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 px-1">
                      Lines & Rectangles
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {[
                        { type: 'rectangle', label: 'Rectangle' },
                        { type: 'rounded-rectangle', label: 'Round Rect' },
                        { type: 'line', label: 'Line' },
                        { type: 'arrow', label: 'Arrow' },
                      ].map((s) => (
                        <button
                          key={s.type}
                          type="button"
                          onClick={() => {
                            handleAddShape(s.type as ShapeType);
                            setShowShapesDropdown(false);
                          }}
                          className="flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-zinc-100 dark:border-zinc-800 hover:border-indigo-300 transition-all text-zinc-800 dark:text-zinc-200"
                          title={s.label}
                        >
                          <svg width="22" height="22" viewBox="0 0 40 40" className="stroke-indigo-600 fill-indigo-100/50">
                            {s.type === 'rectangle' && <rect x="4" y="8" width="32" height="24" strokeWidth="3" />}
                            {s.type === 'rounded-rectangle' && (
                              <rect x="4" y="8" width="32" height="24" rx="6" ry="6" strokeWidth="3" />
                            )}
                            {s.type === 'line' && <line x1="4" y1="20" x2="36" y2="20" strokeWidth="3" />}
                            {s.type === 'arrow' && (
                              <g>
                                <line x1="4" y1="20" x2="28" y2="20" strokeWidth="3" />
                                <polygon points="36,20 26,14 26,26" fill="#4f46e5" />
                              </g>
                            )}
                          </svg>
                          <span className="text-[9px] mt-1 font-medium truncate w-full text-center">{s.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 px-1">
                      Basic Shapes & Callouts
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { type: 'circle', label: 'Circle' },
                        { type: 'triangle', label: 'Triangle' },
                        { type: 'diamond', label: 'Diamond' },
                        { type: 'double-arrow', label: 'Double Arrow' },
                        { type: 'star', label: '5-Pt Star' },
                        { type: 'heart', label: 'Heart' },
                        { type: 'lightning', label: 'Lightning' },
                        { type: 'cloud', label: 'Cloud' },
                        { type: 'callout', label: 'Callout' },
                      ].map((s) => (
                        <button
                          key={s.type}
                          type="button"
                          onClick={() => {
                            handleAddShape(s.type as ShapeType);
                            setShowShapesDropdown(false);
                          }}
                          className="flex flex-col items-center justify-center p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-zinc-100 dark:border-zinc-800 hover:border-indigo-300 transition-all text-zinc-800 dark:text-zinc-200"
                          title={s.label}
                        >
                          <svg width="22" height="22" viewBox="0 0 40 40" className="stroke-indigo-600 fill-indigo-100/50">
                            {s.type === 'circle' && <ellipse cx="20" cy="20" rx="15" ry="15" strokeWidth="3" />}
                            {s.type === 'triangle' && <polygon points="20,4 36,36 4,36" strokeWidth="3" />}
                            {s.type === 'diamond' && <polygon points="20,4 36,20 20,36 4,20" strokeWidth="3" />}
                            {s.type === 'double-arrow' && (
                              <g>
                                <line x1="12" y1="20" x2="28" y2="20" strokeWidth="3" />
                                <polygon points="36,20 26,14 26,26" fill="#4f46e5" />
                                <polygon points="4,20 14,14 14,26" fill="#4f46e5" />
                              </g>
                            )}
                            {s.type === 'star' && (
                              <polygon
                                points="20,4 24,15 36,15 26,23 30,34 20,27 10,34 14,23 4,15 16,15"
                                strokeWidth="2"
                              />
                            )}
                            {s.type === 'heart' && (
                              <path
                                d="M 20 34 C 6 22, 2 14, 2 8 C 2 3, 10 2, 20 10 C 30 2, 38 3, 38 8 C 38 14, 34 22, 20 34 Z"
                                strokeWidth="2.5"
                              />
                            )}
                            {s.type === 'lightning' && (
                              <polygon
                                points="20,2 6,22 18,22 12,38 34,16 22,16"
                                strokeWidth="2.5"
                              />
                            )}
                            {s.type === 'cloud' && (
                              <path
                                d="M 10 32 C 4 32 1 26 2 20 C 1 14 7 9 13 10 C 15 3 25 3 28 10 C 34 9 39 14 38 20 C 39 26 35 32 29 32 Z"
                                strokeWidth="2.5"
                              />
                            )}
                            {s.type === 'callout' && (
                              <path
                                d="M 6 6 L 34 6 Q 36 6 36 8 L 36 24 Q 36 26 34 26 L 18 26 L 10 34 L 12 26 L 6 26 Q 4 26 4 24 L 4 8 Q 4 6 6 6 Z"
                                strokeWidth="2"
                              />
                            )}
                          </svg>
                          <span className="text-[9px] mt-1 font-medium truncate w-full text-center">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* Word Table Dropdown */}
          <div className="flex-shrink-0">
            <button
              ref={tableBtnRef}
              onClick={toggleTableDropdown}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
                showTableDropdown
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Insert Resizable Table"
            >
              <TableIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Table</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showTableDropdown &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowTableDropdown(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-56 max-w-[calc(100vw-24px)] max-h-[45vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 animate-fade-in select-none text-zinc-900 dark:text-zinc-100 overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center justify-between">
                      <span>Insert Table</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">
                        {tableGridHover.cols > 0 && tableGridHover.rows > 0
                          ? `${tableGridHover.cols} × ${tableGridHover.rows}`
                          : 'Hover to select'}
                      </span>
                    </div>
                    {/* Word-style Interactive 8x8 Grid */}
                    <div
                      className="grid grid-cols-8 gap-1 p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700"
                      onMouseLeave={() => setTableGridHover({ rows: 0, cols: 0 })}
                    >
                      {Array.from({ length: 64 }).map((_, idx) => {
                        const r = Math.floor(idx / 8) + 1;
                        const c = (idx % 8) + 1;
                        const isHighlighted = r <= tableGridHover.rows && c <= tableGridHover.cols;
                        return (
                          <div
                            key={idx}
                            onMouseEnter={() => setTableGridHover({ rows: r, cols: c })}
                            onClick={() => {
                              handleAddTable(r, c);
                              setShowTableDropdown(false);
                            }}
                            className={`w-4 h-4 rounded-xs border cursor-pointer transition-colors ${
                              isHighlighted
                                ? 'bg-indigo-500 border-indigo-600'
                                : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 hover:border-indigo-400'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Custom Rows/Cols Inputs */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Custom Size
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[9px] text-zinc-400 block mb-0.5">Rows</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={customTableRows}
                            onChange={(e) => setCustomTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-center font-mono font-bold"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-zinc-400 block mb-0.5">Columns</label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={customTableCols}
                            onChange={(e) => setCustomTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-center font-mono font-bold"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleAddTable(customTableRows, customTableCols);
                          setShowTableDropdown(false);
                        }}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        Insert Table
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* Hidden File Input for Inserting Pages from Other PDF */}
          <input
            ref={donorPdfInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleDonorFileSelected}
            className="hidden"
          />

          {/* Insert Page Button & Dropdown */}
          <div className="flex-shrink-0">
            <button
              ref={insertPageBtnRef}
              onClick={() => {
                const isAndroidApp = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
                if (!isAndroidApp) {
                  setInsertPageInitialMode('blank');
                  setShowInsertPageModal(true);
                } else {
                  const rect = insertPageBtnRef.current?.getBoundingClientRect();
                  if (rect) {
                    setDropdownCoords({
                      top: rect.bottom + 4,
                      left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
                    });
                  }
                  setShowInsertPageDropdown(!showInsertPageDropdown);
                  setShowShapesDropdown(false);
                  setShowTableDropdown(false);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
                showInsertPageDropdown || showInsertPageModal
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Insert Page: Blank Page or Insert from Other PDF (Alt+I)"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Insert Page</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showInsertPageDropdown &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowInsertPageDropdown(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-72 max-w-[calc(100vw-24px)] max-h-[46vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 animate-fade-in select-none text-zinc-900 dark:text-zinc-100 overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">
                      Insert Page Options
                    </div>
                    {/* Insert From Other PDF */}
                    <button
                      type="button"
                      onClick={() => {
                        donorPdfInputRef.current?.click();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 mb-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs text-left transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Insert from Other PDF...</span>
                      </div>
                    </button>

                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 px-1 border-t border-zinc-100 dark:border-zinc-800 pt-2">
                      Insert Blank Page
                    </div>
                    <div className="space-y-1 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleInsertBlankPage('after', 'same');
                          setShowInsertPageDropdown(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium text-xs text-left transition-colors"
                      >
                        <span>Insert After (Same Size)</span>
                        <span className="text-[10px] font-mono opacity-70">
                          {Math.round(basePageDims.width)} × {Math.round(basePageDims.height)} pt
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleInsertBlankPage('before', 'same');
                          setShowInsertPageDropdown(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium text-xs text-left transition-colors"
                      >
                        <span>Insert Before (Same Size)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleInsertBlankPage('end', 'same');
                          setShowInsertPageDropdown(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium text-xs text-left transition-colors"
                      >
                        <span>Insert at End (Same Size)</span>
                      </button>
                    </div>

                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 px-1 border-t border-zinc-100 dark:border-zinc-800 pt-2">
                      Or Choose MS Word Page Size
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {MS_WORD_PAGE_SIZES.filter((s) => s.id !== 'same').map((spec) => (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => {
                            handleInsertBlankPage('after', spec.id);
                            setShowInsertPageDropdown(false);
                          }}
                          className="w-full flex flex-col items-start px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
                        >
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{spec.name}</span>
                          <span className="text-[10px] text-zinc-500">{spec.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>

        {/* GROUP: DRAW */}
        <div className="flex items-center bg-white dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 gap-0.5 shadow-2xs flex-shrink-0">
          <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase px-1.5 select-none tracking-wider">
            DRAW
          </span>

          <div className="flex-shrink-0">
            <button
              ref={drawBtnRef}
              onClick={() => {
                const rect = drawBtnRef.current?.getBoundingClientRect();
                if (rect) {
                  setDropdownCoords({
                    top: rect.bottom + 4,
                    left: Math.max(8, Math.min(rect.left, window.innerWidth - 240)),
                  });
                }
                setShowDrawDropdown(!showDrawDropdown);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
                ['pen', 'pencil', 'highlighter', 'eraser'].includes(activeTool) || showDrawDropdown
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Drawing Tools (Pen, Pencil, Highlighter, Eraser)"
            >
              {activeTool === 'pencil' ? (
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
              ) : activeTool === 'highlighter' ? (
                <Highlighter className="w-3.5 h-3.5 text-orange-400" />
              ) : activeTool === 'eraser' ? (
                <Eraser className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Pen className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span className="capitalize">
                {['pen', 'pencil', 'highlighter', 'eraser'].includes(activeTool) ? activeTool : 'Draw'}
              </span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showDrawDropdown &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowDrawDropdown(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-56 max-w-[calc(100vw-24px)] max-h-[46vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2 animate-fade-in select-none text-zinc-900 dark:text-zinc-100 overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 px-1">
                      Drawing Tools
                    </div>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTool('pen');
                          setShowDrawDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          activeTool === 'pen'
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Pen className="w-3.5 h-3.5" />
                          <span>Pen</span>
                        </div>
                        <span className="text-[10px] opacity-70">P</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTool('pencil');
                          setShowDrawDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          activeTool === 'pencil'
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <PenTool className="w-3.5 h-3.5 text-amber-500" />
                          <span>Pencil</span>
                        </div>
                        <span className="text-[10px] opacity-70">Shift+P</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTool('highlighter');
                          setShowDrawDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          activeTool === 'highlighter'
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Highlighter className="w-3.5 h-3.5 text-orange-500" />
                          <span>Highlighter</span>
                        </div>
                        <span className="text-[10px] opacity-70">H</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTool('eraser');
                          setShowDrawDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          activeTool === 'eraser'
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Eraser className="w-3.5 h-3.5 text-rose-500" />
                          <span>Eraser</span>
                        </div>
                        <span className="text-[10px] opacity-70">E</span>
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>

        {/* GROUP 3: PAGE */}
        <div className="flex items-center bg-white dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 gap-0.5 shadow-2xs flex-shrink-0">
          <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase px-1.5 select-none tracking-wider">
            PAGE
          </span>

          {/* Page Size Dropdown */}
          <div className="flex-shrink-0">
            <button
              ref={pageSizeBtnRef}
              onClick={togglePageSizeDropdown}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
                showPageSizeDropdown
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Page Size Catalogue (MS Word standard sizes)"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Page Size</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showPageSizeDropdown &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowPageSizeDropdown(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-72 max-w-[calc(100vw-24px)] max-h-[42vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 animate-fade-in select-none text-zinc-900 dark:text-zinc-100 overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 px-1 flex items-center justify-between">
                      <span>Resize Page {currentPage}</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">
                        {Math.round(basePageDims.width)} × {Math.round(basePageDims.height)} pt
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mb-2 px-1">
                      Select standard MS Word page size:
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {MS_WORD_PAGE_SIZES.filter((s) => s.id !== 'same').map((spec) => {
                        const isCurrent =
                          Math.abs(basePageDims.width - spec.width) < 2 &&
                          Math.abs(basePageDims.height - spec.height) < 2;
                        return (
                          <button
                            key={spec.id}
                            type="button"
                            onClick={() => handleResizeCurrentPage(spec.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                              isCurrent
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold">{spec.name}</div>
                              <div className={`text-[10px] ${isCurrent ? 'text-indigo-200' : 'text-zinc-500'}`}>
                                {spec.description}
                              </div>
                            </div>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* Page Margins Dropdown */}
          <div className="flex-shrink-0">
            <button
              ref={marginBtnRef}
              onClick={toggleMarginDropdown}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
                showMarginDropdown
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Page Margins (MS Word standard margins)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
              <span>Margins</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showMarginDropdown &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowMarginDropdown(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-80 max-w-[calc(100vw-24px)] max-h-[42vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-3 animate-fade-in select-none text-zinc-900 dark:text-zinc-100 overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Page Margins
                      </span>
                      <label className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showMarginGuidelines}
                          onChange={(e) => setShowMarginGuidelines(e.target.checked)}
                          className="w-3 h-3 text-indigo-600 rounded"
                        />
                        <span>Show Guidelines</span>
                      </label>
                    </div>

                    <div className="space-y-1 mb-2 max-h-36 overflow-y-auto pr-1">
                      {MS_WORD_MARGINS.map((m) => {
                        const isSelected = selectedMarginId === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              pushSnapshot({ textOverlays, tables, shapes, imageOverlays });
                              setSelectedMarginId(m.id);
                              fitAllContentToBounds('all', { left: m.left, right: m.right, top: m.top, bottom: m.bottom });
                              setShowMarginDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold">{m.name}</div>
                              <div className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-zinc-500'}`}>
                                {m.description}
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Margins Input */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                        Custom Margins (inches)
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Top</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="3"
                            value={Math.round((customMargins.top / 72) * 100) / 100}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = { ...customMargins, top: val * 72 };
                              setCustomMargins(updated);
                              setSelectedMarginId('custom');
                              fitAllContentToBounds('all', updated);
                            }}
                            className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Bottom</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="3"
                            value={Math.round((customMargins.bottom / 72) * 100) / 100}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = { ...customMargins, bottom: val * 72 };
                              setCustomMargins(updated);
                              setSelectedMarginId('custom');
                              fitAllContentToBounds('all', updated);
                            }}
                            className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Left</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="3"
                            value={Math.round((customMargins.left / 72) * 100) / 100}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = { ...customMargins, left: val * 72 };
                              setCustomMargins(updated);
                              setSelectedMarginId('custom');
                              fitAllContentToBounds('all', updated);
                            }}
                            className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Right</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="3"
                            value={Math.round((customMargins.right / 72) * 100) / 100}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = { ...customMargins, right: val * 72 };
                              setCustomMargins(updated);
                              setSelectedMarginId('custom');
                              fitAllContentToBounds('all', updated);
                            }}
                            className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          pushSnapshot({ textOverlays, tables, shapes, imageOverlays });
                          fitAllContentToBounds('all', customMargins);
                          setShowMarginDropdown(false);
                        }}
                        className="w-full mt-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        Apply Margins & Auto-Fit Content
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* Page Border Dropdown */}
          <div className="flex-shrink-0">
            <button
              ref={borderBtnRef}
              onClick={() => {
                const isAndroidApp = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
                if (!isAndroidApp) {
                  setShowBorderModal(true);
                } else {
                  toggleBorderDropdown();
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
                showBorderDropdown || showBorderModal
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : pageBorders[currentPage - 1]?.enabled
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Page Border Suite (Alt+B)"
            >
              <Square className="w-3.5 h-3.5 text-indigo-400" />
              <span>Borders</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showBorderDropdown &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowBorderDropdown(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-80 max-w-[calc(100vw-24px)] max-h-[45vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 animate-fade-in select-none text-zinc-900 dark:text-zinc-100 overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header with Enable Switch */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Square className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold uppercase tracking-wider">Page Border</span>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pageBorders[currentPage - 1]?.enabled ?? false}
                          onChange={(e) => updatePageBorderConfig({ enabled: e.target.checked })}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span className={pageBorders[currentPage - 1]?.enabled ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-zinc-500'}>
                          {pageBorders[currentPage - 1]?.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    {/* Scope Selector: Current vs All */}
                    <div className="mb-2.5">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Apply To</div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setActiveBorderScope('current')}
                          className={`py-1 px-2 rounded-lg border text-center transition-colors ${
                            activeBorderScope === 'current'
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          Page {currentPage} Only
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveBorderScope('all')}
                          className={`py-1 px-2 rounded-lg border text-center transition-colors ${
                            activeBorderScope === 'all'
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          All Pages ({totalPages})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveBorderScope('odd')}
                          className={`py-1 px-2 rounded-lg border text-center transition-colors ${
                            activeBorderScope === 'odd'
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          Odd Pages Only
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveBorderScope('even')}
                          className={`py-1 px-2 rounded-lg border text-center transition-colors ${
                            activeBorderScope === 'even'
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          Even Pages Only
                        </button>
                      </div>
                    </div>

                    {/* Border Style / Type */}
                    <div className="mb-2.5">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Border Type</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {[
                          { id: 'solid', label: 'Solid Line' },
                          { id: 'dashed', label: 'Dashed' },
                          { id: 'dotted', label: 'Dotted' },
                          { id: 'double', label: 'Double Line' },
                          { id: 'corners', label: 'Only Corners' },
                          { id: 'frame', label: 'Decorative Frame' },
                          { id: 'groove', label: 'Groove 3D' },
                          { id: 'ridge', label: 'Ridge 3D' },
                          { id: 'inset', label: 'Inset' },
                          { id: 'outset', label: 'Outset' },
                        ].map((t) => {
                          const currentType = pageBorders[currentPage - 1]?.type || 'solid';
                          const isSel = currentType === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => updatePageBorderConfig({ enabled: true, type: t.id as PageBorderType })}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-left text-[11px] transition-colors ${
                                isSel
                                  ? 'bg-indigo-600 text-white font-semibold border-indigo-600'
                                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              <span>{t.label}</span>
                              {isSel && <Check className="w-3 h-3 text-white flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Weight / Thickness */}
                    <div className="mb-2.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        <span>Border Thickness</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {pageBorders[currentPage - 1]?.width || 1} pt
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                        {[0.5, 1, 1.5, 2, 3, 4, 6, 8].map((w) => {
                          const currentW = pageBorders[currentPage - 1]?.width || 1;
                          const isSel = Math.abs(currentW - w) < 0.1;
                          return (
                            <button
                              key={w}
                              type="button"
                              onClick={() => updatePageBorderConfig({ enabled: true, width: w })}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                                isSel
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {w} pt
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="12"
                        step="0.5"
                        value={pageBorders[currentPage - 1]?.width || 1}
                        onChange={(e) => updatePageBorderConfig({ enabled: true, width: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    {/* Border Color */}
                    <div className="mb-2.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        <span>Border Color</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px]">{pageBorders[currentPage - 1]?.color || '#000000'}</span>
                          <input
                            type="color"
                            value={pageBorders[currentPage - 1]?.color || '#000000'}
                            onChange={(e) => updatePageBorderConfig({ enabled: true, color: e.target.value })}
                            className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['#000000', '#1e3a8a', '#475569', '#dc2626', '#d97706', '#15803d', '#7e22ce', '#0891b2'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updatePageBorderConfig({ enabled: true, color: c })}
                            className="w-5 h-5 rounded-full border border-white dark:border-zinc-700 shadow-xs hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Border Insets / Margins */}
                    <div className="mb-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        <span>Border Margins (pt)</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updatePageBorderConfig({ enabled: true, top: 18, bottom: 18, left: 18, right: 18 })}
                            className="px-1.5 py-0.5 rounded text-[9px] font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            18pt
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePageBorderConfig({ enabled: true, top: 36, bottom: 36, left: 36, right: 36 })}
                            className="px-1.5 py-0.5 rounded text-[9px] font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            36pt
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePageBorderConfig({ enabled: true, top: 72, bottom: 72, left: 72, right: 72 })}
                            className="px-1.5 py-0.5 rounded text-[9px] font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            72pt
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-xs font-mono">
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Top</label>
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={pageBorders[currentPage - 1]?.top ?? 36}
                            onChange={(e) => updatePageBorderConfig({ enabled: true, top: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-1.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Bottom</label>
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={pageBorders[currentPage - 1]?.bottom ?? 36}
                            onChange={(e) => updatePageBorderConfig({ enabled: true, bottom: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-1.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Left</label>
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={pageBorders[currentPage - 1]?.left ?? 36}
                            onChange={(e) => updatePageBorderConfig({ enabled: true, left: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-1.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Right</label>
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={pageBorders[currentPage - 1]?.right ?? 36}
                            onChange={(e) => updatePageBorderConfig({ enabled: true, right: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-1.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Interactive Drag Handles Checkbox */}
                    <div className="mb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={interactiveBorderHandles}
                          onChange={(e) => setInteractiveBorderHandles(e.target.checked)}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span>Enable Interactive Drag Handles on Canvas</span>
                      </label>
                    </div>

                    {/* Remove Border Button */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => removePageBorder('current')}
                        className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Remove from Page {currentPage}
                      </button>
                      <button
                        type="button"
                        onClick={() => removePageBorder('all')}
                        className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Remove from All
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* Page Number Adder & Remover Dropdown */}
          <div className="flex-shrink-0">
            <button
              ref={pageNumberBtnRef}
              onClick={() => {
                const isAndroidApp = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
                if (!isAndroidApp) {
                  setShowPageNumberModal(true);
                  setShowPageNumberDropdown(false);
                } else {
                  togglePageNumberModal();
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
                showPageNumberModal || showPageNumberDropdown || pageNumberConfig.enabled
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Page Number Suite (Top/Bottom, Odds/Evens, Start Number, Custom Range) (Alt+N)"
            >
              <Hash className="w-3.5 h-3.5 text-indigo-400" />
              <span>Page #</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showPageNumberDropdown &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowPageNumberDropdown(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-80 max-w-[calc(100vw-24px)] max-h-[45vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 animate-fade-in select-none text-zinc-900 dark:text-zinc-100 overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header with Enable Switch */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold uppercase tracking-wider">Page Numbers</span>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pageNumberConfig.enabled}
                          onChange={(e) => updatePageNumberConfig({ enabled: e.target.checked })}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span className={pageNumberConfig.enabled ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-zinc-500'}>
                          {pageNumberConfig.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    {/* Position Selector */}
                    <div className="mb-2.5">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Position</div>
                      <div className="space-y-1 text-xs">
                        <div className="text-[10px] text-zinc-400 font-semibold">Top of Page</div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { pos: 'top-left', label: 'Top Left' },
                            { pos: 'top-center', label: 'Top Center' },
                            { pos: 'top-right', label: 'Top Right' },
                          ].map((p) => {
                            const isSel = pageNumberConfig.position === p.pos;
                            return (
                              <button
                                key={p.pos}
                                type="button"
                                onClick={() => updatePageNumberConfig({ enabled: true, position: p.pos as PageNumberPosition })}
                                className={`py-1 px-1.5 rounded-lg border text-center text-[10px] font-semibold transition-colors ${
                                  isSel
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-semibold pt-1">Bottom of Page</div>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { pos: 'bottom-left', label: 'Bottom Left' },
                            { pos: 'bottom-center', label: 'Bottom Center' },
                            { pos: 'bottom-right', label: 'Bottom Right' },
                          ].map((p) => {
                            const isSel = pageNumberConfig.position === p.pos;
                            return (
                              <button
                                key={p.pos}
                                type="button"
                                onClick={() => updatePageNumberConfig({ enabled: true, position: p.pos as PageNumberPosition })}
                                className={`py-1 px-1.5 rounded-lg border text-center text-[10px] font-semibold transition-colors ${
                                  isSel
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Number Format */}
                    <div className="mb-2.5">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Number Format</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {[
                          { id: 'number', label: '1, 2, 3...' },
                          { id: 'page-x', label: 'Page 1, Page 2...' },
                          { id: 'page-x-of-y', label: 'Page 1 of 10...' },
                          { id: 'dash', label: '- 1 -, - 2 -...' },
                          { id: 'roman-upper', label: 'I, II, III...' },
                          { id: 'roman-lower', label: 'i, ii, iii...' },
                        ].map((fmt) => {
                          const isSel = pageNumberConfig.format === fmt.id;
                          return (
                            <button
                              key={fmt.id}
                              type="button"
                              onClick={() => updatePageNumberConfig({ enabled: true, format: fmt.id as PageNumberFormat })}
                              className={`flex items-center justify-between px-2 py-1 rounded-lg border text-left text-[11px] transition-colors ${
                                isSel
                                  ? 'bg-indigo-600 text-white font-semibold border-indigo-600'
                                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              <span>{fmt.label}</span>
                              {isSel && <Check className="w-3 h-3 text-white flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Typography: Font Family, Size, Weight, Color */}
                    <div className="mb-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Typography & Style</div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-1.5">
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Font Family</label>
                          <select
                            value={pageNumberConfig.fontFamily}
                            onChange={(e) => updatePageNumberConfig({ enabled: true, fontFamily: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          >
                            <option value="Helvetica">Helvetica / Arial</option>
                            <option value="TimesRoman">Times New Roman</option>
                            <option value="Courier">Courier Monospace</option>
                            <option value="Calibri">Calibri</option>
                            <option value="Georgia">Georgia</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Font Weight</label>
                          <select
                            value={pageNumberConfig.fontWeight}
                            onChange={(e) => updatePageNumberConfig({ enabled: true, fontWeight: e.target.value as any })}
                            className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          >
                            <option value="normal">Regular</option>
                            <option value="medium">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Size (pt)</label>
                          <input
                            type="number"
                            min="6"
                            max="24"
                            value={pageNumberConfig.fontSize}
                            onChange={(e) => updatePageNumberConfig({ enabled: true, fontSize: parseInt(e.target.value, 10) || 10 })}
                            className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Color</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={pageNumberConfig.color}
                              onChange={(e) => updatePageNumberConfig({ enabled: true, color: e.target.value })}
                              className="w-7 h-6 rounded cursor-pointer border-0 p-0"
                            />
                            <span className="font-mono text-[10px] text-zinc-500">{pageNumberConfig.color}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Filter Mode & Page Scope */}
                    <div className="mb-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Target Pages & Scope</div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] mb-2">
                        {[
                          { id: 'all', label: 'All Pages' },
                          { id: 'odd', label: 'Odd Pages Only' },
                          { id: 'even', label: 'Even Pages Only' },
                          { id: 'range', label: 'Page Range' },
                          { id: 'specific', label: 'Specific Pages' },
                        ].map((f) => {
                          const isSel = pageNumberConfig.filterMode === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => updatePageNumberConfig({ enabled: true, filterMode: f.id as PageNumberFilter })}
                              className={`py-1 px-1.5 rounded-lg border text-center transition-colors font-medium ${
                                isSel
                                  ? 'bg-indigo-600 text-white font-semibold border-indigo-600'
                                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {f.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* If Page Range selected */}
                      {pageNumberConfig.filterMode === 'range' && (
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                          <div>
                            <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Start Page</label>
                            <input
                              type="number"
                              min="1"
                              max={totalPages}
                              value={pageNumberConfig.rangeStart ?? 1}
                              onChange={(e) => updatePageNumberConfig({ enabled: true, rangeStart: parseInt(e.target.value, 10) || 1 })}
                              className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">End Page</label>
                            <input
                              type="number"
                              min="1"
                              max={totalPages}
                              value={pageNumberConfig.rangeEnd ?? totalPages}
                              onChange={(e) => updatePageNumberConfig({ enabled: true, rangeEnd: parseInt(e.target.value, 10) || totalPages })}
                              className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                        </div>
                      )}

                      {/* If Specific Pages selected */}
                      {pageNumberConfig.filterMode === 'specific' && (
                        <div className="mb-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Comma-Separated Pages (e.g. 1, 3, 5-8)</label>
                          <input
                            type="text"
                            placeholder="1, 3, 5-8"
                            value={pageNumberConfig.specificPages ?? ''}
                            onChange={(e) => updatePageNumberConfig({ enabled: true, specificPages: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                          />
                        </div>
                      )}

                      {/* Start Numbering From */}
                      <div className="grid grid-cols-2 gap-2 text-xs items-center">
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Start Number From</label>
                          <input
                            type="number"
                            min="1"
                            max="9999"
                            value={pageNumberConfig.startFrom ?? 1}
                            onChange={(e) => updatePageNumberConfig({ enabled: true, startFrom: parseInt(e.target.value, 10) || 1 })}
                            className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">Margin from Edge (pt)</label>
                          <input
                            type="number"
                            min="10"
                            max="100"
                            value={pageNumberConfig.offsetY ?? 24}
                            onChange={(e) => updatePageNumberConfig({ enabled: true, offsetY: parseInt(e.target.value, 10) || 24 })}
                            className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Page Number Remover */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">Remove from document</span>
                      <button
                        type="button"
                        onClick={removePageNumbers}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Page Numbers</span>
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* Watermark Button & Dropdown */}
          <div className="flex-shrink-0">
            <button
              ref={watermarkBtnRef}
              onClick={() => {
                const isAndroidApp = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || window.innerWidth < 768);
                if (!isAndroidApp) {
                  setShowWatermarkModal(true);
                } else {
                  const rect = watermarkBtnRef.current?.getBoundingClientRect();
                  if (rect) {
                    setDropdownCoords({
                      top: rect.bottom + 4,
                      left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
                    });
                  }
                  setShowWatermarkDropdown(!showWatermarkDropdown);
                  setShowBorderDropdown(false);
                  setShowPageNumberModal(false);
                  setShowPageNumberDropdown(false);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
                watermarkConfig || showWatermarkModal || showWatermarkDropdown
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Page Watermark (Text/Image watermark, 3x3 position, tiling, opacity, rotation) (Alt+W)"
            >
              <Stamp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Watermark</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showWatermarkDropdown &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowWatermarkDropdown(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-72 max-w-[calc(100vw-24px)] max-h-[46vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-3 animate-fade-in select-none text-zinc-900 dark:text-zinc-100 overscroll-contain"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Watermark</span>
                      {watermarkConfig && (
                        <button
                          type="button"
                          onClick={() => {
                            setWatermarkConfig(null);
                            pushSnapshot({ watermarkConfig: undefined });
                            setShowWatermarkDropdown(false);
                          }}
                          className="text-[10px] text-rose-500 font-semibold hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[9px] font-bold text-zinc-400 block mb-0.5">Text</label>
                        <input
                          type="text"
                          value={watermarkConfig?.text || 'CONFIDENTIAL'}
                          onChange={(e) => {
                            const updated: WatermarkConfig = {
                              ...(watermarkConfig || DEFAULT_WATERMARK_CONFIG),
                              enabled: true,
                              text: e.target.value,
                            };
                            setWatermarkConfig(updated);
                            pushSnapshot({ watermarkConfig: updated });
                          }}
                          className="w-full px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 block mb-0.5">Opacity</label>
                          <input
                            type="range"
                            min="5"
                            max="100"
                            value={watermarkConfig?.opacity ?? 35}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              const updated: WatermarkConfig = {
                                ...(watermarkConfig || DEFAULT_WATERMARK_CONFIG),
                                enabled: true,
                                opacity: val,
                              };
                              setWatermarkConfig(updated);
                              pushSnapshot({ watermarkConfig: updated });
                            }}
                            className="w-full accent-indigo-600"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 block mb-0.5">Rotation</label>
                          <div className="flex gap-1">
                            {[-45, 0, 45].map((deg) => (
                              <button
                                key={deg}
                                type="button"
                                onClick={() => {
                                  const updated: WatermarkConfig = {
                                    ...(watermarkConfig || DEFAULT_WATERMARK_CONFIG),
                                    enabled: true,
                                    rotation: deg,
                                  };
                                  setWatermarkConfig(updated);
                                  pushSnapshot({ watermarkConfig: updated });
                                }}
                                className={`flex-1 py-0.5 text-[10px] rounded border ${
                                  (watermarkConfig?.rotation ?? -45) === deg
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'border-zinc-300 dark:border-zinc-700'
                                }`}
                              >
                                {deg}°
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWatermarkDropdown(false)}
                        className="w-full py-1.5 bg-indigo-600 text-white rounded-lg font-semibold text-xs mt-1"
                      >
                        Apply Watermark
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* Page Rotation Dropdown */}
          <div className="flex-shrink-0">
            <div className="flex items-center rounded-md overflow-hidden">
              <button
                onClick={handleRotatePage}
                className="p-1 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                title="Rotate Page 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                ref={rotationBtnRef}
                onClick={toggleRotationPopover}
                className="px-1.5 py-1 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-l border-zinc-200 dark:border-zinc-700 transition-colors flex items-center gap-0.5 text-xs font-semibold"
                title="Page Rotation Degrees (0°, 90°, 180°, 270°)"
              >
                <span>{pageRotations[currentPage - 1] || 0}°</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>
            </div>
            {showRotationPopover &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowRotationPopover(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-3 animate-fade-in select-none text-zinc-900 dark:text-zinc-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                      Page Rotation ({pageRotations[currentPage - 1] || 0}°)
                    </div>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {[
                        { deg: 0, label: '0°' },
                        { deg: 90, label: '90°' },
                        { deg: 180, label: '180°' },
                        { deg: 270, label: '270°' },
                      ].map((item) => (
                        <button
                          key={item.deg}
                          type="button"
                          onClick={() => {
                            handleSetPageRotation(item.deg);
                            setShowRotationPopover(false);
                          }}
                          className={`py-1 text-[11px] font-semibold rounded border transition-colors ${
                            (pageRotations[currentPage - 1] || 0) === item.deg
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => {
                          handleRotatePageBy(90);
                          setShowRotationPopover(false);
                        }}
                        className="py-1 px-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded text-[11px] font-medium border border-zinc-200 dark:border-zinc-700 text-center"
                      >
                        +90° CW
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleRotatePageBy(-90);
                          setShowRotationPopover(false);
                        }}
                        className="py-1 px-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded text-[11px] font-medium border border-zinc-200 dark:border-zinc-700 text-center"
                      >
                        -90° CCW
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          <button
            onClick={handleDeleteCurrentPage}
            className="p-1 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Delete Current Page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GROUP 4: TOOLS */}
        <div className="flex items-center bg-white dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 gap-0.5 shadow-2xs flex-shrink-0">
          <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase px-1.5 select-none tracking-wider">
            TOOLS
          </span>

          <button
            onClick={() => handleRunOcrOnCurrentPage(ocrLanguage)}
            disabled={isOcrScanningPage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold whitespace-nowrap bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/50 shadow-2xs transition-colors"
            title="Extract text with bounding boxes on current page to make scanned document editable"
          >
            {isOcrScanningPage ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ScanText className="w-3.5 h-3.5 text-indigo-500" />
            )}
            <span>{isOcrScanningPage ? 'Scanning...' : 'OCR to Edit'}</span>
          </button>

          <button
            onClick={() => setIsOcrOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md font-semibold whitespace-nowrap text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
            title="Full OCR Document Recognition Engine"
          >
            <ScanText className="w-3.5 h-3.5" />
            <span>OCR</span>
          </button>

          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-1 px-2 py-1 rounded-md font-semibold whitespace-nowrap text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            title="Print (Ctrl+P)"
          >
            {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            <span>Print</span>
          </button>

          <button
            onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
              showPropertiesPanel
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
            title="Toggle Properties Sidebar"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Properties</span>
          </button>
        </div>
      </div>
      )}

      {/* TIER 3: High-Contrast MS Word Formatting Bar (Active for both 'Edit Text' and 'Add Text') */}
      {(activeTool === 'edit-text' || activeTool === 'add-text') && (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800 text-xs z-20 flex-shrink-0 animate-fade-in overflow-x-auto no-scrollbar flex-nowrap whitespace-nowrap">
          {activeTool === 'add-text' && (
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="Add Text..."
              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 text-xs w-28 sm:w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold shadow-xs shrink-0"
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
            className="px-2 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-bold text-xs shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer w-28 sm:w-36 shrink-0"
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
                className="text-slate-900 bg-white py-1"
              >
                {font}
              </option>
            ))}
          </select>

          {/* Font Size Stepper & Direct Input */}
          <div className="flex items-center bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg shadow-xs overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => {
                const newSize = Math.max(8, fontSize - 1);
                setFontSize(newSize);
                updateActiveTextItemProps({ fontSize: newSize });
              }}
              className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 text-xs font-bold transition-colors"
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
              className="w-10 text-center text-xs font-mono font-bold bg-transparent text-slate-900 dark:text-zinc-100 border-x border-slate-200 dark:border-zinc-700 py-0.5 focus:outline-none"
            />
            <span className="text-[10px] text-slate-600 dark:text-zinc-400 pr-1 select-none font-bold">pt</span>
            <button
              type="button"
              onClick={() => {
                const newSize = Math.min(120, fontSize + 1);
                setFontSize(newSize);
                updateActiveTextItemProps({ fontSize: newSize });
              }}
              className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 text-xs font-bold transition-colors"
              title="Increase Font Size"
            >
              +
            </button>
          </div>

          {/* Bold, Italic, Underline */}
          <div className="flex items-center bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg shadow-xs overflow-hidden p-0.5 gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const next = !isBold;
                setIsBold(next);
                updateActiveTextItemProps({ isBold: next });
              }}
              className={`px-2 py-1 rounded-md transition-all text-xs font-bold ${
                isBold
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
              className={`px-2 py-1 rounded-md transition-all text-xs font-bold ${
                isItalic
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
              className={`px-2 py-1 rounded-md transition-all text-xs font-bold ${
                isUnderline
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
              }`}
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Alignment (Left, Center, Right) */}
          <div className="flex items-center bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg shadow-xs overflow-hidden p-0.5 gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAlignment('left');
                updateActiveTextItemProps({ alignment: 'left' });
              }}
              className={`p-1.5 rounded-md transition-all ${
                alignment === 'left'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                  : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                  : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
              }`}
              title="Align Right (Ctrl+R)"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bullets Dropdown Tool */}
          <div className="shrink-0">
            <button
              ref={bulletsBtnRef}
              type="button"
              onClick={toggleBulletsDropdown}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xs text-xs font-bold transition-all ${
                showBulletsDropdown ? 'ring-2 ring-indigo-500 text-indigo-600' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-50'
              }`}
              title="Bullets & Numbering (•, ◦, ■, ◆, ➢, ✓, 1., A., a., I.)"
            >
              <List className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bullets</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>
            {showBulletsDropdown &&
              createPortal(
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setShowBulletsDropdown(false)}
                >
                  <div
                    style={{ top: dropdownCoords.top, left: dropdownCoords.left }}
                    className="fixed w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 animate-fade-in select-none text-slate-900 dark:text-zinc-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                      Bullet Styles
                    </div>
                    {BULLET_STYLES.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          handleApplyBullet(b.id);
                          setShowBulletsDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
                      >
                        <span className="w-4 text-center font-bold text-indigo-600">{b.bullet || '1.'}</span>
                        <span>{b.label}</span>
                      </button>
                    ))}
                    <div className="border-t border-slate-200 dark:border-zinc-800 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleApplyBullet('none');
                          setShowBulletsDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg font-medium"
                      >
                        Remove Bullets
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* Element Rotation (0° to 360°) */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 shadow-xs shrink-0">
            <RotateCw className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            <input
              type="number"
              min={0}
              max={360}
              value={(() => {
                const activeItem = activeEditingId || selectedTextItemId;
                if (activeItem) {
                  return (
                    modifiedTexts[activeItem]?.rotation ||
                    detectedTextItems.find((t) => t.id === activeItem)?.rotation ||
                    0
                  );
                }
                if (selectedOverlayId) {
                  return (
                    textOverlays.find((t) => t.id === selectedOverlayId)?.rotation ||
                    imageOverlays.find((i) => i.id === selectedOverlayId)?.rotation ||
                    0
                  );
                }
                if (selectedShapeId) {
                  return shapes.find((s) => s.id === selectedShapeId)?.rotation || 0;
                }
                if (selectedTableId) {
                  return tables.find((t) => t.id === selectedTableId)?.rotation || 0;
                }
                return pageRotations[currentPage - 1] || 0;
              })()}
              onChange={(e) => {
                const deg = parseInt(e.target.value) || 0;
                handleSetElementRotation(deg);
              }}
              className="w-10 text-center text-xs font-mono font-bold bg-transparent text-slate-900 dark:text-zinc-100 focus:outline-none"
              title="Element Rotation (0-360°)"
            />
            <span className="text-[10px] text-slate-600 dark:text-zinc-400 select-none font-bold">°</span>
            <button
              type="button"
              onClick={handleRotateCurrentSelectionOrPage}
              className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 rounded text-[10px] font-bold text-slate-900 dark:text-zinc-100 border border-slate-300 dark:border-zinc-600 transition-colors"
              title="Rotate 90°"
            >
              +90°
            </button>
          </div>

          {/* Text Color Picker, Eyedropper & Studio Trigger */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 shadow-xs shrink-0">
            <label className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider select-none">Color</label>
            <input
              type="color"
              value={textColor}
              onChange={(e) => {
                const newColor = e.target.value;
                setTextColor(newColor);
                updateActiveTextItemProps({ color: newColor });
              }}
              className="w-5 h-5 rounded cursor-pointer border border-slate-300 dark:border-zinc-600 bg-transparent p-0"
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
            <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />
            <button
              type="button"
              onClick={handleOpenEyedropper}
              className="p-1 rounded text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
              title="Sample Color from Document (Eyedropper)"
            >
              <Pipette className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setColorTarget('text');
                setHexInput(textColor);
                setShowColorPickerModal(true);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition-colors"
              title="Open Color Studio (Color Wheel, Eyedropper, Palette, HEX/RGB)"
            >
              <Palette className="w-3 h-3" />
              <span>Studio</span>
            </button>
          </div>

          {/* Text Background Fill Color Picker, Eyedropper & Studio Trigger */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 shadow-xs shrink-0">
            <label className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider select-none">Bg Fill</label>
            <input
              type="color"
              value={itemBgColor}
              onChange={(e) => {
                const newBg = e.target.value;
                setItemBgColor(newBg);
                updateActiveTextItemProps({ bgColorHex: newBg });
              }}
              className="w-5 h-5 rounded cursor-pointer border border-slate-300 dark:border-zinc-600 bg-transparent p-0"
              title="Pick Text Background Erase / Inpaint Color"
            />
            {['#ffffff', '#fef9c3', '#e0e7ff', '#ede9fe', '#fce7f3', '#dcfce7', '#f1f5f9'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setItemBgColor(c);
                  updateActiveTextItemProps({ bgColorHex: c });
                }}
                style={{ backgroundColor: c }}
                className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/20 transition-transform hover:scale-125"
                title={c}
              />
            ))}
            <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />
            <button
              type="button"
              onClick={() => {
                setColorTarget('text-bg');
                handleOpenEyedropper();
              }}
              className="p-1 rounded text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
              title="Sample Exact Background Color from Document (Eyedropper)"
            >
              <Pipette className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setColorTarget('text-bg');
                setHexInput(itemBgColor);
                setShowColorPickerModal(true);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition-colors"
              title="Open Color Studio for Text Background Fill"
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

      {/* Freehand Drawing Tools Property Bar (Pen, Pencil, Highlighter, Eraser) */}
      {['pen', 'pencil', 'highlighter', 'eraser'].includes(activeTool) && (
        <div className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-3 py-1.5 flex items-center gap-2 sm:gap-3 flex-wrap text-xs shadow-2xs z-20 animate-fade-in select-none">
          {/* Tool Selector Buttons */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-all ${
                activeTool === 'pen'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Pen Tool (P) - Default Color Black (#000000)"
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Pen</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('pencil')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-all ${
                activeTool === 'pencil'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Pencil Tool (Shift+P) - Fine Graphite"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Pencil</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('highlighter')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-all ${
                activeTool === 'highlighter'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Highlighter Tool (H) - Default Color Orange (#f97316)"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Highlighter</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('eraser')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-all ${
                activeTool === 'eraser'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Eraser Tool (E) - Interactive Circular Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />

          {/* Contextual Properties: Pen */}
          {activeTool === 'pen' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Pen Color */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Color:</span>
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(e) => setDrawingColor(e.target.value)}
                  className="w-5 h-5 rounded border border-slate-300 dark:border-zinc-700 cursor-pointer p-0"
                  title="Choose Custom Pen Color"
                />
                <div className="flex items-center gap-1">
                  {['#000000', '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#d97706', '#ffffff'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDrawingColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 ${
                        drawingColor === c ? 'ring-2 ring-indigo-500 scale-110' : 'border-black/20 dark:border-white/20'
                      }`}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />

              {/* Pen Thickness Slider & Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Thickness:</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={penThickness}
                  onChange={(e) => setPenThickness(parseInt(e.target.value, 10) || 1)}
                  className="w-16 accent-indigo-600"
                />
                <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 w-6">
                  {penThickness}px
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 5, 8].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPenThickness(t)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        penThickness === t
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 text-indigo-600 dark:text-indigo-300'
                          : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />

              {/* Snap to Shape Toggle */}
              <button
                type="button"
                onClick={() => setSnapToShape(!snapToShape)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs border transition-all ${
                  snapToShape
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
                title="Snap to Shape (S): Automatically snaps freehand strokes into neat geometric shapes (Circle, Rectangle, Triangle, Line)"
              >
                <Shapes className="w-3.5 h-3.5" />
                <span>Snap to Shape: {snapToShape ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}

          {/* Contextual Properties: Pencil */}
          {activeTool === 'pencil' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Pencil Color */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Color:</span>
                <input
                  type="color"
                  value={drawingColor}
                  onChange={(e) => setDrawingColor(e.target.value)}
                  className="w-5 h-5 rounded border border-slate-300 dark:border-zinc-700 cursor-pointer p-0"
                  title="Choose Pencil Graphite Shade"
                />
                <div className="flex items-center gap-1">
                  {['#334155', '#0f172a', '#64748b', '#2563eb'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDrawingColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 ${
                        drawingColor === c ? 'ring-2 ring-indigo-500 scale-110' : 'border-black/20 dark:border-white/20'
                      }`}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />

              {/* Pencil Thickness Slider */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Lead:</span>
                <input
                  type="range"
                  min="0.5"
                  max="6"
                  step="0.5"
                  value={pencilThickness}
                  onChange={(e) => setPencilThickness(parseFloat(e.target.value) || 1)}
                  className="w-16 accent-indigo-600"
                />
                <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 w-8">
                  {pencilThickness}px
                </span>
                <div className="flex items-center gap-1">
                  {[0.5, 1, 1.5, 2.5].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPencilThickness(t)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        pencilThickness === t
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 text-indigo-600 dark:text-indigo-300'
                          : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />

              {/* Snap to Shape Toggle */}
              <button
                type="button"
                onClick={() => setSnapToShape(!snapToShape)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs border transition-all ${
                  snapToShape
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
                title="Snap to Shape (S)"
              >
                <Shapes className="w-3.5 h-3.5" />
                <span>Snap to Shape: {snapToShape ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}

          {/* Contextual Properties: Highlighter */}
          {activeTool === 'highlighter' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Highlighter Color Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Color:</span>
                <input
                  type="color"
                  value={highlighterColor}
                  onChange={(e) => setHighlighterColor(e.target.value)}
                  className="w-5 h-5 rounded border border-slate-300 dark:border-zinc-700 cursor-pointer p-0"
                  title="Choose Highlighter Color"
                />
                <div className="flex items-center gap-1">
                  {[
                    { hex: '#f97316', name: 'Orange' },
                    { hex: '#eab308', name: 'Yellow' },
                    { hex: '#22c55e', name: 'Green' },
                    { hex: '#ec4899', name: 'Pink' },
                    { hex: '#3b82f6', name: 'Blue' },
                    { hex: '#a855f7', name: 'Purple' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setHighlighterColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${
                        highlighterColor === c.hex ? 'ring-2 ring-indigo-500 scale-110' : 'border-black/20 dark:border-white/20'
                      }`}
                      title={`${c.name} Highlighter`}
                    />
                  ))}
                </div>
              </div>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />

              {/* Highlighter Thickness */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Thickness:</span>
                <input
                  type="range"
                  min="6"
                  max="40"
                  value={highlighterThickness}
                  onChange={(e) => setHighlighterThickness(parseInt(e.target.value, 10) || 14)}
                  className="w-16 accent-amber-500"
                />
                <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 w-7">
                  {highlighterThickness}px
                </span>
                <div className="flex items-center gap-1">
                  {[8, 12, 14, 20, 28].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setHighlighterThickness(t)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        highlighterThickness === t
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-700 dark:text-amber-300'
                          : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                Multiply blend mode
              </span>
            </div>
          )}

          {/* Contextual Properties: Eraser */}
          {activeTool === 'eraser' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Eraser Thickness / Radius Slider & Dynamic Circle Preview */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Eraser Size:</span>
                <input
                  type="range"
                  min="4"
                  max="50"
                  value={eraserRadius}
                  onChange={(e) => setEraserRadius(parseInt(e.target.value, 10) || 12)}
                  className="w-24 accent-rose-600"
                />
                {/* Dynamic circle radius indicator */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                  <div
                    className="rounded-full border-2 border-rose-500 bg-rose-500/20 shrink-0"
                    style={{
                      width: `${Math.max(6, Math.min(26, eraserRadius * 1.5))}px`,
                      height: `${Math.max(6, Math.min(26, eraserRadius * 1.5))}px`,
                    }}
                  />
                  <span className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    {eraserRadius * 2}px
                  </span>
                </div>
              </div>

              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />

              {/* Clear Page Drawings */}
              <button
                type="button"
                onClick={() => {
                  const remaining = drawings.filter((d) => d.pageIndex !== currentPage - 1);
                  setDrawings(remaining);
                  pushSnapshot({ drawings: remaining });
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors text-[11px] font-semibold"
                title="Erase all strokes on current page"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Page Strokes</span>
              </button>
            </div>
          )}

          {/* Right side: Exit Drawing Mode button */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 hidden xl:inline">
              P: Pen • Shift+P: Pencil • H: Highlighter • E: Eraser • S: Snap • Esc: Exit
            </span>
            <button
              type="button"
              onClick={() => setActiveTool('view')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors"
              title="Exit Drawing Mode (Esc)"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
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
                const isDragOver = dragOverPageNum === pageNum;
                const isDragging = draggingPageNum === pageNum;
                return (
                  <div
                    key={pageNum}
                    draggable={true}
                    onDragStart={(e) => {
                      setDraggingPageNum(pageNum);
                      e.dataTransfer.setData('text/plain', String(pageNum));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverPageNum !== pageNum) {
                        setDragOverPageNum(pageNum);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverPageNum === pageNum) {
                        setDragOverPageNum(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = draggingPageNum;
                      setDraggingPageNum(null);
                      setDragOverPageNum(null);
                      if (from && from !== pageNum) {
                        handleReorderPage(from, pageNum);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPageThumbnailContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        pageNum,
                      });
                    }}
                    onClick={() => {
                      setCurrentPage(pageNum);
                      document.getElementById(`pdf-page-frame-${pageNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`group cursor-pointer rounded-xl p-2 border transition-all flex flex-col items-center gap-1.5 select-none ${
                      isDragging ? 'opacity-40 scale-95' : ''
                    } ${
                      isDragOver
                        ? 'border-dashed border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/40'
                    }`}
                  >
                    <div className="w-20 h-28 bg-white rounded shadow-xs border border-zinc-300/80 flex items-center justify-center text-zinc-400 font-mono text-[11px] overflow-hidden relative pointer-events-none">
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
          onScroll={handleContainerScroll}
          onClick={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'MAIN') {
              setSelectedTableId(null);
              setSelectedTableCell(null);
              setSelectedShapeId(null);
              setSelectedOverlayId(null);
              setSelectedTextItemId(null);
              setMultiSelectedIds([]);
              setActiveEditingId(null);
              setActiveTableImgCell(null);
            }
          }}
          className="flex-1 min-h-[35vh] overflow-auto bg-slate-200/70 dark:bg-zinc-950 relative"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          <div
            className="w-fit h-fit p-4 sm:p-8 flex flex-col items-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedTableId(null);
                setSelectedTableCell(null);
                setSelectedShapeId(null);
                setSelectedOverlayId(null);
                setSelectedTextItemId(null);
                setMultiSelectedIds([]);
                setActiveEditingId(null);
                setActiveTableImgCell(null);
              }
            }}
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

            {/* Continuous Vertical Document Stack (All Pages Rendered Smoothly) */}
            {Array.from({ length: totalPages || 1 }, (_, pageIdx) => {
              const pageNum = pageIdx + 1;
              const isCurrentPage = pageNum === currentPage;
              return (
                <div
                  key={pageNum}
                  id={`pdf-page-frame-${pageNum}`}
                  data-page-number={pageNum}
                  ref={isCurrentPage ? pageFrameRef : undefined}
                  onClick={(e) => {
                    if (currentPage !== pageNum) setCurrentPage(pageNum);
                    handleCanvasClick(e, pageNum);
                  }}
                  onPointerDown={(e) => {
                    updateLastClickedCoords(e, pageNum - 1);
                    if (currentPage !== pageNum) setCurrentPage(pageNum);
                  }}
                  onPointerMove={(e) => updateLastClickedCoords(e, pageNum - 1)}
                  className={`relative bg-white shadow-2xl rounded-xs border select-none flex-shrink-0 mb-10 transition-shadow ${
                    isCurrentPage
                      ? 'border-indigo-500/80 ring-2 ring-indigo-500/25'
                      : 'border-zinc-300/80 dark:border-zinc-800'
                  }`}
                  style={{
                    width: Math.max(100, Math.round((basePageDims.width || 595) * zoomScale)),
                    height: Math.max(100, Math.round((basePageDims.height || 842) * zoomScale)),
                    cursor: activeTool === 'add-text' ? 'crosshair' : activeTool === 'add-link' ? 'pointer' : 'default',
                    transformOrigin: 'center center',
                  }}
                >
                  {/* High-DPI Supersampled Canvas for this Page */}
                  <canvas
                    ref={(el) => {
                      if (el) {
                        pageCanvasesRef.current.set(pageNum, el);
                        if (pageNum === currentPage) {
                          canvasRef.current = el;
                        }
                      } else {
                        pageCanvasesRef.current.delete(pageNum);
                      }
                    }}
                    className="block w-full h-full pointer-events-none"
                  />

                  {/* MS Word Margin Guidelines (Dashed line) */}
                  {showMarginGuidelines && (() => {
                    const currentMargin = selectedMarginId === 'custom'
                      ? customMargins
                      : MS_WORD_MARGINS.find((m) => m.id === selectedMarginId) || MS_WORD_MARGINS[0];
                    const topPx = currentMargin.top * zoomScale;
                    const bottomPx = currentMargin.bottom * zoomScale;
                    const leftPx = currentMargin.left * zoomScale;
                    const rightPx = currentMargin.right * zoomScale;
                    return (
                      <div
                        className="absolute pointer-events-none border border-dashed border-indigo-400/40 z-10"
                        style={{
                          top: `${topPx}px`,
                          left: `${leftPx}px`,
                          right: `${rightPx}px`,
                          bottom: `${bottomPx}px`,
                        }}
                      />
                    );
                  })()}

                  {/* Page Border Rendering & Interactive Per-Page Resizers */}
                  {(() => {
                    const border = pageBorders[pageNum - 1];
                    if (!border || !border.enabled) return null;

                    const pW = (basePageDims.width || 595) * zoomScale;
                    const pH = (basePageDims.height || 842) * zoomScale;
                    const topPx = border.top * zoomScale;
                    const bottomPx = border.bottom * zoomScale;
                    const leftPx = border.left * zoomScale;
                    const rightPx = border.right * zoomScale;
                    const wPx = Math.max(0, pW - leftPx - rightPx);
                    const hPx = Math.max(0, pH - topPx - bottomPx);
                    const strokeW = Math.max(1, Math.round(border.width * zoomScale));
                    const isBorderSelected = selectedBorderPage === pageNum - 1;

                    return (
                      <div
                        className={`absolute z-20 transition-all ${
                          isBorderSelected ? 'ring-2 ring-indigo-500/80 ring-offset-2' : ''
                        }`}
                        style={{
                          top: `${topPx}px`,
                          left: `${leftPx}px`,
                          width: `${wPx}px`,
                          height: `${hPx}px`,
                          pointerEvents: 'none',
                        }}
                      >
                        {/* Clickable Border Frame Edges to Select Border */}
                        <div
                          className="absolute -top-2 left-0 right-0 h-4 cursor-pointer pointer-events-auto"
                          title="Click to select Page Border (Press Delete to remove)"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBorderPage(pageNum - 1);
                            setSelectedOverlayId(null);
                            setSelectedShapeId(null);
                            setSelectedTableId(null);
                            setSelectedTableCell(null);
                            setSelectedTextItemId(null);
                            setShowPropertiesPanel(true);
                            setIsPropertiesCollapsed(false);
                          }}
                        />
                        <div
                          className="absolute -bottom-2 left-0 right-0 h-4 cursor-pointer pointer-events-auto"
                          title="Click to select Page Border (Press Delete to remove)"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBorderPage(pageNum - 1);
                            setSelectedOverlayId(null);
                            setSelectedShapeId(null);
                            setSelectedTableId(null);
                            setSelectedTableCell(null);
                            setSelectedTextItemId(null);
                            setShowPropertiesPanel(true);
                            setIsPropertiesCollapsed(false);
                          }}
                        />
                        <div
                          className="absolute top-0 -left-2 bottom-0 w-4 cursor-pointer pointer-events-auto"
                          title="Click to select Page Border (Press Delete to remove)"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBorderPage(pageNum - 1);
                            setSelectedOverlayId(null);
                            setSelectedShapeId(null);
                            setSelectedTableId(null);
                            setSelectedTableCell(null);
                            setSelectedTextItemId(null);
                            setShowPropertiesPanel(true);
                            setIsPropertiesCollapsed(false);
                          }}
                        />
                        <div
                          className="absolute top-0 -right-2 bottom-0 w-4 cursor-pointer pointer-events-auto"
                          title="Click to select Page Border (Press Delete to remove)"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBorderPage(pageNum - 1);
                            setSelectedOverlayId(null);
                            setSelectedShapeId(null);
                            setSelectedTableId(null);
                            setSelectedTableCell(null);
                            setSelectedTextItemId(null);
                            setShowPropertiesPanel(true);
                            setIsPropertiesCollapsed(false);
                          }}
                        />

                        {/* Top Move Handle when Border is Selected */}
                        {isBorderSelected && (
                          <div
                            className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 text-white rounded-full shadow-xl text-[11px] font-semibold cursor-move pointer-events-auto z-40 hover:bg-indigo-700 active:scale-95 transition-all select-none whitespace-nowrap"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              (e.target as HTMLElement).setPointerCapture(e.pointerId);
                              setBorderDragState({
                                pageIndex: pageNum - 1,
                                handle: 'move',
                                startX: e.clientX,
                                startY: e.clientY,
                                origBorder: { ...border },
                              });
                            }}
                            title="Click and drag to move border (Press Delete to remove)"
                          >
                            <Move className="w-3.5 h-3.5" />
                            <span>Move Border</span>
                            <span className="text-[9px] bg-indigo-800/80 px-1 py-0.5 rounded text-indigo-200 ml-1">
                              Del to remove
                            </span>
                          </div>
                        )}

                        {/* Type Rendering */}
                        {border.type === 'corners' ? (
                          // Only Corners L-brackets
                          (() => {
                            const cLen = Math.min(Math.min(wPx, hPx) * 0.25, Math.max(20, strokeW * 8));
                            return (
                              <>
                                <div
                                  className="absolute top-0 left-0"
                                  style={{
                                    width: `${cLen}px`,
                                    height: `${cLen}px`,
                                    borderTop: `${strokeW}px solid ${border.color}`,
                                    borderLeft: `${strokeW}px solid ${border.color}`,
                                  }}
                                />
                                <div
                                  className="absolute top-0 right-0"
                                  style={{
                                    width: `${cLen}px`,
                                    height: `${cLen}px`,
                                    borderTop: `${strokeW}px solid ${border.color}`,
                                    borderRight: `${strokeW}px solid ${border.color}`,
                                  }}
                                />
                                <div
                                  className="absolute bottom-0 left-0"
                                  style={{
                                    width: `${cLen}px`,
                                    height: `${cLen}px`,
                                    borderBottom: `${strokeW}px solid ${border.color}`,
                                    borderLeft: `${strokeW}px solid ${border.color}`,
                                  }}
                                />
                                <div
                                  className="absolute bottom-0 right-0"
                                  style={{
                                    width: `${cLen}px`,
                                    height: `${cLen}px`,
                                    borderBottom: `${strokeW}px solid ${border.color}`,
                                    borderRight: `${strokeW}px solid ${border.color}`,
                                  }}
                                />
                              </>
                            );
                          })()
                        ) : border.type === 'frame' ? (
                          // Decorative Frame with inner line and corner accents
                          (() => {
                            const frameInset = Math.max(4, strokeW * 2);
                            return (
                              <div
                                className="w-full h-full relative"
                                style={{
                                  border: `${strokeW}px solid ${border.color}`,
                                }}
                              >
                                <div
                                  className="absolute"
                                  style={{
                                    top: `${frameInset}px`,
                                    left: `${frameInset}px`,
                                    right: `${frameInset}px`,
                                    bottom: `${frameInset}px`,
                                    border: `${Math.max(1, Math.round(strokeW * 0.5))}px solid ${border.color}`,
                                  }}
                                />
                              </div>
                            );
                          })()
                        ) : (
                          // Solid, Dashed, Dotted, Double, Groove, Ridge, Inset, Outset
                          <div
                            className="w-full h-full"
                            style={{
                              borderStyle: border.type,
                              borderWidth: border.type === 'double' ? `${Math.max(3, strokeW * 2)}px` : `${strokeW}px`,
                              borderColor: border.color,
                            }}
                          />
                        )}

                        {/* Interactive Resize Handles when Border Selected or Current Page Border Tools Active */}
                        {(isBorderSelected || (isCurrentPage && (interactiveBorderHandles || showBorderDropdown))) && (
                          <div className="absolute inset-0 pointer-events-auto">
                            {[
                              { handle: 'nw', cursor: 'nwse-resize', style: { top: -5, left: -5 } },
                              { handle: 'n', cursor: 'ns-resize', style: { top: -5, left: '50%', transform: 'translateX(-50%)' } },
                              { handle: 'ne', cursor: 'nesw-resize', style: { top: -5, right: -5 } },
                              { handle: 'e', cursor: 'ew-resize', style: { top: '50%', right: -5, transform: 'translateY(-50%)' } },
                              { handle: 'se', cursor: 'nwse-resize', style: { bottom: -5, right: -5 } },
                              { handle: 's', cursor: 'ns-resize', style: { bottom: -5, left: '50%', transform: 'translateX(-50%)' } },
                              { handle: 'sw', cursor: 'nesw-resize', style: { bottom: -5, left: -5 } },
                              { handle: 'w', cursor: 'ew-resize', style: { top: '50%', left: -5, transform: 'translateY(-50%)' } },
                            ].map((h) => (
                              <div
                                key={h.handle}
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                  setBorderDragState({
                                    pageIndex: pageNum - 1,
                                    handle: h.handle as any,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    origBorder: { ...border },
                                  });
                                }}
                                onPointerMove={(e) => {
                                  if (!borderDragState || borderDragState.pageIndex !== pageNum - 1) return;
                                  e.stopPropagation();
                                  const dx = (e.clientX - borderDragState.startX) / zoomScale;
                                  const dy = (e.clientY - borderDragState.startY) / zoomScale;
                                  const orig = borderDragState.origBorder;
                                  let nextLeft = orig.left;
                                  let nextRight = orig.right;
                                  let nextTop = orig.top;
                                  let nextBottom = orig.bottom;

                                  if (borderDragState.handle === 'move') {
                                    const borderW = (basePageDims.width || 595) - orig.left - orig.right;
                                    const borderH = (basePageDims.height || 842) - orig.top - orig.bottom;
                                    const maxLeft = (basePageDims.width || 595) - borderW;
                                    const maxTop = (basePageDims.height || 842) - borderH;

                                    nextLeft = Math.max(0, Math.min(maxLeft, orig.left + dx));
                                    nextRight = (basePageDims.width || 595) - nextLeft - borderW;
                                    nextTop = Math.max(0, Math.min(maxTop, orig.top + dy));
                                    nextBottom = (basePageDims.height || 842) - nextTop - borderH;
                                  } else {
                                    if (borderDragState.handle.includes('w')) {
                                      nextLeft = Math.max(0, Math.min((basePageDims.width || 595) / 2 - 20, orig.left + dx));
                                    }
                                    if (borderDragState.handle.includes('e')) {
                                      nextRight = Math.max(0, Math.min((basePageDims.width || 595) / 2 - 20, orig.right - dx));
                                    }
                                    if (borderDragState.handle.includes('n')) {
                                      nextTop = Math.max(0, Math.min((basePageDims.height || 842) / 2 - 20, orig.top + dy));
                                    }
                                    if (borderDragState.handle.includes('s')) {
                                      nextBottom = Math.max(0, Math.min((basePageDims.height || 842) / 2 - 20, orig.bottom - dy));
                                    }
                                  }

                                  const updatedBorder: PageBorderConfig = {
                                    ...orig,
                                    left: Math.round(nextLeft),
                                    right: Math.round(nextRight),
                                    top: Math.round(nextTop),
                                    bottom: Math.round(nextBottom),
                                  };
                                  setPageBorders((prev) => ({
                                    ...prev,
                                    [pageNum - 1]: updatedBorder,
                                  }));
                                  fitAllContentToBounds(pageNum - 1, updatedBorder);
                                }}
                                onPointerUp={(e) => {
                                  if (borderDragState) {
                                    pushSnapshot({ pageBorders });
                                    setBorderDragState(null);
                                  }
                                }}
                                className="absolute w-2.5 h-2.5 bg-indigo-600 border border-white rounded-full shadow-md z-30 hover:scale-125 transition-transform"
                                style={{ ...h.style, cursor: h.cursor }}
                                title={`Resize Page ${pageNum} Border (${h.handle})`}
                              />
                            ))}

                            {/* Margin Badge while Dragging */}
                            {borderDragState && borderDragState.pageIndex === pageNum - 1 && (
                              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-zinc-900/90 text-white rounded text-[10px] font-mono shadow-md z-40 whitespace-nowrap pointer-events-none">
                                L: {border.left}pt | R: {border.right}pt | T: {border.top}pt | B: {border.bottom}pt
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Page Number Rendering */}
                  {(() => {
                    const text = formatPageNumberDisplay(pageNum - 1, totalPages, pageNumberConfig);
                    if (!text) return null;

                    const pos = pageNumberConfig.position;
                    const isTop = pos.startsWith('top');
                    const isCenter = pos.endsWith('center');
                    const isRight = pos.endsWith('right');
                    const offsetY = (pageNumberConfig.offsetY || 24) * zoomScale;
                    const scale = zoomScale;

                    return (
                      <div
                        className="absolute pointer-events-none select-none z-15 flex items-center"
                        style={{
                          top: isTop ? `${offsetY}px` : undefined,
                          bottom: !isTop ? `${offsetY}px` : undefined,
                          left: isCenter ? '50%' : (!isRight ? `${36 * scale}px` : undefined),
                          right: isRight ? `${36 * scale}px` : undefined,
                          transform: isCenter ? 'translateX(-50%)' : undefined,
                          fontFamily: pageNumberConfig.fontFamily || 'Helvetica, sans-serif',
                          fontSize: `${(pageNumberConfig.fontSize || 10) * scale}px`,
                          fontWeight:
                            pageNumberConfig.fontWeight === 'bold'
                              ? 700
                              : pageNumberConfig.fontWeight === 'medium'
                              ? 500
                              : 400,
                          color: pageNumberConfig.color || '#000000',
                        }}
                      >
                        <span>{text}</span>
                      </div>
                    );
                  })()}

                  {/* OCR Scanning Overlay */}
                  {isCurrentPage && isOcrScanningPage && (
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
                  {isCurrentPage && activeTool === 'edit-text' &&
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
                const sampledBg = sampleCanvasBgColor(canvasRef.current, cssX, cssY, cssW, cssH, currentItem.bgColorHex || item.bgColorHex);
                const sampledFg = sampleCanvasTextColor(canvasRef.current, cssX, cssY, cssW, cssH, sampledBg.rgb);
                const effectiveBgHex = currentItem.bgColorHex || item.bgColorHex || sampledBg.hex;
                const textColor = currentItem.color || item.color || sampledFg;

                return (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEditingId(item.id);
                      setSelectedTextItemId(item.id);
                      setSelectedOverlayId(null);
                      setSelectedShapeId(null);
                      setSelectedTableId(null);
                      setSelectedTableCell(null);
                      setMultiSelectedIds([item.id]);
                      if (!/android/i.test(navigator.userAgent)) {
                        setShowPropertiesPanel(true);
                      }
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
                      setItemBgColor(effectiveBgHex);
                      setHexInput(textColor);
                    }}
                    style={{
                      left: `${boxX}px`,
                      top: `${boxY}px`,
                      width: `${boxW}px`,
                      height: `${boxH}px`,
                      backgroundColor: isEditing || isItemModified ? effectiveBgHex : 'transparent',
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
                              bgColorHex: effectiveBgHex,
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
                          backgroundColor: effectiveBgHex,
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
                          backgroundColor: effectiveBgHex,
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
              .filter((t) => t.pageIndex === pageNum - 1)
              .map((t) => {
                const scale = zoomScale;
                const cssX = t.x * scale;
                const cssY = viewportDims.height - t.y * scale;
                const isSelected = selectedOverlayId === t.id || multiSelectedIds.includes(t.id);
                const isEditing = editingOverlayId === t.id;

                if (isEditing) {
                  return (
                    <div
                      key={t.id}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        left: `${cssX}px`,
                        top: `${cssY}px`,
                        minWidth: '150px',
                        transform: t.rotation ? `rotate(${t.rotation}deg)` : undefined,
                      }}
                      className="absolute z-40 bg-white border-2 border-emerald-500 rounded-lg shadow-2xl p-2.5 select-text"
                    >
                      <textarea
                        autoFocus
                        value={t.text}
                        placeholder="Type text here..."
                        onChange={(e) => {
                          const val = e.target.value;
                          setTextOverlays((prev) =>
                            prev.map((item) => (item.id === t.id ? { ...item, text: val } : item))
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!t.text.trim()) {
                              setTextOverlays((prev) =>
                                prev.map((item) => (item.id === t.id ? { ...item, text: 'Sample Text' } : item))
                              );
                            }
                            setEditingOverlayId(null);
                            pushSnapshot({ textOverlays });
                          }
                        }}
                        onBlur={() => {
                          if (!t.text.trim()) {
                            setTextOverlays((prev) =>
                              prev.map((item) => (item.id === t.id ? { ...item, text: 'Sample Text' } : item))
                            );
                          }
                          setEditingOverlayId(null);
                          pushSnapshot({ textOverlays });
                        }}
                        style={{
                          fontSize: `${t.size * scale}px`,
                          fontFamily: t.fontFamily || 'Calibri, sans-serif',
                          fontWeight: t.isBold ? 700 : 400,
                          fontStyle: t.isItalic ? 'italic' : 'normal',
                          textDecoration: t.isUnderline ? 'underline' : 'none',
                          color: (t.color && t.color.toLowerCase() !== '#ffffff') ? t.color : '#000000',
                          textAlign: t.alignment || 'left',
                        }}
                        className="w-full bg-white text-zinc-900 border-none outline-none resize-both min-h-[38px] p-0 font-medium placeholder-zinc-400"
                      />
                      <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-[10px] text-emerald-700 font-bold select-none">
                        <span>Press Enter to save</span>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (!t.text.trim()) {
                              setTextOverlays((prev) =>
                                prev.map((item) => (item.id === t.id ? { ...item, text: 'Sample Text' } : item))
                              );
                            }
                            setEditingOverlayId(null);
                            pushSnapshot({ textOverlays });
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                        >
                          Done ✓
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemSelect(t.id, 'overlay', e);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setSelectedOverlayId(t.id);
                      setEditingOverlayId(t.id);
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      handleItemSelect(t.id, 'overlay', e);
                      setDraggingItem({
                        id: t.id,
                        type: 'overlay',
                        startX: e.clientX,
                        startY: e.clientY,
                        origX: t.x,
                        origY: t.y,
                      });
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length !== 1) return;
                      e.stopPropagation();
                      handleItemSelect(t.id, 'overlay', e);
                      const touch = e.touches[0];
                      setDraggingItem({
                        id: t.id,
                        type: 'overlay',
                        startX: touch.clientX,
                        startY: touch.clientY,
                        origX: t.x,
                        origY: t.y,
                      });
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
                      transform: t.rotation ? `rotate(${t.rotation}deg)` : undefined,
                    }}
                    className={`absolute cursor-move px-1 py-0.5 transition-all bg-transparent ${
                      isSelected ? 'ring-2 ring-indigo-500 rounded bg-indigo-50/20' : ''
                    }`}
                    title="Double-click to edit text • Drag to move"
                  >
                    {t.text}
                  </div>
                );
              })}

            {/* Render Hyperlink Overlays */}
            {hyperlinks
              .filter((l) => l.pageIndex === pageNum - 1)
              .map((l) => {
                const scale = zoomScale;
                const cssX = l.x * scale;
                const cssY = viewportDims.height - l.y * scale - l.height * scale;
                const isSelected = selectedOverlayId === l.id || multiSelectedIds.includes(l.id);

                return (
                  <div
                    key={l.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOverlayId(l.id);
                      const targetUrl = l.url.startsWith('http://') || l.url.startsWith('https://') ? l.url : `https://${l.url}`;
                      window.open(targetUrl, '_blank');
                    }}
                    style={{
                      left: `${cssX}px`,
                      top: `${cssY}px`,
                      width: `${l.width * scale}px`,
                      height: `${l.height * scale}px`,
                    }}
                    className={`absolute rounded cursor-pointer z-30 group transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-500/20 border border-blue-500'
                        : 'border border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10'
                    }`}
                    title={`Click to open link: ${l.url}`}
                  >
                    {/* Floating Sleek Tooltip with External Link & Delete */}
                    <div className="absolute -top-7 left-0 hidden group-hover:flex items-center gap-1 px-2 py-0.5 bg-zinc-900/90 text-white rounded text-[11px] shadow-lg pointer-events-auto z-50 whitespace-nowrap">
                      <ExternalLink className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <span className="font-mono underline text-blue-300 max-w-[200px] truncate">{l.url}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHyperlinks((prev) => prev.filter((item) => item.id !== l.id));
                          pushSnapshot({ hyperlinks: hyperlinks.filter((item) => item.id !== l.id) });
                        }}
                        className="p-0.5 ml-1 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Delete Hyperlink"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* Render Interactive Movable, Resizable & Croppable Image Overlays */}
            {imageOverlays
              .filter((i) => i.pageIndex === pageNum - 1)
              .map((img) => {
                const scale = zoomScale;
                const cssX = img.x * scale;
                const cssY = viewportDims.height - img.y * scale - img.height * scale;
                const cssW = img.width * scale;
                const cssH = img.height * scale;
                const isSelected = selectedOverlayId === img.id;
                const isCropping = cropImageId === img.id;
                const url = URL.createObjectURL(new Blob([img.imageData]));
                const imgFilters = [
                  img.brightness !== undefined && img.brightness !== 100 ? `brightness(${img.brightness}%)` : '',
                  img.contrast !== undefined && img.contrast !== 100 ? `contrast(${img.contrast}%)` : '',
                  img.saturation !== undefined && img.saturation !== 100 ? `saturate(${img.saturation}%)` : '',
                  img.hue !== undefined && img.hue !== 0 ? `hue-rotate(${img.hue}deg)` : '',
                  img.temperature !== undefined && img.temperature !== 0
                    ? img.temperature > 0
                      ? `sepia(${img.temperature * 0.5}%) hue-rotate(-${img.temperature * 0.15}deg) saturate(${100 + img.temperature * 0.2}%)`
                      : `hue-rotate(${Math.abs(img.temperature) * 0.35}deg) saturate(${100 - Math.abs(img.temperature) * 0.15}%)`
                    : '',
                  img.grayscale ? 'grayscale(100%)' : '',
                  img.invert ? 'invert(100%)' : '',
                ].filter(Boolean).join(' ');

                const imgTransforms = [
                  img.flipH ? 'scaleX(-1)' : '',
                  img.flipV ? 'scaleY(-1)' : '',
                ].filter(Boolean).join(' ');

                return (
                  <div
                    key={img.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOverlayId(img.id);
                      setSelectedShapeId(null);
                      setSelectedTableId(null);
                      setSelectedTableCell(null);
                      setActiveEditingId(null);
                      setSelectedTextItemId(null);
                      setMultiSelectedIds([img.id]);
                      if (!/android/i.test(navigator.userAgent)) {
                        setShowPropertiesPanel(true);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedOverlayId(img.id);
                      setSelectedShapeId(null);
                      setSelectedTableId(null);
                      setSelectedTableCell(null);
                      setSelectedTextItemId(null);
                      setMultiSelectedIds([img.id]);
                      setElementContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        type: 'image',
                        id: img.id,
                      });
                    }}
                    onMouseDown={(e) => {
                      if (isCropping || e.button !== 0) return;
                      e.stopPropagation();
                      setSelectedOverlayId(img.id);
                      setSelectedShapeId(null);
                      setSelectedTableId(null);
                      setSelectedTableCell(null);
                      setSelectedTextItemId(null);
                      setMultiSelectedIds([img.id]);
                      setDraggingItem({
                        id: img.id,
                        type: 'image',
                        startX: e.clientX,
                        startY: e.clientY,
                        origX: img.x,
                        origY: img.y,
                      });
                    }}
                    onTouchStart={(e) => {
                      if (isCropping || e.touches.length !== 1) return;
                      e.stopPropagation();
                      setSelectedOverlayId(img.id);
                      setSelectedShapeId(null);
                      setSelectedTableId(null);
                      setSelectedTableCell(null);
                      setSelectedTextItemId(null);
                      setMultiSelectedIds([img.id]);
                      const touch = e.touches[0];
                      setDraggingItem({
                        id: img.id,
                        type: 'image',
                        startX: touch.clientX,
                        startY: touch.clientY,
                        origX: img.x,
                        origY: img.y,
                      });
                    }}
                    style={{
                      left: `${cssX}px`,
                      top: `${cssY}px`,
                      width: `${cssW}px`,
                      height: `${cssH}px`,
                      transform: img.rotation ? `rotate(${img.rotation}deg)` : undefined,
                      borderRadius: img.borderRadius ? `${img.borderRadius * scale}px` : undefined,
                    }}
                    className={`absolute cursor-move select-none ${
                      isSelected ? 'ring-2 ring-emerald-500' : ''
                    }`}
                  >
                    <img
                      src={url}
                      alt="Overlay"
                      style={{
                        borderWidth: img.borderWidth ? `${img.borderWidth * scale}px` : undefined,
                        borderColor: img.borderColor || undefined,
                        borderStyle: img.borderStyle || (img.borderWidth ? 'solid' : undefined),
                        borderRadius: img.borderRadius ? `${img.borderRadius * scale}px` : undefined,
                        filter: imgFilters || undefined,
                        transform: imgTransforms || undefined,
                        boxSizing: 'border-box',
                      }}
                      className="w-full h-full object-fill pointer-events-none overflow-hidden"
                    />

                    {isSelected && !isCropping && (
                      <>
                        {renderResizeHandles(img.id, 'image', img.x, img.y, img.width, img.height)}
                        {/* Quick Action Floating Badge: Crop Button */}
                        <div
                          className={`absolute ${
                            /android/i.test(navigator.userAgent) ? '-bottom-8' : '-top-7'
                          } left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900/90 text-white rounded-md px-1.5 py-0.5 shadow-md text-[10px] z-50`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCropImageId(img.id);
                              setCropBox({ xPct: 0.05, yPct: 0.05, wPct: 0.9, hPct: 0.9 });
                            }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-700 font-medium"
                          >
                            <Crop className="w-3 h-3 text-emerald-400" />
                            <span>Crop</span>
                          </button>
                        </div>
                      </>
                    )}

                    {/* Interactive Crop UI */}
                    {isCropping && (
                      <div
                        className="absolute inset-0 z-50 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Crop Overlay Box */}
                        <div
                          className="absolute border-2 border-emerald-400 bg-emerald-500/10 cursor-move"
                          style={{
                            left: `${cropBox.xPct * 100}%`,
                            top: `${cropBox.yPct * 100}%`,
                            width: `${cropBox.wPct * 100}%`,
                            height: `${cropBox.hPct * 100}%`,
                          }}
                        >
                          {/* 3x3 Rule-of-Thirds Grid */}
                          <div className="w-full h-full grid grid-cols-3 grid-rows-3 border border-emerald-400/40 pointer-events-none">
                            <div className="border-r border-b border-emerald-400/30" />
                            <div className="border-r border-b border-emerald-400/30" />
                            <div className="border-b border-emerald-400/30" />
                            <div className="border-r border-b border-emerald-400/30" />
                            <div className="border-r border-b border-emerald-400/30" />
                            <div className="border-b border-emerald-400/30" />
                            <div className="border-r border-emerald-400/30" />
                            <div className="border-r border-emerald-400/30" />
                            <div />
                          </div>
                        </div>

                        {/* Apply / Cancel Crop Actions Floating Controls */}
                        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-900 text-white rounded-lg px-2 py-1 shadow-lg text-xs z-50">
                          <button
                            type="button"
                            onClick={() => handleApplyCrop(img.id)}
                            className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 rounded font-semibold text-[11px]"
                          >
                            <Check className="w-3 h-3" />
                            <span>Apply Crop</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCropImageId(null)}
                            className="flex items-center gap-1 px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded font-medium text-[11px]"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Render MS Word Vector Shapes */}
            {shapes
              .filter((s) => s.pageIndex === pageNum - 1)
              .map((shape) => {
                const scale = zoomScale;
                const cssX = shape.x * scale;
                const cssY = viewportDims.height - shape.y * scale - shape.height * scale;
                const cssW = shape.width * scale;
                const cssH = shape.height * scale;
                const isSelected = selectedShapeId === shape.id;

                return (
                  <div
                    key={shape.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShapeId(shape.id);
                      setSelectedTableId(null);
                      setSelectedTableCell(null);
                      setSelectedOverlayId(null);
                      setActiveEditingId(null);
                      setSelectedTextItemId(null);
                      setMultiSelectedIds([shape.id]);
                      if (!/android/i.test(navigator.userAgent)) {
                        setShowPropertiesPanel(true);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedShapeId(shape.id);
                      setSelectedTableId(null);
                      setSelectedTableCell(null);
                      setSelectedOverlayId(null);
                      setSelectedTextItemId(null);
                      setMultiSelectedIds([shape.id]);
                      setElementContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        type: 'shape',
                        id: shape.id,
                      });
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      setSelectedShapeId(shape.id);
                      setSelectedTableId(null);
                      setSelectedTableCell(null);
                      setSelectedOverlayId(null);
                      setSelectedTextItemId(null);
                      setMultiSelectedIds([shape.id]);
                      setDraggingItem({
                        id: shape.id,
                        type: 'shape',
                        startX: e.clientX,
                        startY: e.clientY,
                        origX: shape.x,
                        origY: shape.y,
                      });
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length !== 1) return;
                      e.stopPropagation();
                      setSelectedShapeId(shape.id);
                      setSelectedTableId(null);
                      setSelectedTableCell(null);
                      setSelectedOverlayId(null);
                      setSelectedTextItemId(null);
                      setMultiSelectedIds([shape.id]);
                      const touch = e.touches[0];
                      setDraggingItem({
                        id: shape.id,
                        type: 'shape',
                        startX: touch.clientX,
                        startY: touch.clientY,
                        origX: shape.x,
                        origY: shape.y,
                      });
                    }}
                    style={{
                      left: `${cssX}px`,
                      top: `${cssY}px`,
                      width: `${cssW}px`,
                      height: `${cssH}px`,
                      transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
                      opacity: shape.opacity ?? 1,
                    }}
                    className={`absolute cursor-move select-none ${
                      isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                    }`}
                  >
                    <svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${shape.width} ${shape.height}`}
                      style={{ overflow: 'visible' }}
                    >
                      {renderShapeSvg(shape)}
                    </svg>
                    {isSelected && renderResizeHandles(shape.id, 'shape', shape.x, shape.y, shape.width, shape.height)}
                  </div>
                );
              })}

            {/* Render Resizable Movable Interactive Tables */}
            {tables
              .filter((t) => t.pageIndex === pageNum - 1)
              .map((tbl) => {
                const scale = zoomScale;
                const colWidths =
                  tbl.colWidths && tbl.colWidths.length === tbl.cols
                    ? tbl.colWidths
                    : Array(tbl.cols).fill(tbl.width / Math.max(1, tbl.cols));
                const rowHeights =
                  tbl.rowHeights && tbl.rowHeights.length === tbl.rows
                    ? tbl.rowHeights
                    : Array(tbl.rows).fill(tbl.height / Math.max(1, tbl.rows));

                const totalW = colWidths.reduce((a: number, b: number) => a + b, 0);
                const totalH = rowHeights.reduce((a: number, b: number) => a + b, 0);
                const cssW = totalW * scale;
                const cssH = totalH * scale;
                const cssX = tbl.x * scale;
                const cssY = viewportDims.height - tbl.y * scale - cssH;
                const isSelected = selectedTableId === tbl.id || multiSelectedIds.includes(tbl.id);

                return (
                  <div
                    key={tbl.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemSelect(tbl.id, 'table', e);
                    }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'INPUT' || target.getAttribute('data-resizer') === 'true') return;
                      e.stopPropagation();
                      handleItemSelect(tbl.id, 'table', e);
                      setDraggingItem({
                        id: tbl.id,
                        type: 'table',
                        startX: e.clientX,
                        startY: e.clientY,
                        origX: tbl.x,
                        origY: tbl.y,
                      });
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length !== 1) return;
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'INPUT' || target.getAttribute('data-resizer') === 'true') return;
                      e.stopPropagation();
                      handleItemSelect(tbl.id, 'table', e);
                      const touch = e.touches[0];
                      setDraggingItem({
                        id: tbl.id,
                        type: 'table',
                        startX: touch.clientX,
                        startY: touch.clientY,
                        origX: tbl.x,
                        origY: tbl.y,
                      });
                    }}
                    style={{
                      left: `${cssX}px`,
                      top: `${cssY}px`,
                      width: `${cssW}px`,
                      height: `${cssH}px`,
                      transform: tbl.rotation ? `rotate(${tbl.rotation}deg)` : undefined,
                    }}
                    className={`absolute select-none cursor-move ${
                      isSelected ? 'ring-2 ring-indigo-500 z-30' : ''
                    }`}
                  >
                    {/* Table Grid - fills the entire box 100% */}
                    <table className="w-full h-full border-collapse table-fixed bg-white/95">
                      <colgroup>
                        {colWidths.map((w: number, ci: number) => (
                          <col key={ci} style={{ width: `${w * scale}px` }} />
                        ))}
                      </colgroup>
                      <tbody>
                        {(tbl.cells || []).map((row: string[], rIdx: number) => {
                          const rH = rowHeights[rIdx] ? rowHeights[rIdx] * scale : undefined;
                          return (
                            <tr key={rIdx} style={{ height: rH ? `${rH}px` : undefined }}>
                              {row.map((cellText: string, cIdx: number) => {
                                const isHeader = rIdx === 0 && tbl.headerRow;
                                const cellImgKey = `${rIdx}_${cIdx}`;
                                const hasCellImg = Boolean(tbl.cellImages?.[cellImgKey]);
                                const hasCellShape = Boolean(tbl.cellShapes?.[cellImgKey]);
                                const hasCellSub = Boolean(tbl.cellSubtables?.[cellImgKey]);
                                const isCellSelected = selectedTableCell?.tableId === tbl.id && selectedTableCell?.row === rIdx && selectedTableCell?.col === cIdx;

                                const cellProps = tbl.cellImageProps?.[cellImgKey];
                                const cellFilters = [
                                  cellProps?.brightness !== undefined && cellProps.brightness !== 100 ? `brightness(${cellProps.brightness}%)` : (activeTableImgCell === `${tbl.id}_${rIdx}_${cIdx}` && imageBrightness !== 100 ? `brightness(${imageBrightness}%)` : ''),
                                  cellProps?.contrast !== undefined && cellProps.contrast !== 100 ? `contrast(${cellProps.contrast}%)` : (activeTableImgCell === `${tbl.id}_${rIdx}_${cIdx}` && imageContrast !== 100 ? `contrast(${imageContrast}%)` : ''),
                                  cellProps?.saturation !== undefined && cellProps.saturation !== 100 ? `saturate(${cellProps.saturation}%)` : '',
                                  cellProps?.hue !== undefined && cellProps.hue !== 0 ? `hue-rotate(${cellProps.hue}deg)` : '',
                                  cellProps?.temperature !== undefined && cellProps.temperature !== 0
                                    ? cellProps.temperature > 0
                                      ? `sepia(${cellProps.temperature * 0.5}%) hue-rotate(-${cellProps.temperature * 0.15}deg) saturate(${100 + cellProps.temperature * 0.2}%)`
                                      : `hue-rotate(${Math.abs(cellProps.temperature) * 0.35}deg) saturate(${100 - Math.abs(cellProps.temperature) * 0.15}%)`
                                    : '',
                                  cellProps?.grayscale ? 'grayscale(100%)' : '',
                                  cellProps?.invert ? 'invert(100%)' : '',
                                ].filter(Boolean).join(' ');

                                const cellTransforms = [
                                  cellProps?.flipH ? 'scaleX(-1)' : '',
                                  cellProps?.flipV ? 'scaleY(-1)' : '',
                                ].filter(Boolean).join(' ');

                                return (
                                  <td
                                    key={cIdx}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedTableId(tbl.id);
                                      setSelectedTableCell({ tableId: tbl.id, row: rIdx, col: cIdx });
                                      setSelectedShapeId(null);
                                      setSelectedOverlayId(null);
                                      setSelectedTextItemId(null);
                                      setMultiSelectedIds([tbl.id]);
                                      setElementContextMenu({
                                        x: e.clientX,
                                        y: e.clientY,
                                        type: 'table',
                                        id: tbl.id,
                                        tableRow: rIdx,
                                        tableCol: cIdx,
                                      });
                                    }}
                                    style={{
                                      backgroundColor: isHeader
                                        ? (tbl.headerBgColor || '#f1f5f9')
                                        : (tbl.cellBgColor || undefined),
                                      borderColor: tbl.borderColor || '#000000',
                                      borderWidth: `${tbl.borderWidth || 1}px`,
                                      borderStyle: tbl.borderStyle || 'solid',
                                      padding: 0,
                                      position: 'relative',
                                      width: colWidths[cIdx] ? `${colWidths[cIdx] * scale}px` : undefined,
                                      height: rowHeights[rIdx] ? `${rowHeights[rIdx] * scale}px` : undefined,
                                      maxWidth: colWidths[cIdx] ? `${colWidths[cIdx] * scale}px` : undefined,
                                      maxHeight: rowHeights[rIdx] ? `${rowHeights[rIdx] * scale}px` : undefined,
                                      overflow: 'visible',
                                      boxSizing: 'border-box',
                                    }}
                                    className={`relative ${
                                      isCellSelected ? 'ring-2 ring-indigo-400 inset-0' : ''
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTableId(tbl.id);
                                      setSelectedTableCell({ tableId: tbl.id, row: rIdx, col: cIdx });
                                      setSelectedShapeId(null);
                                      setSelectedOverlayId(null);
                                      setSelectedTextItemId(null);
                                      setMultiSelectedIds([tbl.id]);
                                      if (hasCellImg) {
                                        setActiveTableImgCell(`${tbl.id}_${rIdx}_${cIdx}`);
                                      } else {
                                        setActiveTableImgCell(null);
                                      }
                                    }}
                                  >
                                    {hasCellImg ? (
                                      <div
                                        className={`relative w-full h-full flex items-center justify-center p-1 group/cellimg min-h-[16px] ${
                                          isCellSelected ? 'ring-2 ring-emerald-500 rounded-xs' : ''
                                        }`}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          overflow: 'visible',
                                          boxSizing: 'border-box',
                                        }}
                                      >
                                        <img
                                          src={tbl.cellImages![cellImgKey]}
                                          alt="Cell"
                                          className="w-full h-full object-contain pointer-events-none"
                                          style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            filter: cellFilters || undefined,
                                            transform: cellTransforms || undefined,
                                            borderRadius: `${cellProps?.borderRadius ?? imageBorderRadius}px`,
                                            borderWidth: cellProps?.borderWidth ? `${cellProps.borderWidth}px` : undefined,
                                            borderStyle: (cellProps?.borderStyle as any) || undefined,
                                            borderColor: cellProps?.borderColor || undefined,
                                          }}
                                        />
                                        {isCellSelected && (
                                          <>
                                            {/* SE Corner Resizer (Col + Row) */}
                                            <div
                                              data-resizer="true"
                                              title="Drag corner to freely resize row height & column width"
                                              className="absolute -bottom-2 -right-2 w-3.5 h-3.5 bg-emerald-500 hover:bg-emerald-400 border-2 border-white rounded-full cursor-se-resize z-50 shadow-md pointer-events-auto active:scale-125 transition-transform"
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: e.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: e.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                              onTouchStart={(e) => {
                                                if (e.touches.length !== 1) return;
                                                e.stopPropagation();
                                                const t = e.touches[0];
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: t.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: t.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                            />
                                            {/* E Right Resizer (Col) */}
                                            <div
                                              data-resizer="true"
                                              title="Drag right edge to resize column width"
                                              className="absolute -right-2 top-1/2 -translate-y-1/2 w-2 h-5 bg-emerald-500 hover:bg-emerald-400 border border-white rounded-full cursor-e-resize z-50 shadow-md pointer-events-auto active:scale-125 transition-transform"
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: e.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                              }}
                                              onTouchStart={(e) => {
                                                if (e.touches.length !== 1) return;
                                                e.stopPropagation();
                                                const t = e.touches[0];
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: t.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                              }}
                                            />
                                            {/* S Bottom Resizer (Row) */}
                                            <div
                                              data-resizer="true"
                                              title="Drag bottom edge to resize row height"
                                              className="absolute left-1/2 -translate-x-1/2 -bottom-2 h-2 w-5 bg-emerald-500 hover:bg-emerald-400 border border-white rounded-full cursor-s-resize z-50 shadow-md pointer-events-auto active:scale-125 transition-transform"
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: e.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                              onTouchStart={(e) => {
                                                if (e.touches.length !== 1) return;
                                                e.stopPropagation();
                                                const t = e.touches[0];
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: t.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                            />
                                          </>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveCellImage(tbl.id, rIdx, cIdx);
                                          }}
                                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded opacity-0 group-hover/cellimg:opacity-100 hover:bg-red-700 transition-opacity z-50 shadow-xs"
                                          title="Remove Image from Cell"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : hasCellShape ? (
                                      <div
                                        className={`relative w-full h-full flex items-center justify-center p-1 group/cellshape min-h-[16px] ${
                                          isCellSelected ? 'ring-2 ring-emerald-500 rounded-xs' : ''
                                        }`}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          overflow: 'visible',
                                          boxSizing: 'border-box',
                                        }}
                                      >
                                        <div className="w-full h-full p-1 flex items-center justify-center overflow-hidden">
                                          <svg
                                            width="100%"
                                            height="100%"
                                            viewBox={`0 0 ${Math.max(10, colWidths[cIdx] * scale - 8)} ${Math.max(10, rowHeights[rIdx] * scale - 8)}`}
                                            style={{ overflow: 'visible' }}
                                          >
                                            {renderShapeSvg({
                                              id: cellImgKey,
                                              pageIndex: tbl.pageIndex,
                                              type: tbl.cellShapes![cellImgKey].type as ShapeType,
                                              x: 0,
                                              y: 0,
                                              width: Math.max(10, colWidths[cIdx] * scale - 8),
                                              height: Math.max(10, rowHeights[rIdx] * scale - 8),
                                              strokeColor: tbl.cellShapes![cellImgKey].strokeColor || '#2563eb',
                                              fillColor: tbl.cellShapes![cellImgKey].fillColor || '#dbeafe',
                                              strokeWidth: tbl.cellShapes![cellImgKey].strokeWidth || 2,
                                              strokeStyle: (tbl.cellShapes![cellImgKey] as any).strokeStyle || 'solid',
                                            })}
                                          </svg>
                                        </div>
                                        {isCellSelected && (
                                          <>
                                            {/* SE Corner Resizer (Col + Row) */}
                                            <div
                                              data-resizer="true"
                                              title="Drag corner to freely resize row height & column width"
                                              className="absolute -bottom-2 -right-2 w-3.5 h-3.5 bg-emerald-500 hover:bg-emerald-400 border-2 border-white rounded-full cursor-se-resize z-50 shadow-md pointer-events-auto active:scale-125 transition-transform"
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: e.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: e.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                              onTouchStart={(e) => {
                                                if (e.touches.length !== 1) return;
                                                e.stopPropagation();
                                                const t = e.touches[0];
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: t.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: t.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                            />
                                            {/* E Right Resizer (Col) */}
                                            <div
                                              data-resizer="true"
                                              title="Drag right edge to resize column width"
                                              className="absolute -right-2 top-1/2 -translate-y-1/2 w-2 h-5 bg-emerald-500 hover:bg-emerald-400 border border-white rounded-full cursor-e-resize z-50 shadow-md pointer-events-auto active:scale-125 transition-transform"
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: e.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                              }}
                                              onTouchStart={(e) => {
                                                if (e.touches.length !== 1) return;
                                                e.stopPropagation();
                                                const t = e.touches[0];
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: t.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                              }}
                                            />
                                            {/* S Bottom Resizer (Row) */}
                                            <div
                                              data-resizer="true"
                                              title="Drag bottom edge to resize row height"
                                              className="absolute left-1/2 -translate-x-1/2 -bottom-2 h-2 w-5 bg-emerald-500 hover:bg-emerald-400 border border-white rounded-full cursor-s-resize z-50 shadow-md pointer-events-auto active:scale-125 transition-transform"
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: e.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                              onTouchStart={(e) => {
                                                if (e.touches.length !== 1) return;
                                                e.stopPropagation();
                                                const t = e.touches[0];
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: t.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                            />
                                          </>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveCellShape(tbl.id, rIdx, cIdx);
                                          }}
                                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded opacity-0 group-hover/cellshape:opacity-100 hover:bg-red-700 transition-opacity z-50 shadow-xs"
                                          title="Remove Shape from Cell"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : hasCellSub ? (
                                      <div
                                        className={`relative w-full h-full p-1 group/cellsub min-h-[20px] ${
                                          isCellSelected ? 'ring-2 ring-emerald-500 rounded-xs' : ''
                                        }`}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          overflow: 'visible',
                                          boxSizing: 'border-box',
                                        }}
                                      >
                                        <div
                                          className="grid h-full border border-slate-300 dark:border-zinc-700 rounded text-[9px]"
                                          style={{
                                            gridTemplateColumns: `repeat(${tbl.cellSubtables![cellImgKey].cols}, minmax(0, 1fr))`,
                                            gridTemplateRows: `repeat(${tbl.cellSubtables![cellImgKey].rows}, minmax(0, 1fr))`,
                                          }}
                                        >
                                          {tbl.cellSubtables![cellImgKey].cells.map((subR, sri) =>
                                            subR.map((subVal, sci) => (
                                              <input
                                                key={`${sri}_${sci}`}
                                                type="text"
                                                value={subVal}
                                                onChange={(e) => {
                                                  handleUpdateSubtableCell(tbl.id, rIdx, cIdx, sri, sci, e.target.value);
                                                }}
                                                className="w-full h-full border border-slate-200 dark:border-zinc-800 bg-transparent text-center font-medium outline-none p-0.5 text-[8px]"
                                              />
                                            ))
                                          )}
                                        </div>
                                        {isCellSelected && (
                                          <>
                                            {/* SE Corner Resizer (Col + Row) */}
                                            <div
                                              data-resizer="true"
                                              title="Drag corner to freely resize row height & column width"
                                              className="absolute -bottom-2 -right-2 w-3.5 h-3.5 bg-emerald-500 hover:bg-emerald-400 border-2 border-white rounded-full cursor-se-resize z-50 shadow-md pointer-events-auto active:scale-125 transition-transform"
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: e.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: e.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                              onTouchStart={(e) => {
                                                if (e.touches.length !== 1) return;
                                                e.stopPropagation();
                                                const t = e.touches[0];
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: t.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: t.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                            />
                                            {/* E Right Resizer (Col) */}
                                            <div
                                              data-resizer="true"
                                              title="Drag right edge to resize column width"
                                              className="absolute -right-2 top-1/2 -translate-y-1/2 w-2 h-5 bg-emerald-500 hover:bg-emerald-400 border border-white rounded-full cursor-e-resize z-50 shadow-md pointer-events-auto active:scale-125 transition-transform"
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: e.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                              }}
                                              onTouchStart={(e) => {
                                                if (e.touches.length !== 1) return;
                                                e.stopPropagation();
                                                const t = e.touches[0];
                                                setResizingCol({
                                                  tableId: tbl.id,
                                                  colIdx: cIdx,
                                                  startX: t.clientX,
                                                  initialWidth: colWidths[cIdx],
                                                  initialColWidths: [...colWidths],
                                                });
                                              }}
                                            />
                                            {/* S Bottom Resizer (Row) */}
                                            <div
                                              data-resizer="true"
                                              title="Drag bottom edge to resize row height"
                                              className="absolute left-1/2 -translate-x-1/2 -bottom-2 h-2 w-5 bg-emerald-500 hover:bg-emerald-400 border border-white rounded-full cursor-s-resize z-50 shadow-md pointer-events-auto active:scale-125 transition-transform"
                                              onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: e.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                              onTouchStart={(e) => {
                                                if (e.touches.length !== 1) return;
                                                e.stopPropagation();
                                                const t = e.touches[0];
                                                setResizingRow({
                                                  tableId: tbl.id,
                                                  rowIdx: rIdx,
                                                  startY: t.clientY,
                                                  initialHeight: rowHeights[rIdx],
                                                  initialRowHeights: [...rowHeights],
                                                  initialTableY: tbl.y,
                                                  initialTotalHeight: totalH,
                                                });
                                              }}
                                            />
                                          </>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveCellSubtable(tbl.id, rIdx, cIdx);
                                          }}
                                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded opacity-0 group-hover/cellsub:opacity-100 hover:bg-red-700 transition-opacity z-50 shadow-xs"
                                          title="Remove Subtable from Cell"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <input
                                        type="text"
                                        value={cellText}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setTables((prev) =>
                                            prev.map((t) => {
                                              if (t.id !== tbl.id) return t;
                                              const nextCells = (t.cells || []).map((r: string[], ri: number) =>
                                                ri === rIdx ? r.map((c: string, ci: number) => (ci === cIdx ? val : c)) : r
                                              );
                                              return { ...t, cells: nextCells };
                                            })
                                          );
                                        }}
                                        onBlur={() => {
                                          pushSnapshot({ tables });
                                        }}
                                        style={{
                                          fontSize: `${(tbl.fontSize || 10) * scale}px`,
                                          fontFamily: tbl.fontFamily || 'Calibri',
                                          color: tbl.textColor || '#0f172a',
                                          fontWeight: isHeader ? 700 : 400,
                                        }}
                                        className="w-full h-full bg-transparent border-none outline-none p-0 m-0"
                                      />
                                    )}

                                    {/* Column Resizer Handle on right border (All columns including end) */}
                                    {isSelected && !selectedTableCell && (
                                      <div
                                        data-resizer="true"
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          const currentW = colWidths[cIdx] || (tbl.width / tbl.cols);
                                          setResizingCol({
                                            tableId: tbl.id,
                                            colIdx: cIdx,
                                            startX: e.clientX,
                                            initialWidth: currentW,
                                            initialColWidths: [...colWidths],
                                          });
                                        }}
                                        onTouchStart={(e) => {
                                          if (e.touches.length !== 1) return;
                                          e.stopPropagation();
                                          const currentW = colWidths[cIdx] || (tbl.width / tbl.cols);
                                          setResizingCol({
                                            tableId: tbl.id,
                                            colIdx: cIdx,
                                            startX: e.touches[0].clientX,
                                            initialWidth: currentW,
                                            initialColWidths: [...colWidths],
                                          });
                                        }}
                                        className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-20 hover:bg-indigo-500/60 active:bg-indigo-600/80 touch-none transition-colors"
                                        title="Drag to resize column width"
                                      />
                                    )}

                                    {/* Row Resizer Handle on bottom border (All rows including end) */}
                                    {isSelected && !selectedTableCell && (
                                      <div
                                        data-resizer="true"
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          const currentH = rowHeights[rIdx] || (tbl.height / tbl.rows);
                                          setResizingRow({
                                            tableId: tbl.id,
                                            rowIdx: rIdx,
                                            startY: e.clientY,
                                            initialHeight: currentH,
                                            initialRowHeights: [...rowHeights],
                                            initialTableY: tbl.y,
                                            initialTotalHeight: totalH,
                                          });
                                        }}
                                        onTouchStart={(e) => {
                                          if (e.touches.length !== 1) return;
                                          e.stopPropagation();
                                          const currentH = rowHeights[rIdx] || (tbl.height / tbl.rows);
                                          setResizingRow({
                                            tableId: tbl.id,
                                            rowIdx: rIdx,
                                            startY: e.touches[0].clientY,
                                            initialHeight: currentH,
                                            initialRowHeights: [...rowHeights],
                                            initialTableY: tbl.y,
                                            initialTotalHeight: totalH,
                                          });
                                        }}
                                        className="absolute left-0 right-0 -bottom-2 h-4 cursor-row-resize z-20 hover:bg-indigo-500/60 active:bg-indigo-600/80 touch-none transition-colors"
                                        title="Drag to resize row height"
                                      />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {isSelected && !selectedTableCell && renderResizeHandles(tbl.id, 'table', tbl.x, tbl.y, totalW, totalH, colWidths, rowHeights)}
                  </div>
                );
              })}

            {/* Interactive Digital Signature Hotspots on Canvas */}
            {signatures
              .filter((sig) => (sig.rect ? sig.rect.pageIndex === pageNum - 1 : pageNum === 1))
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

            {/* Live Watermark Rendering Layer */}
            {(() => {
              if (!watermarkConfig || !watermarkConfig.enabled) return null;
              const scope = watermarkConfig.pageScope || 'all';
              let applies = true;
              if (scope === 'odd' && pageNum % 2 === 0) applies = false;
              if (scope === 'even' && pageNum % 2 !== 0) applies = false;
              if (scope === 'custom') {
                if (watermarkConfig.customRange) {
                  const parsed = PdfStudioEngine.parsePageRange(watermarkConfig.customRange, totalPages);
                  applies = parsed.includes(pageNum);
                } else {
                  applies = false;
                }
              }

              if (!applies) return null;

              const layerZ = watermarkConfig.layer === 'behind' ? 'z-0' : 'z-25';
              const pW = (basePageDims.width || 595) * zoomScale;
              const pH = (basePageDims.height || 842) * zoomScale;
              const ptPerCm = 28.3465 * zoomScale;
              const xOffset = (watermarkConfig.xOffsetCm || 0) * ptPerCm;
              const yOffset = (watermarkConfig.yOffsetCm || 0) * ptPerCm;
              const rot = watermarkConfig.rotation ?? -45;
              const op = Math.max(0.05, Math.min(1, (watermarkConfig.opacity ?? 35) / 100));

              if (watermarkConfig.type === 'text') {
                const text = watermarkConfig.text || 'CONFIDENTIAL';
                let calcSize = (watermarkConfig.fontSize || 36) * zoomScale;
                if (watermarkConfig.proportionOfPages) {
                  calcSize = Math.max(12, Math.round((pW * ((watermarkConfig.proportionPercent || 50) / 100)) / Math.max(1, text.length * 0.6)));
                }

                if (watermarkConfig.tile) {
                  const stepX = Math.max(120, ((watermarkConfig.tileSpacingXCm || 2) * ptPerCm * 2));
                  const stepY = Math.max(100, ((watermarkConfig.tileSpacingYCm || 2) * ptPerCm * 2));
                  const tiles: { x: number; y: number }[] = [];
                  for (let tx = 0; tx < pW + 200; tx += stepX) {
                    for (let ty = 0; ty < pH + 200; ty += stepY) {
                      tiles.push({ x: tx + xOffset, y: ty - yOffset });
                    }
                  }
                  return (
                    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${layerZ}`}>
                      {tiles.map((t, idx) => (
                        <div
                          key={idx}
                          style={{
                            left: `${t.x}px`,
                            top: `${t.y}px`,
                            transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                            color: watermarkConfig.color || '#dc2626',
                            fontFamily: watermarkConfig.fontFamily || 'Helvetica',
                            fontSize: `${calcSize}px`,
                            fontWeight: watermarkConfig.isBold ? 'bold' : 'normal',
                            fontStyle: watermarkConfig.isItalic ? 'italic' : 'normal',
                            textDecoration: watermarkConfig.isUnderline ? 'underline' : 'none',
                            opacity: op,
                          }}
                          className="absolute whitespace-nowrap select-none origin-center"
                        >
                          {text}
                        </div>
                      ))}
                    </div>
                  );
                }

                let leftPct = '50%';
                let topPct = '50%';
                const pos = watermarkConfig.position || 'center';
                if (pos.includes('left')) leftPct = '20%';
                else if (pos.includes('right')) leftPct = '80%';
                if (pos.includes('top')) topPct = '15%';
                else if (pos.includes('bottom')) topPct = '85%';

                return (
                  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${layerZ}`}>
                    <div
                      style={{
                        left: leftPct,
                        top: topPct,
                        transform: `translate(-50%, -50%) translate(${xOffset}px, ${-yOffset}px) rotate(${rot}deg)`,
                        color: watermarkConfig.color || '#dc2626',
                        fontFamily: watermarkConfig.fontFamily || 'Helvetica',
                        fontSize: `${calcSize}px`,
                        fontWeight: watermarkConfig.isBold ? 'bold' : 'normal',
                        fontStyle: watermarkConfig.isItalic ? 'italic' : 'normal',
                        textDecoration: watermarkConfig.isUnderline ? 'underline' : 'none',
                        opacity: op,
                      }}
                      className="absolute whitespace-nowrap select-none origin-center"
                    >
                      {text}
                    </div>
                  </div>
                );
              }

              if (watermarkConfig.type === 'file' && watermarkConfig.fileDataUrl) {
                return (
                  <div className={`absolute inset-0 overflow-hidden pointer-events-none ${layerZ} flex items-center justify-center`}>
                    <img
                      src={watermarkConfig.fileDataUrl}
                      alt="Watermark"
                      style={{
                        maxWidth: '80%',
                        maxHeight: '80%',
                        transform: `translate(${xOffset}px, ${-yOffset}px) rotate(${rot}deg)`,
                        opacity: op,
                      }}
                      className="select-none pointer-events-none"
                    />
                  </div>
                );
              }
              return null;
            })()}

            {/* Freehand Drawings SVG Layer */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
              viewBox={`0 0 ${basePageDims.width || 595} ${basePageDims.height || 842}`}
              preserveAspectRatio="none"
            >
              {/* Existing saved drawings on this page */}
              {drawings
                .filter((stroke) => stroke.pageIndex === pageIdx)
                .map((stroke) => {
                  const pts = stroke.points;
                  if (!pts || pts.length === 0) return null;
                  if (pts.length === 1) {
                    return (
                      <circle
                        key={stroke.id}
                        cx={pts[0].x}
                        cy={pts[0].y}
                        r={stroke.thickness / 2}
                        fill={stroke.color}
                        opacity={stroke.opacity || 1}
                      />
                    );
                  }
                  let d = `M ${pts[0].x} ${pts[0].y}`;
                  for (let i = 1; i < pts.length; i++) {
                    const prev = pts[i - 1];
                    const curr = pts[i];
                    const midX = (prev.x + curr.x) / 2;
                    const midY = (prev.y + curr.y) / 2;
                    d += ` Q ${prev.x} ${prev.y}, ${midX} ${midY}`;
                  }
                  d += ` T ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
                  return (
                    <path
                      key={stroke.id}
                      d={d}
                      fill="none"
                      stroke={stroke.color}
                      strokeWidth={stroke.thickness}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={stroke.opacity || 1}
                      style={stroke.blendMode === 'multiply' ? { mixBlendMode: 'multiply' } : undefined}
                    />
                  );
                })}

              {/* In-progress active stroke */}
              {currentStroke && currentStroke.pageIndex === pageIdx && currentStroke.points.length > 0 && (() => {
                const pts = currentStroke.points;
                if (pts.length === 1) {
                  return (
                    <circle
                      cx={pts[0].x}
                      cy={pts[0].y}
                      r={currentStroke.thickness / 2}
                      fill={currentStroke.color}
                      opacity={currentStroke.opacity || 1}
                    />
                  );
                }
                let d = `M ${pts[0].x} ${pts[0].y}`;
                for (let i = 1; i < pts.length; i++) {
                  const prev = pts[i - 1];
                  const curr = pts[i];
                  const midX = (prev.x + curr.x) / 2;
                  const midY = (prev.y + curr.y) / 2;
                  d += ` Q ${prev.x} ${prev.y}, ${midX} ${midY}`;
                }
                d += ` T ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
                return (
                  <path
                    d={d}
                    fill="none"
                    stroke={currentStroke.color}
                    strokeWidth={currentStroke.thickness}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={currentStroke.opacity || 1}
                    style={currentStroke.blendMode === 'multiply' ? { mixBlendMode: 'multiply' } : undefined}
                  />
                );
              })()}
            </svg>

            {/* Interactive Drawing Pointer Capture Layer */}
            {['pen', 'pencil', 'highlighter', 'eraser'].includes(activeTool) && (
              <div
                className="absolute inset-0 z-35 touch-none"
                style={{
                  cursor: activeTool === 'eraser' ? 'none' : 'crosshair',
                }}
                onPointerDown={(e) => handleDrawingStart(e, pageIdx)}
                onPointerMove={(e) => handleDrawingMove(e, pageIdx)}
                onPointerUp={handleDrawingEnd}
                onPointerLeave={() => {
                  if (activeTool === 'eraser') setEraserCursorPos(null);
                }}
              />
            )}

            {/* Dynamic Circular Eraser Cursor Follower */}
            {activeTool === 'eraser' && isCurrentPage && eraserCursorPos && (
              <div
                className="absolute pointer-events-none rounded-full border-2 border-rose-500 bg-rose-500/20 shadow-md z-40"
                style={{
                  left: `${eraserCursorPos.x}px`,
                  top: `${eraserCursorPos.y}px`,
                  width: `${eraserRadius * 2}px`,
                  height: `${eraserRadius * 2}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}

            {/* Seamless Non-blocking Rendering Badge */}
            {isCurrentPage && isRendering && (
              <div className="absolute top-3 right-3 z-50 pointer-events-none transition-opacity duration-200">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/85 dark:bg-zinc-800/90 text-white shadow-lg backdrop-blur-md text-[11px] font-medium border border-white/10">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Loading Page {currentPage}...</span>
                </div>
              </div>
            )}

            {/* Bottom Page Number Badge */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none pointer-events-none">
              Page {pageNum} of {totalPages}
            </div>
            </div>
              );
            })}
          </div>
        </main>

      {/* Persistent Floating Side Tab to Expand / Reopen Properties Anytime without scrolling */}
      {(!showPropertiesPanel || isPropertiesCollapsed) && (
        <button
          type="button"
          onClick={() => {
            setShowPropertiesPanel(true);
            setIsPropertiesCollapsed(false);
          }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-l-xl py-2.5 px-1.5 shadow-2xl flex flex-col items-center gap-1 transition-all cursor-pointer group border-y border-l border-indigo-500/50"
          title="Expand Properties Panel"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-[9px] font-bold uppercase tracking-wider [writing-mode:vertical-lr] rotate-180 select-none py-0.5">
            Properties
          </span>
        </button>
      )}

      {/* Mobile Backdrop for Properties Sheet / Drawer */}
      {showPropertiesPanel && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 md:hidden animate-fade-in"
          onClick={() => setShowPropertiesPanel(false)}
        />
      )}

      {/* Wondershare PDFelement Right Properties Sidebar / Mobile Bottom Sheet / Landscape Drawer */}
      {showPropertiesPanel && (
        <aside className={`fixed inset-x-0 bottom-0 z-50 h-[40vh] max-h-[45vh] rounded-t-2xl border-t-2 border-indigo-600 shadow-2xl landscape:inset-y-0 landscape:right-0 landscape:left-auto landscape:bottom-auto landscape:w-80 landscape:max-w-[85vw] landscape:h-full landscape:max-h-none landscape:rounded-none landscape:border-l-2 landscape:border-t-0 landscape:border-indigo-600 md:static md:inset-auto ${
          isPropertiesCollapsed ? 'md:w-0 md:overflow-visible' : 'md:w-80'
        } md:h-full md:max-h-none md:rounded-none md:shadow-md md:border-l md:border-t-0 md:border-slate-300 md:dark:border-zinc-800 md:z-30 bg-white dark:bg-zinc-900 flex flex-col flex-shrink-0 animate-fade-in select-none touch-pan-y relative`}>
          {/* Vertical Middle Edge Collapse/Expand "Kink" Tab */}
          <button
            type="button"
            onClick={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-4 w-4 h-12 bg-white dark:bg-zinc-800 border-y border-l border-slate-300 dark:border-zinc-700 rounded-l-md items-center justify-center cursor-pointer shadow-md hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 z-50 transition-colors"
            title={isPropertiesCollapsed ? "Expand Properties Panel" : "Collapse Properties Panel"}
          >
            {isPropertiesCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {/* Mobile Bottom Sheet Pull Handle with Swipe-Down Gesture (Hidden in Landscape drawer & Desktop) */}
          <div
            className="w-full py-1.5 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing md:hidden landscape:hidden shrink-0 touch-none select-none"
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                setPropertiesTouchStartY(e.touches[0].clientY);
              }
            }}
            onTouchMove={(e) => {
              if (propertiesTouchStartY !== null && e.touches.length === 1) {
                const diff = e.touches[0].clientY - propertiesTouchStartY;
                if (diff > 50) {
                  setShowPropertiesPanel(false);
                  setPropertiesTouchStartY(null);
                }
              }
            }}
            onTouchEnd={() => setPropertiesTouchStartY(null)}
          >
            <div className="w-12 h-1.5 bg-slate-400 dark:bg-zinc-600 rounded-full" />
            <span className="text-[9px] text-slate-400 mt-0.5 font-semibold">Swipe down to close</span>
          </div>

          {/* Panel Header */}
          <div
            className="px-3.5 py-2 bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between"
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                setPropertiesTouchStartY(e.touches[0].clientY);
              }
            }}
            onTouchMove={(e) => {
              if (propertiesTouchStartY !== null && e.touches.length === 1) {
                const diff = e.touches[0].clientY - propertiesTouchStartY;
                if (diff > 50) {
                  setShowPropertiesPanel(false);
                  setPropertiesTouchStartY(null);
                }
              }
            }}
            onTouchEnd={() => setPropertiesTouchStartY(null)}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                Properties
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsPropertiesCollapsed(true);
                  setShowPropertiesPanel(false);
                }}
                className="px-2 py-1 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                title="Collapse Properties to side tab"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>Collapse</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPropertiesPanel(false);
                  setIsPropertiesCollapsed(true);
                }}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close Properties Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={`p-3.5 pb-28 sm:pb-16 space-y-4 text-xs flex-1 min-h-0 overflow-y-auto overscroll-contain ${isPropertiesCollapsed ? 'hidden md:hidden' : ''}`}>
            {/* Selection Type Indicator */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                Selection
              </div>
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-100 px-3 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between shadow-2xs">
                <span className="truncate">
                  {selectedBorderPage !== null
                    ? `Page ${selectedBorderPage + 1} Border`
                    : selectedShapeId
                    ? `Shape: ${shapes.find((s) => s.id === selectedShapeId)?.type || 'Custom'}`
                    : selectedTableId
                    ? `Table (${tables.find((t) => t.id === selectedTableId)?.rows} Rows × ${tables.find((t) => t.id === selectedTableId)?.cols} Cols)`
                    : activeEditingId || selectedTextItemId
                    ? 'Document Text'
                    : selectedOverlayId
                    ? textOverlays.some((t) => t.id === selectedOverlayId)
                      ? 'Text Overlay'
                      : imageOverlays.some((i) => i.id === selectedOverlayId)
                      ? 'Image Overlay'
                      : 'Overlay'
                    : `Page ${currentPage} of ${totalPages || 1}`}
                </span>
                {(selectedShapeId || selectedTableId || selectedOverlayId || activeEditingId || selectedTextItemId || selectedBorderPage !== null) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedShapeId(null);
                      setSelectedTableId(null);
                      setSelectedOverlayId(null);
                      setActiveEditingId(null);
                      setSelectedTextItemId(null);
                      setSelectedBorderPage(null);
                    }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 underline ml-2 shrink-0 cursor-pointer"
                  >
                    Deselect
                  </button>
                )}
              </div>
            </div>

            {/* CASE 1: SHAPE PROPERTIES */}
            {selectedShapeId && (() => {
              const shp = shapes.find((s) => s.id === selectedShapeId);
              if (!shp) return null;
              return (
                <div className="space-y-3 border-t border-slate-200 dark:border-zinc-800 pt-3">
                  <div className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                    ▾ Shape Style
                  </div>

                  {/* Fill Color */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Fill Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={shp.fillColor === 'transparent' ? '#ffffff' : shp.fillColor || '#dbeafe'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShapes((prev) => prev.map((s) => (s.id === selectedShapeId ? { ...s, fillColor: val } : s)));
                          pushSnapshot({ shapes });
                        }}
                        className="w-7 h-7 rounded border border-slate-300 dark:border-zinc-700 bg-transparent cursor-pointer p-0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShapes((prev) => prev.map((s) => (s.id === selectedShapeId ? { ...s, fillColor: 'transparent' } : s)));
                          pushSnapshot({ shapes });
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-bold transition-colors ${
                          shp.fillColor === 'transparent' ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-800'
                        }`}
                      >
                        Transparent
                      </button>
                    </div>
                  </div>

                  {/* Stroke Color & Width */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Border Stroke</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={shp.strokeColor || '#2563eb'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShapes((prev) => prev.map((s) => (s.id === selectedShapeId ? { ...s, strokeColor: val } : s)));
                          pushSnapshot({ shapes });
                        }}
                        className="w-7 h-7 rounded border border-slate-300 dark:border-zinc-700 bg-transparent cursor-pointer p-0"
                      />
                      <div className="flex-1 flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-2 py-1 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500">Width:</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={shp.strokeWidth || 2}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setShapes((prev) => prev.map((s) => (s.id === selectedShapeId ? { ...s, strokeWidth: val } : s)));
                            pushSnapshot({ shapes });
                          }}
                          className="w-10 text-xs font-mono font-bold bg-transparent text-center text-slate-900 dark:text-zinc-100 outline-none"
                        />
                        <span className="text-[11px] font-semibold text-slate-500">pt</span>
                      </div>
                    </div>
                  </div>

                  {/* Stroke Style: Solid or Dashed */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShapes((prev) => prev.map((s) => (s.id === selectedShapeId ? { ...s, strokeStyle: 'solid' } : s)));
                        pushSnapshot({ shapes });
                      }}
                      className={`flex-1 py-1.5 text-xs rounded-lg border font-bold transition-colors ${
                        (shp.strokeStyle || 'solid') === 'solid' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-800'
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShapes((prev) => prev.map((s) => (s.id === selectedShapeId ? { ...s, strokeStyle: 'dashed' } : s)));
                        pushSnapshot({ shapes });
                      }}
                      className={`flex-1 py-1.5 text-xs rounded-lg border font-bold transition-colors ${
                        shp.strokeStyle === 'dashed' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-800'
                      }`}
                    >
                      Dashed
                    </button>
                  </div>

                  {/* Opacity Slider */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      <span>Opacity</span>
                      <span className="font-mono text-slate-900 dark:text-zinc-100">{Math.round((shp.opacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round((shp.opacity ?? 1) * 100)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) / 100;
                        setShapes((prev) => prev.map((s) => (s.id === selectedShapeId ? { ...s, opacity: val } : s)));
                        pushSnapshot({ shapes });
                      }}
                      className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Rotation (0° to 360°) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      <span>Rotation</span>
                      <span className="font-mono text-slate-900 dark:text-zinc-100">{shp.rotation || 0}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={shp.rotation || 0}
                        onChange={(e) => handleSetElementRotation(parseInt(e.target.value) || 0)}
                        className="flex-1 h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={shp.rotation || 0}
                        onChange={(e) => handleSetElementRotation(parseInt(e.target.value) || 0)}
                        className="w-12 px-1 py-0.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-mono font-bold text-center shadow-2xs"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[0, 90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => handleSetElementRotation(deg)}
                          className="py-1 rounded-md border border-slate-300 dark:border-zinc-700 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 shadow-2xs transition-colors"
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Delete Shape */}
                  <button
                    type="button"
                    onClick={() => {
                      setShapes((prev) => prev.filter((s) => s.id !== selectedShapeId));
                      setSelectedShapeId(null);
                      pushSnapshot({ shapes });
                    }}
                    className="w-full py-2 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Shape</span>
                  </button>
                </div>
              );
            })()}

            {/* CASE 2: TABLE PROPERTIES */}
            {selectedTableId && (() => {
              const tbl = tables.find((t) => t.id === selectedTableId);
              if (!tbl) return null;
              return (
                <div className="space-y-3 border-t border-slate-200 dark:border-zinc-800 pt-3">
                  <div className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                    ▾ Table Controls
                  </div>

                  {/* Add / Delete Rows and Columns */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const newCols = tbl.cols;
                        const newRow = Array(newCols).fill('');
                        const nextCells = [...(tbl.cells || []), newRow];
                        const nextHeights = [...(tbl.rowHeights || Array(tbl.rows).fill(26)), 26];
                        setTables((prev) =>
                          prev.map((t) =>
                            t.id === selectedTableId
                              ? { ...t, rows: t.rows + 1, cells: nextCells, rowHeights: nextHeights, height: t.height + 26 }
                              : t
                          )
                        );
                        pushSnapshot({ tables });
                      }}
                      className="py-1.5 px-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 text-xs font-bold shadow-2xs transition-colors"
                    >
                      + Add Row
                    </button>
                    <button
                      type="button"
                      disabled={tbl.rows <= 1}
                      onClick={() => {
                        if (tbl.rows <= 1) return;
                        const nextCells = (tbl.cells || []).slice(0, -1);
                        const nextHeights = (tbl.rowHeights || []).slice(0, -1);
                        setTables((prev) =>
                          prev.map((t) =>
                            t.id === selectedTableId
                              ? { ...t, rows: t.rows - 1, cells: nextCells, rowHeights: nextHeights, height: Math.max(26, t.height - 26) }
                              : t
                          )
                        );
                        pushSnapshot({ tables });
                      }}
                      className="py-1.5 px-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 text-xs font-bold shadow-2xs transition-colors disabled:opacity-30"
                    >
                      - Remove Row
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newColW = 80;
                        const nextCells = (tbl.cells || []).map((r: string[]) => [...r, '']);
                        const nextWidths = [...(tbl.colWidths || Array(tbl.cols).fill(newColW)), newColW];
                        setTables((prev) =>
                          prev.map((t) =>
                            t.id === selectedTableId
                              ? { ...t, cols: t.cols + 1, cells: nextCells, colWidths: nextWidths, width: t.width + newColW }
                              : t
                          )
                        );
                        pushSnapshot({ tables });
                      }}
                      className="py-1.5 px-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 text-xs font-bold shadow-2xs transition-colors"
                    >
                      + Add Column
                    </button>
                    <button
                      type="button"
                      disabled={tbl.cols <= 1}
                      onClick={() => {
                        if (tbl.cols <= 1) return;
                        const nextCells = (tbl.cells || []).map((r: string[]) => r.slice(0, -1));
                        const nextWidths = (tbl.colWidths || []).slice(0, -1);
                        const colW = (tbl.colWidths && tbl.colWidths[tbl.colWidths.length - 1]) || 80;
                        setTables((prev) =>
                          prev.map((t) =>
                            t.id === selectedTableId
                              ? { ...t, cols: t.cols - 1, cells: nextCells, colWidths: nextWidths, width: Math.max(80, t.width - colW) }
                              : t
                          )
                        );
                        pushSnapshot({ tables });
                      }}
                      className="py-1.5 px-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 text-xs font-bold shadow-2xs transition-colors disabled:opacity-30"
                    >
                      - Remove Col
                    </button>
                  </div>

                  {/* Table Border Lines: Thickness, Style & Color */}
                  <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-2">
                    <div className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                      Table Border Lines
                    </div>

                    {/* Line Thickness */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        <span>Line Thickness</span>
                        <span className="font-mono text-slate-900 dark:text-zinc-100">{tbl.borderWidth || 1}px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={1}
                          max={8}
                          value={tbl.borderWidth || 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setTables((prev) =>
                              prev.map((t) => (t.id === selectedTableId ? { ...t, borderWidth: val } : t))
                            );
                          }}
                          onMouseUp={() => pushSnapshot({ tables })}
                          onTouchEnd={() => pushSnapshot({ tables })}
                          className="flex-1 h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={tbl.borderWidth || 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setTables((prev) =>
                              prev.map((t) => (t.id === selectedTableId ? { ...t, borderWidth: val } : t))
                            );
                            pushSnapshot({ tables });
                          }}
                          className="w-12 px-1 py-0.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-mono font-bold text-center shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Line Style & Border Color */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Line Style</label>
                        <select
                          value={tbl.borderStyle || 'solid'}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setTables((prev) =>
                              prev.map((t) => (t.id === selectedTableId ? { ...t, borderStyle: val } : t))
                            );
                            pushSnapshot({ tables });
                          }}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-bold shadow-2xs"
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                          <option value="double">Double</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Border Color</label>
                        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg p-1 shadow-2xs">
                          <input
                            type="color"
                            value={tbl.borderColor || '#000000'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTables((prev) =>
                                prev.map((t) => (t.id === selectedTableId ? { ...t, borderColor: val } : t))
                              );
                            }}
                            onBlur={() => pushSnapshot({ tables })}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                          />
                          <input
                            type="text"
                            value={tbl.borderColor || '#000000'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTables((prev) =>
                                prev.map((t) => (t.id === selectedTableId ? { ...t, borderColor: val } : t))
                              );
                            }}
                            onBlur={() => pushSnapshot({ tables })}
                            className="w-16 px-1 text-[11px] font-mono font-bold border-0 bg-transparent text-slate-900 dark:text-zinc-100 outline-none"
                            placeholder="#000000"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setColorTarget('table-border');
                              setShowColorPickerModal(true);
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400"
                            title="Open Color Studio"
                          >
                            <Palette className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                        </div>
                        {/* Quick Swatches */}
                        <div className="flex items-center gap-1 pt-0.5">
                          {['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setTables((prev) =>
                                  prev.map((t) => (t.id === selectedTableId ? { ...t, borderColor: c } : t))
                                );
                                pushSnapshot({ tables });
                              }}
                              style={{ backgroundColor: c }}
                              className="w-3.5 h-3.5 rounded-full border border-slate-400 dark:border-zinc-600 transition-transform hover:scale-125"
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Table Cell Fill Color */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Cell Fill Color</label>
                        <button
                          type="button"
                          onClick={() => {
                            setTables((prev) =>
                              prev.map((t) => (t.id === selectedTableId ? { ...t, cellBgColor: undefined } : t))
                            );
                            pushSnapshot({ tables });
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-red-600 underline"
                        >
                          Clear Fill
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg p-1 shadow-2xs">
                        <input
                          type="color"
                          value={tbl.cellBgColor && tbl.cellBgColor !== 'transparent' ? tbl.cellBgColor : '#ffffff'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTables((prev) =>
                              prev.map((t) => (t.id === selectedTableId ? { ...t, cellBgColor: val } : t))
                            );
                          }}
                          onBlur={() => pushSnapshot({ tables })}
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={tbl.cellBgColor || ''}
                          placeholder="Transparent"
                          onChange={(e) => {
                            const val = e.target.value;
                            setTables((prev) =>
                              prev.map((t) => (t.id === selectedTableId ? { ...t, cellBgColor: val } : t))
                            );
                          }}
                          onBlur={() => pushSnapshot({ tables })}
                          className="w-20 px-1 text-[11px] font-mono font-bold border-0 bg-transparent text-slate-900 dark:text-zinc-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setColorTarget('table-fill');
                            setShowColorPickerModal(true);
                          }}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400"
                          title="Open Color Studio"
                        >
                          <Palette className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                      </div>
                      {/* Quick Swatches */}
                      <div className="flex items-center gap-1 pt-0.5">
                        {['#ffffff', '#f8fafc', '#f1f5f9', '#fee2e2', '#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setTables((prev) =>
                                prev.map((t) => (t.id === selectedTableId ? { ...t, cellBgColor: c } : t))
                              );
                              pushSnapshot({ tables });
                            }}
                            style={{ backgroundColor: c }}
                            className="w-3.5 h-3.5 rounded-full border border-slate-400 dark:border-zinc-600 transition-transform hover:scale-125"
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Header Row Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={tbl.headerRow ?? false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTables((prev) => prev.map((t) => (t.id === selectedTableId ? { ...t, headerRow: checked } : t)));
                        pushSnapshot({ tables });
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Header Row Style</span>
                  </label>

                  {/* Table Cell Contents & Properties */}
                  <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                        Cell Content
                      </div>
                      {selectedTableCell && selectedTableCell.tableId === tbl.id && (
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                          Row {selectedTableCell.row + 1} : Col {selectedTableCell.col + 1}
                        </span>
                      )}
                    </div>

                    {selectedTableCell && selectedTableCell.tableId === tbl.id ? (
                      (() => {
                        const cellKey = `${selectedTableCell.row}_${selectedTableCell.col}`;
                        const cellImg = tbl.cellImages?.[cellKey];
                        const cellShape = tbl.cellShapes?.[cellKey];
                        const cellSub = tbl.cellSubtables?.[cellKey];
                        const cellProps = tbl.cellImageProps?.[cellKey] || {};

                        return (
                          <div className="space-y-3">
                            {/* CASE 1: CELL HAS IMAGE */}
                            {cellImg && (
                              <div className="space-y-2.5 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <img src={cellImg} alt="Cell Preview" className="w-10 h-10 object-contain rounded border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900" />
                                    <div>
                                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">Cell Photo</span>
                                      <span className="text-[10px] text-slate-500">Filters & Frame</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCellImage(tbl.id, selectedTableCell.row, selectedTableCell.col)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                                    title="Remove Image from Cell"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Picture Adjustments */}
                                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-zinc-700/60">
                                  {/* Corner Rounding */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                      <span>Corner Rounding</span>
                                      <span className="font-mono text-slate-900 dark:text-zinc-100">{cellProps.borderRadius ?? imageBorderRadius}px</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={0}
                                      max={40}
                                      value={cellProps.borderRadius ?? imageBorderRadius}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setImageBorderRadius(val);
                                        updateActiveTableCellImageProps({ borderRadius: val });
                                      }}
                                      className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                  </div>

                                  {/* Brightness */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                      <span>Brightness</span>
                                      <span className="font-mono text-slate-900 dark:text-zinc-100">{cellProps.brightness ?? 100}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={50}
                                      max={150}
                                      value={cellProps.brightness ?? 100}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 100;
                                        setImageBrightness(val);
                                        updateActiveTableCellImageProps({ brightness: val });
                                      }}
                                      className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                  </div>

                                  {/* Contrast */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                      <span>Contrast</span>
                                      <span className="font-mono text-slate-900 dark:text-zinc-100">{cellProps.contrast ?? 100}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={50}
                                      max={150}
                                      value={cellProps.contrast ?? 100}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 100;
                                        setImageContrast(val);
                                        updateActiveTableCellImageProps({ contrast: val });
                                      }}
                                      className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                  </div>

                                  {/* Saturation */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                      <span>Saturation</span>
                                      <span className="font-mono text-slate-900 dark:text-zinc-100">{cellProps.saturation ?? 100}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={0}
                                      max={200}
                                      value={cellProps.saturation ?? 100}
                                      onChange={(e) => updateActiveTableCellImageProps({ saturation: parseInt(e.target.value) || 100 })}
                                      className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                  </div>

                                  {/* Hue Rotate */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                      <span>Hue Rotate</span>
                                      <span className="font-mono text-slate-900 dark:text-zinc-100">{cellProps.hue ?? 0}°</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={-180}
                                      max={180}
                                      value={cellProps.hue ?? 0}
                                      onChange={(e) => updateActiveTableCellImageProps({ hue: parseInt(e.target.value) || 0 })}
                                      className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                  </div>

                                  {/* Warmth */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                      <span>Temperature (Warmth)</span>
                                      <span className="font-mono text-slate-900 dark:text-zinc-100">{cellProps.temperature ?? 0}</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={-100}
                                      max={100}
                                      value={cellProps.temperature ?? 0}
                                      onChange={(e) => updateActiveTableCellImageProps({ temperature: parseInt(e.target.value) || 0 })}
                                      className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                  </div>

                                  {/* Filters & Flips */}
                                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => updateActiveTableCellImageProps({ grayscale: !cellProps.grayscale })}
                                      className={`py-1 px-2 rounded-lg border text-xs font-bold transition-all ${
                                        cellProps.grayscale
                                          ? 'bg-indigo-600 border-indigo-600 text-white'
                                          : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:bg-slate-100'
                                      }`}
                                    >
                                      Grayscale
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateActiveTableCellImageProps({ invert: !cellProps.invert })}
                                      className={`py-1 px-2 rounded-lg border text-xs font-bold transition-all ${
                                        cellProps.invert
                                          ? 'bg-indigo-600 border-indigo-600 text-white'
                                          : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:bg-slate-100'
                                      }`}
                                    >
                                      Invert
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateActiveTableCellImageProps({ flipH: !cellProps.flipH })}
                                      className={`py-1 px-2 rounded-lg border text-xs font-bold transition-all ${
                                        cellProps.flipH
                                          ? 'bg-indigo-600 border-indigo-600 text-white'
                                          : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:bg-slate-100'
                                      }`}
                                    >
                                      Flip H
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateActiveTableCellImageProps({ flipV: !cellProps.flipV })}
                                      className={`py-1 px-2 rounded-lg border text-xs font-bold transition-all ${
                                        cellProps.flipV
                                          ? 'bg-indigo-600 border-indigo-600 text-white'
                                          : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:bg-slate-100'
                                      }`}
                                    >
                                      Flip V
                                    </button>
                                  </div>

                                  {/* Framing Border */}
                                  <div className="space-y-1.5 pt-1.5 border-t border-slate-200 dark:border-zinc-700">
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block">Framing Border</span>
                                    <div className="grid grid-cols-3 gap-1.5 items-center">
                                      <div className="space-y-0.5">
                                        <label className="text-[10px] text-slate-500">Width</label>
                                        <input
                                          type="number"
                                          min={0}
                                          max={12}
                                          value={cellProps.borderWidth || 0}
                                          onChange={(e) => updateActiveTableCellImageProps({ borderWidth: parseInt(e.target.value) || 0 })}
                                          className="w-full px-1.5 py-1 text-xs rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-center"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-[10px] text-slate-500">Color</label>
                                        <input
                                          type="color"
                                          value={cellProps.borderColor || '#3b82f6'}
                                          onChange={(e) => updateActiveTableCellImageProps({ borderColor: e.target.value })}
                                          className="w-full h-7 rounded border border-slate-300 dark:border-zinc-700 cursor-pointer p-0.5"
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <label className="text-[10px] text-slate-500">Style</label>
                                        <select
                                          value={cellProps.borderStyle || 'solid'}
                                          onChange={(e) => updateActiveTableCellImageProps({ borderStyle: e.target.value })}
                                          className="w-full px-1 py-1 text-xs rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100"
                                        >
                                          <option value="solid">Solid</option>
                                          <option value="dashed">Dashed</option>
                                          <option value="dotted">Dotted</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* CASE 2: CELL HAS SHAPE */}
                            {cellShape && (
                              <div className="space-y-2 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 capitalize">
                                    Shape: {cellShape.type}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCellShape(tbl.id, selectedTableCell.row, selectedTableCell.col)}
                                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                                    title="Remove Shape from Cell"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400">Fill</label>
                                    <input
                                      type="color"
                                      value={cellShape.fillColor || '#dbeafe'}
                                      onChange={(e) => updateActiveTableCellShapeProps({ fillColor: e.target.value })}
                                      className="w-full h-7 rounded border border-slate-300 dark:border-zinc-700 cursor-pointer p-0.5"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400">Stroke</label>
                                    <input
                                      type="color"
                                      value={cellShape.strokeColor || '#2563eb'}
                                      onChange={(e) => updateActiveTableCellShapeProps({ strokeColor: e.target.value })}
                                      className="w-full h-7 rounded border border-slate-300 dark:border-zinc-700 cursor-pointer p-0.5"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1 pt-1">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                                    <span>Stroke Width</span>
                                    <span>{cellShape.strokeWidth || 2}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={1}
                                    max={10}
                                    value={cellShape.strokeWidth || 2}
                                    onChange={(e) => updateActiveTableCellShapeProps({ strokeWidth: parseInt(e.target.value) || 2 })}
                                    className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                  />
                                </div>
                              </div>
                            )}

                            {/* CASE 3: CELL HAS SUBTABLE */}
                            {cellSub && (
                              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                                <div>
                                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">Subtable Inside Cell</span>
                                  <span className="text-[10px] text-slate-500 font-mono">{cellSub.rows} rows × {cellSub.cols} cols</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCellSubtable(tbl.id, selectedTableCell.row, selectedTableCell.col)}
                                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                                  title="Remove Subtable from Cell"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {/* CASE 4: CELL EMPTY - INSERT CONTROLS */}
                            {!cellImg && !cellShape && !cellSub && (
                              <div className="space-y-1.5">
                                <button
                                  type="button"
                                  onClick={() => cellImageInputRef.current?.click()}
                                  className="w-full py-1.5 px-2 rounded-lg border border-indigo-300 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 text-xs shadow-2xs"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Insert Photo in Cell</span>
                                </button>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAddShape('rectangle')}
                                    className="py-1 px-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors text-xs text-center"
                                  >
                                    + Add Shape
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddTable(2, 2)}
                                    className="py-1 px-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors text-xs text-center"
                                  >
                                    + Subtable
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Click any cell in the table to insert a photo, shape, or subtable inside it.
                      </p>
                    )}
                  </div>

                  {/* Rotation (0° to 360°) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      <span>Rotation</span>
                      <span className="font-mono text-slate-900 dark:text-zinc-100">{tbl.rotation || 0}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={tbl.rotation || 0}
                        onChange={(e) => handleSetElementRotation(parseInt(e.target.value) || 0)}
                        className="flex-1 h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={tbl.rotation || 0}
                        onChange={(e) => handleSetElementRotation(parseInt(e.target.value) || 0)}
                        className="w-12 px-1 py-0.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-mono font-bold text-center shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Delete Table */}
                  <button
                    type="button"
                    onClick={() => {
                      setTables((prev) => prev.filter((t) => t.id !== selectedTableId));
                      setSelectedTableId(null);
                      pushSnapshot({ tables });
                    }}
                    className="w-full py-2 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Table</span>
                  </button>
                </div>
              );
            })()}

            {/* CASE 3: IMAGE OVERLAY PROPERTIES */}
            {selectedOverlayId && !selectedTableId && imageOverlays.some((i) => i.id === selectedOverlayId) && (() => {
              const img = imageOverlays.find((i) => i.id === selectedOverlayId);
              if (!img) return null;
              return (
                <div className="space-y-3 border-t border-slate-200 dark:border-zinc-800 pt-3">
                  <div className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                    ▾ Image Appearance
                  </div>

                  {/* Dimensions */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Width (pt)</label>
                      <div className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 font-mono font-bold text-slate-900 dark:text-zinc-100 shadow-2xs">
                        {Math.round(img.width)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Height (pt)</label>
                      <div className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 font-mono font-bold text-slate-900 dark:text-zinc-100 shadow-2xs">
                        {Math.round(img.height)}
                      </div>
                    </div>
                  </div>

                  {/* Crop Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCropImageId(img.id);
                      setCropBox({ xPct: 0.05, yPct: 0.05, wPct: 0.9, hPct: 0.9 });
                    }}
                    className="w-full py-2 rounded-lg border border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Crop className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Crop Image</span>
                  </button>

                  {/* Corner Rounding on Image */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      <span>Corner Rounding (Image)</span>
                      <span className="font-mono text-slate-900 dark:text-zinc-100">{img.borderRadius || 0}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={60}
                        value={img.borderRadius || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, borderRadius: val } : i))
                          );
                        }}
                        onMouseUp={() => pushSnapshot({ imageOverlays })}
                        onTouchEnd={() => pushSnapshot({ imageOverlays })}
                        className="flex-1 h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={img.borderRadius || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, borderRadius: val } : i))
                          );
                          pushSnapshot({ imageOverlays });
                        }}
                        className="w-12 px-1 py-0.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-mono font-bold text-center shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Picture Adjustments Section */}
                  <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-2">
                    <div className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                      Picture Adjustments
                    </div>

                    {/* Brightness */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        <span>Brightness</span>
                        <span className="font-mono text-slate-900 dark:text-zinc-100">{img.brightness ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={150}
                        value={img.brightness ?? 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 100;
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, brightness: val } : i))
                          );
                        }}
                        onMouseUp={() => pushSnapshot({ imageOverlays })}
                        onTouchEnd={() => pushSnapshot({ imageOverlays })}
                        className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        <span>Contrast</span>
                        <span className="font-mono text-slate-900 dark:text-zinc-100">{img.contrast ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={150}
                        value={img.contrast ?? 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 100;
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, contrast: val } : i))
                          );
                        }}
                        onMouseUp={() => pushSnapshot({ imageOverlays })}
                        onTouchEnd={() => pushSnapshot({ imageOverlays })}
                        className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        <span>Saturation</span>
                        <span className="font-mono text-slate-900 dark:text-zinc-100">{img.saturation ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={img.saturation ?? 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 100;
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, saturation: val } : i))
                          );
                        }}
                        onMouseUp={() => pushSnapshot({ imageOverlays })}
                        onTouchEnd={() => pushSnapshot({ imageOverlays })}
                        className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Hue Rotate */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        <span>Hue Rotate</span>
                        <span className="font-mono text-slate-900 dark:text-zinc-100">{img.hue || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={img.hue || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, hue: val } : i))
                          );
                        }}
                        onMouseUp={() => pushSnapshot({ imageOverlays })}
                        onTouchEnd={() => pushSnapshot({ imageOverlays })}
                        className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Temperature / Warmth */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        <span>Temperature (Warmth)</span>
                        <span className="font-mono text-slate-900 dark:text-zinc-100">{img.temperature || 0}</span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={img.temperature || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, temperature: val } : i))
                          );
                        }}
                        onMouseUp={() => pushSnapshot({ imageOverlays })}
                        onTouchEnd={() => pushSnapshot({ imageOverlays })}
                        className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>

                    {/* Grayscale, Invert, Flip Controls */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, grayscale: !i.grayscale } : i))
                          );
                          pushSnapshot({ imageOverlays });
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                          img.grayscale
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        Grayscale
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, invert: !i.invert } : i))
                          );
                          pushSnapshot({ imageOverlays });
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                          img.invert
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        Invert Colors
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, flipH: !i.flipH } : i))
                          );
                          pushSnapshot({ imageOverlays });
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          img.flipH
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>Flip H</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === selectedOverlayId ? { ...i, flipV: !i.flipV } : i))
                          );
                          pushSnapshot({ imageOverlays });
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          img.flipV
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <FlipVertical className="w-3.5 h-3.5" />
                        <span>Flip V</span>
                      </button>
                    </div>
                  </div>

                  {/* Border & Framing (Optional) */}
                  <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-2">
                    <div className="text-xs font-black text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                      Border & Framing (Optional)
                    </div>

                    {/* Border Thickness */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        <span>Border Thickness</span>
                        <span className="font-mono text-slate-900 dark:text-zinc-100">{img.borderWidth || 0}px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={20}
                          value={img.borderWidth || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setImageOverlays((prev) =>
                              prev.map((i) =>
                                i.id === selectedOverlayId
                                  ? { ...i, borderWidth: val, borderColor: i.borderColor || '#000000' }
                                  : i
                              )
                            );
                          }}
                          onMouseUp={() => pushSnapshot({ imageOverlays })}
                          onTouchEnd={() => pushSnapshot({ imageOverlays })}
                          className="flex-1 h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={img.borderWidth || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setImageOverlays((prev) =>
                              prev.map((i) =>
                                i.id === selectedOverlayId
                                  ? { ...i, borderWidth: val, borderColor: i.borderColor || '#000000' }
                                  : i
                              )
                            );
                            pushSnapshot({ imageOverlays });
                          }}
                          className="w-12 px-1 py-0.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-mono font-bold text-center shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Border Style & Color */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Line Style</label>
                        <select
                          value={img.borderStyle || 'solid'}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setImageOverlays((prev) =>
                              prev.map((i) => (i.id === selectedOverlayId ? { ...i, borderStyle: val } : i))
                            );
                            pushSnapshot({ imageOverlays });
                          }}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-bold shadow-2xs"
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                          <option value="double">Double</option>
                          <option value="groove">Groove</option>
                          <option value="ridge">Ridge</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">Border Color</label>
                        <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg p-1 shadow-2xs">
                          <input
                            type="color"
                            value={img.borderColor || '#000000'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setImageOverlays((prev) =>
                                prev.map((i) => (i.id === selectedOverlayId ? { ...i, borderColor: val } : i))
                              );
                            }}
                            onBlur={() => pushSnapshot({ imageOverlays })}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                          />
                          <input
                            type="text"
                            value={img.borderColor || '#000000'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setImageOverlays((prev) =>
                                prev.map((i) => (i.id === selectedOverlayId ? { ...i, borderColor: val } : i))
                              );
                            }}
                            onBlur={() => pushSnapshot({ imageOverlays })}
                            className="w-14 px-0.5 text-[11px] font-mono font-bold border-0 bg-transparent text-slate-900 dark:text-zinc-100 outline-none"
                            placeholder="#000000"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setColorTarget('image-border');
                              setShowColorPickerModal(true);
                            }}
                            className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400"
                            title="Open Color Studio"
                          >
                            <Palette className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Swatches for Border */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setImageOverlays((prev) =>
                              prev.map((i) => (i.id === selectedOverlayId ? { ...i, borderColor: c } : i))
                            );
                            pushSnapshot({ imageOverlays });
                          }}
                          style={{ backgroundColor: c }}
                          className="w-3.5 h-3.5 rounded-full border border-slate-400 dark:border-zinc-600 transition-transform hover:scale-125"
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Rotation (0° to 360°) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      <span>Rotation</span>
                      <span className="font-mono text-slate-900 dark:text-zinc-100">{img.rotation || 0}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={img.rotation || 0}
                        onChange={(e) => handleSetElementRotation(parseInt(e.target.value) || 0)}
                        className="flex-1 h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={img.rotation || 0}
                        onChange={(e) => handleSetElementRotation(parseInt(e.target.value) || 0)}
                        className="w-12 px-1 py-0.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-mono font-bold text-center shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Delete Image */}
                  <button
                    type="button"
                    onClick={() => {
                      setImageOverlays((prev) => prev.filter((i) => i.id !== selectedOverlayId));
                      setSelectedOverlayId(null);
                      pushSnapshot({ imageOverlays });
                    }}
                    className="w-full py-2 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Image</span>
                  </button>
                </div>
              );
            })()}

            {/* CASE 4: TEXT PROPERTIES (Shown when text is active, or overlay text is selected) */}
            {(activeEditingId || selectedTextItemId || (selectedOverlayId && textOverlays.some((t) => t.id === selectedOverlayId))) && (
              <>
                {/* SECTION 1: FONTS */}
                <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-3">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
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
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-bold text-xs shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {MS_WORD_FONTS.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>

                  {/* Font Size & Color Row */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 flex items-center bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg shadow-xs overflow-hidden">
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
                        className="w-full text-center text-xs font-mono font-bold bg-transparent text-slate-900 dark:text-zinc-100 py-1 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-600 dark:text-zinc-400 pr-1.5 font-bold">pt</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newSize = Math.min(120, fontSize + 1);
                        setFontSize(newSize);
                        updateActiveTextItemProps({ fontSize: newSize });
                      }}
                      className="px-2 py-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 font-bold transition-colors"
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
                      className="px-2 py-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-900 dark:text-zinc-100 font-bold transition-colors"
                      title="Decrease Font Size (A_)"
                    >
                      A<span className="text-[9px] align-sub">▼</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowColorPickerModal(true)}
                      className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-colors shadow-2xs"
                      title="Open Color Wheel & Palette"
                    >
                      <span
                        className="w-5 h-5 rounded-md border border-slate-300 dark:border-zinc-600 shadow-xs block"
                        style={{ backgroundColor: textColor }}
                      />
                      <ChevronDown className="w-3 h-3 text-slate-600 dark:text-zinc-400" />
                    </button>
                  </div>

                  {/* Styles Row: B, I, U, S, A^, A_ */}
                  <div className="flex items-center bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg p-0.5 gap-0.5 justify-between shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isBold;
                        setIsBold(next);
                        updateActiveTextItemProps({ isBold: next });
                      }}
                      className={`flex-1 py-1 text-center font-bold rounded-md transition-all ${
                        isBold ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                        isItalic ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                        isUnderline ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                        isStrikethrough ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                      className={`flex-1 py-1 text-center text-[10px] font-bold rounded-md transition-all ${
                        isSuperscript ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                        if (next) setIsSubscript(false);
                        updateActiveTextItemProps({ isSubscript: next, isSuperscript: false });
                      }}
                      className={`flex-1 py-1 text-center text-[10px] font-bold rounded-md transition-all ${
                        isSubscript ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
                      }`}
                      title="Subscript (A_)"
                    >
                      A₂
                    </button>
                  </div>

                  {/* Alignment Row */}
                  <div className="flex items-center bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg p-0.5 gap-0.5 justify-between shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAlignment('left');
                        updateActiveTextItemProps({ alignment: 'left' });
                      }}
                      className={`flex-1 p-1 flex items-center justify-center rounded-md transition-all ${
                        alignment === 'left' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                        alignment === 'center' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                        alignment === 'right' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                        (alignment as any) === 'justify' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700'
                      }`}
                      title="Justify"
                    >
                      <AlignJustify className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* SECTION 2: SPACING */}
                <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-3">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                    ▾ Spacing
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-700 dark:text-zinc-300 font-bold">↕ Line Spacing</label>
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
                        className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-bold shadow-2xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-700 dark:text-zinc-300 font-bold">↔ Kerning (AV)</label>
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
                        className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-bold shadow-2xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-700 dark:text-zinc-300 font-bold">¶ Paragraph Spacing (pt)</label>
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
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-bold shadow-2xs"
                    />
                  </div>
                </div>

                {/* SECTION 3: ROTATION */}
                <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-3">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                    ▾ Text Rotation (0° to 360°)
                  </div>
                  {(() => {
                    const activeItem = activeEditingId || selectedTextItemId;
                    const rot = activeItem
                      ? modifiedTexts[activeItem]?.rotation || detectedTextItems.find((t) => t.id === activeItem)?.rotation || 0
                      : textOverlays.find((t) => t.id === selectedOverlayId)?.rotation || 0;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={360}
                            value={rot}
                            onChange={(e) => handleSetElementRotation(parseInt(e.target.value) || 0)}
                            className="flex-1 h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <input
                            type="number"
                            min={0}
                            max={360}
                            value={rot}
                            onChange={(e) => handleSetElementRotation(parseInt(e.target.value) || 0)}
                            className="w-14 px-1 py-0.5 text-xs rounded border border-slate-300 dark:border-zinc-700 font-mono text-center text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 font-bold shadow-2xs"
                          />
                          <span className="text-slate-700 dark:text-zinc-300 font-bold">°</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[0, 90, 180, 270].map((deg) => (
                            <button
                              key={deg}
                              type="button"
                              onClick={() => handleSetElementRotation(deg)}
                              className="py-1 rounded border border-slate-300 dark:border-zinc-700 text-xs font-mono font-bold text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 shadow-2xs transition-colors"
                            >
                              {deg}°
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* CASE: PAGE BORDER PROPERTIES (Shown when a border is selected) */}
            {selectedBorderPage !== null && (() => {
              const border = pageBorders[selectedBorderPage];
              if (!border) return null;
              return (
                <div className="space-y-3.5 border-t border-slate-200 dark:border-zinc-800 pt-3">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center justify-between">
                    <span>Page {selectedBorderPage + 1} Border</span>
                    <button
                      type="button"
                      onClick={() => {
                        let nextBorders: Record<number, PageBorderConfig> = {};
                        setPageBorders((prev) => {
                          const next = { ...prev };
                          delete next[selectedBorderPage];
                          nextBorders = next;
                          return next;
                        });
                        pushSnapshot({ pageBorders: nextBorders });
                        setSelectedBorderPage(null);
                      }}
                      className="text-[10px] text-red-600 hover:text-red-700 dark:text-red-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>

                  {/* Border Style */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-700 dark:text-zinc-300 font-bold">Style</label>
                    <select
                      value={border.type}
                      onChange={(e) => updatePageBorderConfig({ type: e.target.value as PageBorderType }, 'current')}
                      className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                    >
                      <option value="solid">Solid Line</option>
                      <option value="dashed">Dashed Line</option>
                      <option value="dotted">Dotted Line</option>
                      <option value="double">Double Line</option>
                      <option value="groove">Groove 3D</option>
                      <option value="ridge">Ridge 3D</option>
                      <option value="inset">Inset 3D</option>
                      <option value="outset">Outset 3D</option>
                      <option value="corners">Only Corners (L-Brackets)</option>
                      <option value="frame">Decorative Frame</option>
                    </select>
                  </div>

                  {/* Border Thickness & Color */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-700 dark:text-zinc-300 font-bold">Weight (pt)</label>
                      <input
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        value={border.width}
                        onChange={(e) => updatePageBorderConfig({ width: Math.max(0.5, parseFloat(e.target.value) || 1) }, 'current')}
                        className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-700 dark:text-zinc-300 font-bold">Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={border.color}
                          onChange={(e) => updatePageBorderConfig({ color: e.target.value }, 'current')}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                        />
                        <span className="text-xs font-mono font-semibold uppercase">{border.color}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inset / Margins */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-700 dark:text-zinc-300 font-bold">Margins / Insets (pt)</label>
                    <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-sans">Top</span>
                        <input
                          type="number"
                          value={border.top}
                          onChange={(e) => updatePageBorderConfig({ top: parseInt(e.target.value, 10) || 0 }, 'current')}
                          className="w-full px-1.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-sans">Bottom</span>
                        <input
                          type="number"
                          value={border.bottom}
                          onChange={(e) => updatePageBorderConfig({ bottom: parseInt(e.target.value, 10) || 0 }, 'current')}
                          className="w-full px-1.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-sans">Left</span>
                        <input
                          type="number"
                          value={border.left}
                          onChange={(e) => updatePageBorderConfig({ left: parseInt(e.target.value, 10) || 0 }, 'current')}
                          className="w-full px-1.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block font-sans">Right</span>
                        <input
                          type="number"
                          value={border.right}
                          onChange={(e) => updatePageBorderConfig({ right: parseInt(e.target.value, 10) || 0 }, 'current')}
                          className="w-full px-1.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      let nextBorders: Record<number, PageBorderConfig> = {};
                      setPageBorders((prev) => {
                        const next = { ...prev };
                        delete next[selectedBorderPage];
                        nextBorders = next;
                        return next;
                      });
                      pushSnapshot({ pageBorders: nextBorders });
                      setSelectedBorderPage(null);
                    }}
                    className="w-full py-2 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Border (or press Delete)</span>
                  </button>
                </div>
              );
            })()}

            {/* CASE 5: DOCUMENT PAGE PROPERTIES (Shown when nothing is selected) */}
            {!selectedShapeId && !selectedTableId && !selectedOverlayId && !activeEditingId && !selectedTextItemId && selectedBorderPage === null && (
              <div className="space-y-3 border-t border-slate-200 dark:border-zinc-800 pt-3">
                <div className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                  ▾ Page Details
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-700 dark:text-zinc-300 font-bold">Page Size</label>
                    <div className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono font-bold text-slate-900 dark:text-zinc-100 shadow-2xs">
                      {Math.round(basePageDims.width)} × {Math.round(basePageDims.height)} pt
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-700 dark:text-zinc-300 font-bold">Rotation</label>
                    <div className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-mono font-bold text-slate-900 dark:text-zinc-100 shadow-2xs">
                      {pageRotations[currentPage - 1] || 0}°
                    </div>
                  </div>
                </div>

                {/* Page Orientation & Rotation (0°, 90°, 180°, 270°) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-700 dark:text-zinc-300 font-bold">
                    <span>Page Rotation</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">{pageRotations[currentPage - 1] || 0}°</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { deg: 0, label: '0°' },
                      { deg: 90, label: '90°' },
                      { deg: 180, label: '180°' },
                      { deg: 270, label: '270°' },
                    ].map((item) => (
                      <button
                        key={item.deg}
                        type="button"
                        onClick={() => handleSetPageRotation(item.deg)}
                        className={`py-1 text-[11px] font-bold rounded border transition-colors shadow-2xs ${
                          (pageRotations[currentPage - 1] || 0) === item.deg
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRotatePageBy(90)}
                      className="py-1 rounded border border-slate-300 dark:border-zinc-700 text-[11px] font-bold text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center gap-1 shadow-2xs transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>+90° CW</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotatePageBy(-90)}
                      className="py-1 rounded border border-slate-300 dark:border-zinc-700 text-[11px] font-bold text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center gap-1 shadow-2xs transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>-90° CCW</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDeleteCurrentPage}
                  className="w-full py-2 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Current Page</span>
                </button>
              </div>
            )}
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
        className="flex items-center justify-center sm:justify-between px-3 sm:px-6 py-1.5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 z-30 text-xs text-zinc-600 dark:text-zinc-400 flex-shrink-0 shadow-xs"
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

      {/* Unified Right-Click Context Menu (Scrollable & Clamped for Small / Minimized Windows) */}
      {(elementContextMenu || tableContextMenu) && (() => {
        const menu = elementContextMenu || (tableContextMenu ? {
          x: tableContextMenu.x,
          y: tableContextMenu.y,
          type: 'table' as const,
          id: tableContextMenu.tableId,
          tableRow: tableContextMenu.row,
          tableCol: tableContextMenu.col,
        } : null);
        if (!menu) return null;

        const closeMenu = () => {
          setElementContextMenu(null);
          setTableContextMenu(null);
        };

        return (
          <div
            className="fixed inset-0 z-[2147483646]"
            onClick={closeMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeMenu();
            }}
          >
            <div
              className="fixed z-[2147483647] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1 text-xs w-60 font-medium text-zinc-800 dark:text-zinc-200 select-none animate-in fade-in max-h-[min(380px,80vh)] overflow-y-auto overscroll-contain"
              style={{
                left: Math.min(window.innerWidth - 245, Math.max(10, menu.x)),
                top: Math.min(window.innerHeight - 380, Math.max(10, menu.y)),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {menu.type === 'table' && (() => {
                const tbl = tables.find((t) => t.id === menu.id);
                if (!tbl) return null;
                const row = menu.tableRow ?? 0;
                const col = menu.tableCol ?? 0;
                const cellKey = `${row}_${col}`;
                const hasCellContent = Boolean(
                  tbl.cellImages?.[cellKey] || tbl.cellShapes?.[cellKey] || tbl.cellSubtables?.[cellKey]
                );
                return (
                  <>
                    <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                      Table Options ({tbl.rows}×{tbl.cols})
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTables((prev) =>
                          prev.map((t) => {
                            if (t.id !== tbl.id) return t;
                            const newRow = Array(t.cols).fill('');
                            const nextCells = [...t.cells];
                            nextCells.splice(row, 0, newRow);
                            const nextHeights = [...(t.rowHeights || Array(t.rows).fill(26))];
                            nextHeights.splice(row, 0, 26);
                            return { ...t, rows: t.rows + 1, cells: nextCells, rowHeights: nextHeights, height: t.height + 26 };
                          })
                        );
                        pushSnapshot({ tables });
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Insert Row Above</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTables((prev) =>
                          prev.map((t) => {
                            if (t.id !== tbl.id) return t;
                            const newRow = Array(t.cols).fill('');
                            const nextCells = [...t.cells];
                            nextCells.splice(row + 1, 0, newRow);
                            const nextHeights = [...(t.rowHeights || Array(t.rows).fill(26))];
                            nextHeights.splice(row + 1, 0, 26);
                            return { ...t, rows: t.rows + 1, cells: nextCells, rowHeights: nextHeights, height: t.height + 26 };
                          })
                        );
                        pushSnapshot({ tables });
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Insert Row Below</span>
                    </button>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setTables((prev) =>
                          prev.map((t) => {
                            if (t.id !== tbl.id) return t;
                            const nextCells = t.cells.map((r) => {
                              const nr = [...r];
                              nr.splice(col, 0, '');
                              return nr;
                            });
                            const nextWidths = [...(t.colWidths || Array(t.cols).fill(80))];
                            nextWidths.splice(col, 0, 80);
                            return { ...t, cols: t.cols + 1, cells: nextCells, colWidths: nextWidths, width: t.width + 80 };
                          })
                        );
                        pushSnapshot({ tables });
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-500" />
                      <span>Insert Column Left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTables((prev) =>
                          prev.map((t) => {
                            if (t.id !== tbl.id) return t;
                            const nextCells = t.cells.map((r) => {
                              const nr = [...r];
                              nr.splice(col + 1, 0, '');
                              return nr;
                            });
                            const nextWidths = [...(t.colWidths || Array(t.cols).fill(80))];
                            nextWidths.splice(col + 1, 0, 80);
                            return { ...t, cols: t.cols + 1, cells: nextCells, colWidths: nextWidths, width: t.width + 80 };
                          })
                        );
                        pushSnapshot({ tables });
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-500" />
                      <span>Insert Column Right</span>
                    </button>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        if (tbl.rows <= 1) return;
                        setTables((prev) =>
                          prev.map((t) => {
                            if (t.id !== tbl.id) return t;
                            const nextCells = t.cells.filter((_, ri) => ri !== row);
                            const nextHeights = (t.rowHeights || []).filter((_, ri) => ri !== row);
                            return { ...t, rows: t.rows - 1, cells: nextCells, rowHeights: nextHeights, height: Math.max(26, t.height - 26) };
                          })
                        );
                        pushSnapshot({ tables });
                        closeMenu();
                      }}
                      disabled={tbl.rows <= 1}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-rose-600 dark:text-rose-400 disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Row</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (tbl.cols <= 1) return;
                        setTables((prev) =>
                          prev.map((t) => {
                            if (t.id !== tbl.id) return t;
                            const nextCells = t.cells.map((r) => r.filter((_, ci) => ci !== col));
                            const colW = (t.colWidths && t.colWidths[col]) || 80;
                            const nextWidths = (t.colWidths || []).filter((_, ci) => ci !== col);
                            return { ...t, cols: t.cols - 1, cells: nextCells, colWidths: nextWidths, width: Math.max(80, t.width - colW) };
                          })
                        );
                        pushSnapshot({ tables });
                        closeMenu();
                      }}
                      disabled={tbl.cols <= 1}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-rose-600 dark:text-rose-400 disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Column</span>
                    </button>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTableCell({ tableId: tbl.id, row, col });
                        setSelectedTableId(tbl.id);
                        setActiveTableImgCell(`${tbl.id}_${row}_${col}`);
                        closeMenu();
                        cellImageInputRef.current?.click();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Insert Photo in Cell</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTableCell({ tableId: tbl.id, row, col });
                        setSelectedTableId(tbl.id);
                        setShowShapesDropdown(true);
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold"
                    >
                      <Shapes className="w-3.5 h-3.5" />
                      <span>Insert Shape in Cell</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTableCell({ tableId: tbl.id, row, col });
                        setSelectedTableId(tbl.id);
                        handleAddTable(2, 2);
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Insert Subtable in Cell</span>
                    </button>
                    {hasCellContent && (
                      <button
                        type="button"
                        onClick={() => {
                          setTables((prev) =>
                            prev.map((t) => {
                              if (t.id !== tbl.id) return t;
                              const nextImgs = { ...(t.cellImages || {}) };
                              delete nextImgs[cellKey];
                              const nextShapes = { ...(t.cellShapes || {}) };
                              delete nextShapes[cellKey];
                              const nextSubs = { ...(t.cellSubtables || {}) };
                              delete nextSubs[cellKey];
                              const nextProps = { ...(t.cellImageProps || {}) };
                              delete nextProps[cellKey];
                              return {
                                ...t,
                                cellImages: nextImgs,
                                cellShapes: nextShapes,
                                cellSubtables: nextSubs,
                                cellImageProps: nextProps,
                              };
                            })
                          );
                          pushSnapshot({ tables });
                          setActiveTableImgCell(null);
                          closeMenu();
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-red-600 flex items-center gap-2 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Cell Content</span>
                      </button>
                    )}
                    {/* Quick Header Color Swatches */}
                    <div className="px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] font-semibold text-zinc-500 mb-1">Header Background</div>
                      <div className="flex items-center gap-1.5">
                        {['#f1f5f9', '#dbeafe', '#e0e7ff', '#d1fae5', '#fef3c7', '#fee2e2'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setTables((prev) =>
                                prev.map((t) => (t.id === tbl.id ? { ...t, headerBgColor: c } : t))
                              );
                              pushSnapshot({ tables });
                            }}
                            className="w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-600 hover:scale-110 transition-transform shadow-2xs"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowPropertiesPanel(true);
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-800 dark:text-zinc-200"
                    >
                      <Settings className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Table Properties</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTables((prev) => prev.filter((t) => t.id !== tbl.id));
                        setSelectedTableId(null);
                        setSelectedTableCell(null);
                        pushSnapshot({ tables });
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-red-600 flex items-center gap-2 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Entire Table</span>
                    </button>
                  </>
                );
              })()}

              {menu.type === 'shape' && (() => {
                const shp = shapes.find((s) => s.id === menu.id);
                if (!shp) return null;
                return (
                  <>
                    <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                      Shape Options ({shp.type})
                    </div>
                    {/* Quick Fill Swatches */}
                    <div className="px-3 py-1.5">
                      <div className="text-[10px] font-semibold text-zinc-500 mb-1">Fill Color</div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { label: 'None', color: 'transparent' },
                          { label: 'White', color: '#ffffff' },
                          { label: 'Indigo', color: '#4f46e5' },
                          { label: 'Blue', color: '#3b82f6' },
                          { label: 'Green', color: '#10b981' },
                          { label: 'Amber', color: '#f59e0b' },
                          { label: 'Red', color: '#ef4444' },
                        ].map((sw) => (
                          <button
                            key={sw.color}
                            type="button"
                            onClick={() => {
                              setShapes((prev) =>
                                prev.map((s) => (s.id === shp.id ? { ...s, fillColor: sw.color } : s))
                              );
                              pushSnapshot({ shapes });
                            }}
                            className="w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-600 hover:scale-110 transition-transform shadow-2xs relative flex items-center justify-center text-[9px]"
                            style={{ backgroundColor: sw.color === 'transparent' ? '#ffffff' : sw.color }}
                            title={sw.label}
                          >
                            {sw.color === 'transparent' && <span className="text-red-500 font-bold text-[10px]">✕</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Quick Stroke Width */}
                    <div className="px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="text-[10px] font-semibold text-zinc-500 mb-1">Stroke Width</div>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 5].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => {
                              setShapes((prev) =>
                                prev.map((s) => (s.id === shp.id ? { ...s, strokeWidth: w } : s))
                              );
                              pushSnapshot({ shapes });
                            }}
                            className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                              shp.strokeWidth === w
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {w}px
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                    {/* Duplicate Shape */}
                    <button
                      type="button"
                      onClick={() => {
                        const dup: ShapeOverlay = {
                          ...shp,
                          id: `shape_${Date.now()}`,
                          x: shp.x + 20,
                          y: shp.y - 20,
                        };
                        setShapes((prev) => {
                          const next = [...prev, dup];
                          pushSnapshot({ shapes: next });
                          return next;
                        });
                        setSelectedShapeId(dup.id);
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-800 dark:text-zinc-200"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-500" />
                      <span>Duplicate Shape</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPropertiesPanel(true);
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-800 dark:text-zinc-200"
                    >
                      <Settings className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Shape Properties</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShapes((prev) => prev.filter((s) => s.id !== shp.id));
                        setSelectedShapeId(null);
                        pushSnapshot({ shapes });
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-red-600 flex items-center gap-2 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Shape</span>
                    </button>
                  </>
                );
              })()}

              {menu.type === 'image' && (() => {
                const img = imageOverlays.find((i) => i.id === menu.id);
                if (!img) return null;
                return (
                  <>
                    <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                      Picture Options
                    </div>
                    {/* Quick Filters */}
                    <div className="px-3 py-1.5">
                      <div className="text-[10px] font-semibold text-zinc-500 mb-1">Quick Filters</div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setImageOverlays((prev) =>
                              prev.map((i) =>
                                i.id === img.id
                                  ? { ...i, grayscale: false, invert: false, brightness: 100, contrast: 100, saturation: 100 }
                                  : i
                              )
                            );
                            pushSnapshot({ imageOverlays });
                          }}
                          className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium"
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImageOverlays((prev) =>
                              prev.map((i) => (i.id === img.id ? { ...i, grayscale: !i.grayscale } : i))
                            );
                            pushSnapshot({ imageOverlays });
                          }}
                          className={`px-2 py-1 rounded border text-left font-medium ${
                            img.grayscale
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          B&W / Mono
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImageOverlays((prev) =>
                              prev.map((i) => (i.id === img.id ? { ...i, invert: !i.invert } : i))
                            );
                            pushSnapshot({ imageOverlays });
                          }}
                          className={`px-2 py-1 rounded border text-left font-medium ${
                            img.invert
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          Invert
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImageOverlays((prev) =>
                              prev.map((i) => (i.id === img.id ? { ...i, contrast: i.contrast === 140 ? 100 : 140 } : i))
                            );
                            pushSnapshot({ imageOverlays });
                          }}
                          className={`px-2 py-1 rounded border text-left font-medium ${
                            img.contrast === 140
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          High Contrast
                        </button>
                      </div>
                    </div>
                    {/* Flips & Crop */}
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                    <div className="flex items-center gap-1 px-3 py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === img.id ? { ...i, flipH: !i.flipH } : i))
                          );
                          pushSnapshot({ imageOverlays });
                        }}
                        className="flex-1 py-1 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium text-center"
                      >
                        Flip Horiz
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageOverlays((prev) =>
                            prev.map((i) => (i.id === img.id ? { ...i, flipV: !i.flipV } : i))
                          );
                          pushSnapshot({ imageOverlays });
                        }}
                        className="flex-1 py-1 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium text-center"
                      >
                        Flip Vert
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCropImageId(img.id);
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-800 dark:text-zinc-200"
                    >
                      <Crop className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Crop Picture</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const dup: ImageOverlay = {
                          ...img,
                          id: `img_${Date.now()}`,
                          x: img.x + 20,
                          y: img.y - 20,
                        };
                        setImageOverlays((prev) => {
                          const next = [...prev, dup];
                          pushSnapshot({ imageOverlays: next });
                          return next;
                        });
                        setSelectedOverlayId(dup.id);
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-800 dark:text-zinc-200"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-500" />
                      <span>Duplicate Picture</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPropertiesPanel(true);
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-800 dark:text-zinc-200"
                    >
                      <Settings className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Picture Properties</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageOverlays((prev) => prev.filter((i) => i.id !== img.id));
                        setSelectedOverlayId(null);
                        pushSnapshot({ imageOverlays });
                        closeMenu();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-red-600 flex items-center gap-2 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Picture</span>
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Document Close Confirmation Modal */}
      {showCloseConfirmModal && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl w-full max-w-sm border border-zinc-200/90 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Unsaved Changes
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                You have unsaved edits in this document. Would you like to save your edits before closing?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowCloseConfirmModal(false)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCloseConfirmModal(false);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Discard & Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSave();
                  setShowCloseConfirmModal(false);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-xs"
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
        <div className="fixed inset-0 z-[9999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Close "{tabCloseConfirmTarget.name}"?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                This document has unsaved edits. Would you like to save your changes before closing?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setTabCloseConfirmTarget(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = tabCloseConfirmTarget.id;
                  setTabCloseConfirmTarget(null);
                  performCloseTab(id);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs"
              >
                Discard & Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = tabCloseConfirmTarget.id;
                  setTabCloseConfirmTarget(null);
                  await handleSave();
                  performCloseTab(id);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page Confirmation Dialog */}
      {pageToDelete !== null && (
        <div className="fixed inset-0 z-[9999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Delete Page {pageToDelete}?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Do you want to delete this page? This will remove Page {pageToDelete} and any annotations or elements placed on it.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setPageToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performDeletePage(pageToDelete)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Thumbnail Context Menu */}
      {pageThumbnailContextMenu && (
        <div
          className="fixed inset-0 z-[99999] select-none"
          onClick={() => setPageThumbnailContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setPageThumbnailContextMenu(null);
          }}
        >
          <div
            style={{
              top: `${Math.min(window.innerHeight - 200, pageThumbnailContextMenu.y)}px`,
              left: `${Math.min(window.innerWidth - 220, pageThumbnailContextMenu.x)}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[100000] w-56 max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 divide-y divide-zinc-100 dark:divide-zinc-800 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Page {pageThumbnailContextMenu.pageNum} Options
            </div>
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  const p = pageThumbnailContextMenu.pageNum;
                  setPageThumbnailContextMenu(null);
                  handleInsertBlankPage('before', 'same', p);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-200"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Insert Blank Page Before</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = pageThumbnailContextMenu.pageNum;
                  setPageThumbnailContextMenu(null);
                  handleInsertBlankPage('after', 'same', p);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-200"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Insert Blank Page After</span>
              </button>
            </div>
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  const p = pageThumbnailContextMenu.pageNum;
                  setPageThumbnailContextMenu(null);
                  handleRotatePageNum(p, 90);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-200"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-500" />
                <span>Rotate 90° Clockwise</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const pIdx = pageThumbnailContextMenu.pageNum - 1;
                  setPageThumbnailContextMenu(null);
                  const isCurActive = pageBorders[pIdx]?.enabled;
                  updatePageBorderConfig({ enabled: !isCurActive }, 'current');
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-200"
              >
                <Square className="w-3.5 h-3.5 text-indigo-500" />
                <span>{pageBorders[pageThumbnailContextMenu.pageNum - 1]?.enabled ? 'Remove Page Border' : 'Add Page Border'}</span>
              </button>
            </div>
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  const p = pageThumbnailContextMenu.pageNum;
                  setPageThumbnailContextMenu(null);
                  if (totalPages <= 1) {
                    setError('Cannot delete the only page in the document.');
                  } else {
                    setPageToDelete(p);
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Page {pageThumbnailContextMenu.pageNum}</span>
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
      {/* Hidden File Input for Inserting Image into Selected Table Cell */}
      <input
        type="file"
        ref={cellImageInputRef}
        onChange={handleInsertCellImageInput}
        accept="image/*"
        className="hidden"
      />

      {/* Hyperlink Dialog Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Insert Hyperlink</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {!linkModalData.targetTextItemId && !linkModalData.targetOverlayId && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Display Text
                  </label>
                  <input
                    type="text"
                    value={linkModalData.text}
                    onChange={(e) => setLinkModalData((prev) => ({ ...prev, text: e.target.value }))}
                    placeholder="e.g. Click Here / Visit Website"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Destination URL
                </label>
                <input
                  type="url"
                  value={linkModalData.url}
                  onChange={(e) => setLinkModalData((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyLink(linkModalData.text, linkModalData.url);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApplyLink(linkModalData.text, linkModalData.url)}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs"
              >
                Apply Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Dialog: Insert Page Suite (Blank Page + Pages from other PDF) */}
      {showInsertPageModal && (
        <InsertPageModal
          isOpen={showInsertPageModal}
          onClose={() => setShowInsertPageModal(false)}
          onInsertBlankPage={(position, sizeSpecId) => {
            handleInsertBlankPage(position, sizeSpecId);
            setShowInsertPageModal(false);
          }}
          onInsertPdfPages={(donorFile, position, pageRange) => {
            handleInsertPagesFromOtherPdf(donorFile, position, pageRange);
            setShowInsertPageModal(false);
          }}
          pdfBufferOrProxy={arrayBuffer}
          totalPages={totalPages}
          currentPage={currentPage}
          basePageDims={basePageDims}
          pageRotations={pageRotations}
          initialMode={insertPageInitialMode}
        />
      )}

      {/* Desktop Dialog: Watermark Suite (Images 1 & 2 Design) */}
      {showWatermarkModal && (
        <WatermarkModal
          isOpen={showWatermarkModal}
          onClose={() => setShowWatermarkModal(false)}
          config={watermarkConfig || DEFAULT_WATERMARK_CONFIG}
          onApply={(updated) => {
            setWatermarkConfig(updated);
            pushSnapshot({ watermarkConfig: updated });
            setShowWatermarkModal(false);
          }}
          pdfBufferOrProxy={arrayBuffer}
          totalPages={totalPages}
          currentPage={currentPage}
          basePageDims={basePageDims}
          pageRotations={pageRotations}
        />
      )}

      {/* Desktop Dialog: Page Numbers Suite (Image 3 Design) */}
      {showPageNumberModal && (
        <PageNumberModal
          isOpen={showPageNumberModal}
          onClose={() => setShowPageNumberModal(false)}
          config={pageNumberConfig || {
            enabled: true,
            position: 'bottom-center',
            format: 'num',
            fontFamily: 'Calibri',
            fontSize: 10,
            color: '#334155',
            startNumber: 1,
            scope: 'all',
          }}
          onApply={(updated) => {
            setPageNumberConfig(updated);
            pushSnapshot({ pageNumberConfig: updated });
            setShowPageNumberModal(false);
          }}
          pdfBufferOrProxy={arrayBuffer}
          totalPages={totalPages}
          currentPage={currentPage}
          basePageDims={basePageDims}
          pageRotations={pageRotations}
        />
      )}

      {/* Desktop Dialog: Page Borders Suite (Image 3 Design) */}
      {showBorderModal && (
        <PageBorderModal
          isOpen={showBorderModal}
          onClose={() => setShowBorderModal(false)}
          config={pageBorders[currentPage - 1] || {
            enabled: true,
            type: 'box',
            style: 'solid',
            color: '#000000',
            width: 2,
            top: 20,
            bottom: 20,
            left: 20,
            right: 20,
          }}
          onApply={(updated, scope) => {
            const nextBorders = { ...pageBorders };
            if (scope === 'all') {
              for (let i = 0; i < totalPages; i++) {
                nextBorders[i] = { ...updated };
              }
            } else if (scope === 'current') {
              nextBorders[currentPage - 1] = { ...updated };
            } else if (scope === 'odd') {
              for (let i = 0; i < totalPages; i++) {
                if (i % 2 === 0) nextBorders[i] = { ...updated };
              }
            } else if (scope === 'even') {
              for (let i = 0; i < totalPages; i++) {
                if (i % 2 !== 0) nextBorders[i] = { ...updated };
              }
            }
            setPageBorders(nextBorders);
            pushSnapshot({ pageBorders: nextBorders });
            setShowBorderModal(false);
          }}
          pdfBufferOrProxy={arrayBuffer}
          totalPages={totalPages}
          currentPage={currentPage}
          basePageDims={basePageDims}
          pageRotations={pageRotations}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
