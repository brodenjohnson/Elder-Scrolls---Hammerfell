// Signed distance primitives. All coordinates are character space:
// x to the character's left (viewer's right when facing south), y up, z forward.

export type V3 = [number, number, number];

export type Prim =
  | { kind: 'ell'; c: V3; r: V3; mat: string; sub?: boolean }
  | { kind: 'cone'; a: V3; b: V3; r1: number; r2: number; mat: string; sub?: boolean }
  | { kind: 'box'; c: V3; h: V3; round: number; yaw?: number; mat: string; sub?: boolean };

export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function sdEll(px: number, py: number, pz: number, c: V3, r: V3): number {
  const x = px - c[0], y = py - c[1], z = pz - c[2];
  const k0 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  const k1 = Math.hypot(x / (r[0] * r[0]), y / (r[1] * r[1]), z / (r[2] * r[2]));
  return k1 === 0 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}

// Inigo Quilez's round cone: a capsule with a different radius at each end.
export function sdCone(px: number, py: number, pz: number, a: V3, b: V3, r1: number, r2: number): number {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const xx = pax * l2 - bax * y, xy = pay * l2 - bay * y, xz = paz * l2 - baz * y;
  const x2 = xx * xx + xy * xy + xz * xz;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

export function sdBox(px: number, py: number, pz: number, c: V3, h: V3, round: number, yaw = 0): number {
  let x = px - c[0], z = pz - c[2];
  if (yaw) {
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const rx = cs * x - sn * z;
    z = sn * x + cs * z;
    x = rx;
  }
  const qx = Math.abs(x) - h[0] + round, qy = Math.abs(py - c[1]) - h[1] + round, qz = Math.abs(z) - h[2] + round;
  const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
  return out + Math.min(Math.max(qx, qy, qz), 0) - round;
}

export function sdPrim(p: Prim, x: number, y: number, z: number): number {
  switch (p.kind) {
    case 'ell': return sdEll(x, y, z, p.c, p.r);
    case 'cone': return sdCone(x, y, z, p.a, p.b, p.r1, p.r2);
    case 'box': return sdBox(x, y, z, p.c, p.h, p.round, p.yaw);
  }
}

export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}

export function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

// Rough bounding sphere for a primitive, used to skip empty rays.
export function primBounds(p: Prim): { c: V3; r: number } {
  switch (p.kind) {
    case 'ell': return { c: p.c, r: Math.max(...p.r) };
    case 'cone': {
      const c: V3 = [(p.a[0] + p.b[0]) / 2, (p.a[1] + p.b[1]) / 2, (p.a[2] + p.b[2]) / 2];
      const half = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]) / 2;
      return { c, r: half + Math.max(p.r1, p.r2) };
    }
    case 'box': return { c: p.c, r: Math.hypot(p.h[0], p.h[1], p.h[2]) };
  }
}

// Stable integer hash to [0, 1), for surface texture.
export function hash3(x: number, y: number, z: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
