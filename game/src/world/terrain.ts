import { SLICE, type SliceInfo, type WorldMap } from './map';

// Ground and props, worked out from the map and the tile position alone, so the
// main thread and the chunk worker always agree and nothing needs storing.

// Material ids, lowest to highest priority (a higher one draws over its neighbours' edges).
export const MATERIALS = ['water.deep', 'water.shallow', 'sand.beach', 'sand.desert', 'earth.cracked', 'grass.coast', 'road'] as const;
export const M = { deep: 0, shallow: 1, beach: 2, sand: 3, cracked: 4, grass: 5, road: 6 } as const;

export function hash(x: number, y: number, s: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise(x: number, y: number, s: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export class Terrain {
  constructor(readonly map: WorldMap) {}

  // The biome at a point, with slice borders pushed around by noise so they wander.
  biomeAt(a: number, b: number): SliceInfo['biome'] {
    const wa = a + 16 * (noise(a / 23, b / 23, 11) - 0.5), wb = b + 16 * (noise(a / 23, b / 23, 12) - 0.5);
    const [sx, sy] = this.map.sliceOf(wa, wb);
    return this.map.info(sx, sy).biome;
  }
  // How much sea is around a point (0 to 1), from eight samples at radius r.
  seaAround(a: number, b: number, r: number): number {
    let n = 0;
    for (let k = 0; k < 8; k++) {
      const t = (k * Math.PI) / 4;
      if (this.biomeAt(a + Math.cos(t) * r, b + Math.sin(t) * r) === 'sea') n++;
    }
    return n / 8;
  }

  material(a: number, b: number): number {
    const bio = this.biomeAt(a, b);
    if (bio === 'sea') return this.seaAround(a, b, 7) < 0.75 ? M.shallow : M.deep;
    if (this.seaAround(a, b, 5) > 0.2) return M.beach;
    const [sx, sy] = this.map.sliceOf(a, b), info = this.map.info(sx, sy);
    if (info.roads.length && Math.abs(b - (sy * SLICE + 64 + 12 * Math.sin(a / 21))) < 1.1) return M.road;
    switch (bio) {
      case 'coastal grassland': return noise(a / 14, b / 14, 2) < 0.62 ? M.grass : M.sand;
      case 'desert': return noise(a / 9, b / 9, 3) > 0.74 ? M.cracked : M.sand;
      case 'rocky badlands': return noise(a / 10, b / 10, 4) < 0.65 ? M.cracked : M.sand;
      case 'highlands and mountains': return noise(a / 12, b / 12, 5) < 0.55 ? M.cracked : M.grass;
      case 'jungle': return M.grass;
    }
  }

  // Everything standing in a slice: props by biome, and a small settlement where the
  // map names a location. Ids are stable, so per-slice saved state can refer to them.
  things(sx: number, sy: number): Thing[] {
    const info = this.map.info(sx, sy);
    if (info.biome === 'sea') return [];
    const out: Thing[] = [];
    const free = (a: number, b: number, r: number) => out.every((t) => Math.hypot(t.a - a, t.b - b) > r + SHAPES[t.id].r + 0.6);
    const land = (a: number, b: number) => { const m = this.material(a, b); return m !== M.deep && m !== M.shallow && m !== M.road; };
    const place = (id: ThingId, a: number, b: number) => {
      if (!land(a, b) || !free(a, b, SHAPES[id].r)) return;
      out.push({ uid: `${sx},${sy},${out.length}`, id, a, b });
    };
    const a0 = sx * SLICE, b0 = sy * SLICE;
    if (info.locations.length) {
      // A settlement: houses around the middle, with yard clutter by each door.
      for (let k = 0; k < 7; k++) {
        const ang = (k / 7) * Math.PI * 2 + hash(sx, sy, 40), r = 9 + 3 * hash(sx, sy, 41 + k);
        const ha = a0 + 64 + Math.cos(ang) * r * 1.4, hb = b0 + 40 + Math.sin(ang) * r;
        place('house', ha, hb);
        for (const [id, da, db] of [['barrel', -1.5, 4.6], ['crate', -2.4, 4.4], ['pot', 1.6, 4.5]] as const) place(id, ha + da, hb + db);
      }
      place('campfire', a0 + 64, b0 + 52);
      place('chest', a0 + 66, b0 + 54);
    }
    const mix = DENSITY[info.biome];
    let n = 0;
    for (const [id, count] of mix) {
      for (let k = 0; k < count; k++, n++) place(id, a0 + 1 + hash(sx * 97 + n, sy, 7) * (SLICE - 2), b0 + 1 + hash(sx, sy * 89 + n, 8) * (SLICE - 2));
    }
    return out;
  }
}

export type ThingId = 'house' | 'palm1' | 'palm2' | 'rock1' | 'rock2' | 'scrub1' | 'scrub2' | 'barrel' | 'crate' | 'pot' | 'potSmall' | 'chest' | 'cliff' | 'campfire';
export type Thing = { uid: string; id: ThingId; a: number; b: number };

// Collision and depth footprints, in tiles. A box gives half-sizes along a and b
// (the house model is 240 by 300 units; a tile edge is about 51 units). r is the
// spacing radius used when placing. solid: blocks movement.
export const SHAPES: Record<ThingId, { r: number; box?: [number, number]; solid: boolean; smash?: boolean }> = {
  house: { r: 3.2, box: [2.35, 2.95], solid: true },
  cliff: { r: 1.3, box: [1.0, 1.0], solid: true },
  palm1: { r: 0.3, solid: true }, palm2: { r: 0.3, solid: true },
  rock1: { r: 0.55, solid: true }, rock2: { r: 0.65, solid: true },
  scrub1: { r: 0.4, solid: false }, scrub2: { r: 0.4, solid: false },
  barrel: { r: 0.35, solid: true, smash: true }, crate: { r: 0.45, solid: true, smash: true },
  pot: { r: 0.3, solid: true, smash: true }, potSmall: { r: 0.22, solid: true, smash: true },
  chest: { r: 0.45, solid: true }, campfire: { r: 0.45, solid: true },
};

const DENSITY: Record<SliceInfo['biome'], [ThingId, number][]> = {
  sea: [],
  'coastal grassland': [['palm1', 25], ['palm2', 20], ['scrub1', 25], ['rock1', 12], ['barrel', 3]],
  desert: [['scrub2', 45], ['rock1', 25], ['rock2', 15], ['cliff', 6]],
  'rocky badlands': [['rock2', 45], ['rock1', 30], ['cliff', 22], ['scrub2', 20]],
  'highlands and mountains': [['rock2', 50], ['cliff', 34], ['rock1', 30], ['scrub1', 15]],
  jungle: [['palm1', 70], ['palm2', 60], ['scrub1', 40]],
};
