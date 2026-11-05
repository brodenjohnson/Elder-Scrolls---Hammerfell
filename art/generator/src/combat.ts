import { idlePose, solveKnee, type Pose, type Side } from './pose.ts';
import { rotX } from './character.ts';
import type { V3 } from './sdf.ts';

// ---------- combat animations: quick attack, block, dodge roll ----------
//
// Keyframed hand positions and blade directions, with the elbows found by IK.
// A fighting stance underneath: left foot forward, knees soft, weight low.

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => { const l = len(a); return [a[0] / l, a[1] / l, a[2] / l]; };
const ease = (t: number) => t * t * (3 - 2 * t);

const REST = idlePose();
const UPPER = len(sub(REST.elbow.L, REST.shoulder.L));
const FORE = len(sub(REST.hand.L, REST.elbow.L));
const THIGH = len(sub(REST.knee.L, REST.hip.L));
const SHIN = len(sub(REST.ankle.L, REST.knee.L));

// Turn the shoulders about the spine (positive turns the right shoulder forward).
function twist(p: Pose, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  for (const side of ['L', 'R'] as const) {
    const v = sub(p.shoulder[side], p.chest);
    p.shoulder[side] = add(p.chest, [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]);
  }
}

// Place a hand and let IK find the elbow, bending outward and down.
function reach(p: Pose, side: Side, hand: V3) {
  const sh = p.shoulder[side], sx = side === 'L' ? 1 : -1;
  // Keep the hand within reach.
  const d = sub(hand, sh), l = len(d), max = UPPER + FORE - 0.5;
  const h = l > max ? add(sh, d.map((v) => (v * max) / l) as V3) : hand;
  const el = solveKnee(sh, h, UPPER, FORE, [sx * 0.25, -0.8, -0.55]); // elbows down and a little back, not flared
  p.elbow[side] = el;
  p.hand[side] = h;
  p.wrist[side] = lerpV(el, h, 0.68);
}

// Fighting stance: left foot forward, right foot back, pelvis lowered.
function stance(drop = 4, lean = 2): Pose {
  const p: Pose = JSON.parse(JSON.stringify(REST));
  const dy = -drop;
  p.pelvis = [0, 72 + dy, 0.5];
  p.chest = [0, 97 + dy, 0.4 + lean];
  p.neck = [0, 111 + dy, -0.6 + lean * 1.3];
  p.head = [0, 124.6 + dy, 1.0 + lean * 1.5];
  for (const side of ['L', 'R'] as const) p.shoulder[side] = add(REST.shoulder[side], [0, dy, lean]);
  const feet: Record<Side, V3> = { L: [10, 6.4, 9], R: [-10.5, 6.4, -9] };
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    p.hip[side] = [sx * 7.6, 70 + dy, 0.5];
    p.ankle[side] = feet[side];
    p.knee[side] = solveKnee(p.hip[side], feet[side], THIGH, SHIN, [sx * 0.25, 0, 1]);
    p.footYaw[side] = sx * 0.35;
  }
  return p;
}

type Key = { t: number; hand: V3; dir: V3; off: V3; twist: number };
function keyed(keys: Key[], t: number) {
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1], u = ease(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))));
  return { hand: lerpV(a.hand, b.hand, u), dir: norm(lerpV(a.dir, b.dir, u)), off: lerpV(a.off, b.off, u), twist: lerp(a.twist, b.twist, u) };
}

// Quick attack (6 frames): from guard, a short wind-up over the right shoulder,
// a diagonal cut down and across to the left, and back to guard.
const ATTACK: Key[] = [
  { t: 0, hand: [-12, 86, 16], dir: [-0.1, 0.55, 0.83], off: [8, 82, 12], twist: 0 },
  { t: 0.2, hand: [-17, 114, 0], dir: [0.1, 0.65, -0.75], off: [10, 86, 10], twist: -0.35 },
  { t: 0.4, hand: [-10, 112, 16], dir: [-0.15, 0.95, 0.25], off: [10, 86, 12], twist: -0.1 },
  { t: 0.6, hand: [-1, 94, 27], dir: [0.6, -0.25, 0.76], off: [12, 84, 6], twist: 0.35 },
  { t: 0.8, hand: [8, 78, 20], dir: [0.86, -0.48, 0.15], off: [13, 82, 2], twist: 0.45 },
  { t: 1, hand: [-12, 86, 16], dir: [-0.1, 0.55, 0.83], off: [8, 82, 12], twist: 0 },
];
export function attackPose(t: number): Pose {
  const p = stance();
  const k = keyed(ATTACK, t);
  twist(p, k.twist);
  reach(p, 'R', k.hand);
  reach(p, 'L', k.off);
  p.weaponDir = k.dir;
  return p;
}

// Block (4 frames): the blade comes up across the face, held flat, the off hand bracing behind it.
const BLOCK: Key[] = [
  { t: 0, hand: [-12, 86, 16], dir: [-0.1, 0.55, 0.83], off: [8, 82, 12], twist: 0 },
  { t: 0.5, hand: [-8, 108, 20], dir: [0.7, 0.55, 0.45], off: [9, 98, 14], twist: 0.15 },
  { t: 1, hand: [-6, 114, 18], dir: [0.95, 0.2, 0.22], off: [10, 106, 14], twist: 0.2 },
];
export function blockPose(t: number): Pose {
  const p = stance(5, 3);
  const k = keyed(BLOCK, Math.min(1, t * 1.6)); // reach the guard by frame 3, then hold
  twist(p, k.twist);
  reach(p, 'R', k.hand);
  reach(p, 'L', k.off);
  p.weaponDir = k.dir;
  return p;
}

