import path from 'node:path';
import { idlePose, segmentLocal } from './pose.ts';
import { bodyLayers, hairLayers, makeBody, moved, rotX, rotY, rotZ, type Fn, type Layer, type PaintResult } from './character.ts';
import { leatherArmourLayers } from './equipment.ts';
import { segmentOrder } from './frames.ts';
import { colourLayers, composite, hex, renderLayer, type Cell, type Rgba } from './render.ts';
import { hash3, vnoise3, type V3 } from './sdf.ts';
import { attachOccluders, paletteFile, paletteFor, rig, root, writePng } from './pipeline.ts';

// Gate 5: the head and the right arm severed. The body keeps standing with its
// stumps showing, the parts tumble across the ground in eight frames, and blood
// marks the armour and the ground. Usage: npm run dismember

const SEVERED = new Set(['head', 'upperArm.R', 'forearm.R']);
const YAW = Math.PI / 4; // facing south-east, so both stumps are in view
const cell: Cell = { w: 288, h: 200, ox: 150, oy: 168, scale: 0.88, characterPitchDeg: 12 };
const palette = paletteFor('redguard');
const p = idlePose();
const body = makeBody(p);
const all = [...bodyLayers(p, body), ...hairLayers(p, body), ...leatherArmourLayers(p, body)];
const local = segmentLocal(p);
for (const l of all) l.local = local[l.segment];
attachOccluders(all, body);

// Which segment, other than `own`, is nearest a point: on a cut face, that is the neighbour across the cut.
function neighbour(own: string, x: number, y: number, z: number): string {
  let best = Infinity, name = '';
  body.parts.names.forEach((n, i) => {
    if (n === own) return;
    const d = body.parts.sdfs[i](x, y, z);
    if (d < best) { best = d; name = n; }
  });
  return name;
}
function woundPaint(l: Layer, severedSide: boolean) {
  return (x: number, y: number, z: number): PaintResult | null => {
    const n = neighbour(l.segment, x, y, z);
    // A face is a wound when the cut separates a severed part from the body.
    if (SEVERED.has(n) === severedSide) return null;
    if (l.slot !== 'body') return { dt: -2 }; // the cut edge of cloth or leather
    // The wound is at the neck if the head is involved, otherwise at the right shoulder.
    const atNeck = (SEVERED.has(l.segment) ? l.segment : n) === 'head';
    const j = atNeck ? p.neck : p.shoulder.R;
    if (Math.hypot(x - j[0], y - j[1], z - j[2]) < (atNeck ? 2.0 : 2.6)) return { mat: 'bone' };
    return { mat: 'flesh', dt: hash3(Math.floor(x), Math.floor(y), Math.floor(z)) < 0.25 ? -1 : 0 };
  };
}

// Blood over the outermost surface of the torso, around the neck and shoulder, running down.
function bloodLayer(): Layer {
  const torso = all.filter((l) => l.segment === 'torso' && !l.overlay);
  const outer: Fn = (x, y, z) => {
    let d = Infinity;
    for (const l of torso) for (const pc of l.pieces) d = Math.min(d, Math.max(pc.shape(x, y, z), pc.cut(x, y, z)));
    return d;
  };
  const near = (x: number, y: number, z: number, j: V3, r: number) => Math.hypot(x - j[0], (y - j[1]) * 0.8, z - j[2]) < r;
  return {
    id: 'torso/equipBlood', segment: 'torso', slot: 'equipBlood', overlay: true,
    pieces: [{
      shape: (x, y, z) => outer(x, y, z) - 0.15, cut: () => -Infinity, mat: () => 'blood',
      paint: (x, y, z) => {
        const n = vnoise3(x / 3, y / 3, z / 3);
        const run = hash3(Math.floor(x / 2.2), 0, Math.floor(z / 2.2)); // drips run straight down
        if (near(x, y, z, p.neck, 4.5 + 3 * n) || near(x, y, z, p.shoulder.R, 4.5 + 3 * n)) return { dt: n > 0.65 ? 0 : -1 };
        void run;
        return { mat: null };
      },
    }],
    bounds: { c: p.chest, r: 26 },
  };
}

