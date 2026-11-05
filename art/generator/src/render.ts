import type { V3 } from './sdf.ts';
import type { Layer, Piece } from './character.ts';
import { materialTexture } from './textures.ts';

export type Palette = {
  light: { dir: V3; ambient: number };
  outline: string;
  shadow: { color: string; alpha: number };
  ramps: Record<string, string[]>;
};

// scale: screen pixels per character unit. characterPitchDeg: how far the camera
// looks down when drawing characters. The ground grid, buildings and props use 30.
// ss: supersamples per axis (default 4); large static objects can use fewer.
export type Cell = { w: number; h: number; ox: number; oy: number; scale: number; characterPitchDeg: number; ss?: number };

// One rendered layer before colouring. Indexed by y * w + x.
export type Raw = {
  layer: Layer;
  cell: Cell;
  mask: Uint8Array;
  mat: (string | null)[];
  tone: Int8Array;
  depth: Float32Array;
};

// True isometric ground: the camera looks down 30 degrees, so a ground square becomes a 2:1 diamond.
const PITCH = Math.PI / 6;

// Distance to the layer: the nearest piece, each trimmed by its cut. A piece with
// bounds is skipped while the point is well outside them; the distance to its
// bounding sphere is a safe step, so big models with many parts stay quick.
function layerDist(pieces: Piece[], x: number, y: number, z: number): { d: number; piece: Piece } {
  let best = Infinity, piece = pieces[0];
  for (const p of pieces) {
    if (p.bounds) {
      const bd = Math.hypot(x - p.bounds.c[0], y - p.bounds.c[1], z - p.bounds.c[2]) - p.bounds.r;
      if (bd > 1) { if (bd < best) { best = bd; piece = p; } continue; }
    }
    const d = Math.max(p.shape(x, y, z), p.cut(x, y, z));
    if (d < best) { best = d; piece = p; }
  }
  return { d: best, piece };
}

