import { hash3, primBounds, sdPrim, smax, smin, smoothstep, type Prim, type V3 } from './sdf.ts';
import type { Pose, Side } from './pose.ts';

// ---------- layer model ----------
//
// The body is one smooth surface. It is split into detachable segments (head,
// torso, upper arms, forearms with hands, legs, feet) by ownership: a point
// belongs to whichever segment's own shapes are nearest. Shading uses the whole
// surface, so joints are seamless, and the split lines fall in the creases where
// a killing blow would separate them. Garments work the same way: one surface,
// shared out over the segments it is allowed to cover.

export type PaintResult = { mat?: string | null; dt?: number };
export type Fn = (x: number, y: number, z: number) => number;

export type Piece = {
  shape: Fn;                   // surface, used for hits and normals
  cut: Fn;                     // positive where this piece is cut away (ownership, hems, openings)
  mat: (x: number, y: number, z: number) => string;
  paint?: (x: number, y: number, z: number, mat: string) => PaintResult | null;
  bump?: (x: number, y: number, z: number) => V3; // normal nudge for folds
  bounds?: { c: V3; r: number }; // optional: lets the renderer skip this piece when far away
};

export type Layer = {
  id: string;           // segment/slot, for example "forearm.L/body"
  segment: string;      // the body part this piece detaches with
  slot: string;         // body, scar, hair, facialHair, armour, boots, ...
  pieces: Piece[];
  bounds: { c: V3; r: number };
  overlay?: boolean;    // drop pixels whose paint returns mat null
  occluders?: Fn[];     // surfaces underneath that hide this layer's inside
  local?: (x: number, y: number, z: number) => V3; // to the segment's rest pose, for texture
  wound?: (x: number, y: number, z: number, mat: string) => PaintResult | null; // paints cut faces once severed
};

export const SIDES: Side[] = ['L', 'R'];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const sx = (s: Side) => (s === 'L' ? 1 : -1);

export function along(x: number, y: number, z: number, a: V3, b: V3) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const l2 = bx * bx + by * by + bz * bz;
  return { t: ((x - a[0]) * bx + (y - a[1]) * by + (z - a[2]) * bz) / l2, len: Math.sqrt(l2) };
}

export function primsSdf(prims: Prim[], k: number): Fn {
  const pos = prims.filter((p) => !p.sub), neg = prims.filter((p) => p.sub);
  return (x, y, z) => {
    let d = sdPrim(pos[0], x, y, z);
    for (let i = 1; i < pos.length; i++) d = smin(d, sdPrim(pos[i], x, y, z), k);
    for (const p of neg) d = smax(d, -sdPrim(p, x, y, z), k * 0.5);
    return d;
  };
}

export function boundsOf(prims: Prim[], margin: number): { c: V3; r: number } {
  const bs = prims.filter((p) => !p.sub).map(primBounds);
  const c: V3 = [0, 0, 0];
  for (const b of bs) for (let i = 0; i < 3; i++) c[i] += b.c[i] / bs.length;
  let r = 0;
  for (const b of bs) r = Math.max(r, Math.hypot(b.c[0] - c[0], b.c[1] - c[1], b.c[2] - c[2]) + b.r);
  return { c, r: r + margin };
}

