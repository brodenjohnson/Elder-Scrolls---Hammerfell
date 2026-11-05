import fs from 'node:fs';
import path from 'node:path';
import pngjs from 'pngjs';
import { idlePose } from './pose.ts';
import { bodyLayers, farmClothesLayers, hairLayers, makeBody } from './character.ts';
import { ground, renderTile, CORNERS, EDGES, TILE_H, TILE_W, type Side } from './ground.ts';
import {
  barrel, campfire, chest, cliff, crate, house, iconOre, iconPotion, iconSword, palm, pot, renderObject, rock, scrub, wolf,
  type Sprite,
} from './objects.ts';
import { hex, type Rgba } from './render.ts';
import { hash3, vnoise3, type V3 } from './sdf.ts';
import { cell, paletteFile, paletteFor, renderCharacter, root, writePng } from './pipeline.ts';

// Asset samples beyond the player: ground tiles and transitions, a town building,
// props, a creature, a second human (palette swap), inventory icons, and a scene
// built from them. Usage: npm run samples [-- part ...] to redo only some parts;
// parts not redone are read back from the last run.

const out = path.join(root, 'out', 'samples');
const only = new Set(process.argv.slice(2));
const want = (part: string) => only.size === 0 || only.has(part);
const pal = { ...paletteFor('redguard'), sun: paletteFile.groundShadowSun.dir as V3 };
const manifestFile = path.join(out, 'manifest.json');
const manifest: Record<string, any> = fs.existsSync(manifestFile) && only.size ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};

function readPng(file: string): { w: number; h: number; data: Rgba } {
  const p = pngjs.PNG.sync.read(fs.readFileSync(file));
  return { w: p.width, h: p.height, data: new Uint8ClampedArray(p.data.buffer, p.data.byteOffset, p.data.byteLength) };
}
const time = <T>(f: () => T): [T, number] => { const t = Date.now(); const r = f(); return [r, Date.now() - t]; };

// ---------- tiles ----------

const TILES: [string, number][] = [
  ['sand.desert', 0], ['sand.desert', 1], ['sand.desert', 2], ['earth.cracked', 0], ['road', 0],
  ['sand.beach', 0], ['sand.beach', 1], ['grass.coast', 0], ['grass.coast', 1], ['water.shallow', 0], ['water.deep', 0],
];
// Low to high: a higher material draws over the edges of a lower neighbour.
const PRIORITY = ['water.deep', 'water.shallow', 'sand.beach', 'sand.desert', 'earth.cracked', 'grass.coast', 'road'];
const OVERLAY_OPTS: Record<string, { seed: number; edgeMat?: string; rim?: string }> = {
  'water.shallow': { seed: 81 },
  'sand.beach': { seed: 82, edgeMat: 'sand.wet', rim: 'foam' },
  'sand.desert': { seed: 83 },
  'earth.cracked': { seed: 84 },
  'grass.coast': { seed: 85 },
  road: { seed: 86 },
};
const tileName = (m: string, v: number) => `tiles/${m}_${v}.png`;
const overlayName = (m: string, s: Side) => `overlays/${m}__${s}.png`;

if (want('tiles')) {
  const [, ms] = time(() => {
    for (const [m, v] of TILES) writePng(path.join(out, tileName(m, v)), TILE_W, TILE_H, renderTile(ground[m](v), pal));
    for (const m of Object.keys(OVERLAY_OPTS)) {
      for (const side of [...EDGES, ...CORNERS]) {
        writePng(path.join(out, overlayName(m, side)), TILE_W, TILE_H, renderTile(ground[m](0), pal, { side, ...OVERLAY_OPTS[m] }));
      }
    }
  });
  manifest.tiles = TILES.map(([m, v]) => ({ id: `${m}_${v}`, material: m, variant: v, file: tileName(m, v) }));
  manifest.overlays = Object.keys(OVERLAY_OPTS).map((m) => ({ material: m, files: [...EDGES, ...CORNERS].map((s) => ({ side: s, file: overlayName(m, s) })) }));
  manifest.priority = PRIORITY;
  manifest.tileMs = ms;
  console.log(`tiles: ${TILES.length} tiles, ${Object.keys(OVERLAY_OPTS).length * 8} overlays, ${ms} ms`);
}

// ---------- objects ----------

