#!/usr/bin/env node
/**
 * Generates the app icons used by the web manifest and push notifications:
 *   public/icons/icon-192.png   (manifest + notification icon)
 *   public/icons/icon-512.png   (manifest)
 *   public/icons/badge-96.png   (monochrome notification badge)
 *
 * Pure Node (zlib + custom PNG encoder) — no dependencies. Run:
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "icons");

// ------------------------------------------------------------------ PNG utils
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- icon drawing
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function roundedRectCoverage(x, y, x0, y0, x1, y1, r) {
  const cx = clamp01(Math.max(x0 + r - x, x - (x1 - r)));
  const cy = clamp01(Math.max(y0 + r - y, y - (y1 - r)));
  const dx = x - (x0 + r + cx * (x1 - x0 - 2 * r));
  const dy = y - (y0 + r + cy * (y1 - y0 - 2 * r));
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
    return dist > r ? 1 - clamp01(dist - r) : 1;
  }
  return 0;
}

function circleCoverage(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return clamp01(r - Math.sqrt(dx * dx + dy * dy));
}

function bellCoverage(x, y) {
  // Bell geometry in unit space.
  const dome = circleCoverage(x, y, 0.5, 0.45, 0.32);
  const body = roundedRectCoverage(x, y, 0.35, 0.38, 0.65, 0.6, 0.07);
  const lip = roundedRectCoverage(x, y, 0.29, 0.57, 0.71, 0.63, 0.02);
  const nub = circleCoverage(x, y, 0.5, 0.2, 0.05);
  const clapper = circleCoverage(x, y, 0.5, 0.71, 0.055);
  return clamp01(Math.max(dome, body, lip, nub, clapper));
}

function bellWithCord(x, y) {
  // Bell + a short cord at the top (reads as a notification bell).
  const bell = bellCoverage(x, y);
  const cord = roundedRectCoverage(x, y, 0.47, 0.02, 0.53, 0.14, 0.02);
  return clamp01(Math.max(bell, cord));
}

const lerp = (a, b, t) => a + (b - a) * t;

function renderIcon(size, background, glyph) {
  const px = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const alpha = background ? roundedRectCoverage(x / size, y / size, 0, 0, 1, 1, 0.22) : 0;
      const gx = (x + 0.5) / size;
      const gy = (y + 0.5) / size;
      const glyphA = background ? glyph(gx, gy) * alpha : glyph(gx, gy);
      const a = background ? clamp01(alpha + glyphA * 0) : glyphA;
      const i = (y * size + x) * 4;
      if (background) {
        const r = lerp(0x3b, 0x25, gy);
        const g = lerp(0x82, 0x63, gy);
        const b = lerp(0xf6, 0xeb, gy);
        px[i] = Math.round(lerp(px[i] || r, r, alpha) || r);
        px[i + 1] = Math.round(lerp(px[i + 1] || g, g, alpha) || g);
        px[i + 2] = Math.round(lerp(px[i + 2] || b, b, alpha) || b);
        px[i + 3] = Math.round(alpha * 255);
        // White glyph on top.
        if (glyphA > 0) {
          const ga = glyphA;
          px[i] = Math.round(lerp(px[i], 255, ga));
          px[i + 1] = Math.round(lerp(px[i + 1], 255, ga));
          px[i + 2] = Math.round(lerp(px[i + 2], 255, ga));
          px[i + 3] = 255;
        }
      } else {
        px[i] = 255;
        px[i + 1] = 255;
        px[i + 2] = 255;
        px[i + 3] = Math.round(glyphA * 255);
      }
    }
  }
  return px;
}

mkdirSync(OUT_DIR, { recursive: true });

// With a 4x supersample pass for crisp edges on the large icon.
function renderIconSS(size, background) {
  const n = 4;
  const px = Buffer.alloc(size * size * 4);
  const glyphFn = bellWithCord;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = { r: 0, g: 0, b: 0, a: 0 };
      for (let sy = 0; sy < n; sy++) {
        for (let sx = 0; sx < n; sx++) {
          const gx = (x + (sx + 0.5) / n) / size;
          const gy = (y + (sy + 0.5) / n) / size;
          const alpha = background ? roundedRectCoverage(gx, gy, 0, 0, 1, 1, 0.22) : 0;
          const glyphA = glyphFn(gx, gy);
          const coverage = background ? alpha : glyphA;
          const r = lerp(0x3b, 0x25, gy);
          const g = lerp(0x82, 0x63, gy);
          const b = lerp(0xf6, 0xeb, gy);
          if (background && glyphA > 0) {
            acc.r += lerp(r, 255, glyphA) * coverage;
            acc.g += lerp(g, 255, glyphA) * coverage;
            acc.b += lerp(b, 255, glyphA) * coverage;
            acc.a += coverage;
          } else {
            acc.r += (background ? r : 255) * coverage;
            acc.g += (background ? g : 255) * coverage;
            acc.b += (background ? b : 255) * coverage;
            acc.a += coverage;
          }
        }
      }
      const s = n * n;
      const i = (y * size + x) * 4;
      px[i] = Math.round(acc.r / s);
      px[i + 1] = Math.round(acc.g / s);
      px[i + 2] = Math.round(acc.b / s);
      px[i + 3] = Math.round((acc.a / s) * 255);
    }
  }
  return px;
}

writeFileSync(join(OUT_DIR, "icon-192.png"), encodePng(192, 192, renderIconSS(192, true)));
writeFileSync(join(OUT_DIR, "icon-512.png"), encodePng(512, 512, renderIconSS(512, true)));
writeFileSync(join(OUT_DIR, "badge-96.png"), encodePng(96, 96, renderIcon(96, false, bellWithCord)));

console.log("Icons generated in", OUT_DIR);
