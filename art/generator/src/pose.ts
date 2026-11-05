import type { V3 } from './sdf.ts';

// Joint positions in character space (units are 1x pixels before projection).
// Figure height H = 134 units, which projects to about 120 px on screen at
// the 30 degree iso camera. L is the character's left (+x).
export type Side = 'L' | 'R';

export type Pose = {
  pelvis: V3;
  chest: V3;
  neck: V3;
  head: V3;
  headPitch: number;
  hip: Record<Side, V3>;
  knee: Record<Side, V3>;
  ankle: Record<Side, V3>;
  footYaw: Record<Side, number>;
  shoulder: Record<Side, V3>;
  elbow: Record<Side, V3>;
  wrist: Record<Side, V3>;
  hand: Record<Side, V3>;
};

export const H = 134;

const mirror = (v: V3): V3 => [-v[0], v[1], v[2]];
const both = (l: V3): Record<Side, V3> => ({ L: l, R: mirror(l) });

// A farmer standing easy: weight even, arms hanging a little forward and out.
// t (0 to 1, looping) breathes: chest, shoulders and head rise about a pixel,
// the hands drift a little. t = 0 is the gate 1 still.
export function idlePose(t = 0): Pose {
  const b = Math.sin(Math.PI * 2 * t), sway = Math.sin(Math.PI * 2 * t + 0.6);
  return {
    pelvis: [0, 72, 0],
    chest: [0, 97 + 0.9 * b, 0.4 + 0.2 * b],
    neck: [0, 111 + 0.7 * b, -0.6],
    head: [0, 124.6 + 0.7 * b, 1.0],
    headPitch: 0,
    hip: both([7.6, 70, 0]),
    knee: both([8.0, 38.5, 1.4]),
    ankle: both([8.6, 6.4, -0.4]),
    footYaw: { L: 0.16, R: -0.16 },
    shoulder: both([13.4, 106.8 + 0.8 * b, -0.8]),
    elbow: both([15.6, 82.5 + 0.5 * b, -1.0 + 0.3 * sway]),
    wrist: both([16.4, 61.5 + 0.3 * b, 2.4 + 0.5 * sway]),
    hand: both([16.2, 51.5 + 0.3 * b, 3.6 + 0.6 * sway]),
  };
}

// ---------- walk ----------

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addV = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
const dotV = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Two-bone IK: the knee for a hip and ankle, bending toward `bend`.
function solveKnee(hip: V3, ankle: V3, l1: number, l2: number, bend: V3): V3 {
  const d0 = sub(ankle, hip);
  const d = Math.min(len(d0), l1 + l2 - 0.01);
  const u = scale(d0, 1 / len(d0));
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let n = sub(bend, scale(u, dotV(bend, u)));
  n = scale(n, 1 / (len(n) || 1));
  return addV(addV(hip, scale(u, a)), scale(n, h));
}

// Rotate v about the x axis (a positive angle swings a hanging limb forward, toward +z).
function swing(v: V3, a: number): V3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], v[1] * c + v[2] * s, -v[1] * s + v[2] * c];
}

// A walk cycle in place. t runs 0 to 1 over one full cycle (two steps). The
// left foot is planted forward at t = 0. Feet slide back flat while planted and
// lift through the swing; the pelvis dips at each double support; arms swing
// against the legs, the elbow bending more on the forward swing.
export function walkPose(t: number): Pose {
  const rest = idlePose();
  const TAU = Math.PI * 2, STRIDE = 12.5, LIFT = 6.5;
  const pelvisY = 71.4 - 1.3 * Math.cos(2 * TAU * t);
  const dy = pelvisY - 72;
  const lean = 1.6;
  const foot = (phase: number): V3 => {
    const ph = ((phase % 1) + 1) % 1;
    if (ph < 0.5) return [0, 6.4, STRIDE * (1 - 4 * ph)];             // planted, sliding back
    const u = (ph - 0.5) * 2;                                           // swinging forward
    return [0, 6.4 + LIFT * Math.sin(Math.PI * u), STRIDE * (-1 + 2 * (u * u * (3 - 2 * u)))];
  };
  const p: Pose = JSON.parse(JSON.stringify(rest));
  p.pelvis = [0, pelvisY, 0.4];
  p.chest = [0, 97 + dy, 0.4 + lean];
  p.neck = [0, 111 + dy, -0.6 + lean * 1.4];
  p.head = [0, 124.6 + dy + 0.3 * Math.cos(2 * TAU * t), 1.0 + lean * 1.6];
  const thigh = len(sub(rest.knee.L, rest.hip.L)), shin = len(sub(rest.ankle.L, rest.knee.L));
  for (const [side, sx, phase] of [['L', 1, t], ['R', -1, t + 0.5]] as const) {
    const hip: V3 = [sx * 7.6, pelvisY - 2, 0.4];
    const f = foot(phase);
    const ankle: V3 = [sx * 8.4, f[1], f[2]];
    p.hip[side] = hip;
    p.ankle[side] = ankle;
    p.knee[side] = solveKnee(hip, ankle, thigh, shin, [0, 0, 1]);
    p.footYaw[side] = sx * 0.06;
    // The arm on this side swings against this leg.
    const arm = -0.36 * Math.cos(TAU * phase);
    const sh: V3 = [sx * 13.4, 106.8 + dy, -0.8 + lean];
    const elbowBend = 0.18 + 0.32 * Math.max(0, arm / 0.36);
    const el = addV(sh, swing(sub(rest.elbow[side], rest.shoulder[side]), arm));
    p.shoulder[side] = sh;
    p.elbow[side] = el;
    p.wrist[side] = addV(el, swing(sub(rest.wrist[side], rest.elbow[side]), arm + elbowBend));
    p.hand[side] = addV(el, swing(sub(rest.hand[side], rest.elbow[side]), arm + elbowBend));
  }
  return p;
}

