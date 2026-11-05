import { primsSdf, type Fn, type Layer } from './character.ts';
import type { Prim, V3 } from './sdf.ts';

// ---------- animals ----------
//
// Animals are one smooth body each (they are not cut apart), posed by their own
// cycles. Units match the people: 74 units to the metre, feet on y = 0, facing +z.

const TAU = Math.PI * 2;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// Dune: a coast farm dog, brown, about 55 cm at the shoulder, a notch out of his left
// ear (the scarred ear, MAIN_QUEST 1.1). anim: idle (breathing, a slow wag) or walk (a trot:
// diagonal legs move together).
export function dogLayers(anim: string, t: number): Layer[] {
  const walk = anim === 'walk';
  const bob = walk ? 0.8 * Math.cos(2 * TAU * t) : 0.4 * Math.sin(TAU * t);
  const wag = walk ? 0.35 * Math.sin(2 * TAU * t) : 0.5 * Math.sin(2 * TAU * t);
  const o: V3 = [0, bob, 0];
  const P = (v: V3): V3 => add(v, o);
  const prims: Prim[] = [
    { kind: 'ell', c: P([0, 31, 12]), r: [10.0, 11.0, 12.5], mat: 'fur' },   // deep chest
    { kind: 'ell', c: P([0, 30, -5]), r: [8.8, 9.0, 14], mat: 'fur' },       // barrel and loin
    { kind: 'ell', c: P([0, 31, -18]), r: [9.2, 9.6, 8.6], mat: 'fur' },     // haunches
    { kind: 'cone', a: P([0, 35, 17]), b: P([0, 42, 23]), r1: 7.6, r2: 6.4, mat: 'fur' }, // a short, thick neck
    { kind: 'ell', c: P([0, 45, 26]), r: [6.4, 6.0, 6.8], mat: 'fur' },      // skull
    { kind: 'cone', a: P([0, 43.5, 30]), b: P([0, 41.6, 38]), r1: 4.4, r2: 3.0, mat: 'muzzle' }, // muzzle
    { kind: 'ell', c: P([0, 42.4, 38.8]), r: [1.8, 1.4, 1.2], mat: 'nose' },
  ];
  // Ears, pricked; the left one notched.
  for (const s of [1, -1]) prims.push({ kind: 'cone', a: P([s * 4.2, 49.5, 24.5]), b: P([s * 5.8, 56, 23.6]), r1: 2.8, r2: 0.7, mat: 'fur' });
  prims.push({ kind: 'ell', c: P([5.5, 53.6, 23.9]), r: [1.5, 1.4, 1.7], mat: 'fur', sub: true });
  // Legs: front pair under the chest, back pair under the haunches. In a trot the
  // front left and back right swing together, then the other two.
  const STRIDE = walk ? 6 : 0, LIFT = walk ? 3.5 : 0;
  const legs: [number, number, number, boolean][] = [[5.4, 13, 0, true], [-5.4, 13, 0.5, true], [5.6, -18, 0.5, false], [-5.6, -18, 0, false]];
  for (const [x, z, ph, front] of legs) {
    const phase = TAU * (t + ph), dz = STRIDE * Math.cos(phase), lift = Math.max(0, Math.sin(phase)) * LIFT;
    const top = P([x, 28, z]);
    const paw: V3 = [x, 2 + lift, z + dz + (front ? 1.5 : 0)];
    // Front legs bend forward at the wrist, back legs back at the hock.
    const joint: V3 = front ? [x, 13 + lift * 0.6, z + dz * 0.4 + 0.5] : [x, 14 + lift * 0.6, z + dz * 0.4 - 4];
    prims.push({ kind: 'cone', a: top, b: joint, r1: front ? 4.8 : 5.6, r2: 3.2, mat: 'fur' });
    prims.push({ kind: 'cone', a: joint, b: paw, r1: 3.0, r2: 2.6, mat: 'fur' });
    prims.push({ kind: 'ell', c: [paw[0], paw[1] - 0.2, paw[2] + 1.6], r: [2.9, 2.0, 3.4], mat: 'fur' });
  }
  // Tail, carried up and wagging.
  const tipX = 6 * Math.sin(wag);
  prims.push({ kind: 'cone', a: P([0, 34, -24]), b: P([tipX * 0.5, 39, -30]), r1: 3.0, r2: 2.4, mat: 'fur' });
  prims.push({ kind: 'cone', a: P([tipX * 0.5, 39, -30]), b: P([tipX, 41, -36]), r1: 2.4, r2: 1.0, mat: 'fur' });
  const solid = prims.filter((q) => !q.sub), holes = prims.filter((q) => q.sub);
  const body = primsSdf(solid, 2.4), notch = primsSdf(holes.map((q) => ({ ...q, sub: false })), 0);
  const shape: Fn = (x, y, z) => Math.max(body(x, y, z), -notch(x, y, z));
  const noseSdf = primsSdf([prims[6]], 0);
  // The nose is dark; everything else is the coat.
  const nearest = (x: number, y: number, z: number) => (noseSdf(x, y, z) < 0.6 ? 'eye' : 'fur');
  return [{
    id: 'torso/body', segment: 'torso', slot: 'body',
    pieces: [{
      shape, cut: () => -Infinity,
      mat: (x, y, z) => (nearest(x, y, z) === 'fur' ? 'fur.brown' : 'eye'),
      paint: (x, y, z, m) => {
        if (m !== 'fur.brown') return null;
        const ly = y - o[1];
        // Eyes: two dark points on the skull's front.
        for (const s of [1, -1]) if (Math.hypot(x - s * 2.8, ly - 46.6, (z - 31.4) * 0.8) < 1.1) return { mat: 'eye' };
        if (z > 31 && ly < 44) return { dt: -1 };                       // a darker muzzle
        if (ly < 23 && z > -14 && z < 22) return { dt: 1 };              // a paler belly
        const w = Math.sin(x * 1.3 + ly * 0.9) + Math.sin(z * 1.7 - ly * 0.6); // coat
        return w > 1.3 ? { dt: 1 } : w < -1.4 ? { dt: -1 } : null;
      },
    }],
    bounds: { c: [0, 28, 2], r: 44 },
  }];
}
