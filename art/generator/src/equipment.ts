import { sdPrim, smin, type Prim, type V3 } from './sdf.ts';
import type { Side } from './pose.ts';
import {
  add, along, bootLayers, forearmPrims, garmentLayers, headPrims, lerp3, primsSdf, shirtLayers, SIDES, sx, torsoPrims, trouserLayers, upperArmPrims,
  type Body, type Fn, type Layer,
} from './character.ts';
import { rotBetween, idlePose, type Pose } from './pose.ts';
import { ribbon } from './objects.ts';

// ---------- armour sets and weapons (Skyrim names) ----------
//
// Each set reuses the shirt and trousers underneath and adds plates and straps
// as further garment layers, so every piece still detaches with its segment.
// Weapons are their own layer on the main hand, drawn last and hidden wherever
// the body or armour is in front of them.

const frac = (x: number) => x - Math.floor(x);

// Material of whichever solid prim is nearest.
function nearestMat(prims: Prim[]) {
  return (x: number, y: number, z: number) => {
    let best = Infinity, mat = prims[0].mat;
    for (const p of prims) { if (p.sub) continue; const d = sdPrim(p, x, y, z); if (d < best) { best = d; mat = p.mat; } }
    return mat;
  };
}

// Distance to a 2D segment in the x-y plane (straps across the chest).
function segDist2(x: number, y: number, a: V3, b: V3) {
  const bx = b[0] - a[0], by = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * bx + (y - a[1]) * by) / (bx * bx + by * by)));
  return Math.hypot(x - a[0] - bx * t, y - a[1] - by * t);
}

// A cuirass: the torso, smoothed by `smooth` and standing `inflate` off the body,
// with a skirt of tassets below the belt. Returns the shape and the belt height.
function cuirassShape(p: Pose, body: Body, inflate: number, smooth: number, skirtHem: number) {
  const pv = p.pelvis, belt = pv[1] + 7;
  const shell = primsSdf(torsoPrims(p, false), smooth);
  const shellShape: Fn = (x, y, z) => smin(shell(x, y, z), body.shape(x, y, z), 2.5) - inflate;
  const skirt = primsSdf([
    { kind: 'ell', c: [0, belt - 5, 0.3], r: [13.9 + inflate * 0.3, 7, 9.6 + inflate * 0.3], mat: 's' },
    { kind: 'ell', c: [0, skirtHem + 5, 0.8], r: [14.9 + inflate * 0.3, 6.8, 10.6 + inflate * 0.3], mat: 's' },
  ], 3.4);
  const beltSdf = primsSdf([{ kind: 'ell', c: [0, belt, 0.4], r: [13.4 + inflate, 2.2, 9.9 + inflate], mat: 'b' }], 0);
  return { shellShape, skirt, beltSdf, belt };
}

// ---------- Leather Armor, Leather Bracers, Leather Boots ----------

