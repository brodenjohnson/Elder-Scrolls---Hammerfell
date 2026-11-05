import { hash3, pnoise2, type V3 } from './sdf.ts';
import { hex, type Palette, type Rgba } from './render.ts';

// ---------- ground tiles ----------
//
// A tile is a 64 by 32 diamond on the true isometric grid (30 degree pitch).
// Inside it, (a, b) run 0 to 1 along the two grid axes: a toward the bottom
// right, b toward the bottom left. Each ground material is a function of (a, b)
// giving a height (for shading) and a tone nudge. Everything that varies is built
// from noise that wraps once per tile, so any tile sits next to any copy of
// itself, and next to any other tile of the same material, with no seam.
//
// Transitions use overlays rather than a full set of blended tiles: a tile keeps
// its own material and draws its higher-priority neighbours over its edges and
// corners. Eight overlays per material (four edges, four corners) cover every
// arrangement, including inner corners (two edges together).

export const TILE_W = 64, TILE_H = 32;
const SS = 4;

export type GroundSample = { mat: string; h: number; dt?: number };
export type GroundFn = (a: number, b: number) => GroundSample;

const TAU = Math.PI * 2;
const wrap = (x: number, p: number) => ((x % p) + p) % p;

// Periodic Voronoi on an n by n lattice per tile: distance to the nearest and second nearest point.
function voronoi(a: number, b: number, n: number, seed: number) {
  const u = a * n, v = b * n, iu = Math.floor(u), iv = Math.floor(v);
  let d1 = 9, d2 = 9;
  for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) {
    const cu = iu + du, cv = iv + dv;
    const px = cu + hash3(wrap(cu, n), wrap(cv, n), seed), py = cv + hash3(wrap(cu, n), wrap(cv, n), seed + 1);
    const d = Math.hypot(px - u, py - v);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return { d1, d2 };
}
// Hash on a lattice that wraps once per tile.
const phash = (a: number, b: number, n: number, seed: number) =>
  hash3(wrap(Math.floor(a * n), n), wrap(Math.floor(b * n), n), seed);

// 1 inside the tile, falling to 0 near its edges: tile-only details (pebbles,
// shells) stay away from the seams so variants still join their neighbours.
const inner = (a: number, b: number, m = 0.14) =>
  Math.min(1, Math.min(a, 1 - a, b, 1 - b) / m);

// ---------- materials ----------

