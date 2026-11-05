import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { ANIMS, FACINGS, OUTFITS, type Facing, type FrameJob, type FrameResult } from './frames.ts';
import { cell, paletteFile, root, writePng } from './pipeline.ts';
import type { Rgba } from './render.ts';

// Sprite sheets for the player: every animation, in all eight directions, as
// separate layers. Usage: npm run sprites [-- anim ...]   (default: all)
// Writes art/out/sprites/: one sheet PNG and atlas per outfit and animation,
// preview grids, the mirroring test, and index.js for the viewer.

const out = path.join(root, 'out', 'sprites');
const anims = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ANIMS);
const race = 'redguard';
const facings = Object.keys(FACINGS) as Facing[];

const jobs: FrameJob[] = [];
for (const outfit of Object.keys(OUTFITS)) for (const anim of anims.filter((a) => OUTFITS[outfit].anims.includes(a))) for (const facing of facings) {
  for (let frame = 0; frame < ANIMS[anim].frames; frame++) jobs.push({ race, outfit, anim, frame, facing });
}

// ---------- render in parallel ----------

async function runAll(list: FrameJob[]): Promise<FrameResult[]> {
  const n = Math.max(1, Math.min(os.cpus().length - 1, list.length));
  const results: FrameResult[] = [];
  let next = 0, done = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: n }, () => new Promise<void>((resolve, reject) => {
    const w = new Worker(new URL('./worker.ts', import.meta.url));
    const feed = () => {
      if (next >= list.length) { w.terminate(); resolve(); return; }
      w.postMessage(list[next++]);
    };
    w.on('message', (r: FrameResult) => {
      results.push(r);
      done++;
      if (done % 16 === 0 || done === list.length) console.log(`  ${done}/${list.length} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      feed();
    });
    w.on('error', reject);
    feed();
  })));
  return results;
}

// ---------- packing ----------

type Placed = { sx: number; sy: number };
// Shelf packing: tallest first, left to right, a new shelf when a row is full.
function pack(sizes: { w: number; h: number }[], width: number): { at: Placed[]; height: number } {
  const order = sizes.map((s, i) => i).sort((a, b) => sizes[b].h - sizes[a].h);
  const at: Placed[] = new Array(sizes.length);
  let x = 0, y = 0, shelf = 0;
  for (const i of order) {
    const s = sizes[i];
    if (x + s.w > width) { x = 0; y += shelf + 1; shelf = 0; }
    at[i] = { sx: x, sy: y };
    x += s.w + 1;
    shelf = Math.max(shelf, s.h);
  }
  return { at, height: y + shelf };
}

function blit(dst: Rgba, dw: number, src: Rgba, sw: number, sh: number, x: number, y: number, flip = false) {
  for (let yy = 0; yy < sh; yy++) for (let xx = 0; xx < sw; xx++) {
    const si = (yy * sw + (flip ? sw - 1 - xx : xx)) * 4, a = src[si + 3] / 255;
    if (!a) continue;
    const di = ((y + yy) * dw + x + xx) * 4;
    if (dst[di + 3] === 0) { dst.set(src.subarray(si, si + 4), di); continue; } // onto empty: copy exactly
    for (let c = 0; c < 3; c++) dst[di + c] = src[si + c] * a + dst[di + c] * (1 - a);
    dst[di + 3] = Math.max(dst[di + 3], src[si + 3]);
  }
}

// ---------- main ----------

const t0 = Date.now();
console.log(`sprites: ${jobs.length} frames on ${Math.min(os.cpus().length - 1, jobs.length)} workers`);
const results = await runAll(jobs);
const renderMs = Date.now() - t0;
const key = (j: FrameJob) => `${j.outfit}/${j.anim}/${j.facing}/${j.frame}`;
const byKey = new Map(results.map((r) => [key(r.job), r]));

const indexFile = path.join(out, 'index.json');
const index: Record<string, any> = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : { sheets: {} };
const shadeAlpha = Math.round((1 - paletteFile.castShadow.multiply) * 255);
// Preview crop around the figure inside the cell.
const PV = { x: 46, y: 36, w: 100, h: 140 };

for (const outfit of Object.keys(OUTFITS)) for (const anim of anims.filter((a) => OUTFITS[outfit].anims.includes(a))) {
  const name = `${outfit}_${anim}`;
  const frames = facings.flatMap((f) => Array.from({ length: ANIMS[anim].frames }, (_, i) => byKey.get(`${outfit}/${anim}/${f}/${i}`)!));
  const pieces = frames.flatMap((r) => r.pieces.map((p) => ({ r, p })));
  const { at, height } = pack(pieces.map(({ p }) => p), 1024);
  const sheet = new Uint8ClampedArray(1024 * height * 4);
  pieces.forEach(({ p }, i) => blit(sheet, 1024, p.data, p.w, p.h, at[i].sx, at[i].sy));
  // Shade pieces are pure alpha; blit drops their colour, so write alpha back exactly.
  pieces.forEach(({ p }, i) => {
    if (p.kind !== 'shade') return;
    for (let yy = 0; yy < p.h; yy++) for (let xx = 0; xx < p.w; xx++) {
      const a = p.data[(yy * p.w + xx) * 4 + 3];
      if (a) sheet[((at[i].sy + yy) * 1024 + at[i].sx + xx) * 4 + 3] = a;
    }
  });
  writePng(path.join(out, `${name}.png`), 1024, height, sheet);

  const sprites: Record<string, any> = {};
  pieces.forEach(({ r, p }, i) => {
    const k = `${r.job.facing}/${r.job.frame}`;
    sprites[k] ??= { drawOrder: r.drawOrder, ms: r.ms, pieces: {} };
    sprites[k].pieces[p.id] = { sx: at[i].sx, sy: at[i].sy, w: p.w, h: p.h, x: p.x, y: p.y, kind: p.kind, segment: p.segment, slot: p.slot };
  });
  const atlas = {
    version: 2, outfit, outfitLabel: OUTFITS[outfit].label, items: OUTFITS[outfit].items, race, anim, frames: ANIMS[anim].frames, fps: ANIMS[anim].fps,
    facings, cell: { w: cell.w, h: cell.h, ox: cell.ox, oy: cell.oy }, sheet: `${name}.png`, sheetSize: [1024, height],
    shade: { mode: 'source-atop', alpha: shadeAlpha, note: 'Draw each #shade piece just before its layer, composited source-atop.' },
    sprites,
  };
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(atlas));
  index.sheets[name] = { atlas: `${name}.json`, script: `${name}.js`, pieces: pieces.length, sheet: [1024, height] };
  fs.writeFileSync(path.join(out, `${name}.js`), `(window.SPRITES ??= {})[${JSON.stringify(name)}] = ${JSON.stringify(atlas)};\n`);

  // Preview grid: a row per facing, a column per frame, composites at 1x.
  const cols = ANIMS[anim].frames, rows = facings.length;
  const grid = new Uint8ClampedArray(PV.w * cols * PV.h * rows * 4);
  for (let i = 0; i < grid.length; i += 4) grid.set([18, 15, 14, 255], i);
  facings.forEach((f, row) => {
    for (let col = 0; col < cols; col++) {
      const comp = byKey.get(`${outfit}/${anim}/${f}/${col}`)!.composite;
      const crop = new Uint8ClampedArray(PV.w * PV.h * 4);
      for (let y = 0; y < PV.h; y++) crop.set(comp.subarray(((y + PV.y) * cell.w + PV.x) * 4, ((y + PV.y) * cell.w + PV.x + PV.w) * 4), y * PV.w * 4);
      blit(grid, PV.w * cols, crop, PV.w, PV.h, col * PV.w, row * PV.h);
    }
  });
  writePng(path.join(out, 'previews', `${name}.png`), PV.w * cols, PV.h * rows, grid);
  const ms = frames.map((r) => r.ms);
  index.sheets[name].frameMs = { mean: Math.round(ms.reduce((a, b) => a + b, 0) / ms.length), max: Math.max(...ms) };
  console.log(`${name}: ${frames.length} frames, ${pieces.length} pieces, sheet 1024x${height}`);
}

// ---------- mirroring test ----------
// Is drawing W as a mirrored E good enough? Mirroring flips the light to the top
// right, swaps the brand and pouch to the wrong side, and moves the parting.
if (anims.includes('idle')) {
  const e = byKey.get('farm/idle/E/0')!.composite, w = byKey.get('farm/idle/W/0')!.composite;
  const mirrored = new Uint8ClampedArray(e.length);
  // Mirror about the anchor column (ox), so the feet stay in place.
  for (let y = 0; y < cell.h; y++) for (let x = 0; x < cell.w; x++) {
    const sx = 2 * cell.ox - 1 - x;
    if (sx < 0 || sx >= cell.w) continue;
    mirrored.set(e.subarray((y * cell.w + sx) * 4, (y * cell.w + sx) * 4 + 4), (y * cell.w + x) * 4);
  }
  let differ = 0, figure = 0;
  const diff = new Uint8ClampedArray(e.length);
  for (let i = 0; i < w.length; i += 4) {
    const a = w[i + 3] === 255, b = mirrored[i + 3] === 255;
    if (!a && !b) continue;
    figure++;
    const d = Math.abs(w[i] - mirrored[i]) + Math.abs(w[i + 1] - mirrored[i + 1]) + Math.abs(w[i + 2] - mirrored[i + 2]);
    if (a !== b || d > 24) { differ++; diff.set([220, 60, 40, 255], i); } else diff.set([60, 56, 52, 255], i);
  }
  const strip = new Uint8ClampedArray(PV.w * 3 * PV.h * 4);
  for (let i = 0; i < strip.length; i += 4) strip.set([18, 15, 14, 255], i);
  [w, mirrored, diff].forEach((img, k) => {
    const crop = new Uint8ClampedArray(PV.w * PV.h * 4);
    for (let y = 0; y < PV.h; y++) crop.set(img.subarray(((y + PV.y) * cell.w + PV.x) * 4, ((y + PV.y) * cell.w + PV.x + PV.w) * 4), y * PV.w * 4);
    blit(strip, PV.w * 3, crop, PV.w, PV.h, k * PV.w, 0);
  });
  writePng(path.join(out, 'previews', 'mirror_test.png'), PV.w * 3, PV.h, strip);
  index.mirror = { figurePixels: figure, differingPixels: differ, percent: +(100 * differ / figure).toFixed(1) };
  console.log(`mirror test: ${differ} of ${figure} figure pixels differ (${index.mirror.percent}%)`);
}

index.facings = facings;
index.renderMs = renderMs;
index.frames = results.length;
fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
fs.writeFileSync(path.join(out, 'index.js'), `window.SPRITE_INDEX = ${JSON.stringify(index)};\n`);
console.log(`done: ${results.length} frames in ${(renderMs / 1000).toFixed(0)} s`);
