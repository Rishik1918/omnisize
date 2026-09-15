# Omnisize ⚡ Zero-Knowledge Universal Media Compressor & Studio

A free, private, client-side application to **compress, resize, upscale, and remove watermarks** from **Videos, Images, and PDFs/Documents** directly on your device.

---

## 🔒 Security & Privacy Architecture

- **0 Server Uploads**: Files are never transmitted across the network or uploaded to external cloud servers. All processing is executed directly on your device's CPU/GPU via WebAssembly (WASM), HTML5 Canvas, and WebCodecs.
- **No External API Dependencies**: Works 100% free with no subscription tiers, API keys, or usage quotas.
- **EXIF & Metadata Sanitization**: Automatically strips GPS coordinates, camera serials, author metadata, and creation histories.
- **WASM Memory Sandboxing**: File manipulation runs inside browser-enforced memory bounds.

---

## 🚀 Supported Capabilities & Formats

### 1. Images & Photos (`JPEG`, `PNG`, `WebP`, `AVIF`, `GIF`, `SVG`, `BMP`)
- **Dimension Resizing**: Custom Width × Height with Aspect Ratio locking.
- **Target File Size Optimizer**: Binary search compression guaranteeing file size fits within target KB (e.g. `< 50 KB` or `< 200 KB` for portal uploads).
- **AI / Lanczos Super-Resolution (2x, 4x)**: Edge-preserving super-resolution with unsharp masking.
- **Watermark & Object Eraser**: Interactive brush & bounding box with Fast Marching / Telea gradient inpainting.

### 2. Videos (`MP4`, `WebM`, `MOV`, `MKV`)
- **Target MB Calculator**: Calculates exact video bitrates to meet file limits (e.g. 25 MB for Discord/WhatsApp/Email).
- **Resolution Scaling**: Downscale (4K → 1080p → 720p → 480p) or upscale.
- **Delogo Watermark Removal**: Frame-by-frame spatial gradient interpolation to seamlessly erase corner watermarks and timestamps.
- **Audio Control**: Strip or retain audio streams.

### 3. Documents & PDFs (`PDF`)
- **Stream Deflation**: Re-compresses internal object streams via `pako` (Zlib).
- **Metadata Pruning**: Removes unreferenced objects and document metadata.

---

## 🛠️ Quick Start (Running Locally)

```bash
cd C:\Users\rishi\.gemini\antigravity\scratch\omnisize
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🌐 Deploying Online for Free

Because **Omnisize is 100% client-side**, it can be hosted for free on any static host:

1. **Vercel**:
   ```bash
   npx vercel
   ```
2. **Cloudflare Pages / GitHub Pages**:
   - Run `npm run build`
   - Upload the `dist/` directory directly to Cloudflare Pages or deploy via GitHub Actions.

---

## 📱 Mobile App Distribution

### Option A: Progressive Web App (PWA) - Instant Install
- Navigate to your deployed URL on Chrome/Safari on Android or iOS.
- Tap **"Add to Home Screen"** or **"Install App"**.
- The app runs offline as a full-screen, native-feeling app with its own app icon.

### Option B: Native Android APK & iOS App (Capacitor)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init Omnisize com.omnisize.app --web-dir dist
npm run build
npx cap add android
npx cap open android
```

---

## 💻 Desktop App (Windows / macOS / Linux)

To package as a standalone desktop binary (.exe / .dmg / .deb):

### Using Tauri (Lightweight & Fast):
```bash
npm install -D @tauri-apps/cli
npx tauri init
npx tauri build
```

---

## License
MIT License - 100% Free & Open Source.
