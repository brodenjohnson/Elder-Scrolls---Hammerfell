import { clamp, hash3, sdPrim, vnoise3, type Prim, type V3 } from './sdf.ts';
import { boundsOf, primsSdf, type Fn, type Layer, type PaintResult, type Piece } from './character.ts';
import { colourLayers, composite, hex, renderLayer, toChar, toWorld, type Cell, type Palette, type Rgba } from './render.ts';

// ---------- static objects: buildings, props, creatures, icons ----------
//
// Same shapes, light, ramps and outlines as the characters. Objects are modelled
// in object space (y up, base on y = 0) and drawn at the true isometric pitch,
// turned 45 degrees so their sides line up with the tile grid. One unit is the
// same size as on the character: a tile edge is about 51 units.

type Paint = (x: number, y: number, z: number, mat: string) => PaintResult | null;
type Group = { sdf: Fn; mat: (x: number, y: number, z: number) => string; bounds: { c: V3; r: number }; paint?: Paint };

const frac = (x: number) => x - Math.floor(x);
const box = (c: V3, h: V3, mat: string, round = 0, sub = false): Prim => ({ kind: 'box', c, h, round, mat, sub });
const ell = (c: V3, r: V3, mat: string, sub = false): Prim => ({ kind: 'ell', c, r, mat, sub });
const cone = (a: V3, b: V3, r1: number, r2: number, mat: string): Prim => ({ kind: 'cone', a, b, r1, r2, mat });

// The material of whichever solid prim is nearest.
function nearestMat(prims: Prim[]) {
  const solid = prims.filter((p) => !p.sub);
  return (x: number, y: number, z: number) => {
    let best = Infinity, mat = solid[0].mat;
    for (const p of solid) { const d = sdPrim(p, x, y, z); if (d < best) { best = d; mat = p.mat; } }
    return mat;
  };
}

// A group from prims. `rough` adds noise to the surface (rocks, scrub): amplitude and feature size.
function group(prims: Prim[], k: number, opts: { paint?: Paint; rough?: [number, number][] } = {}): Group {
  const base = primsSdf(prims, k);
  const rough = opts.rough ?? [];
  const sdf: Fn = rough.length
    ? (x, y, z) => {
      let d = base(x, y, z);
      for (const [amp, size] of rough) d += (vnoise3(x / size, y / size, z / size) - 0.5) * amp;
      return d * 0.8;
    }
    : base;
  const margin = rough.reduce((m, [a]) => m + a, 2);
  return { sdf, mat: nearestMat(prims), bounds: boundsOf(prims, margin), paint: opts.paint };
}

function custom(sdf: Fn, mat: string, bounds: { c: V3; r: number }, paint?: Paint): Group {
  return { sdf, mat: () => mat, bounds, paint };
}

// A flat strip from a to b (palm fronds, sword blades). `normal` is roughly the
// face direction; widths taper from w1 to w2. `serrate` cuts notches along the
// edges every that many units, for leaflets.
export function ribbon(a: V3, b: V3, w1: number, w2: number, thick: number, normal: V3 = [0, 1, 0], serrate = 0): Fn {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const dir: V3 = [d[0] / len, d[1] / len, d[2] / len];
  let side = cross(normal, dir);
  const sl = Math.hypot(side[0], side[1], side[2]) || 1;
  side = [side[0] / sl, side[1] / sl, side[2] / sl];
  const nrm = cross(dir, side);
  return (x, y, z) => {
    const px = x - a[0], py = y - a[1], pz = z - a[2];
    const t = (px * dir[0] + py * dir[1] + pz * dir[2]) / len;
    const s = px * side[0] + py * side[1] + pz * side[2];
    const n = px * nrm[0] + py * nrm[1] + pz * nrm[2];
    const w = w1 + (w2 - w1) * clamp(t, 0, 1);
    let dd = Math.max(Math.abs(n) - thick, Math.abs(s) - w, -t * len, (t - 1) * len);
    if (serrate && Math.abs(s) > 0.3 * w && frac((t * len) / serrate + (s > 0 ? 0.5 : 0)) < 0.42) dd = Math.max(dd, 0.6);
    return dd;
  };
}

// A solid of revolution about the y axis, radius r(y) between y0 and y1.
function revolve(r: (y: number) => number, y0: number, y1: number): Fn {
  return (x, y, z) => Math.max((Math.hypot(x, z) - r(clamp(y, y0, y1))) * 0.75, y0 - y, y - y1);
}

function cross(a: V3, b: V3): V3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

function layerOf(id: string, groups: Group[]): Layer {
  const pieces: Piece[] = groups.map((g) => ({ shape: g.sdf, cut: () => -Infinity, mat: g.mat, paint: g.paint, bounds: g.bounds }));
  // Enclosing sphere of all the groups.
  const c: V3 = [0, 0, 0];
  for (const g of groups) for (let i = 0; i < 3; i++) c[i] += g.bounds.c[i] / groups.length;
  let r = 0;
  for (const g of groups) r = Math.max(r, Math.hypot(g.bounds.c[0] - c[0], g.bounds.c[1] - c[1], g.bounds.c[2] - c[2]) + g.bounds.r);
  return { id, segment: 'root', slot: 'body', pieces, bounds: { c, r } };
}

