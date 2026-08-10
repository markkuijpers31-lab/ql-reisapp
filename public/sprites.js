/*
 * Quinlan ReisApp — 8-bit vehicle sprites
 * ---------------------------------------
 * Hand-drawn pixel art. Every character below maps to one pixel.
 * These are rendered to crisp SVG so they scale to any size without blur.
 *
 * Legend of the shared characters:
 *   .  transparent
 *   k  dark outline
 *   c  window glass
 *   w  wheel (dark)
 *   L  headlight
 * Vehicle-specific colours are documented per sprite.
 */

// --- The pixel grids (drawn by hand, 16 wide) -----------------------------

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

const BUS = [
  "................",
  ".kkkkkkkkkkkkk..",
  "kBBBBBBBBBBBBBk.",
  "kBcccBcccBcccBk.",
  "kBcccBcccBcccLk.",
  "kBBBBBBBBBBBBLk.",
  "kBBBBBBBBBBBBBk.",
  "kWWkBBBBBBBBBBk.",
  "kWWkBBBBBBBBBBk.",
  "kkkkkkkkkkkkkk..",
  "..ww......ww....",
  "..ww......ww....",
];

const TRAM = [
  ".......k........",
  "......kkk.......",
  ".kkkkkkkkkkkk...",
  "kRRRRRRRRRRRRRk.",
  "kRccRccRccRccLk.",
  "kRccRccRccRccLk.",
  "kRRRRRRRRRRRRRk.",
  "kYYYYYYYYYYYYYk.",
  "kRRRRRRRRRRRRRk.",
  "kkkkkkkkkkkkkk..",
  "...ww......ww...",
  "...ww......ww...",
];

const METRO = [
  "................",
  "..kkkkkkkkkkkkk.",
  ".kSSSSSSSSSSSSSk",
  ".kGGGGGGGGGGGGGk",
  "kGccGccGccGccGLk",
  "kGccGccGccGccGLk",
  "kGGGGGGGGGGGGGGk",
  "kSSSSSSSSSSSSSSk",
  "kGGGGGGGGGGGGGGk",
  "kkkkkkkkkkkkkkk.",
  "..ww......ww....",
  "..ww......ww....",
];

// A tiny walking pixel-person (used for FOOT / WALK legs)
const WALK = [
  "..kk....",
  ".kSSk...",
  ".kSSk...",
  "..kk....",
  ".kBBBk..",
  "kBBBBBk.",
  "kBBBBBk.",
  ".kBBBk..",
  "..k.k...",
  ".kk.kk..",
  ".k...k..",
  "kk...kk.",
];

// A little pixel destination flag (used for the finish marker)
const FLAG = [
  "k.......",
  "kRRRRR..",
  "kRRRRRR.",
  "kRRRRR..",
  "kWWWW...",
  "k.......",
  "k.......",
  "k.......",
  "k.......",
  "kk......",
  "kkk.....",
  "........",
];

// Quinlan himself — an 8-bit portrait drawn from his photo.
// (brown skin, fade haircut, full goatee, ear stud, charcoal quarter-zip
//  over a white tee with a silver zipper). Extra legend for this sprite:
//   S/s skin + shadow · H hair · P brow/pupil · E eye white · B beard
//   M lip · n nostril · Z/z sweater · W white tee · I zipper · R ear stud
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
  "..BSSSSMMMMSSSSB..",
  "..sSSBBBBBBBBSSs..",
  "...ssBBBBBBBBss...",
  "......sSSSSs......",
  "....ZZZWWWWZZZ....",
  ".ZZZZZWWIIWWZZZZZ.",
  "ZZZZZZWWIIWWZZZZZZ",
  "ZZZZZZZWIIWZZZZZZZ",
  "ZZZZZZZZIIZZZZZZZZ",
];

const QUINLAN_PAL = {
  H: "#17171f", S: "#8d5a3c", s: "#6b4329", E: "#f2efe6", P: "#241712",
  B: "#221812", M: "#4e2c1e", n: "#5e3925", Z: "#2f333b", z: "#23262d",
  W: "#f4f4f4", I: "#b9c4cf", R: "#eef0f8", o: "#3a2218", C: "#73eff7",
};

