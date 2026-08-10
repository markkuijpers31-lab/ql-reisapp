/*
 * Generates the app icons (SVG + framed HTML for PNG rasterisation).
 * Run:  node tools/gen-assets.mjs
 * Then rasterise the *.html files to PNG with headless Chromium (see below).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS = join(__dirname, "..", "public", "icons");
mkdirSync(ICONS, { recursive: true });

// --- train grid (matches public/sprites.js) ---
const TRAIN = [
  "................",
  "..kkkkkkkkkkk...",
  ".kBBBBBBBBBBBk..",
  ".kBBBBBBBBBBBBk.",
  "kYccYccYccYccYBk",
  "kYccYccYccYccLLk",
  "kYYYYYYYYYYYYYLk",
  "kBBBBBBBBBBBBBBk",
  "kYYYYYYYYYYYYYYk",
  "kkkkkkkkkkkkkkk.",
  "..ww......ww....",
  "..ww......ww....",
];
const PAL = { k: "#12132b", w: "#2a2d3a", c: "#bfeaff", L: "#fff29b", Y: "#ffd23b", B: "#1f6feb" };

function spriteRects(grid, pal, ox, oy, px) {
  let out = "";
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === "." || !pal[ch]) { x++; continue; }
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      out += `<rect x="${ox + x * px}" y="${oy + y * px}" width="${run * px}" height="${px}" fill="${pal[ch]}"/>`;
      x += run;
    }
  }
  return out;
}

function iconSvg(size, maskable) {
  const pad = maskable ? size * 0.16 : size * 0.06; // maskable needs safe zone
  const inner = size - pad * 2;
  const px = Math.floor(inner / 18); // train is 16 wide, leave margin
  const spriteW = 16 * px, spriteH = 12 * px;
  const ox = (size - spriteW) / 2;
  const oy = (size - spriteH) / 2 - px * 1.2;
  const r = maskable ? 0 : size * 0.16;

  // rails under the train
  const railY = oy + spriteH + px;
  let rails = `<rect x="${pad}" y="${railY}" width="${inner}" height="${px * 0.8}" fill="#4a4f7a"/>`;
  for (let x = pad; x < size - pad; x += px * 1.6) {
    rails += `<rect x="${x}" y="${railY - px * 0.6}" width="${px * 0.6}" height="${px * 0.6}" fill="#12132b"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a2d52"/><stop offset="1" stop-color="#1a1c2c"/>
  </linearGradient></defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  ${maskable ? "" : `<rect x="${size * 0.03}" y="${size * 0.03}" width="${size * 0.94}" height="${size * 0.94}" rx="${r * 0.8}" fill="none" stroke="#12132b" stroke-width="${size * 0.03}"/>`}
  ${rails}
  ${spriteRects(TRAIN, PAL, ox, oy, px)}
</svg>`;
}

// Master SVG icon (scalable, "any" purpose)
writeFileSync(join(ICONS, "icon.svg"), iconSvg(512, false));

// HTML wrappers so headless Chromium can rasterise exact-size PNGs
const wrap = (svg, size) =>
  `<!doctype html><meta charset=utf-8><style>html,body{margin:0;padding:0}svg{display:block;image-rendering:pixelated}</style>${svg.replace("width=\"512\"", `width=\"${size}\"`).replace("height=\"512\"", `height=\"${size}\"`).replace("viewBox=\"0 0 512 512\"", `viewBox=\"0 0 512 512\"`)}`;

for (const [name, size, maskable] of [
  ["icon-192", 192, false],
  ["icon-512", 512, false],
  ["icon-512-maskable", 512, true],
]) {
  writeFileSync(join(ICONS, name + ".html"), wrap(iconSvg(size, maskable), size));
}

console.log("Wrote icon.svg + rasteriser HTML into public/icons/");
