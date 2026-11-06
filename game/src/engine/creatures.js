/* =====================================================================
   Animals, drawn the same way as people: a few 3D points posed and projected for the same
   camera, then built from shaded rods and blobs and outlined. Four-legged beasts share one
   model (a dog, the goats, the boar, jackals, skeevers); the mudcrab has its own.
   ===================================================================== */
import { Px, blob, rod, poly, finish, tone, hash, rotZ, rotY, add, SP, CP } from './art.js';

const CW = 72, CH = 60, COX = 36, COY = 48;
// What each beast is made of. len: body length; h: shoulder height; leg: leg length; w: half
// the body's width; head: head size; ramps for the coat, the belly and the snout.
export const BEASTS = {
  dog:     { len: 15, h: 9, leg: 7, w: 3, head: 3.6, snout: 3.2, coat: 'fur', belly: 'hide', ears: 'up', tail: 'up', scar: true },
  goat:    { len: 14, h: 9.5, leg: 7.5, w: 3.4, head: 3.2, snout: 2.4, coat: 'white', belly: 'grey', ears: 'side', tail: 'short', horns: true, beard: true },
  boar:    { len: 19, h: 9.5, leg: 5, w: 5, head: 4.6, snout: 3.4, coat: 'pants', belly: 'hair', ears: 'side', tail: 'thin', tusks: true, bristles: true },
  jackal:  { len: 14, h: 8.5, leg: 7.5, w: 2.6, head: 3.2, snout: 3.6, coat: 'ochre', belly: 'sand', ears: 'big', tail: 'down' },
  hound:   { len: 16, h: 10, leg: 8, w: 3.2, head: 3.8, snout: 3.6, coat: 'hair', belly: 'leather', ears: 'up', tail: 'up' },
  skeever: { len: 9, h: 4, leg: 3, w: 2.4, head: 2.6, snout: 2.6, coat: 'grey', belly: 'pale', ears: 'round', tail: 'long' },
};
// Frames are held for d ms; hit: the bite lands; glow: the tell before it.
export const BEAST_ANIMS = {
  idle: { loop: true, frames: [0, 1].map((k) => ({ d: 400, pose: { breathe: k } })) },
  walk: { loop: true, frames: Array.from({ length: 6 }, (_, i) => ({ d: 90, pose: { ph: (i / 6) * Math.PI * 2, amp: 0.45 } })) },
  run: { loop: true, frames: Array.from({ length: 6 }, (_, i) => ({ d: 60, pose: { ph: (i / 6) * Math.PI * 2, amp: 0.8, gallop: true } })) },
  attack: { attack: true, frames: [
    { d: 120, pose: { crouch: 2, headDip: -0.3 } }, { d: 300, glow: true, pose: { crouch: 3, headDip: -0.4 } },
    { d: 60, hit: true, pose: { lunge: 5, headDip: 0.5, ph: 0.6, amp: 0.7 } }, { d: 160, pose: { lunge: 2, headDip: 0.2 } },
  ] },
  hit: { frames: [{ d: 80, pose: { lunge: -3, headDip: -0.4 } }, { d: 140, pose: { lunge: -1 } }] },
  death: { hold: true, frames: [{ d: 90, pose: { roll: 0.5, crouch: 2 } }, { d: 90, pose: { roll: 1.1, crouch: 4 } }, { d: 99999, pose: { roll: 1.5, crouch: 5, dead: true } }] },
};

