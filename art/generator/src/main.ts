import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngjs from 'pngjs';
import { idlePose } from './pose.ts';
import { bodyLayers, farmClothesLayers, hairLayers, makeBody, type Body, type Layer } from './character.ts';
import { colourLayers, composite, renderLayer, shadowLayer, type Cell, type Palette, type Rgba } from './render.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const paletteFile = readJson('data/palettes.json');
const rig = readJson('data/rig.json');
const cell: Cell = rig.cell;

function paletteFor(race: string): Palette {
  const map = rig.materials[race] as Record<string, string>;
  const ramps: Record<string, string[]> = {};
  for (const [mat, ramp] of Object.entries(map)) if (!mat.startsWith('_')) ramps[mat] = paletteFile.ramps[ramp];
  return { light: paletteFile.light, outline: paletteFile.outline, shadow: paletteFile.shadow, ramps };
}

function writePng(file: string, w: number, h: number, data: Rgba) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, pngjs.PNG.sync.write({ width: w, height: h, data: Buffer.from(data.buffer) } as any));
}

function drawOrder(layers: Layer[], facing: string): Layer[] {
  const segs: string[] = rig.segmentOrder[facing];
  const slots: string[] = rig.slotOrder.order;
  return [...layers].sort((a, b) => segs.indexOf(a.segment) - segs.indexOf(b.segment) || slots.indexOf(a.slot) - slots.indexOf(b.slot));
}

// Anything worn or grown on the body is hidden wherever the body is in front of it,
// so a garment's inside never shows through its openings.
function attachOccluders(layers: Layer[], body: Body) {
  for (const l of layers) if (l.slot !== 'body' && !l.overlay) l.occluders = [body.shape];
}

function renderSet(layers: Layer[], facing: string, yaw: number, palette: Palette) {
  attachOccluders(layers, body);
  const ordered = drawOrder(layers, facing);
  const t0 = Date.now();
  const raws = ordered.map((l) => renderLayer(l, yaw, cell, palette));
  const coloured = colourLayers(raws, palette);
  const shadow = shadowLayer(cell, palette);
  const images = [shadow, ...ordered.map((l) => coloured.get(l.id)!)];
  const depths = [null, ...raws.map((r) => r.depth)];
  return { ordered, coloured, shadow, image: composite(cell, images, paletteFile.castShadow, depths), ms: Date.now() - t0 };
}

const out = path.join(root, 'out', 'gate1');
const palette = paletteFor('redguard');
const pose = idlePose();
const body = makeBody(pose);
const bodyL = bodyLayers(pose, body);
const hair = hairLayers(pose, body);
const clothes = farmClothesLayers(pose, body);

// Base body (brand visible), then dressed.
const base = renderSet([...bodyL, ...hair], 'S', 0, palette);
writePng(path.join(out, 'S_base.png'), cell.w, cell.h, base.image);
const dressed = renderSet([...bodyL, ...hair, ...clothes], 'S', 0, palette);
writePng(path.join(out, 'S_farm.png'), cell.w, cell.h, dressed.image);
writePng(path.join(out, 'layers', 'shadow.png'), cell.w, cell.h, dressed.shadow);
for (const l of dressed.ordered) writePng(path.join(out, 'layers', `${l.id.replace('/', '__')}.png`), cell.w, cell.h, dressed.coloured.get(l.id)!);

const atlas = {
  version: 1,
  cell,
  facing: 'S',
  frame: 'idle_00',
  race: 'redguard',
  outfit: ['Farm Clothes', 'Farm Boots'],
  drawOrder: ['shadow', ...dressed.ordered.map((l) => l.id)],
  layers: [
    { id: 'shadow', segment: 'root', slot: 'shadow', file: 'layers/shadow.png' },
    ...dressed.ordered.map((l) => ({ id: l.id, segment: l.segment, slot: l.slot, file: `layers/${l.id.replace('/', '__')}.png` })),
  ],
};
fs.writeFileSync(path.join(out, 'atlas.json'), JSON.stringify(atlas, null, 2));
// Same data as a script, so the comparison page can read it from file:// without fetch.
fs.writeFileSync(path.join(out, 'atlas.js'), `window.ATLAS = ${JSON.stringify(atlas)};
`);

// Working preview: images side by side, nearest-neighbour scaled, on the concept sheets' near-black.
function preview(file: string, images: Rgba[], scale: number, crop = { x: 40, y: 20, w: 112, h: 160 }) {
  const W = crop.w * scale * images.length, Hh = crop.h * scale;
  const px = new Uint8ClampedArray(W * Hh * 4);
  for (let i = 0; i < px.length; i += 4) px.set([18, 15, 14, 255], i);
  images.forEach((img, k) => {
    for (let y = 0; y < Hh; y++) for (let x = 0; x < crop.w * scale; x++) {
      const sx = crop.x + Math.floor(x / scale), sy = crop.y + Math.floor(y / scale);
      const si = (sy * cell.w + sx) * 4, a = img[si + 3] / 255;
      if (!a) continue;
      const di = (y * W + k * crop.w * scale + x) * 4;
      for (let c = 0; c < 3; c++) px[di + c] = img[si + c] * a + px[di + c] * (1 - a);
    }
  });
  writePng(file, W, Hh, px);
}
preview(path.join(out, 'preview_4x.png'), [base.image, dressed.image], 4);
preview(path.join(out, 'preview_head_10x.png'), [base.image, dressed.image], 10, { x: 78, y: 44, w: 36, h: 32 });
console.log(`gate1: ${dressed.ordered.length} layers, render ${dressed.ms} ms (base ${base.ms} ms) -> ${out}`);