// ---------- the Redguard town house ----------
// Plastered mud brick on a sandstone footing, flat roof behind a parapet, roof
// beams (vigas) through the walls, an arched door under a striped awning, and a
// domed room at the back. About 4 m by 3.2 m, walls 2.8 m.

export function house(): Layer {
  const W = 150, D = 120, H = 210, PAR = 16;
  const doorZ = 30;
  const arch = (c: V3, axis: 'x' | 'z', halfW: number, halfH: number, depth: number): Prim[] => {
    const h: V3 = axis === 'x' ? [depth, halfH, halfW] : [halfW, halfH, depth];
    const r: V3 = axis === 'x' ? [depth, halfW, halfW] : [halfW, halfW, depth];
    return [box(c, h, 'plaster', 0, true), ell([c[0], c[1] + halfH, c[2]], r, 'plaster', true)];
  };
  // Plaster walls: sandstone footing and coping, fallen patches showing brick,
  // grime at the foot. The flat roof is packed clay. top: the coping height.
  const wallPaint = (top: number, roofY: number): Paint => (x, y, z, mat) => {
    if (mat !== 'plaster') return null;
    if (Math.abs(y - roofY) < 0.8 && Math.abs(x) < W - 11 && Math.abs(z) < D - 11) {
      return { mat: 'roof', dt: hash3(Math.floor(x / 2), 0, Math.floor(z / 2)) < 0.08 ? -1 : 0 };
    }
    // Sandstone footing and coping, in courses.
    if (y < 16 || (y > top - 4 && y < top + 1)) {
      const row = Math.floor(y / 8);
      const joint = frac(y / 8) < 0.16 || frac((x + z) / 22 + row * 0.5) < 0.07;
      return { mat: 'sandstone', dt: joint ? -1 : 0 };
    }
    // Patches where the plaster has fallen away to show the brick.
    const n = vnoise3(x / 26, y / 18, z / 26);
    if (n > 0.76 && y > 26 && y < top - 14) {
      const row = Math.floor(y / 6);
      const mortar = frac(y / 6) < 0.22 || frac((x + z) / 13 + row * 0.5) < 0.12;
      return { mat: 'mudbrick', dt: mortar ? -2 : 0 };
    }
    if (n > 0.735 && y > 26 && y < top - 14) return { dt: -1 }; // the broken plaster edge
    // Grime rising from the ground.
    if (y < 34 && hash3(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2)) < (34 - y) / 60) return { dt: -1 };
    return null;
  };
  const walls = group([
    box([0, (H + PAR) / 2, 0], [W, (H + PAR) / 2, D], 'plaster', 2),
    box([0, H + PAR, 0], [W - 10, PAR, D - 10], 'plaster', 0, true), // roof inside the parapet
    ...arch([-W, 60, doorZ], 'x', 30, 60, 10),
    ...arch([-W, 132, -72], 'x', 13, 16, 7),
    ...arch([-60, 132, D], 'z', 13, 16, 7),
    ...arch([72, 132, D], 'z', 13, 16, 7),
  ], 0, { paint: wallPaint(H + PAR, H) });

  // The domed back room, rising above the roof.
  const towerPaint = wallPaint(300, -1);
  const tower = group([
    box([85, 150, -65], [65, 150, 55], 'plaster', 2),
    box([85, 302, -65], [69, 4, 59], 'sandstone', 1),
    ell([85, 306, -65], [50, 46, 46], 'plaster'),
    ...arch([20, 252, -65], 'x', 10, 13, 6),
  ], 0, { paint: (x, y, z, mat) => (y > 296 ? null : towerPaint(x, y, z, mat)) });
  const finial = group([cone([85, 348, -65], [85, 366, -65], 3, 0.6, 'brass'), ell([85, 352, -65], [4, 4, 4], 'brass')], 0);

  // Door, window grilles and the dark behind them.
  const lattice: Paint = (x, y, z) => (frac(y / 5.5) < 0.34 || frac((x + z) / 5.5) < 0.34 ? { mat: 'wood.dark' } : { mat: 'void' });
  const openings = group([
    box([-W + 8, 145, -72], [2, 30, 14], 'void'),
    box([-60, 145, D - 8.5], [14, 30, 1.5], 'void'),
    box([72, 145, D - 8.5], [14, 30, 1.5], 'void'),
    box([20.5, 262, -65], [1.5, 26, 11], 'void'),
  ], 0, { paint: lattice });
  const door = group([
    box([-W + 8, 60, doorZ], [3, 60, 29], 'wood'),
    ell([-W + 8, 120, doorZ], [3, 29, 29], 'wood'),
    box([-W - 13, 3, doorZ], [13, 3, 36], 'sandstone', 1),
  ], 0, {
    paint: (x, y, z, mat) => {
      if (mat !== 'wood') return null;
      if (Math.abs(y - 40) < 2 || Math.abs(y - 100) < 2) return { mat: 'iron', dt: hash3(Math.floor(z / 6), 0, 0) < 0.4 ? 1 : 0 };
      return frac((z - doorZ) / 9) < 0.14 ? { dt: -1 } : null;
    },
  });

  // Roof beams through the walls, and a spout.
  const beams: Prim[] = [];
  for (const z of [-100, -60, -20, 20, 60, 100]) beams.push(cone([-W + 4, 196, z], [-W - 15, 196, z], 4.6, 4.2, 'wood'));
  for (const x of [-120, -80, -40, 0, 40, 80, 120]) beams.push(cone([x, 196, D - 4], [x, 196, D + 15], 4.6, 4.2, 'wood'));
  beams.push(cone([125, 214, D - 4], [125, 210, D + 22], 4, 3.5, 'wood.dark'));
  const vigas = group(beams, 0, { paint: (x, y, z) => (Math.min(Math.abs(x + W + 15), Math.abs(z - D - 15)) < 1.2 ? { dt: -1 } : null) });

  // Awning: a sloped striped cloth on two poles.
  const AW = 62, Y0 = 170, Y1 = 147, SL = (Y0 - Y1) / AW, CS = 1 / Math.hypot(1, SL);
  const awning = custom(
    (x, y, z) => {
      const s = -(x + W);
      return Math.max(Math.abs((y - Y0 + SL * s) * CS) - 1.6, -s, s - AW, Math.abs(z - doorZ) - 46);
    },
    'cloth.teal', { c: [-W - AW / 2, 158, doorZ], r: 60 },
    (x, y, z) => {
      const s = -(x + W);
      const stripe = Math.floor((z - doorZ + 46) / 11.5) % 2 === 1;
      return { mat: stripe ? 'cloth.ochre' : 'cloth.teal', dt: s > AW - 3 ? -1 : 0 };
    },
  );
  const poles = group([
    cone([-W - AW + 4, 0, doorZ - 42], [-W - AW + 4, Y1 + 2, doorZ - 42], 2.4, 2.1, 'wood'),
    cone([-W - AW + 4, 0, doorZ + 42], [-W - AW + 4, Y1 + 2, doorZ + 42], 2.4, 2.1, 'wood'),
  ], 0);

  return layerOf('house', [walls, tower, finial, openings, door, vigas, awning, poles]);
}

