import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngjs from 'pngjs';
import type { Body, Layer } from './character.ts';
import { colourLayers, composite, renderLayer, shadowLayer, type Cell, type Palette, type Rgba } from './render.ts';

// Shared plumbing for the generator scripts: data files, palettes, PNG output and
// the character render (layers in draw order, coloured, composited).

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const readJson = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
export const paletteFile = readJson('data/palettes.json');
export const rig = readJson('data/rig.json');
export const cell: Cell = rig.cell;

// The full palette, with a race's material names mapped onto their ramps.
export function paletteFor(race: string): Palette {
  const ramps: Record<string, string[]> = { ...paletteFile.ramps };
  const map = rig.materials[race] as Record<string, string>;
  for (const [mat, ramp] of Object.entries(map)) if (!mat.startsWith('_')) ramps[mat] = paletteFile.ramps[ramp];
  return { light: paletteFile.light, outline: paletteFile.outline, shadow: paletteFile.shadow, ramps };
}

export function writePng(file: string, w: number, h: number, data: Rgba) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, pngjs.PNG.sync.write({ width: w, height: h, data: Buffer.from(data.buffer, data.byteOffset, data.byteLength) } as any));
}

export function drawOrder(layers: Layer[], facing: string): Layer[] {
  const segs: string[] = rig.segmentOrder[facing];
  const slots: string[] = rig.slotOrder.order;
  return [...layers].sort((a, b) => segs.indexOf(a.segment) - segs.indexOf(b.segment) || slots.indexOf(a.slot) - slots.indexOf(b.slot));
}

// Anything worn or grown on the body is hidden wherever the body is in front of it,
// so a garment's inside never shows through its openings.
export function attachOccluders(layers: Layer[], body: Body) {
  for (const l of layers) if (l.slot !== 'body' && !l.overlay) l.occluders = [body.shape];
}

export function renderCharacter(layers: Layer[], body: Body, facing: string, yaw: number, palette: Palette) {
  attachOccluders(layers, body);
  const ordered = drawOrder(layers, facing);
  const t0 = Date.now();
  const raws = ordered.map((l) => renderLayer(l, yaw, cell, palette));
  const coloured = colourLayers(raws, palette);
  const shadow = shadowLayer(cell, palette);
  const images = [shadow, ...ordered.map((l) => coloured.get(l.id)!)];
  const depths = [null, ...raws.map((r) => r.depth)];
  const image = composite(cell, images, paletteFile.castShadow, depths);
  // The figure alone, for scenes that lay every shadow on the ground first.
  const figure = composite(cell, images.slice(1), paletteFile.castShadow, depths.slice(1));
  return { ordered, coloured, shadow, image, body: figure, ms: Date.now() - t0 };
}