export function leatherArmourLayers(p: Pose, body: Body): Layer[] {
  const pv = p.pelvis, c = p.chest, hem = pv[1] - 16;
  const { shellShape, skirt, beltSdf, belt } = cuirassShape(p, body, 2.2, 4, hem);
  const shape: Fn = (x, y, z) => Math.min(shellShape(x, y, z), skirt(x, y, z), beltSdf(x, y, z));
  const mat = (x: number, y: number, z: number) => {
    const b = beltSdf(x, y, z), s = shellShape(x, y, z), k = skirt(x, y, z);
    if (b <= s + 0.05 && b <= k + 0.05) return 'leather.dark';
    return y < belt - 1.5 ? 'leather.dark' : 'leather';
  };
  // A strap from the left shoulder across to the right hip.
  const strapA: V3 = add(p.shoulder.L, [-4, 3, 0]), strapB: V3 = [-11, belt + 1, 0];
  const cut: Fn = (x, y) => Math.max(hem - y, Math.min(y - (c[1] + 9.5), 7.2 - Math.abs(x)));
  const cuirass = garmentLayers('armour', ['torso'], shape, cut, mat, body, {
    margin: 10,
    paint: (x, y, z, m) => {
      if (m === 'leather.dark' && y < belt - 1.5) {
        // Tassets: strips with a gap between them and a brass stud at the foot of each.
        const f = frac((x + 26) / 5.4);
        if (f < 0.13) return { dt: -2 };
        if (y < hem + 2.6 && f > 0.45 && f < 0.65) return { mat: 'brass' };
        return null;
      }
      if (m === 'leather.dark') return Math.abs(x) < 1.6 && z > 8 ? { mat: 'brass' } : null; // buckle
      if (segDist2(x, y, strapA, strapB) < 1.4) {
        const mid = lerp3(strapA, strapB, 0.45);
        return Math.hypot(x - mid[0], y - mid[1]) < 1.6 && z > 0 ? { mat: 'brass' } : { mat: 'leather.dark', dt: -1 };
      }
      if (Math.abs(y - (c[1] - 4)) < 0.6) return { dt: -1 };                        // chest seam
      if (Math.abs(Math.abs(x) - 4.6) < 0.5 && y > belt + 2 && y < c[1] - 4) return { dt: -1 }; // panel seams
      if (y > belt + 3 && y < c[1] - 6 && Math.abs(x) > 5.6 && frac((x + 30) / 4.6) < 0.24 && frac(y / 4.6) < 0.24) return { mat: 'brass' };
      return null;
    },
  });
  const pauldrons: Layer[] = [];
  for (const s of SIDES) {
    const sh = p.shoulder[s], el = p.elbow[s];
    const prims: Prim[] = [
      { kind: 'ell', c: add(lerp3(sh, el, 0.1), [sx(s) * 1.6, 1.6, 0]), r: [6.4, 6.0, 6.2], mat: 'leather.dark' },
      { kind: 'ell', c: add(lerp3(sh, el, 0.3), [sx(s) * 1.2, 0, 0]), r: [5.8, 3.4, 5.6], mat: 'leather.dark' },
    ];
    const sdf = primsSdf(prims, 1);
    pauldrons.push(...garmentLayers('armour', [`upperArm.${s}`], sdf, (x, y, z) => (along(x, y, z, sh, el).t - 0.42) * 20, () => 'leather.dark', body, {
      margin: 10,
      paint: (x, y, z) => {
        const t = along(x, y, z, sh, el).t;
        if (Math.abs(t - 0.2) < 0.025) return { dt: -2 };                              // edge of the upper plate
        const rv = add(lerp3(sh, el, 0.1), [sx(s) * 7, 0, 0]);
        return Math.hypot(x - rv[0], y - rv[1]) < 1.3 ? { mat: 'brass' } : null;
      },
    }));
  }
  const bracers: Layer[] = [];
  for (const s of SIDES) {
    const el = p.elbow[s], wr = p.wrist[s];
    const sdf = primsSdf([{ kind: 'cone', a: lerp3(el, wr, 0.18), b: lerp3(wr, p.hand[s], 0.15), r1: 4.4, r2: 3.4, mat: 'leather.dark' }], 0);
    bracers.push(...garmentLayers('gloves', [`forearm.${s}`], sdf, () => -Infinity, () => 'leather.dark', body, {
      paint: (x, y, z) => {
        const t = along(x, y, z, el, wr).t;
        return Math.abs(t - 0.45) < 0.04 || Math.abs(t - 0.78) < 0.04 ? { mat: 'leather', dt: -1 } : null;
      },
    }));
  }
  return [
    ...shirtLayers(p, body, 'linen', false), ...trouserLayers(p, body), ...cuirass, ...pauldrons, ...bracers,
    ...bootLayers(p, body, { height: 0.6, mat: 'leather', cuff: 'leather.dark', straps: [0.22, 0.42] }),
  ];
}

// ---------- Steel Armor, Steel Gauntlets, Steel Shin Boots ----------