function beast(kind, pose, face) {
  const B = BEASTS[kind], P = { ph: 0, amp: 0, crouch: 0, lunge: 0, headDip: 0, roll: 0, breathe: 0, ...pose };
  const p = new Px(CW, CH), body = B.h - P.crouch * 0.5, half = B.len / 2, lun = P.lunge;
  // body frame: x across, y forward, z up; a death rolls the beast onto its side
  const roll = (v) => (P.roll ? add(rotY([v[0], v[1], v[2] - body * 0.6], P.roll), [0, 0, body * 0.6 - P.roll * body * 0.42]) : v);
  const pt = (x, y, z) => { const q = rotZ(roll([x, y + lun, z]), face); return [COX + q[0], COY - q[1] * SP - q[2] * CP, q[1] * CP - q[2] * SP]; };
  const parts = [], R = (a, b, t0, t1, ramp, o) => parts.push({ z: (a[2] + b[2]) / 2, draw: () => rod(p, a[0], a[1], b[0], b[1], t0, t1, ramp, o) });
  const hip = [0, -half, body + P.breathe * 0.3], sh = [0, half - 1, body + 0.8 + P.breathe * 0.3];
  // legs: diagonal pairs move together; a gallop moves front and back pairs together
  for (const [lx, ly, ph] of [[-B.w, half - 2, 0], [B.w, half - 2, Math.PI], [-B.w, -half + 1, Math.PI], [B.w, -half + 1, 0]]) {
    const phase = P.ph + (P.gallop ? (ly > 0 ? 0 : Math.PI) : ph), swing = Math.sin(phase) * P.amp * B.leg * 0.6, lift = Math.max(0, Math.cos(phase)) * P.amp * 2;
    const top = pt(lx * 0.8, ly, body - 1), foot = P.roll ? pt(lx * 1.6, ly + swing * 0.3, body - B.leg) : pt(lx, ly + swing, lift), knee = pt(lx, ly + swing * 0.5 + (ly > 0 ? 0.5 : -1), (body - 1 + lift) / 2);
    R(top, knee, 2.4, 2, B.coat); R(knee, foot, 2, 1.6, B.coat, { fn: (x, y, t, a, v) => (t > 0.8 ? tone('hair', v - 0.1, x, y) : null) });
  }
  // the body: a fat rod from hips to shoulders, the belly paler
  const a = pt(...hip), b = pt(...sh);
  parts.push({ z: (a[2] + b[2]) / 2, draw: () => rod(p, a[0], a[1], b[0], b[1], B.w * 2.2, B.w * 2.5, B.coat, { tex: B.bristles ? 0.3 : 0.12, fn: (x, y, t, aa, v) => (aa > 0.55 ? tone(B.belly, v, x, y) : B.bristles && (x + y) % 3 === 0 && aa < -0.4 ? tone('hair', v + 0.1, x, y) : null) }) });
  if (B.bristles) R(pt(0, half - 2, body + 3), pt(0, -half + 3, body + 2.4), 2, 1.2, 'hair', { tex: 0.4 });
  // tail
  const tailEnd = { up: [0, -half - 4, body + 4], down: [0, -half - 4, body - 3], short: [0, -half - 1.5, body + 1.5], thin: [0, -half - 3, body - 1], long: [1, -half - 10, 1] }[B.tail];
  R(pt(...hip), pt(...tailEnd), B.tail === 'long' ? 1.4 : 2.2, B.tail === 'long' ? 0.6 : 1.2, B.tail === 'long' ? 'pale' : B.coat);
  // neck and head; the head dips in a bite
  const neck = [0, half + 1, body + 2 + P.headDip * 2], headC = [0, half + B.head * 0.9, body + 3.5 - P.headDip * 3], snoutEnd = [0, half + B.head * 0.9 + B.snout + 1, body + 2.2 - P.headDip * 4];
  R(pt(...sh), pt(...neck), B.w * 1.8, B.w * 1.5, B.coat);
  const hc = pt(...headC), sn = pt(...snoutEnd);
  parts.push({ z: hc[2] - 0.2, draw: () => {
    blob(p, hc[0], hc[1], B.head, B.head * 0.85, B.coat, { tex: 0.1 });
    rod(p, hc[0], hc[1], sn[0], sn[1], B.head * 1.1, B.head * 0.7, B.coat, { fn: (x, y, t, aa, v) => (t > 0.85 ? tone(kind === 'boar' ? 'pale' : 'hair', v - 0.1, x, y) : null) });
    // eyes, where they face the viewer
    const fwdY = Math.cos(face); if (fwdY < 0.5) for (const s of [-1, 1]) { const e = pt(s * B.head * 0.45, half + B.head * 1.3, body + 4 - P.headDip * 3); if (e[2] < hc[2] + 0.5) p.set(e[0], e[1], '#0a0705'); }
  } });
  // ears, horns, tusks, a goat's beard, a dog's scarred ear
  const earTop = { up: 3, side: 0.5, big: 4.5, round: 1.5 }[B.ears];
  for (const s of [-1, 1]) {
    const base = [s * B.head * 0.55, half + B.head * 0.6, body + 4.5 - P.headDip * 3], tip = [s * B.head * (B.ears === 'side' ? 1.6 : 0.8), half + B.head * 0.3, body + 4.5 + earTop - P.headDip * 3];
    R(pt(...base), pt(...tip), 2.2, B.ears === 'big' ? 1.2 : 0.8, B.scar && s > 0 ? 'meat' : B.coat);
    if (B.horns) R(pt(s * 1.4, half + B.head * 0.7, body + 5.5 - P.headDip * 3), pt(s * 2.6, half - 1.5, body + 8 - P.headDip * 3), 1.6, 0.6, 'bone');
    if (B.tusks) R(pt(s * 1.6, half + B.head + B.snout * 0.6, body + 1.5 - P.headDip * 4), pt(s * 2.4, half + B.head + B.snout * 0.8, body + 4 - P.headDip * 4), 1.2, 0.5, 'bone', { bias: 0.2 });
  }
  if (B.beard) R(pt(0, half + B.head + 1, body + 1.5 - P.headDip * 4), pt(0, half + B.head + 1.2, body - 1.5 - P.headDip * 4), 1.6, 0.6, 'grey');
  parts.sort((x, y) => y.z - x.z);
  for (const q of parts) q.draw();
  finish(p, 0.22);
  return { canvas: p.canvas(), pt: { head: [hc[0], hc[1]], neck: [hc[0], hc[1]], chest: [b[0], b[1]] } };
}