// yaw: the direction the character faces, 0 = toward the viewer (south).
export function renderLayer(layer: Layer, yaw: number, cell: Cell, palette: Palette): Raw {
  const n = cell.w * cell.h;
  const raw: Raw = {
    layer, cell,
    mask: new Uint8Array(n), mat: new Array(n).fill(null), tone: new Int8Array(n), depth: new Float32Array(n).fill(-1e9),
  };
  // Occluders: surfaces this layer sits on (the body). They are never drawn
  // here, but a ray that reaches one first leaves this layer empty.
  const occ = layer.occluders ?? [];
  const occSdf = (x: number, y: number, z: number) => {
    let d = Infinity;
    for (const f of occ) d = Math.min(d, f(x, y, z));
    return d;
  };
  const pitch = (cell.characterPitchDeg * Math.PI) / 180;
  const CAM_U: V3 = [0, Math.cos(pitch), -Math.sin(pitch)];  // screen up
  const CAM_B: V3 = [0, Math.sin(pitch), Math.cos(pitch)];   // toward the viewer
  const k = cell.scale;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const L = norm(palette.light.dir);
  const bc = layer.bounds.c, br = layer.bounds.r;
  const SS = cell.ss ?? 4;
  const far = 400 + br + Math.hypot(bc[0], bc[1], bc[2]); // ray start, in front of everything

  // Screen-space box for the bounding sphere.
  const wc = toWorld(bc, cy, sy);
  const scx = wc[0], scy = dot(wc, CAM_U);
  const x0 = Math.max(0, Math.floor(cell.ox + (scx - br) * k - 1)), x1 = Math.min(cell.w - 1, Math.ceil(cell.ox + (scx + br) * k + 1));
  const y0 = Math.max(0, Math.floor(cell.oy - (scy + br) * k - 1)), y1 = Math.min(cell.h - 1, Math.ceil(cell.oy - (scy - br) * k + 1));

  // Ray direction (away from the viewer) in character space.
  const dw: V3 = [-CAM_B[0], -CAM_B[1], -CAM_B[2]];
  const dc = toChar(dw, cy, sy);

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      let hits = 0, cutHits = 0, nx = 0, ny = 0, nz = 0, dep = 0, dtSum = 0;
      const mats = new Map<string, number>();
      for (let j = 0; j < SS; j++) {
        for (let i = 0; i < SS; i++) {
          const sxp = (px + (i + 0.5) / SS - cell.ox) / k;
          const syp = (cell.oy - (py + (j + 0.5) / SS)) / k;
          const ow: V3 = [sxp + CAM_B[0] * far, syp * CAM_U[1] + CAM_B[1] * far, syp * CAM_U[2] + CAM_B[2] * far];
          const oc = toChar(ow, cy, sy);
          // Clip the ray to the bounding sphere.
          const ocx = oc[0] - bc[0], ocy = oc[1] - bc[1], ocz = oc[2] - bc[2];
          const bq = ocx * dc[0] + ocy * dc[1] + ocz * dc[2];
          const cq = ocx * ocx + ocy * ocy + ocz * ocz - br * br;
          const disc = bq * bq - cq;
          if (disc < 0) continue;
          let t = -bq - Math.sqrt(disc);
          const tEnd = -bq + Math.sqrt(disc);
          let hit: Piece | null = null, hx = 0, hy = 0, hz = 0;
          for (let step = 0; step < 300 && t < tEnd; step++) {
            hx = oc[0] + dc[0] * t; hy = oc[1] + dc[1] * t; hz = oc[2] + dc[2] * t;
            const r = layerDist(layer.pieces, hx, hy, hz);
            const o = occ.length ? occSdf(hx, hy, hz) : Infinity;
            if (o < 0.02 && o <= r.d) break; // the body is in front
            if (r.d < 0.02) { hit = r.piece; break; }
            t += Math.max(Math.min(r.d, o) * 0.8, 0.03);
          }
          if (!hit) continue;
          // A hit inside the surface is a cut face (the stump where another
          // segment begins). Hidden while that segment is attached.
          if (hit.shape(hx, hy, hz) < -0.12) { cutHits++; continue; }
          let mat: string | null = hit.mat(hx, hy, hz);
          let dt = 0;
          if (hit.paint) {
            const r = hit.paint(hx, hy, hz, mat);
            if (r) {
              if (r.mat !== undefined) mat = r.mat;
              dt = r.dt ?? 0;
            }
          }
          if (mat === null) continue; // overlay pixel with nothing painted
          dt += materialTexture(mat, hx, hy, hz);
          const e = 0.05, f = hit.shape;
          let gx = f(hx + e, hy, hz) - f(hx - e, hy, hz);
          let gy = f(hx, hy + e, hz) - f(hx, hy - e, hz);
          let gz = f(hx, hy, hz + e) - f(hx, hy, hz - e);
          let gl = Math.hypot(gx, gy, gz) || 1;
          gx /= gl; gy /= gl; gz /= gl;
          if (hit.bump) {
            const b = hit.bump(hx, hy, hz);
            gx += b[0]; gy += b[1]; gz += b[2];
            gl = Math.hypot(gx, gy, gz) || 1;
            gx /= gl; gy /= gl; gz /= gl;
          }
          hits++;
          nx += gx; ny += gy; nz += gz;
          const hw = toWorld([hx, hy, hz], cy, sy);
          dep += dot(hw, CAM_B);
          dtSum += dt;
          mats.set(mat, (mats.get(mat) ?? 0) + 1);
        }
      }
      // A pixel on a segment boundary is shared: samples that met the cut face belong
      // to the neighbour. Fill when this layer holds at least its share, so the
      // seam never opens a hole.
      if (hits === 0 || hits < cutHits || (hits + cutHits) * 2 < SS * SS) continue;
      const idx = py * cell.w + px;
      let bestMat = '', bestCount = -1;
      for (const [m, c] of mats) if (c > bestCount) { bestMat = m; bestCount = c; }
      // Normal to camera space, then light it.
      const nw = toWorld(norm([nx, ny, nz]), cy, sy);
      const nc: V3 = [nw[0], dot(nw, CAM_U), dot(nw, CAM_B)];
      const diffuse = dot(nc, L);
      const ramp = palette.ramps[bestMat];
      const amb = palette.light.ambient;
      const lit = Math.min(1, Math.max(0, amb + (1 - amb) * (0.34 + 0.78 * diffuse)));
      // Glowing materials (fire, embers) ignore the light: their paint picks the tone.
      const glow = bestMat.startsWith('glow');
      const tone = Math.round((glow ? ramp.length - 1 : lit * (ramp.length - 1)) + dtSum / hits);
      raw.mask[idx] = 1;
      raw.mat[idx] = bestMat;
      raw.tone[idx] = Math.max(1, Math.min(ramp.length - 1, tone)); // tone 0 is kept for outlines
      raw.depth[idx] = dep / hits;
    }
  }
  return raw;
}

