/**
 * Generates the app/touch icons referenced by index.html and manifest.webmanifest.
 *
 * These are deliberately reproducible rather than hand-committed artwork: the
 * brand mark is a 2x2 grid of provider-coloured tiles ("matrix"), drawn here as
 * raw RGBA and encoded to PNG with nothing but node:zlib. Run with:
 *
 *   npm run generate:icons
 *
 * Outputs land in public/ and are committed.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const BACKGROUND = [0x0b, 0x11, 0x20]; // slate-950 — matches meta theme-color
const TILES = [
  [0xff, 0x99, 0x00], // AWS orange
  [0x00, 0x78, 0xd4], // Azure blue
  [0x42, 0x85, 0xf4], // GCP blue
  [0x10, 0xb9, 0x81] // emerald
];

// ---- Minimal PNG encoder -------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with a filter-type byte (0 = none).
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- Drawing -------------------------------------------------------------

function drawIcon(size, paddingRatio) {
  const rgba = Buffer.alloc(size * size * 4);
  const put = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const o = (y * size + x) * 4;
    rgba[o] = r;
    rgba[o + 1] = g;
    rgba[o + 2] = b;
    rgba[o + 3] = 255;
  };

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, BACKGROUND);

  const pad = Math.round(size * paddingRatio);
  const gap = Math.round(size * 0.06);
  const cell = Math.floor((size - pad * 2 - gap) / 2);

  for (let i = 0; i < 4; i++) {
    const cx = pad + (i % 2) * (cell + gap);
    const cy = pad + Math.floor(i / 2) * (cell + gap);
    const colour = TILES[i];
    for (let y = cy; y < cy + cell; y++) for (let x = cx; x < cx + cell; x++) put(x, y, colour);
  }

  return encodePng(size, size, rgba);
}

const outputs = [
  ['apple-touch-icon.png', 180, 0.2],
  ['icon-192.png', 192, 0.2],
  ['icon-512.png', 512, 0.2],
  // Maskable icons are cropped to a circle by the launcher, so keep artwork
  // inside the ~80% safe zone.
  ['icon-maskable-512.png', 512, 0.3]
];

for (const [name, size, padding] of outputs) {
  const file = path.join(PUBLIC_DIR, name);
  fs.writeFileSync(file, drawIcon(size, padding));
  console.log(`  ✅ ${name} (${size}x${size})`);
}

console.log('Done.');