// ---------- props ----------

export function palm(seed = 1): Layer {
  const lean = 26 + 10 * hash3(seed, 1, 0), H = 262;
  const trunkPt = (t: number): V3 => [lean * t * t, H * t, -8 * t];
  const trunk: Prim[] = [];
  for (let i = 0; i < 8; i++) {
    const t0 = i / 8, t1 = (i + 1) / 8;
    trunk.push(cone(trunkPt(t0), trunkPt(t1), (i === 0 ? 13 : 9.5) - 3.5 * t0, 9.5 - 3.5 * t1, 'bark.palm'));
  }
  const C: V3 = trunkPt(1);
  const nuts = [0, 1, 2].map((i) => ell([C[0] + 6 * Math.cos(i * 2.1), C[1] - 6, C[2] + 6 * Math.sin(i * 2.1)], [5, 5.5, 5], 'wood.dark'));
  const groups: Group[] = [group([...trunk, ...nuts], 1.5)];
  const N = 11;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2 + hash3(seed, i, 2) * 0.4;
    const L = 92 + 22 * hash3(seed, i, 3);
    const rise = 16 + 8 * hash3(seed, i, 4), droop = 58 + 22 * hash3(seed, i, 5);
    const dir: V3 = [Math.cos(th), 0, Math.sin(th)];
    const at = (u: number): V3 => [C[0] + dir[0] * L * u, C[1] + 4 + rise * u * 2 - droop * u * u, C[2] + dir[2] * L * u];
    const segs: Fn[] = [];
    const K = 5;
    for (let s = 0; s < K; s++) {
      const u0 = s / K, u1 = (s + 1) / K;
      const w = (u: number) => 2 + 14 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.8;
      segs.push(ribbon(at(u0), at(u1), w(u0), w(u1), 1.1, [0, 1, 0], 5));
    }
    const dead = hash3(seed, i, 6) < 0.15;
    const ends = [at(0), at(1)];
    const c: V3 = [(ends[0][0] + ends[1][0]) / 2, (ends[0][1] + ends[1][1]) / 2, (ends[0][2] + ends[1][2]) / 2];
    groups.push(custom(
      (x, y, z) => { let d = Infinity; for (const f of segs) d = Math.min(d, f(x, y, z)); return d; },
      dead ? 'leaf.dry' : 'leaf.palm', { c, r: L / 2 + 30 },
    ));
  }
  return layerOf(`palm${seed}`, groups);
}

