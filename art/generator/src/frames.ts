import { idlePose, segmentLocal, walkPose, type Pose } from './pose.ts';
import { attack2HPose, attackPose, block2HPose, blockPose, deathPose, hitPose, rollPose } from './combat.ts';
import {
  applyBuild, applyR, BUILDS, bodyLayers, farmClothesLayers, hairLayers, makeBody, moved, setBuild, type Body, type Fn, type HairStyle, type Layer,
} from './character.ts';
import { colourLayers, composite, renderLayer, shadowLayer, type Rgba } from './render.ts';
import type { V3 } from './sdf.ts';
import { attachOccluders, cell, paletteFile, paletteFor, readJson, rig } from './pipeline.ts';
import { dogLayers } from './creature.ts';
import {
  carryGreatsword, furArmourLayers, garbLayers, ironBattleaxeLayers, ironSwordLayers, leatherArmourLayers, nadiraClothesLayers, scimitarLayers, steelArmourLayers,
  steelGreatswordLayers, taviClothesLayers,
} from './equipment.ts';

// ---------- one animation frame, in one direction ----------

// Facing yaw: 0 faces the viewer (screen south), pi/2 faces screen right (east).
export const FACINGS = {
  S: 0, SE: Math.PI / 4, E: Math.PI / 2, NE: (3 * Math.PI) / 4,
  N: Math.PI, NW: (-3 * Math.PI) / 4, W: -Math.PI / 2, SW: -Math.PI / 4,
} as const;
export type Facing = keyof typeof FACINGS;

export const ANIMS: Record<string, { frames: number; fps: number; pose: (t: number) => Pose }> = {
  idle: { frames: 6, fps: 5, pose: idlePose },
  walk: { frames: 8, fps: 10, pose: walkPose },
  attack: { frames: 6, fps: 14, pose: attackPose },
  block: { frames: 4, fps: 8, pose: blockPose },
  roll: { frames: 8, fps: 14, pose: rollPose },
  hit: { frames: 3, fps: 12, pose: hitPose },
  death: { frames: 8, fps: 10, pose: deathPose },
};

// Outfit labels and item stats come from data/outfits.json; the shapes are code.
const OUTFIT_DATA = readJson('data/outfits.json');
// pose: adjusts idle and walk (a two-hander carried on the shoulder); poses: replaces an
// animation's poses (two-handed swings and guards).
type Outfit = {
  label: string; items: unknown[]; anims: string[]; race?: string; layers: (p: Pose, body: Body) => Layer[];
  pose?: (p: Pose) => Pose; poses?: Record<string, (t: number) => Pose>;
  build?: string; hair?: HairStyle; brand?: boolean; // the body: BUILDS key, hair style, the player's brand
  creature?: (anim: string, t: number) => Layer[];     // an animal: its own body and cycles instead of a person's
};
const TWO_HANDED = { attack: attack2HPose, block: block2HPose };
const COMBAT = ['idle', 'walk', 'attack', 'block', 'roll', 'hit', 'death'];
export const OUTFITS: Record<string, Outfit> = {
  farm: { ...OUTFIT_DATA.farm, anims: ['idle', 'walk', 'hit', 'death'], layers: farmClothesLayers }, // unarmed, he can still be hurt and killed
  leather: { ...OUTFIT_DATA.leather, anims: COMBAT, layers: (p, b) => [...leatherArmourLayers(p, b), ...ironSwordLayers(p)] },
  // The farmer with a sword in his own clothes, and a Nord bandit in leather: the first fight.
  farmSword: { ...OUTFIT_DATA.farmSword, anims: COMBAT, layers: (p, b) => [...farmClothesLayers(p, b), ...ironSwordLayers(p)] },
  bandit: { ...OUTFIT_DATA.bandit, anims: COMBAT, race: 'nord', layers: (p, b) => [...leatherArmourLayers(p, b), ...ironSwordLayers(p)] },
  steel: { ...OUTFIT_DATA.steel, anims: COMBAT, layers: (p, b) => [...steelArmourLayers(p, b), ...steelGreatswordLayers(p)], pose: carryGreatsword, poses: TWO_HANDED },
  // The second and third enemies: a Nord marauder in fur with a battleaxe, and an Alik'r warrior.
  marauder: { ...OUTFIT_DATA.marauder, anims: COMBAT, race: 'nord', layers: (p, b) => [...furArmourLayers(p, b), ...ironBattleaxeLayers(p)], pose: carryGreatsword, poses: TWO_HANDED },
  alikr: { ...OUTFIT_DATA.alikr, anims: COMBAT, layers: (p, b) => [...garbLayers(p, b), ...scimitarLayers(p)] },
  // The family (prologue): Nadira and Tavi. No brand: that is the player's alone.
  nadira: { label: 'Nadira, in Farm Clothes', items: [], anims: ['idle', 'walk'], build: 'woman', hair: 'long', brand: false, layers: nadiraClothesLayers },
  tavi: { label: 'Tavi, in Farm Clothes', items: [], anims: ['idle', 'walk'], build: 'girl', hair: 'braids', brand: false, layers: taviClothesLayers },
  dune: { label: 'Dune, the farm dog', items: [], anims: ['idle', 'walk'], layers: () => [], creature: dogLayers },
};