export function steelArmourLayers(p: Pose, body: Body): Layer[] {
  const pv = p.pelvis, c = p.chest, hem = pv[1] - 17;
  const { shellShape, skirt, beltSdf, belt } = cuirassShape(p, body, 2.8, 7, hem);
  // Plate above the belt, leather tassets below it.
  const plate: Fn = (x, y, z) => Math.max(shellShape(x, y, z), belt - 1 - y);
  const shape: Fn = (x, y, z) => Math.min(plate(x, y, z), skirt(x, y, z), beltSdf(x, y, z));
  const mat = (x: number, y: number, z: number) => {
    const pl = plate(x, y, z), b = beltSdf(x, y, z), k = skirt(x, y, z);
    if (pl <= b && pl <= k) return 'steel';
    return 'leather.dark';
  };
  const lameTop = c[1] - 7;
  const cut: Fn = (x, y) => Math.max(hem - y, Math.min(y - (c[1] + 10.5), 6.8 - Math.abs(x)));
  const cuirass = garmentLayers('armour', ['torso'], shape, cut, mat, body, {
    margin: 10,
    paint: (x, y, z, m) => {
      if (m === 'leather.dark') {
        if (y > belt - 1.5) return Math.abs(x) < 1.8 && z > 8 ? { mat: 'steel', dt: 1 } : null; // buckle
        const f = frac((x + 26) / 5.4);
        if (f < 0.13) return { dt: -2 };
        if (y < hem + 2.6 && f > 0.45 && f < 0.65) return { mat: 'steel', dt: 1 };
        return null;
      }
      // Belly lames: grooves between overlapping plates, a rivet at each end.
      if (y < lameTop && y > belt) {
        if (frac((y - belt) / 5.2) < 0.17) return { dt: -2 };
        if (Math.abs(Math.abs(x) - 10) < 0.9 && frac((y - belt) / 5.2) > 0.45 && frac((y - belt) / 5.2) < 0.7) return { dt: 2 };
      }
      if (Math.abs(y - lameTop) < 0.7) return { dt: -2 };
      if (Math.abs(x) < 0.7 && y > lameTop && z > 0) return { dt: 1 };          // breastplate ridge
      if (y > c[1] + 8 && z > 0) return { dt: -1 };                              // rolled neck edge
      return null;
    },
    bump: (x, y) => (y < lameTop && y > belt ? [0, 0.45 * Math.cos(((y - belt) / 5.2) * Math.PI * 2), 0] : [0, 0, 0]),
  });
  const pauldrons: Layer[] = [];
  for (const s of SIDES) {
    const sh = p.shoulder[s], el = p.elbow[s];
    const prims: Prim[] = [
      { kind: 'ell', c: add(lerp3(sh, el, 0.08), [sx(s) * 2.2, 2.2, 0]), r: [7.8, 7.0, 7.6], mat: 'steel' },
      { kind: 'ell', c: add(lerp3(sh, el, 0.3), [sx(s) * 1.6, 0, 0]), r: [7.0, 3.8, 6.8], mat: 'steel' },
      { kind: 'ell', c: add(lerp3(sh, el, 0.46), [sx(s) * 1.0, 0, 0]), r: [6.0, 3.2, 5.9], mat: 'steel' },
    ];
    const sdf = primsSdf(prims, 0.8);
    pauldrons.push(...garmentLayers('armour', [`upperArm.${s}`], sdf, (x, y, z) => (along(x, y, z, sh, el).t - 0.6) * 20, () => 'steel', body, {
      margin: 12,
      paint: (x, y, z) => {
        const t = along(x, y, z, sh, el).t;
        if (Math.abs(t - 0.22) < 0.025 || Math.abs(t - 0.4) < 0.025) return { dt: -2 }; // lame edges
        const rv = add(lerp3(sh, el, 0.06), [sx(s) * 8.6, 0, 1]);
        return Math.hypot(x - rv[0], y - rv[1]) < 1.2 ? { mat: 'brass' } : null;
      },
    }));
  }
  const gauntlets: Layer[] = [];
  for (const s of SIDES) {
    const el = p.elbow[s], wr = p.wrist[s], hd = p.hand[s];
    const knuckle = lerp3(wr, hd, 0.5);
    const prims: Prim[] = [
      { kind: 'cone', a: lerp3(el, wr, 0.14), b: wr, r1: 4.7, r2: 3.6, mat: 'steel' },
      { kind: 'cone', a: lerp3(el, wr, 0.88), b: lerp3(wr, knuckle, 0.5), r1: 4.4, r2: 4.0, mat: 'steel' },
      ...forearmPrims(p, s).slice(2).map((q) => ({ ...q, mat: 'leather.dark' }) as Prim),
    ];
    const sdf = primsSdf(prims, 0.6);
    gauntlets.push(...garmentLayers('gloves', [`forearm.${s}`], (x, y, z) => sdf(x, y, z) - 0.6, () => -Infinity, nearestMat(prims), body, {
      paint: (x, y, z, m) => (m === 'steel' && Math.abs(along(x, y, z, el, wr).t - 0.55) < 0.04 ? { dt: -2 } : null),
    }));
  }
  const greaves: Layer[] = [];
  for (const s of SIDES) {
    const kn = p.knee[s], an = p.ankle[s], yaw = p.footYaw[s];
    const fwd = (d: number): V3 => [an[0] + Math.sin(yaw) * d, an[1] - 3.9, an[2] + Math.cos(yaw) * d];
    const prims: Prim[] = [
      { kind: 'cone', a: lerp3(kn, an, 0.06), b: an, r1: 5.5, r2: 4.3, mat: 'steel' },
      { kind: 'ell', c: add(kn, [0, 0.5, 1.6]), r: [5.0, 5.2, 4.8], mat: 'steel' },
      { kind: 'box', c: fwd(4), h: [3.6, 3.1, 7.8], round: 2.2, yaw, mat: 'steel' },
      { kind: 'ell', c: [an[0], an[1] - 1.3, an[2] - 0.5], r: [4.0, 4.2, 4.3], mat: 'steel' },
    ];
    const sdf = primsSdf(prims, 1.5);
    greaves.push(...garmentLayers('boots', [`leg.${s}`, `foot.${s}`], sdf, (_x, y) => y - (kn[1] + 4.8), nearestMat(prims), body, {
      margin: 10,
      paint: (x, y, z) => {
        if (y < an[1] - 5.6) return { mat: 'leather.dark', dt: -1 };            // sole
        if (Math.abs(y - (kn[1] - 4.6)) < 0.6) return { dt: -2 };              // knee cop edge
        if (Math.abs(x - an[0]) < 0.6 && y > an[1] + 2 && y < kn[1] - 6 && z > an[2]) return { dt: 1 }; // shin ridge
        return null;
      },
    }));
  }
  return [
    ...shirtLayers(p, body, 'cloth.teal', false), ...trouserLayers(p, body), ...cuirass, ...pauldrons, ...gauntlets, ...greaves,
  ];
}

