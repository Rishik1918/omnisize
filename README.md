# Omnisize

<p align="center">
  <img src="public/icon.png" alt="Omnisize Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>Client-Side Document and PDF Studio with Universal Media Processing</strong><br>
  Edit PDFs with word-processor precision, optimize media to exact target file sizes, perform multilingual OCR, verify digital signatures, and convert files offline on your device.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.9.5-indigo.svg" alt="Version 2.9.5" />
  <img src="https://img.shields.io/badge/privacy-100%25%20Zero--Knowledge-emerald.svg" alt="Privacy" />
  <img src="https://img.shields.io/badge/platforms-Windows%20%7C%20Android%20%7C%20Web-blue.svg" alt="Platforms" />
  <img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="License" />
</p>

---

## Core Capabilities

### 1. Document and PDF Studio
- **Continuous Document Scrolling**: Vertical multi-page document layout with smooth scrolling across all pages.
- **Ribbon Command Interface**: Comprehensive toolbar organized into File, Home, Insert, Page, Review, and View tabs.
- **Typography and Text Formatting**: Font family selection, font size, line spacing, bold, italic, underline, strikethrough, subscript, superscript, text alignment, and color highlighting.
- **Interactive Tables and Subtables**:
  - Insert configurable grid tables with draggable row and column dividers.
  - Insert photos, geometric shapes, or nested subtables directly inside table cells.
  - Independent corner and edge handles inside cells allowing real-time cell resizing without affecting outer table boundaries.
- **Standard Document Margins**:
  - Presets: Normal, Narrow, Moderate, Wide, Mirrored, and Office 2003 Default.
  - Custom margins with interactive numeric inputs and canvas guidelines.
- **Cursor-Targeted Insertion**: Elements such as images, shapes, tables, and text boxes are placed directly at the pointer coordinates on the active page canvas.
- **Page Thumbnail Manager**:
  - Drag-and-drop page reordering with visible target indicators.
  - Context menu options: Insert blank page before or after, rotate 90 degrees clockwise, and delete page.
  - Confirmation prompt on page deletion with dedicated Delete key support.
- **Optical Character Recognition (OCR)**: In-browser text extraction supporting English and Hindi (eng+hin) using Tesseract.js WebAssembly.
- **Digital Signatures**: Inspection and certificate validation for embedded PDF digital signatures with interactive canvas hotspots, including support for Aadhaar layout formats.
- **Session Auto-Persistence**: Background IndexedDB snapshot saving that protects in-progress work across application restarts and platform task switching.

### 2. Universal Image Processing
- **Supported Formats**: JPEG, PNG, WebP, AVIF, GIF, SVG, BMP.
- **Target File Size Engine**: Binary-search compression to meet exact portal upload limits (such as under 50 KB, 100 KB, or 200 KB).
- **Image Editing**:
  - Non-destructive crop tool with rule-of-thirds alignment grid.
  - Dedicated mobile interface with separated rotation and crop controls.
  - Adjustments for brightness, contrast, saturation, grayscale, invert, and color temperature.
- **Edge-Preserving Super-Resolution**: 2x and 4x upscaling with unsharp masking.
- **Object and Watermark Eraser**: Telea and Fast-Marching gradient inpainting for removing timestamps, logos, and artifacts.

### 3. Video Optimization
- **Supported Formats**: MP4, WebM, MOV, MKV.
- **Target Size Calculator**: Automatic bitrate calculation tailored to upload limits for email, messaging, and chat platforms.
- **Resolution Scaling**: Downscale from 4K, 1080p, 720p, or 480p, or apply custom aspect dimensions.
- **Audio Control**: Option to retain, re-encode, or mute audio streams.

---

## Privacy and Security Architecture

| Security Principle | Implementation |
|---|---|
| Zero Server Uploads | All operations run locally inside your browser runtime or desktop binary using WebAssembly, Canvas API, and WebCodecs. |
| Zero Telemetry | No telemetry collection, external API calls, third-party analytics, user tracking, or account requirements. |
| Metadata Sanitization | Automatically removes camera metadata, GPS coordinates, author history, and device serial numbers upon export. |
| Air-Gapped Operation | Functions completely offline with no network connection required. |

---

## Keyboard Shortcuts

| Shortcut | Description |
|---|---|
| Delete | Deletes selected element; if nothing is selected, prompts to delete the active page |
| Ctrl + Z / Cmd + Z | Undo previous action |
| Ctrl + Y / Cmd + Shift + Z | Redo action |
| Ctrl + S / Cmd + S | Export and save active document |
| Escape | Clear selection or dismiss open modal |
| Space + Drag | Pan the document canvas |

---

## Development Setup

### Requirements
- Node.js (version 18 or later)
- npm (version 9 or later)

### Installation
```bash
git clone https://github.com/Rishik1918/omnisize.git
cd omnisize
npm install
```

### Run Web Development Server
```bash
npm run dev
```
Open http://localhost:5173 in a web browser.

---

## Build and Distribution

### Web Production Build
```bash
npm run build
```
Generates production-ready static assets in the `dist/` directory.

### Windows Desktop Executables
```bash
# Build NSIS Setup Installer (.exe)
npm run dist:installer

# Build Standalone Portable Executable (.exe)
npm run dist:win
```
Binaries are output to the `release/` directory:
- `Omnisize Setup 2.9.5.exe` (NSIS Installer)
- `Omnisize 2.9.5.exe` (Portable executable)

### Android Application
```bash
# Sync production build to Android project
npm run build
npx cap sync android

# Build Release APK
cd android
./gradlew assembleRelease
```
The compiled APK is placed at:
`android/app/build/outputs/apk/release/app-release.apk`

---

## Technology Stack

- Frontend Framework: React 18, TypeScript, Vite
- Styling: Tailwind CSS, Lucide React
- Document Engine: pdf-lib, pdfjs-dist, mammoth, docx, xlsx, pako
- OCR Engine: Tesseract.js (WebAssembly)
- Desktop Platform: Electron 44, electron-builder
- Mobile Platform: Capacitor 8 (Android)
- Cryptographic Utilities: node-forge

---

## License

This project is licensed under the MIT License. Free for both commercial and personal use.