// ---------- segment-local coordinates ----------
//
// Surface texture is looked up in each segment's rest pose, so it moves with the
// limb instead of crawling across it between frames. Each segment follows one
// bone; the leg uses the thigh above the knee and the shin below it.

type Bone = { a: V3; b: V3 };
function bonesOf(p: Pose): Record<string, Bone | [Bone, Bone]> {
  const footTip = (s: Side): V3 => [p.ankle[s][0] + Math.sin(p.footYaw[s]) * 8, p.ankle[s][1], p.ankle[s][2] + Math.cos(p.footYaw[s]) * 8];
  const out: Record<string, Bone | [Bone, Bone]> = {
    head: { a: p.neck, b: p.head },
    torso: { a: p.pelvis, b: p.neck },
  };
  for (const s of ['L', 'R'] as const) {
    out[`upperArm.${s}`] = { a: p.shoulder[s], b: p.elbow[s] };
    out[`forearm.${s}`] = { a: p.elbow[s], b: p.hand[s] };
    out[`leg.${s}`] = [{ a: p.hip[s], b: p.knee[s] }, { a: p.knee[s], b: p.ankle[s] }];
    out[`foot.${s}`] = { a: p.ankle[s], b: footTip(s) };
  }
  return out;
}

// Rotation taking unit vector u to unit vector v (shortest arc), row-major.
function rotBetween(u: V3, v: V3): number[] {
  const c = dotV(u, v);
  const k: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  if (c > 1 - 1e-9) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const f = 1 / (1 + c);
  return [
    c + k[0] * k[0] * f, k[0] * k[1] * f - k[2], k[0] * k[2] * f + k[1],
    k[0] * k[1] * f + k[2], c + k[1] * k[1] * f, k[1] * k[2] * f - k[0],
    k[0] * k[2] * f - k[1], k[1] * k[2] * f + k[0], c + k[2] * k[2] * f,
  ];
}

function boneMap(cur: Bone, rest: Bone): (x: number, y: number, z: number) => V3 {
  const dc = sub(cur.b, cur.a), dr = sub(rest.b, rest.a);
  const R = rotBetween(scale(dr, 1 / len(dr)), scale(dc, 1 / len(dc))); // rest to current
  return (x, y, z) => {
    const q0 = x - cur.a[0], q1 = y - cur.a[1], q2 = z - cur.a[2];
    // The inverse rotation is the transpose.
    return [
      rest.a[0] + R[0] * q0 + R[3] * q1 + R[6] * q2,
      rest.a[1] + R[1] * q0 + R[4] * q1 + R[7] * q2,
      rest.a[2] + R[2] * q0 + R[5] * q1 + R[8] * q2,
    ];
  };
}

export function segmentLocal(p: Pose, rest: Pose = idlePose()): Record<string, (x: number, y: number, z: number) => V3> {
  const cur = bonesOf(p), rb = bonesOf(rest);
  const out: Record<string, (x: number, y: number, z: number) => V3> = {};
  for (const [seg, bone] of Object.entries(cur)) {
    if (Array.isArray(bone)) {
      const r = rb[seg] as [Bone, Bone];
      const upper = boneMap(bone[0], r[0]), lower = boneMap(bone[1], r[1]);
      const kneeY = bone[0].b[1];
      out[seg] = (x, y, z) => (y > kneeY ? upper(x, y, z) : lower(x, y, z));
    } else out[seg] = boneMap(bone, rb[seg] as Bone);
  }
  return out;
}