// A mudcrab: a flat shell, six legs, two claws.
function crab(pose, face) {
  const P = { ph: 0, amp: 0, crouch: 0, lunge: 0, headDip: 0, roll: 0, ...pose };
  const p = new Px(CW, CH), lift = P.roll ? 0 : 3, pt = (x, y, z) => { const q = rotZ([x, y + P.lunge, z], face); return [COX + q[0], COY - q[1] * SP - q[2] * CP, q[1] * CP - q[2] * SP]; };
  const parts = [];
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) {
    const y = -3 + k * 3, sw = Math.sin(P.ph + k * 2 + (s > 0 ? Math.PI : 0)) * P.amp * 2;
    const a = pt(s * 5, y, lift + 1), kn = pt(s * 9, y + sw, lift + 3), f = pt(s * 12, y + sw * 1.4, 0);
    parts.push({ z: a[2] + 0.1, draw: () => { rod(p, a[0], a[1], kn[0], kn[1], 1.8, 1.4, 'tile'); rod(p, kn[0], kn[1], f[0], f[1], 1.4, 0.8, 'tile'); } });
  }
  for (const s of [-1, 1]) {
    const up = P.headDip * 4, a = pt(s * 4, 5, lift + 1), e = pt(s * 7, 10, lift + 3 + up), c = pt(s * 5, 14 + Math.max(0, P.headDip) * 3, lift + 2 + up);
    parts.push({ z: e[2] - 0.5, draw: () => { rod(p, a[0], a[1], e[0], e[1], 2.2, 2, 'tile'); blob(p, c[0], c[1], 3.4, 2.6, 'tile', { bias: 0.1, tex: 0.1 }); } });
  }
  const c = pt(0, 0, lift + 2);
  parts.push({ z: c[2], draw: () => blob(p, c[0], c[1], 9, 6.5, 'tile', { tex: 0.25, bias: P.roll ? -0.15 : 0, fn: (x, y, v) => ((x * 2 + y) % 7 === 0 ? tone('tile', v - 0.15, x, y) : null) }) });
  parts.sort((a, b) => b.z - a.z);
  for (const q of parts) q.draw();
  finish(p, 0.22);
  return { canvas: p.canvas(), pt: { head: c, neck: c, chest: c } };
}

const cache = new Map();
export function creatureFrame(kind, anim, i, face) {
  const key = `${kind}|${anim}|${i}|${face.toFixed(3)}`;
  let r = cache.get(key);
  if (!r) {
    const fr = BEAST_ANIMS[anim].frames, pose = fr[Math.min(i, fr.length - 1)].pose;
    r = kind === 'mudcrab' ? crab(pose, face) : beast(kind, pose, face);
    cache.set(key, r);
  }
  return r;
}
export const BEAST_CELL = { W: CW, H: CH, OX: COX, OY: COY };
export { hash };