// Dodge roll (8 frames): crouch, tuck, a full forward turn, and up into a crouch.
// The tucked figure is turned whole (pose.root), so every shape turns with it.
function tucked(): Pose {
  const p: Pose = JSON.parse(JSON.stringify(REST));
  const O: V3 = [0, 34, 0];
  const at = (v: V3): V3 => add(O, v);
  p.pelvis = at([0, 0, 0]);
  p.chest = at([0, 18, 9]);
  p.neck = at([0, 28, 15]);
  p.head = at([0, 33, 24]);
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    p.hip[side] = at([sx * 7.6, -2, 0]);
    p.knee[side] = at([sx * 8, 13, 26]);
    p.ankle[side] = at([sx * 8.4, -16, 18]);
    p.footYaw[side] = 0;
    p.shoulder[side] = at([sx * 13, 25, 10]);
    p.elbow[side] = at([sx * 14.5, 9, 22]);
    p.hand[side] = at([sx * 10, 14, 34]);
    p.wrist[side] = lerpV(p.elbow[side], p.hand[side], 0.68);
  }
  p.weaponDir = [0.15, -0.35, -0.92];
  return p;
}
export function rollPose(t: number): Pose {
  const k = Math.round(t * 8);
  if (k === 0 || k === 7) {
    // Crouch going in and coming out.
    const p = stance(18, 7);
    reach(p, 'R', [-12, 72, 18]);
    reach(p, 'L', [10, 70, 16]);
    p.weaponDir = [-0.1, -0.2, 0.97];
    return p;
  }
  const p = tucked();
  const angle = ((k - 0.5) / 6) * Math.PI * 2;
  // Turn about the middle of the ball, kept rolling on the ground in place.
  p.root = { R: rotX(angle), pivot: [0, 46, 12], to: [0, 30, 0] };
  return p;
}

// Hit reaction (3 frames): the blow snaps the shoulders back and the head with them,
// the sword arm drops, then he recovers toward guard.
export function hitPose(t: number): Pose {
  const k = [0.9, 1, 0.4][Math.min(2, Math.floor(t * 3))];
  const p = stance(4 + 2 * k, 2 - 5 * k);
  twist(p, -0.25 * k);
  p.head = add(p.head, [0, -1.2 * k, -3 * k]);
  reach(p, 'R', [-14, 84 - 6 * k, 14 - 6 * k]);
  reach(p, 'L', [10, 84 - 4 * k, 8]);
  p.weaponDir = [-0.2, 0.2 - 0.6 * k, 0.95];
  return p;
}

// Death (8 frames): the knees go, then the body falls back and lies still. The fall
// turns the whole figure about the heels (pose.root), the last two frames lying flat.
export function deathPose(t: number): Pose {
  const k = Math.min(7, Math.round(t * 8));
  const p = stance(6 + Math.min(k, 3) * 6, 1 - Math.min(k, 3));
  reach(p, 'R', [-18, 70 - k * 2, 6]);
  reach(p, 'L', [16, 72 - k * 2, 4]);
  p.weaponDir = [-0.3, -0.6, 0.7];
  if (k >= 2) {
    const fall = Math.min(1, (k - 1) / 5);
    // Fall backward (away from where he faced), coming to rest on the ground.
    p.root = { R: rotX(-fall * (Math.PI / 2) * 0.96), pivot: [0, 0, -8], to: [0, 2 * fall, -8] };
  }
  return p;
}

// ---------- two-handed (greatsword, battleaxe) ----------
// Both hands on the grip: the right at the guard, the left 8 units further down.
function grip2(p: Pose, hand: V3, dir: V3) {
  reach(p, 'R', hand);
  reach(p, 'L', sub(hand, dir.map((v) => v * 8) as V3));
  p.weaponDir = dir;
}

// Two-handed attack (6 frames): from a high guard, wound back over the right
// shoulder, brought over the top and down across the body, and back to guard.
const ATTACK2H: Key[] = [
  { t: 0, hand: [-6, 90, 18], dir: [0.1, 0.7, 0.7], off: [0, 0, 0], twist: 0 },
  { t: 0.2, hand: [-13, 116, -2], dir: [-0.1, 0.45, -0.89], off: [0, 0, 0], twist: -0.5 },
  { t: 0.4, hand: [-6, 120, 12], dir: [0.15, 0.97, 0.2], off: [0, 0, 0], twist: -0.25 },
  { t: 0.6, hand: [2, 98, 28], dir: [0.4, -0.2, 0.9], off: [0, 0, 0], twist: 0.35 },
  { t: 0.8, hand: [8, 76, 22], dir: [0.68, -0.65, 0.33], off: [0, 0, 0], twist: 0.55 },
  { t: 1, hand: [-6, 90, 18], dir: [0.1, 0.7, 0.7], off: [0, 0, 0], twist: 0 },
];
export function attack2HPose(t: number): Pose {
  const p = stance(5, 2);
  const k = keyed(ATTACK2H, t);
  twist(p, k.twist);
  grip2(p, k.hand, k.dir);
  return p;
}

// Two-handed block (4 frames): the haft or blade raised across the body, high on the left.
const BLOCK2H: Key[] = [
  { t: 0, hand: [-6, 90, 18], dir: [0.1, 0.7, 0.7], off: [0, 0, 0], twist: 0 },
  { t: 0.5, hand: [-9, 100, 19], dir: [0.7, 0.6, 0.35], off: [0, 0, 0], twist: 0.1 },
  { t: 1, hand: [-10, 104, 18], dir: [0.9, 0.4, 0.15], off: [0, 0, 0], twist: 0.15 },
];
export function block2HPose(t: number): Pose {
  const p = stance(6, 3);
  const k = keyed(BLOCK2H, Math.min(1, t * 1.6));
  twist(p, k.twist);
  grip2(p, k.hand, k.dir);
  return p;
}