// A set of named parts with an ownership split between them. Bounds (optional)
// let a query skip parts that are far away: the distance to a part's bounding
// sphere is a lower bound on its distance.
type Bounds = { c: V3; r: number };
type PartSet = { names: string[]; sdfs: Fn[]; bounds?: Bounds[] };
export function partSet(parts: Record<string, Fn>, bounds?: Record<string, Bounds>): PartSet {
  const names = Object.keys(parts);
  return { names, sdfs: Object.values(parts), bounds: bounds && names.map((n) => bounds[n]) };
}
const lowerBound = (b: Bounds, x: number, y: number, z: number) => {
  const dx = x - b.c[0], dy = y - b.c[1], dz = z - b.c[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - b.r;
};
// Positive where some other part in the set is nearer than `name`. A part whose
// lower bound is well clear of this one cannot change the sign near the
// surface, so its bound stands in for its distance.
export function ownership(set: PartSet, name: string): Fn {
  const i = set.names.indexOf(name);
  if (set.sdfs.length === 1) return () => -Infinity;
  return (x, y, z) => {
    const own = set.sdfs[i](x, y, z);
    let other = Infinity;
    for (let j = 0; j < set.sdfs.length; j++) {
      if (j === i) continue;
      if (set.bounds) {
        const lb = lowerBound(set.bounds[j], x, y, z);
        if (lb > own + 4) { if (lb < other) other = lb; continue; }
      }
      other = Math.min(other, set.sdfs[j](x, y, z));
    }
    return (own - other) * 0.5;
  };
}

// ---------- body shapes ----------

export function headPrims(p: Pose): Prim[] {
  const h = (v: V3): V3 => add(p.head, v);
  return [
    { kind: 'ell', c: h([0, 1.3, -0.8]), r: [6.6, 7.3, 7.5], mat: 'skin' },          // cranium
    { kind: 'ell', c: h([0, -3.1, 1.7]), r: [5.5, 5.3, 5.4], mat: 'skin' },          // jaw and face
    { kind: 'ell', c: h([0, 1.8, 5.3]), r: [4.9, 1.3, 1.9], mat: 'skin' },           // brow ridge
    { kind: 'cone', a: h([0, 1.0, 6.4]), b: h([0, -2.0, 7.6]), r1: 0.8, r2: 1.3, mat: 'skin' }, // nose
    { kind: 'ell', c: h([3.3, -0.8, 4.7]), r: [2.1, 1.5, 1.9], mat: 'skin' },        // cheekbones
    { kind: 'ell', c: h([-3.3, -0.8, 4.7]), r: [2.1, 1.5, 1.9], mat: 'skin' },
    { kind: 'ell', c: h([6.3, -0.2, 0.2]), r: [1.2, 2.3, 1.5], mat: 'skin' },        // ears
    { kind: 'ell', c: h([-6.3, -0.2, 0.2]), r: [1.2, 2.3, 1.5], mat: 'skin' },
    { kind: 'ell', c: h([2.5, 0.2, 6.5]), r: [1.5, 1.0, 1.2], mat: 'skin', sub: true }, // eye sockets
    { kind: 'ell', c: h([-2.5, 0.2, 6.5]), r: [1.5, 1.0, 1.2], mat: 'skin', sub: true },
  ];
}

export function torsoPrims(p: Pose, withNeck: boolean): Prim[] {
  const c = p.chest, pv = p.pelvis;
  const prims: Prim[] = [
    { kind: 'ell', c: add(c, [0, 1, 0]), r: [11.6, 13.2, 8.4], mat: 'skin' },          // ribcage
    { kind: 'ell', c: add(c, [3.4, 5.2, 3.6]), r: [5.4, 3.6, 4.4], mat: 'skin' },      // pectorals
    { kind: 'ell', c: add(c, [-3.4, 5.2, 3.6]), r: [5.4, 3.6, 4.4], mat: 'skin' },
    // Trapezius: slopes from the neck down to each shoulder.
    { kind: 'cone', a: add(p.neck, [3, -1.5, -0.6]), b: add(p.shoulder.L, [-1.8, 0, 0]), r1: 4.6, r2: 4.1, mat: 'skin' },
    { kind: 'cone', a: add(p.neck, [-3, -1.5, -0.6]), b: add(p.shoulder.R, [1.8, 0, 0]), r1: 4.6, r2: 4.1, mat: 'skin' },
    { kind: 'ell', c: lerp3(c, pv, 0.52), r: [10.8, 10, 7.8], mat: 'skin' },          // abdomen
    { kind: 'ell', c: add(pv, [0, 0.5, -0.4]), r: [12.4, 8.6, 8.2], mat: 'skin' },    // pelvis
  ];
  if (withNeck) prims.push({ kind: 'cone', a: add(p.neck, [0, -4, -0.6]), b: add(p.neck, [0, 6.5, 0.6]), r1: 4.7, r2: 4.2, mat: 'skin' });
  return prims;
}

export function upperArmPrims(p: Pose, s: Side): Prim[] {
  const sh = p.shoulder[s], el = p.elbow[s];
  return [
    { kind: 'cone', a: sh, b: el, r1: 4.3, r2: 3.4, mat: 'skin' },
    { kind: 'ell', c: add(lerp3(sh, el, 0.14), [sx(s) * 0.9, 0, 0]), r: [4.4, 6.0, 4.6], mat: 'skin' }, // deltoid
  ];
}

export function forearmPrims(p: Pose, s: Side): Prim[] {
  const el = p.elbow[s], wr = p.wrist[s], hd = p.hand[s];
  const knuckle = lerp3(wr, hd, 0.5);
  return [
    { kind: 'cone', a: el, b: wr, r1: 3.5, r2: 2.4, mat: 'skin' },
    { kind: 'ell', c: lerp3(el, wr, 0.3), r: [3.7, 5.6, 3.5], mat: 'skin' },          // forearm muscle
    { kind: 'cone', a: wr, b: knuckle, r1: 2.5, r2: 2.8, mat: 'skin' },              // palm
    { kind: 'cone', a: knuckle, b: hd, r1: 2.6, r2: 2.2, mat: 'skin' },              // fingers, curled loosely
    { kind: 'cone', a: add(wr, [-sx(s) * 1.4, -1.5, 1.6]), b: add(knuckle, [-sx(s) * 1.3, -1, 2.6]), r1: 1.2, r2: 1.0, mat: 'skin' }, // thumb
  ];
}

export function legPrims(p: Pose, s: Side): Prim[] {
  const hp = p.hip[s], kn = p.knee[s], an = p.ankle[s];
  return [
    { kind: 'cone', a: hp, b: kn, r1: 7.2, r2: 4.7, mat: 'skin' },
    { kind: 'ell', c: add(lerp3(hp, kn, 0.38), [0, 0, 0.8]), r: [6.9, 11.5, 6.6], mat: 'skin' }, // thigh
    { kind: 'cone', a: kn, b: an, r1: 4.6, r2: 2.9, mat: 'skin' },
    { kind: 'ell', c: add(lerp3(kn, an, 0.3), [0, 0, -1.4]), r: [4.1, 7.4, 4.1], mat: 'skin' }, // calf
  ];
}

export function footPrims(p: Pose, s: Side): Prim[] {
  const an = p.ankle[s], yaw = p.footYaw[s];
  const fwd = (d: number): V3 => [an[0] + Math.sin(yaw) * d, an[1] - 3.9, an[2] + Math.cos(yaw) * d];
  return [
    { kind: 'box', c: fwd(4), h: [2.8, 2.5, 7.0], round: 1.8, yaw, mat: 'skin' },
    { kind: 'ell', c: [an[0], an[1] - 1.5, an[2] - 0.5], r: [2.9, 3.4, 3.3], mat: 'skin' },
  ];
}

function segmentPrims(p: Pose): Record<string, { prims: Prim[]; k: number }> {
  const segs: Record<string, { prims: Prim[]; k: number }> = {
    head: { prims: headPrims(p), k: 2.2 },
    torso: { prims: torsoPrims(p, true), k: 4 },
  };
  for (const s of SIDES) {
    segs[`upperArm.${s}`] = { prims: upperArmPrims(p, s), k: 3 };
    segs[`forearm.${s}`] = { prims: forearmPrims(p, s), k: 1.6 };
    segs[`leg.${s}`] = { prims: legPrims(p, s), k: 3 };
    segs[`foot.${s}`] = { prims: footPrims(p, s), k: 2 };
  }
  return segs;
}

// Shape and ownership query the same point back to back, so remember the last answer.
function memo(f: Fn): Fn {
  let lx = NaN, ly = NaN, lz = NaN, lv = 0;
  return (x, y, z) => {
    if (x === lx && y === ly && z === lz) return lv;
    lx = x; ly = y; lz = z; lv = f(x, y, z);
    return lv;
  };
}

const JOIN = 2.4; // how softly neighbouring segments blend into each other

export type Body = { segs: Record<string, { prims: Prim[]; k: number }>; parts: PartSet; shape: Fn };

export function makeBody(p: Pose): Body {
  const segs = segmentPrims(p);
  const sdfs: Record<string, Fn> = {};
  for (const [n, s] of Object.entries(segs)) sdfs[n] = memo(primsSdf(s.prims, s.k));
  const bounds: Record<string, Bounds> = {};
  for (const [n, s] of Object.entries(segs)) bounds[n] = boundsOf(s.prims, s.k);
  const parts = partSet(sdfs, bounds);
  // Start from the nearest segment by bound, then blend in only the segments
  // that could still be within the blend distance. Skipping the rest is exact:
  // smin(d, b, k) is d whenever b >= d + k.
  const n = parts.sdfs.length, lbs = new Float64Array(n), bb = parts.bounds!;
  const shape: Fn = (x, y, z) => {
    let first = 0;
    for (let i = 0; i < n; i++) { lbs[i] = lowerBound(bb[i], x, y, z); if (lbs[i] < lbs[first]) first = i; }
    let d = parts.sdfs[first](x, y, z);
    for (let i = 0; i < n; i++) {
      if (i === first || lbs[i] >= d + JOIN) continue;
      d = smin(d, parts.sdfs[i](x, y, z), JOIN);
    }
    return d;
  };
  return { segs, parts, shape };
}

// ---------- body layers ----------

// The brand: a fish-hook crossed by a salt rune, burned into the left pectoral.
const BRAND = [
  '...###...',
  '...#.#...',
  '...###...',
  '....#....',
  '.#######.',
  '....#....',
  '.#..#....',
  '.##.#....',
  '..#.#....',
  '..#.#....',
  '...##....',
];

function headPaint(p: Pose) {
  return (x: number, y: number, z: number): PaintResult | null => {
    const lx = x - p.head[0], ly = y - p.head[1], lz = z - p.head[2];
    if (lz < 3.5) return null;
    for (const ex of [2.5, -2.5]) {
      if (Math.hypot(lx - ex, (ly - 0.1) * 1.4) < 1.05) return { mat: 'eye' };
    }
    // Brows: a short dark bar over each eye.
    if (ly > 1.3 && ly < 2.4 && Math.abs(lx) > 0.9 && Math.abs(lx) < 4.3) return { mat: 'hair', dt: 1 };
    if (Math.abs(lx) < 1.9 && Math.abs(ly + 4.6) < 0.45) return { dt: -2 }; // mouth
    return null;
  };
}

export function bodyLayers(p: Pose, body: Body): Layer[] {
  const layers: Layer[] = [];
  for (const seg of body.parts.names) {
    const own = ownership(body.parts, seg);
    let paint: Piece['paint'];
    if (seg === 'head') paint = headPaint(p);
    // Smallclothes so the base body is never bare below the waist.
    if (seg === 'torso') paint = (_x, y) => (y < p.pelvis[1] + 4.5 ? { mat: 'linen', dt: -1 } : null);
    if (seg.startsWith('leg.')) paint = (_x, y) => (y > p.hip.L[1] - 9 ? { mat: 'linen', dt: -1 } : null);
    layers.push({
      id: `${seg}/body`, segment: seg, slot: 'body',
      pieces: [{ shape: body.shape, cut: own, mat: () => 'skin', paint }],
      bounds: boundsOf(body.segs[seg].prims, JOIN + 1),
    });
  }
  // Brand overlay: the torso surface, kept only where the mark is.
  const cell = 1.05;
  const ox = p.chest[0] + 6.6, oy = p.chest[1] + 9.6;
  layers.push({
    id: 'torso/scar', segment: 'torso', slot: 'scar', overlay: true,
    pieces: [{
      shape: (x, y, z) => body.shape(x, y, z) - 0.1, cut: ownership(body.parts, 'torso'), mat: () => 'brand',
      paint: (x, y, z) => {
        if (z < p.chest[2] + 2) return { mat: null };
        const col = Math.floor((x - ox) / cell + 4.5);
        const row = Math.floor((oy - y) / cell);
        if (row < 0 || row >= BRAND.length || col < 0 || col >= 9) return { mat: null };
        // Columns flipped so the mark reads correctly to someone facing him.
        return BRAND[row][8 - col] === '#' ? { dt: 1 } : { mat: null };
      },
    }],
    bounds: boundsOf(body.segs.torso.prims, 2),
  });
  return layers;
}

// ---------- hair ----------

export function hairLayers(p: Pose, body: Body): Layer[] {
  const local = (y: number, z: number) => ({ ly: y - p.head[1], lz: z - p.head[2] });
  const h = (v: V3): V3 => add(p.head, v);
  // Short cropped hair with a little volume on top and at the crown.
  const hairPrims: Prim[] = [
    { kind: 'ell', c: h([0, 1.3, -0.8]), r: [6.6, 7.3, 7.5], mat: 'hair' },
    { kind: 'ell', c: h([0.8, 5.9, 0.8]), r: [5.6, 2.9, 5.8], mat: 'hair' },
    { kind: 'ell', c: h([-1.6, 4.6, -3.6]), r: [4.8, 3.4, 3.8], mat: 'hair' },
    { kind: 'ell', c: h([2.4, 6.4, 3.4]), r: [2.6, 1.6, 2.4], mat: 'hair' },   // a tuft falling forward
  ];
  const hairShape = primsSdf(hairPrims, 2.5);
  const beardShape = primsSdf(headPrims(p).slice(0, 2), 2.2);
  void body;
  return [
    {
      id: 'head/hair', segment: 'head', slot: 'hair',
      pieces: [{
        shape: (x, y, z) => hairShape(x, y, z) - 1.0,
        cut: (_x, y, z) => {
          const { ly, lz } = local(y, z);
          // Ragged hairline: a slightly receding forehead with uneven edges.
          const ragged = 0.55 * Math.sin(_x * 2.3 + 1.1) + 0.35 * Math.sin(_x * 5.1);
          return 0.4 + 3.0 * smoothstep(1.5, 5.5, lz) - 4.6 * smoothstep(-1.5, -6.5, lz) + ragged - ly;
        },
        mat: () => 'hair',
        paint: (x, y, z) => {
          const { ly } = local(y, z);
          const w = Math.sin((x - p.head[0]) * 1.9 + ly * 0.7 + (z - p.head[2]) * 1.1);
          return w > 0.75 ? { dt: -1 } : w < -0.9 ? { dt: 1 } : null; // strands
        },
      }],
      bounds: { c: p.head, r: 13 },
    },
    {
      // Short beard: jaw, chin and upper lip, joining the hair at the sideburns.
      id: 'head/facialHair', segment: 'head', slot: 'facialHair',
      pieces: [{
        shape: (x, y, z) => beardShape(x, y, z) - 0.75,
        cut: (_x, y, z) => {
          const { ly, lz } = local(y, z);
          const top = -2.5 + 2.9 * smoothstep(3.5, 0.5, lz);
          return Math.max(ly - top, -0.8 - lz);
        },
        mat: () => 'hair',
        paint: (x, y, z) => {
          const f = Math.floor;
          return hash3(f((x - p.head[0]) * 0.9), f((y - p.head[1]) * 0.9), f((z - p.head[2]) * 0.9)) < 0.18 ? { dt: 1 } : null;
        },
      }],
      bounds: { c: p.head, r: 13 },
    },
  ];
}

// ---------- equipment: Farm Clothes and Farm Boots (Skyrim names) ----------

// One garment surface shared out over the segments it covers.
export function garmentLayers(
  slot: string, allowed: string[], shape: Fn, cut: Fn, mat: Piece['mat'], body: Body,
  opts: { paint?: Piece['paint']; bump?: Piece['bump']; segCut?: Record<string, Fn>; margin?: number } = {},
): Layer[] {
  const sub: Record<string, Fn> = {};
  const subBounds: Record<string, Bounds> = {};
  for (const n of allowed) {
    const i = body.parts.names.indexOf(n);
    sub[n] = body.parts.sdfs[i];
    subBounds[n] = body.parts.bounds![i];
  }
  const set = partSet(sub, subBounds);
  return allowed.map((seg) => {
    const own = ownership(set, seg);
    const extra = opts.segCut?.[seg];
    return {
      id: `${seg}/${slot}`, segment: seg, slot,
      pieces: [{
        shape, mat, paint: opts.paint, bump: opts.bump,
        cut: (x, y, z) => Math.max(cut(x, y, z), own(x, y, z), extra ? extra(x, y, z) : -Infinity),
      }],
      bounds: boundsOf(body.segs[seg].prims, opts.margin ?? 6),
    };
  });
}

// Shirt: torso and both upper arms as one surface, plus a skirt below the belt.
// mat: the cloth (linen for farm clothes, a padded teal cloth under steel).
export function shirtLayers(p: Pose, body: Body, mat = 'linen', withBelt = true): Layer[] {
  const pv = p.pelvis, c = p.chest;
  const hem = pv[1] - 13;
  const belt = pv[1] + 7;
  const shirtPrims: Prim[] = [
    ...torsoPrims(p, false),
    ...upperArmPrims(p, 'L').slice(0, 1), ...upperArmPrims(p, 'R').slice(0, 1),
    // Skirt below the belt: flattened front to back, flaring a little toward the hem.
    { kind: 'ell', c: [0, belt - 5, 0.3], r: [12.6, 6.5, 8.8], mat },
    { kind: 'ell', c: [0, hem + 4, 0.8], r: [13.6, 6.0, 9.4], mat },
  ].map((q) => ({ ...q, mat }) as Prim);
  const shirtSdf = primsSdf(shirtPrims, 3.4);
  const beltPrims: Prim[] = [
    { kind: 'ell', c: [0, belt, 0.4], r: [13.4, 1.9, 9.9], mat: 'leather' },
    { kind: 'box', c: [10.6, belt - 4.6, 6.3], h: [2.4, 3.0, 1.5], round: 0.9, yaw: 0.55, mat: 'leather' }, // pouch on his left hip
  ];
  const beltSdf = primsSdf(beltPrims, 0.5);
  // The shirt hugs the body (including the deltoids) with a little slack.
  const shirtShape: Fn = (x, y, z) => smin(shirtSdf(x, y, z), body.shape(x, y, z), 2) - 0.9;
  const shape: Fn = withBelt ? (x, y, z) => Math.min(shirtShape(x, y, z), beltSdf(x, y, z)) : shirtShape;
  const matOf = (x: number, y: number, z: number) => (withBelt && beltSdf(x, y, z) < shirtShape(x, y, z) + 0.05 ? 'leather' : mat);
  const cut: Fn = (x, y, z) => {
    const hemCut = hem - y;
    const collar = Math.min(y - (c[1] + 11.5), 6.2 - Math.abs(x));
    const vHalf = (4.0 * (y - (c[1] + 4.5))) / 7; // V-neck closing 7 units below the collar
    const vCut = Math.min(vHalf - Math.abs(x), y - (c[1] + 4.5), z - 2);
    return Math.max(hemCut, collar, vCut);
  };
  const sleeveEnd = (s: Side): Fn => (x, y, z) => { const a = along(x, y, z, p.shoulder[s], p.elbow[s]); return (a.t - 0.86) * a.len; };
  return garmentLayers('clothes', ['torso', 'upperArm.L', 'upperArm.R'], shape, cut, matOf, body, {
    segCut: { 'upperArm.L': sleeveEnd('L'), 'upperArm.R': sleeveEnd('R') },
    margin: 8,
    paint: (x, y, z, m) => {
      if (m === 'leather') return Math.abs(x) < 1.3 && Math.abs(y - belt) < 1.4 && z > 7 ? { mat: 'brass' } : null;
      if (y < hem + 1.4) return { dt: -1 };
      // Rolled cuff: a darker line where the roll starts.
      for (const s of SIDES) {
        const a = along(x, y, z, p.shoulder[s], p.elbow[s]);
        if (a.t > 0.72 && a.t < 0.76 && Math.abs(x) > 10) return { dt: -1 };
      }
      return null;
    },
    bump: (x, y) => {
      // Vertical folds in the skirt, folds pulled toward the belt above it.
      if (y < belt - 1.5) return [0.55 * Math.sin(x * 0.95 + 0.4), 0, 0];
      if (y < c[1] + 2 && y > belt + 1.5) return [0.35 * Math.sin(x * 0.7 - (y - belt) * 0.45), 0.25 * Math.cos(x * 0.7 - (y - belt) * 0.45), 0];
      return [0, 0, 0];
    },
  });
}

// Trousers over both legs, tucked in 5.6 units above each ankle (L is +x), so a
// lifted foot takes its trouser cuff with it.
export function trouserLayers(p: Pose, body: Body): Layer[] {
  const trouserSdf = primsSdf([...legPrims(p, 'L'), ...legPrims(p, 'R')], 3);
  const tuck: Fn = (x, y) => (x > 0 ? p.ankle.L[1] : p.ankle.R[1]) + 5.6 - y;
  return garmentLayers('clothes', ['leg.L', 'leg.R'], (x, y, z) => trouserSdf(x, y, z) - 1.2, tuck, () => 'wool', body, {
    bump: (x, y) => {
      const kn = p.knee.L[1];
      return Math.abs(y - kn) < 5 ? [0, 0.5 * Math.sin(y * 2.0 + x * 0.3), 0] : [0, 0, 0];
    },
  });
}

// Plain boots: the foot plus a shaft up the shin. height: how far up the shin
// (0 ankle, 1 knee). Shafts above the ankle belong to the leg segment.
export function bootLayers(p: Pose, body: Body, opts: { height?: number; mat?: string; cuff?: string; straps?: number[] } = {}): Layer[] {
  const height = opts.height ?? 0.36, mat = opts.mat ?? 'leather.dark', cuff = opts.cuff ?? 'leather';
  const out: Layer[] = [];
  for (const s of SIDES) {
    const top = p.ankle[s][1] + (p.knee[s][1] - p.ankle[s][1]) * height;
    const bootSdf = primsSdf([
      ...footPrims(p, s),
      { kind: 'cone', a: p.ankle[s], b: lerp3(p.ankle[s], p.knee[s], height), r1: 3.6, r2: 3.6 + 1.4 * height, mat },
    ], 2);
    const segs = height > 0.45 ? [`foot.${s}`, `leg.${s}`] : [`foot.${s}`];
    out.push(...garmentLayers('boots', segs, (x, y, z) => bootSdf(x, y, z) - 1.0, () => -Infinity, () => mat, body, {
      margin: 10,
      paint: (_x, y) => {
        if (y > top - 2.2) return { mat: cuff, dt: -1 };          // turned-down cuff
        if (y < p.ankle[s][1] - 5.2) return { dt: -2 };           // sole
        for (const f of opts.straps ?? []) {
          const sy = p.ankle[s][1] + (p.knee[s][1] - p.ankle[s][1]) * f;
          if (Math.abs(y - sy) < 1.0) return { mat: 'leather.dark', dt: -1 };
        }
        return null;
      },
    }));
  }
  return out;
}

// ---------- equipment: Farm Clothes and Farm Boots (Skyrim names) ----------

export function farmClothesLayers(p: Pose, body: Body): Layer[] {
  return [...shirtLayers(p, body), ...trouserLayers(p, body), ...bootLayers(p, body)];
}

// ---------- moving a whole layer ----------
// Rotation matrices are row-major 3 by 3. Used for severed parts and for the
// dodge roll, where the whole figure turns over.

export const rotX = (t: number) => [1, 0, 0, 0, Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t)];
export const rotY = (t: number) => [Math.cos(t), 0, Math.sin(t), 0, 1, 0, -Math.sin(t), 0, Math.cos(t)];
export const rotZ = (t: number) => [Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t), 0, 0, 0, 1];
export const applyR = (R: number[], v: V3): V3 => [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
const applyRT = (R: number[], v: V3): V3 => [R[0] * v[0] + R[3] * v[1] + R[6] * v[2], R[1] * v[0] + R[4] * v[1] + R[7] * v[2], R[2] * v[0] + R[5] * v[1] + R[8] * v[2]];

// The same layer, turned by R about `pivot` and moved so the pivot lands on `to`.
export function moved(l: Layer, R: number[], pivot: V3, to: V3): Layer {
  const back = (x: number, y: number, z: number): V3 => {
    const q = applyRT(R, [x - to[0], y - to[1], z - to[2]]);
    return [q[0] + pivot[0], q[1] + pivot[1], q[2] + pivot[2]];
  };
  const wrap = (f: Fn): Fn => (x, y, z) => { const q = back(x, y, z); return f(q[0], q[1], q[2]); };
  const c = applyR(R, [l.bounds.c[0] - pivot[0], l.bounds.c[1] - pivot[1], l.bounds.c[2] - pivot[2]]);
  return {
    ...l,
    bounds: { c: [c[0] + to[0], c[1] + to[1], c[2] + to[2]], r: l.bounds.r },
    occluders: l.occluders?.map(wrap),
    local: l.local ? (x, y, z) => { const q = back(x, y, z); return l.local!(q[0], q[1], q[2]); } : undefined,
    wound: l.wound ? (x, y, z, m) => { const q = back(x, y, z); return l.wound!(q[0], q[1], q[2], m); } : undefined,
    pieces: l.pieces.map((pc) => ({
      shape: wrap(pc.shape), cut: wrap(pc.cut),
      mat: (x: number, y: number, z: number) => { const q = back(x, y, z); return pc.mat(q[0], q[1], q[2]); },
      paint: pc.paint && ((x: number, y: number, z: number, m: string) => { const q = back(x, y, z); return pc.paint!(q[0], q[1], q[2], m); }),
      bump: pc.bump && ((x: number, y: number, z: number) => { const q = back(x, y, z); return applyR(R, pc.bump!(q[0], q[1], q[2])); }),
      bounds: pc.bounds && { c: (() => { const d = applyR(R, [pc.bounds!.c[0] - pivot[0], pc.bounds!.c[1] - pivot[1], pc.bounds!.c[2] - pivot[2]]); return [d[0] + to[0], d[1] + to[1], d[2] + to[2]] as V3; })(), r: pc.bounds.r },
    })),
  };
}