// Build a mood variant by swapping a couple of rows.
function quinlanMood(mood) {
  const g = QUINLAN.slice();
  if (mood === "happy") {
    g[11] = "..BSSSSMWWMSSSSB.."; // grin with teeth
  } else if (mood === "panic") {
    g[7] = "..HSEEEPEEPEEESH.."; // wide eyes
    g[9] = "..RSSSSSnnSSSSCB.."; // sweat drop (C) on the cheek
    g[11] = "..BSSSSMooMSSSSB.."; // small worried mouth
  } else if (mood === "sleepy") {
    g[6] = "..HSSSSSSSSSSSSH..";
    g[7] = "..HSSPPSSSSPPSSH.."; // closed eyes
    g[11] = "..BSSSSMooMSSSSB..";
  }
  return g;
}

// --- Palettes -------------------------------------------------------------

const PAL = {
  k: "#12132b", // outline
  w: "#2a2d3a", // wheel
  c: "#bfeaff", // window glass
  L: "#fff29b", // headlight
  S: "#c7d2dc", // silver
  W: "#9fdcff", // door / white accent
  R: "#e23b4e", // red
  Y: "#ffd23b", // yellow
  B: "#1f6feb", // blue
  G: "#2fbf71", // green
};

// Per-sprite palette overrides so each vehicle has its own identity
const SPRITES = {
  train: { grid: TRAIN, pal: { ...PAL, B: "#1f6feb", Y: "#ffd23b" } }, // NS: blauw + geel
  bus:   { grid: BUS,   pal: { ...PAL, B: "#2f7de0", W: "#9fdcff" } }, // stadsbus
  tram:  { grid: TRAM,  pal: { ...PAL, R: "#e23b4e", Y: "#ffd23b" } }, // rode tram
  metro: { grid: METRO, pal: { ...PAL, G: "#2fbf71", S: "#c7d2dc" } }, // groene metro
  walk:  { grid: WALK,  pal: { ...PAL, B: "#4b6cff", S: "#f0c088" } }, // wandelaar
  flag:  { grid: FLAG,  pal: { ...PAL, R: "#e23b4e", W: "#f4f4f4" } }, // finish
  // Quinlan, our hero — one entry per mood
  quinlan:        { grid: QUINLAN,               pal: QUINLAN_PAL },
  quinlan_happy:  { grid: quinlanMood("happy"),  pal: QUINLAN_PAL },
  quinlan_panic:  { grid: quinlanMood("panic"),  pal: QUINLAN_PAL },
  quinlan_sleepy: { grid: quinlanMood("sleepy"), pal: QUINLAN_PAL },
};

// --- Renderer -------------------------------------------------------------

/**
 * Turn a pixel grid into a crisp, scalable SVG string.
 * Consecutive same-colour pixels in a row are merged into one <rect>
 * to keep the markup small.
 */
function renderSprite(name, { scale = 1, className = "" } = {}) {
  const spec = SPRITES[name];
  if (!spec) return "";
  const { grid, pal } = spec;
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  let rects = "";
  for (let y = 0; y < h; y++) {
    const row = grid[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === "." || ch === " " || !pal[ch]) { x++; continue; }
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${pal[ch]}"/>`;
      x += run;
    }
  }
  const px = w * scale;
  const pxH = h * scale;
  return (
    `<svg class="sprite ${className}" width="${px}" height="${pxH}" ` +
    `viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" ` +
    `shape-rendering="crispEdges" role="img" aria-label="${name}">` +
    rects +
    `</svg>`
  );
}

/** Map a MOTIS transport mode onto one of our sprites. */
function spriteForMode(mode) {
  switch ((mode || "").toUpperCase()) {
    case "BUS":
    case "COACH":
      return "bus";
    case "TRAM":
    case "CABLE_CAR":
    case "FUNICULAR":
      return "tram";
    case "SUBWAY":
    case "METRO":
      return "metro";
    case "RAIL":
    case "HIGHSPEED_RAIL":
    case "LONG_DISTANCE":
    case "NIGHT_RAIL":
    case "REGIONAL_RAIL":
    case "REGIONAL_FAST_RAIL":
    case "SUBURBAN":
      return "train";
    case "WALK":
    case "FOOT":
    case "BIKE":
    case "CAR":
      return "walk";
    default:
      return "bus";
  }
}

// Expose for the browser (no bundler needed)
window.QLR_SPRITES = { renderSprite, spriteForMode, SPRITES };
