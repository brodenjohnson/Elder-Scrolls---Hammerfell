import fs from 'node:fs';
import path from 'node:path';
import { idlePose } from './pose.ts';
import { bodyLayers, farmClothesLayers, hairLayers, makeBody } from './character.ts';
import type { Rgba } from './render.ts';
import { cell, paletteFor, renderCharacter, root, writePng } from './pipeline.ts';

const out = path.join(root, 'out', 'gate1');
const palette = paletteFor('redguard');
const pose = idlePose();
const body = makeBody(pose);
const bodyL = bodyLayers(pose, body);
const hair = hairLayers(pose, body);
const clothes = farmClothesLayers(pose, body);

// Base body (brand visible), then dressed.
const base = renderCharacter([...bodyL, ...hair], body, 'S', 0, palette);
writePng(path.join(out, 'S_base.png'), cell.w, cell.h, base.image);
const dressed = renderCharacter([...bodyL, ...hair, ...clothes], body, 'S', 0, palette);
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