// ---------- weapons ----------

type Blade = { blade: number; width: number; guard: number; grip: number; mat: string; curve?: number };

// A sword held in the right hand: blade, crossguard, wrapped grip and pommel.
// dir: blade direction from the hand. The flat of the blade faces sideways.
function swordLayer(hand: V3, dir: V3, b: Blade): Layer {
  const at = (t: number): V3 => [hand[0] + dir[0] * t, hand[1] + dir[1] * t, hand[2] + dir[2] * t];
  const flat: V3 = [1, 0, 0];
  const side = (() => {
    const c: V3 = [flat[1] * dir[2] - flat[2] * dir[1], flat[2] * dir[0] - flat[0] * dir[2], flat[0] * dir[1] - flat[1] * dir[0]];
    const l = Math.hypot(c[0], c[1], c[2]);
    return [c[0] / l, c[1] / l, c[2] / l] as V3;
  })();
  const G = 3.2; // guard just above the fist
  let body: Fn, tip: Fn;
  if (b.curve) {
    // A curved blade (scimitar): short straight pieces along an arc bending back toward
    // the spine, widening toward the point before it comes to a tip.
    const pt = (t: number): V3 => add(at(G + t * b.blade), side.map((v) => -v * b.curve! * t * t * b.blade) as V3);
    const N = 6, w = (t: number) => b.width * (0.85 + 0.45 * t);
    const segs: Fn[] = [];
    for (let i = 0; i < N - 1; i++) segs.push(ribbon(pt(i / N), pt((i + 1) / N), w(i / N), w((i + 1) / N), 0.7, flat));
    body = (x, y, z) => { let d = Infinity; for (const f of segs) d = Math.min(d, f(x, y, z)); return d; };
    tip = ribbon(pt((N - 1) / N), pt(1), w((N - 1) / N), 0.25, 0.7, flat);
  } else {
    body = ribbon(at(G), at(G + b.blade * 0.86), b.width, b.width * 0.82, 0.75, flat);
    tip = ribbon(at(G + b.blade * 0.86), at(G + b.blade), b.width * 0.82, 0.25, 0.75, flat);
  }
  const fittings: Prim[] = [
    { kind: 'cone', a: add(at(G), side.map((v) => v * b.guard) as V3), b: add(at(G), side.map((v) => -v * b.guard) as V3), r1: 1.4, r2: 1.4, mat: b.mat },
    { kind: 'cone', a: at(G - 0.5), b: at(-b.grip), r1: 1.45, r2: 1.35, mat: 'leather' },
    { kind: 'ell', c: at(-b.grip - 1.6), r: [2.3, 2.3, 2.3], mat: b.mat },
  ];
  const fit = primsSdf(fittings, 0.3), fitMat = nearestMat(fittings);
  const shape: Fn = (x, y, z) => Math.min(body(x, y, z), tip(x, y, z), fit(x, y, z));
  const bladeOnly: Fn = (x, y, z) => Math.min(body(x, y, z), tip(x, y, z));
  const mid = at(b.blade / 2);
  return {
    id: 'mainHand/weapon', segment: 'mainHand', slot: 'weapon',
    pieces: [{
      shape, cut: () => -Infinity,
      mat: (x, y, z) => (bladeOnly(x, y, z) < fit(x, y, z) ? b.mat : fitMat(x, y, z)),
      paint: (x, y, z, m) => {
        if (m === 'leather') return frac(along(x, y, z, hand, at(10)).t * 6) < 0.3 ? { dt: -1 } : null; // wrapped grip
        if (bladeOnly(x, y, z) > fit(x, y, z) || b.curve) return null;
        const s = (x - hand[0]) * side[0] + (y - hand[1]) * side[1] + (z - hand[2]) * side[2];
        if (Math.abs(s) < 0.55) return { dt: -1 };          // fuller
        if (Math.abs(s) > b.width * 0.72) return { dt: 1 };  // honed edge
        return null;
      },
    }],
    bounds: { c: mid, r: b.blade / 2 + b.grip + 6 },
  };
}