type ObjSpec = { id: string; label: string; make: () => ReturnType<typeof house>; opts?: Parameters<typeof renderObject>[2] };
const OBJECTS: ObjSpec[] = [
  { id: 'house', label: 'Redguard house', make: house, opts: { ss: 3 } },
  { id: 'palm1', label: 'Palm', make: () => palm(1), opts: { ss: 3 } },
  { id: 'palm2', label: 'Palm, variant', make: () => palm(2), opts: { ss: 3 } },
  { id: 'cliff', label: 'Sandstone ledge, 2 by 2 tiles', make: cliff },
  { id: 'rock1', label: 'Boulder', make: () => rock(1) },
  { id: 'rock2', label: 'Boulder, variant', make: () => rock(3) },
  { id: 'scrub1', label: 'Dry scrub', make: () => scrub(1) },
  { id: 'scrub2', label: 'Dry scrub, variant', make: () => scrub(4) },
  { id: 'barrel', label: 'Barrel', make: barrel },
  { id: 'crate', label: 'Crate', make: crate },
  { id: 'pot', label: 'Water jar', make: () => pot(1, 'pot') },
  { id: 'potSmall', label: 'Small jar', make: () => pot(0.7, 'potSmall') },
  { id: 'chest', label: 'Chest', make: chest },
  { id: 'campfire', label: 'Campfire', make: campfire },
  { id: 'wolf', label: 'Wolf (character camera, 12 degrees)', make: wolf, opts: { pitchDeg: 12, yaw: -1.9, shadow: false } },
];
manifest.objects ??= {};
for (const o of OBJECTS) {
  if (!want(o.id) && !want('objects')) continue;
  const s = renderObject(o.make(), pal, o.opts);
  writePng(path.join(out, 'objects', `${o.id}.png`), s.w, s.h, s.image);
  writePng(path.join(out, 'objects', `${o.id}__body.png`), s.w, s.h, s.body);
  if (s.shadow) writePng(path.join(out, 'objects', `${o.id}__shadow.png`), s.w, s.h, s.shadow);
  manifest.objects[o.id] = { id: o.id, label: o.label, file: `objects/${o.id}.png`, w: s.w, h: s.h, ox: s.ox, oy: s.oy, ms: s.ms, colours: countColours(s.body) };
  console.log(`${o.id}: ${s.w}x${s.h}, ${s.ms} ms`);
}

// ---------- characters ----------

manifest.characters ??= {};
for (const [id, race, label] of [['farmer', 'redguard', 'Redguard farmer (player)'], ['bandit', 'nord', 'Nord, palette swap']] as const) {
  if (!want(id) && !want('characters')) continue;
  const pose = idlePose();
  const body = makeBody(pose);
  const r = renderCharacter([...bodyLayers(pose, body), ...hairLayers(pose, body), ...farmClothesLayers(pose, body)], body, 'S', 0, paletteFor(race));
  writePng(path.join(out, 'characters', `${id}.png`), cell.w, cell.h, r.image);
  writePng(path.join(out, 'characters', `${id}__body.png`), cell.w, cell.h, r.body);
  writePng(path.join(out, 'characters', `${id}__shadow.png`), cell.w, cell.h, r.shadow);
  manifest.characters[id] = { id, label, file: `characters/${id}.png`, w: cell.w, h: cell.h, ox: cell.ox, oy: cell.oy, ms: r.ms };
  console.log(`${id}: ${r.ms} ms`);
}

// ---------- icons ----------

if (want('icons')) {
  manifest.icons = [];
  for (const [id, label, make, pitchDeg, scale] of [
    ['iron_sword', 'Iron Sword', iconSword, 0, 1.25],
    ['potion', 'Potion of Minor Healing', iconPotion, 18, 1.6],
    ['iron_ore', 'Iron Ore', iconOre, 30, 1.45],
  ] as const) {
    const s = renderObject(make(), pal, { pitchDeg, scale, yaw: 0.35, shadow: false, size: [64, 64] });
    writePng(path.join(out, 'icons', `${id}.png`), 64, 64, s.image);
    manifest.icons.push({ id, label, file: `icons/${id}.png` });
  }
  console.log('icons: 3');
}

// ---------- the scene ----------
// A 18 by 18 tile strip of coast: desert inland, coastal grass, a beach and the
// sea, with the house, props and figures placed on it. Built only from the
// exported sprites, the way the game would draw it.