// ---------- moving a severed part ----------

const mul = (a: number[], b: number[]) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]));

// ---------- assemble ----------

const kept = all.filter((l) => !SEVERED.has(l.segment) && l.slot !== 'weapon');
const severed = all.filter((l) => SEVERED.has(l.segment));
for (const l of kept) if (!l.overlay) l.wound = woundPaint(l, true);
// A clean cut through the neck: the torso keeps only a short stump with a flat wound face.
const NECK_CUT = p.neck[1] + 1.5;
// Every kept layer loses anything above it: garments hug the whole body, head
// included, and those hidden parts would otherwise be left floating.
const keptSdfs = body.parts.names.map((nm, i) => (SEVERED.has(nm) ? null : body.parts.sdfs[i])).filter((f): f is Fn => !!f);
const keptBody: Fn = (x, y, z) => { let d = Infinity; for (const f of keptSdfs) d = Math.min(d, f(x, y, z)); return d; };
for (const l of kept) {
  l.pieces = l.pieces.map((pc) => ({
    ...pc,
    cut: (x: number, y: number, z: number) => (Math.hypot(x - p.neck[0], z - p.neck[2]) < 12 ? Math.max(pc.cut(x, y, z), y - NECK_CUT) : pc.cut(x, y, z)),
  }));
  if (l.occluders) l.occluders = [keptBody];
}
for (const l of severed) {
  if (!l.overlay) l.wound = woundPaint(l, false);
  // A severed part is hidden only by its own flesh, not by the body it left.
  if (l.slot !== 'body') l.occluders = [body.parts.sdfs[body.parts.names.indexOf(l.segment)]];
}
const blood = bloodLayer();
const segs = segmentOrder(p, YAW), slots: string[] = rig.slotOrder.order;
const ordered = [...kept, blood].sort((a, b) => segs.indexOf(a.segment) - segs.indexOf(b.segment) || slots.indexOf(a.slot) - slots.indexOf(b.slot));
const headParts = severed.filter((l) => l.segment === 'head');
const armParts = severed.filter((l) => l.segment !== 'head');

const t0 = Date.now();
const bodyRaws = ordered.map((l) => renderLayer(l, YAW, cell, palette));
console.log(`body with stumps: ${Date.now() - t0} ms`);

// Ground marks, drawn flat at the 30 degree ground pitch: soft ellipses in screen space.
function ellipses(list: { x: number; z: number; rx: number; rz: number; color: string; alpha: number }[]): Rgba {
  const px = new Uint8ClampedArray(cell.w * cell.h * 4);
  for (const e of list) {
    // Character-space ground point to the screen, after the facing turn.
    const wx = e.x * Math.cos(YAW) + e.z * Math.sin(YAW), wz = -e.x * Math.sin(YAW) + e.z * Math.cos(YAW);
    const pitch = (cell.characterPitchDeg * Math.PI) / 180;
    const sx = cell.ox + wx * cell.scale, sy = cell.oy + wz * Math.sin(pitch) * cell.scale;
    const [r, g, b] = hex(e.color);
    for (let y = 0; y < cell.h; y++) for (let x = 0; x < cell.w; x++) {
      const dx = (x + 0.5 - sx) / e.rx, dy = (y + 0.5 - sy) / (e.rz * 0.5);
      const n = vnoise3(x / 4, y / 4, e.x);
      if (dx * dx + dy * dy <= 0.75 + 0.35 * n) px.set([r, g, b, Math.round(e.alpha * 255)], (y * cell.w + x) * 4);
    }
  }
  return px;
}

