/* =====================================================================
   Art sample (design bible 4.0, v0.3): two candidate styles, drawn in code at runtime.
   Everything is drawn into small pixel buffers with palette ramps, ordered dithering,
   a rim light and a coloured outline (the Wasteland Settlement art lab's method).
   Characters are posed from a small 3D skeleton, so every direction comes from the
   same animation; frames are held for hand-set times, as pixel art is animated.
   This page is a sample, not game code: nothing in the game reads it.
   ===================================================================== */
(() => {
  // ---------- palette ----------
  const RAMPS = {
    skin:   ['#2a160e', '#45281b', '#5e3826', '#784a32', '#925e40', '#a8734f', '#bd8a62'],
    cream:  ['#2a241b', '#4a4031', '#6d604a', '#91836a', '#b0a283', '#cbbf9f', '#e2d8bb'],
    hair:   ['#0b0807', '#151010', '#201816', '#2c221e', '#3a2d27'],
    leather:['#120b07', '#24160e', '#382316', '#4c301f', '#61402a', '#775237', '#8d6644'],
    boot:   ['#0e0907', '#1b120d', '#2a1c14', '#3a281c', '#4b3424'],
    pants:  ['#14100c', '#241d16', '#372c21', '#4a3c2d', '#5e4d3a', '#736049'],
    red:    ['#1c0606', '#380c0b', '#561410', '#741d15', '#8f2a1c', '#a83b27', '#bf5236'],
    fur:    ['#1a130d', '#2f2318', '#4a3826', '#665036', '#826848', '#9c825c'],
    steel:  ['#101317', '#1f242a', '#333a42', '#4b545e', '#66717c', '#87929c', '#b3bcc2', '#dde3e6'],
    brass:  ['#1e1406', '#3c280d', '#5e4115', '#83601f', '#a6812b', '#c6a33f', '#e2c46a'],
    wood:   ['#140b06', '#2b180c', '#452813', '#5e391c', '#7a4c27', '#966234', '#b17d47'],
    grass:  ['#16200d', '#223014', '#30431a', '#3f5720', '#506c27', '#628130', '#78963d'],
    dirt:   ['#1f160e', '#33251a', '#4a3726', '#614a33', '#7a5f42', '#937652', '#ab8e66'],
    stone:  ['#121216', '#222226', '#353439', '#4a484c', '#625e60', '#7d7775', '#9b938c'],
    leaf:   ['#0c160b', '#152611', '#203a18', '#2c4f1f', '#3a6627', '#4c7f32'],
  };
  const RGB = {};
  const rgb = (h) => RGB[h] || (RGB[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s | 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const sm = (t) => t * t * (3 - 2 * t);
  function noise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y, s, o = 3) => { let v = 0, amp = 0.5, f = 1; for (let k = 0; k < o; k++) { v += amp * noise(x * f, y * f, s + k * 17); f *= 2; amp *= 0.5; } return v / (1 - Math.pow(0.5, o)); };
  function tone(ramp, v, x, y, dither = true) {
    const r = RAMPS[ramp] || ramp, t = clamp(v, 0, 0.999) * r.length, i = Math.floor(t);
    return r[Math.min(r.length - 1, i + (dither && t - i > bayer(x, y) ? 1 : 0))];
  }

  // ---------- pixel buffer and primitives ----------
  class Px {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
    in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    set(x, y, c, a = 1) {
      x |= 0; y |= 0; if (!this.in(x, y)) return;
      const i = (y * this.w + x) * 4, [r, g, b] = rgb(c);
      if (a >= 1) { this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255; return; }
      const d = this.d, oa = d[i + 3] / 255, na = a + oa * (1 - a);
      d[i] = (r * a + d[i] * oa * (1 - a)) / na; d[i + 1] = (g * a + d[i + 1] * oa * (1 - a)) / na; d[i + 2] = (b * a + d[i + 2] * oa * (1 - a)) / na; d[i + 3] = na * 255;
    }
    a(x, y) { return this.in(x, y) ? this.d[(y * this.w + x) * 4 + 3] : 0; }
    px(x, y) { const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2]]; }
    shift(x, y, k) { const i = (y * this.w + x) * 4; for (let c = 0; c < 3; c++) this.d[i + c] = clamp(this.d[i + c] * k, 0, 255); }
    canvas() { const c = document.createElement('canvas'); c.width = this.w; c.height = this.h; const g = c.getContext('2d'), img = g.createImageData(this.w, this.h); img.data.set(this.d); g.putImageData(img, 0, 0); return c; }
  }
  // Light from the top left, a little towards the viewer (screen space: x right, y up, z out).
  const L = (() => { const v = [-0.55, 0.7, 0.55], n = Math.hypot(...v); return v.map((q) => q / n); })();
  function blob(p, cx, cy, rx, ry, ramp, o = {}) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, ang = Math.atan2(dy, dx);
      const edge = 1 + (o.rough || 0) * (noise(Math.cos(ang) * 2.2 + 5, Math.sin(ang) * 2.2 + 5, o.seed || 1) - 0.5) * 2;
      if (dx * dx + dy * dy > edge * edge) continue;
      const nx = dx / edge, ny = -dy / edge, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const v = (nx * L[0] + ny * L[1] + nz * L[2]) * 0.62 + 0.3 + (o.bias || 0) + (o.tex ?? 0.14) * (fbm(x * 0.35, y * 0.35, (o.seed || 1) + 3) - 0.5);
      p.set(x, y, tone(ramp, v, x, y));
    }
  }
  function poly(p, pts, fn) {
    const ys = pts.map((q) => q[1]), xs = pts.map((q) => q[0]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys)), x0 = Math.min(...xs), x1 = Math.max(...xs);
    for (let y = y0; y <= y1; y++) {
      const cross = [];
      for (let k = 0; k < pts.length; k++) { const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % pts.length]; if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) cross.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax)); }
      cross.sort((a, b) => a - b);
      for (let k = 0; k + 1 < cross.length; k += 2) for (let x = Math.round(cross[k]); x < Math.round(cross[k + 1]); x++) { const c = fn(x, y, (x - x0) / Math.max(1, x1 - x0), (y - y0) / Math.max(1, y1 - y0)); if (c) p.set(x, y, c); }
    }
  }
  // A tapered rod from (x0, y0) to (x1, y1), shaded across its width. fn(x, y, t, across, v) may recolour.
  function rod(p, x0, y0, x1, y1, th0, th1, ramp, o = {}) {
    const len = Math.max(0.01, Math.hypot(x1 - x0, y1 - y0)), ux = (x1 - x0) / len, uy = (y1 - y0) / len, nx = -uy, ny = ux, th = Math.max(th0, th1);
    const ln = nx * L[0] - ny * L[1];
    for (let y = Math.floor(Math.min(y0, y1) - th); y <= Math.ceil(Math.max(y0, y1) + th); y++) for (let x = Math.floor(Math.min(x0, x1) - th); x <= Math.ceil(Math.max(x0, x1) + th); x++) {
      const px = x + 0.5 - x0, py = y + 0.5 - y0, t = px * ux + py * uy, d = px * nx + py * ny;
      const half = (th0 + (th1 - th0) * clamp(t / len, 0, 1)) / 2;
      // Round ends, so joints meet without gaps.
      if (t < 0 ? Math.hypot(px, py) > half : t > len ? Math.hypot(x + 0.5 - x1, y + 0.5 - y1) > half : Math.abs(d) > half) continue;
      const across = clamp(d / Math.max(0.5, half), -1, 1), nz = Math.sqrt(Math.max(0, 1 - across * across));
      const v = (across * Math.sign(ln || 1) * -0.4 + nz * 0.55) * 0.85 + 0.3 + (o.bias || 0) + (o.tex ?? 0.06) * (fbm(x * 0.5, y * 0.5, o.seed || 4, 2) - 0.5);
      const c = o.fn ? o.fn(x, y, clamp(t / len, 0, 1), across, v) : null;
      p.set(x, y, c || tone(ramp, v, x, y));
    }
  }
  // A rim light on edges towards the light, a shade on the far edges, then a coloured outline.
  function finish(p, ol = 0.25) {
    const w = p.w, h = p.h, A = (x, y) => p.a(x, y) > 40;
    const lift = [], drop = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!A(x, y)) continue;
      if ((!A(x - 1, y) || !A(x, y - 1)) && A(x + 1, y + 1)) lift.push([x, y]);
      else if (!A(x + 1, y) || !A(x, y + 1)) drop.push([x, y]);
    }
    for (const [x, y] of lift) p.shift(x, y, 1.25);
    for (const [x, y] of drop) p.shift(x, y, 0.75);
    const out = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (A(x, y)) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).find(([X, Y]) => A(X, Y));
      if (nb) { const c = p.px(nb[0], nb[1]); out.push([x, y, c[0] * ol + 6, c[1] * ol + 4, c[2] * ol + 4]); }
    }
    for (const [x, y, r, g, b] of out) { const i = (y * w + x) * 4; p.d[i] = r; p.d[i + 1] = g; p.d[i + 2] = b; p.d[i + 3] = 255; }
    return p;
  }

  // ---------- the skeleton ----------
  const D = Math.PI / 180;
  const rotZ = ([x, y, z], a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c, z]; };
  const rotX = ([x, y, z], a) => { const c = Math.cos(a), s = Math.sin(a); return [x, y * c - z * s, y * s + z * c]; };
  const rotY = ([x, y, z], a) => { const c = Math.cos(a), s = Math.sin(a); return [x * c + z * s, y, -x * s + z * c]; };
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // A limb hanging down, swung forward by p and out to its side by r (side: 1 right, -1 left).
  const limb = (p, r, side) => rotY([0, Math.sin(p), -Math.cos(p)], -side * r);

  // The guard stance every pose starts from. Angles in radians, the weapon's yaw and pitch in degrees.
  const BASE = { tw: 0.15, lean: 0.05, fall: 0, aRp: 0.75, aRr: 0.2, aRe: 0.7, aLp: 0.25, aLr: 0.2, aLe: 0.4, lRp: 0.12, lRk: 0.2, lLp: -0.15, lLk: 0.1, lRr: 0.1, lLr: 0.1, wy: 15, wp: 40, head: 0 };

  // Pose the skeleton (body frame: x right, y forward, z up, feet on z = 0), then turn it to
  // face `face` (0 north, then anticlockwise) and project it for a camera pitched `phi` down.
  function rig(pose, R, face, phi) {
    const P = { ...BASE, ...pose };
    const legR = [limb(P.lRp, P.lRr, 1), limb(P.lRp - P.lRk, P.lRr, 1)], legL = [limb(P.lLp, P.lLr, -1), limb(P.lLp - P.lLk, P.lLr, -1)];
    const drop = (l) => -(l[0][2] * R.thigh + l[1][2] * R.shin);
    const pz = Math.max(drop(legR), drop(legL)); // the lower foot stands on the ground
    const pelvis = [0, 0, pz];
    const hipR = add(pelvis, rotZ([R.hipW, 0, 0], P.tw * 0.3)), hipL = add(pelvis, rotZ([-R.hipW, 0, 0], P.tw * 0.3));
    const kneeR = add(hipR, legR[0], R.thigh), footR = add(kneeR, legR[1], R.shin), kneeL = add(hipL, legL[0], R.thigh), footL = add(kneeL, legL[1], R.shin);
    const spine = [0, Math.sin(P.lean), Math.cos(P.lean)], chest = add(pelvis, spine, R.spine);
    const shR = add(chest, rotZ([R.shW, 0, -1], P.tw)), shL = add(chest, rotZ([-R.shW, 0, -1], P.tw));
    const head = add(chest, spine, R.neck + R.headR);
    const arm = (sh, p, r, e, side) => { const u = rotZ(limb(p, r, side), P.tw), f = rotZ(limb(p + e, r, side), P.tw), el = add(sh, u, R.upper); return [el, add(el, f, R.fore)]; };
    const [elR, haR] = arm(shR, P.aRp, P.aRr, P.aRe, 1), [elL, haL] = arm(shL, P.aLp, P.aLr, P.aLe, -1);
    const w = rotZ([Math.sin(P.wy * D) * Math.cos(P.wp * D), Math.cos(P.wy * D) * Math.cos(P.wp * D), Math.sin(P.wp * D)], P.tw);
    const toeR = add(footR, [0, R.foot, 0]), toeL = add(footL, [0, R.foot, 0]);
    const pts = { pelvis, hipR, hipL, kneeR, kneeL, footR, footL, toeR, toeL, chest, shR, shL, head, elR, haR, elL, haL,
      wb: add(haR, w, -R.grip), wt: add(haR, w, R.blade), wg: add(haR, w, 1.2) };
    // Fall backwards about the feet, then turn to face.
    const world = (v) => rotZ(rotX(v, P.fall), face);
    const cp = Math.cos(phi), sp = Math.sin(phi);
    const proj = {}, depth = {};
    for (const [k, v] of Object.entries(pts)) { const q = world(v); proj[k] = [q[0], -q[1] * sp - q[2] * cp]; depth[k] = q[1] * cp - q[2] * sp; }
    return { P, proj, depth, world, cp, sp, face };
  }

  // ---------- drawing a character ----------
  const LOOKS = {
    kasim: { skin: 'skin', top: 'cream', sleeve: 'cream', fore: 'skin', pants: 'pants', boots: 'boot', hair: 'hair', beard: true, belt: 'leather', weapon: 'sword' },
    bandit: { skin: 'skin', top: 'leather', sleeve: 'red', fore: 'leather', pants: 'pants', boots: 'boot', hair: 'hair', hood: 'red', mask: 'red', fur: true, belt: 'boot', weapon: 'axe', studs: true },
  };
  const SW = 88, SH = 88, OX = 44, OY = 74; // sprite cell and where the feet stand in it

  function drawCharacter(look, pose, R, face, phi) {
    const g = rig(pose, R, face, phi), p = new Px(SW, SH), S = (k) => [OX + g.proj[k][0], OY + g.proj[k][1]], Z = (k) => g.depth[k];
    const parts = [];
    const limbPart = (a, b, t0, t1, ramp, o) => parts.push({ z: (Z(a) + Z(b)) / 2, draw: () => { const [x0, y0] = S(a), [x1, y1] = S(b); rod(p, x0, y0, x1, y1, t0, t1, ramp, o); } });
    // legs and boots
    limbPart('hipR', 'kneeR', R.thighT, R.shinT + 0.6, look.pants);
    limbPart('kneeR', 'footR', R.shinT, R.shinT - 0.5, look.pants, { fn: (x, y, t, a, v) => (t > 0.55 ? tone(look.boots, v, x, y) : null) });
    limbPart('hipL', 'kneeL', R.thighT, R.shinT + 0.6, look.pants);
    limbPart('kneeL', 'footL', R.shinT, R.shinT - 0.5, look.pants, { fn: (x, y, t, a, v) => (t > 0.55 ? tone(look.boots, v, x, y) : null) });
    limbPart('footR', 'toeR', 3, 2.6, look.boots); limbPart('footL', 'toeL', 3, 2.6, look.boots);
    // torso: a tapered rod as wide as the shoulders look from here
    parts.push({ z: Z('chest') * 0.5 + Z('pelvis') * 0.5, draw: () => {
      const [px0, py0] = S('pelvis'), [cx, cy] = S('chest'), [ax, ay] = S('shR'), [bx, by] = S('shL'), [hx, hy] = S('hipR'), [kx, ky] = S('hipL');
      const top = Math.max(R.chestMin, Math.hypot(ax - bx, ay - by) + 3), bottom = Math.max(R.waistMin, Math.hypot(hx - kx, hy - ky) + 3);
      rod(p, px0, py0 + 1, cx, cy - 1, bottom, top, look.top, { tex: 0.08, fn: (x, y, t, a, v) => {
        if (t < 0.16) return tone(look.belt, v - 0.05, x, y);
        if (look.studs && (x + y * 2) % 5 === 0 && t > 0.2) return tone('brass', v + 0.1, x, y);
        return null;
      } });
    } });
    if (look.fur) parts.push({ z: Z('chest') - 0.5, draw: () => { const [cx, cy] = S('chest'); blob(p, cx, cy - 1, R.chestMin / 2 + 1.5, 2.6, 'fur', { rough: 0.35, seed: 7, tex: 0.3 }); } });
    // arms
    limbPart('shR', 'elR', R.upperT, R.foreT, look.sleeve); limbPart('elR', 'haR', R.foreT, R.foreT - 0.4, look.fore);
    limbPart('shL', 'elL', R.upperT, R.foreT, look.sleeve); limbPart('elL', 'haL', R.foreT, R.foreT - 0.4, look.fore);
    parts.push({ z: Z('haR') - 0.1, draw: () => { const [x, y] = S('haR'); blob(p, x, y, 1.7, 1.7, look.skin, { tex: 0 }); } });
    parts.push({ z: Z('haL') - 0.1, draw: () => { const [x, y] = S('haL'); blob(p, x, y, 1.6, 1.6, look.skin, { tex: 0 }); } });
    // the weapon, just in front of the hand holding it
    parts.push({ z: (Z('wb') + Z('wt')) / 2 - 0.3, draw: () => drawWeapon(p, look.weapon, S('wb'), S('haR'), S('wt'), S('wg')) });
    // the head
    parts.push({ z: Z('head'), draw: () => drawHead(p, look, g, S('head'), R.headR) });
    parts.sort((a, b) => b.z - a.z);
    for (const q of parts) q.draw();
    finish(p, R.outline);
    return { canvas: p.canvas(), blade: [S('wg'), S('wt')] };
  }

  function drawWeapon(p, kind, base, hand, tip, guard) {
    const dx = tip[0] - hand[0], dy = tip[1] - hand[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    if (kind === 'sword') {
      rod(p, base[0], base[1], hand[0], hand[1], 1.6, 1.6, 'leather');
      rod(p, guard[0], guard[1], tip[0], tip[1], 2, 1.2, 'steel', { bias: 0.15, tex: 0.02, fn: (x, y, t, a, v) => (a < -0.2 ? tone('steel', v + 0.25, x, y) : null) });
      rod(p, guard[0] - nx * 2.6, guard[1] - ny * 2.6, guard[0] + nx * 2.6, guard[1] + ny * 2.6, 1.6, 1.6, 'brass');
    } else {
      rod(p, base[0], base[1], tip[0], tip[1], 1.8, 1.8, 'wood', { tex: 0.1 });
      // The axe head: a flared blade on one side near the tip.
      const hx = hand[0] + dx * 0.86, hy = hand[1] + dy * 0.86;
      poly(p, [[hx - dx * 0.1 / 1, hy - dy * 0.1], [hx + nx * 5.5 - dx * 0.16, hy + ny * 5.5 - dy * 0.16], [hx + nx * 6 + dx * 0.14, hy + ny * 6 + dy * 0.14], [hx + dx * 0.12, hy + dy * 0.12]],
        (x, y, u, v) => tone('steel', 0.62 - v * 0.2 + (hash(x, y, 5) < 0.12 ? -0.2 : 0), x, y));
    }
  }

  // The head is a sphere coloured by where each pixel faces on the body: hair on top and
  // behind, a beard or a mask below the front, eyes where they face the viewer.
  function drawHead(p, look, g, [cx, cy], r) {
    const cp = g.cp, sp = g.sp, toViewer = [0, -cp, sp], up = [0, sp, cp];
    const back = (n) => rotX(rotZ(n, -g.face), -g.P.fall); // world normal to body frame
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const nx = (x + 0.5 - cx) / r, ny = -(y + 0.5 - cy) / (r * 1.08), rr = nx * nx + ny * ny;
      if (rr > 1) continue;
      const nz = Math.sqrt(1 - rr), n = back(add(add([nx, 0, 0], up, ny), toViewer, nz)), v = (nx * L[0] + ny * L[1] + nz * L[2]) * 0.62 + 0.3;
      let ramp = look.skin, vv = v;
      const fwd = n[1], upn = n[2], side = n[0];
      if (look.hood) { if (fwd < 0.55 || upn > 0.55 || Math.abs(side) > 0.75) { ramp = look.hood; vv -= 0.05; } }
      else if (upn > 0.5 - Math.max(0, -fwd) * 1.0 || fwd < -0.3) ramp = look.hair;
      if (look.mask && fwd > 0.3 && upn < -0.05) ramp = look.mask;
      if (look.beard && fwd > 0.35 && upn < -0.45) { ramp = look.hair; vv += 0.12; }
      p.set(x, y, tone(ramp, vv, x, y));
    }
    // Eyes: two dark pixels where the eye points face the viewer.
    const P = g.P;
    for (const s of [-1, 1]) {
      const e = [s * 0.36, 0.86, 0.12], ew = rotZ(rotX(e, P.fall), g.face);
      if (dot3(ew, toViewer) < 0.25) continue;
      p.set(Math.floor(cx + ew[0] * r * 0.92), Math.floor(cy - (ew[1] * sp + ew[2] * cp) * r * 0.92 * 1.08), '#0b0605');
    }
  }

  // ---------- animations ----------
  // Each frame is held for d milliseconds. hit: the blow lands on this frame. smear: draw
  // the blade's arc from the previous frame. glow: the enemy's tell.
  const walk = (n, d, amp, knee, lean, armed) => Array.from({ length: n }, (_, i) => {
    const ph = (i / n) * 2 * Math.PI, s = Math.sin(ph), c = Math.cos(ph);
    const pose = { lRp: amp * s, lLp: -amp * s, lRk: 0.12 + knee * Math.max(0, c), lLk: 0.12 + knee * Math.max(0, -c), lRr: 0.05, lLr: 0.05, lean, tw: 0.12 * s,
      aLp: -0.5 * amp * s + 0.1, aLe: 0.3 + knee * 0.3, aLr: 0.12 };
    if (!armed) Object.assign(pose, { aRp: 0.5 * amp * s + 0.1, aRe: 0.3 });
    else Object.assign(pose, { aRp: 0.7 + 0.08 * s, wp: 35 + 4 * c });
    return { d, pose };
  });
  const ANIMS = {
    idle: { loop: true, frames: [0, 1, 2, 1].map((k) => ({ d: 260, pose: { lRk: 0.2 + k * 0.05, lLk: 0.1 + k * 0.05, aRe: 0.7 + k * 0.04, wp: 40 - k * 2 } })) },
    walk: { loop: true, frames: walk(8, 95, 0.42, 0.55, 0.08, true) },
    run: { loop: true, frames: walk(8, 70, 0.75, 1.0, 0.28, true) },
    // Forehand: wind up to the right, cut across to the left.
    slash1: { frames: [
      { d: 60, pose: { tw: -0.55, lean: -0.05, aRp: 1.15, aRr: 0.95, aRe: 0.9, wy: 115, wp: 25, lRp: -0.25, lLp: 0.35, lLk: 0.25 } },
      { d: 45, pose: { tw: -0.7, lean: -0.08, aRp: 1.2, aRr: 1.1, aRe: 0.95, wy: 140, wp: 25, lRp: -0.3, lLp: 0.4, lLk: 0.3 } },
      { d: 35, smear: true, hit: true, pose: { tw: 0.15, lean: 0.15, aRp: 1.5, aRr: 0.25, aRe: 0.05, wy: 0, wp: 5, lRp: -0.35, lLp: 0.45, lLk: 0.35 } },
      { d: 50, smear: true, pose: { tw: 0.6, lean: 0.2, aRp: 1.3, aRr: -0.5, aRe: 0.2, wy: -110, wp: -15, lRp: -0.35, lLp: 0.45, lLk: 0.4 } },
      { d: 90, pose: { tw: 0.65, lean: 0.18, aRp: 1.1, aRr: -0.6, aRe: 0.3, wy: -130, wp: -30, lRp: -0.3, lLp: 0.4, lLk: 0.35 } },
      { d: 110, pose: { tw: 0.35, lean: 0.1, aRp: 0.9, aRr: -0.2, aRe: 0.5, wy: -50, wp: 10 } },
    ] },
    // Backhand: from the left, back across to the right.
    slash2: { frames: [
      { d: 50, pose: { tw: 0.7, lean: 0.05, aRp: 1.2, aRr: -0.65, aRe: 0.6, wy: -140, wp: 20, lRp: 0.35, lLp: -0.2, lRk: 0.3 } },
      { d: 35, smear: true, hit: true, pose: { tw: -0.1, lean: 0.15, aRp: 1.45, aRr: 0.2, aRe: 0.05, wy: 10, wp: 5, lRp: 0.45, lLp: -0.3, lRk: 0.35 } },
      { d: 50, smear: true, pose: { tw: -0.55, lean: 0.18, aRp: 1.25, aRr: 1.0, aRe: 0.15, wy: 120, wp: -10, lRp: 0.45, lLp: -0.3, lRk: 0.4 } },
      { d: 90, pose: { tw: -0.6, lean: 0.15, aRp: 1.0, aRr: 1.1, aRe: 0.3, wy: 135, wp: -25 } },
      { d: 110, pose: { tw: -0.2, lean: 0.08, aRp: 0.85, aRr: 0.5, aRe: 0.6, wy: 60, wp: 20 } },
    ] },
    // Overhead chop: the third hit of the chain, heavier.
    chop: { frames: [
      { d: 70, pose: { tw: -0.25, lean: -0.15, aRp: 2.6, aRr: 0.2, aRe: 0.5, aLp: 2.2, aLr: 0.1, aLe: 0.6, wy: 0, wp: 125, lRp: -0.2, lLp: 0.35 } },
      { d: 60, pose: { tw: -0.3, lean: -0.2, aRp: 2.9, aRr: 0.15, aRe: 0.6, aLp: 2.5, aLe: 0.7, wy: 0, wp: 140, lRp: -0.25, lLp: 0.4, lLk: 0.3 } },
      { d: 35, smear: true, hit: true, pose: { tw: 0.1, lean: 0.3, aRp: 1.7, aRr: 0.1, aRe: 0.0, aLp: 1.4, aLe: 0.3, wy: 0, wp: 10, lRp: -0.4, lLp: 0.5, lLk: 0.55, lRk: 0.3 } },
      { d: 60, smear: true, pose: { tw: 0.15, lean: 0.4, aRp: 1.0, aRr: 0.1, aRe: 0.0, aLp: 0.9, aLe: 0.3, wy: 0, wp: -45, lRp: -0.4, lLp: 0.55, lLk: 0.65, lRk: 0.4 } },
      { d: 140, pose: { tw: 0.1, lean: 0.35, aRp: 0.95, aRe: 0.1, aLp: 0.8, wy: 0, wp: -50, lRp: -0.35, lLp: 0.5, lLk: 0.6, lRk: 0.35 } },
      { d: 120, pose: { lean: 0.15, aRp: 0.85, aRe: 0.4, wy: 5, wp: 0 } },
    ] },
    // Power attack: a long, low wind-up, then everything into it.
    power: { frames: [
      { d: 90, pose: { tw: -0.8, lean: -0.1, aRp: 1.4, aRr: 1.2, aRe: 1.2, aLp: 1.0, aLe: 0.8, wy: 150, wp: 45, lRp: -0.35, lLp: 0.45, lLk: 0.45, lRk: 0.4 } },
      { d: 200, glow: true, pose: { tw: -1.0, lean: -0.15, aRp: 1.6, aRr: 1.3, aRe: 1.3, aLp: 1.2, aLe: 0.9, wy: 165, wp: 60, lRp: -0.4, lLp: 0.5, lLk: 0.55, lRk: 0.5 } },
      { d: 35, smear: true, hit: true, pose: { tw: 0.3, lean: 0.3, aRp: 1.55, aRr: 0.1, aRe: 0.0, aLp: 1.0, aLe: 0.4, wy: -10, wp: 0, lRp: -0.45, lLp: 0.6, lLk: 0.6, lRk: 0.3 } },
      { d: 50, smear: true, pose: { tw: 0.9, lean: 0.35, aRp: 1.2, aRr: -0.7, aRe: 0.1, wy: -140, wp: -20, lRp: -0.45, lLp: 0.6, lLk: 0.6 } },
      { d: 180, pose: { tw: 0.95, lean: 0.3, aRp: 1.0, aRr: -0.75, aRe: 0.3, wy: -150, wp: -35, lRp: -0.4, lLp: 0.55, lLk: 0.55 } },
      { d: 140, pose: { tw: 0.4, lean: 0.12, aRp: 0.85, aRr: -0.2, aRe: 0.5, wy: -40, wp: 15 } },
    ] },
    block: { loop: true, frames: [{ d: 1000, pose: { tw: 0.25, lean: 0.08, aRp: 1.25, aRr: -0.1, aRe: 1.15, wy: -80, wp: 22, aLp: 0.9, aLe: 1.5, lRk: 0.35, lLk: 0.3, lLp: 0.15 } }] },
    hit: { frames: [
      { d: 70, pose: { lean: -0.35, tw: -0.35, aLp: 0.9, aLr: 0.8, aLe: 0.2, aRp: 0.5, aRr: 0.6, wy: 60, wp: 10, lRk: 0.3 } },
      { d: 100, pose: { lean: -0.25, tw: -0.2, aLp: 0.6, aLr: 0.5, aRp: 0.55, aRr: 0.4, wy: 40, wp: 20, lRk: 0.3 } },
      { d: 120, pose: { lean: -0.08, tw: 0.05 } },
    ] },
    death: { hold: true, frames: [
      { d: 90, pose: { lean: -0.35, tw: -0.4, aLp: 1.0, aLr: 0.9, aRp: 0.6, aRr: 0.9, wy: 80, wp: 0, lRk: 0.4, lLk: 0.3 } },
      { d: 90, pose: { fall: 0.45, lean: -0.2, tw: -0.3, aLp: 1.6, aLr: 1.0, aRp: 1.4, aRr: 1.1, wy: 90, wp: 30, lRk: 0.8, lLk: 0.6, lRp: 0.5, lLp: 0.3 } },
      { d: 80, pose: { fall: 1.0, lean: 0, aLp: 2.2, aLr: 1.0, aRp: 2.0, aRr: 1.2, wy: 100, wp: 60, lRk: 0.7, lLk: 0.5, lRp: 0.5, lLp: 0.35 } },
      { d: 70, pose: { fall: 1.5, lean: 0.1, aLp: 2.6, aLr: 1.1, aRp: 2.4, aRr: 1.3, wy: 110, wp: 80, lRk: 0.4, lLk: 0.3, lRp: 0.3, lLp: 0.2 } },
      { d: 90, pose: { fall: 1.42, lean: 0.12, aLp: 2.7, aLr: 1.2, aRp: 2.5, aRr: 1.35, wy: 110, wp: 85, lRk: 0.3, lLk: 0.2, lRp: 0.25, lLp: 0.15 } },
      { d: 999, pose: { fall: 1.57, lean: 0.1, aLp: 2.8, aLr: 1.2, aRp: 2.6, aRr: 1.4, wy: 110, wp: 88, lRk: 0.25, lLk: 0.15, lRp: 0.2, lLp: 0.1 } },
    ] },
  };
  // The bandit's chop holds its wind-up longer, glowing, so it can be read.
  ANIMS.enemyChop = { frames: ANIMS.chop.frames.map((f, i) => (i === 1 ? { ...f, d: 420, glow: true } : f)) };
  const COMBO = ['slash1', 'slash2', 'chop'];
  const hitIndex = (a) => ANIMS[a].frames.findIndex((f) => f.hit);

  // ---------- the two styles ----------
  function scaled(k, r, outline) { const o = Object.fromEntries(Object.entries(r).map(([a, v]) => [a, v * k])); o.outline = outline; return o; }
  const STYLES = {
    // A: chunky, big-headed figures under a steeper camera. B: slimmer, smaller-headed figures under a lower one.
    A: { key: 'A', name: 'Style A: top-down three-quarter', phi: 40 * D, dirs: 4, ground: 'top',
      rig: scaled(1.25, { thigh: 7.5, shin: 7, spine: 11, neck: 1.2, headR: 7, shW: 6.2, hipW: 3.2, upper: 6.5, fore: 6, foot: 2.6, grip: 2, blade: 14,
        thighT: 6, shinT: 5, upperT: 4.6, foreT: 4, chestMin: 12.5, waistMin: 10.5 }, 0.2) },
    B: { key: 'B', name: 'Style B: small isometric', phi: 22 * D, dirs: 8, ground: 'iso',
      rig: scaled(1.2, { thigh: 8.5, shin: 8.5, spine: 12.5, neck: 1.5, headR: 4.6, shW: 5.2, hipW: 2.6, upper: 7, fore: 6.5, foot: 2.4, grip: 2, blade: 15,
        thighT: 4.6, shinT: 3.8, upperT: 3.4, foreT: 3, chestMin: 9, waistMin: 7.5 }, 0.32) },
  };

  const cache = new Map();
  function frameOf(style, who, anim, i, face) {
    const key = `${style.key}|${who}|${anim}|${i}|${face.toFixed(3)}`;
    let f = cache.get(key);
    if (!f) { f = drawCharacter(LOOKS[who], ANIMS[anim].frames[i].pose, style.rig, face, style.phi); cache.set(key, f); }
    return f;
  }
  // Facing angle from a screen direction, snapped to the style's directions.
  const faceOf = (dx, dy, dirs) => { const a = Math.atan2(-dx, -dy), step = (2 * Math.PI) / dirs; return Math.round(a / step) * step; };

  // ---------- ground and props ----------
  const W = 320, H = 190;
  function makeGround(style) {
    const p = new Px(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = fbm(x * 0.05, y * 0.05, 11), m = fbm(x * 0.3, y * 0.3, 12, 2);
      // The path: straight across in A, a diagonal in B (the isometric grid).
      const along = style.ground === 'top' ? y - 128 - 6 * Math.sin(x * 0.03) : (y - 140) + (x - 160) * 0.5 - 8 * Math.sin(x * 0.04);
      const path = Math.abs(along) < 11 + 4 * (fbm(x * 0.1, y * 0.1, 13) - 0.5) * 2;
      if (path) p.set(x, y, tone('dirt', 0.48 + 0.25 * (n - 0.5) + 0.2 * (m - 0.5) + (hash(x, y, 14) < 0.04 ? 0.2 : 0), x, y));
      else p.set(x, y, tone('grass', 0.45 + 0.35 * (n - 0.5) + 0.2 * (m - 0.5) + (hash(x, y, 15) < 0.05 ? 0.22 : 0), x, y));
    }
    // Tufts of taller grass.
    for (let k = 0; k < 140; k++) { const x = Math.floor(hash(k, 1, 16) * W), y = Math.floor(hash(k, 2, 16) * H); for (let j = 0; j < 3; j++) p.set(x + j - 1, y - (j === 1 ? 2 : 1), tone('grass', 0.75, x + j, y)); }
    return p.canvas();
  }
  function makeProps(style) {
    const props = [];
    // A crate: a lit top and a darker front (A), or an isometric box (B).
    { const p = new Px(28, 28);
      if (style.ground === 'top') {
        for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) { const top = y < 10, X = x + 5, Y = y + 6, plank = (top ? x : y) % 6 === 0;
          p.set(X, Y, tone('wood', (top ? 0.62 - y * 0.02 : 0.36 - (y - 10) * 0.02) + (plank ? -0.18 : 0) + 0.12 * (fbm(X * 0.4, Y * 0.4, 21) - 0.5), X, Y)); }
      } else {
        const c = [14, 6], s = 8;
        poly(p, [[c[0], c[1]], [c[0] + s * 1.2, c[1] + s * 0.6], [c[0], c[1] + s * 1.2], [c[0] - s * 1.2, c[1] + s * 0.6]], (x, y) => tone('wood', 0.62 + (((x + 2 * y) % 7) === 0 ? -0.15 : 0), x, y));
        poly(p, [[c[0] - s * 1.2, c[1] + s * 0.6], [c[0], c[1] + s * 1.2], [c[0], c[1] + s * 2.3], [c[0] - s * 1.2, c[1] + s * 1.7]], (x, y) => tone('wood', 0.42 + (y % 5 === 0 ? -0.12 : 0), x, y));
        poly(p, [[c[0], c[1] + s * 1.2], [c[0] + s * 1.2, c[1] + s * 0.6], [c[0] + s * 1.2, c[1] + s * 1.7], [c[0], c[1] + s * 2.3]], (x, y) => tone('wood', 0.28 + (y % 5 === 0 ? -0.1 : 0), x, y));
      }
      props.push({ x: 250, y: 92, canvas: finish(p, 0.3).canvas(), ox: 14, oy: 25, r: 9 }); }
    { const p = new Px(34, 26); blob(p, 17, 14, 14, 10, 'leaf', { rough: 0.3, seed: 31, tex: 0.35 }); for (let k = 0; k < 12; k++) blob(p, 6 + hash(k, 3, 32) * 22, 7 + hash(k, 4, 32) * 12, 2.4, 2, 'leaf', { bias: 0.15, tex: 0.2, seed: k });
      props.push({ x: 58, y: 70, canvas: finish(p, 0.3).canvas(), ox: 17, oy: 22, r: 11 }); }
    // A low stone wall: seen from above in A (a deep top, a short face), running diagonally along the grid in B.
    { const brick = (x, y, top) => { const row = Math.floor(y / 5), off = row % 2 ? 6 : 0; return (y % 5 === 0 || (x + off) % 12 === 0) ? (top ? -0.12 : -0.16) : 0; };
      if (style.ground === 'top') {
        const p = new Px(90, 30);
        for (let y = 2; y < 28; y++) for (let x = 3; x < 87; x++) { const top = y < 15, v = top ? 0.62 - (y - 2) * 0.012 : 0.36 - (y - 15) * 0.012;
          p.set(x, y, tone('stone', v + brick(x, y, top) + 0.14 * (fbm(x * 0.3, y * 0.3, 51) - 0.5), x, y)); }
        props.push({ x: 150, y: 52, canvas: finish(p, 0.3).canvas(), ox: 45, oy: 28, solid: [-36, -24, -12, 0, 12, 24, 36].map((dx) => [150 + dx, 46, 7]) });
      } else {
        const p = new Px(96, 66), x0 = 6, y0 = 22, x1 = 88, y1 = 63, hgt = 13, dep = [7, -3.5];
        poly(p, [[x0, y0 - hgt], [x1, y1 - hgt], [x1, y1], [x0, y0]], (x, y) => tone('stone', 0.36 + brick(x, y - Math.round((x - x0) * 0.5), false) + 0.12 * (fbm(x * 0.3, y * 0.3, 52) - 0.5), x, y));
        poly(p, [[x0, y0 - hgt], [x1, y1 - hgt], [x1 + dep[0], y1 - hgt + dep[1]], [x0 + dep[0], y0 - hgt + dep[1]]], (x, y) => tone('stone', 0.66 + (Math.round(x - (y - y0) * 2) % 12 === 0 ? -0.12 : 0) + 0.12 * (fbm(x * 0.3, y * 0.3, 53) - 0.5), x, y));
        props.push({ x: 128, y: 56, canvas: finish(p, 0.3).canvas(), ox: 48, oy: 38, solid: [0, 1, 2, 3, 4, 5, 6].map((k) => [86 + k * 12, 38 + k * 6, 7]) });
      } }
    { const p = new Px(26, 20); blob(p, 13, 11, 11, 7.5, 'stone', { rough: 0.25, seed: 41, tex: 0.25 });
      props.push({ x: 282, y: 168, canvas: finish(p, 0.3).canvas(), ox: 13, oy: 16, r: 9 }); }
    return props;
  }

  // ---------- the playable scene ----------
  const canvas = document.getElementById('view'), ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  let style = STYLES.A, ground, props, decals;
  const keys = new Set();
  const mk = (who, x, y) => ({ who, x, y, face: Math.PI, anim: 'idle', fi: 0, ft: 0, kb: [0, 0], flash: 0, hp: 5, struck: false, combo: 0, comboT: 9, buffer: null, dead: 0, cool: 1.5, prevBlade: null, curBlade: null, drawnFi: -1, drawnAnim: '' });
  let pl, en, hitStop = 0, shake = 0, parts = [], smears = [], msg = '';
  function setStyle(k) {
    style = STYLES[k]; ground = makeGround(style); props = makeProps(style);
    decals = document.createElement('canvas'); decals.width = W; decals.height = H;
    pl = mk('kasim', 120, 110); en = mk('bandit', 190, 100); en.face = faceOf(-1, 0, style.dirs); pl.face = faceOf(1, 0, style.dirs);
  }
  const frames = (f) => ANIMS[f.anim].frames;
  function play(f, anim) { f.anim = anim; f.fi = 0; f.ft = 0; f.struck = false; }
  const busy = (f) => !['idle', 'walk', 'run', 'block'].includes(f.anim);
  const canAct = (f) => !busy(f) || (COMBO.includes(f.anim) || f.anim === 'power') && f.struck && f.fi > hitIndex(f.anim);
  function attack(power) {
    if (pl.anim === 'death') return;
    if (!canAct(pl)) { pl.buffer = { power, left: 0.35 }; return; }
    const chained = !power && (COMBO.includes(pl.anim) || pl.comboT < 0.45);
    pl.combo = chained ? (pl.combo + 1) % 3 : 0;
    // Aim assist: turn to the bandit if he is near and roughly ahead.
    const dx = en.x - pl.x, dy = en.y - pl.y;
    if (en.anim !== 'death' && Math.hypot(dx, dy) < 44) pl.face = faceOf(dx, dy, style.dirs);
    play(pl, power ? 'power' : COMBO[pl.combo]);
  }
  const fwd = (f) => [-Math.sin(f.face), -Math.cos(f.face)]; // screen direction a fighter faces
  function inReach(a, b, reach) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), [fx, fy] = fwd(a);
    return d < reach && (fx * dx + fy * dy) / (d || 1) > 0.35;
  }
  function blood(x, y, n, up = 18) { for (let i = 0; i < n; i++) parts.push({ x, y, z: up + Math.random() * 8, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 30, vz: 20 + Math.random() * 50, c: Math.random() < 0.5 ? '#7a0d0a' : '#a3170f' }); }
  function sparks(x, y) { for (let i = 0; i < 8; i++) parts.push({ x, y, z: 20, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 40, vz: 30 + Math.random() * 40, c: '#ffe7a0', spark: 0.25 }); }
  function knock(from, to, dist) { const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1; to.kb = [(dx / d) * dist * 9, (dy / d) * dist * 9]; }
  function landBlow(att, def) {
    if (def.anim === 'death' || !inReach(att, def, att.anim === 'chop' || att.anim === 'enemyChop' || att.anim === 'power' ? 34 : 30)) return;
    const heavy = att.anim === 'power' || att.anim === 'chop' || att.anim === 'enemyChop';
    if (def.anim === 'block' && inReach(def, att, 60)) { sparks((att.x + def.x) / 2, (att.y + def.y) / 2); knock(att, def, 4); hitStop = 0.05; shake = 1.5; msg = 'Blocked.'; return; }
    def.hp -= heavy ? 2 : 1; def.flash = 0.08; knock(att, def, heavy ? 14 : 7);
    hitStop = heavy ? 0.1 : 0.06; shake = heavy ? 3.5 : 2;
    blood(def.x, def.y, heavy ? 14 : 7);
    if (def.hp <= 0) { play(def, 'death'); def.dead = 0; hitStop = 0.14; shake = 5; blood(def.x, def.y, 26, 24); msg = def === en ? 'The bandit is dead.' : 'You died.'; }
    else play(def, 'hit');
  }
  function step(f, dt) {
    f.ft += dt * 1000;
    const fr = frames(f);
    while (f.ft >= fr[f.fi].d) {
      f.ft -= fr[f.fi].d;
      if (f.fi + 1 < fr.length) { f.fi++; if (fr[f.fi].hit && !f.struck) { f.struck = true; landBlow(f, f === pl ? en : pl); } }
      else if (ANIMS[f.anim].loop) f.fi = 0;
      else if (ANIMS[f.anim].hold) { f.ft = 0; break; }
      else { if (COMBO.includes(f.anim)) f.comboT = 0; play(f, 'idle'); break; }
    }
    if (!COMBO.includes(f.anim)) f.comboT += dt;
    // Knockback slides, and fades fast.
    f.x += f.kb[0] * dt; f.y += f.kb[1] * dt; const k = Math.exp(-9 * dt); f.kb[0] *= k; f.kb[1] *= k;
    f.x = clamp(f.x, 12, W - 12); f.y = clamp(f.y, 30, H - 6);
    if (f.flash > 0) f.flash -= dt;
  }
  function update(dt) {
    shake = Math.max(0, shake - 25 * dt);
    if (hitStop > 0) { hitStop -= dt; return; }
    // The player.
    let mx = 0, my = 0;
    if (keys.has('KeyW')) my -= 1; if (keys.has('KeyS')) my += 1; if (keys.has('KeyA')) mx -= 1; if (keys.has('KeyD')) mx += 1;
    const blocking = keys.has('KeyK') || keys.has('mouse2');
    if (pl.anim !== 'death') {
      if (!busy(pl)) {
        if (blocking) { if (pl.anim !== 'block') play(pl, 'block'); }
        else if (mx || my) {
          const run = keys.has('ShiftLeft') || keys.has('ShiftRight'), l = Math.hypot(mx, my), sp = run ? 62 : 34;
          pl.face = faceOf(mx, my, style.dirs); pl.x += (mx / l) * sp * dt; pl.y += (my / l) * sp * dt * 0.8;
          if (pl.anim !== (run ? 'run' : 'walk')) play(pl, run ? 'run' : 'walk');
        } else if (pl.anim !== 'idle') play(pl, 'idle');
      }
      if (pl.buffer && (pl.buffer.left -= dt) <= 0) pl.buffer = null;
      if (pl.buffer && canAct(pl)) { const b = pl.buffer; pl.buffer = null; attack(b.power); }
      if (holdStart !== null && performance.now() - holdStart > 250) { holdStart = null; attack(true); }
    }
    step(pl, dt);
    // The bandit: close in, wind up (glowing), chop. Dead, he lies a while and gets up again.
    if (en.anim === 'death') { en.dead += dt; if (en.dead > 3) { Object.assign(en, mk('bandit', 230 + Math.random() * 40, 60 + Math.random() * 100)); msg = 'Another bandit.'; } }
    else if (!busy(en)) {
      const dx = pl.x - en.x, dy = pl.y - en.y, d = Math.hypot(dx, dy);
      if (pl.anim !== 'death') en.face = faceOf(dx, dy, style.dirs);
      if (pl.anim === 'death') { if (en.anim !== 'idle') play(en, 'idle'); }
      else if (d > 28) { en.x += (dx / d) * 24 * dt; en.y += (dy / d) * 24 * dt * 0.8; if (en.anim !== 'walk') play(en, 'walk'); }
      else { if (en.anim !== 'idle') play(en, 'idle'); if ((en.cool -= dt) <= 0) { play(en, 'enemyChop'); en.cool = 1.6 + Math.random() * 1.4; } }
    }
    step(en, dt);
    if (pl.anim === 'death' && pl.ft > 1500) { Object.assign(pl, mk('kasim', 120, 110)); msg = ''; }
    // Keep them apart, and out of the props.
    const dx = en.x - pl.x, dy = en.y - pl.y, d = Math.hypot(dx, dy);
    if (d < 16 && en.anim !== 'death' && pl.anim !== 'death') { const push = (16 - d) / 2, ux = dx / (d || 1), uy = dy / (d || 1); en.x += ux * push; en.y += uy * push; pl.x -= ux * push; pl.y -= uy * push; }
    for (const f of [pl, en]) for (const q of props) for (const [qx, qy, r] of q.solid ?? [[q.x, q.y, q.r]]) {
      const ex = f.x - qx, ey = (f.y - qy) * 1.6, e = Math.hypot(ex, ey);
      if (e < r + 5) { f.x += (ex / (e || 1)) * (r + 5 - e); f.y += (ey / (e || 1)) * (r + 5 - e) / 1.6; }
    }
    // Blood and sparks fly, and blood stays where it lands.
    const dg = decals.getContext('2d');
    parts = parts.filter((q) => {
      q.vz -= 260 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.spark !== undefined) return (q.spark -= dt) > 0;
      if (q.z <= 0) { dg.fillStyle = q.c; dg.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); return false; }
      return true;
    });
  }
  const tmp = document.createElement('canvas'); tmp.width = SW; tmp.height = SH; const tg = tmp.getContext('2d');
  function drawFighter(f, sx, sy) {
    const fr = frames(f)[f.fi], img = frameOf(style, f.who, f.anim, f.fi, f.face);
    // Shadow.
    ctx.fillStyle = 'rgba(10,8,4,0.35)'; ctx.beginPath(); ctx.ellipse(sx, sy, 9, 3.2, 0, 0, 2 * Math.PI); ctx.fill();
    // Smear: the blade's arc from the frame before to this one.
    if (f.drawnFi !== f.fi || f.drawnAnim !== f.anim) { f.prevBlade = f.drawnAnim === f.anim ? f.curBlade : null; f.drawnFi = f.fi; f.drawnAnim = f.anim; }
    f.curBlade = img.blade;
    if (fr.smear && f.prevBlade) {
      const [a0, a1] = f.prevBlade, [b0, b1] = img.blade;
      ctx.fillStyle = 'rgba(255,246,220,0.55)'; ctx.beginPath();
      ctx.moveTo(sx - OX + a0[0], sy - OY + a0[1]); ctx.lineTo(sx - OX + a1[0], sy - OY + a1[1]); ctx.lineTo(sx - OX + b1[0], sy - OY + b1[1]); ctx.lineTo(sx - OX + b0[0], sy - OY + b0[1]); ctx.closePath(); ctx.fill();
    }
    let src = img.canvas;
    const glow = fr.glow && f === en, white = f.flash > 0;
    if (glow || white) {
      tg.clearRect(0, 0, SW, SH); tg.globalCompositeOperation = 'source-over'; tg.drawImage(img.canvas, 0, 0);
      tg.globalCompositeOperation = 'source-atop';
      tg.fillStyle = white ? 'rgba(255,255,255,0.85)' : `rgba(255,${Math.floor(performance.now() / 70) % 2 ? 190 : 140},60,0.45)`; tg.fillRect(0, 0, SW, SH);
      src = tmp;
    }
    ctx.drawImage(src, Math.round(sx - OX), Math.round(sy - OY));
  }
  function draw() {
    ctx.save();
    if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));
    ctx.drawImage(ground, 0, 0); ctx.drawImage(decals, 0, 0);
    const items = [...props.map((q) => ({ y: q.y, draw: () => ctx.drawImage(q.canvas, q.x - q.ox, q.y - q.oy) })),
      ...[pl, en].map((f) => ({ y: f.y - (f.anim === 'death' ? 6 : 0), draw: () => drawFighter(f, f.x, f.y) }))];
    items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());
    for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y - q.z), 1, 1); }
    ctx.restore();
    document.getElementById('msg').textContent = msg;
  }
  let holdStart = null, last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mode !== 'now') { update(dt); draw(); }
    requestAnimationFrame(loop);
  }

  // ---------- the animation sheet ----------
  const sheet = document.getElementById('sheet'), sg = sheet.getContext('2d');
  const SHEET = ['idle', 'walk', 'run', 'slash1', 'slash2', 'chop', 'power', 'block', 'hit', 'death'];
  let sheetWho = 'kasim';
  function drawSheet(now) {
    if (mode === 'now') return requestAnimationFrame(drawSheet);
    const n = style.dirs, cell = 76;
    if (sheet.width !== n * cell + 70) { sheet.width = n * cell + 70; sheet.height = SHEET.length * cell; sheet.style.width = `${sheet.width * 1.5}px`; }
    sg.imageSmoothingEnabled = false;
    sg.fillStyle = '#20251a'; sg.fillRect(0, 0, sheet.width, sheet.height);
    SHEET.forEach((anim, row) => {
      sg.fillStyle = '#c8c0a8'; sg.font = '11px Georgia'; sg.fillText(anim, 4, row * cell + cell / 2 + 4);
      const fr = ANIMS[anim].frames, total = fr.reduce((s, f) => s + f.d, 0) + (ANIMS[anim].loop ? 0 : 500);
      let t = now % total, i = 0; while (i < fr.length - 1 && t >= fr[i].d) { t -= fr[i].d; i++; }
      for (let k = 0; k < n; k++) {
        const face = Math.PI - (k * 2 * Math.PI) / n, img = frameOf(style, sheetWho, anim, i, face);
        sg.drawImage(img.canvas, 70 + k * cell + cell / 2 - OX, row * cell + cell - 6 - OY);
      }
    });
    requestAnimationFrame(drawSheet);
  }

  // ---------- controls and tabs ----------
  let mode = 'A';
  function setMode(m) {
    mode = m;
    for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === m);
    document.getElementById('play').hidden = m === 'now'; document.getElementById('now').hidden = m !== 'now';
    if (m !== 'now') { setStyle(m); document.getElementById('style-name').textContent = style.name; document.getElementById('style-note').textContent = NOTES[m]; }
  }
  const NOTES = {
    A: 'Closer to Wasteland Settlement: a camera looking down more, chunkier figures with bigger heads, four directions. Easiest to read and cheapest to draw; less sense of depth in towns and dungeons.',
    B: 'Closer to the current game: an isometric world, slimmer figures with smaller heads, eight directions. More atmosphere for buildings and ruins; more frames to draw for every animation.',
  };
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.dataset?.tab) setMode(t.dataset.tab);
    if (t.dataset?.who) { sheetWho = t.dataset.who; for (const b of document.querySelectorAll('[data-who]')) b.classList.toggle('on', b === t); }
  });
  addEventListener('keydown', (e) => {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyJ') holdStart = performance.now();
  });
  addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'KeyJ' && holdStart !== null) { holdStart = null; attack(false); }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) holdStart = performance.now(); if (e.button === 2) keys.add('mouse2'); });
  addEventListener('mouseup', (e) => { if (e.button === 0 && holdStart !== null) { holdStart = null; attack(false); } if (e.button === 2) keys.delete('mouse2'); });
  addEventListener('blur', () => keys.clear());

  setMode('A');
  requestAnimationFrame(loop); requestAnimationFrame(drawSheet);
  window.__sample = { setMode, attack, state: () => ({ pl: { ...pl }, en: { ...en } }), STYLES };
})();
