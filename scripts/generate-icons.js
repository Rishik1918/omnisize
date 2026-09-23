import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function encodePng(width, height, getPixel) {
  // Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with 0x00 filter byte per row
  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Procedural High-Definition Icon Generator for Omnisize:
 * Modern Emerald & Cyan geometric stylized symbol with obsidian squircle background
 */
function renderOmnisizeIcon(x, y, w, h, isRound = false, isForegroundOnly = false) {
  // Normalize coordinates to [-1, 1]
  const nx = (x / (w - 1)) * 2 - 1;
  const ny = (y / (h - 1)) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  if (isForegroundOnly) {
    // For Android adaptive foreground: transparent background outside center glyph
    const scale = 1.6; // Scale down glyph to fit safe zone
    const gx = nx * scale;
    const gy = ny * scale;
    return renderGlyph(gx, gy);
  }

  // Squircle or Round background mask
  let inBounds = false;
  let bgAlpha = 1.0;
  if (isRound) {
    if (dist <= 0.95) inBounds = true;
    else if (dist <= 1.0) {
      inBounds = true;
      bgAlpha = (1.0 - dist) / 0.05;
    }
  } else {
    // Superellipse / Squircle: |x|^4 + |y|^4 <= 0.92^4
    const superDist = Math.pow(Math.abs(nx), 3.8) + Math.pow(Math.abs(ny), 3.8);
    if (superDist <= 0.85) inBounds = true;
    else if (superDist <= 1.0) {
      inBounds = true;
      bgAlpha = (1.0 - superDist) / 0.15;
    }
  }

  if (!inBounds) {
    return [0, 0, 0, 0];
  }

  // Background gradient: Deep obsidian slate to dark emerald
  const bgGrad = (ny + 1) * 0.5;
  const rBg = Math.round(9 + bgGrad * 6);
  const gBg = Math.round(15 + bgGrad * 18);
  const bBg = Math.round(26 + bgGrad * 10);

  // Border glow
  let r = rBg;
  let g = gBg;
  let b = bBg;

  // Glyph rendering
  const glyph = renderGlyph(nx, ny);
  const glyphAlpha = glyph[3] / 255;

  r = Math.round(r * (1 - glyphAlpha) + glyph[0] * glyphAlpha);
  g = Math.round(g * (1 - glyphAlpha) + glyph[1] * glyphAlpha);
  b = Math.round(b * (1 - glyphAlpha) + glyph[2] * glyphAlpha);

  return [r, g, b, Math.round(255 * bgAlpha)];
}

function renderGlyph(nx, ny) {
  // Central Stylized Symbol:
  // Concentric compression rings / layered dynamic shapes forming 'O'
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Outer ring (radius ~ 0.55 to 0.70)
  const inOuterRing = dist >= 0.48 && dist <= 0.72;
  // Inner diamond / core (radius ~ 0.22 to 0.38)
  const inInnerRing = dist >= 0.16 && dist <= 0.34;

  // Diagonal notches (compressor motif)
  const angle = Math.atan2(ny, nx);
  const isCutout = Math.abs(nx) < 0.07 || Math.abs(ny) < 0.07;

  if (inOuterRing && !isCutout) {
    // Vibrant Emerald / Mint gradient
    const grad = (nx + ny + 1.4) / 2.8;
    const r = Math.round(16 + grad * 30);
    const g = Math.round(185 + grad * 45);
    const b = Math.round(129 + grad * 90);
    return [r, g, b, 255];
  }

  if (inInnerRing) {
    // Glowing Cyan / Teal core
    const grad = (nx - ny + 1.4) / 2.8;
    const r = Math.round(6 + grad * 20);
    const g = Math.round(182 + grad * 40);
    const b = Math.round(212 + grad * 40);
    return [r, g, b, 255];
  }

  // 4 Inward Compression Arrows / Corner triangles
  const absX = Math.abs(nx);
  const absY = Math.abs(ny);
  if (absX >= 0.28 && absX <= 0.44 && absY >= 0.28 && absY <= 0.44) {
    return [52, 211, 153, 230]; // Mint glow
  }

  return [0, 0, 0, 0];
}

function createIco(pngBuffers) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4); // count

  const entries = [];
  let offset = 6 + (pngBuffers.length * 16);

  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size; // width
    entry[1] = size >= 256 ? 0 : size; // height
    entry[2] = 0; // color palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

// Generate all target icons
console.log('Generating custom modern Omnisize icons...');

// 1. Electron & Web Icons
const sizes = [256, 128, 64, 48, 32, 16];
const pngBuffers = [];

for (const size of sizes) {
  const buf = encodePng(size, size, (x, y, w, h) => renderOmnisizeIcon(x, y, w, h, false, false));
  pngBuffers.push({ size, buffer: buf });
}

// Write electron/icon.ico
const icoBuffer = createIco(pngBuffers);
fs.mkdirSync('electron', { recursive: true });
fs.writeFileSync('electron/icon.ico', icoBuffer);
console.log('Created electron/icon.ico');

// Write public/icon.png and public/favicon.ico
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/icon.png', encodePng(512, 512, (x, y, w, h) => renderOmnisizeIcon(x, y, w, h, false, false)));
fs.writeFileSync('public/favicon.ico', icoBuffer);
console.log('Created public/icon.png and public/favicon.ico');

// 2. Android Mipmap Icons
const androidDensities = [
  { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

const resDir = path.join('android', 'app', 'src', 'main', 'res');
if (fs.existsSync(resDir)) {
  for (const { dir, size, fgSize } of androidDensities) {
    const targetDir = path.join(resDir, dir);
    fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png (squircle)
    const launcherPng = encodePng(size, size, (x, y, w, h) => renderOmnisizeIcon(x, y, w, h, false, false));
    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), launcherPng);

    // ic_launcher_round.png (round)
    const roundPng = encodePng(size, size, (x, y, w, h) => renderOmnisizeIcon(x, y, w, h, true, false));
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), roundPng);

    // ic_launcher_foreground.png (transparent foreground)
    const fgPng = encodePng(fgSize, fgSize, (x, y, w, h) => renderOmnisizeIcon(x, y, w, h, false, true));
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), fgPng);

    console.log(`Generated Android ${dir} icons (${size}x${size}, fg ${fgSize}x${fgSize})`);
  }
}

console.log('Icon generation complete!');