export type FrameJob = { race: string; outfit: string; anim: string; frame: number; facing: Facing };
export type FramePiece = {
  id: string; segment: string; slot: string; kind: 'shadow' | 'layer' | 'shade';
  x: number; y: number; w: number; h: number; data: Uint8ClampedArray;
};
export type FrameResult = { job: FrameJob; drawOrder: string[]; pieces: FramePiece[]; composite: Rgba; ms: number };

// Segment draw order, back to front, worked out per frame from where the limbs
// are. Rules (see README):
//  - an arm well behind the torso (the far arm in side views) goes first, behind the legs;
//  - legs, each followed by its foot (boots overlap trousers), far leg first;
//  - the torso (its shirt skirt hangs over the thighs);
//  - a back item (cloak, quiver) before everything when he faces the viewer, after the torso when he faces away;
//  - the remaining arms, far first, forearm before upper arm (the sleeve overlaps the elbow);
//  - the head, then held items.
export function segmentOrder(p: Pose, yaw: number): string[] {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const depth = (v: V3) => -v[0] * s + v[2] * c; // toward the viewer, after turning
  const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const torso = depth(p.chest);
  const arms = (['L', 'R'] as const).map((side) => ({ side, d: depth(mid(p.shoulder[side], p.hand[side])) })).sort((a, b) => a.d - b.d);
  const legs = (['L', 'R'] as const).map((side) => ({ side, d: depth(p.knee[side]) })).sort((a, b) => a.d - b.d);
  const faceViewer = c > -0.3;
  const order: string[] = ['shadow'];
  if (faceViewer) order.push('back');
  const far = arms.filter((a) => a.d < torso - 3), near = arms.filter((a) => a.d >= torso - 3);
  for (const a of far) order.push(`forearm.${a.side}`, `upperArm.${a.side}`);
  for (const l of legs) order.push(`leg.${l.side}`, `foot.${l.side}`);
  order.push('torso');
  if (!faceViewer) order.push('back');
  for (const a of near) order.push(`forearm.${a.side}`, `upperArm.${a.side}`);
  order.push('head', 'offHand', 'mainHand');
  return order;
}

function trimPiece(img: Rgba, base: Omit<FramePiece, 'x' | 'y' | 'w' | 'h' | 'data'>): FramePiece | null {
  const { w: W, h: Hh } = cell;
  let x0 = W, y0 = Hh, x1 = -1, y1 = -1;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    if (img[(y * W + x) * 4 + 3] === 0) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) data.set(img.subarray(((y + y0) * W + x0) * 4, ((y + y0) * W + x0 + w) * 4), y * w * 4);
  return { ...base, x: x0, y: y0, w, h, data };
}