const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
function rotate(R: number[], v: V3): V3 {
  return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
}

// Iron Sword: held low in the right hand, point forward and down, swinging with the forearm.
export function ironSwordLayers(p: Pose): Layer[] {
  const rest = idlePose();
  const restFore = norm([rest.hand.R[0] - rest.elbow.R[0], rest.hand.R[1] - rest.elbow.R[1], rest.hand.R[2] - rest.elbow.R[2]]);
  const curFore = norm([p.hand.R[0] - p.elbow.R[0], p.hand.R[1] - p.elbow.R[1], p.hand.R[2] - p.elbow.R[2]]);
  const dir = p.weaponDir ? norm(p.weaponDir) : rotate(rotBetween(restFore, curFore), norm([-0.2, -0.62, 0.76]));
  return [swordLayer(p.hand.R, dir, { blade: 58, width: 2.9, guard: 7, grip: 9, mat: 'iron' })];
}

// Steel Greatsword: carried on the right shoulder, so the right arm is posed for it.
export function carryGreatsword(p: Pose): Pose {
  const q: Pose = JSON.parse(JSON.stringify(p));
  const sh = q.shoulder.R;
  const el: V3 = add(sh, [-0.6, -23, 7]);
  const hd: V3 = add(el, [3.4, 24.6, 17.6]);
  q.elbow.R = el;
  q.hand.R = hd;
  q.wrist.R = lerp3(el, hd, 0.7);
  return q;
}

// Two-handers lie on the shoulder walking and standing, and follow the swing (weaponDir) in combat.
const CARRY: V3 = norm([-0.3, 0.42, -0.86]);
export function steelGreatswordLayers(p: Pose): Layer[] {
  return [swordLayer(p.hand.R, p.weaponDir ? norm(p.weaponDir) : CARRY, { blade: 92, width: 4.0, guard: 10.5, grip: 15, mat: 'steel' })];
}

// Scimitar: the Alik'r blade, curved, single-edged, a little shorter than the Iron Sword.
export function scimitarLayers(p: Pose): Layer[] {
  const rest = idlePose();
  const restFore = norm([rest.hand.R[0] - rest.elbow.R[0], rest.hand.R[1] - rest.elbow.R[1], rest.hand.R[2] - rest.elbow.R[2]]);
  const curFore = norm([p.hand.R[0] - p.elbow.R[0], p.hand.R[1] - p.elbow.R[1], p.hand.R[2] - p.elbow.R[2]]);
  const dir = p.weaponDir ? norm(p.weaponDir) : rotate(rotBetween(restFore, curFore), norm([-0.2, -0.62, 0.76]));
  return [swordLayer(p.hand.R, dir, { blade: 54, width: 2.7, guard: 5.5, grip: 9, mat: 'steel', curve: 0.22 })];
}

