/* =====================================================================
   Art sample, round two (design bible 4.0): style A, chosen by Broden.
   A bandit camp to fight through, every armour set and weapon class on Kasim,
   dismemberment and finishers. Everything is drawn by code while the page runs:
   small pixel buffers, palette ramps, ordered dithering, a rim light and a coloured
   outline. Figures are posed from one small 3D skeleton, so every direction and every
   outfit shares the same animations. Frames are held for hand-set times.
   This page is a sample, not game code: nothing in the game reads it.
   ===================================================================== */
(() => {
  // ---------- palette ----------
  const RAMPS = {
    skin:    ['#2a160e', '#45281b', '#5e3826', '#784a32', '#925e40', '#a8734f', '#bd8a62'],
    pale:    ['#2b1a12', '#4c2f22', '#6e4633', '#8f5f46', '#ad7a5c', '#c69676', '#dbb08f'],
    cream:   ['#2a241b', '#4a4031', '#6d604a', '#91836a', '#b0a283', '#cbbf9f', '#e2d8bb'],
    hair:    ['#0b0807', '#151010', '#201816', '#2c221e', '#3a2d27'],
    ginger:  ['#1c0d06', '#3a1a0b', '#5a2a12', '#7a3c1a', '#985024'],
    leather: ['#120b07', '#24160e', '#382316', '#4c301f', '#61402a', '#775237', '#8d6644'],
    boot:    ['#0e0907', '#1b120d', '#2a1c14', '#3a281c', '#4b3424'],
    pants:   ['#14100c', '#241d16', '#372c21', '#4a3c2d', '#5e4d3a', '#736049'],
    red:     ['#1c0606', '#380c0b', '#561410', '#741d15', '#8f2a1c', '#a83b27', '#bf5236'],
    fur:     ['#1a130d', '#2f2318', '#4a3826', '#665036', '#826848', '#9c825c', '#b39a72'],
    hide:    ['#1f150c', '#3a2816', '#57401f', '#73582b', '#8f7139', '#a98a4c', '#c2a463'],
    sand:    ['#2a2013', '#4a3a22', '#6b5533', '#8c7146', '#ab8d5b', '#c6a873', '#dcc28e'],
    iron:    ['#0f0f10', '#1e1e20', '#323133', '#48464a', '#5f5c5f', '#787477', '#938e8f'],
    steel:   ['#101317', '#1f242a', '#333a42', '#4b545e', '#66717c', '#87929c', '#b3bcc2', '#dde3e6'],
    orc:     ['#0a0d08', '#141a10', '#1f2918', '#2c3a21', '#3b4b2b', '#4d5f36', '#617442'],
    brass:   ['#1e1406', '#3c280d', '#5e4115', '#83601f', '#a6812b', '#c6a33f', '#e2c46a'],
    wood:    ['#140b06', '#2b180c', '#452813', '#5e391c', '#7a4c27', '#966234', '#b17d47'],
    grass:   ['#16200d', '#223014', '#30431a', '#3f5720', '#506c27', '#628130', '#78963d'],
    dirt:    ['#1f160e', '#33251a', '#4a3726', '#614a33', '#7a5f42', '#937652', '#ab8e66'],
    stone:   ['#121216', '#222226', '#353439', '#4a484c', '#625e60', '#7d7775', '#9b938c'],
    leaf:    ['#0c160b', '#152611', '#203a18', '#2c4f1f', '#3a6627', '#4c7f32', '#5f9940'],
    canvas:  ['#1e1a12', '#36301f', '#504731', '#6b5f44', '#877959', '#a3946f', '#bcae88'],
    bone:    ['#241f17', '#433a2b', '#655941', '#887b5b', '#a99c7a', '#c7bc9b', '#e2d9bb'],
    meat:    ['#160806', '#2e110b', '#481b11', '#622817', '#7c3920', '#96512e'],
    blood:   ['#140304', '#2e0607', '#4a0b0b', '#681211', '#851d17', '#a12d1f'],
    fire:    ['#3a0e02', '#7a2404', '#b9480a', '#e07a16', '#f5a733', '#fdd56a', '#fff2b8'],
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
  const L = (() => { const v = [-0.55, 0.7, 0.55], n = Math.hypot(...v); return v.map((q) => q / n); })(); // light: top left, towards the viewer
  function blob(p, cx, cy, rx, ry, ramp, o = {}) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, ang = Math.atan2(dy, dx);
      const edge = 1 + (o.rough || 0) * (noise(Math.cos(ang) * 2.2 + 5, Math.sin(ang) * 2.2 + 5, o.seed || 1) - 0.5) * 2;
      if (dx * dx + dy * dy > edge * edge) continue;
      const nx = dx / edge, ny = -dy / edge, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const v = (nx * L[0] + ny * L[1] + nz * L[2]) * 0.62 + 0.3 + (o.bias || 0) + (o.tex ?? 0.14) * (fbm(x * 0.35, y * 0.35, (o.seed || 1) + 3) - 0.5);
      const c = o.fn ? o.fn(x, y, v) : null;
      p.set(x, y, c || tone(ramp, v, x, y));
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
  // A tapered rod with round ends, shaded across its width. fn(x, y, t, across, v) may recolour.
  function rod(p, x0, y0, x1, y1, th0, th1, ramp, o = {}) {
    const len = Math.max(0.01, Math.hypot(x1 - x0, y1 - y0)), ux = (x1 - x0) / len, uy = (y1 - y0) / len, nx = -uy, ny = ux, th = Math.max(th0, th1);
    const ln = nx * L[0] - ny * L[1];
    for (let y = Math.floor(Math.min(y0, y1) - th); y <= Math.ceil(Math.max(y0, y1) + th); y++) for (let x = Math.floor(Math.min(x0, x1) - th); x <= Math.ceil(Math.max(x0, x1) + th); x++) {
      const px = x + 0.5 - x0, py = y + 0.5 - y0, t = px * ux + py * uy, d = px * nx + py * ny;
      const half = (th0 + (th1 - th0) * clamp(t / len, 0, 1)) / 2;
      if (t < 0 ? Math.hypot(px, py) > half : t > len ? Math.hypot(x + 0.5 - x1, y + 0.5 - y1) > half : Math.abs(d) > half) continue;
      const across = clamp(d / Math.max(0.5, half), -1, 1), nz = Math.sqrt(Math.max(0, 1 - across * across));
      const v = (across * Math.sign(ln || 1) * -0.4 + nz * 0.55) * 0.85 + 0.3 + (o.bias || 0) + (o.tex ?? 0.06) * (fbm(x * 0.5, y * 0.5, o.seed || 4, 2) - 0.5);
      const c = o.fn ? o.fn(x, y, clamp(t / len, 0, 1), across, v) : null;
      p.set(x, y, c || tone(ramp, v, x, y));
    }
  }
  function finish(p, ol = 0.25) {
    const w = p.w, h = p.h, A = (x, y) => p.a(x, y) > 40, lift = [], drop = [], out = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!A(x, y)) continue;
      if ((!A(x - 1, y) || !A(x, y - 1)) && A(x + 1, y + 1)) lift.push([x, y]);
      else if (!A(x + 1, y) || !A(x, y + 1)) drop.push([x, y]);
    }
    for (const [x, y] of lift) p.shift(x, y, 1.25);
    for (const [x, y] of drop) p.shift(x, y, 0.75);
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
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
  const nrm = (a) => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const limb = (p, r, side) => rotY([0, Math.sin(p), -Math.cos(p)], -side * r);
  // Two-bone reach from a shoulder to a target, the elbow bending down and out (for two-handed grips).
  function reach(S, T, a, b, side) {
    let d = sub(T, S), l = len3(d); const u = nrm(d); l = Math.min(l, a + b - 0.01);
    const x = (a * a - b * b + l * l) / (2 * l), h = Math.sqrt(Math.max(0, a * a - x * x));
    let pole = [side * 0.6, -0.2, -1]; pole = nrm(sub(pole, [u[0] * dot3(pole, u), u[1] * dot3(pole, u), u[2] * dot3(pole, u)]));
    const el = add(add(S, u, x), pole, h);
    return [el, add(S, u, l)];
  }

  const BASE = { tw: 0.15, lean: 0.05, fall: 0, aRp: 0.75, aRr: 0.2, aRe: 0.7, aLp: 0.25, aLr: 0.2, aLe: 0.4, lRp: 0.12, lRk: 0.2, lLp: -0.15, lLk: 0.1, lRr: 0.1, lLr: 0.1, wy: 15, wp: 40 };
  const PHI = 40 * D, CP = Math.cos(PHI), SP = Math.sin(PHI);
  // Pose the skeleton (x right, y forward, z up, feet on the ground), face it, project it.
  function rig(pose, R, face, wpn) {
    const P = { ...BASE, ...pose };
    const legR = [limb(P.lRp, P.lRr, 1), limb(P.lRp - P.lRk, P.lRr, 1)], legL = [limb(P.lLp, P.lLr, -1), limb(P.lLp - P.lLk, P.lLr, -1)];
    // The lowest foot or knee stands on the ground.
    const low = (l) => Math.max(-l[0][2] * R.thigh, -(l[0][2] * R.thigh + l[1][2] * R.shin));
    const pelvis = [0, 0, Math.max(low(legR), low(legL))];
    const hipR = add(pelvis, rotZ([R.hipW, 0, 0], P.tw * 0.3)), hipL = add(pelvis, rotZ([-R.hipW, 0, 0], P.tw * 0.3));
    const kneeR = add(hipR, legR[0], R.thigh), footR = add(kneeR, legR[1], R.shin), kneeL = add(hipL, legL[0], R.thigh), footL = add(kneeL, legL[1], R.shin);
    const spine = [0, Math.sin(P.lean), Math.cos(P.lean)], chest = add(pelvis, spine, R.spine), neck = add(chest, spine, R.neck * 0.6);
    const shR = add(chest, rotZ([R.shW, 0, -1], P.tw)), shL = add(chest, rotZ([-R.shW, 0, -1], P.tw));
    const head = add(chest, spine, R.neck + R.headR);
    const arm = (sh, p, r, e, side) => { const u = rotZ(limb(p, r, side), P.tw), f = rotZ(limb(p + e, r, side), P.tw), el = add(sh, u, R.upper); return [el, add(el, f, R.fore)]; };
    const [elR, haR] = arm(shR, P.aRp, P.aRr, P.aRe, 1);
    const w = rotZ([Math.sin(P.wy * D) * Math.cos(P.wp * D), Math.cos(P.wy * D) * Math.cos(P.wp * D), Math.sin(P.wp * D)], P.tw);
    let elL, haL;
    if (wpn.hands === 2 && !P.free) [elL, haL] = reach(shL, add(haR, w, -3.2), R.upper, R.fore, -1); // both hands on the grip
    else [elL, haL] = arm(shL, P.aLp, P.aLr, P.aLe, -1);
    const wl = wpn.len * R.k;
    const toeR = add(footR, [0, R.foot, 0]), toeL = add(footL, [0, R.foot, 0]);
    const pts = { pelvis, hipR, hipL, kneeR, kneeL, footR, footL, toeR, toeL, chest, neck, shR, shL, head, elR, haR, elL, haL,
      wb: add(haR, w, -(wpn.hands === 2 ? 5.5 : 2.2)), wt: add(haR, w, wl), wg: add(haR, w, 1.4) };
    const world = (v) => rotZ(rotX(v, P.fall), face);
    const proj = {}, depth = {};
    for (const [k, v] of Object.entries(pts)) { const q = world(v); proj[k] = [q[0], -q[1] * SP - q[2] * CP]; depth[k] = q[1] * CP - q[2] * SP; }
    return { P, proj, depth, face };
  }

  // ---------- gear ----------
  // Armour sets (design bible 12.1, v0.3) and the eight weapon classes. Ramps name palette rows.
  const ARMOUR = {
    farm:    { name: 'Farm clothes', top: 'cream', sleeve: 'cream', fore: 'skin', pants: 'pants', boots: 'boot', belt: 'leather' },
    hide:    { name: 'Hide', top: 'hide', sleeve: null, fore: 'hide', pants: 'pants', boots: 'hide', belt: 'leather', collar: 'fur', pattern: 'stitch' },
    fur:     { name: 'Fur', top: 'fur', sleeve: null, fore: 'fur', pants: 'pants', boots: 'fur', belt: 'boot', collar: 'fur', pauldron: 'fur', pattern: 'shag' },
    leather: { name: 'Leather', top: 'leather', sleeve: 'leather', fore: 'leather', pants: 'boot', boots: 'boot', belt: 'brass', pattern: 'studs', helm: { ramp: 'leather', kind: 'cap' } },
    alikr:   { name: "Alik'r garb", top: 'sand', sleeve: 'sand', fore: 'sand', pants: 'sand', boots: 'leather', belt: 'red', skirt: { ramp: 'sand', len: 0.85 }, hood: 'sand', mask: 'sand' },
    iron:    { name: 'Iron', top: 'iron', sleeve: 'iron', fore: 'iron', pants: 'pants', boots: 'iron', belt: 'leather', pattern: 'bands', pauldron: 'iron', skirt: { ramp: 'leather', len: 0.35 }, helm: { ramp: 'iron', kind: 'nasal' } },
    steel:   { name: 'Steel', top: 'steel', sleeve: 'steel', fore: 'steel', pants: 'iron', boots: 'steel', belt: 'leather', pattern: 'plate', pauldron: 'steel', skirt: { ramp: 'steel', len: 0.4 }, helm: { ramp: 'steel', kind: 'closed' } },
    orcish:  { name: 'Orcish', top: 'orc', sleeve: 'orc', fore: 'orc', pants: 'orc', boots: 'orc', belt: 'boot', pattern: 'edges', pauldron: 'orc', spikes: true, skirt: { ramp: 'orc', len: 0.4 }, helm: { ramp: 'orc', kind: 'horns' } },
  };
  const WEAPONS = {
    sword:      { name: 'Sword', kind: 'blade', len: 14, hands: 1, speed: 1.0, cls: 'blade', dmg: 1.1 },
    scimitar:   { name: 'Scimitar', kind: 'curved', len: 14, hands: 1, speed: 1.0, cls: 'blade', dmg: 1.1 },
    waraxe:     { name: 'War axe', kind: 'axe', len: 11, hands: 1, speed: 0.9, cls: 'axe', dmg: 1.2 },
    mace:       { name: 'Mace', kind: 'mace', len: 11, hands: 1, speed: 0.85, cls: 'blunt', dmg: 1.25 },
    dagger:     { name: 'Dagger', kind: 'blade', len: 7, hands: 1, speed: 1.35, cls: 'dagger', dmg: 0.8 },
    greatsword: { name: 'Greatsword', kind: 'blade', len: 21, hands: 2, speed: 0.72, cls: 'blade', dmg: 1.9 },
    battleaxe:  { name: 'Battleaxe', kind: 'bigaxe', len: 19, hands: 2, speed: 0.7, cls: 'axe', dmg: 2.0 },
    warhammer:  { name: 'Warhammer', kind: 'hammer', len: 18, hands: 2, speed: 0.62, cls: 'blunt', dmg: 2.1 },
  };
  // People: a face and hair, plus gear.
  const PEOPLE = {
    kasim:    { skin: 'skin', hair: 'hair', beard: true },
    raider:   { skin: 'pale', hair: 'ginger', beard: true, hood: 'red', mask: 'red' },
    thug:     { skin: 'skin', hair: 'hair', beard: false, mask: 'red' },
    marauder: { skin: 'pale', hair: 'ginger', beard: true },
    chief:    { skin: 'skin', hair: 'hair', beard: true },
  };
  function lookOf(person, armour) {
    const a = ARMOUR[armour], h = PEOPLE[person];
    return { ...a, skin: h.skin, hair: h.hair, beard: h.beard && !(a.helm?.kind === 'closed'), hood: a.hood ?? (a.helm ? null : h.hood), mask: a.mask ?? (a.helm ? null : h.mask), sleeve: a.sleeve ?? h.skin };
  }

  // ---------- drawing a character ----------
  const SW = 96, SH = 96, OX = 48, OY = 80; // sprite cell, and where the feet stand in it
  const RIG = (() => { const k = 1.25, r = { thigh: 7.5, shin: 7, spine: 11, neck: 1.2, headR: 7, shW: 6.2, hipW: 3.2, upper: 6.5, fore: 6, foot: 2.6, thighT: 6, shinT: 5, upperT: 4.6, foreT: 4, chestMin: 12.5, waistMin: 10.5 };
    const o = Object.fromEntries(Object.entries(r).map(([a, v]) => [a, v * k])); o.k = k; return o; })();

  // cut: parts taken off (head, armR, armL). only: draw just that part (a severed piece). crushed: the head is pulp.
  function drawCharacter(look, wpn, pose, face, o = {}) {
    const R = RIG, g = rig(pose, R, face, wpn), p = new Px(SW, SH), S = (k) => [OX + g.proj[k][0], OY + g.proj[k][1]], Z = (k) => g.depth[k];
    const cut = o.cut || [], only = o.only || null, parts = [];
    const want = (grp) => (only ? grp === only : !cut.includes(grp));
    const push = (grp, z, draw) => { if (want(grp)) parts.push({ z, draw }); };
    const limbPart = (grp, a, b, t0, t1, ramp, opt) => push(grp, (Z(a) + Z(b)) / 2, () => { const [x0, y0] = S(a), [x1, y1] = S(b); rod(p, x0, y0, x1, y1, t0, t1, ramp, opt); });
    const metal = ['iron', 'steel', 'orc'].includes(look.top);
    const bootFn = (x, y, t, a, v) => (t > 0.55 ? tone(look.boots, v + (metal ? 0.05 : 0), x, y) : null);
    // legs
    limbPart('body', 'hipR', 'kneeR', R.thighT, R.shinT + 0.6, look.pants); limbPart('body', 'kneeR', 'footR', R.shinT, R.shinT - 0.5, look.pants, { fn: bootFn });
    limbPart('body', 'hipL', 'kneeL', R.thighT, R.shinT + 0.6, look.pants); limbPart('body', 'kneeL', 'footL', R.shinT, R.shinT - 0.5, look.pants, { fn: bootFn });
    limbPart('body', 'footR', 'toeR', 3.4, 3, look.boots); limbPart('body', 'footL', 'toeL', 3.4, 3, look.boots);
    // a skirt or tassets, from the waist down
    if (look.skirt) push('body', Z('chest') * 0.5 + Z('pelvis') * 0.5 - 0.1, () => { // over the torso's lower end
      const [px0, py0] = S('pelvis'), [k1x, k1y] = S('kneeR'), [k2x, k2y] = S('kneeL'), [hx, hy] = S('hipR'), [kx, ky] = S('hipL');
      const mx = (k1x + k2x) / 2, my = (k1y + k2y) / 2, ex = px0 + (mx - px0) * look.skirt.len * 2, ey = py0 + (my - py0) * look.skirt.len * 2;
      const w0 = Math.max(R.waistMin, Math.hypot(hx - kx, hy - ky) + 3), w1 = Math.max(w0 + 2, Math.hypot(k1x - k2x, k1y - k2y) + 5);
      rod(p, px0, py0, ex, ey, w0, w1 * (0.6 + look.skirt.len * 0.5), look.skirt.ramp, { fn: (x, y, t, a, v) => (t < 0.12 ? tone(look.belt, v - 0.05, x, y) : (x + (look.skirt.ramp === 'sand' ? 0 : y)) % 4 === 0 ? tone(look.skirt.ramp, v - 0.12, x, y) : null) });
    });
    // torso
    push('body', Z('chest') * 0.5 + Z('pelvis') * 0.5, () => {
      const [px0, py0] = S('pelvis'), [cx, cy] = S('chest'), [ax, ay] = S('shR'), [bx, by] = S('shL'), [hx, hy] = S('hipR'), [kx, ky] = S('hipL');
      const top = Math.max(R.chestMin, Math.hypot(ax - bx, ay - by) + 3), bottom = Math.max(R.waistMin, Math.hypot(hx - kx, hy - ky) + 3);
      rod(p, px0, py0 + 1, cx, cy - 1, bottom, top, look.top, { tex: look.pattern === 'shag' ? 0.3 : 0.08, fn: (x, y, t, a, v) => {
        if (t < 0.16) return look.belt === 'brass' ? ((x % 6 === 0) ? tone('brass', v + 0.1, x, y) : tone('leather', v - 0.05, x, y)) : tone(look.belt, v - 0.05, x, y);
        switch (look.pattern) {
          case 'studs': return (x + y * 2) % 5 === 0 && t > 0.2 ? tone('brass', v + 0.1, x, y) : null;
          case 'bands': return y % 4 === 0 ? tone(look.top, v - 0.2, x, y) : null;
          case 'plate': return Math.abs(a) < 0.15 && t > 0.3 ? tone(look.top, v + 0.15, x, y) : (t > 0.55 && t < 0.62 ? tone(look.top, v - 0.2, x, y) : null);
          case 'edges': return Math.abs(a) > 0.8 || (y % 6 === 0) ? tone('brass', v - 0.1, x, y) : null;
          case 'stitch': return (Math.abs(a) < 0.12 && y % 2 === 0) ? tone('leather', v - 0.15, x, y) : null;
          case 'shag': return hash(x, y, 9) < 0.18 ? tone('fur', v + 0.15, x, y) : null;
        }
        if (look.top === 'cream' && Math.abs(a) < 0.1 && t > 0.6) return tone('cream', v - 0.15, x, y);
        return null;
      } });
    });
    if (look.collar) push('body', Z('neck') - 0.3, () => { const [cx, cy] = S('neck'); blob(p, cx, cy + 1, R.chestMin / 2 + 1, 3, look.collar, { rough: 0.35, seed: 7, tex: 0.3 }); });
    // arms
    const foreFn = metal ? null : (x, y, t, a, v) => (t > 0.45 && look.fore !== look.sleeve && look.fore !== 'skin' && (y % 3 === 0) ? tone('boot', v, x, y) : null);
    limbPart('armR', 'shR', 'elR', R.upperT, R.foreT, look.sleeve); limbPart('armR', 'elR', 'haR', R.foreT, R.foreT - 0.4, look.fore, { fn: foreFn });
    limbPart('armL', 'shL', 'elL', R.upperT, R.foreT, look.sleeve); limbPart('armL', 'elL', 'haL', R.foreT, R.foreT - 0.4, look.fore, { fn: foreFn });
    const handRamp = metal ? look.fore : look.skin;
    push('armR', Z('haR') - 0.1, () => { const [x, y] = S('haR'); blob(p, x, y, 2, 2, handRamp, { tex: 0 }); });
    push('armL', Z('haL') - 0.1, () => { const [x, y] = S('haL'); blob(p, x, y, 1.9, 1.9, handRamp, { tex: 0 }); });
    if (look.pauldron) for (const [grp, sh] of [['armR', 'shR'], ['armL', 'shL']]) push(grp, Z(sh) - 0.4, () => {
      const [x, y] = S(sh); blob(p, x, y - 1, 4, 3.2, look.pauldron, { rough: look.pauldron === 'fur' ? 0.4 : 0, tex: look.pauldron === 'fur' ? 0.3 : 0.05, bias: 0.05 });
      if (look.spikes) rod(p, x, y - 3, x + (sh === 'shR' ? 2 : -2), y - 7, 1.6, 0.6, 'bone');
    });
    // the weapon goes with the right arm
    push('armR', (Z('wb') + Z('wt')) / 2 - 0.3, () => drawWeapon(p, wpn, S('wb'), S('haR'), S('wt'), S('wg')));
    // the head, or what is left of it
    if (o.crushed && !only) push('body', Z('head'), () => { const [x, y] = S('neck'); blob(p, x, y - 2, R.headR * 0.8, R.headR * 0.45, 'blood', { rough: 0.5, seed: 3, tex: 0.4, fn: (xx, yy, v) => (hash(xx, yy, 4) < 0.15 ? tone('bone', v + 0.2, xx, yy) : hash(xx, yy, 5) < 0.2 ? tone('meat', v, xx, yy) : null) }); });
    else push('head', Z('head'), () => drawHead(p, look, g, S('head'), R.headR));
    // stumps
    if (!only && cut.includes('head') && !o.crushed) push('body', Z('neck') - 0.5, () => { const [x, y] = S('neck'); blob(p, x, y - 1, 2.6, 1.8, 'meat', { tex: 0.2, fn: (xx, yy, v) => (hash(xx, yy, 6) < 0.3 ? tone('bone', v + 0.2, xx, yy) : null) }); });
    for (const [grp, sh] of [['armR', 'shR'], ['armL', 'shL']]) if (!only && cut.includes(grp)) push('body', Z(sh) - 0.5, () => { const [x, y] = S(sh); blob(p, x, y, 2.4, 2.4, 'meat', { tex: 0.2 }); });
    parts.sort((a, b) => b.z - a.z);
    for (const q of parts) q.draw();
    finish(p, 0.2);
    const pt = {}; for (const k of ['head', 'neck', 'shR', 'shL', 'chest', 'pelvis', 'haR']) pt[k] = S(k);
    return { canvas: p.canvas(), blade: [S('wg'), S('wt')], pt };
  }

  function drawWeapon(p, w, base, hand, tip, guard) {
    const dx = tip[0] - hand[0], dy = tip[1] - hand[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
    const at = (t, off = 0) => [hand[0] + dx * t + nx * off, hand[1] + dy * t + ny * off];
    const edge = (x, y, t, a, v) => (a < -0.2 ? tone('steel', v + 0.25, x, y) : null);
    switch (w.kind) {
      case 'blade': {
        rod(p, base[0], base[1], hand[0], hand[1], 1.7, 1.7, 'leather');
        rod(p, guard[0], guard[1], tip[0], tip[1], w.hands === 2 ? 2.6 : w.len < 9 ? 1.8 : 2.1, 1.1, 'steel', { bias: 0.15, tex: 0.02, fn: edge });
        const gw = w.hands === 2 ? 3.6 : w.len < 9 ? 1.8 : 2.8;
        rod(p, guard[0] - nx * gw, guard[1] - ny * gw, guard[0] + nx * gw, guard[1] + ny * gw, 1.6, 1.6, 'brass');
        blob(p, base[0], base[1], 1.3, 1.3, 'brass', { tex: 0 });
        break;
      }
      case 'curved': { // a scimitar: the blade bows out towards the tip
        rod(p, base[0], base[1], hand[0], hand[1], 1.7, 1.7, 'leather');
        let prev = guard;
        for (let i = 1; i <= 6; i++) { const t = i / 6, q = at(0.1 + t * 0.9, 3.2 * t * t); rod(p, prev[0], prev[1], q[0], q[1], 2.4 - t * 1.1, 2.4 - t * 1.2, 'steel', { bias: 0.15, tex: 0.02, fn: edge }); prev = q; }
        rod(p, guard[0] - nx * 2.4, guard[1] - ny * 2.4, guard[0] + nx * 2.4, guard[1] + ny * 2.4, 1.5, 1.5, 'brass');
        break;
      }
      case 'axe': case 'bigaxe': {
        rod(p, base[0], base[1], tip[0], tip[1], w.hands === 2 ? 2.2 : 1.9, w.hands === 2 ? 2.2 : 1.9, 'wood', { tex: 0.1 });
        const s = w.hands === 2 ? 1.45 : 1, [hx, hy] = at(0.86);
        poly(p, [[hx - ux * 2, hy - uy * 2], [hx + nx * 5.5 * s - ux * 4 * s, hy + ny * 5.5 * s - uy * 4 * s], [hx + nx * 6.5 * s + ux * 3.5 * s, hy + ny * 6.5 * s + uy * 3.5 * s], [hx + ux * 2.4, hy + uy * 2.4]],
          (x, y, u, v) => tone('steel', 0.66 - v * 0.25 + (hash(x, y, 5) < 0.1 ? -0.2 : 0), x, y));
        if (w.hands === 2) poly(p, [[hx - ux * 1.5, hy - uy * 1.5], [hx - nx * 4 - ux * 2, hy - ny * 4 - uy * 2], [hx - nx * 4 + ux * 2, hy - ny * 4 + uy * 2], [hx + ux * 1.5, hy + uy * 1.5]], (x, y, u, v) => tone('steel', 0.5 - v * 0.2, x, y));
        break;
      }
      case 'mace': {
        rod(p, base[0], base[1], tip[0], tip[1], 1.8, 1.8, 'iron', { tex: 0.04 });
        blob(p, tip[0], tip[1], 3.2, 3.2, 'iron', { tex: 0.05, bias: 0.1, fn: (x, y, v) => ((x + y) % 3 === 0 ? tone('iron', v - 0.25, x, y) : null) });
        break;
      }
      case 'hammer': {
        rod(p, base[0], base[1], tip[0], tip[1], 2.1, 2.1, 'wood', { tex: 0.1 });
        const [hx, hy] = at(0.95);
        poly(p, [[hx - nx * 5 - ux * 2.6, hy - ny * 5 - uy * 2.6], [hx + nx * 5 - ux * 2.6, hy + ny * 5 - uy * 2.6], [hx + nx * 5 + ux * 2.6, hy + ny * 5 + uy * 2.6], [hx - nx * 5 + ux * 2.6, hy - ny * 5 + uy * 2.6]],
          (x, y, u, v) => tone('iron', 0.62 - v * 0.3 + (u > 0.85 || u < 0.15 ? -0.15 : 0), x, y));
        break;
      }
    }
  }

  // The head: a sphere coloured by where each pixel faces on the body (hair on top and behind,
  // a beard, mask or helmet), with eyes where they face the viewer.
  function drawHead(p, look, g, [cx, cy], r) {
    const toViewer = [0, -CP, SP], up = [0, SP, CP];
    const back = (n) => rotX(rotZ(n, -g.face), -g.P.fall);
    const helm = look.helm;
    for (let y = Math.floor(cy - r - 2); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const nx = (x + 0.5 - cx) / r, ny = -(y + 0.5 - cy) / (r * 1.08), rr = nx * nx + ny * ny;
      if (rr > 1) continue;
      const nz = Math.sqrt(1 - rr), n = back(add(add([nx, 0, 0], up, ny), toViewer, nz)), v = (nx * L[0] + ny * L[1] + nz * L[2]) * 0.62 + 0.3;
      const fwd = n[1], upn = n[2], side = n[0];
      let ramp = look.skin, vv = v;
      if (look.hood) { if (fwd < 0.45 || upn > 0.38 || Math.abs(side) > 0.75) { ramp = look.hood; vv -= 0.05; } }
      else if (upn > 0.5 - Math.max(0, -fwd) * 1.0 || fwd < -0.3) ramp = look.hair;
      if (look.mask && fwd > 0.3 && upn < -0.15) { ramp = look.mask; vv -= 0.08; }
      if (look.beard && fwd > 0.35 && upn < -0.45) { ramp = look.hair; vv += 0.12; }
      if (helm) {
        const slit = fwd > 0.55 && upn > -0.05 && upn < 0.22;
        if (helm.kind === 'cap' && (upn > 0.25 || fwd < -0.1)) { ramp = helm.ramp; vv += 0.05; }
        if (helm.kind === 'nasal' && (upn > 0.2 || fwd < -0.2 || (fwd > 0.7 && Math.abs(side) < 0.12 && upn > -0.2))) { ramp = helm.ramp; vv += 0.1; }
        if (helm.kind === 'closed' || helm.kind === 'horns') { ramp = slit ? '#0b0907' : helm.ramp; vv += 0.1; if (!slit && fwd > 0.6 && Math.abs(side) < 0.08) vv += 0.2; }
      }
      p.set(x, y, ramp.startsWith('#') ? ramp : tone(ramp, vv, x, y));
    }
    if (helm?.kind === 'horns') for (const s of [-1, 1]) {
      const a = rotZ(rotX([s * 0.8, 0.1, 0.55], g.P.fall), g.face), b = rotZ(rotX([s * 1.35, 0.2, 1.1], g.P.fall), g.face);
      const P2 = (q) => [cx + q[0] * r, cy - (q[1] * SP + q[2] * CP) * r];
      const [x0, y0] = P2(a), [x1, y1] = P2(b); rod(p, x0, y0, x1, y1, 2.4, 0.8, 'bone');
    }
    if (helm && helm.kind !== 'cap') return; // eyes are in the shadow of the helmet
    for (const s of [-1, 1]) {
      const ew = rotZ(rotX([s * 0.36, 0.86, 0.12], g.P.fall), g.face);
      if (dot3(ew, toViewer) < 0.25) continue;
      p.set(Math.floor(cx + ew[0] * r * 0.92), Math.floor(cy - (ew[1] * SP + ew[2] * CP) * r * 0.92 * 1.08), '#0b0605');
    }
  }

  // ---------- animations ----------
  // Each frame is held for d ms. hit: the blow lands. smear: draw the blade's arc. glow: an enemy's tell.
  const walk = (n, d, amp, knee, lean) => Array.from({ length: n }, (_, i) => {
    const ph = (i / n) * 2 * Math.PI, s = Math.sin(ph), c = Math.cos(ph);
    return { d, pose: { lRp: amp * s, lLp: -amp * s, lRk: 0.12 + knee * Math.max(0, c), lLk: 0.12 + knee * Math.max(0, -c), lRr: 0.05, lLr: 0.05, lean, tw: 0.12 * s,
      aLp: -0.5 * amp * s + 0.1, aLe: 0.3 + knee * 0.3, aLr: 0.12, aRp: 0.7 + 0.08 * s, wp: 35 + 4 * c } };
  });
  const ANIMS = {
    idle: { loop: true, frames: [0, 1, 2, 1].map((k) => ({ d: 260, pose: { lRk: 0.2 + k * 0.05, lLk: 0.1 + k * 0.05, aRe: 0.7 + k * 0.04, wp: 40 - k * 2 } })) },
    walk: { loop: true, frames: walk(8, 95, 0.42, 0.55, 0.08) },
    run: { loop: true, frames: walk(8, 70, 0.75, 1.0, 0.28) },
    slash1: { attack: true, frames: [
      { d: 60, pose: { tw: -0.55, lean: -0.05, aRp: 1.15, aRr: 0.95, aRe: 0.9, wy: 115, wp: 25, lRp: -0.25, lLp: 0.35, lLk: 0.25 } },
      { d: 45, pose: { tw: -0.7, lean: -0.08, aRp: 1.2, aRr: 1.1, aRe: 0.95, wy: 140, wp: 25, lRp: -0.3, lLp: 0.4, lLk: 0.3 } },
      { d: 35, smear: true, hit: true, pose: { tw: 0.15, lean: 0.15, aRp: 1.5, aRr: 0.25, aRe: 0.05, wy: 0, wp: 5, lRp: -0.35, lLp: 0.45, lLk: 0.35 } },
      { d: 50, smear: true, pose: { tw: 0.6, lean: 0.2, aRp: 1.3, aRr: -0.5, aRe: 0.2, wy: -110, wp: -15, lRp: -0.35, lLp: 0.45, lLk: 0.4 } },
      { d: 90, pose: { tw: 0.65, lean: 0.18, aRp: 1.1, aRr: -0.6, aRe: 0.3, wy: -130, wp: -30, lRp: -0.3, lLp: 0.4, lLk: 0.35 } },
      { d: 110, pose: { tw: 0.35, lean: 0.1, aRp: 0.9, aRr: -0.2, aRe: 0.5, wy: -50, wp: 10 } },
    ] },
    slash2: { attack: true, frames: [
      { d: 50, pose: { tw: 0.7, lean: 0.05, aRp: 1.2, aRr: -0.65, aRe: 0.6, wy: -140, wp: 20, lRp: 0.35, lLp: -0.2, lRk: 0.3 } },
      { d: 35, smear: true, hit: true, pose: { tw: -0.1, lean: 0.15, aRp: 1.45, aRr: 0.2, aRe: 0.05, wy: 10, wp: 5, lRp: 0.45, lLp: -0.3, lRk: 0.35 } },
      { d: 50, smear: true, pose: { tw: -0.55, lean: 0.18, aRp: 1.25, aRr: 1.0, aRe: 0.15, wy: 120, wp: -10, lRp: 0.45, lLp: -0.3, lRk: 0.4 } },
      { d: 90, pose: { tw: -0.6, lean: 0.15, aRp: 1.0, aRr: 1.1, aRe: 0.3, wy: 135, wp: -25 } },
      { d: 110, pose: { tw: -0.2, lean: 0.08, aRp: 0.85, aRr: 0.5, aRe: 0.6, wy: 60, wp: 20 } },
    ] },
    chop: { attack: true, frames: [
      { d: 70, pose: { tw: -0.25, lean: -0.15, aRp: 2.6, aRr: 0.2, aRe: 0.5, aLp: 2.2, aLr: 0.1, aLe: 0.6, wy: 0, wp: 125, lRp: -0.2, lLp: 0.35 } },
      { d: 60, pose: { tw: -0.3, lean: -0.2, aRp: 2.9, aRr: 0.15, aRe: 0.6, aLp: 2.5, aLe: 0.7, wy: 0, wp: 140, lRp: -0.25, lLp: 0.4, lLk: 0.3 } },
      { d: 35, smear: true, hit: true, pose: { tw: 0.1, lean: 0.3, aRp: 1.7, aRr: 0.1, aRe: 0.0, aLp: 1.4, aLe: 0.3, wy: 0, wp: 10, lRp: -0.4, lLp: 0.5, lLk: 0.55, lRk: 0.3 } },
      { d: 60, smear: true, pose: { tw: 0.15, lean: 0.4, aRp: 1.0, aRr: 0.1, aRe: 0.0, aLp: 0.9, aLe: 0.3, wy: 0, wp: -45, lRp: -0.4, lLp: 0.55, lLk: 0.65, lRk: 0.4 } },
      { d: 140, pose: { tw: 0.1, lean: 0.35, aRp: 0.95, aRe: 0.1, aLp: 0.8, wy: 0, wp: -50, lRp: -0.35, lLp: 0.5, lLk: 0.6, lRk: 0.35 } },
      { d: 120, pose: { lean: 0.15, aRp: 0.85, aRe: 0.4, wy: 5, wp: 0 } },
    ] },
    power: { attack: true, frames: [
      { d: 90, pose: { tw: -0.8, lean: -0.1, aRp: 1.4, aRr: 1.2, aRe: 1.2, aLp: 1.0, aLe: 0.8, wy: 150, wp: 45, lRp: -0.35, lLp: 0.45, lLk: 0.45, lRk: 0.4 } },
      { d: 160, charge: true, pose: { tw: -1.0, lean: -0.15, aRp: 1.6, aRr: 1.3, aRe: 1.3, aLp: 1.2, aLe: 0.9, wy: 165, wp: 60, lRp: -0.4, lLp: 0.5, lLk: 0.55, lRk: 0.5 } },
      { d: 35, smear: true, hit: true, pose: { tw: 0.3, lean: 0.3, aRp: 1.55, aRr: 0.1, aRe: 0.0, aLp: 1.0, aLe: 0.4, wy: -10, wp: 0, lRp: -0.45, lLp: 0.6, lLk: 0.6, lRk: 0.3 } },
      { d: 50, smear: true, pose: { tw: 0.9, lean: 0.35, aRp: 1.2, aRr: -0.7, aRe: 0.1, wy: -140, wp: -20, lRp: -0.45, lLp: 0.6, lLk: 0.6 } },
      { d: 180, pose: { tw: 0.95, lean: 0.3, aRp: 1.0, aRr: -0.75, aRe: 0.3, wy: -150, wp: -35, lRp: -0.4, lLp: 0.55, lLk: 0.55 } },
      { d: 140, pose: { tw: 0.4, lean: 0.12, aRp: 0.85, aRr: -0.2, aRe: 0.5, wy: -40, wp: 15 } },
    ] },
    // For the armoury: the weapon held out to the side, so its shape shows.
    show: { frames: [{ d: 1000, pose: { tw: 0.1, aRp: 1.45, aRr: 0.1, aRe: 0.05, wy: 0, wp: 25 } }] },
    block: { loop: true, frames: [{ d: 1000, pose: { tw: 0.25, lean: 0.08, aRp: 1.25, aRr: -0.1, aRe: 1.15, wy: -80, wp: 22, aLp: 0.9, aLe: 1.5, lRk: 0.35, lLk: 0.3, lLp: 0.15 } }] },
    dodge: { frames: [
      { d: 50, pose: { lean: 0.5, lRp: 0.5, lLp: -0.4, lRk: 0.9, lLk: 0.7, aRp: 0.3, aRe: 0.3, aLp: -0.3, wy: 40, wp: -20 } },
      { d: 170, pose: { lean: 0.6, lRp: 0.7, lLp: -0.6, lRk: 1.2, lLk: 0.9, aRp: 0.1, aRe: 0.4, aLp: -0.5, wy: 60, wp: -30 } },
      { d: 110, pose: { lean: 0.25, lRp: 0.3, lLp: -0.2, lRk: 0.6, lLk: 0.4 } },
    ] },
    hit: { frames: [
      { d: 70, pose: { lean: -0.35, tw: -0.35, aLp: 0.9, aLr: 0.8, aLe: 0.2, aRp: 0.5, aRr: 0.6, wy: 60, wp: 10, lRk: 0.3, free: true } },
      { d: 100, pose: { lean: -0.25, tw: -0.2, aLp: 0.6, aLr: 0.5, aRp: 0.55, aRr: 0.4, wy: 40, wp: 20, lRk: 0.3, free: true } },
      { d: 120, pose: { lean: -0.08, tw: 0.05 } },
    ] },
    // Staggered: doubled over, guard down, open to a finisher.
    stagger: { hold: true, frames: [
      { d: 80, pose: { lean: -0.3, tw: -0.3, aLp: 0.8, aLr: 0.7, aRp: 0.4, aRr: 0.6, wy: 70, wp: -20, lRk: 0.4, free: true } },
      { d: 99999, pose: { lean: 0.55, tw: 0.2, aLp: 0.5, aLe: 0.9, aRp: 0.25, aRr: 0.3, aRe: 0.3, wy: 60, wp: -60, lRp: 0.35, lRk: 0.75, lLp: -0.1, lLk: 0.5, free: true } },
    ] },
    kneel: { hold: true, frames: [
      { d: 120, pose: { lean: 0.4, lRp: 0.9, lRk: 1.0, lLp: -0.05, lLk: 1.2, aRp: 0.2, aRe: 0.2, aLp: 0.3, aLe: 0.4, wy: 90, wp: -70, free: true } },
      { d: 99999, pose: { lean: 0.5, lRp: 1.45, lRk: 1.5, lLp: -0.05, lLk: 1.75, aRp: 0.1, aRr: 0.3, aRe: 0.2, aLp: 0.15, aLe: 0.3, wy: 90, wp: -80, free: true } },
    ] },
    clutch: { hold: true, frames: [
      { d: 99999, pose: { lean: -0.25, tw: 0.1, aRp: 1.9, aRr: -0.5, aRe: 1.9, aLp: 1.9, aLr: -0.5, aLe: 1.9, wy: 100, wp: -60, lRk: 0.4, lLk: 0.3, free: true } },
    ] },
    death: { hold: true, frames: [
      { d: 90, pose: { lean: -0.35, tw: -0.4, aLp: 1.0, aLr: 0.9, aRp: 0.6, aRr: 0.9, wy: 80, wp: 0, lRk: 0.4, lLk: 0.3, free: true } },
      { d: 90, pose: { fall: 0.45, lean: -0.2, tw: -0.3, aLp: 1.6, aLr: 1.0, aRp: 1.4, aRr: 1.1, wy: 90, wp: 30, lRk: 0.8, lLk: 0.6, lRp: 0.5, lLp: 0.3, free: true } },
      { d: 80, pose: { fall: 1.0, lean: 0, aLp: 2.2, aLr: 1.0, aRp: 2.0, aRr: 1.2, wy: 100, wp: 60, lRk: 0.7, lLk: 0.5, lRp: 0.5, lLp: 0.35, free: true } },
      { d: 70, pose: { fall: 1.5, lean: 0.1, aLp: 2.6, aLr: 1.1, aRp: 2.4, aRr: 1.3, wy: 110, wp: 80, lRk: 0.4, lLk: 0.3, lRp: 0.3, lLp: 0.2, free: true } },
      { d: 90, pose: { fall: 1.42, lean: 0.12, aLp: 2.7, aLr: 1.2, aRp: 2.5, aRr: 1.35, wy: 110, wp: 85, lRk: 0.3, lLk: 0.2, lRp: 0.25, lLp: 0.15, free: true } },
      { d: 99999, pose: { fall: 1.57, lean: 0.1, aLp: 2.8, aLr: 1.2, aRp: 2.6, aRr: 1.4, wy: 110, wp: 88, lRk: 0.25, lLk: 0.15, lRp: 0.2, lLp: 0.1, free: true } },
    ] },
    // Finishers (bible 11.3): one per weapon class. The victim kneels, or is held for the dagger.
    fin_behead: { frames: [
      { d: 110, pose: { tw: -0.8, lean: -0.1, aRp: 1.3, aRr: 1.2, aRe: 1.0, wy: 150, wp: 15, lRp: -0.3, lLp: 0.45, lLk: 0.35, lRk: 0.3 } },
      { d: 260, slow: true, pose: { tw: -0.95, lean: -0.12, aRp: 1.35, aRr: 1.3, aRe: 1.05, wy: 165, wp: 10, lRp: -0.35, lLp: 0.5, lLk: 0.45, lRk: 0.35 } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.2, lean: 0.2, aRp: 1.45, aRr: 0.2, aRe: 0.0, wy: 0, wp: -12, lRp: -0.4, lLp: 0.55, lLk: 0.5, lRk: 0.4 } },
      { d: 60, smear: true, pose: { tw: 0.9, lean: 0.25, aRp: 1.25, aRr: -0.8, aRe: 0.1, wy: -140, wp: -20, lRp: -0.4, lLp: 0.55, lLk: 0.5, lRk: 0.4 } },
      { d: 600, pose: { tw: 0.95, lean: 0.2, aRp: 1.0, aRr: -0.85, aRe: 0.2, wy: -155, wp: -40, lRp: -0.35, lLp: 0.5, lLk: 0.45 } },
      { d: 200, pose: { tw: 0.3, lean: 0.08, aRp: 0.8, aRr: -0.2, aRe: 0.5, wy: -30, wp: 20 } },
    ] },
    fin_cleave: { frames: [
      { d: 120, pose: { tw: -0.4, lean: -0.2, aRp: 2.8, aRr: 0.5, aRe: 0.6, aLp: 2.4, aLe: 0.7, wy: 30, wp: 135, lRp: -0.25, lLp: 0.45, lLk: 0.35 } },
      { d: 260, slow: true, pose: { tw: -0.5, lean: -0.25, aRp: 3.0, aRr: 0.55, aRe: 0.7, aLp: 2.6, aLe: 0.8, wy: 35, wp: 150, lRp: -0.3, lLp: 0.5, lLk: 0.45 } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.2, lean: 0.4, aRp: 1.6, aRr: 0.2, aRe: 0.0, aLp: 1.3, aLe: 0.3, wy: -20, wp: 5, lRp: -0.45, lLp: 0.6, lLk: 0.7, lRk: 0.45 } },
      { d: 70, smear: true, pose: { tw: 0.35, lean: 0.5, aRp: 0.9, aRr: 0.1, aRe: 0.0, aLp: 0.8, aLe: 0.3, wy: -40, wp: -50, lRp: -0.45, lLp: 0.65, lLk: 0.8, lRk: 0.5 } },
      { d: 600, pose: { tw: 0.3, lean: 0.45, aRp: 0.85, aRe: 0.1, aLp: 0.75, wy: -40, wp: -55, lRp: -0.4, lLp: 0.6, lLk: 0.75, lRk: 0.45 } },
      { d: 220, pose: { lean: 0.15, aRp: 0.85, aRe: 0.4, wy: 5, wp: 10 } },
    ] },
    fin_crush: { frames: [
      { d: 130, pose: { tw: -0.15, lean: -0.25, aRp: 2.9, aRr: 0.15, aRe: 0.4, aLp: 2.6, aLe: 0.5, wy: 0, wp: 150, lRp: -0.25, lLp: 0.45 } },
      { d: 280, slow: true, pose: { tw: -0.2, lean: -0.32, aRp: 3.1, aRr: 0.1, aRe: 0.5, aLp: 2.8, aLe: 0.6, wy: 0, wp: 165, lRp: -0.3, lLp: 0.5, lLk: 0.4 } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.05, lean: 0.45, aRp: 1.5, aRr: 0.05, aRe: 0.0, aLp: 1.3, aLe: 0.2, wy: 0, wp: -10, lRp: -0.5, lLp: 0.6, lLk: 0.8, lRk: 0.55 } },
      { d: 70, pose: { tw: 0.05, lean: 0.55, aRp: 1.1, aRe: 0.0, aLp: 1.0, aLe: 0.2, wy: 0, wp: -55, lRp: -0.5, lLp: 0.65, lLk: 0.9, lRk: 0.6 } },
      { d: 600, pose: { tw: 0.05, lean: 0.5, aRp: 1.05, aRe: 0.05, aLp: 0.95, wy: 0, wp: -60, lRp: -0.45, lLp: 0.6, lLk: 0.85, lRk: 0.55 } },
      { d: 220, pose: { lean: 0.15, aRp: 0.85, aRe: 0.4, wy: 5, wp: 10 } },
    ] },
    fin_throat: { frames: [
      { d: 90, pose: { tw: 0.3, lean: 0.25, aLp: 1.6, aLr: -0.2, aLe: 0.2, aRp: 1.4, aRr: 1.1, aRe: 1.3, wy: 120, wp: 0, lRp: -0.2, lLp: 0.45, lLk: 0.3 } },
      { d: 280, slow: true, pose: { tw: 0.35, lean: 0.3, aLp: 1.7, aLr: -0.25, aLe: 0.15, aRp: 1.5, aRr: 1.2, aRe: 1.4, wy: 135, wp: 0, lRp: -0.25, lLp: 0.5, lLk: 0.35 } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.5, lean: 0.3, aLp: 1.7, aLr: -0.25, aLe: 0.15, aRp: 1.6, aRr: -0.2, aRe: 0.6, wy: -60, wp: 0, lRp: -0.25, lLp: 0.5, lLk: 0.35 } },
      { d: 60, smear: true, pose: { tw: 0.7, lean: 0.25, aLp: 1.4, aLr: -0.2, aLe: 0.3, aRp: 1.4, aRr: -0.7, aRe: 0.5, wy: -130, wp: -10 } },
      { d: 650, pose: { tw: 0.5, lean: 0.12, aLp: 0.6, aLe: 0.4, aRp: 0.9, aRr: -0.5, aRe: 0.5, wy: -100, wp: -20 } },
      { d: 200, pose: { tw: 0.2, lean: 0.05 } },
    ] },
  };
  // The bandits hold their wind-up, glowing, so it can be read and parried.
  ANIMS.enemySlash = { attack: true, frames: ANIMS.slash1.frames.map((f, i) => (i === 1 ? { ...f, d: 380, glow: true } : f)) };
  ANIMS.enemyChop = { attack: true, frames: ANIMS.chop.frames.map((f, i) => (i === 1 ? { ...f, d: 480, glow: true } : f)) };
  const COMBO = ['slash1', 'slash2', 'chop'];
  const FINISHER = { blade: 'behead', axe: 'cleave', blunt: 'crush', dagger: 'throat' };

  // ---------- frames, cached ----------
  const cache = new Map();
  function frameOf(f, anim = f.anim, i = f.fi, face = f.face, extra = {}) {
    const cut = extra.cut ?? f.cut, crushed = extra.crushed ?? f.crushed, only = extra.only ?? null;
    const key = `${f.person}|${f.armour}|${f.weapon}|${anim}|${i}|${face.toFixed(3)}|${cut.join(',')}|${crushed ? 1 : 0}|${only}`;
    let r = cache.get(key);
    if (!r) {
      if (cache.size > 6000) cache.clear();
      r = drawCharacter(lookOf(f.person, f.armour), WEAPONS[f.weapon], ANIMS[anim].frames[i].pose, face, { cut, crushed, only });
      cache.set(key, r);
    }
    return r;
  }
  // Crop a piece to what is drawn in it, so it spins about its own middle.
  function crop(c) {
    const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < 0) return null;
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, -x0, -y0);
    return { canvas: o, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2 };
  }
  const faceOf = (dx, dy) => { const a = Math.atan2(-dx, -dy), step = Math.PI / 2; return Math.round(a / step) * step; };
  const fwd = (f) => [-Math.sin(f.face), -Math.cos(f.face)];

  // ---------- the camp ----------
  const W = 320, H = 190, WW = 600, WH = 400;
  const CAMP = { x: 320, y: 200, rx: 200, ry: 128 };
  const inCamp = (x, y, k = 1) => ((x - CAMP.x) / (CAMP.rx * k)) ** 2 + ((y - CAMP.y) / (CAMP.ry * k)) ** 2 < 1;
  const FIRE = { x: 320, y: 206 };
  let props = [], lights = [], ground;
  function buildCamp() {
    props = []; lights = [];
    const p = new Px(WW, WH);
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
      const n = fbm(x * 0.04, y * 0.04, 11), m = fbm(x * 0.25, y * 0.25, 12, 2);
      const e = ((x - CAMP.x) / CAMP.rx) ** 2 + ((y - CAMP.y) / CAMP.ry) ** 2 + 0.35 * (fbm(x * 0.06, y * 0.06, 19) - 0.5);
      // A track leaves the camp to the south west.
      const track = Math.abs((y - 300) - (x - 150) * -0.55 - 10 * Math.sin(x * 0.03)) < 13 + 4 * (fbm(x * 0.1, y * 0.1, 13) - 0.5) * 2 && y > 240;
      const ash = Math.hypot(x - FIRE.x, (y - FIRE.y) * 1.4);
      if (ash < 22) p.set(x, y, tone('stone', 0.18 + 0.2 * m + (ash < 12 ? -0.08 : 0) + (hash(x, y, 3) < 0.05 ? 0.15 : 0), x, y));
      else if (e < 0.9 || track) p.set(x, y, tone('dirt', 0.44 + 0.25 * (n - 0.5) + 0.2 * (m - 0.5) + (hash(x, y, 14) < 0.04 ? 0.2 : 0) - (e > 0.75 && e < 0.9 ? (e - 0.75) * 0.5 : 0), x, y));
      else p.set(x, y, tone('grass', 0.42 + 0.35 * (n - 0.5) + 0.2 * (m - 0.5) + (hash(x, y, 15) < 0.05 ? 0.22 : 0) - (e < 1.15 ? 0.08 : 0), x, y));
    }
    for (let k = 0; k < 500; k++) { const x = Math.floor(hash(k, 1, 16) * WW), y = Math.floor(hash(k, 2, 16) * WH); if (inCamp(x, y, 0.95)) continue; for (let j = 0; j < 3; j++) p.set(x + j - 1, y - (j === 1 ? 2 : 1), tone('grass', 0.75, x + j, y)); }
    // Bedrolls and scattered bones lie flat on the ground.
    for (const [bx, by, ramp] of [[262, 186, 'red'], [374, 178, 'fur'], [352, 246, 'canvas']]) {
      for (let y = 0; y < 9; y++) for (let x = 0; x < 22; x++) { const X = bx + x - 11, Y = by + y - 4; if ((x < 2 || x > 19) && (y < 2 || y > 6)) continue; p.set(X, Y, tone(ramp, 0.55 - y * 0.03 + (x === 5 ? -0.2 : 0) + 0.1 * (fbm(X * 0.4, Y * 0.4, 4) - 0.5), X, Y)); }
    }
    for (let k = 0; k < 9; k++) { const x = 200 + hash(k, 7, 8) * 240, y = 140 + hash(k, 8, 8) * 130; rodPx(p, x, y, x + 4 + hash(k, 9, 8) * 3, y + 1, 1.4, 'bone'); }
    ground = p.canvas();

    // The palisade: sharpened stakes round the back of the camp, open to the south.
    for (let a = 158; a <= 382; a += 2.6) {
      const r = a * D, x = CAMP.x + Math.cos(r) * (CAMP.rx + 6), y = CAMP.y + Math.sin(r) * (CAMP.ry + 4);
      const seed = Math.floor(a * 10), hgt = 24 + hash(seed, 1, 2) * 8;
      props.push(sprite(`stake${seed % 5}`, () => stake(hgt, seed % 5), x, y, [[x, y, 3.5]]));
    }
    // Tents, the fire, stores, a weapon rack, a warning at the gap, trees outside.
    for (const [tx, ty] of [[250, 140], [395, 132]]) props.push(sprite('tent', tent, tx, ty, [[tx - 12, ty - 4, 10], [tx + 12, ty - 4, 10], [tx, ty - 10, 10]]));
    props.push(sprite('chiefTent', () => tent(1.35), 322, 100, [[302, 92, 13], [342, 92, 13], [322, 84, 13]]));
    props.push({ x: FIRE.x, y: FIRE.y, solid: [[FIRE.x, FIRE.y, 9]], anim: fireFrames(), ox: 16, oy: 26 });
    lights.push({ x: FIRE.x, y: FIRE.y - 6, r: 110, c: [255, 150, 60], a: 0.42, flicker: 1 });
    for (const [x, y] of [[300, 190], [342, 194]]) props.push(sprite('log', logSeat, x, y, [[x - 6, y, 4], [x + 6, y, 4]]));
    for (const [x, y, kind] of [[452, 232, 'crate'], [466, 222, 'barrel'], [440, 246, 'barrel'], [470, 246, 'crate'], [205, 250, 'crate'], [186, 236, 'barrel']])
      props.push(sprite(kind, kind === 'crate' ? crate : barrel, x, y, [[x, y - 2, 7]]));
    props.push(sprite('rack', rack, 214, 210, [[200, 208, 5], [214, 208, 5], [228, 208, 5]]));
    for (const [x, y] of [[162, 280], [204, 298]]) { props.push(sprite('pike', pike, x, y, [[x, y, 3]])); }
    for (const [x, y] of [[148, 298], [216, 280], [264, 96], [380, 96]]) { props.push(sprite('torch', torchPost, x, y, [[x, y, 3]], torchFrames())); lights.push({ x, y: y - 26, r: 48, c: [255, 170, 80], a: 0.32, flicker: 1.6 }); }
    const trees = [[40, 60], [90, 30], [70, 150], [30, 250], [560, 60], [520, 30], [575, 170], [545, 300], [480, 370], [60, 360], [130, 380], [580, 390], [600, 250]];
    for (const [x, y] of trees) props.push(sprite(`tree${(x + y) % 3}`, () => tree((x + y) % 3), x, y, [[x, y - 2, 6]]));
    for (const [x, y] of [[420, 330], [500, 280], [110, 220]]) props.push(sprite('rock', rock, x, y, [[x, y - 2, 8]]));
  }
  function rodPx(p, x0, y0, x1, y1, th, ramp) { rod(p, x0, y0, x1, y1, th, th, ramp); }
  const spriteCache = {};
  function sprite(key, make, x, y, solid, anim) {
    const s = spriteCache[key] || (spriteCache[key] = make());
    return { x, y, solid, canvas: s.canvas, ox: s.ox, oy: s.oy, anim };
  }
  const done = (p, ox, oy) => ({ canvas: finish(p, 0.28).canvas(), ox, oy });
  function stake(hgt, v) {
    const p = new Px(12, 40), base = 38, top = base - hgt;
    rod(p, 6, base, 6, top + 4, 5.5, 5, 'wood', { tex: 0.2, seed: v, fn: (x, y, t, a, val) => (hash(x, y, v) < 0.12 ? tone('wood', val - 0.2, x, y) : null) });
    poly(p, [[3.3, top + 5], [8.7, top + 5], [6.2 + (v % 2 ? 0.6 : -0.4), top - 1]], (x, y, u, vv) => tone('wood', 0.65 - u * 0.3 + vv * 0.1, x, y));
    if (v === 2) for (let y = base - 10; y < base - 7; y++) for (let x = 3; x < 9; x++) p.set(x, y, tone('leather', 0.3, x, y)); // a lashing
    return done(p, 6, 38);
  }
  function tent(k = 1) {
    const w = Math.round(64 * k), h = Math.round(50 * k), p = new Px(w, h), cx = w / 2, ap = 8 * k, base = h - 4, hw = 21 * k, back = 16 * k;
    // Ridge runs away from the viewer: two roof slopes going back, the front gable facing us.
    poly(p, [[cx, ap], [cx, ap - back * 0.55], [cx - hw, base - back * 0.6], [cx - hw, base]], (x, y, u, v) => tone('canvas', 0.62 - u * 0.05 + v * 0.05 + ((x + Math.round(y * 0.4)) % 7 === 0 ? -0.1 : 0) + 0.1 * (fbm(x * 0.3, y * 0.3, 61) - 0.5), x, y));
    poly(p, [[cx, ap], [cx, ap - back * 0.55], [cx + hw, base - back * 0.6], [cx + hw, base]], (x, y, u, v) => tone('canvas', 0.36 + u * 0.04 + ((x - Math.round(y * 0.4)) % 7 === 0 ? -0.08 : 0) + 0.1 * (fbm(x * 0.3, y * 0.3, 62) - 0.5), x, y));
    poly(p, [[cx, ap], [cx + hw, base], [cx - hw, base]], (x, y, u, v) => tone('canvas', 0.5 - v * 0.08 + (hash(x, y, 63) < 0.05 ? -0.1 : 0), x, y));
    poly(p, [[cx, ap + 9 * k], [cx + 9 * k, base], [cx - 9 * k, base]], () => '#120d08');
    poly(p, [[cx, ap + 9 * k], [cx - 9 * k, base], [cx - 13 * k, base], [cx - 1, ap + 7 * k]], (x, y) => tone('canvas', 0.62, x, y)); // a flap tied back
    rod(p, cx, ap - back * 0.55, cx, ap - 1, 2, 2, 'wood');
    if (k > 1) for (let i = 0; i < 3; i++) p.set(cx - 2 + i * 2, ap + 3, tone('red', 0.6, cx, ap)); // the chief's tent has a red mark
    return done(p, cx, base);
  }
  function crate() {
    const p = new Px(20, 22);
    for (let y = 0; y < 18; y++) for (let x = 0; x < 16; x++) { const top = y < 8, X = x + 2, Y = y + 2, plank = (top ? x : y) % 5 === 0;
      p.set(X, Y, tone('wood', (top ? 0.64 - y * 0.02 : 0.38 - (y - 8) * 0.02) + (plank ? -0.18 : 0) + 0.12 * (fbm(X * 0.4, Y * 0.4, 21) - 0.5), X, Y)); }
    return done(p, 10, 20);
  }
  function barrel() {
    const p = new Px(16, 22);
    rod(p, 8, 19, 8, 8, 11, 11, 'wood', { tex: 0.1, fn: (x, y, t, a, v) => (y === 10 || y === 16 ? tone('iron', v - 0.05, x, y) : null) });
    blob(p, 8, 6, 5.5, 3, 'wood', { bias: 0.15, tex: 0.1, fn: (x, y, v) => (Math.hypot(x - 7.5, (y - 5.5) * 1.8) > 4.2 ? tone('iron', v - 0.1, x, y) : null) });
    return done(p, 8, 20);
  }
  function logSeat() { const p = new Px(28, 12); rod(p, 3, 7, 25, 7, 7, 7, 'wood', { tex: 0.18, fn: (x, y, t, a, v) => (t < 0.03 || t > 0.97 ? tone('hide', v + 0.1, x, y) : null) }); return done(p, 14, 10); }
  function rack() {
    const p = new Px(40, 32);
    for (const x of [6, 34]) rod(p, x, 30, x, 8, 2.6, 2.6, 'wood');
    rod(p, 5, 11, 35, 11, 2.2, 2.2, 'wood');
    for (const [x, kind] of [[12, 'spear'], [19, 'axe'], [27, 'spear']]) {
      rod(p, x - 2, 30, x + 1, 4, 1.4, 1.4, 'wood');
      if (kind === 'spear') poly(p, [[x, 0], [x + 2.2, 5], [x - 0.2, 5]], (xx, y) => tone('steel', 0.7, xx, y));
      else poly(p, [[x + 1, 5], [x + 6, 3], [x + 6, 10], [x + 1, 8]], (xx, y, u, v) => tone('steel', 0.65 - v * 0.2, xx, y));
    }
    return done(p, 20, 30);
  }
  function pike() {
    const p = new Px(14, 46);
    rod(p, 7, 44, 7, 10, 1.8, 1.4, 'wood');
    blob(p, 7, 8, 4.5, 4.2, 'bone', { tex: 0.12, bias: 0.05 });
    for (const x of [5, 9]) { p.set(x, 8, '#0d0a07'); p.set(x, 9, '#0d0a07'); }
    p.set(7, 11, '#2a2015'); for (let x = 5; x < 10; x++) p.set(x, 12, x % 2 ? '#e2d9bb' : '#433a2b');
    for (let y = 13; y < 22; y++) if (hash(y, 1, 77) < 0.6) p.set(7 + (y % 2), y, tone('blood', 0.4, 7, y));
    return done(p, 7, 44);
  }
  function torchPost() { const p = new Px(10, 34); rod(p, 5, 32, 5, 8, 2.2, 2.2, 'wood'); blob(p, 5, 8, 2.4, 2, 'leather', { tex: 0.1 }); return done(p, 5, 32); }
  function flame(w, h, t, seed) {
    const p = new Px(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = (x + 0.5 - w / 2) / (w / 2), v = 1 - (y + 0.5) / h;
      const n = fbm(x * 0.35, y * 0.3 + t * 2.2, seed, 2), shape = 1 - Math.abs(u) * (1.1 + v * 1.4) - v * 0.85 + (n - 0.5) * 0.9;
      if (shape <= 0) continue;
      p.set(x, y, tone('fire', clamp(shape * 1.6 + 0.15, 0, 0.999), x, y));
    }
    return p.canvas();
  }
  function fireFrames() {
    const base = new Px(32, 30);
    for (let k = 0; k < 9; k++) { const a = (k / 9) * 2 * Math.PI; blob(base, 16 + Math.cos(a) * 11, 22 + Math.sin(a) * 4.5, 3, 2.3, 'stone', { tex: 0.2, seed: k }); }
    rod(base, 9, 22, 23, 19, 3, 3, 'wood'); rod(base, 10, 19, 22, 23, 3, 3, 'wood', { bias: -0.1 });
    const stones = finish(base, 0.3).canvas();
    return Array.from({ length: 6 }, (_, i) => { const c = document.createElement('canvas'); c.width = 32; c.height = 30; const g = c.getContext('2d'); g.drawImage(stones, 0, 0); g.drawImage(flame(16, 20, i * 0.6, 91), 8, 2); return c; });
  }
  function torchFrames() {
    const post = torchPost().canvas;
    return Array.from({ length: 5 }, (_, i) => { const c = document.createElement('canvas'); c.width = 10; c.height = 34; const g = c.getContext('2d'); g.drawImage(post, 0, 0); g.drawImage(flame(6, 9, i * 0.8, 92), 2, -1); return c; });
  }
  function tree(v) {
    const p = new Px(56, 64);
    rod(p, 28, 62, 28, 36, 6, 5, 'wood', { tex: 0.2 });
    blob(p, 28, 28, 23 + v * 2, 20, 'leaf', { rough: 0.25, seed: 70 + v, tex: 0.3 });
    for (let k = 0; k < 16; k++) blob(p, 12 + hash(k, v, 71) * 30, 14 + hash(k, v + 3, 71) * 24, 4, 3.4, 'leaf', { bias: 0.12 - (hash(k, 9, 71) > 0.5 ? 0.2 : 0), tex: 0.25, seed: k });
    return done(p, 28, 62);
  }
  function rock() { const p = new Px(28, 20); blob(p, 14, 11, 12, 8, 'stone', { rough: 0.25, seed: 41, tex: 0.25 }); return done(p, 14, 17); }

  // ---------- fighters ----------
  const ROSTER = [
    { person: 'raider', armour: 'leather', weapon: 'sword', x: 286, y: 216, hp: 5 },
    { person: 'thug', armour: 'hide', weapon: 'mace', x: 360, y: 226, hp: 6 },
    { person: 'marauder', armour: 'fur', weapon: 'battleaxe', x: 410, y: 160, hp: 8 },
    { person: 'raider', armour: 'leather', weapon: 'scimitar', x: 230, y: 176, hp: 5 },
    { person: 'chief', armour: 'iron', weapon: 'greatsword', x: 322, y: 124, hp: 11 },
  ];
  const gear = { armour: 'farm', weapon: 'sword' };
  const mk = (o) => ({ person: 'kasim', armour: gear.armour, weapon: gear.weapon, face: Math.PI, anim: 'idle', fi: 0, ft: 0, kb: [0, 0], flash: 0, hp: 5, maxHp: 5,
    struck: false, combo: 0, comboT: 9, buffer: null, cut: [], crushed: false, stagger: 0, inv: 0, cool: 1 + Math.random() * 2, aggro: false, dead: false,
    prevBlade: null, curBlade: null, drawnFi: -1, drawnAnim: '', spurt: 0, pt: null, ghosts: [], blockT: 0, ...o });
  let pl, foes, pieces, particles, pools, decals, dg, hitStop, slow, shake, fin, attacker, msg, camX, camY, letter;
  function reset() {
    pl = mk({ x: 112, y: 322, face: 0, hp: 100, maxHp: 100 });
    foes = ROSTER.map((r, i) => mk({ ...r, id: i, maxHp: r.hp, face: faceOf(Math.random() - 0.5, 1), home: [r.x, r.y] }));
    pieces = []; particles = []; pools = []; hitStop = 0; slow = 0; shake = 0; fin = null; attacker = null; msg = 'Walk up the track into the camp.'; letter = 0;
    decals = document.createElement('canvas'); decals.width = WW; decals.height = WH; dg = decals.getContext('2d');
    camX = pl.x - W / 2; camY = pl.y - H / 2;
  }
  const W8 = (f) => WEAPONS[f.weapon];
  const frames = (f) => ANIMS[f.anim].frames;
  const dur = (f, i) => { const fr = frames(f)[i]; return ANIMS[f.anim].attack ? fr.d / W8(f).speed : fr.d; };
  function play(f, anim) { f.anim = anim; f.fi = 0; f.ft = 0; f.struck = false; }
  const busy = (f) => !['idle', 'walk', 'run', 'block'].includes(f.anim);
  const canAct = (f) => !fin && !f.dead && (!busy(f) || ((COMBO.includes(f.anim) || f.anim === 'power') && f.struck && f.fi > frames(f).findIndex((q) => q.hit)));
  const reachOf = (f) => 14 + W8(f).len * 1.25;
  function inArc(a, b, reach, cos = 0.3) {
    const dx = b.x - a.x, dy = (b.y - a.y) * 1.3, d = Math.hypot(dx, dy), [fx, fy] = fwd(a);
    return d < reach && (fx * dx + fy * dy) / (d || 1) > cos;
  }
  const settings = { gore: 'full', light: 'dusk' };
  const gore = () => settings.gore;

  // ---------- blood ----------
  function spray(x, y, z, n, dir = [0, 0], force = 1) {
    if (gore() === 'off') return;
    for (let i = 0; i < n; i++) particles.push({ x, y, z: z + Math.random() * 4, vx: (dir[0] * 60 + (Math.random() - 0.5) * 70) * force, vy: (dir[1] * 40 + (Math.random() - 0.5) * 30) * force, vz: (20 + Math.random() * 60) * force, c: Math.random() < 0.5 ? '#6e0c09' : '#9c160e', big: Math.random() < 0.25 });
  }
  function bits(x, y, z, n) { for (let i = 0; i < n; i++) particles.push({ x, y, z, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 40, vz: 40 + Math.random() * 70, c: Math.random() < 0.5 ? '#c7bc9b' : '#7c3920', big: false }); }
  function sparks(x, y) { for (let i = 0; i < 9; i++) particles.push({ x, y, z: 20, vx: (Math.random() - 0.5) * 110, vy: (Math.random() - 0.5) * 50, vz: 30 + Math.random() * 50, c: '#ffe7a0', spark: 0.22 }); }
  function pool(x, y, max) { if (gore() !== 'off') pools.push({ x, y, r: 1, max }); }
  function pixelEllipse(g, cx, cy, rx, ry, c) { g.fillStyle = c; for (let y = -Math.floor(ry); y <= ry; y++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2))); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }

  // ---------- hurting and killing ----------
  // Take a part off: it flies from where it sat on the body, and the stump spurts.
  function sever(f, part, from) {
    if (gore() !== 'full' || f.cut.includes(part)) return;
    const img = frameOf(f, f.anim, f.fi, f.face, { only: part, cut: [] }), c = crop(img.canvas);
    f.cut = [...f.cut, part]; f.spurt = part === 'head' ? 1.6 : 1.1;
    if (!c) return;
    const dx = f.x - from.x, dy = f.y - from.y, d = Math.hypot(dx, dy) || 1;
    pieces.push({ canvas: c.canvas, x: f.x + (c.cx - OX), y: f.y + 2, z: OY - c.cy, vx: (dx / d) * 45 + (Math.random() - 0.5) * 30, vy: (dy / d) * 25 + (Math.random() - 0.5) * 12, vz: part === 'head' ? 95 : 70, rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 6), rest: false });
    spray(f.x, f.y, OY - c.cy, 30, [dx / d, dy / d], 1.2);
  }
  function kill(f, by, how = {}) {
    f.dead = true; f.hp = 0; play(f, how.anim || 'death'); f.stagger = 0; f.kb = [f.kb[0] * 0.5, f.kb[1] * 0.5];
    if (how.part) sever(f, how.part, by);
    if (how.crush && gore() !== 'off') { f.crushed = gore() === 'full'; spray(f.x, f.y, 40, 40, [0, 0], 1.3); if (gore() === 'full') bits(f.x, f.y, 40, 12); }
    if (how.throat) f.spurt = 2.4;
    f.poolAt = 0.6; if (attacker === f) attacker = null;
    if (f !== pl && foes.every((e) => e.dead)) msg = 'The camp is quiet. R to set it up again.';
  }
  function damage(att, def, kind) {
    const w = W8(att), third = kind === 'combo3', power = kind === 'power';
    const dmg = att === pl ? w.dmg * (power ? 2 : third ? 1.5 : 1) : (w.hands === 2 ? 22 : 13) * (power ? 1.5 : 1);
    def.hp -= dmg; def.flash = 0.08;
    const dx = def.x - att.x, dy = def.y - att.y, d = Math.hypot(dx, dy) || 1, heavy = power || third || w.hands === 2;
    def.kb = [(dx / d) * (heavy ? 120 : 65), (dy / d) * (heavy ? 80 : 45)];
    hitStop = Math.max(hitStop, heavy ? 0.1 : 0.06); shake = Math.max(shake, heavy ? 3.5 : 2);
    spray(def.x, def.y, 34, heavy ? 16 : 8, [dx / d, dy / d]);
    if (def.hp <= 0) {
      hitStop = 0.14; shake = 5;
      // Heavy killing blows may take something off (bible 11.3): blades and axes a head or an arm, blunt weapons the skull.
      let how = {};
      if (att === pl && heavy && Math.random() < (w.cls === 'axe' ? 0.75 : 0.55)) how = w.cls === 'blunt' ? { crush: true } : { part: Math.random() < (w.cls === 'axe' ? 0.45 : 0.6) ? 'head' : (Math.random() < 0.5 ? 'armR' : 'armL') };
      kill(def, att, how);
      if (def === pl) msg = 'You died. R to try again.';
      return;
    }
    // Heavy blows, the third of a chain, and a man brought low all stagger: F finishes.
    if (def !== pl && (heavy || def.hp <= def.maxHp * 0.3)) { play(def, 'stagger'); def.stagger = 1.6; if (attacker === def) attacker = null; }
    else play(def, 'hit');
  }
  function landBlow(att) {
    if (fin && att !== pl) return; // nobody strikes the player mid-finisher
    const targets = att === pl ? foes : [pl];
    for (const def of targets) {
      if (def.dead || !inArc(att, def, reachOf(att))) continue;
      if (att !== pl && def.inv > 0) { msg = 'Dodged.'; continue; }
      if (def.anim === 'block' && inArc(def, att, 80, 0)) {
        const parry = def.blockT < 0.25;
        sparks((att.x + def.x) / 2, (att.y + def.y) / 2);
        hitStop = 0.06; shake = 1.5; def.kb = [(def.x - att.x) * 2, (def.y - att.y) * 1.5];
        if (parry && att !== pl) { play(att, 'stagger'); att.stagger = 1.6; if (attacker === att) attacker = null; msg = 'Parried. F to finish him.'; }
        else msg = 'Blocked.';
        continue;
      }
      const kind = att.anim === 'power' ? 'power' : att.anim === 'chop' && att === pl ? 'combo3' : att.anim === 'enemyChop' ? 'power' : 'quick';
      damage(att, def, kind);
      if (att === pl && W8(att).hands === 1) break; // one-handed blows stop at the first body; two-handers cleave
    }
  }

  // ---------- the player ----------
  function attack(power) {
    if (pl.dead || fin) return;
    if (!canAct(pl)) { pl.buffer = { power, left: 0.35 }; return; }
    const chained = !power && (COMBO.includes(pl.anim) || pl.comboT < 0.45);
    pl.combo = chained ? (pl.combo + 1) % 3 : 0;
    const t = nearest(48, 0.0); if (t) pl.face = faceOf(t.x - pl.x, t.y - pl.y); // aim assist
    play(pl, power ? 'power' : COMBO[pl.combo]);
  }
  function nearest(r, cos, pred = () => true) {
    let best = null, bd = r;
    for (const e of foes) { if (e.dead || !pred(e)) continue; const d = Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.3); if (d < bd && (cos <= -1 || inArc(pl, e, r, cos) || d < 20)) { best = e; bd = d; } }
    return best;
  }
  const finishable = (e) => !e.dead && (e.stagger > 0 || e.hp <= e.maxHp * 0.3);
  function finisher() {
    if (fin || pl.dead || busy(pl) && !canAct(pl)) return;
    const e = nearest(46, -2, finishable);
    if (!e) { msg = 'No one to finish: stagger him first (third hit, power attack or a parry), or wear him down.'; return; }
    const kind = FINISHER[W8(pl).cls];
    pl.face = faceOf(e.x - pl.x, e.y - pl.y); const [fx, fy] = fwd(pl), gap = kind === 'throat' ? 11 : 17;
    e.x = pl.x + fx * gap; e.y = pl.y + fy * gap / 1.3; e.face = faceOf(pl.x - e.x, pl.y - e.y); e.kb = [0, 0]; e.stagger = 0;
    play(e, kind === 'throat' ? 'hit' : 'kneel'); if (kind === 'throat') { e.anim = 'stagger'; e.fi = 1; }
    play(pl, `fin_${kind}`);
    fin = { e, kind }; if (attacker === e) attacker = null;
    msg = '';
  }
  function landFinisher() {
    const { e, kind } = fin;
    hitStop = 0.22; slow = 0.55; shake = 6.5;
    const [fx, fy] = fwd(pl);
    if (kind === 'behead') { kill(e, pl, { part: gore() === 'full' ? 'head' : null }); spray(e.x, e.y, 34, 30, [fx, fy], 1.3); msg = 'Beheaded.'; }
    if (kind === 'cleave') { kill(e, pl, { part: gore() === 'full' ? 'armL' : null }); spray(e.x, e.y, 30, 40, [fx, fy], 1.4); msg = 'Cleaved through the shoulder.'; }
    if (kind === 'crush') { kill(e, pl, { crush: true }); msg = 'Skull crushed.'; }
    if (kind === 'throat') { kill(e, pl, { throat: true }); play(e, 'clutch'); e.dying = 1.1; spray(e.x, e.y, 36, 24, [fx, fy], 1.2); msg = 'Throat cut.'; }
  }
  function dodge(mx, my) {
    if (!canAct(pl) || pl.anim === 'dodge') return;
    let [dx, dy] = mx || my ? [mx, my] : (() => { const [fx, fy] = fwd(pl); return [-fx, -fy]; })();
    const l = Math.hypot(dx, dy) || 1; pl.kb = [(dx / l) * 190, (dy / l) * 150]; pl.inv = 0.28;
    play(pl, 'dodge');
  }

  // ---------- the bandits ----------
  // Only one swings at a time; the others circle and wait their turn.
  function think(e, dt) {
    if (e.dead || fin) return;
    if (e.stagger > 0) { e.stagger -= dt; if (e.stagger <= 0) play(e, 'idle'); return; }
    if (busy(e)) return;
    const dx = pl.x - e.x, dy = pl.y - e.y, d = Math.hypot(dx, dy * 1.3);
    if (!e.aggro && !pl.dead && d < 120 && inCamp(pl.x, pl.y, 1.25)) { for (const o of foes) o.aggro = true; msg = 'They have seen you.'; }
    if (!e.aggro || pl.dead) {
      const hx = e.home[0] - e.x, hy = e.home[1] - e.y, hd = Math.hypot(hx, hy);
      if (hd > 3) { e.face = faceOf(hx, hy); e.x += (hx / hd) * 22 * dt; e.y += (hy / hd) * 22 * dt; if (e.anim !== 'walk') play(e, 'walk'); }
      else if (e.anim !== 'idle') play(e, 'idle');
      return;
    }
    e.face = faceOf(dx, dy);
    e.cool -= dt;
    const mine = attacker === e;
    if (!attacker && e.cool <= 0 && d < 70) attacker = e;
    const want = mine ? 20 + W8(e).len * 0.6 : 44 + (e.id % 3) * 6;
    const sp = mine ? 30 : 24;
    if (d > want + 4) { e.x += (dx / d) * sp * dt; e.y += (dy / d) * sp * dt * 0.8; if (e.anim !== 'walk') play(e, 'walk'); }
    else if (d < want - 6 && !mine) { e.x -= (dx / d) * 18 * dt; e.y -= (dy / d) * 18 * dt * 0.8; if (e.anim !== 'walk') play(e, 'walk'); }
    else if (mine) { play(e, W8(e).hands === 2 || W8(e).cls === 'blunt' ? 'enemyChop' : 'enemySlash'); e.cool = 1.4 + Math.random() * 1.6; e.releaseAfter = true; }
    else { const s = e.id % 2 ? 1 : -1; e.x += (-dy / d) * s * 12 * dt; e.y += (dx / d) * s * 12 * dt * 0.8; if (e.anim !== 'walk') play(e, 'walk'); }
  }

  // ---------- the update ----------
  const keys = new Set();
  let holdStart = null;
  function step(f, dt) {
    f.ft += dt * 1000;
    while (f.ft >= dur(f, f.fi)) {
      f.ft -= dur(f, f.fi);
      const fr = frames(f);
      if (f.fi + 1 < fr.length) {
        f.fi++;
        if (fr[f.fi].hit && !f.struck) { f.struck = true; if (f.anim.startsWith('fin_')) landFinisher(); else landBlow(f); }
      }
      else if (ANIMS[f.anim].loop) f.fi = 0;
      else if (ANIMS[f.anim].hold) { f.ft = 0; break; }
      else {
        if (COMBO.includes(f.anim)) f.comboT = 0;
        if (f.anim.startsWith('fin_')) fin = null;
        if (f.releaseAfter && attacker === f) { attacker = null; f.releaseAfter = false; }
        play(f, 'idle'); break;
      }
    }
    if (!COMBO.includes(f.anim)) f.comboT += dt;
    f.x += f.kb[0] * dt; f.y += f.kb[1] * dt; const k = Math.exp(-9 * dt); f.kb[0] *= k; f.kb[1] *= k;
    if (f.flash > 0) f.flash -= dt; if (f.inv > 0) f.inv -= dt;
    // The throat-cut man stands clutching a moment, then falls.
    if (f.dying !== undefined && (f.dying -= dt) <= 0) { play(f, 'death'); f.dying = undefined; }
    if (f.spurt > 0 && f.pt) { f.spurt -= dt; if (Math.random() < 0.8) { const src = f.cut.includes('head') || f.dying !== undefined || f.anim === 'clutch' ? f.pt.neck : f.cut.includes('armR') ? f.pt.shR : f.pt.shL; spray(f.x + src[0] - OX, f.y + 1, OY - src[1], 2, [0, -0.2], 0.8); } }
    if (f.dead && f.poolAt !== undefined && f.anim === 'death' && f.fi === frames(f).length - 1 && (f.poolAt -= dt) <= 0) { pool(f.x - Math.sin(f.face) * -10, f.y - Math.cos(f.face) * -6, 9 + (f.cut.length ? 4 : 0) + (f.crushed ? 3 : 0)); f.poolAt = undefined; }
    if (f.anim === 'dodge') { f.ghosts.push({ x: f.x, y: f.y, t: 0.18, img: frameOf(f).canvas }); }
    f.ghosts = f.ghosts.filter((g) => (g.t -= dt) > 0);
  }
  function solidPush(f) {
    for (const q of props) for (const [qx, qy, r] of q.solid || []) {
      const ex = f.x - qx, ey = (f.y - qy) * 1.6, e = Math.hypot(ex, ey);
      if (e < r + 5) { f.x += (ex / (e || 1)) * (r + 5 - e); f.y += (ey / (e || 1)) * (r + 5 - e) / 1.6; }
    }
    f.x = clamp(f.x, 8, WW - 8); f.y = clamp(f.y, 20, WH - 4);
  }
  function update(rdt) {
    shake = Math.max(0, shake - 25 * rdt);
    letter += ((fin ? 1 : 0) - letter) * Math.min(1, rdt * 8);
    if (hitStop > 0) { hitStop -= rdt; return; }
    const dt = slow > 0 ? rdt * 0.3 : rdt; if (slow > 0) slow -= rdt;
    // The player.
    let mx = 0, my = 0;
    if (keys.has('KeyW')) my -= 1; if (keys.has('KeyS')) my += 1; if (keys.has('KeyA')) mx -= 1; if (keys.has('KeyD')) mx += 1;
    const blocking = keys.has('KeyK') || keys.has('mouse2');
    if (!pl.dead && !fin) {
      if (!busy(pl)) {
        if (blocking) { if (pl.anim !== 'block') { play(pl, 'block'); pl.blockT = 0; } pl.blockT += dt; }
        else if (mx || my) {
          const run = keys.has('ShiftLeft') || keys.has('ShiftRight'), l = Math.hypot(mx, my), sp = run ? 66 : 36;
          pl.face = faceOf(mx, my); pl.x += (mx / l) * sp * dt; pl.y += (my / l) * sp * dt * 0.8;
          if (pl.anim !== (run ? 'run' : 'walk')) play(pl, run ? 'run' : 'walk');
        } else if (pl.anim !== 'idle') play(pl, 'idle');
      }
      if (keys.has('Space')) { keys.delete('Space'); dodge(mx, my); }
      if (pl.buffer && (pl.buffer.left -= dt) <= 0) pl.buffer = null;
      if (pl.buffer && canAct(pl)) { const b = pl.buffer; pl.buffer = null; attack(b.power); }
      if (holdStart !== null && performance.now() - holdStart > 250) { holdStart = null; attack(true); }
      if (!foes.some((e) => e.aggro && !e.dead)) pl.hp = Math.min(pl.maxHp, pl.hp + 6 * dt);
    }
    step(pl, dt);
    for (const e of foes) { think(e, dt); step(e, dt); }
    // Keep the living apart, and everyone out of solid things.
    const alive = [pl, ...foes].filter((f) => !f.dead);
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j]; if (fin && (a === fin.e || b === fin.e)) continue;
      const dx = b.x - a.x, dy = (b.y - a.y) * 1.3, d = Math.hypot(dx, dy);
      if (d < 15) { const push = (15 - d) / 2, ux = dx / (d || 1), uy = dy / (d || 1); a.x -= ux * push; a.y -= uy * push / 1.3; b.x += ux * push; b.y += uy * push / 1.3; }
    }
    for (const f of [pl, ...foes]) if (!f.dead) solidPush(f);
    // Severed parts fly, bounce and come to rest in a little pool.
    for (const q of pieces) {
      if (q.rest) continue;
      q.vz -= 300 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (Math.random() < 0.5 && gore() !== 'off') particles.push({ x: q.x, y: q.y, z: q.z, vx: 0, vy: 0, vz: 0, c: '#7a0d0a' });
      if (q.z <= 2) { q.z = 2; if (q.vz < -50) { q.vz *= -0.35; q.vx *= 0.5; q.vy *= 0.5; q.vr *= 0.5; } else { q.rest = true; q.rot = Math.round(q.rot / (Math.PI / 2)) * (Math.PI / 2); pool(q.x, q.y + 1, 5); } }
    }
    for (const q of pools) if (q.r < q.max) { q.r += dt * 4; pixelEllipse(dg, q.x, q.y, q.r, q.r * 0.45, '#4a0b0b'); pixelEllipse(dg, q.x, q.y, q.r * 0.7, q.r * 0.3, '#5e100e'); }
    particles = particles.filter((q) => {
      q.vz -= 280 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.spark !== undefined) return (q.spark -= dt) > 0;
      if (q.z <= 0) { dg.fillStyle = q.c; dg.fillRect(Math.round(q.x), Math.round(q.y), q.big ? 2 : 1, 1); return false; }
      return true;
    });
    camX += (pl.x - W / 2 - camX) * Math.min(1, rdt * 6); camY += (pl.y - H / 2 - 10 - camY) * Math.min(1, rdt * 6);
    camX = clamp(camX, 0, WW - W); camY = clamp(camY, 0, WH - H);
  }

  // ---------- drawing ----------
  const view = document.getElementById('view'), ctx = view.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const tmp = document.createElement('canvas'); tmp.width = SW; tmp.height = SH; const tg = tmp.getContext('2d');
  const FONT = { F: ['111', '100', '110', '100', '100'] };
  function glyph(ch, x, y, c) { ctx.fillStyle = c; FONT[ch].forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') ctx.fillRect(x + i, y + j, 1, 1); })); }
  function drawFighter(f) {
    const fr = frames(f)[f.fi], img = frameOf(f);
    f.pt = img.pt;
    if (f.drawnFi !== f.fi || f.drawnAnim !== f.anim) { f.prevBlade = f.drawnAnim === f.anim ? f.curBlade : null; f.drawnFi = f.fi; f.drawnAnim = f.anim; }
    f.curBlade = img.blade;
    const sx = Math.round(f.x), sy = Math.round(f.y);
    for (const g of f.ghosts) { ctx.globalAlpha = g.t * 2; ctx.drawImage(g.img, Math.round(g.x) - OX, Math.round(g.y) - OY); ctx.globalAlpha = 1; }
    if (fr.smear && f.prevBlade) {
      const [a0, a1] = f.prevBlade, [b0, b1] = img.blade;
      ctx.fillStyle = f.anim.startsWith('fin_') ? 'rgba(255,240,210,0.75)' : 'rgba(255,246,220,0.5)'; ctx.beginPath();
      ctx.moveTo(sx - OX + a0[0], sy - OY + a0[1]); ctx.lineTo(sx - OX + a1[0], sy - OY + a1[1]); ctx.lineTo(sx - OX + b1[0], sy - OY + b1[1]); ctx.lineTo(sx - OX + b0[0], sy - OY + b0[1]); ctx.closePath(); ctx.fill();
    }
    let src = img.canvas;
    const glow = fr.glow, white = f.flash > 0, charge = fr.charge && f === pl;
    if (glow || white || charge) {
      tg.clearRect(0, 0, SW, SH); tg.globalCompositeOperation = 'source-over'; tg.drawImage(img.canvas, 0, 0); tg.globalCompositeOperation = 'source-atop';
      tg.fillStyle = white ? 'rgba(255,255,255,0.85)' : charge ? 'rgba(255,230,180,0.25)' : `rgba(255,${Math.floor(performance.now() / 70) % 2 ? 190 : 140},60,0.45)`; tg.fillRect(0, 0, SW, SH);
      src = tmp;
    }
    ctx.drawImage(src, sx - OX, sy - OY);
  }
  function draw() {
    const now = performance.now();
    ctx.save();
    const ox = -Math.round(camX) + Math.round((Math.random() - 0.5) * shake), oy = -Math.round(camY) + Math.round((Math.random() - 0.5) * shake);
    ctx.translate(ox, oy);
    ctx.drawImage(ground, 0, 0); ctx.drawImage(decals, 0, 0);
    // Shadows, then everything standing, back to front.
    ctx.fillStyle = 'rgba(10,8,4,0.35)';
    for (const f of [pl, ...foes]) if (!(f.dead && f.anim === 'death' && f.fi > 2)) { ctx.beginPath(); ctx.ellipse(Math.round(f.x), Math.round(f.y), 9, 3.2, 0, 0, 2 * Math.PI); ctx.fill(); }
    const vis = (x, y) => x > camX - 60 && x < camX + W + 60 && y > camY - 20 && y < camY + H + 80;
    const items = [];
    for (const q of props) if (vis(q.x, q.y)) items.push({ y: q.y, draw: () => { const c = q.anim ? q.anim[Math.floor(now / 110) % q.anim.length] : q.canvas; ctx.drawImage(c, Math.round(q.x - q.ox), Math.round(q.y - q.oy)); } });
    for (const f of [pl, ...foes]) if (vis(f.x, f.y)) items.push({ y: f.y - (f.dead && f.fi > 2 ? 8 : 0), draw: () => drawFighter(f) });
    for (const q of pieces) items.push({ y: q.y - (q.rest ? 6 : 0), draw: () => { ctx.save(); ctx.translate(Math.round(q.x), Math.round(q.y - q.z)); ctx.rotate(q.rot); ctx.drawImage(q.canvas, -Math.round(q.canvas.width / 2), -Math.round(q.canvas.height / 2)); ctx.restore(); } });
    items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());
    for (const q of particles) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y - q.z), q.big ? 2 : 1, q.big ? 2 : 1); }
    // Embers off the fire.
    for (let i = 0; i < 6; i++) { const t = ((now / 1000 + i * 0.37) % 1.6) / 1.6; ctx.fillStyle = t < 0.5 ? '#fdd56a' : '#e07a16'; ctx.fillRect(Math.round(FIRE.x + Math.sin(i * 7 + now / 400) * 6 * t + (i - 3) * 2), Math.round(FIRE.y - 16 - t * 40), 1, 1); }
    // Health over bandits in the fight, and F over the one who can be finished.
    for (const e of foes) {
      if (e.dead || !e.aggro) continue;
      const x = Math.round(e.x) - 8, y = Math.round(e.y) - 66;
      ctx.fillStyle = '#100a07'; ctx.fillRect(x - 1, y - 1, 18, 4); ctx.fillStyle = '#8f2a1c'; ctx.fillRect(x, y, Math.max(0, Math.round(16 * e.hp / e.maxHp)), 2);
      if (finishable(e) && !fin && Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.3) < 60) { ctx.fillStyle = '#100a07'; ctx.fillRect(x + 5, y - 9, 7, 7); glyph('F', x + 7, y - 8, Math.floor(now / 200) % 2 ? '#fdd56a' : '#fff2b8'); }
    }
    ctx.restore();
    // Light: dusk over everything, firelight added back.
    if (settings.light === 'dusk') {
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(178,160,192)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const fl = 1 + (Math.sin(now / 90 * l.flicker) * 0.04 + Math.sin(now / 37) * 0.03) * l.flicker, x = l.x + ox, y = l.y + oy, r = l.r * fl;
        if (x < -r || x > W + r || y < -r || y > H + r) continue;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${l.c[0]},${l.c[1]},${l.c[2]},${l.a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // Finisher: letterbox bars.
    if (letter > 0.01) { const h = Math.round(18 * letter); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h); }
    // The player's health.
    ctx.fillStyle = '#100a07'; ctx.fillRect(6, 6, 62, 6); ctx.fillStyle = '#3a0f0b'; ctx.fillRect(7, 7, 60, 4); ctx.fillStyle = '#a83b27'; ctx.fillRect(7, 7, Math.max(0, Math.round(60 * pl.hp / pl.maxHp)), 4); ctx.fillStyle = '#d06a4a'; ctx.fillRect(7, 7, Math.max(0, Math.round(60 * pl.hp / pl.maxHp)), 1);
    document.getElementById('msg').textContent = msg;
  }

  // ---------- the armoury: every armour set, every weapon ----------
  const lineup = document.getElementById('lineup'), lg = lineup.getContext('2d');
  function drawLineup(now) {
    const ids = Object.keys(ARMOUR), wids = Object.keys(WEAPONS), cell = 60, rowH = 66;
    if (lineup.width !== 8 * cell * 2) { lineup.width = 8 * cell * 2; lineup.height = rowH * 3 * 2; }
    lg.setTransform(2, 0, 0, 2, 0, 0); lg.imageSmoothingEnabled = false; lg.fillStyle = '#2a2a1e'; lg.fillRect(0, 0, 8 * cell, rowH * 3);
    const idle = Math.floor(now / 260) % 4, at = [0, 1, 2, 1][idle];
    const fake = (armour, weapon) => ({ person: 'kasim', armour, weapon, cut: [], crushed: false });
    ids.forEach((a, i) => {
      for (const [row, face] of [[0, Math.PI], [1, -Math.PI / 2]]) { const img = frameOf(fake(a, gear.weapon), 'idle', at, face); lg.drawImage(img.canvas, i * cell + cell / 2 - OX, row * rowH + rowH - 5 - OY); }
      if (a === gear.armour) { lg.strokeStyle = '#e0a030'; lg.lineWidth = 1; lg.strokeRect(i * cell + 1, 1, cell - 2, rowH * 2 - 2); }
    });
    // Weapons mid-swing, so their shapes show.
    wids.forEach((w, i) => { const img = frameOf(fake(gear.armour, w), 'show', 0, -Math.PI / 2); lg.drawImage(img.canvas, i * cell + cell / 2 - OX - 8, 2 * rowH + rowH - 5 - OY); if (w === gear.weapon) { lg.strokeStyle = '#e0a030'; lg.strokeRect(i * cell + 1, 2 * rowH + 1, cell - 2, rowH - 2); } });
    requestAnimationFrame(drawLineup);
  }
  lineup.addEventListener('click', (e) => {
    const r = lineup.getBoundingClientRect(), x = (e.clientX - r.left) * (lineup.width / r.width) / 2, y = (e.clientY - r.top) * (lineup.height / r.height) / 2, i = Math.floor(x / 60);
    if (y < 132) { const a = Object.keys(ARMOUR)[i]; if (a) setGear('armour', a); } else { const w = Object.keys(WEAPONS)[i]; if (w) setGear('weapon', w); }
  });
  function setGear(k, v) { gear[k] = v; pl[k] = v; renderButtons(); }
  function renderButtons() {
    document.getElementById('armour').innerHTML = Object.entries(ARMOUR).map(([k, a]) => `<button data-armour="${k}" class="${gear.armour === k ? 'on' : ''}">${a.name}</button>`).join('');
    document.getElementById('weapon').innerHTML = Object.entries(WEAPONS).map(([k, w]) => `<button data-weapon="${k}" class="${gear.weapon === k ? 'on' : ''}">${w.name}${w.hands === 2 ? ' (2H)' : ''}</button>`).join('');
    document.getElementById('fin-note').textContent = `Finisher with this weapon: ${{ behead: 'beheading', cleave: 'cleaving through the shoulder', crush: 'crushing the skull', throat: 'cutting the throat' }[FINISHER[WEAPONS[gear.weapon].cls]]}.`;
  }

  // ---------- controls ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.armour) setGear('armour', t.dataset.armour);
    if (t.dataset.weapon) setGear('weapon', t.dataset.weapon);
    if (t.dataset.gore) { settings.gore = t.dataset.gore; for (const b of document.querySelectorAll('[data-gore]')) b.classList.toggle('on', b === t); }
    if (t.dataset.light) { settings.light = t.dataset.light; for (const b of document.querySelectorAll('[data-light]')) b.classList.toggle('on', b === t); }
    if (t.id === 'reset') reset();
    t.blur();
  });
  const GAME_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyJ', 'KeyK', 'KeyF', 'KeyR', 'ShiftLeft'];
  addEventListener('keydown', (e) => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyJ') holdStart = performance.now();
    if (e.code === 'KeyF') finisher();
    if (e.code === 'KeyR') reset();
  });
  addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'KeyJ' && holdStart !== null) { holdStart = null; attack(false); } });
  view.addEventListener('contextmenu', (e) => e.preventDefault());
  view.addEventListener('mousedown', (e) => { if (e.button === 0) holdStart = performance.now(); if (e.button === 2) keys.add('mouse2'); });
  addEventListener('mouseup', (e) => { if (e.button === 0 && holdStart !== null) { holdStart = null; attack(false); } if (e.button === 2) keys.delete('mouse2'); });
  addEventListener('blur', () => keys.clear());

  buildCamp(); reset(); renderButtons();
  let last = performance.now();
  function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); draw(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop); requestAnimationFrame(drawLineup);
  // For checking the page from a script.
  window.__sample = { state: () => ({ pl, foes, fin, pieces: pieces.length }), attack, finisher, setGear, reset, settings,
    teleport: (x, y) => { pl.x = x; pl.y = y; camX = x - W / 2; camY = y - H / 2; }, stagger: (i) => { const e = foes[i]; play(e, 'stagger'); e.stagger = 5; },
    face: (x, y) => { pl.face = faceOf(x - pl.x, y - pl.y); } };
})();