export const ground: Record<string, (variant: number) => GroundFn> = {
  'sand.desert': (variant) => (a, b) => {
    const warp = 0.35 * pnoise2(a * 3, b * 3, 3, 11);
    let h = 1.6 * pnoise2(a * 4, b * 4, 4, 12) + 0.55 * Math.sin(TAU * (4 * a + 2 * b + warp));
    let dt = phash(a, b, 40, 13) < 0.05 ? -1 : 0;
    // Variant 1: a scatter of small stones. Variant 2: a little wind ridge.
    if (variant === 1) {
      const v = voronoi(a, b, 6, 14);
      if (v.d1 < 0.14 * inner(a, b) && phash(a, b, 6, 15) < 0.45) return { mat: 'rock', h: 3 * (0.14 - v.d1) * 10 };
    }
    if (variant === 2) h += 1.2 * inner(a, b, 0.3) * Math.exp(-(((a - b) * 2.4) ** 2));
    return { mat: 'sand.desert', h, dt };
  },
  'sand.beach': (variant) => (a, b) => {
    const h = 0.9 * pnoise2(a * 5, b * 5, 5, 21) + 0.3 * Math.sin(TAU * (a + 2 * b + 0.8 * pnoise2(a * 2, b * 2, 2, 25)));
    if (variant === 1) {
      const v = voronoi(a, b, 7, 22);
      if (v.d1 < 0.07 * inner(a, b) && phash(a, b, 7, 23) < 0.35) return { mat: 'foam', h: 1, dt: -1 }; // shells
    }
    return { mat: 'sand.beach', h, dt: phash(a, b, 36, 24) < 0.06 ? -1 : 0 };
  },
  'earth.cracked': () => (a, b) => {
    const v = voronoi(a, b, 3, 31);
    const edge = v.d2 - v.d1;
    if (edge < 0.035 + 0.03 * pnoise2(a * 8, b * 8, 8, 33)) return { mat: 'earth.cracked', h: -1, dt: -2 };
    // Plates curl up a little at their edges.
    return { mat: 'earth.cracked', h: Math.min(edge, 0.3) * -4 + 0.8 * pnoise2(a * 6, b * 6, 6, 32) };
  },
  road: () => (a, b) => {
    // Two cart ruts along the b axis, with pebbles.
    const rut = Math.exp(-(((a - 0.3) * 10) ** 2)) + Math.exp(-(((a - 0.7) * 10) ** 2));
    const v = voronoi(a, b, 8, 41);
    if (v.d1 < 0.09 && phash(a, b, 8, 42) < 0.3) return { mat: 'rock', h: 2 };
    return { mat: 'road', h: -1.2 * rut + 0.8 * pnoise2(a * 6, b * 6, 6, 43), dt: phash(a, b, 32, 44) < 0.08 ? -1 : 0 };
  },
  'grass.coast': (variant) => (a, b) => {
    // Clumps, then blades: a blade is a light cell with a dark cell under it.
    const clump = pnoise2(a * 4, b * 4, 4, 51);
    const blade = phash(a, b, 26, 52);
    let dt = blade > 0.82 ? 1 : blade < 0.22 ? -1 : 0;
    if (clump > 0.72) dt += 1;
    if (clump < 0.25) dt -= 1;
    if (variant === 1) {
      // A few dry flowers.
      const v = voronoi(a, b, 7, 53);
      if (v.d1 < 0.06 * inner(a, b) && phash(a, b, 7, 54) < 0.3) return { mat: 'cloth.ochre', h: 1, dt: 1 };
    }
    return { mat: 'grass.coast', h: 2.4 * clump, dt };
  },
  'water.shallow': () => (a, b) => {
    const h = 0.6 * Math.sin(TAU * (2 * a + 3 * b + 0.5 * pnoise2(a * 3, b * 3, 3, 61))) + 0.6 * pnoise2(a * 6, b * 6, 6, 62);
    return { mat: 'water.shallow', h, dt: phash(a, b, 30, 63) > 0.97 ? 2 : 0 };
  },
  'water.deep': () => (a, b) => {
    const h = 0.8 * Math.sin(TAU * (a + 2 * b + 0.6 * pnoise2(a * 2, b * 2, 2, 71))) + 0.5 * pnoise2(a * 5, b * 5, 5, 72);
    return { mat: 'water.deep', h, dt: phash(a, b, 30, 73) > 0.985 ? 2 : 0 };
  },
};

// Where on the ramp a flat patch of each material sits (0 dark, 1 light). Slopes move off it.
const BASE: Record<string, number> = {
  'sand.desert': 0.62, 'sand.beach': 0.62, 'sand.wet': 0.55, 'earth.cracked': 0.6, road: 0.6, rock: 0.6,
  'grass.coast': 0.55, 'water.shallow': 0.5, 'water.deep': 0.5, foam: 0.7, 'cloth.ochre': 0.8,
};

// Overlay sides. a0 means the neighbour at a - 1, and so on. Corners name both.
export const EDGES = ['a0', 'a1', 'b0', 'b1'] as const;
export const CORNERS = ['a0b0', 'a0b1', 'a1b0', 'a1b1'] as const;
export type Side = (typeof EDGES)[number] | (typeof CORNERS)[number];

// How far a material reaches into its neighbour, varying along the edge. The
// noise wraps once per tile so a run of edge overlays joins up, and the corner
// radius equals the edge reach at the tile corner so edges and corners meet.
const REACH = (t: number, seed: number) => 0.3 + 0.2 * pnoise2(t * 4, 0.5, 4, seed);

function overlayCoverage(side: Side, a: number, b: number, seed: number): number {
  // Returns how far inside the overlay the point is (positive inside), in tile units.
  const da = side.includes('a0') ? a : 1 - a;
  const db = side.includes('b0') ? b : 1 - b;
  if (side.length === 2) {
    const along = side[0] === 'a' ? b : a;
    const dist = side[0] === 'a' ? da : db;
    return REACH(along, seed) - dist;
  }
  // A corner: a rounded quarter whose radius matches the edge reach at that corner.
  const r = REACH(0, seed);
  return r - Math.hypot(da, db);
}

// ---------- rendering ----------