// Iron Battleaxe: a long ash haft, the right hand high on it, a flared iron head.
export function ironBattleaxeLayers(p: Pose): Layer[] {
  const hand = p.hand.R, dir = p.weaponDir ? norm(p.weaponDir) : CARRY;
  const at = (t: number): V3 => [hand[0] + dir[0] * t, hand[1] + dir[1] * t, hand[2] + dir[2] * t];
  const flat: V3 = [1, 0, 0];
  const c: V3 = [flat[1] * dir[2] - flat[2] * dir[1], flat[2] * dir[0] - flat[0] * dir[2], flat[0] * dir[1] - flat[1] * dir[0]];
  const cl = Math.hypot(c[0], c[1], c[2]), side: V3 = [c[0] / cl, c[1] / cl, c[2] / cl];
  const head = at(44), edge = add(head, side.map((v) => v * 14) as V3), poll = add(head, side.map((v) => -v * 4.5) as V3);
  const haft = primsSdf([
    { kind: 'cone', a: at(-24), b: at(52), r1: 2.1, r2: 2.0, mat: 'wood' },
    { kind: 'ell', c: at(-24.5), r: [1.9, 1.9, 1.9], mat: 'iron' },
  ], 0.2);
  const blade = ribbon(head, edge, 5.0, 12.0, 1.0, flat), back = ribbon(head, poll, 4.0, 2.4, 1.8, flat);
  const metal: Fn = (x, y, z) => Math.min(blade(x, y, z), back(x, y, z));
  return [{
    id: 'mainHand/weapon', segment: 'mainHand', slot: 'weapon',
    pieces: [{
      shape: (x, y, z) => Math.min(haft(x, y, z), metal(x, y, z)), cut: () => -Infinity,
      mat: (x, y, z) => (metal(x, y, z) < haft(x, y, z) ? 'iron' : along(x, y, z, at(-24), at(52)).t < 0.01 ? 'iron' : 'wood'),
      paint: (x, y, z, m) => {
        if (m === 'iron') {
          const s = (x - head[0]) * side[0] + (y - head[1]) * side[1] + (z - head[2]) * side[2];
          return s > 12.4 ? { dt: 1 } : null; // honed edge
        }
        const t = along(x, y, z, at(-24), at(52)).t;
        return t > 0.18 && t < 0.42 && frac(t * 40) < 0.35 ? { mat: 'leather', dt: -1 } : null; // wrapped grip
      },
    }],
    bounds: { c: at(14), r: 48 },
  }];
}

// ---------- Fur Armor, Fur Bracers, Fur Shoes (the bandits' set) ----------
// The Leather Armor shapes with fur over the shoulders and chest and on the bracers,
// over a grey wool shirt.
export function furArmourLayers(p: Pose, body: Body): Layer[] {
  const top = p.chest[1] - 3;
  return leatherArmourLayers(p, body).map((l) => {
    const fur = l.id === 'torso/armour' ? (_x: number, y: number) => y > top : l.slot === 'armour' || l.slot === 'gloves' ? () => true : null;
    const wool = l.slot === 'clothes' && l.segment !== 'leg.L' && l.segment !== 'leg.R';
    if (!fur && !wool) return l;
    return {
      ...l,
      pieces: l.pieces.map((pc) => ({
        ...pc,
        mat: (x: number, y: number, z: number) => { const m = pc.mat(x, y, z); return fur && fur(x, y) && m !== 'brass' ? 'fur.grey' : wool && m === 'linen' ? 'wool.grey' : m; },
        paint: (x: number, y: number, z: number, m: string) => {
          if (m === 'fur.grey') { const h = Math.sin(x * 2.7 + y * 1.3) + Math.sin(z * 3.1 - y * 2.2); return h > 1.1 ? { dt: 1 } : h < -1.2 ? { dt: -1 } : null; }
          return pc.paint ? pc.paint(x, y, z, m) : null;
        },
      })),
    };
  });
}