export function rock(seed = 1): Layer {
  const s = 0.8 + 0.5 * hash3(seed, 7, 1);
  const prims = [
    ell([0, 14 * s, 0], [27 * s, 19 * s, 22 * s], 'sandstone'),
    ell([14 * s, 8 * s, 10 * s], [15 * s, 10 * s, 13 * s], 'sandstone'),
    ell([-12 * s, 6 * s, -8 * s], [14 * s, 9 * s, 12 * s], 'sandstone'),
  ];
  return layerOf(`rock${seed}`, [group(prims, 6, { rough: [[7, 9], [1.6, 2.6]] })]);
}

// A raised block of sandstone two tiles square, with sand on top: how cliffs and ledges are built.
export function cliff(): Layer {
  const S = 51.43, Hh = 70;
  const g = group([box([0, Hh / 2, 0], [S, Hh / 2, S], 'sandstone', 4)], 0, {
    rough: [[3, 16], [0.9, 3]],
    paint: (x, y, z) => (y > Hh - 3 ? { mat: 'sand.desert', dt: hash3(Math.floor(x / 2), 0, Math.floor(z / 2)) < 0.1 ? -1 : 0 } : null),
  });
  return layerOf('cliff', [g]);
}

export function scrub(seed = 1): Layer {
  const prims: Prim[] = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + seed;
    prims.push(ell([10 * Math.cos(a) * hash3(seed, i, 1), 9 + 6 * hash3(seed, i, 2), 10 * Math.sin(a) * hash3(seed, i, 3)], [9, 8, 9], 'leaf.dry'));
  }
  return layerOf(`scrub${seed}`, [group(prims, 4, { rough: [[7, 4], [2.5, 1.6]] })]);
}

export function barrel(): Layer {
  const Hb = 66;
  const shape = revolve((y) => 18 + 4 * Math.sin((Math.PI * y) / Hb), 0, Hb);
  const paint: Paint = (x, y, z) => {
    for (const [a, b] of [[7, 11], [19, 22], [44, 47], [55, 59]]) if (y > a && y < b) return { mat: 'iron', dt: y < a + 1 ? -1 : 0 };
    if (y > Hb - 0.8) return frac(x / 8) < 0.12 ? { dt: -1 } : null; // lid boards
    const ang = Math.atan2(z, x) / (Math.PI * 2);
    return frac(ang * 18) < 0.08 ? { dt: -1 } : null; // staves
  };
  return layerOf('barrel', [custom(shape, 'wood', { c: [0, Hb / 2, 0], r: 42 }, paint)]);
}

export function crate(): Layer {
  const h = 22;
  const frame: Prim[] = [box([0, h, 0], [h, h, h], 'wood', 1)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) frame.push(box([sx * (h - 2.5), h, sz * (h - 2.5)], [3.2, h + 0.4, 3.2], 'wood.dark', 0.6));
  for (const y of [2.5, 2 * h - 2.5]) {
    for (const s of [-1, 1]) {
      frame.push(box([0, y, s * (h - 2.5)], [h + 0.4, 3.2, 3.2], 'wood.dark', 0.6));
      frame.push(box([s * (h - 2.5), y, 0], [3.2, 3.2, h + 0.4], 'wood.dark', 0.6));
    }
  }
  return layerOf('crate', [group(frame, 0, { paint: (x, y, z, mat) => (mat === 'wood' && frac(y / 10.5) < 0.12 ? { dt: -1 } : null) })]);
}

export function pot(scale = 1, name = 'pot'): Layer {
  const s = scale;
  const r = (y: number) => {
    const t = y / s;
    if (t < 20) return s * (7 + 11 * Math.sin((Math.PI / 2) * (t / 20)));
    if (t < 40) return s * (7 + 11 * Math.cos((Math.PI / 2) * ((t - 20) / 20)));
    if (t < 45) return s * 7;
    return s * 9.5;
  };
  const body = revolve(r, 0, 50 * s);
  const mouth = (x: number, y: number, z: number) => Math.max(Math.hypot(x, z) - 6 * s, 44 * s - y);
  const shape: Fn = (x, y, z) => Math.max(body(x, y, z), -mouth(x, y, z));
  const paint: Paint = (x, y, z) => {
    if (y > 44 * s && Math.hypot(x, z) < 6.6 * s) return { mat: 'void' };
    if (y > 25 * s && y < 28 * s) return { mat: 'wood.dark' };
    return null;
  };
  return layerOf(name, [custom(shape, 'clay', { c: [0, 25 * s, 0], r: 32 * s }, paint)]);
}