const HEAD_AT: V3 = [16, 7.5, 24], ARM_AT: V3 = [-50, 5, 10];
const armMid: V3 = [(p.shoulder.R[0] + p.hand.R[0]) / 2, (p.shoulder.R[1] + p.hand.R[1]) / 2, (p.shoulder.R[2] + p.hand.R[2]) / 2];
const FRAMES = 8;
const frames: Rgba[] = [];
for (let k = 0; k < FRAMES; k++) {
  const t = k / FRAMES;
  // The head rolls forward on its side; the arm spins about its length and slides.
  const roll = t * Math.PI * 1.5;
  // Lying on one cheek with the face toward the camera, turning over like a wheel as it rolls.
  const headR = mul(rotY(-YAW + 0.25 * Math.sin(roll)), rotZ(1.4 + roll * 0.8));
  const headTo: V3 = [HEAD_AT[0] + roll * 2.5, HEAD_AT[1], HEAD_AT[2] - roll * 2.5];
  const armR = mul(rotY(-0.5 + t * 0.6), mul(rotX(t * Math.PI), rotZ(Math.PI / 2)));
  const armTo: V3 = [ARM_AT[0] - t * 10, ARM_AT[1], ARM_AT[2] + t * 4];
  const parts = [
    ...headParts.map((l) => moved(l, headR, p.head, headTo)),
    ...armParts.map((l) => moved(l, armR, armMid, armTo)),
  ];
  const partRaws = parts.map((l) => renderLayer(l, YAW, cell, palette));
  const raws = [...bodyRaws, ...partRaws];
  const coloured = colourLayers(raws, palette);
  const ground = ellipses([
    { x: 0, z: 0, rx: 19, rz: 12, color: paletteFile.shadow.color, alpha: paletteFile.shadow.alpha },
    { x: -6, z: 6, rx: 15 + k * 0.6, rz: 10 + k * 0.4, color: paletteFile.ramps.blood[1], alpha: 1 },
    { x: headTo[0], z: headTo[2] - 6, rx: 8 + k * 0.5, rz: 6, color: paletteFile.ramps.blood[2], alpha: 1 },
    { x: armTo[0], z: armTo[2], rx: 9 + k * 0.5, rz: 6, color: paletteFile.ramps.blood[1], alpha: 1 },
  ]);
  const images = [ground, ...[...ordered, ...parts].map((l) => coloured.get(l.id)!)];
  frames.push(composite(cell, images, paletteFile.castShadow, [null, ...raws.map((r) => r.depth)]));
  console.log(`frame ${k + 1}: ${Date.now() - t0} ms`);
}

// The gate sheet: the eight tumble frames at 2x, then the last frame at 3x.
const CROP = { x: 92, y: 30, w: 130, h: 160 };
const S2 = 3, S3 = 4;
const W = CROP.w * S2 * 4, H = CROP.h * S2 * 2 + CROP.h * S3;
const sheet = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < sheet.length; i += 4) sheet.set([18, 15, 14, 255], i);
const put = (img: Rgba, s: number, ox: number, oy: number) => {
  for (let y = 0; y < CROP.h * s; y++) for (let x = 0; x < CROP.w * s; x++) {
    const si = ((CROP.y + Math.floor(y / s)) * cell.w + CROP.x + Math.floor(x / s)) * 4, a = img[si + 3] / 255;
    if (!a) continue;
    const di = ((oy + y) * W + ox + x) * 4;
    for (let c = 0; c < 3; c++) sheet[di + c] = img[si + c] * a + sheet[di + c] * (1 - a);
  }
};
frames.forEach((f, k) => put(f, S2, (k % 4) * CROP.w * S2, Math.floor(k / 4) * CROP.h * S2));
put(frames[FRAMES - 1], S3, 0, CROP.h * S2 * 2);
const outFile = path.join(root, '..', 'docs', 'gates', 'gate5', 'dismemberment.png');
writePng(outFile, W, H, sheet);
for (let k = 0; k < FRAMES; k++) writePng(path.join(root, 'out', 'dismember', `frame_${k}.png`), cell.w, cell.h, frames[k]);
console.log(`gate 5: ${FRAMES} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${outFile}`);