if (want('scene')) {
  const N = 18, OY = 150;
  const W = N * TILE_W, Hs = N * TILE_H + OY + 40;
  const img = new Uint8ClampedArray(W * Hs * 4);
  const scr = (a: number, b: number) => [N * 32 + (a - b) * 32, OY + (a + b) * 16];

  // Terrain from soft noise, so the boundaries wander and every transition case turns up.
  const n2 = (i: number, j: number, s: number, seed: number) => vnoise3(i / s, j / s, seed);
  const terrain = (i: number, j: number): string => {
    const w = j - 0.35 * i + 4 * (n2(i, j, 3, 1) - 0.5);
    if (w > 10.5) return 'water.deep';
    if (w > 8.6) return 'water.shallow';
    if (i === 9 && j >= 8 && w <= 7) return 'road';
    if (w > 6.6) return 'sand.beach';
    const e = i + 5 * (n2(i, j, 3, 2) - 0.5);
    if (e < 6) return 'grass.coast';
    if (n2(i, j, 2.5, 3) > 0.8) return 'earth.cracked';
    return 'sand.desert';
  };
  const grid: string[][] = [];
  for (let i = 0; i < N; i++) { grid.push([]); for (let j = 0; j < N; j++) grid[i].push(terrain(i, j)); }
  // Clear the house plot and the path to its door.
  for (let i = 7; i <= 11; i++) for (let j = 2; j <= 8; j++) if (grid[i][j].startsWith('water') === false) grid[i][j] = 'sand.desert';
  for (let j = 8; j < N; j++) { if (grid[9][j].startsWith('water') || grid[9][j] === 'sand.beach') break; grid[9][j] = 'road'; }

  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= N || j >= N ? grid[Math.max(0, Math.min(N - 1, i))][Math.max(0, Math.min(N - 1, j))] : grid[i][j]);
  const cache = new Map<string, { w: number; h: number; data: Rgba }>();
  const load = (rel: string) => { if (!cache.has(rel)) cache.set(rel, readPng(path.join(out, rel))); return cache.get(rel)!; };
  const blit = (src: { w: number; h: number; data: Rgba }, x: number, y: number, mask?: Uint8Array) => {
    for (let yy = 0; yy < src.h; yy++) for (let xx = 0; xx < src.w; xx++) {
      const X = x + xx, Y = y + yy;
      if (X < 0 || Y < 0 || X >= W || Y >= Hs) continue;
      const si = (yy * src.w + xx) * 4, a = src.data[si + 3] / 255;
      if (a === 0) continue;
      const di = (Y * W + X) * 4;
      if (mask) { mask[Y * W + X] = 1; continue; }
      for (let c = 0; c < 3; c++) img[di + c] = src.data[si + c] * a + img[di + c] * (1 - a);
      img[di + 3] = 255;
    }
  };
  // Ground: base tile, then each higher neighbour's edges and corners.
  let overlayCount = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const m = grid[i][j];
    const [x, y] = scr(i, j);
    const variants = TILES.filter(([t]) => t === m).map(([, v]) => v);
    const v = variants[Math.floor(hash3(i, j, 5) * variants.length * 1.6) % variants.length] ?? 0;
    blit(load(tileName(m, hash3(i, j, 6) < 0.6 ? 0 : v)), x - 32, y);
    const rank = PRIORITY.indexOf(m);
    for (const hm of PRIORITY.slice(rank + 1)) {
      const is = (di: number, dj: number) => at(i + di, j + dj) === hm;
      const sides: Side[] = [];
      if (is(-1, 0)) sides.push('a0');
      if (is(1, 0)) sides.push('a1');
      if (is(0, -1)) sides.push('b0');
      if (is(0, 1)) sides.push('b1');
      if (is(-1, -1) && !is(-1, 0) && !is(0, -1)) sides.push('a0b0');
      if (is(-1, 1) && !is(-1, 0) && !is(0, 1)) sides.push('a0b1');
      if (is(1, -1) && !is(1, 0) && !is(0, -1)) sides.push('a1b0');
      if (is(1, 1) && !is(1, 0) && !is(0, 1)) sides.push('a1b1');
      for (const s of sides) { blit(load(overlayName(hm, s)), x - 32, y); overlayCount++; }
    }
  }

  // Things standing on the ground. Sort key: a + b of the anchor (further back first).
  type Placed = { id: string; kind: 'objects' | 'characters'; a: number; b: number; key?: number; ellipse?: [number, number] };
  const placed: Placed[] = [
    { id: 'house', kind: 'objects', a: 9, b: 5 },
    { id: 'palm1', kind: 'objects', a: 4.4, b: 2.6 },
    { id: 'palm2', kind: 'objects', a: 2.8, b: 8.4 },
    { id: 'rock2', kind: 'objects', a: 15.2, b: 12.8 },
    { id: 'palm2', kind: 'objects', a: 5.8, b: 11.6 },
    { id: 'cliff', kind: 'objects', a: 15.4, b: 1.6 },
    { id: 'rock1', kind: 'objects', a: 13.6, b: 4.4 },
    { id: 'rock2', kind: 'objects', a: 16.2, b: 6.4 },
    { id: 'scrub1', kind: 'objects', a: 13.2, b: 2.2 },
    { id: 'scrub2', kind: 'objects', a: 16.4, b: 9.6 },
    { id: 'scrub1', kind: 'objects', a: 3.4, b: 5.2 },
    { id: 'barrel', kind: 'objects', a: 7.7, b: 8.7 },
    { id: 'crate', kind: 'objects', a: 7.0, b: 8.5 },
    { id: 'pot', kind: 'objects', a: 11.0, b: 8.6 },
    { id: 'potSmall', kind: 'objects', a: 11.5, b: 8.3 },
    { id: 'chest', kind: 'objects', a: 12.4, b: 10.6 },
    { id: 'campfire', kind: 'objects', a: 13.3, b: 9.2 },
    { id: 'farmer', kind: 'characters', a: 9.75, b: 9.9, ellipse: [17, 11] },
    { id: 'bandit', kind: 'characters', a: 14.6, b: 8.4, ellipse: [17, 11] },
    { id: 'wolf', kind: 'objects', a: 16.0, b: 12.2, ellipse: [30, 12] },
  ];
  placed.sort((p, q) => (p.key ?? p.a + p.b) - (q.key ?? q.a + q.b));
  // Shadows first, as one mask, so overlapping shadows do not stack and no shadow lands on an object.
  const shadowMask = new Uint8Array(W * Hs);
  for (const p of placed) {
    const meta = manifest[p.kind][p.id];
    const [x, y] = scr(p.a, p.b);
    if (p.ellipse) {
      const [rx, ry] = p.ellipse;
      for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) {
        if ((xx / rx) ** 2 + (yy / (ry * 0.5)) ** 2 > 1) continue;
        const X = Math.round(x + xx), Y = Math.round(y + yy);
        if (X >= 0 && Y >= 0 && X < W && Y < Hs) shadowMask[Y * W + X] = 1;
      }
    } else blit(load(`${p.kind}/${p.id}__shadow.png`), Math.round(x - meta.ox), Math.round(y - meta.oy), shadowMask);
  }
  const [sr, sg, sb] = hex(paletteFile.shadow.color), sa = paletteFile.shadow.alpha;
  for (let i = 0; i < W * Hs; i++) if (shadowMask[i]) for (let c = 0; c < 3; c++) img[i * 4 + c] = [sr, sg, sb][c] * sa + img[i * 4 + c] * (1 - sa);
  for (const p of placed) {
    const meta = manifest[p.kind][p.id];
    const [x, y] = scr(p.a, p.b);
    blit(load(`${p.kind}/${p.id}__body.png`), Math.round(x - meta.ox), Math.round(y - meta.oy));
  }
  // Fill the empty corners with the darkest sea colour, so the screenshot reads as a scene.
  const sea = hex(paletteFile.ramps['water.deep'][0]);
  for (let i = 0; i < W * Hs; i++) if (img[i * 4 + 3] === 0) img.set([sea[0], sea[1], sea[2], 255], i * 4);
  writePng(path.join(out, 'scene.png'), W, Hs, img);
  manifest.scene = { file: 'scene.png', w: W, h: Hs, tiles: N * N, overlays: overlayCount, objects: placed.length, colours: countColours(img) };
  console.log(`scene: ${W}x${Hs}, ${overlayCount} overlays, ${placed.length} objects`);
}

function countColours(px: Rgba): number {
  const s = new Set<number>();
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 0) s.add((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
  return s.size;
}

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
// Same data as a script, so the comparison page can read it from file:// without fetch.
fs.writeFileSync(path.join(out, 'manifest.js'), `window.SAMPLES = ${JSON.stringify(manifest)};\n`);