export function chest(): Layer {
  const lid: Fn = (x, y, z) => Math.max(Math.hypot(y - 26, z) - 17, Math.abs(x) - 26, 26 - y);
  const body = group([
    box([0, 13, 0], [26, 13, 17], 'wood', 1),
    box([-16, 13, 0], [2.6, 13.4, 17.4], 'iron', 0.5),
    box([16, 13, 0], [2.6, 13.4, 17.4], 'iron', 0.5),
    box([0, 22, 17.6], [3.2, 4.2, 1.2], 'brass', 0.4),
  ], 0, { paint: (x, y, z, mat) => (mat === 'wood' && frac(y / 6.5) < 0.15 ? { dt: -1 } : null) });
  const top = custom(lid, 'wood', { c: [0, 32, 0], r: 32 }, (x) => (Math.abs(Math.abs(x) - 16) < 2.6 ? { mat: 'iron' } : null));
  return layerOf('chest', [body, top]);
}

export function campfire(): Layer {
  const stones: Prim[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    stones.push(ell([20 * Math.cos(a), 3, 20 * Math.sin(a)], [6, 4.5, 5.5], 'rock'));
  }
  const logs = group([
    cone([-15, 2, -7], [9, 9, 3], 3.2, 2.6, 'wood.dark'),
    cone([13, 2, -9], [-6, 9, 4], 3.2, 2.6, 'wood.dark'),
    cone([2, 2, 15], [0, 10, -3], 3.2, 2.6, 'wood.dark'),
  ], 0.5, {
    paint: (x, y, z) => {
      const r = Math.hypot(x, z);
      if (r < 7) return { mat: 'glow.fire', dt: -2 - (hash3(Math.floor(x), Math.floor(y), Math.floor(z)) < 0.5 ? 1 : 0) };
      return r < 11 ? { mat: 'ash' } : null;
    },
  });
  const tongues = [cone([0, 4, 0], [0, 34, 0], 8, 0.5, 'f'), cone([6, 4, 3], [8, 24, 2], 5, 0.5, 'f'), cone([-5, 4, -3], [-7, 26, -4], 5, 0.5, 'f')];
  const flames = custom(
    (x, y, z) => Math.min(...tongues.map((t) => sdPrim(t, x, y, z))) + (vnoise3(x / 3, y / 4, z / 3) - 0.5) * 4,
    'glow.fire', { c: [0, 18, 0], r: 22 },
    (x, y, z) => ({ dt: -Math.round(((y - 4) / 30) * 4 + Math.hypot(x, z) / 6) }),
  );
  return layerOf('campfire', [group(stones, 0, { rough: [[2, 3]] }), logs, flames]);
}

// ---------- a creature: grey wolf ----------
// One solid, not yet split into detachable segments (that comes with the creature rig).
export function wolf(): Layer {
  const prims: Prim[] = [
    ell([0, 54, 12], [13.5, 18, 22], 'fur.grey'),                     // chest
    ell([0, 52, -20], [11.5, 13.5, 21], 'fur.grey'),                  // hips
    ell([0, 62, 28], [12, 14, 11], 'fur.grey'),                       // ruff
    cone([0, 62, 28], [0, 72, 40], 10.5, 8.5, 'fur.grey'),            // neck
    ell([0, 74, 45], [9.5, 9.5, 11], 'fur.grey'),                     // skull
    cone([0, 71, 51], [0, 67.5, 65], 6, 3.2, 'fur.grey'),             // muzzle
    cone([5, 80, 41], [6.5, 92, 38], 3.8, 0.8, 'fur.grey'),
    cone([-5, 80, 41], [-6.5, 92, 38], 3.8, 0.8, 'fur.grey'),
    cone([0, 60, -38], [0, 46, -58], 7, 5.5, 'fur.grey'),             // tail, bushy
    cone([0, 46, -58], [0, 34, -64], 5.5, 2.4, 'fur.grey'),
  ];
  for (const s of [-1, 1]) {
    prims.push(cone([s * 7.5, 48, 22], [s * 8, 25, 25], 6.2, 4.2, 'fur.grey'), cone([s * 8, 25, 25], [s * 7.6, 3, 27], 4.2, 3.4, 'fur.grey'));
    prims.push(cone([s * 7.5, 50, -28], [s * 8.5, 29, -37], 8, 4.6, 'fur.grey'), cone([s * 8.5, 29, -37], [s * 8, 3, -31], 4.2, 3.4, 'fur.grey'));
  }
  const paint: Paint = (x, y, z) => {
    if (z > 65 && y < 70.5 && y > 64.5) return { mat: 'void' };                // nose
    if (Math.abs(Math.abs(x) - 5.5) < 1.6 && Math.abs(y - 76) < 1.3 && z > 50 && z < 54) return { mat: 'eye', dt: 1 };
    if (y > 64 && z < 30 && z > -42) return { dt: -1 };                          // darker saddle
    if (z < -52) return { dt: -1 };                                             // dark tail tip
    if (y < 46 && z > -30 && z < 32) return { dt: 1 };                           // pale belly
    if (y < 6) return { dt: -1 };                                                // paws
    return null;
  };
  return layerOf('wolf', [group(prims, 4, { paint })]);
}

// ---------- the farm (prologue) ----------