// ---------- post-process: clean-up, selective outline, colour ----------

const N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]] as const;

// Remove lone tone pixels: a pixel whose tone matches none of its same-material
// neighbours takes the most common neighbouring tone.
function cleanTones(r: Raw) {
  const { w, h } = r.cell;
  const out = r.tone.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!r.mask[i]) continue;
      let same = 0, count = 0;
      const votes = new Map<number, number>();
      for (const [dx, dy] of N4) {
        const j = (y + dy) * w + x + dx;
        if (!r.mask[j] || r.mat[j] !== r.mat[i]) continue;
        count++;
        if (r.tone[j] === r.tone[i]) same++;
        votes.set(r.tone[j], (votes.get(r.tone[j]) ?? 0) + 1);
      }
      if (count >= 3 && same === 0) {
        let best = r.tone[i], bc = 0;
        for (const [t, c] of votes) if (c > bc) { best = t; bc = c; }
        out[i] = best;
      }
    }
  }
  r.tone.set(out);
}

export type Rgba = Uint8ClampedArray;

// Colour every layer. Outlines are decided against all the other layers: an edge
// pixel is outlined when what lies beyond it is empty or clearly further away.
export function colourLayers(raws: Raw[], palette: Palette): Map<string, Rgba> {
  const out = new Map<string, Rgba>();
  if (raws.length === 0) return out;
  const { w, h } = raws[0].cell;
  for (const r of raws) cleanTones(r);
  // Nearest depth of any other layer at each pixel.
  const nearest = (exclude: Raw, i: number) => {
    let best = -1e9;
    for (const o of raws) if (o !== exclude && o.mask[i] && o.depth[i] > best) best = o.depth[i];
    return best;
  };
  const outlineRgb = hex(palette.outline);
  const GAP = 3.5;
  for (const r of raws) {
    const px = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!r.mask[i]) continue;
        const ramp = palette.ramps[r.mat[i]!];
        let edge: 'none' | 'lit' | 'dark' | 'inner' = 'none';
        for (const [dx, dy] of N4) {
          const xx = x + dx, yy = y + dy;
          const j = yy * w + xx;
          const inside = xx >= 0 && yy >= 0 && xx < w && yy < h && r.mask[j];
          if (inside) {
            if (r.depth[i] - r.depth[j] > GAP) edge = edge === 'none' ? 'inner' : edge;
            continue;
          }
          const other = xx >= 0 && yy >= 0 && xx < w && yy < h ? nearest(r, j) : -1e9;
          if (other === -1e9) {
            const litSide = dx < 0 || dy < 0;
            if (!litSide) edge = 'dark';
            else if (edge !== 'dark') edge = 'lit';
          } else if (r.depth[i] - other > GAP && edge === 'none') {
            edge = 'inner';
          }
        }
        let rgb: [number, number, number];
        if (r.mat[i]!.startsWith('glow')) rgb = hex(ramp[r.tone[i]]); // light sources are never outlined
        else if (edge === 'dark') rgb = outlineRgb;
        else if (edge === 'lit' || edge === 'inner') rgb = hex(ramp[0]);
        else rgb = hex(ramp[r.tone[i]]);
        px.set([rgb[0], rgb[1], rgb[2], 255], i * 4);
      }
    }
    out.set(r.layer.id, px);
  }
  return out;
}

