/*
 * Generates the app icons (SVG + framed HTML for PNG rasterisation).
 * The icon is Quinlan himself — the 8-bit portrait from public/sprites.js —
 * on a retro arcade-badge background in the app's palette.
 *
 * Run:  node tools/gen-assets.mjs
 * Then rasterise the *.html files to PNG with headless Chromium.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS = join(__dirname, "..", "public", "icons");
mkdirSync(ICONS, { recursive: true });

// --- Quinlan grid (matches public/sprites.js, happy variant: grinning) ---
const QUINLAN = [
  "......HHHHHH......",
  "....HHHHHHHHHH....",
  "...HHHHHHHHHHHH...",
  "..HHHHHHHHHHHHHH..",
  "..HHSSSSSSSSSSHH..",
  "..HSSSSSSSSSSSSH..",
  "..HSSPPSSSSPPSSH..",
  "..HSSEPESSEPESSH..",
  "..HSSSSSnnSSSSSH..",
  "..RSSSSSnnSSSSSB..",
  "..BSSSSBBBBSSSSB..",
  "..BSSSSMWWMSSSSB..",
  "..sSSBBBBBBBBSSs..",
  "...ssBBBBBBBBss...",
  "......sSSSSs......",
  "....ZZZWWWWZZZ....",
  ".ZZZZZWWIIWWZZZZZ.",
  "ZZZZZZWWIIWWZZZZZZ",
  "ZZZZZZZWIIWZZZZZZZ",
  "ZZZZZZZZIIZZZZZZZZ",
];
const PAL = {
  H: "#17171f", S: "#8d5a3c", s: "#6b4329", E: "#f2efe6", P: "#241712",
  B: "#221812", M: "#4e2c1e", n: "#5e3925", Z: "#2f333b",
  W: "#f4f4f4", I: "#b9c4cf", R: "#eef0f8",
};

// App palette
const C = {
  line: "#12132b", bg1: "#2a2d52", bg2: "#1a1c2c",
  yellow: "#ffd23b", red: "#e23b4e", cyan: "#73eff7",
  green: "#2fbf71", rail: "#4a4f7a", panel: "#2b2f52",
};

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

// Tiny pixel star (plus-shape sparkle)
function star(cx, cy, u, color) {
  return `<rect x="${cx - u / 2}" y="${cy - u * 1.5}" width="${u}" height="${u * 3}" fill="${color}"/>` +
         `<rect x="${cx - u * 1.5}" y="${cy - u / 2}" width="${u * 3}" height="${u}" fill="${color}"/>`;
}

function iconSvg(size, maskable) {
  // Maskable icons get cropped to a circle/squircle: keep art in the middle ~80%.
  const pad = maskable ? size * 0.12 : size * 0.045;
  const inner = size - pad * 2;
  const r = maskable ? 0 : size * 0.14;
  const u = size / 64; // base pixel unit for decorations

  // Quinlan portrait: 18 wide x 20 tall
  const px = Math.floor((inner * (maskable ? 0.62 : 0.68)) / 18);
  const spriteW = 18 * px, spriteH = 20 * px;
  const ox = (size - spriteW) / 2;
  const oy = (size - spriteH) / 2 - u * 2;

  // Sunburst rays behind Quinlan (arcade hero vibes)
  const cx = size / 2, cy = oy + spriteH * 0.42;
  let rays = "";
  const rayLen = size * 0.62;
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    const wobble = i % 2 === 0 ? 1 : 0.72;
    const x2 = cx + Math.cos(a) * rayLen * wobble;
    const y2 = cy + Math.sin(a) * rayLen * wobble;
    rays += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="${i % 2 === 0 ? "#343a63" : "#2f3357"}" stroke-width="${u * 5}"/>`;
  }

  // Pixel rails at the bottom (the OV theme) — drawn OVER the portrait so
  // Quinlan stands behind the platform edge.
  const railY = size - (maskable ? pad + u * 6 : u * 10);
  let rails = `<rect x="${maskable ? pad : u * 3.5}" y="${railY}" width="${maskable ? inner : size - u * 7}" height="${u * 3.2}" fill="${C.rail}"/>` +
    `<rect x="${maskable ? pad : u * 3.5}" y="${railY - u * 1.2}" width="${maskable ? inner : size - u * 7}" height="${u * 1.2}" fill="#6b7099"/>`;
  for (let x = (maskable ? pad : u * 3.5) + u; x < size - (maskable ? pad : u * 3.5) - u * 3; x += u * 6) {
    rails += `<rect x="${x}" y="${railY + u * 3.2}" width="${u * 3}" height="${u * 2}" fill="${C.line}"/>`;
  }

  // Chunky double frame (skip on maskable — the OS crops its own shape)
  const frame = maskable ? "" :
    `<rect x="${u * 2}" y="${u * 2}" width="${size - u * 4}" height="${size - u * 4}" rx="${r * 0.85}" fill="none" stroke="${C.line}" stroke-width="${u * 3}"/>` +
    `<rect x="${u * 4.5}" y="${u * 4.5}" width="${size - u * 9}" height="${size - u * 9}" rx="${r * 0.7}" fill="none" stroke="${C.yellow}" stroke-width="${u * 1.6}"/>`;

  // Sparkles around the head
  const sparkles =
    star(ox + px * 1.2, oy + px * 3.6, u * 1.4, C.yellow) +
    star(ox + spriteW - px * 1.2, oy + px * 2.4, u * 1.4, C.cyan) +
    star(ox + spriteW - px * 0.4, oy + px * 8.5, u * 1.1, C.red) +
    star(ox + px * 0.4, oy + px * 9.5, u * 1.1, C.green);

  // Ground shadow under the portrait
  const shadow = `<rect x="${cx - spriteW * 0.42}" y="${oy + spriteH - u}" width="${spriteW * 0.84}" height="${u * 2.5}" fill="${C.line}" opacity="0.55"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.bg1}"/><stop offset="1" stop-color="${C.bg2}"/>
    </linearGradient>
    <clipPath id="clip"><rect x="0" y="0" width="${size}" height="${size}" rx="${r}"/></clipPath>
  </defs>
  <g clip-path="url(#clip)">
    <rect x="0" y="0" width="${size}" height="${size}" fill="url(#bg)"/>
    ${rays}
    ${shadow}
    ${sparkles}
    ${spriteRects(QUINLAN, PAL, ox, oy, px)}
    ${rails}
    ${frame}
  </g>
</svg>`;
}

// Master SVG icon (scalable, "any" purpose)
writeFileSync(join(ICONS, "icon.svg"), iconSvg(512, false));

// Canvas rasteriser page: draws each SVG at its exact size and exposes the
// PNGs as base64 in the DOM. Viewport-size independent (headless screenshot
// crops are unreliable), so PNGs always come out pixel-perfect.
const variants = [
  ["icon-192", 192, false],
  ["icon-512", 512, false],
  ["icon-512-maskable", 512, true],
];
const svgs = variants.map(([name, size, maskable]) => ({ name, size, svg: iconSvg(size, maskable) }));
const rasterHtml = `<!doctype html><meta charset="utf-8"><body>
<script>
const items = ${JSON.stringify(svgs)};
let done = 0;
for (const it of items) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = it.size; c.height = it.size;
    c.getContext("2d").drawImage(img, 0, 0, it.size, it.size);
    const div = document.createElement("div");
    div.id = it.name;
    div.textContent = c.toDataURL("image/png").split(",")[1];
    document.body.appendChild(div);
    if (++done === items.length) document.title = "RASTER_DONE";
  };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(it.svg)));
}
</script>`;
writeFileSync(join(ICONS, "rasterize.html"), rasterHtml);

console.log("Wrote icon.svg + rasterize.html into public/icons/");
console.log("Rasterise with: chromium --headless --dump-dom rasterize.html, then extract the base64 divs.");