export function renderFrame(job: FrameJob): FrameResult {
  const t0 = Date.now();
  const anim = ANIMS[job.anim];
  const outfit = OUTFITS[job.outfit];
  const b = BUILDS[outfit.build ?? 'man'];
  setBuild(b);
  const base = (outfit.poses?.[job.anim] ?? anim.pose)(job.frame / anim.frames);
  const p = applyBuild(outfit.pose && (job.anim === 'idle' || job.anim === 'walk') ? outfit.pose(base) : base, b);
  let layers: Layer[];
  if (outfit.creature) layers = outfit.creature(job.anim, job.frame / anim.frames);
  else {
    const body = makeBody(p);
    layers = [...bodyLayers(p, body, { brand: outfit.brand }), ...hairLayers(p, body, outfit.hair), ...outfit.layers(p, body)];
    const local = segmentLocal(p, applyBuild(idlePose(), b));
    for (const l of layers) l.local = local[l.segment];
    attachOccluders(layers, body);
  }
  // Held weapons are drawn last and hidden wherever anything worn is in front of
  // them, so a blade can pass behind the shoulder and in front of the hip in one frame.
  const worn: Fn[] = layers.filter((l) => l.slot !== 'weapon' && !l.overlay).flatMap((l) => l.pieces.map((pc) => (x: number, y: number, z: number) => Math.max(pc.shape(x, y, z), pc.cut(x, y, z))));
  for (const l of layers) if (l.slot === 'weapon') l.occluders = worn;
  // A whole-body turn (the dodge roll): every layer turns, and the draw order is
  // worked out from where the joints end up.
  let drawn = layers, orderPose = p;
  if (p.root) {
    const { R, pivot, to } = p.root;
    drawn = layers.map((l) => moved(l, R, pivot, to));
    const tp = (v: V3): V3 => { const q = applyR(R, [v[0] - pivot[0], v[1] - pivot[1], v[2] - pivot[2]]); return [q[0] + to[0], q[1] + to[1], q[2] + to[2]]; };
    orderPose = JSON.parse(JSON.stringify(p));
    for (const k of ['pelvis', 'chest', 'neck', 'head'] as const) orderPose[k] = tp(p[k]);
    for (const k of ['hip', 'knee', 'ankle', 'shoulder', 'elbow', 'wrist', 'hand'] as const) for (const sd of ['L', 'R'] as const) orderPose[k][sd] = tp(p[k][sd]);
  }
  const yaw = FACINGS[job.facing];
  const segs = segmentOrder(orderPose, yaw), slots: string[] = rig.slotOrder.order;
  const ordered = [...drawn].sort((a, b) => segs.indexOf(a.segment) - segs.indexOf(b.segment) || slots.indexOf(a.slot) - slots.indexOf(b.slot));
  const palette = paletteFor(job.race);
  const raws = ordered.map((l) => renderLayer(l, yaw, cell, palette));
  const coloured = colourLayers(raws, palette);
  const shadow = shadowLayer(cell, palette);
  const images = [shadow, ...ordered.map((l) => coloured.get(l.id)!)];
  const shades: Uint8Array[] = [];
  const comp = composite(cell, images, paletteFile.castShadow, [null, ...raws.map((r) => r.depth)], shades);

  // Each cast shadow becomes a piece of its own, drawn just before its caster
  // with "source-atop": black at this alpha darkens what is beneath by exactly
  // the multiply factor, and only where something is already drawn.
  const shadeAlpha = Math.round((1 - paletteFile.castShadow.multiply) * 255);
  const pieces: FramePiece[] = [];
  const sh = trimPiece(shadow, { id: 'shadow', segment: 'root', slot: 'shadow', kind: 'shadow' });
  if (sh) pieces.push(sh);
  ordered.forEach((l, i) => {
    const mask = shades[i + 1];
    if (mask) {
      const img = new Uint8ClampedArray(cell.w * cell.h * 4);
      for (let q = 0; q < mask.length; q++) if (mask[q]) img[q * 4 + 3] = shadeAlpha;
      const s = trimPiece(img, { id: `${l.id}#shade`, segment: l.segment, slot: l.slot, kind: 'shade' });
      if (s) pieces.push(s);
    }
    const piece = trimPiece(coloured.get(l.id)!, { id: l.id, segment: l.segment, slot: l.slot, kind: 'layer' });
    if (piece) pieces.push(piece);
  });
  return { job, drawOrder: pieces.map((q) => q.id), pieces, composite: comp, ms: Date.now() - t0 };
}