// Ground shadow: a soft-edged ellipse would blur, so it is a hard ellipse at fixed alpha.
export function shadowLayer(cell: Cell, palette: Palette, rx = 17, rz = 11): Rgba {
  const px = new Uint8ClampedArray(cell.w * cell.h * 4);
  const [r, g, b] = hex(palette.shadow.color);
  const a = Math.round(palette.shadow.alpha * 255);
  const ry = rz * Math.sin(PITCH);
  for (let y = 0; y < cell.h; y++) {
    for (let x = 0; x < cell.w; x++) {
      const dx = (x + 0.5 - cell.ox) / rx, dy = (y + 0.5 - cell.oy) / ry;
      if (dx * dx + dy * dy <= 1) px.set([r, g, b, a], (y * cell.w + x) * 4);
    }
  }
  return px;
}

// Draw layers in order. Each solid layer first darkens what is already drawn
// beneath the spot it shades (offset away from the top-left light).
// depths[k] is the per-pixel depth of images[k] (null for flat layers like the
// ground shadow). A shadow lands only where the caster is clearly in front, so a
// continuous surface (forearm into upper arm) never shades itself.
export function composite(
  cell: Cell, images: Rgba[], cast?: { dx: number; dy: number; multiply: number }, depths?: (Float32Array | null)[],
): Rgba {
  const out = new Uint8ClampedArray(cell.w * cell.h * 4);
  const shaded = new Uint8Array(cell.w * cell.h);
  const outDepth = new Float32Array(cell.w * cell.h).fill(-1e9);
  for (let k = 0; k < images.length; k++) {
    const img = images[k];
    const dep = depths?.[k] ?? null;
    if (cast && dep) {
      for (let y = 0; y < cell.h; y++) for (let x = 0; x < cell.w; x++) {
        if (img[(y * cell.w + x) * 4 + 3] !== 255) continue;
        const tx = x + cast.dx, ty = y + cast.dy;
        if (tx >= cell.w || ty >= cell.h) continue;
        const q = ty * cell.w + tx;
        if (img[q * 4 + 3] === 255 || out[q * 4 + 3] !== 255 || shaded[q]) continue;
        if (dep[y * cell.w + x] - outDepth[q] < 2.5) continue;
        shaded[q] = 1;
        for (let c = 0; c < 3; c++) out[q * 4 + c] *= cast.multiply;
      }
    }
    for (let i = 0; i < out.length; i += 4) {
      const a = img[i + 3] / 255;
      if (a === 0) continue;
      const ia = 1 - a;
      out[i] = img[i] * a + out[i] * ia;
      out[i + 1] = img[i + 1] * a + out[i + 1] * ia;
      out[i + 2] = img[i + 2] * a + out[i + 2] * ia;
      out[i + 3] = Math.max(out[i + 3], img[i + 3]);
      if (img[i + 3] === 255) { shaded[i / 4] = 0; if (dep) outDepth[i / 4] = dep[i / 4]; }
    }
  }
  return out;
}

// ---------- maths ----------

function dot(a: V3, b: V3) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function norm(a: V3): V3 { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
export function toWorld(p: V3, c: number, s: number): V3 { return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
export function toChar(p: V3, c: number, s: number): V3 { return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c]; }
export function hex(h: string): [number, number, number] {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