// The well: a round curb of sandstone blocks, a wooden frame with a windlass and a
// bucket on the rim. Under one of the curb stones is the tin (MAIN_QUEST plants).
export function well(): Layer {
  const R = 30, Hc = 30;
  const curb = custom(
    (x, y, z) => Math.max(Math.abs(Math.hypot(x, z) - R) - 7, Math.abs(y - Hc / 2) - Hc / 2),
    'sandstone', { c: [0, Hc / 2, 0], r: 46 },
    (x, y, z) => {
      const ang = Math.atan2(z, x) / (Math.PI * 2);
      if (frac(y / 10) < 0.12 || frac(ang * 14 + Math.floor(y / 10) * 0.5) < 0.05) return { dt: -1 }; // courses and joints
      if (Math.hypot(x, z) < R - 6.5 && y > Hc - 1) return { mat: 'void' };
      return null;
    },
  );
  const water = custom((x, y, z) => Math.max(Math.hypot(x, z) - (R - 7), Math.abs(y - (Hc - 10)) - 0.5), 'water.deep', { c: [0, Hc - 10, 0], r: 26 });
  const frame = group([
    box([-R + 2, 48, 0], [3, 48, 3], 'wood.dark', 0.6), box([R - 2, 48, 0], [3, 48, 3], 'wood.dark', 0.6),
    cone([-R + 2, 84, 0], [R - 2, 84, 0], 3.2, 3.2, 'wood'),                     // the windlass
    cone([0, 84, 0], [0, 50, 0], 0.7, 0.7, 'leather.dark'),                       // the rope
    box([0, 96, 0], [R + 6, 2.2, 12], 'wood.dark', 0.8),                           // a little roof
    cone([R + 3, 84, 0], [R + 3, 74, 6], 1.4, 1.4, 'wood.dark'),                   // the crank
  ], 0.3);
  const bucket = group([cone([R - 4, Hc, 9], [R - 4, Hc + 13, 9], 6, 7, 'wood'), cone([R - 4, Hc + 12.5, 9], [R - 4, Hc + 13.5, 9], 7.2, 7.2, 'iron')], 0.3);
  return layerOf('well', [curb, water, frame, bucket]);
}

// A fence section two tiles long (about 1.4 m) along the a axis, or along b, of rough
// posts and two rails. Broken: one rail down and a post leaning (MAIN_QUEST PRO_02).
export function fence(axis: 'a' | 'b', broken = false): Layer {
  const L = 51, P = (x: number, y: number, z: number): V3 => (axis === 'a' ? [x, y, z] : [z, y, x]);
  const prims: Prim[] = [];
  for (const x of [-L, 0, L]) {
    const lean = broken && x === L ? 14 : 0;
    prims.push(cone(P(x, 0, 0), P(x + lean, 44, lean * 0.3), 3.0, 2.5, 'wood.dark'));
  }
  prims.push(cone(P(-L, 34, 1.8), P(broken ? 0 : L, 34, 1.8), 1.8, 1.8, 'wood'));
  if (!broken) prims.push(cone(P(-L, 16, 1.8), P(L, 16, 1.8), 1.8, 1.8, 'wood'));
  else prims.push(cone(P(-L, 16, 1.8), P(4, 2, 12), 1.8, 1.8, 'wood'), cone(P(12, 2, 10), P(L - 2, 2, 22), 1.8, 1.8, 'wood'));
  return layerOf(`fence${axis.toUpperCase()}${broken ? 'Broken' : ''}`, [group(prims, 0.4, {
    paint: (x, y, z, mat) => (mat === 'wood' && frac((axis === 'a' ? x : z) / 9) < 0.1 ? { dt: -1 } : null),
  })]);
}

// A coast goat: brown with a pale belly, short horns swept back, a beard. Drawn at
// the characters' 12 degree camera, like the wolf.
export function goat(): Layer {
  const prims: Prim[] = [
    ell([0, 40, 8], [10, 12, 15], 'wool.brown'),                         // chest and barrel
    ell([0, 40, -12], [9.5, 11, 12], 'wool.brown'),                      // hips
    cone([0, 46, 18], [0, 56, 26], 6, 5, 'wool.brown'),                  // neck
    ell([0, 59, 30], [5.4, 6, 7], 'wool.brown'),                         // skull
    cone([0, 57, 34], [0, 52, 42], 4.2, 2.6, 'wool.brown'),              // muzzle
    cone([0, 50, 37], [0, 43, 38], 1.6, 0.6, 'wool.brown'),              // beard
    cone([0, 46, -22], [0, 50, -27], 2.4, 1.0, 'wool.brown'),            // a short tail, up
  ];
  for (const s of [-1, 1]) {
    prims.push(cone([s * 3, 64, 28], [s * 5, 70, 20], 1.8, 0.7, 'bone'));                                  // horns
    prims.push(cone([s * 5.6, 61, 27], [s * 10, 58, 25], 1.6, 0.6, 'wool.brown'));                        // ears, out sideways
    prims.push(cone([s * 5.5, 34, 12], [s * 5.8, 16, 13], 3.6, 2.4, 'wool.brown'), cone([s * 5.8, 16, 13], [s * 5.6, 2, 13], 2.2, 1.8, 'wool.brown'));
    prims.push(cone([s * 5.8, 34, -14], [s * 6.2, 18, -18], 4.2, 2.4, 'wool.brown'), cone([s * 6.2, 18, -18], [s * 6, 2, -14], 2.2, 1.8, 'wool.brown'));
  }
  const paint: Paint = (x, y, z, mat) => {
    if (mat === 'bone') return null;
    if (z > 41.5 && y > 51 && y < 54) return { mat: 'void' };                                   // nose
    if (Math.abs(Math.abs(x) - 4.4) < 1.2 && Math.abs(y - 60.5) < 1.1 && z > 33) return { mat: 'eye', dt: 1 };
    if (y < 32 && y > 24 && Math.abs(x) < 7.5 && z > -20 && z < 22) return { mat: 'linen', dt: 1 }; // pale belly
    if (y < 4) return { dt: -1 };                                                                // hooves
    return null;
  };
  return layerOf('goat', [group(prims, 2.4, { paint })]);
}