// Grid axes and camera, as in render.ts: world x right, y up, z toward the viewer.
const P = Math.PI / 6;
const U: V3 = [0, Math.cos(P), -Math.sin(P)], B: V3 = [0, Math.sin(P), Math.cos(P)];
const AX: V3 = [Math.SQRT1_2, 0, Math.SQRT1_2], BX: V3 = [-Math.SQRT1_2, 0, Math.SQRT1_2];
export const TILE_SIDE = TILE_W / (Math.SQRT2 * 0.88); // tile edge in character units (scale 0.88)

function shade(fn: GroundFn, a: number, b: number, palette: Palette) {
  const e = 0.004;
  const s = fn(a, b);
  const dhda = (fn(a + e, b).h - fn(a - e, b).h) / (2 * e * TILE_SIDE);
  const dhdb = (fn(a, b + e).h - fn(a, b - e).h) / (2 * e * TILE_SIDE);
  const n: V3 = [-dhda * AX[0] - dhdb * BX[0], 1, -dhda * AX[2] - dhdb * BX[2]];
  const nl = Math.hypot(n[0], n[1], n[2]);
  const nc: V3 = [n[0] / nl, (n[1] * U[1] + n[2] * U[2]) / nl, (n[1] * B[1] + n[2] * B[2]) / nl];
  const L = palette.light.dir, ll = Math.hypot(L[0], L[1], L[2]);
  const diffuse = (nc[0] * L[0] + nc[1] * L[1] + nc[2] * L[2]) / ll;
  const flat = (U[1] * L[1] + B[1] * L[2]) / ll; // the same, for level ground
  return { mat: s.mat, light: (diffuse - flat) * 2.2, dt: s.dt ?? 0 };
}

// Render one tile, or one overlay when `side` is given (pixels outside it stay clear).
// `edgeMat` turns a band along the overlay's border into another material (wet sand
// at a shoreline) and `rim` draws a line just outside it (foam).
export function renderTile(
  fn: GroundFn, palette: Palette,
  opts: { side?: Side; seed?: number; edgeMat?: string; edgeBand?: number; rim?: string } = {},
): Rgba {
  const px = new Uint8ClampedArray(TILE_W * TILE_H * 4);
  for (let py = 0; py < TILE_H; py++) {
    for (let x = 0; x < TILE_W; x++) {
      // A pixel belongs to the tile when its centre does, so neighbouring tiles
      // share out the pixels exactly. Samples may fall just outside; the
      // materials wrap, so that is the neighbour's ground anyway.
      const cx = (x + 0.5 - TILE_W / 2) / (TILE_W / 2), cy = (py + 0.5) / (TILE_H / 2);
      const ca = (cx + cy) / 2, cb = (cy - cx) / 2;
      if (ca < 0 || ca >= 1 || cb < 0 || cb >= 1) continue;
      const mats = new Map<string, number>();
      let light = 0, dt = 0, n = 0, total = 0;
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
        const sx = (x + (i + 0.5) / SS - TILE_W / 2) / (TILE_W / 2), sy = (py + (j + 0.5) / SS) / (TILE_H / 2);
        const a = (sx + sy) / 2, b = (sy - sx) / 2;
        total++;
        let s: { mat: string; light: number; dt: number };
        if (opts.side) {
          const c = overlayCoverage(opts.side, a, b, opts.seed ?? 0);
          if (opts.rim && c < 0 && c > -0.045) s = { mat: opts.rim, light: 0, dt: phash(a, b, 24, 9) < 0.3 ? -1 : 0 };
          else if (c < 0) continue;
          else {
            s = shade(fn, a, b, palette);
            if (opts.edgeMat && c < (opts.edgeBand ?? 0.08)) s.mat = opts.edgeMat;
          }
        } else s = shade(fn, a, b, palette);
        n++;
        light += s.light; dt += s.dt;
        mats.set(s.mat, (mats.get(s.mat) ?? 0) + 1);
      }
      if (n * 2 < total) continue; // overlay: mostly outside its reach
      // Texture nudges come from the pixel centre: averaging them would blur grain to mush.
      dt = Math.round(fn(ca, cb).dt ?? 0) * n;

      let mat = '', best = -1;
      for (const [m, c] of mats) if (c > best) { mat = m; best = c; }
      const ramp = palette.ramps[mat];
      const t = Math.round((BASE[mat] ?? 0.6) * (ramp.length - 1) + (light / n) * (ramp.length - 1) + dt / n);
      const rgb = hex(ramp[Math.max(0, Math.min(ramp.length - 1, t))]);
      px.set([rgb[0], rgb[1], rgb[2], 255], (py * TILE_W + x) * 4);
    }
  }
  return px;
}
