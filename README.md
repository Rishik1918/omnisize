# Omnisize ⚡ Professional Document & PDF Studio • Universal Media Suite

<p align="center">
  <img src="public/favicon.svg" alt="Omnisize Logo" width="80" height="80" />
</p>

<p align="center">
  <strong>The Ultimate 100% Private, Client-Side Document & Media Powerhouse.</strong><br>
  Edit PDFs like Microsoft Word, compress videos & photos to exact target sizes, perform multilingual OCR, manage digital signatures, and convert documents — completely offline on your device.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.9.5-indigo.svg" alt="Version 2.9.5" />
  <img src="https://img.shields.io/badge/privacy-100%25%20Zero--Knowledge-emerald.svg" alt="Privacy" />
  <img src="https://img.shields.io/badge/platforms-Windows%20%7C%20Android%20%7C%20Web-blue.svg" alt="Platforms" />
  <img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="License" />
</p>

---

## 🌟 Highlights & Key Features

### 📑 1. Microsoft Word-Grade PDF Studio
- **Continuous Smooth Scrolling**: Smooth, glitch-free vertical document scrolling across all pages, just like Acrobat and MS Word.
- **Word-Style Ribbon Interface**: Organized into *File*, *Home*, *Insert*, *Page*, *Review*, and *View* tabs.
- **Rich Text & Typography**: Full formatting control — font family, size, line spacing, bold, italic, underline, strikethrough, subscript, superscript, text alignment, and color highlights.
- **Interactive Tables & Subtables**:
  - Insert customizable grid tables with draggable row/column dividers.
  - Insert **photos, geometric shapes, or subtables** directly into table cells.
  - Independent, unclipped resizer handles (`SE corner`, `E edge`, `S edge`) inside cells that never conflict with outer table boundaries.
- **Standard MS Word Margins**:
  - Presets: *Normal*, *Narrow*, *Moderate*, *Wide*, *Mirrored*, and *Office 2003 Default*.
  - Interactive Custom Margins with real-time dashed canvas guidelines and visibility toggle.
- **Smart Cursor-Based Insertion**: Elements (images, shapes, tables, text) drop right where your cursor points or clicks on the active page canvas.
- **Page Thumbnail Manager**:
  - Drag-and-drop page reordering with intuitive drop targets.
  - Right-click context menu: Insert blank page (before/after), rotate 90°, or delete page.
  - Page deletion confirmation safety modal with direct `Delete` key support.
- **Optical Character Recognition (OCR)**: In-browser text extraction supporting English + Hindi (`eng+hin`) powered by Tesseract.js.
- **Digital Signatures & Hotspots**: Inspect and verify PDF digital certificate properties with visual hotspot overlays (including Aadhaar document layout compatibility).
- **Session Auto-Persistence**: Automatic in-memory and local session preservation so you never lose work accidentally.

---

### 🖼️ 2. Universal Media & Image Compressor
- **Broad Format Support**: `JPEG`, `PNG`, `WebP`, `AVIF`, `GIF`, `SVG`, `BMP`.
- **Target File Size Engine**: Binary-search compression guarantees output matches portal upload requirements (e.g., `< 50 KB`, `< 100 KB`, `< 200 KB`).
- **Precision Image Manipulation**:
  - Interactive non-destructive Crop with rule-of-thirds grid.
  - Dedicated Android & touch UX with conflict-free rotate & crop buttons.
  - Contrast, brightness, saturation, grayscale, invert, temperature, and aspect-ratio locking.
- **AI / Lanczos Edge-Preserving Super-Resolution**: 2x and 4x upscaling with unsharp masking.
- **Watermark & Object Eraser**: Telea / Fast-Marching gradient inpainting to seamlessly remove timestamps and logos.

---

### 🎥 3. Video Compression & Optimization
- **Formats**: `MP4`, `WebM`, `MOV`, `MKV`.
- **Target MB Calculator**: Automatic bitrate calculation to fit platforms with strict limits (Discord 25MB, WhatsApp, Email).
- **Resolution Scaling**: Downscale (4K → 1080p → 720p → 480p) or custom dimensions.
- **Audio Stream Controls**: Keep, re-encode, or mute audio tracks.

---

## 🔒 Zero-Knowledge Privacy Architecture

| Principle | How Omnisize Enforces It |
|---|---|
| **0 Server Uploads** | All processing is executed locally on your device CPU/GPU via WebAssembly (WASM), Canvas API, and WebCodecs. |
| **No Telemetry / No Tracking** | Omnisize makes zero external API requests and requires no accounts, licenses, or subscriptions. |
| **EXIF & Metadata Sanitization** | Automatically strips GPS coordinates, camera serial numbers, and author metadata upon export. |
| **Air-Gapped Operation** | Works 100% offline — disconnect your Wi-Fi and everything still functions seamlessly. |

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Delete` | Deletes selected element (or prompts to delete current page if nothing is selected) |
| `Ctrl + Z` / `Cmd + Z` | Undo last action |
| `Ctrl + Y` / `Cmd + Shift + Z` | Redo action |
| `Ctrl + S` / `Cmd + S` | Export & Save document |
| `Escape` | Deselect active element / Close modals |
| `Space + Drag` | Pan document canvas freely |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### 1. Clone & Install
```bash
git clone https://github.com/rishik/omnisize.git
cd omnisize
npm install
```

### 2. Run Web Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Building Releases

### 🌐 Web Application (Production)
```bash
npm run build
```
The compiled static assets will be located in `dist/`, ready to be hosted on Vercel, Cloudflare Pages, GitHub Pages, or Netlify.

### 💻 Windows Desktop (Electron)
Omnisize supports standalone portable and NSIS installer releases:
```bash
# Build NSIS Setup Installer (.exe)
npm run dist:installer

# Build Portable Standalone (.exe)
npm run dist:win
```
Output binaries are generated in the `release/` directory:
- `Omnisize Setup 2.9.5.exe` (Installer)
- `Omnisize 2.9.5.exe` (Portable)

### 📱 Android Application (Capacitor)
```bash
# Sync web assets to Android
npm run build
npx cap sync android

# Build Release APK via Gradle
cd android
./gradlew assembleRelease
```
Output APK is generated at:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 🛠️ Technology Stack

- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React icons
- **Document Processing**: `pdf-lib`, `pdfjs-dist`, `mammoth`, `docx`, `xlsx`, `pako`
- **OCR Engine**: Tesseract.js (WebAssembly)
- **Desktop Runtime**: Electron 44, electron-builder
- **Mobile Engine**: Capacitor 8 (Android runtime)
- **Cryptography & Signatures**: `node-forge`

---

## 📄 License

Distributed under the **MIT License**. Free and open-source for personal and commercial use.