// ---------- inventory icons ----------

export function iconSword(): Layer {
  const G: V3 = [-11, -11, 0], dir: V3 = [Math.SQRT1_2, Math.SQRT1_2, 0], perp: V3 = [-Math.SQRT1_2, Math.SQRT1_2, 0];
  const at = (t: number): V3 => [G[0] + dir[0] * t, G[1] + dir[1] * t, G[2] + dir[2] * t];
  const blade = ribbon(at(0), at(38), 3.4, 2.6, 0.9, [0, 0, 1]);
  const tip = ribbon(at(38), at(44), 2.6, 0.2, 0.9, [0, 0, 1]);
  const bladeGroup = custom((x, y, z) => Math.min(blade(x, y, z), tip(x, y, z)), 'iron', { c: at(22), r: 26 }, (x, y) => {
    const s = (x - G[0]) * perp[0] + (y - G[1]) * perp[1];
    if (Math.abs(s) < 0.7) return { dt: -1 };      // fuller
    if (s > 2) return { dt: 1 };                    // lit edge
    return null;
  });
  const hilt = group([
    cone([G[0] + perp[0] * 9, G[1] + perp[1] * 9, 0], [G[0] - perp[0] * 9, G[1] - perp[1] * 9, 0], 1.9, 1.9, 'iron'),
    cone(at(-1), at(-11), 1.8, 1.8, 'leather'),
    ell(at(-13), [2.8, 2.8, 2.8], 'iron'),
  ], 0, { paint: (x, y, z, mat) => (mat === 'leather' && frac((x + y) / 2.2) < 0.3 ? { dt: -1 } : null) });
  return layerOf('icon_iron_sword', [bladeGroup, hilt]);
}

export function iconPotion(): Layer {
  const flask = group([
    ell([0, 0, 0], [13, 12, 13], 'glass'),
    cone([0, 8, 0], [0, 21, 0], 4.6, 4.4, 'glass'),
    ell([0, 21.5, 0], [5.8, 1.8, 5.8], 'glass'),
    cone([0, 22, 0], [0, 28, 0], 4.2, 4.7, 'wood'),
  ], 1.2, {
    paint: (x, y, z, mat) => {
      if (mat !== 'glass') return null;
      if (x < -4 && y > 1 && y < 8 && z > 3) return { dt: 2 };              // highlight
      if (y < 3) return { mat: 'potion.red', dt: x < -5 && y > -2 ? 1 : 0 };  // the draught
      return null;
    },
  });
  return layerOf('icon_potion', [flask]);
}

export function iconOre(): Layer {
  const g = group([ell([0, 0, 0], [17, 13, 14], 'rock'), ell([8, -4, 6], [9, 8, 8], 'rock')], 4, {
    rough: [[6, 5], [1.5, 1.8]],
    paint: (x, y, z) => {
      const n = vnoise3(x / 3, y / 3, z / 3);
      return n > 0.66 ? { mat: 'iron', dt: n > 0.78 ? 2 : 0 } : null;
    },
  });
  return layerOf('icon_iron_ore', [g]);
}

// ---------- rendering ----------

// image is body over shadow; body and shadow are also kept apart for scenes.
export type Sprite = { image: Rgba; body: Rgba; shadow: Rgba | null; w: number; h: number; ox: number; oy: number; ms: number };

// The world direction of the sun for ground shadows, in object space for a given yaw.
function sunIn(palette: Palette & { sun?: V3 }, yaw: number): V3 {
  const s = palette.sun ?? [-0.6, 1.25, -0.3];
  const l = Math.hypot(s[0], s[1], s[2]);
  return toChar([s[0] / l, s[1] / l, s[2] / l], Math.cos(yaw), Math.sin(yaw));
}

