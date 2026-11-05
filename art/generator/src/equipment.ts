import { sdPrim, smin, type Prim, type V3 } from './sdf.ts';
import {
  add, along, bootLayers, forearmPrims, garmentLayers, lerp3, primsSdf, shirtLayers, SIDES, sx, torsoPrims, trouserLayers,
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

type Blade = { blade: number; width: number; guard: number; grip: number; mat: string };

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
  const body = ribbon(at(G), at(G + b.blade * 0.86), b.width, b.width * 0.82, 0.75, flat);
  const tip = ribbon(at(G + b.blade * 0.86), at(G + b.blade), b.width * 0.82, 0.25, 0.75, flat);
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
        if (bladeOnly(x, y, z) > fit(x, y, z)) return null;
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

export function steelGreatswordLayers(p: Pose): Layer[] {
  return [swordLayer(p.hand.R, norm([-0.3, 0.42, -0.86]), { blade: 92, width: 4.0, guard: 10.5, grip: 15, mat: 'steel' })];
}