// ---------- Hammerfell Garb, Redguard Hood, Redguard Boots (the Alik'r) ----------
// A long sand-coloured robe to the knee with a red sash, sleeves to the elbow, and a pale hood
// wrapped over the face to a slit for the eyes.
export function garbLayers(p: Pose, body: Body): Layer[] {
  const pv = p.pelvis, c = p.chest, belt = pv[1] + 7, hem = pv[1] - 34;
  const robePrims: Prim[] = [
    ...torsoPrims(p, false), ...upperArmPrims(p, 'L').slice(0, 1), ...upperArmPrims(p, 'R').slice(0, 1),
    { kind: 'ell', c: [0, belt - 5, 0.3], r: [12.8, 6.5, 9.0], mat: 'r' },
    { kind: 'ell', c: [0, belt - 17, 0.8], r: [13.8, 8.0, 10.0], mat: 'r' },
    { kind: 'ell', c: [0, hem + 6, 1.0], r: [14.6, 7.0, 10.8], mat: 'r' },
  ];
  const robeSdf = primsSdf(robePrims, 3.6);
  const robe: Fn = (x, y, z) => smin(robeSdf(x, y, z), body.shape(x, y, z), 2) - 1.0;
  const sash = primsSdf([
    { kind: 'ell', c: [0, belt, 0.4], r: [14.0, 2.8, 10.4], mat: 's' },
    { kind: 'cone', a: [9.5, belt - 1, 7], b: [11.5, belt - 13, 8.5], r1: 1.8, r2: 2.4, mat: 's' }, // the knotted end at the left hip
  ], 0.8);
  const shape: Fn = (x, y, z) => Math.min(robe(x, y, z), sash(x, y, z));
  const matOf = (x: number, y: number, z: number) => (sash(x, y, z) < robe(x, y, z) + 0.05 ? 'cloth.red' : 'cloth.sand');
  const cut: Fn = (x, y) => Math.max(hem - y, Math.min(y - (c[1] + 11.5), 6.0 - Math.abs(x)));
  const sleeveEnd = (s: Side): Fn => (x, y, z) => { const a = along(x, y, z, p.shoulder[s], p.elbow[s]); return (a.t - 0.95) * a.len; };
  const robeLayers = garmentLayers('clothes', ['torso', 'upperArm.L', 'upperArm.R'], shape, cut, matOf, body, {
    segCut: { 'upperArm.L': sleeveEnd('L'), 'upperArm.R': sleeveEnd('R') },
    margin: 22,
    paint: (x, y, z, m) => {
      if (m === 'cloth.red') return frac(y * 0.7 + x * 0.15) < 0.2 ? { dt: -1 } : null;
      if (y < hem + 1.6) return { dt: -1 };                                     // hem
      if (Math.abs(x) < 0.7 && y > belt + 2 && y < c[1] + 9 && z > 4) return { dt: -1 }; // front opening
      return null;
    },
    bump: (x, y) => (y < belt - 2 ? [0.7 * Math.sin(x * 0.8 + 0.3), 0, 0] : [0, 0, 0]), // long folds in the skirt
  });
  // The hood: a wrap over the head and down the back of the neck, open only at the eyes.
  const local = (y: number, z: number) => ({ ly: y - p.head[1], lz: z - p.head[2] });
  const hoodSdf = primsSdf([
    ...headPrims(p).slice(0, 3).map((q) => ({ ...q, mat: 'h' }) as Prim),
    { kind: 'ell', c: add(p.head, [0, -8.5, -2.5]), r: [7.6, 6.0, 6.6], mat: 'h' },   // drape at the neck
    { kind: 'ell', c: add(p.head, [0, -3.5, 3.4]), r: [6.0, 4.6, 4.6], mat: 'h' },    // the veil over mouth and nose
  ], 2.4);
  const hood: Layer = {
    id: 'head/helmet', segment: 'head', slot: 'helmet',
    pieces: [{
      shape: (x, y, z) => hoodSdf(x, y, z) - 1.5,
      cut: (_x, y, z) => { const { ly, lz } = local(y, z); return Math.min(lz - 3.5, 1.35 - Math.abs(ly - 0.4)); }, // eye slit
      mat: () => 'linen',
      paint: (x, y, z) => { const { ly, lz } = local(y, z); return frac((ly + lz * 0.4 + (x - p.head[0]) * 0.1) * 0.55) < 0.18 ? { dt: -1 } : null; }, // wraps
    }],
    bounds: { c: add(p.head, [0, -3, 0]), r: 18 },
  };
  return [...robeLayers, hood, ...trouserLayers(p, body), ...bootLayers(p, body, { height: 0.5, mat: 'leather', cuff: 'leather.dark' })];
}