// Render one object: a cell sized to fit it and its ground shadow, then trimmed.
// The anchor (ox, oy) is the object origin on the ground.
export function renderObject(
  layer: Layer, palette: Palette & { sun?: V3 },
  opts: { yaw?: number; pitchDeg?: number; ss?: number; scale?: number; shadow?: boolean; size?: [number, number] } = {},
): Sprite {
  const yaw = opts.yaw ?? Math.PI / 4, pitchDeg = opts.pitchDeg ?? 30, k = opts.scale ?? 0.88;
  const p = (pitchDeg * Math.PI) / 180;
  const U: V3 = [0, Math.cos(p), -Math.sin(p)];
  const { c, r } = layer.bounds;
  const wc = toWorld(c, Math.cos(yaw), Math.sin(yaw));
  const scx = wc[0], scy = wc[1] * U[1] + wc[2] * U[2];
  const top = c[1] + r;
  const shadow = opts.shadow ?? true;
  const padR = shadow ? Math.ceil(0.5 * top * k) + 4 : 2, padB = shadow ? Math.ceil(0.15 * top * k) + 4 : 2;
  let cell: Cell;
  if (opts.size) {
    cell = { w: opts.size[0], h: opts.size[1], ox: opts.size[0] / 2 - scx * k, oy: opts.size[1] / 2 + scy * k, scale: k, characterPitchDeg: pitchDeg, ss: opts.ss };
  } else {
    cell = {
      w: Math.ceil(2 * r * k) + 4 + padR, h: Math.ceil(2 * r * k) + 4 + padB,
      ox: Math.round(-(scx - r) * k + 2), oy: Math.round((scy + r) * k + 2),
      scale: k, characterPitchDeg: pitchDeg, ss: opts.ss,
    };
  }
  const t0 = Date.now();
  const raw = renderLayer(layer, yaw, cell, palette);
  const coloured = colourLayers([raw], palette).get(layer.id)!;
  const shade = shadow ? groundShadow(layer, yaw, cell, palette) : null;
  const full = composite(cell, shade ? [shade, coloured] : [coloured]);
  return trim({ image: full, body: coloured, shadow: shade, w: cell.w, h: cell.h, ox: cell.ox, oy: cell.oy, ms: Date.now() - t0 }, !opts.size);
}

// Ground shadow: for each ground pixel, march toward the sun and see if the object is in the way.
function groundShadow(layer: Layer, yaw: number, cell: Cell, palette: Palette & { sun?: V3 }): Rgba {
  const px = new Uint8ClampedArray(cell.w * cell.h * 4);
  const [cr, cg, cb] = hex(palette.shadow.color);
  const alpha = Math.round(palette.shadow.alpha * 255);
  const p = (cell.characterPitchDeg * Math.PI) / 180, k = cell.scale;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const sun = sunIn(palette, yaw);
  const dist = (x: number, y: number, z: number) => {
    let d = Infinity;
    for (const pc of layer.pieces) {
      if (pc.bounds) {
        const bd = Math.hypot(x - pc.bounds.c[0], y - pc.bounds.c[1], z - pc.bounds.c[2]) - pc.bounds.r;
        if (bd > 1) { d = Math.min(d, bd); continue; }
      }
      d = Math.min(d, pc.shape(x, y, z));
    }
    return d;
  };
  for (let y = 0; y < cell.h; y++) {
    for (let x = 0; x < cell.w; x++) {
      const sxp = (x + 0.5 - cell.ox) / k, syp = (cell.oy - (y + 0.5)) / k;
      // The ground point under this pixel (y = 0 in the world).
      const t = (-syp * Math.cos(p)) / Math.sin(p);
      const g = toChar([sxp, 0, syp * -Math.sin(p) + t * Math.cos(p)], cy, sy);
      let s = 1.5, hit = false;
      for (let i = 0; i < 120 && s < 800; i++) {
        const d = dist(g[0] + sun[0] * s, g[1] + sun[1] * s, g[2] + sun[2] * s);
        if (d < 0.3) { hit = true; break; }
        s += Math.max(d * 0.8, 0.4);
      }
      if (hit) px.set([cr, cg, cb, alpha], (y * cell.w + x) * 4);
    }
  }
  return px;
}

// Crop to the drawn pixels plus a one pixel margin, moving the anchor with it.
function trim(s: Sprite, enabled: boolean): Sprite {
  if (!enabled) return s;
  let x0 = s.w, y0 = s.h, x1 = -1, y1 = -1;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    if (s.image[(y * s.w + x) * 4 + 3] === 0) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x1 < 0) return s;
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(s.w - 1, x1 + 1); y1 = Math.min(s.h - 1, y1 + 1);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const crop = (src: Rgba) => {
    const img = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) img.set(src.subarray(((y + y0) * s.w + x0) * 4, ((y + y0) * s.w + x0 + w) * 4), y * w * 4);
    return img;
  };
  return { image: crop(s.image), body: crop(s.body), shadow: s.shadow && crop(s.shadow), w, h, ox: s.ox - x0, oy: s.oy - y0, ms: s.ms };
}

