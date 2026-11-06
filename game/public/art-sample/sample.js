/* =====================================================================
   Art sample, round six (design bible 4.0, style A).
   A bandit camp to fight through and loot, with Skyrim's interface functions in our
   own look (ui.js). Everything here is drawn by code while the page runs: small pixel
   buffers, palette ramps, ordered dithering, a rim light and a coloured outline.
   Figures are posed from one small 3D skeleton, and gear is layered on it, so every
   direction, outfit, weapon and shield shares the same animations.
   Item names and numbers come from the game's own data pack (Skyrim's numbers).
   This page is a sample, not game code: nothing in the game reads it.
   ===================================================================== */
(async () => {
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
    steel:   ['#101317', '#1f242a', '#333a42', '#4b545e', '#66717c', '#87929c', '#a9b3ba', '#cdd4d8'],
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
    glass:   ['#0c1416', '#18292c', '#274146', '#3b5d63', '#5a8188', '#86aab0'],
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
  // A tapered rod with round ends, shaded across its width. fn(x, y, t, across, v) may recolour, or return false to leave the pixel.
  function rod(p, x0, y0, x1, y1, th0, th1, ramp, o = {}) {
    const len = Math.max(0.01, Math.hypot(x1 - x0, y1 - y0)), ux = (x1 - x0) / len, uy = (y1 - y0) / len, nx = -uy, ny = ux, th = Math.max(th0, th1);
    const ln = nx * L[0] - ny * L[1];
    for (let y = Math.floor(Math.min(y0, y1) - th); y <= Math.ceil(Math.max(y0, y1) + th); y++) for (let x = Math.floor(Math.min(x0, x1) - th); x <= Math.ceil(Math.max(x0, x1) + th); x++) {
      const px = x + 0.5 - x0, py = y + 0.5 - y0, t = px * ux + py * uy, d = px * nx + py * ny;
      const half = (th0 + (th1 - th0) * clamp(t / len, 0, 1)) / 2;
      if (o.flat ? (t < 0 || t > len || Math.abs(d) > half) : (t < 0 ? Math.hypot(px, py) > half : t > len ? Math.hypot(x + 0.5 - x1, y + 0.5 - y1) > half : Math.abs(d) > half)) continue;
      const across = clamp(d / Math.max(0.5, half), -1, 1), nz = Math.sqrt(Math.max(0, 1 - across * across));
      const v = (across * Math.sign(ln || 1) * -0.4 + nz * 0.55) * 0.85 + 0.3 + (o.bias || 0) + (o.tex ?? 0.06) * (fbm(x * 0.5, y * 0.5, o.seed || 4, 2) - 0.5);
      const c = o.fn ? o.fn(x, y, clamp(t / len, 0, 1), across, v) : null;
      if (c === false) continue;
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
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const limb = (p, r, side) => rotY([0, Math.sin(p), -Math.cos(p)], -side * r);
  function reach(S, T, a, b, side) {
    const d = sub(T, S), u = nrm(d), l = Math.min(len3(d), a + b - 0.01);
    const x = (a * a - b * b + l * l) / (2 * l), h = Math.sqrt(Math.max(0, a * a - x * x));
    let pole = [side * 0.6, -0.2, -1]; pole = nrm(sub(pole, [u[0] * dot3(pole, u), u[1] * dot3(pole, u), u[2] * dot3(pole, u)]));
    return [add(add(S, u, x), pole, h), add(S, u, l)];
  }
  const BASE = { tw: 0.15, lean: 0.05, fall: 0, aRp: 0.75, aRr: 0.2, aRe: 0.7, aLp: 0.25, aLr: 0.2, aLe: 0.4, lRp: 0.12, lRk: 0.2, lLp: -0.15, lLk: 0.1, lRr: 0.1, lLr: 0.1, wy: 15, wp: 40 };
  const PHI = 40 * D, CP = Math.cos(PHI), SP = Math.sin(PHI), TO_VIEWER = [0, -CP, SP], CAM_UP = [0, SP, CP];
  const SW = 100, SH = 100, OX = 50, OY = 84; // sprite cell, and where the feet stand in it
  // Proportions (round three): longer legs and body, a smaller head than round two.
  const RIG = (() => { const k = 1.2, r = { thigh: 9, shin: 8.5, spine: 12.5, neck: 1.6, headR: 5.4, shW: 6.6, hipW: 3.3, upper: 7.3, fore: 6.8, foot: 2.8, thighT: 5.4, shinT: 4.5, upperT: 4.2, foreT: 3.7, chestMin: 12, waistMin: 9.4 };
    const o = Object.fromEntries(Object.entries(r).map(([a, v]) => [a, v * k])); o.k = k; return o; })();

  // Pose the skeleton (x right, y forward, z up, feet on the ground), then face it.
  function rig(pose, face, wpn) {
    const R = RIG, P = { ...BASE, ...pose };
    // A shield arm holds the shield out in front, or across the body in a block.
    // A shield is held close in front of the body, raised across it in a block, thrust out in a bash.
    if (wpn.shield && wpn.hands === 1 && !P.free) Object.assign(P, P.guard ? { aLp: 1.25, aLr: -0.45, aLe: 1.4 } : P.bash ? { aLp: 1.5, aLr: -0.15, aLe: 0.2 } : { aLp: 0.8, aLr: 0.02, aLe: 1.3 });
    const legR = [limb(P.lRp, P.lRr, 1), limb(P.lRp - P.lRk, P.lRr, 1)], legL = [limb(P.lLp, P.lLr, -1), limb(P.lLp - P.lLk, P.lLr, -1)];
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
    const [elL, haL] = wpn.hands === 2 && !P.free ? reach(shL, add(haR, w, -3.4), R.upper, R.fore, -1) : arm(shL, P.aLp, P.aLr, P.aLe, -1);
    const back = [0, -1, 0], up = [0, 0, 1];
    const pts = { pelvis, hipR, hipL, kneeR, kneeL, footR, footL, toeR: add(footR, [0, R.foot, 0]), toeL: add(footL, [0, R.foot, 0]), chest, neck, shR, shL, head, elR, haR, elL, haL,
      wb: add(haR, w, -(wpn.hands === 2 ? 5.5 : 2.2)), wt: add(haR, w, wpn.len * R.k), wg: add(haR, w, 1.4),
      // A cape hangs from behind the shoulders and trails as he leans; a tabard hangs in front.
      capeA: add(neck, [0, -2.4, -1.5]), capeB: add(pelvis, [0, -3.5 - Math.max(0, P.lean) * 9, -R.thigh * 1.45 + Math.max(0, P.lean) * 4]),
      tabA: add(chest, rotZ([0, R.chestMin * 0.3, -2], P.tw * 0.5)), tabB: add(pelvis, [0, R.waistMin * 0.36 + Math.max(0, P.lean) * 3, -R.thigh * 0.95]),
      crA: add(head, add([0, R.headR * 0.55, 0], up, R.headR * 0.95)), crB: add(head, add(back, up, R.headR * 0.5)),
      tlA: add(head, back, R.headR * 0.85), tlB: add(neck, [1.5, -R.headR * 1.5, -R.spine * 0.45]) };
    // A roll turns the whole body about the hips, and lifts it so the lowest point stays on the ground.
    if (P.spin) {
      const piv = [0, 0, pelvis[2] * 0.55];
      for (const k of Object.keys(pts)) pts[k] = add(rotX(sub(pts[k], piv), -P.spin), piv);
      const lo = Math.min(...Object.values(pts).map((q) => q[2]));
      for (const k of Object.keys(pts)) pts[k] = [pts[k][0], pts[k][1], pts[k][2] - lo + 1];
    }
    // The shield faces forward and a little out, or straight ahead in a block or bash.
    const shN = rotX(nrm(rotZ(P.guard || P.bash ? [0.1, 1, 0.12] : [-0.25, 1, 0.1], P.tw)), -(P.spin || 0));
    const world = (v) => rotZ(rotX(v, P.fall), face);
    const project = (v) => { const q = world(v); return [OX + q[0], OY - q[1] * SP - q[2] * CP]; };
    const depthOf = (v) => { const q = world(v); return q[1] * CP - q[2] * SP; };
    return { P, pts, project, depthOf, world, face, shN, R };
  }

  // ---------- items and gear (the game's data pack, Skyrim's numbers) ----------
  const [WDATA, ADATA, SKILLS, PERKS] = await Promise.all(['weapons', 'armour', 'skills', 'perks'].map((n) => fetch(`../data/game/${n}.json`).then((r) => r.json())));
  const ITEMS = {};
  const SHAPES = {
    sword: { kind: 'blade', len: 14 }, scimitar: { kind: 'curved', len: 14 }, waraxe: { kind: 'axe', len: 11 }, mace: { kind: 'mace', len: 11 },
    dagger: { kind: 'blade', len: 7 }, greatsword: { kind: 'blade', len: 21 }, battleaxe: { kind: 'bigaxe', len: 19 }, warhammer: { kind: 'hammer', len: 18 },
    none: { kind: 'none', len: 4 },
  };
  const CLS = { sword: 'blade', scimitar: 'blade', greatsword: 'blade', waraxe: 'axe', battleaxe: 'axe', mace: 'blunt', warhammer: 'blunt', dagger: 'dagger' };
  for (const w of WDATA) {
    const shape = w.type === 'OneHandSword' ? (/Scimitar/.test(w.name) ? 'scimitar' : 'sword') : w.type === 'OneHandDagger' ? 'dagger' : w.type === 'OneHandAxe' ? 'waraxe' : w.type === 'OneHandMace' ? 'mace'
      : w.type === 'TwoHandSword' ? 'greatsword' : /Warhammer/.test(w.name) ? 'warhammer' : 'battleaxe';
    const metal = /^Steel|Scimitar/.test(w.edid) ? 'steel' : /^Orcish/.test(w.edid) ? 'orc' : 'iron';
    ITEMS[w.edid] = { ...w, cat: 'weapon', shape, metal, hands: w.type.startsWith('TwoHand') ? 2 : 1, cls: CLS[shape], skillName: w.type.startsWith('TwoHand') ? 'TwoHanded' : 'OneHanded' };
  }
  for (const a of ADATA) {
    const slot = a.slots.includes('Shield') ? 'shield' : a.slots.includes('Body') ? 'body' : a.slots.includes('Hands') ? 'hands' : a.slots.includes('Feet') ? 'feet' : 'head';
    ITEMS[a.edid] = { ...a, cat: 'apparel', slot };
  }
  Object.assign(ITEMS, {
    Fists: { edid: 'Fists', name: 'Fists', cat: 'none', damage: 4, speed: 1.2, reach: 0.7, weight: 0, value: 0, shape: 'none', metal: 'iron', hands: 1, cls: 'fist', skillName: null },
    PotionHealth: { edid: 'PotionHealth', name: 'Potion of Minor Healing', cat: 'potion', weight: 0.5, value: 17, heal: 25, desc: 'Restore 25 points of Health.' },
    Bandage: { edid: 'Bandage', name: 'Bandage', cat: 'potion', weight: 0.1, value: 3, heal: 8, desc: 'Stops bleeding and binds a wound. Restores 8 Health.' },
    Bread: { edid: 'Bread', name: 'Bread', cat: 'food', weight: 0.5, value: 2, heal: 4, desc: 'Restores 4 Health.' },
    Salt: { edid: 'Salt', name: 'Salt Pile', cat: 'misc', weight: 0.2, value: 2, desc: 'Coastal salt, bagged for trade.' },
    ChiefNote: { edid: 'ChiefNote', name: 'Orders from the Saltmaker', cat: 'misc', weight: 0, value: 0, note: true,
      desc: '"Keep the coast road shut until the tax rider has been through. Anyone who asks about Hegathe goes in the sea. Payment in salt, as before. K."' },
  });
  // The armour sets as the sample draws them: each piece changes its part of the figure.
  const SETS = {
    farm:    { name: 'Farm clothes', pieces: { body: 'ClothesFarmClothes01', feet: 'ClothesFarmBoots01' },
      body: { top: 'cream', sleeve: 'cream', fore: 'skin', pants: 'pants', belt: 'leather', pattern: 'tunic' }, feet: { boots: 'boot' } },
    hide:    { name: 'Hide', pieces: { body: 'ArmorHideCuirass', feet: 'ArmorHideBoots', head: 'ArmorHideHelmet' },
      body: { top: 'hide', sleeve: 'skin', fore: 'skin', pants: 'pants', belt: 'leather', collar: 'fur', pattern: 'stitch', necklace: true, pauldron: { ramp: 'fur', side: 'L' } }, feet: { boots: 'hide' },
      head: { helm: { ramp: 'hide', kind: 'cap', trim: 'fur' } } },
    fur:     { name: 'Fur', pieces: { body: 'ArmorBanditCuirass', hands: 'ArmorBanditGauntlets', feet: 'ArmorBanditBoots', head: 'ArmorBanditHelmet' },
      body: { top: 'fur', sleeve: 'skin', fore: 'skin', pants: 'pants', belt: 'boot', collar: 'fur', pattern: 'shag', pauldron: { ramp: 'fur', side: 'both' }, cape: 'fur' }, hands: { fore: 'fur' }, feet: { boots: 'fur' },
      head: { helm: { ramp: 'fur', kind: 'cap', trim: 'fur' } } },
    leather: { name: 'Leather', pieces: { body: 'ArmorLeatherCuirass', hands: 'ArmorLeatherGauntlets', feet: 'ArmorLeatherBoots', head: 'ArmorLeatherHelmet' },
      body: { top: 'leather', sleeve: 'leather', fore: 'skin', pants: 'boot', belt: 'brass', pattern: 'studs', straps: true, pauldron: { ramp: 'leather', side: 'L' } }, hands: { fore: 'leather', bracer: true }, feet: { boots: 'boot' },
      head: { helm: { ramp: 'leather', kind: 'cap' } } },
    alikr:   { name: "Alik'r garb", pieces: { body: 'ClothesRedguardClothes', feet: 'ClothesRedguardBoots', head: 'DBClothesRedguardHood' },
      body: { top: 'sand', sleeve: 'sand', fore: 'sand', pants: 'sand', belt: 'red', skirt: { ramp: 'sand', len: 0.85 }, vest: 'leather' }, feet: { boots: 'leather' },
      head: { hood: 'sand', mask: 'sand', tail: 'sand' } },
    iron:    { name: 'Iron', pieces: { body: 'ArmorIronCuirass', hands: 'ArmorIronGauntlets', feet: 'ArmorIronBoots', head: 'ArmorIronHelmet' },
      body: { top: 'iron', sleeve: 'iron', fore: 'iron', pants: 'pants', belt: 'leather', pattern: 'bands', mail: true, pauldron: { ramp: 'iron', side: 'both' }, skirt: { ramp: 'iron', len: 0.42, mail: true } },
      hands: { fore: 'iron', metalHands: true }, feet: { boots: 'iron' }, head: { helm: { ramp: 'iron', kind: 'nasal' } } },
    steel:   { name: 'Steel', pieces: { body: 'ArmorSteelCuirassA', hands: 'ArmorSteelGauntletsA', feet: 'ArmorSteelBootsB', head: 'ArmorSteelHelmetA' },
      body: { top: 'steel', sleeve: 'steel', fore: 'steel', pants: 'iron', belt: 'leather', pattern: 'plate', pauldron: { ramp: 'steel', side: 'both', layers: 2 }, skirt: { ramp: 'steel', len: 0.42 }, tabard: 'red', cape: 'red' },
      hands: { fore: 'steel', metalHands: true }, feet: { boots: 'steel' }, head: { helm: { ramp: 'steel', kind: 'closed', crest: 'red' } } },
    orcish:  { name: 'Orcish', pieces: { body: 'ArmorOrcishCuirass', hands: 'ArmorOrcishGauntlets', feet: 'ArmorOrcishBoots', head: 'ArmorOrcishHelmet' },
      body: { top: 'orc', sleeve: 'orc', fore: 'orc', pants: 'orc', belt: 'boot', pattern: 'edges', pauldron: { ramp: 'orc', side: 'both', spikes: true }, skirt: { ramp: 'orc', len: 0.42 }, cape: 'hair' },
      hands: { fore: 'orc', metalHands: true }, feet: { boots: 'orc' }, head: { helm: { ramp: 'orc', kind: 'horns' } } },
  };
  const SHIELDS = { ArmorHideShield: { shape: 'round', face: 'hide' }, ArmorIronShield: { shape: 'round', face: 'iron' }, ArmorSteelShield: { shape: 'kite', face: 'steel' }, ArmorOrcishShield: { shape: 'round', face: 'orc' } };
  const PIECE = {}; // edid -> [set, slot]
  for (const [k, s] of Object.entries(SETS)) for (const [slot, e] of Object.entries(s.pieces)) PIECE[e] = [k, slot];
  const PEOPLE = {
    kasim:    { skin: 'skin', hair: 'hair', beard: true },
    raider:   { skin: 'pale', hair: 'ginger', beard: true, hood: 'red', mask: 'red' },
    thug:     { skin: 'skin', hair: 'hair', beard: false, mask: 'red' },
    marauder: { skin: 'pale', hair: 'ginger', beard: true },
    chief:    { skin: 'skin', hair: 'hair', beard: true },
  };
  // A figure's look from who he is and what he wears, piece by piece.
  function lookFor(person, eq) {
    const h = PEOPLE[person], at = (slot) => (eq[slot] && PIECE[eq[slot]] ? SETS[PIECE[eq[slot]][0]][slot] : null);
    const look = { skin: h.skin, hair: h.hair, beard: h.beard, top: h.skin, sleeve: h.skin, fore: h.skin, pants: 'pants', belt: 'leather', boots: h.skin };
    Object.assign(look, at('body') || {}, at('hands') || {}, at('feet') || {});
    const head = at('head');
    if (head) Object.assign(look, head); else { look.hood = h.hood; look.mask = h.mask; }
    if (look.helm?.kind === 'closed' || look.helm?.kind === 'horns') look.beard = false;
    return look;
  }
  const weaponOf = (eq) => { const w = ITEMS[eq.weapon] || ITEMS.Fists, s = SHAPES[w.shape]; return { ...s, hands: w.hands, metal: w.metal, shield: w.hands === 1 && eq.shield ? SHIELDS[eq.shield] : null }; };

  // ---------- drawing a character ----------
  // cut: parts taken off (head, armR, armL). only: draw just that part (a severed piece). crushed: the head is pulp.
  function drawCharacter(look, wpn, pose, face, o = {}) {
    const g = rig(pose, face, wpn), R = g.R, p = new Px(SW, SH), S = (k) => g.project(g.pts[k]), Z = (k) => g.depthOf(g.pts[k]);
    const cut = o.cut || [], only = o.only || null, parts = [];
    const want = (grp) => (only ? grp === only : !cut.includes(grp));
    const push = (grp, z, draw) => { if (want(grp)) parts.push({ z, draw }); };
    const limbPart = (grp, a, b, t0, t1, ramp, opt) => push(grp, (Z(a) + Z(b)) / 2, () => { const [x0, y0] = S(a), [x1, y1] = S(b); rod(p, x0, y0, x1, y1, t0, t1, ramp, opt); });
    const metal = ['iron', 'steel', 'orc'].includes(look.top);
    const mailFn = (x, y, t, a, v) => ((x + y) % 2 === 0 ? tone(look.sleeve, v - 0.14, x, y) : null);
    const bootFn = (x, y, t, a, v) => (t > 0.55 ? tone(look.boots, v + (metal ? 0.05 : 0) + (t > 0.58 && t < 0.63 ? -0.15 : 0), x, y) : null);
    // a cape, behind or in front depending on which way he faces
    if (look.cape) push('body', (Z('capeA') + Z('capeB')) / 2 + 0.6, () => {
      const [x0, y0] = S('capeA'), [x1, y1] = S('capeB');
      rod(p, x0, y0, x1, y1, R.chestMin + 1, R.chestMin + 6, look.cape, { flat: true, tex: 0.1, fn: (x, y, t, a, v) => (t > 0.93 && hash(x, y, 31) < 0.45 ? false : (x + Math.round(y * 0.2)) % 3 === 0 ? tone(look.cape, v - 0.15, x, y) : null) });
    });
    // legs
    limbPart('body', 'hipR', 'kneeR', R.thighT, R.shinT + 0.6, look.pants); limbPart('body', 'kneeR', 'footR', R.shinT, R.shinT - 0.5, look.pants, { fn: bootFn });
    limbPart('body', 'hipL', 'kneeL', R.thighT, R.shinT + 0.6, look.pants); limbPart('body', 'kneeL', 'footL', R.shinT, R.shinT - 0.5, look.pants, { fn: bootFn });
    limbPart('body', 'footR', 'toeR', 3.4, 3, look.boots); limbPart('body', 'footL', 'toeL', 3.4, 3, look.boots);
    // torso
    const torsoZ = Z('chest') * 0.5 + Z('pelvis') * 0.5;
    const widths = () => { const [ax, ay] = S('shR'), [bx, by] = S('shL'), [hx, hy] = S('hipR'), [kx, ky] = S('hipL'); return [Math.max(R.chestMin, Math.hypot(ax - bx, ay - by) + 3), Math.max(R.waistMin, Math.hypot(hx - kx, hy - ky) + 3)]; };
    push('body', torsoZ, () => {
      const [px0, py0] = S('pelvis'), [cx, cy] = S('chest'), [top, bottom] = widths();
      rod(p, px0, py0 + 1, cx, cy - 1, bottom, top, look.top, { tex: look.pattern === 'shag' ? 0.3 : 0.08, fn: (x, y, t, a, v) => {
        if (t < 0.16) return look.belt === 'brass' ? ((x % 6 === 0) ? tone('brass', v + 0.1, x, y) : tone('leather', v - 0.05, x, y)) : tone(look.belt, v - 0.05, x, y);
        if (t < 0.2 && look.belt !== 'red') return tone('boot', v - 0.1, x, y);
        switch (look.pattern) {
          case 'studs': return (x + y * 3) % 9 === 0 && y % 3 === 0 && t > 0.22 ? tone('brass', v + 0.1, x, y) : null;
          case 'bands': return y % 4 === 0 ? tone(look.top, v - 0.2, x, y) : (y % 4 === 1 && x % 4 === 0 ? tone('iron', v + 0.25, x, y) : null);
          case 'plate': return Math.abs(a) < 0.12 && t > 0.3 ? tone(look.top, v + 0.2, x, y) : (t > 0.55 && t < 0.6 ? tone(look.top, v - 0.25, x, y) : t > 0.88 ? tone('brass', v, x, y) : null);
          case 'edges': return Math.abs(a) > 0.78 || (y % 6 === 0) ? tone('brass', v - 0.1, x, y) : null;
          case 'stitch': return (Math.abs(a) < 0.1 && y % 2 === 0) || hash(x >> 2, y >> 2, 5) < 0.2 ? tone('hide', v - 0.15, x, y) : null;
          case 'shag': return hash(x, y, 9) < 0.18 ? tone('fur', v + 0.15, x, y) : null;
          case 'tunic': return Math.abs(a) < 0.1 && t > 0.62 ? tone('cream', v - 0.18, x, y) : null;
        }
        return null;
      } });
      // An open jacket over a robe.
      if (look.vest) rod(p, px0, py0 - 2, cx, cy - 1, bottom + 1, top + 1, look.vest, { fn: (x, y, t, a, v) => (Math.abs(a) < 0.4 ? false : (t > 0.9 ? tone('brass', v, x, y) : null)) });
    });
    // a skirt of mail, plates or robe, over the torso's lower end
    if (look.skirt) push('body', torsoZ - 0.1, () => {
      const [px0, py0] = S('pelvis'), [k1x, k1y] = S('kneeR'), [k2x, k2y] = S('kneeL'), [, bottom] = widths();
      const mx = (k1x + k2x) / 2, my = (k1y + k2y) / 2, ex = px0 + (mx - px0) * look.skirt.len * 2, ey = py0 + (my - py0) * look.skirt.len * 2, w1 = Math.max(bottom + 2, Math.hypot(k1x - k2x, k1y - k2y) + 5);
      rod(p, px0, py0, ex, ey, bottom, w1 * (0.6 + look.skirt.len * 0.5), look.skirt.ramp, { fn: (x, y, t, a, v) => (t < 0.12 ? tone(look.belt, v - 0.05, x, y)
        : look.skirt.mail ? ((x + y) % 2 === 0 ? tone(look.skirt.ramp, v - 0.15, x, y) : null)
        : (x + (look.skirt.ramp === 'sand' ? 0 : y)) % 4 === 0 ? tone(look.skirt.ramp, v - 0.14, x, y) : null) });
    });
    // a tabard down the front
    if (look.tabard) push('body', (Z('tabA') + Z('tabB')) / 2 - 0.15, () => {
      const [x0, y0] = S('tabA'), [x1, y1] = S('tabB'), [top] = widths();
      rod(p, x0, y0, x1, y1, top * 0.42, top * 0.46, look.tabard, { flat: true, fn: (x, y, t, a, v) => (Math.abs(a) > 0.78 ? tone('brass', v, x, y) : t > 0.2 && t < 0.42 && Math.abs(a) < 0.25 ? tone('cream', v, x, y) : null) });
    });
    // crossed straps with studs
    if (look.straps) push('body', torsoZ - 0.05, () => {
      const [ax, ay] = S('shR'), [bx, by] = S('shL'), [hx, hy] = S('hipR'), [kx, ky] = S('hipL');
      for (const [x0, y0, x1, y1] of [[ax, ay + 1, kx, ky - 2], [bx, by + 1, hx, hy - 2]]) rod(p, x0, y0, x1, y1, 1.8, 1.8, 'boot', { fn: (x, y, t, a, v) => (Math.round(t * 12) % 3 === 0 ? tone('brass', v + 0.2, x, y) : null) });
    });
    if (look.collar) push('body', Z('neck') - 0.3, () => { const [cx, cy] = S('neck'); blob(p, cx, cy + 1, R.chestMin / 2 + 1, 3, look.collar, { rough: 0.35, seed: 7, tex: 0.3 }); });
    if (look.necklace) push('body', Z('chest') - 0.4, () => {
      for (let k = -2; k <= 2; k++) { const v3 = add(g.pts.chest, [k * 1.4, R.chestMin * 0.28, 1 - Math.abs(k) * 0.6]); if (g.depthOf(v3) > Z('chest')) continue; const [x, y] = g.project(v3); p.set(x, y, k % 2 ? RAMPS.bone[6] : RAMPS.bone[4]); }
    });
    // arms
    const foreFn = look.bracer ? (x, y, t, a, v) => (t > 0.4 ? tone('leather', v + (y % 3 === 0 ? -0.15 : 0), x, y) : null) : null;
    const sleeveOpt = look.mail ? { fn: mailFn } : undefined;
    limbPart('armR', 'shR', 'elR', R.upperT, R.foreT, look.sleeve, sleeveOpt); limbPart('armR', 'elR', 'haR', R.foreT, R.foreT - 0.4, look.fore, { fn: foreFn });
    limbPart('armL', 'shL', 'elL', R.upperT, R.foreT, look.sleeve, sleeveOpt); limbPart('armL', 'elL', 'haL', R.foreT, R.foreT - 0.4, look.fore, { fn: foreFn });
    const handRamp = look.metalHands ? look.fore : look.skin;
    push('armR', Z('haR') - 0.1, () => { const [x, y] = S('haR'); blob(p, x, y, 2, 2, handRamp, { tex: 0 }); });
    push('armL', Z('haL') - 0.1, () => { const [x, y] = S('haL'); blob(p, x, y, 1.9, 1.9, handRamp, { tex: 0 }); });
    const pd = look.pauldron;
    if (pd) for (const [grp, sh, side] of [['armR', 'shR', 'R'], ['armL', 'shL', 'L']]) {
      if (pd.side !== 'both' && pd.side !== side) continue;
      push(grp, Z(sh) - 0.4, () => {
        const [x, y] = S(sh), fur = pd.ramp === 'fur';
        blob(p, x, y - 1, 4.6, 3.4, pd.ramp, { rough: fur ? 0.4 : 0, tex: fur ? 0.3 : 0.05, bias: 0.05, fn: !fur && pd.ramp !== 'leather' ? (xx, yy, v) => (Math.hypot(xx + 0.5 - x, (yy + 0.5 - y + 1) * 1.35) > 3.8 ? tone('brass', v, xx, yy) : null) : null });
        if (pd.layers) blob(p, x, y + 1.6, 3.8, 2.4, pd.ramp, { tex: 0.05, bias: -0.05 });
        if (pd.spikes) for (const dx of [-1.5, 1.5]) rod(p, x + dx, y - 3, x + dx * 1.6 + (side === 'R' ? 1.5 : -1.5), y - 7.5, 1.6, 0.5, 'bone');
      });
    }
    // the weapon goes with the right arm, the shield with the left
    push('armR', (Z('wb') + Z('wt')) / 2 - 0.3, () => drawWeapon(p, wpn, S('wb'), S('haR'), S('wt'), S('wg')));
    if (wpn.shield) push('armL', Z('haL') - 0.6, () => drawShield(p, g, wpn.shield));
    // the head, or what is left of it
    if (o.crushed && !only) push('body', Z('head'), () => { const [x, y] = S('neck'); blob(p, x, y - 2, R.headR * 0.9, R.headR * 0.5, 'blood', { rough: 0.5, seed: 3, tex: 0.4, fn: (xx, yy, v) => (hash(xx, yy, 4) < 0.15 ? tone('bone', v + 0.2, xx, yy) : hash(xx, yy, 5) < 0.2 ? tone('meat', v, xx, yy) : null) }); });
    else {
      push('head', Z('head'), () => drawHead(p, look, g, S('head'), R.headR));
      if (look.tail) push('head', (Z('tlA') + Z('tlB')) / 2 + 0.2, () => { const [x0, y0] = S('tlA'), [x1, y1] = S('tlB'); rod(p, x0, y0, x1, y1, 3.2, 2, look.tail); });
      if (look.helm?.crest) push('head', Z('head') - 0.8, () => { const [x0, y0] = S('crA'), [x1, y1] = S('crB'); rod(p, x0, y0, x1, y1, 2.2, 1.2, look.helm.crest, { tex: 0.2 }); });
    }
    // stumps
    if (!only && cut.includes('head') && !o.crushed) push('body', Z('neck') - 0.5, () => { const [x, y] = S('neck'); blob(p, x, y - 1, 2.6, 1.8, 'meat', { tex: 0.2, fn: (xx, yy, v) => (hash(xx, yy, 6) < 0.3 ? tone('bone', v + 0.2, xx, yy) : null) }); });
    for (const [grp, sh] of [['armR', 'shR'], ['armL', 'shL']]) if (!only && cut.includes(grp)) push('body', Z(sh) - 0.5, () => { const [x, y] = S(sh); blob(p, x, y, 2.4, 2.4, 'meat', { tex: 0.2 }); });
    parts.sort((a, b) => b.z - a.z);
    for (const q of parts) q.draw();
    finish(p, 0.2);
    const pt = {}; for (const k of ['head', 'neck', 'shR', 'shL', 'chest', 'pelvis', 'haR', 'haL']) pt[k] = S(k);
    return { canvas: p.canvas(), blade: [S('wg'), S('wt')], pt };
  }

  function drawWeapon(p, w, base, hand, tip, guard) {
    const dx = tip[0] - hand[0], dy = tip[1] - hand[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy, ny = ux, m = w.metal;
    const at = (t, off = 0) => [hand[0] + dx * t + nx * off, hand[1] + dy * t + ny * off];
    const edge = (x, y, t, a, v) => (a < -0.2 ? tone(m, v + 0.25, x, y) : null);
    const trim = m === 'iron' ? 'iron' : 'brass';
    switch (w.kind) {
      case 'none': break;
      case 'blade': {
        rod(p, base[0], base[1], hand[0], hand[1], 1.7, 1.7, 'leather');
        rod(p, guard[0], guard[1], tip[0], tip[1], w.hands === 2 ? 2.6 : w.len < 9 ? 1.8 : 2.1, 1.1, m, { bias: 0.15, tex: 0.02, fn: edge });
        const gw = w.hands === 2 ? 3.6 : w.len < 9 ? 1.8 : 2.8;
        rod(p, guard[0] - nx * gw, guard[1] - ny * gw, guard[0] + nx * gw, guard[1] + ny * gw, 1.6, 1.6, trim);
        blob(p, base[0], base[1], 1.3, 1.3, trim, { tex: 0 });
        break;
      }
      case 'curved': {
        rod(p, base[0], base[1], hand[0], hand[1], 1.7, 1.7, 'leather');
        let prev = guard;
        for (let i = 1; i <= 6; i++) { const t = i / 6, q = at(0.1 + t * 0.9, 3.2 * t * t); rod(p, prev[0], prev[1], q[0], q[1], 2.4 - t * 1.1, 2.4 - t * 1.2, m, { bias: 0.15, tex: 0.02, fn: edge }); prev = q; }
        rod(p, guard[0] - nx * 2.4, guard[1] - ny * 2.4, guard[0] + nx * 2.4, guard[1] + ny * 2.4, 1.5, 1.5, 'brass');
        break;
      }
      case 'axe': case 'bigaxe': {
        rod(p, base[0], base[1], tip[0], tip[1], w.hands === 2 ? 2.2 : 1.9, w.hands === 2 ? 2.2 : 1.9, 'wood', { tex: 0.1 });
        const s = w.hands === 2 ? 1.45 : 1, [hx, hy] = at(0.86);
        poly(p, [[hx - ux * 2, hy - uy * 2], [hx + nx * 5.5 * s - ux * 4 * s, hy + ny * 5.5 * s - uy * 4 * s], [hx + nx * 6.5 * s + ux * 3.5 * s, hy + ny * 6.5 * s + uy * 3.5 * s], [hx + ux * 2.4, hy + uy * 2.4]],
          (x, y, u, v) => tone(m, 0.66 - v * 0.25 + (hash(x, y, 5) < 0.1 ? -0.2 : 0), x, y));
        if (w.hands === 2) poly(p, [[hx - ux * 1.5, hy - uy * 1.5], [hx - nx * 4 - ux * 2, hy - ny * 4 - uy * 2], [hx - nx * 4 + ux * 2, hy - ny * 4 + uy * 2], [hx + ux * 1.5, hy + uy * 1.5]], (x, y, u, v) => tone(m, 0.5 - v * 0.2, x, y));
        break;
      }
      case 'mace': {
        rod(p, base[0], base[1], tip[0], tip[1], 1.8, 1.8, m, { tex: 0.04 });
        blob(p, tip[0], tip[1], 3.2, 3.2, m, { tex: 0.05, bias: 0.1, fn: (x, y, v) => ((x + y) % 3 === 0 ? tone(m, v - 0.25, x, y) : null) });
        break;
      }
      case 'hammer': {
        rod(p, base[0], base[1], tip[0], tip[1], 2.1, 2.1, 'wood', { tex: 0.1 });
        const [hx, hy] = at(0.95);
        poly(p, [[hx - nx * 5 - ux * 2.6, hy - ny * 5 - uy * 2.6], [hx + nx * 5 - ux * 2.6, hy + ny * 5 - uy * 2.6], [hx + nx * 5 + ux * 2.6, hy + ny * 5 + uy * 2.6], [hx - nx * 5 + ux * 2.6, hy - ny * 5 + uy * 2.6]],
          (x, y, u, v) => tone(m, 0.62 - v * 0.3 + (u > 0.85 || u < 0.15 ? -0.15 : 0), x, y));
        break;
      }
    }
  }

  // A shield is a disc (or a kite) in 3D, held on the left hand: the painted face if it faces
  // the viewer, the planks and strap if not.
  function drawShield(p, g, sh) {
    const C = g.pts.haL, n = g.shN, up = [0, 0, 1];
    let u = cross3(up, n); u = nrm(len3(u) < 0.1 ? [1, 0, 0] : u); const v = cross3(n, u);
    const r = sh.shape === 'kite' ? 7.6 : 8.2;
    const outline = sh.shape === 'kite' ? [[-1, 0.75], [1, 0.75], [0.95, -0.15], [0, -1.35], [-0.95, -0.15]] : Array.from({ length: 16 }, (_, i) => [Math.cos((i / 16) * 2 * Math.PI), Math.sin((i / 16) * 2 * Math.PI)]);
    const pt2 = (a, b) => g.project(add(add(C, u, a * r), v, b * r));
    const c2 = g.project(C), pu = sub2(pt2(1, 0), c2), pv = sub2(pt2(0, 1), c2), det = pu[0] * pv[1] - pu[1] * pv[0];
    const nw = g.world(n), facing = dot3(nw, TO_VIEWER) > 0;
    const light = nw[0] * L[0] + dot3(nw, CAM_UP) * L[1] + dot3(nw, TO_VIEWER) * L[2];
    poly(p, outline.map(([a, b]) => pt2(a, b)), (x, y) => {
      const dx = x + 0.5 - c2[0], dy = y + 0.5 - c2[1];
      const a = Math.abs(det) > 0.5 ? (dx * pv[1] - dy * pv[0]) / det : 0, b = Math.abs(det) > 0.5 ? (pu[0] * dy - pu[1] * dx) / det : 0, rr = Math.hypot(a, b);
      const base = 0.42 + light * 0.3 + 0.08 * (fbm(x * 0.4, y * 0.4, 47) - 0.5);
      if (!facing) return tone('wood', base - 0.12 + (Math.round(a * 4) % 2 ? -0.08 : 0) + (Math.abs(b) < 0.12 ? -0.25 : 0), x, y);
      const rim = sh.shape === 'kite' ? (Math.abs(a) > 0.82 || b > 0.6 || (b < -0.05 && Math.abs(a) > 0.82 + b * 0.62)) : rr > 0.82;
      switch (sh.face) {
        case 'hide': return rr < 0.2 ? tone('iron', base + 0.15, x, y) : rim ? tone('fur', base, x, y) : (Math.abs(a - b) < 0.06 || Math.abs(a + b) < 0.06) ? tone('leather', base - 0.15, x, y) : tone('hide', base + 0.05, x, y);
        case 'iron': return rr < 0.22 ? tone('iron', base + 0.25, x, y) : rim || Math.abs(b) < 0.08 ? tone('iron', base, x, y) : tone('wood', base + (Math.round(a * 4) % 2 ? -0.06 : 0), x, y);
        case 'steel': return rim ? tone('brass', base, x, y) : b > 0.15 ? tone('red', base, x, y) : Math.abs(a) < 0.1 ? tone('steel', base + 0.25, x, y) : tone('steel', base + 0.05, x, y);
        case 'orc': return rr < 0.18 ? tone('bone', base + 0.2, x, y) : rim ? tone('brass', base - 0.05, x, y) : (Math.round(Math.atan2(b, a) * 3) % 2 ? tone('orc', base, x, y) : tone('orc', base - 0.1, x, y));
      }
      return null;
    });
  }

  // The head: a sphere coloured by where each pixel faces on the body: hair on top and behind,
  // a beard, mask or helmet, and eyes where they face the viewer.
  function drawHead(p, look, g, [cx, cy], r) {
    const back = (n) => rotX(rotZ(n, -g.face), -g.P.fall), helm = look.helm;
    for (let y = Math.floor(cy - r - 2); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const nx = (x + 0.5 - cx) / r, ny = -(y + 0.5 - cy) / (r * 1.08), rr = nx * nx + ny * ny;
      if (rr > 1) continue;
      const nz = Math.sqrt(1 - rr), n = back(add(add([nx, 0, 0], CAM_UP, ny), TO_VIEWER, nz)), v = (nx * L[0] + ny * L[1] + nz * L[2]) * 0.62 + 0.3;
      const fwd = n[1], upn = n[2], side = n[0];
      let ramp = look.skin, vv = v;
      if (look.hood) { if (fwd < 0.45 || upn > 0.38 || Math.abs(side) > 0.75) { ramp = look.hood; vv -= 0.05; } }
      else if (upn > 0.5 - Math.max(0, -fwd) * 1.0 || fwd < -0.3) ramp = look.hair;
      if (look.mask && fwd > 0.3 && upn < -0.15) { ramp = look.mask; vv -= 0.08; }
      if (look.beard && fwd > 0.35 && upn < -0.45) { ramp = look.hair; vv += 0.12; }
      if (helm) {
        const slit = fwd > 0.55 && upn > -0.05 && upn < 0.22;
        if (helm.kind === 'cap' && (upn > 0.22 || fwd < -0.1)) { ramp = helm.trim && upn < 0.36 && upn > 0.22 ? helm.trim : helm.ramp; vv += 0.05; }
        if (helm.kind === 'nasal' && (upn > 0.2 || fwd < -0.2 || (fwd > 0.7 && Math.abs(side) < 0.12 && upn > -0.2))) { ramp = helm.ramp; vv += 0.1; if (upn > 0.2 && upn < 0.3) vv -= 0.2; }
        if (helm.kind === 'closed' || helm.kind === 'horns') { ramp = slit ? '#0b0907' : helm.ramp; vv += 0.1; if (!slit && fwd > 0.6 && Math.abs(side) < 0.08) vv += 0.2; if (helm.kind === 'horns' && upn < -0.3 && fwd > 0.3) ramp = 'brass'; }
      }
      p.set(x, y, ramp.startsWith('#') ? ramp : tone(ramp, vv, x, y));
    }
    if (helm?.kind === 'horns') for (const s of [-1, 1]) {
      const a = rotZ(rotX([s * 0.8, 0.1, 0.55], g.P.fall), g.face), b = rotZ(rotX([s * 1.35, 0.2, 1.15], g.P.fall), g.face);
      const P2 = (q) => [cx + q[0] * r, cy - (q[1] * SP + q[2] * CP) * r];
      const [x0, y0] = P2(a), [x1, y1] = P2(b); rod(p, x0, y0, x1, y1, 2.4, 0.8, 'bone');
    }
    if (helm && helm.kind !== 'cap') return;
    for (const s of [-1, 1]) {
      const ew = rotZ(rotX([s * 0.36, 0.86, 0.12], g.P.fall), g.face);
      if (dot3(ew, TO_VIEWER) < 0.25) continue;
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
    show: { frames: [{ d: 1000, pose: { tw: 0.1, aRp: 1.45, aRr: 0.1, aRe: 0.05, wy: 0, wp: 25 } }] },
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
    block: { loop: true, frames: [{ d: 1000, pose: { guard: true, tw: 0.25, lean: 0.08, aRp: 1.25, aRr: -0.1, aRe: 1.15, wy: -80, wp: 22, aLp: 0.9, aLe: 1.5, lRk: 0.35, lLk: 0.3, lLp: 0.15 } }] },
    // With a shield the blade stays ready behind it.
    shieldBlock: { loop: true, frames: [{ d: 1000, pose: { guard: true, tw: 0.2, lean: 0.1, aRp: 0.6, aRr: 0.5, aRe: 1.2, wy: 40, wp: 50, lRk: 0.4, lLk: 0.3, lLp: 0.2 } }] },
    // A dodge is a quick hop out of the way; a roll (below) goes further and keeps you safe longer.
    dodge: { frames: [
      { d: 40, pose: { lean: -0.12, lRp: 0.25, lLp: -0.25, lRk: 0.7, lLk: 0.7, aRp: 0.55, aLp: 0.6, aLr: 0.6 } },
      { d: 150, pose: { lean: -0.2, lRp: 0.45, lLp: -0.45, lRk: 0.35, lLk: 0.95, lRr: 0.3, lLr: 0.3, aRp: 0.6, aLp: 0.7, aLr: 0.7 } },
      { d: 90, pose: { lean: 0.05, lRk: 0.45, lLk: 0.35 } },
    ] },
    roll: { frames: Array.from({ length: 8 }, (_, i) => ({ d: 50, pose: { spin: (i / 8) * 2 * Math.PI, lean: 0.9, lRp: 1.5, lRk: 2.2, lLp: 1.4, lLk: 2.2, aRp: 0.9, aRe: 1.7, aLp: 0.9, aLe: 1.7, wy: 90, wp: -60, free: true } })) },
    bash: { frames: [
      { d: 70, pose: { bash: false, guard: true, tw: 0.3, lean: 0.05, aRp: 0.6, aRr: 0.5, aRe: 1.2, wy: 40, wp: 50, lRp: -0.2, lLp: 0.2 } },
      { d: 45, hit: true, pose: { bash: true, tw: -0.45, lean: 0.4, aLp: 1.5, aLr: -0.15, aLe: 0.15, aRp: 0.5, aRr: 0.6, aRe: 1.3, wy: 50, wp: 50, lRp: -0.35, lLp: 0.5, lLk: 0.4 } },
      { d: 160, pose: { bash: true, tw: -0.4, lean: 0.35, aLp: 1.4, aLr: -0.1, aLe: 0.25, aRp: 0.5, aRr: 0.6, aRe: 1.3, wy: 50, wp: 50, lRp: -0.3, lLp: 0.45, lLk: 0.35 } },
      { d: 120, pose: { tw: 0, lean: 0.1 } },
    ] },
    // Fury: gather, then throw the arms wide, head back, and roar.
    roar: { frames: [
      { d: 150, pose: { lean: 0.55, lRk: 0.8, lLk: 0.8, lRp: 0.35, lLp: 0.1, aRp: 0.35, aRe: 1.9, aLp: 0.35, aLe: 1.9, aRr: -0.2, aLr: -0.2, wy: 90, wp: -60, free: true } },
      { d: 650, hit: true, pose: { lean: -0.38, tw: 0, aRp: 2.3, aRr: 1.35, aRe: 0.35, aLp: 2.3, aLr: 1.35, aLe: 0.35, wy: 60, wp: 120, lRp: -0.3, lLp: 0.35, lRk: 0.25, lLk: 0.25, lRr: 0.35, lLr: 0.35, free: true } },
      { d: 180, pose: { lean: 0.1, aRp: 1.0, aRr: 0.4, aRe: 0.6, aLp: 0.6, aLr: 0.4, wy: 30, wp: 40 } },
    ] },
    impaled: { hold: true, frames: [{ d: 99999, pose: { lean: -0.45, tw: 0.1, aRp: 0.9, aRr: 1.2, aRe: 0.3, aLp: 0.9, aLr: 1.2, aLe: 0.3, wy: 90, wp: -70, lRk: 0.35, lLk: 0.25, free: true } }] },
    hit: { frames: [
      { d: 70, pose: { lean: -0.35, tw: -0.35, aLp: 0.9, aLr: 0.8, aLe: 0.2, aRp: 0.5, aRr: 0.6, wy: 60, wp: 10, lRk: 0.3, free: true } },
      { d: 100, pose: { lean: -0.25, tw: -0.2, aLp: 0.6, aLr: 0.5, aRp: 0.55, aRr: 0.4, wy: 40, wp: 20, lRk: 0.3, free: true } },
      { d: 120, pose: { lean: -0.08, tw: 0.05 } },
    ] },
    stagger: { hold: true, frames: [
      { d: 80, pose: { lean: -0.3, tw: -0.3, aLp: 0.8, aLr: 0.7, aRp: 0.4, aRr: 0.6, wy: 70, wp: -20, lRk: 0.4, free: true } },
      { d: 99999, pose: { lean: 0.55, tw: 0.2, aLp: 0.5, aLe: 0.9, aRp: 0.25, aRr: 0.3, aRe: 0.3, wy: 60, wp: -60, lRp: 0.35, lRk: 0.75, lLp: -0.1, lLk: 0.5, free: true } },
    ] },
    kneel: { hold: true, frames: [
      { d: 120, pose: { lean: 0.4, lRp: 0.9, lRk: 1.0, lLp: -0.05, lLk: 1.2, aRp: 0.2, aRe: 0.2, aLp: 0.3, aLe: 0.4, wy: 90, wp: -70, free: true } },
      { d: 99999, pose: { lean: 0.5, lRp: 1.45, lRk: 1.5, lLp: -0.05, lLk: 1.75, aRp: 0.1, aRr: 0.3, aRe: 0.2, aLp: 0.15, aLe: 0.3, wy: 90, wp: -80, free: true } },
    ] },
    clutch: { hold: true, frames: [{ d: 99999, pose: { lean: -0.25, tw: 0.1, aRp: 1.9, aRr: -0.5, aRe: 1.9, aLp: 1.9, aLr: -0.5, aLe: 1.9, wy: 100, wp: -60, lRk: 0.4, lLk: 0.3, free: true } }] },
    death: { hold: true, frames: [
      { d: 90, pose: { lean: -0.35, tw: -0.4, aLp: 1.0, aLr: 0.9, aRp: 0.6, aRr: 0.9, wy: 80, wp: 0, lRk: 0.4, lLk: 0.3, free: true } },
      { d: 90, pose: { fall: 0.45, lean: -0.2, tw: -0.3, aLp: 1.6, aLr: 1.0, aRp: 1.4, aRr: 1.1, wy: 90, wp: 30, lRk: 0.8, lLk: 0.6, lRp: 0.5, lLp: 0.3, free: true } },
      { d: 80, pose: { fall: 1.0, lean: 0, aLp: 2.2, aLr: 1.0, aRp: 2.0, aRr: 1.2, wy: 100, wp: 60, lRk: 0.7, lLk: 0.5, lRp: 0.5, lLp: 0.35, free: true } },
      { d: 70, pose: { fall: 1.5, lean: 0.1, aLp: 2.6, aLr: 1.1, aRp: 2.4, aRr: 1.3, wy: 110, wp: 80, lRk: 0.4, lLk: 0.3, lRp: 0.3, lLp: 0.2, free: true } },
      { d: 90, pose: { fall: 1.42, lean: 0.12, aLp: 2.7, aLr: 1.2, aRp: 2.5, aRr: 1.35, wy: 110, wp: 85, lRk: 0.3, lLk: 0.2, lRp: 0.25, lLp: 0.15, free: true } },
      { d: 99999, pose: { fall: 1.57, lean: 0.1, aLp: 2.8, aLr: 1.2, aRp: 2.6, aRr: 1.4, wy: 110, wp: 88, lRk: 0.25, lLk: 0.15, lRp: 0.2, lLp: 0.1, free: true } },
    ] },
    fin_behead: { frames: [
      { d: 110, pose: { tw: -0.8, lean: -0.1, aRp: 1.3, aRr: 1.2, aRe: 1.0, wy: 150, wp: 15, lRp: -0.3, lLp: 0.45, lLk: 0.35, lRk: 0.3 } },
      { d: 260, pose: { tw: -0.95, lean: -0.12, aRp: 1.35, aRr: 1.3, aRe: 1.05, wy: 165, wp: 10, lRp: -0.35, lLp: 0.5, lLk: 0.45, lRk: 0.35 } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.2, lean: 0.2, aRp: 1.45, aRr: 0.2, aRe: 0.0, wy: 0, wp: -12, lRp: -0.4, lLp: 0.55, lLk: 0.5, lRk: 0.4 } },
      { d: 60, smear: true, pose: { tw: 0.9, lean: 0.25, aRp: 1.25, aRr: -0.8, aRe: 0.1, wy: -140, wp: -20, lRp: -0.4, lLp: 0.55, lLk: 0.5, lRk: 0.4 } },
      { d: 600, pose: { tw: 0.95, lean: 0.2, aRp: 1.0, aRr: -0.85, aRe: 0.2, wy: -155, wp: -40, lRp: -0.35, lLp: 0.5, lLk: 0.45 } },
      { d: 200, pose: { tw: 0.3, lean: 0.08, aRp: 0.8, aRr: -0.2, aRe: 0.5, wy: -30, wp: 20 } },
    ] },
    fin_cleave: { frames: [
      { d: 120, pose: { tw: -0.4, lean: -0.2, aRp: 2.8, aRr: 0.5, aRe: 0.6, aLp: 2.4, aLe: 0.7, wy: 30, wp: 135, lRp: -0.25, lLp: 0.45, lLk: 0.35 } },
      { d: 260, pose: { tw: -0.5, lean: -0.25, aRp: 3.0, aRr: 0.55, aRe: 0.7, aLp: 2.6, aLe: 0.8, wy: 35, wp: 150, lRp: -0.3, lLp: 0.5, lLk: 0.45 } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.2, lean: 0.4, aRp: 1.6, aRr: 0.2, aRe: 0.0, aLp: 1.3, aLe: 0.3, wy: -20, wp: 5, lRp: -0.45, lLp: 0.6, lLk: 0.7, lRk: 0.45 } },
      { d: 70, smear: true, pose: { tw: 0.35, lean: 0.5, aRp: 0.9, aRr: 0.1, aRe: 0.0, aLp: 0.8, aLe: 0.3, wy: -40, wp: -50, lRp: -0.45, lLp: 0.65, lLk: 0.8, lRk: 0.5 } },
      { d: 600, pose: { tw: 0.3, lean: 0.45, aRp: 0.85, aRe: 0.1, aLp: 0.75, wy: -40, wp: -55, lRp: -0.4, lLp: 0.6, lLk: 0.75, lRk: 0.45 } },
      { d: 220, pose: { lean: 0.15, aRp: 0.85, aRe: 0.4, wy: 5, wp: 10 } },
    ] },
    fin_crush: { frames: [
      { d: 130, pose: { tw: -0.15, lean: -0.25, aRp: 2.9, aRr: 0.15, aRe: 0.4, aLp: 2.6, aLe: 0.5, wy: 0, wp: 150, lRp: -0.25, lLp: 0.45 } },
      { d: 280, pose: { tw: -0.2, lean: -0.32, aRp: 3.1, aRr: 0.1, aRe: 0.5, aLp: 2.8, aLe: 0.6, wy: 0, wp: 165, lRp: -0.3, lLp: 0.5, lLk: 0.4 } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.05, lean: 0.45, aRp: 1.5, aRr: 0.05, aRe: 0.0, aLp: 1.3, aLe: 0.2, wy: 0, wp: -10, lRp: -0.5, lLp: 0.6, lLk: 0.8, lRk: 0.55 } },
      { d: 70, pose: { tw: 0.05, lean: 0.55, aRp: 1.1, aRe: 0.0, aLp: 1.0, aLe: 0.2, wy: 0, wp: -55, lRp: -0.5, lLp: 0.65, lLk: 0.9, lRk: 0.6 } },
      { d: 600, pose: { tw: 0.05, lean: 0.5, aRp: 1.05, aRe: 0.05, aLp: 0.95, wy: 0, wp: -60, lRp: -0.45, lLp: 0.6, lLk: 0.85, lRk: 0.55 } },
      { d: 220, pose: { lean: 0.15, aRp: 0.85, aRe: 0.4, wy: 5, wp: 10 } },
    ] },
    // Run through: draw back, thrust, hold him on the blade, then kick him off it.
    fin_impale: { frames: [
      { d: 120, pose: { tw: -0.6, lean: -0.1, aRp: 0.7, aRr: 0.3, aRe: 1.6, wy: 0, wp: 0, lRp: -0.25, lLp: 0.4, lLk: 0.3, aLp: 0.9, aLr: 0.4 } },
      { d: 220, pose: { tw: -0.75, lean: -0.15, aRp: 0.55, aRr: 0.35, aRe: 1.8, wy: 0, wp: 5, lRp: -0.3, lLp: 0.45, lLk: 0.4, aLp: 1.0, aLr: 0.5 } },
      { d: 45, hit: true, pose: { tw: 0.35, lean: 0.4, aRp: 1.55, aRr: 0.05, aRe: 0.0, wy: 0, wp: 2, lRp: -0.5, lLp: 0.65, lLk: 0.55, lRk: 0.3, aLp: 0.4, aLr: 0.6 } },
      { d: 520, pose: { tw: 0.3, lean: 0.35, aRp: 1.5, aRr: 0.05, aRe: 0.05, wy: 0, wp: 10, lRp: -0.45, lLp: 0.6, lLk: 0.5, lRk: 0.3, aLp: 0.4, aLr: 0.6 } },
      { d: 60, hit: true, pose: { tw: 0.1, lean: -0.15, aRp: 1.1, aRe: 0.6, wy: 0, wp: 15, lRp: 1.25, lRk: 0.15, lLp: -0.1, lLk: 0.3 } },
      { d: 260, pose: { tw: 0.05, lean: -0.05, aRp: 0.9, aRe: 0.7, wy: 10, wp: 30, lRp: 0.5, lRk: 0.5 } },
    ] },
    // Split the skull: an overhead blow that sticks, then the axe wrenched free.
    fin_headsplit: { frames: [
      { d: 130, pose: { tw: -0.2, lean: -0.25, aRp: 2.9, aRr: 0.2, aRe: 0.5, aLp: 2.5, aLe: 0.6, wy: 0, wp: 145, lRp: -0.25, lLp: 0.45 } },
      { d: 260, pose: { tw: -0.25, lean: -0.3, aRp: 3.05, aRr: 0.15, aRe: 0.6, aLp: 2.7, aLe: 0.7, wy: 0, wp: 160, lRp: -0.3, lLp: 0.5, lLk: 0.4 } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.05, lean: 0.4, aRp: 1.6, aRr: 0.05, aRe: 0.05, aLp: 1.4, aLe: 0.2, wy: 0, wp: -5, lRp: -0.45, lLp: 0.6, lLk: 0.75, lRk: 0.5 } },
      { d: 480, pose: { tw: 0.05, lean: 0.42, aRp: 1.55, aRe: 0.05, aLp: 1.35, aLe: 0.2, wy: 0, wp: -8, lRp: -0.45, lLp: 0.6, lLk: 0.75, lRk: 0.5 } },
      { d: 60, hit: true, pose: { tw: -0.1, lean: -0.1, aRp: 2.1, aRe: 0.3, aLp: 1.8, aLe: 0.4, wy: 0, wp: 70, lRp: -0.2, lLp: 0.3 } },
      { d: 260, pose: { lean: 0.05, aRp: 1.0, aRe: 0.5, wy: 5, wp: 30 } },
    ] },
    // Break the leg, then the skull.
    fin_legbreak: { frames: [
      { d: 110, pose: { tw: -0.7, lean: 0.2, aRp: 0.6, aRr: 1.2, aRe: 0.4, wy: 120, wp: -40, lRp: -0.3, lLp: 0.45, lLk: 0.6, lRk: 0.5 } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.4, lean: 0.45, aRp: 0.7, aRr: -0.2, aRe: 0.1, wy: -40, wp: -55, lRp: -0.4, lLp: 0.6, lLk: 0.8, lRk: 0.6 } },
      { d: 160, pose: { tw: 0.2, lean: 0.1, aRp: 2.4, aRr: 0.2, aRe: 0.5, aLp: 2.1, aLe: 0.6, wy: 0, wp: 120, lRp: -0.25, lLp: 0.4 } },
      { d: 200, pose: { tw: -0.2, lean: -0.3, aRp: 3.05, aRr: 0.1, aRe: 0.5, aLp: 2.8, aLe: 0.6, wy: 0, wp: 165, lRp: -0.3, lLp: 0.5, lLk: 0.4 } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.05, lean: 0.5, aRp: 1.3, aRr: 0.05, aRe: 0.0, aLp: 1.2, aLe: 0.2, wy: 0, wp: -40, lRp: -0.5, lLp: 0.65, lLk: 0.9, lRk: 0.6 } },
      { d: 520, pose: { tw: 0.05, lean: 0.5, aRp: 1.05, aRe: 0.05, aLp: 0.95, wy: 0, wp: -60, lRp: -0.45, lLp: 0.6, lLk: 0.85, lRk: 0.55 } },
      { d: 220, pose: { lean: 0.15, aRp: 0.85, aRe: 0.4, wy: 5, wp: 10 } },
    ] },
    // Hold him by the collar and stab, three times.
    fin_stabs: { frames: [
      { d: 100, pose: { tw: 0.3, lean: 0.25, aLp: 1.6, aLr: -0.2, aLe: 0.2, aRp: 0.6, aRr: 0.3, aRe: 1.6, wy: 0, wp: 0, lRp: -0.2, lLp: 0.45, lLk: 0.3, free: true } },
      ...[0, 1, 2].flatMap((k) => [
        { d: 40, hit: true, pose: { tw: 0.45, lean: 0.35, aLp: 1.6, aLr: -0.2, aLe: 0.2, aRp: 1.45, aRr: 0.05, aRe: 0.1, wy: 0, wp: -5, lRp: -0.25, lLp: 0.5, lLk: 0.35, free: true } },
        { d: k === 2 ? 420 : 170, pose: { tw: 0.2, lean: 0.25, aLp: 1.6, aLr: -0.2, aLe: 0.2, aRp: 0.6, aRr: 0.3, aRe: 1.6, wy: 0, wp: 0, lRp: -0.2, lLp: 0.45, lLk: 0.3, free: true } },
      ]),
      { d: 200, pose: { tw: 0.1, lean: 0.05 } },
    ] },
    fin_throat: { frames: [
      { d: 90, pose: { tw: 0.3, lean: 0.25, aLp: 1.6, aLr: -0.2, aLe: 0.2, aRp: 1.4, aRr: 1.1, aRe: 1.3, wy: 120, wp: 0, lRp: -0.2, lLp: 0.45, lLk: 0.3, free: true } },
      { d: 280, pose: { tw: 0.35, lean: 0.3, aLp: 1.7, aLr: -0.25, aLe: 0.15, aRp: 1.5, aRr: 1.2, aRe: 1.4, wy: 135, wp: 0, lRp: -0.25, lLp: 0.5, lLk: 0.35, free: true } },
      { d: 40, smear: true, hit: true, pose: { tw: 0.5, lean: 0.3, aLp: 1.7, aLr: -0.25, aLe: 0.15, aRp: 1.6, aRr: -0.2, aRe: 0.6, wy: -60, wp: 0, lRp: -0.25, lLp: 0.5, lLk: 0.35, free: true } },
      { d: 60, smear: true, pose: { tw: 0.7, lean: 0.25, aLp: 1.4, aLr: -0.2, aLe: 0.3, aRp: 1.4, aRr: -0.7, aRe: 0.5, wy: -130, wp: -10, free: true } },
      { d: 650, pose: { tw: 0.5, lean: 0.12, aLp: 0.6, aLe: 0.4, aRp: 0.9, aRr: -0.5, aRe: 0.5, wy: -100, wp: -20 } },
      { d: 200, pose: { tw: 0.2, lean: 0.05 } },
    ] },
  };
  ANIMS.enemySlash = { attack: true, frames: ANIMS.slash1.frames.map((f, i) => (i === 1 ? { ...f, d: 380, glow: true } : f)) };
  ANIMS.enemyChop = { attack: true, frames: ANIMS.chop.frames.map((f, i) => (i === 1 ? { ...f, d: 480, glow: true } : f)) };
  const COMBO = ['slash1', 'slash2', 'chop'], SWINGS = [...COMBO, 'power'];
  // Two finishers per weapon class, taken in turn; the victim kneels for some and stands for others.
  const FINISHERS = { blade: ['behead', 'impale'], axe: ['cleave', 'headsplit'], blunt: ['crush', 'legbreak'], dagger: ['throat', 'stabs'], fist: ['crush'] };
  const KNEELS = { behead: true, cleave: true, headsplit: true, crush: true };
  const FIN_NAMES = { behead: 'Beheaded', impale: 'Run through', cleave: 'Cleaved', headsplit: 'Skull split', crush: 'Skull crushed', legbreak: 'Leg broken, then the skull', throat: 'Throat cut', stabs: 'Stabbed' };
  const finTurn = {};

  // ---------- frames, cached ----------
  const cache = new Map();
  const eqKey = (eq) => `${eq.body}.${eq.hands}.${eq.feet}.${eq.head}.${eq.weapon}.${eq.shield}`;
  function frameOf(f, anim = f.anim, i = f.fi, face = f.face, extra = {}) {
    const cut = extra.cut ?? f.cut, crushed = extra.crushed ?? f.crushed, only = extra.only ?? null;
    const key = `${f.person}|${eqKey(f.eq)}|${anim}|${i}|${face.toFixed(3)}|${cut.join(',')}|${crushed ? 1 : 0}|${only}`;
    let r = cache.get(key);
    if (!r) {
      if (cache.size > 8000) cache.clear();
      r = drawCharacter(lookFor(f.person, f.eq), weaponOf(f.eq), ANIMS[anim].frames[i].pose, face, { cut, crushed, only });
      cache.set(key, r);
    }
    return r;
  }
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

  // ---------- item pictures for the menus ----------
  const icons = {};
  function icon(edid) {
    if (icons[edid]) return icons[edid];
    const it = ITEMS[edid]; let c;
    if (it?.cat === 'weapon') {
      const p = new Px(84, 40), s = SHAPES[it.shape], k = 2.2, Lw = s.len * RIG.k * k, ang = -0.5, ux = Math.cos(ang), uy = Math.sin(ang), hx = 42 - ux * Lw * 0.42, hy = 20 - uy * Lw * 0.42;
      const at = (d) => [hx + ux * d, hy + uy * d];
      drawWeapon(p, { kind: s.kind, len: s.len * k, hands: it.hands, metal: it.metal }, at(-(it.hands === 2 ? 11 : 5)), at(0), at(Lw), at(3));
      c = finish(p, 0.25).canvas();
    } else if (it?.cat === 'apparel' && it.slot === 'shield') {
      c = crop(drawCharacter(lookFor('kasim', {}), weaponOf({ weapon: 'IronSword', shield: edid }), { guard: true, tw: 0, aLp: 1.3 }, Math.PI, {}).canvas).canvas;
    } else if (it?.cat === 'apparel') {
      const eq = { [it.slot]: edid }; if (it.slot !== 'body') eq.body = 'ClothesFarmClothes01';
      c = crop(drawCharacter(lookFor('kasim', eq), weaponOf({ weapon: 'IronDagger' }), { aRp: 0.15, aRe: 0.1, aLp: 0.15, aLe: 0.1, wp: -80 }, Math.PI, {}).canvas).canvas;
    } else {
      const p = new Px(24, 24);
      if (edid === 'PotionHealth') { blob(p, 12, 15, 6, 6, 'red', { bias: 0.1, tex: 0 }); rod(p, 12, 9, 12, 4, 3, 3, 'glass'); rod(p, 12, 4, 12, 3, 3.6, 3.6, 'wood'); }
      else if (edid === 'Bandage') blob(p, 12, 13, 7, 5, 'cream', { tex: 0.05, fn: (x, y, v) => (x % 3 === 0 ? tone('cream', v - 0.2, x, y) : null) });
      else if (edid === 'Bread') blob(p, 12, 13, 8, 5, 'hide', { bias: 0.1, tex: 0.2 });
      else if (edid === 'Salt') blob(p, 12, 14, 7, 6, 'canvas', { tex: 0.2, fn: (x, y, v) => (y < 10 ? tone('bone', v + 0.3, x, y) : null) });
      else if (edid === 'ChiefNote') poly(p, [[5, 5], [19, 4], [20, 20], [4, 19]], (x, y) => (y % 3 === 0 && x > 6 && x < 18 ? tone('leather', 0.3, x, y) : tone('bone', 0.75, x, y)));
      else for (const [x, y] of [[9, 14], [14, 12], [12, 17]]) blob(p, x, y, 4, 2.6, 'brass', { bias: 0.15, tex: 0 });
      c = finish(p, 0.3).canvas();
    }
    return (icons[edid] = c);
  }

  // ---------- the camp ----------
  const W = 320, H = 190, WW = 600, WH = 400;
  const CAMP = { x: 320, y: 200, rx: 200, ry: 128 };
  const inCamp = (x, y, k = 1) => ((x - CAMP.x) / (CAMP.rx * k)) ** 2 + ((y - CAMP.y) / (CAMP.ry * k)) ** 2 < 1;
  const FIRE = { x: 320, y: 206 };
  let props = [], lights = [], ground, containers = [];
  const spriteCache = {};
  function sprite(key, make, x, y, solid, anim) { const s = spriteCache[key] || (spriteCache[key] = make()); return { x, y, solid, canvas: s.canvas, ox: s.ox, oy: s.oy, anim, key }; }
  const done = (p, ox, oy) => ({ canvas: finish(p, 0.28).canvas(), ox, oy });
  function buildCamp() {
    props = []; lights = [];
    if (!ground) {
      const p = new Px(WW, WH);
      for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
        const n = fbm(x * 0.04, y * 0.04, 11), m = fbm(x * 0.25, y * 0.25, 12, 2);
        const e = ((x - CAMP.x) / CAMP.rx) ** 2 + ((y - CAMP.y) / CAMP.ry) ** 2 + 0.35 * (fbm(x * 0.06, y * 0.06, 19) - 0.5);
        const track = Math.abs((y - 300) + (x - 150) * 0.55 - 10 * Math.sin(x * 0.03)) < 13 + 4 * (fbm(x * 0.1, y * 0.1, 13) - 0.5) * 2 && y > 240;
        const ash = Math.hypot(x - FIRE.x, (y - FIRE.y) * 1.4);
        if (ash < 22) p.set(x, y, tone('stone', 0.18 + 0.2 * m + (ash < 12 ? -0.08 : 0) + (hash(x, y, 3) < 0.05 ? 0.15 : 0), x, y));
        else if (e < 0.9 || track) p.set(x, y, tone('dirt', 0.44 + 0.25 * (n - 0.5) + 0.2 * (m - 0.5) + (hash(x, y, 14) < 0.04 ? 0.2 : 0) - (e > 0.75 && e < 0.9 ? (e - 0.75) * 0.5 : 0), x, y));
        else p.set(x, y, tone('grass', 0.42 + 0.35 * (n - 0.5) + 0.2 * (m - 0.5) + (hash(x, y, 15) < 0.05 ? 0.22 : 0) - (e < 1.15 ? 0.08 : 0), x, y));
      }
      for (let k = 0; k < 500; k++) { const x = Math.floor(hash(k, 1, 16) * WW), y = Math.floor(hash(k, 2, 16) * WH); if (inCamp(x, y, 0.95)) continue; for (let j = 0; j < 3; j++) p.set(x + j - 1, y - (j === 1 ? 2 : 1), tone('grass', 0.75, x + j, y)); }
      for (const [bx, by, ramp] of [[262, 186, 'red'], [374, 178, 'fur'], [352, 246, 'hide']]) {
        for (let y = 0; y < 9; y++) for (let x = 0; x < 22; x++) { const X = bx + x - 11, Y = by + y - 4; if ((x < 2 || x > 19) && (y < 2 || y > 6)) continue; p.set(X, Y, tone(ramp, 0.55 - y * 0.03 + (x === 5 ? -0.2 : 0) + 0.1 * (fbm(X * 0.4, Y * 0.4, 4) - 0.5), X, Y)); }
      }
      for (let k = 0; k < 9; k++) { const x = 200 + hash(k, 7, 8) * 240, y = 140 + hash(k, 8, 8) * 130; rod(p, x, y, x + 4 + hash(k, 9, 8) * 3, y + 1, 1.4, 1.4, 'bone'); }
      ground = p.canvas();
    }
    for (let a = 158; a <= 382; a += 2.6) {
      const r = a * D, x = CAMP.x + Math.cos(r) * (CAMP.rx + 6), y = CAMP.y + Math.sin(r) * (CAMP.ry + 4), seed = Math.floor(a * 10), hgt = 24 + hash(seed, 1, 2) * 8;
      props.push(sprite(`stake${seed % 5}`, () => stake(hgt, seed % 5), x, y, [[x, y, 3.5]]));
    }
    for (const [tx, ty] of [[250, 140], [395, 132]]) props.push(sprite('tent', tent, tx, ty, [[tx - 12, ty - 4, 10], [tx + 12, ty - 4, 10], [tx, ty - 10, 10]]));
    props.push(sprite('chiefTent', () => tent(1.35), 322, 100, [[302, 92, 13], [342, 92, 13], [322, 84, 13]]));
    props.push({ x: FIRE.x, y: FIRE.y, solid: [[FIRE.x, FIRE.y, 9]], anim: spriteCache.fire || (spriteCache.fire = fireFrames()), ox: 16, oy: 26 });
    lights.push({ x: FIRE.x, y: FIRE.y - 6, r: 110, c: [255, 150, 60], a: 0.42, flicker: 1 });
    for (const [x, y] of [[300, 190], [342, 194]]) props.push(sprite('log', logSeat, x, y, [[x - 6, y, 4], [x + 6, y, 4]]));
    for (const [x, y, kind] of [[452, 232, 'crate'], [466, 222, 'barrel'], [440, 246, 'barrel'], [205, 250, 'crate'], [186, 236, 'barrel']]) props.push(sprite(kind, kind === 'crate' ? crate : barrel, x, y, [[x, y - 2, 7]]));
    props.push(sprite('rack', rack, 214, 210, [[200, 208, 5], [214, 208, 5], [228, 208, 5]]));
    for (const [x, y] of [[162, 280], [204, 298]]) props.push(sprite('pike', pike, x, y, [[x, y, 3]]));
    const torches = spriteCache.torches || (spriteCache.torches = torchFrames());
    for (const [x, y] of [[148, 298], [216, 280], [264, 96], [380, 96]]) { props.push(sprite('torch', torchPost, x, y, [[x, y, 3]], torches)); lights.push({ x, y: y - 26, r: 48, c: [255, 170, 80], a: 0.32, flicker: 1.6 }); }
    for (const [x, y] of [[40, 60], [90, 30], [70, 150], [30, 250], [560, 60], [520, 30], [575, 170], [545, 300], [480, 370], [60, 360], [130, 380], [580, 390], [600, 250]]) props.push(sprite(`tree${(x + y) % 3}`, () => tree((x + y) % 3), x, y, [[x, y - 2, 6]]));
    for (const [x, y] of [[420, 330], [500, 280], [110, 220]]) props.push(sprite('rock', rock, x, y, [[x, y - 2, 8]]));
    for (const c of containers) props.push(sprite(c.look, { chest, sack, crate, barrel }[c.look], c.x, c.y, [[c.x, c.y - 2, 7]]));
  }
  function stake(hgt, v) {
    const p = new Px(12, 40), base = 38, top = base - hgt;
    rod(p, 6, base, 6, top + 4, 5.5, 5, 'wood', { tex: 0.2, seed: v, fn: (x, y, t, a, val) => (hash(x, y, v) < 0.12 ? tone('wood', val - 0.2, x, y) : null) });
    poly(p, [[3.3, top + 5], [8.7, top + 5], [6.2 + (v % 2 ? 0.6 : -0.4), top - 1]], (x, y, u, vv) => tone('wood', 0.65 - u * 0.3 + vv * 0.1, x, y));
    if (v === 2) for (let y = base - 10; y < base - 7; y++) for (let x = 3; x < 9; x++) p.set(x, y, tone('leather', 0.3, x, y));
    return done(p, 6, 38);
  }
  function tent(k = 1) {
    const w = Math.round(64 * k), h = Math.round(50 * k), p = new Px(w, h), cx = w / 2, ap = 8 * k, base = h - 4, hw = 21 * k, back = 16 * k;
    poly(p, [[cx, ap], [cx, ap - back * 0.55], [cx - hw, base - back * 0.6], [cx - hw, base]], (x, y, u, v) => tone('canvas', 0.62 - u * 0.05 + v * 0.05 + ((x + Math.round(y * 0.4)) % 7 === 0 ? -0.1 : 0) + 0.1 * (fbm(x * 0.3, y * 0.3, 61) - 0.5), x, y));
    poly(p, [[cx, ap], [cx, ap - back * 0.55], [cx + hw, base - back * 0.6], [cx + hw, base]], (x, y, u, v) => tone('canvas', 0.36 + u * 0.04 + ((x - Math.round(y * 0.4)) % 7 === 0 ? -0.08 : 0) + 0.1 * (fbm(x * 0.3, y * 0.3, 62) - 0.5), x, y));
    poly(p, [[cx, ap], [cx + hw, base], [cx - hw, base]], (x, y, u, v) => tone('canvas', 0.5 - v * 0.08 + (hash(x, y, 63) < 0.05 ? -0.1 : 0), x, y));
    poly(p, [[cx, ap + 9 * k], [cx + 9 * k, base], [cx - 9 * k, base]], () => '#120d08');
    poly(p, [[cx, ap + 9 * k], [cx - 9 * k, base], [cx - 13 * k, base], [cx - 1, ap + 7 * k]], (x, y) => tone('canvas', 0.62, x, y));
    rod(p, cx, ap - back * 0.55, cx, ap - 1, 2, 2, 'wood');
    if (k > 1) for (let i = 0; i < 3; i++) p.set(cx - 2 + i * 2, ap + 3, tone('red', 0.6, cx, ap));
    return done(p, cx, base);
  }
  function crate() {
    const p = new Px(20, 22);
    for (let y = 0; y < 18; y++) for (let x = 0; x < 16; x++) { const top = y < 8, X = x + 2, Y = y + 2, plank = (top ? x : y) % 5 === 0;
      p.set(X, Y, tone('wood', (top ? 0.64 - y * 0.02 : 0.38 - (y - 8) * 0.02) + (plank ? -0.18 : 0) + 0.12 * (fbm(X * 0.4, Y * 0.4, 21) - 0.5), X, Y)); }
    return done(p, 10, 20);
  }
  function chest() {
    const p = new Px(24, 20);
    for (let y = 0; y < 15; y++) for (let x = 0; x < 20; x++) { const top = y < 6, X = x + 2, Y = y + 3;
      p.set(X, Y, (x === 0 || x === 19 || x === 9 || x === 10 || y === 6) ? tone('iron', top ? 0.6 : 0.4, X, Y) : tone('wood', (top ? 0.62 : 0.38 - (y - 6) * 0.02) + (x % 4 === 0 ? -0.12 : 0), X, Y)); }
    blob(p, 12, 10, 1.5, 1.5, 'brass', { tex: 0 });
    return done(p, 12, 18);
  }
  function sack() { const p = new Px(18, 18); blob(p, 9, 11, 6.5, 5.5, 'canvas', { tex: 0.2, rough: 0.15, seed: 8 }); rod(p, 9, 6, 9, 3, 2.5, 3.2, 'canvas'); rod(p, 7, 6, 11, 6, 1.2, 1.2, 'leather'); return done(p, 9, 16); }
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
    rod(p, 7, 44, 7, 10, 1.8, 1.4, 'wood'); blob(p, 7, 8, 4.5, 4.2, 'bone', { tex: 0.12, bias: 0.05 });
    for (const x of [5, 9]) { p.set(x, 8, '#0d0a07'); p.set(x, 9, '#0d0a07'); }
    p.set(7, 11, '#2a2015'); for (let x = 5; x < 10; x++) p.set(x, 12, x % 2 ? '#e2d9bb' : '#433a2b');
    for (let y = 13; y < 22; y++) if (hash(y, 1, 77) < 0.6) p.set(7 + (y % 2), y, tone('blood', 0.4, 7, y));
    return done(p, 7, 44);
  }
  function torchPost() { const p = new Px(10, 34); rod(p, 5, 32, 5, 8, 2.2, 2.2, 'wood'); blob(p, 5, 8, 2.4, 2, 'leather', { tex: 0.1 }); return done(p, 5, 32); }
  function flame(w, h, t, seed) {
    const p = new Px(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = (x + 0.5 - w / 2) / (w / 2), v = 1 - (y + 0.5) / h, n = fbm(x * 0.35, y * 0.3 + t * 2.2, seed, 2), shape = 1 - Math.abs(u) * (1.1 + v * 1.4) - v * 0.85 + (n - 0.5) * 0.9;
      if (shape > 0) p.set(x, y, tone('fire', clamp(shape * 1.6 + 0.15, 0, 0.999), x, y));
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

  // ---------- containers, bodies and loot ----------
  const CONTAINERS = () => [
    { id: 'chiefChest', name: "Chief's Chest", look: 'chest', x: 352, y: 118, items: { ArmorSteelCuirassA: 1, ArmorSteelGauntletsA: 1, ArmorSteelBootsB: 1, ArmorSteelHelmetA: 1, ArmorSteelShield: 1, SteelSword: 1, PotionHealth: 2 }, gold: 140 },
    { id: 'stores', name: 'Supply Crate', look: 'crate', x: 474, y: 248, items: { ArmorOrcishCuirass: 1, ArmorOrcishGauntlets: 1, ArmorOrcishBoots: 1, ArmorOrcishHelmet: 1, ArmorOrcishShield: 1, OrcishWarAxe: 1, Salt: 4, Bread: 2 }, gold: 0 },
    { id: 'sack', name: 'Sack', look: 'sack', x: 228, y: 150, items: { ClothesRedguardClothes: 1, ClothesRedguardBoots: 1, DBClothesRedguardHood: 1, Scimitar: 1, IronDagger: 1, ArmorIronShield: 1, Bandage: 2 }, gold: 12 },
    { id: 'armoury', name: 'Weapon Barrel', look: 'barrel', x: 236, y: 216, items: { IronWarhammer: 1, IronBattleaxe: 1, IronMace: 1, IronGreatsword: 1, SteelWarhammer: 1 }, gold: 0 },
  ];

  // ---------- fighters ----------
  const SET_EQ = (set) => ({ ...SETS[set].pieces });
  const ROSTER = [
    { person: 'raider', name: 'Bandit', pname: 'Hakon', voice: { pitch: 0.9, rate: 1.1, v: 1 }, eq: { ...SET_EQ('leather'), head: null, weapon: 'IronSword', shield: 'ArmorHideShield' }, x: 286, y: 216, hp: 5 },
    { person: 'thug', name: 'Bandit Thug', pname: 'Bilal', voice: { pitch: 0.7, rate: 0.95, v: 2 }, eq: { body: 'ArmorHideCuirass', feet: 'ArmorHideBoots', weapon: 'IronMace' }, x: 360, y: 226, hp: 6 },
    { person: 'marauder', name: 'Bandit Marauder', pname: 'Jorund', voice: { pitch: 0.55, rate: 0.9, v: 0 }, eq: { ...SET_EQ('fur'), weapon: 'IronBattleaxe' }, x: 410, y: 160, hp: 8 },
    { person: 'raider', name: 'Bandit', pname: 'Fenn', voice: { pitch: 1.1, rate: 1.2, v: 3 }, eq: { ...SET_EQ('leather'), head: null, weapon: 'Scimitar' }, x: 230, y: 176, hp: 5 },
    { person: 'chief', name: 'Bandit Chief', pname: 'Qadir', voice: { pitch: 0.65, rate: 0.85, v: 1 }, eq: { ...SET_EQ('iron'), weapon: 'SteelGreatsword' }, x: 322, y: 124, hp: 11, chief: true },
  ];
  // A quarter more health than round five: fights were over too fast (Broden, round six).
  const HEALTH = 1.25;
  const mk = (o) => ({ person: 'kasim', face: Math.PI, anim: 'idle', fi: 0, ft: 0, kb: [0, 0], flash: 0, hp: 5, maxHp: 5, struck: false, combo: 0, comboT: 9, buffer: null,
    cut: [], crushed: false, stagger: 0, inv: 0, cool: 1 + Math.random() * 2, aggro: false, dead: false, prevBlade: null, curBlade: null, drawnFi: -1, drawnAnim: '', spurt: 0, pt: null,
    ghosts: [], blockT: 0, heading: Math.PI, ...o });
  const START_EQ = { body: 'ClothesFarmClothes01', feet: 'ClothesFarmBoots01', hands: null, head: null, weapon: 'IronSword', shield: 'ArmorHideShield' };
  let pl, foes, pieces, particles, pools, decals, dg, hitStop, slow, shake, fin, attacker, camX, camY, letter;
  const state = { furyT: 0, deathless: false, paused: false, gold: 0, inv: {}, rage: 0, fury: 0, stamina: 100, staminaWait: 0, level: 1, xp: 0, skills: {}, perkPoints: 0, perks: new Set(), discovered: false, flash: 0, shock: null, ragePing: false,
    stats: { kills: 0, finishers: 0, severed: 0, looted: 0, gold: 0, blocks: 0, parries: 0 }, quest: { chief: false, chest: false, done: false }, events: [] };
  const settings = { gore: 'full', light: 'dusk' };
  const gore = () => settings.gore;
  const say = (text, kind = 'info') => state.events.push({ text, kind });
  function reset() {
    containers = CONTAINERS().map((c) => ({ ...c, items: { ...c.items } }));
    buildCamp();
    pl = mk({ x: 112, y: 322, face: 0, hp: 100, maxHp: 100, eq: { ...START_EQ }, vid: 'kasim', voice: { pitch: 0.5, rate: 0.85, v: 0 } });
    foes = ROSTER.map((r, i) => mk({ ...r, eq: { ...r.eq }, id: i, vid: `foe${i}`, hp: r.hp * HEALTH, maxHp: r.hp * HEALTH, face: faceOf(Math.random() - 0.5, 1), home: [r.x, r.y] }));
    Object.assign(state, { gold: 25, inv: { ClothesFarmClothes01: 1, ClothesFarmBoots01: 1, IronSword: 1, ArmorHideShield: 1, PotionHealth: 2, Bandage: 3, Bread: 1 }, rage: 0, fury: 0, stamina: 100, discovered: false,
      level: 1, xp: 0, perkPoints: 0, perks: new Set(), flash: 0, shock: null, ragePing: false, quest: { chief: false, chest: false, done: false }, stats: { kills: 0, finishers: 0, severed: 0, looted: 0, gold: 0, blocks: 0, parries: 0 } });
    state.skills = { OneHanded: { level: 25, xp: 0 }, TwoHanded: { level: 15, xp: 0 }, Block: { level: 20, xp: 0 }, HeavyArmor: { level: 15, xp: 0 }, LightArmor: { level: 15, xp: 0 }, Smithing: { level: 20, xp: 0 }, Speech: { level: 15, xp: 0 }, Rage: { level: 15, xp: 0 } };
    pieces = []; particles = []; pools = []; hitStop = 0; slow = 0; shake = 0; fin = null; attacker = null; letter = 0;
    decals = document.createElement('canvas'); decals.width = WW; decals.height = WH; dg = decals.getContext('2d');
    camX = pl.x - W / 2; camY = pl.y - H / 2;
    say('Walk up the track to the camp.', 'hint');
  }
  const W8 = (f) => ITEMS[f.eq.weapon] || ITEMS.Fists;
  const shieldOn = (f) => !!(f.eq.shield && W8(f).hands === 1);
  const frames = (f) => ANIMS[f.anim].frames;
  // Swing speed: Skyrim's weapon speed, with two-handers a further 15 percent slower and
  // daggers 10 percent quicker, so the classes feel further apart (Broden, round five).
  const swingSpeed = (w) => w.speed * (w.hands === 2 ? 0.85 : w.cls === 'dagger' ? 1.1 : 1);
  const dur = (f, i) => { const fr = frames(f)[i]; return ANIMS[f.anim].attack || f.anim === 'power' ? fr.d / swingSpeed(W8(f)) : fr.d; };
  function play(f, anim) { f.anim = anim; f.fi = 0; f.ft = 0; f.struck = false; f.hits = 0; }
  const busy = (f) => !['idle', 'walk', 'run', 'block', 'shieldBlock'].includes(f.anim);
  const canAct = (f) => !fin && !f.dead && (!busy(f) || (SWINGS.includes(f.anim) && f.struck && f.fi > frames(f).findIndex((q) => q.hit)));
  const reachOf = (f) => 14 + SHAPES[W8(f).shape].len * 1.25;
  function inArc(a, b, r, cos = 0.3) { const dx = b.x - a.x, dy = (b.y - a.y) * 1.3, d = Math.hypot(dx, dy), [fx, fy] = fwd(a); return d < r && (fx * dx + fy * dy) / (d || 1) > cos; }
  // Armour: each piece's rating raised by its skill (as the game does), then by the perks.
  function armourRating() {
    let tot = 0;
    for (const it of worn()) {
      if (!it || it.armourType === 'Clothing') continue;
      const heavy = it.armourType === 'Heavy';
      tot += it.rating * (1 + (0.4 * (state.skills[heavy ? 'HeavyArmor' : 'LightArmor'].level + 15)) / 100) * (1 + 0.2 * rank(heavy ? 'Juggernaut00' : 'AgileDefender00'));
    }
    if (allOf('Heavy')) tot *= 1 + (has('WellFitted') ? 0.25 : 0) + (matched() && has('MatchingSetHeavy') ? 0.25 : 0);
    if (allOf('Light')) tot *= 1 + (has('CustomFit') ? 0.25 : 0) + (matched() && has('MatchingSet') ? 0.25 : 0);
    if (shieldOn(pl)) tot += ITEMS[pl.eq.shield].rating * (1 + (0.4 * (state.skills.Block.level + 15)) / 100);
    return tot;
  }
  // Conditioning and Unhindered: worn armour of that kind weighs nothing.
  const carried = () => Object.entries(state.inv).reduce((s, [e, n]) => {
    const it = ITEMS[e], free = it && Object.values(pl.eq).includes(e) && ((it.armourType === 'Heavy' && has('Conditioning')) || (it.armourType === 'Light' && has('Unhindered')));
    return s + (free ? 0 : (it?.weight || 0) * n);
  }, 0);
  const sfx = (n, o) => window.HFA?.play(n, o);
  // What a blow lands on: bare or clothed flesh, leather and hide, or metal.
  const matOf = (f) => { const t = ITEMS[f.eq.body]?.armourType; return t === 'Heavy' ? 'metal' : t === 'Light' ? 'leather' : 'flesh'; };
  const guardOf = (f) => (shieldOn(f) ? (f.eq.shield === 'ArmorHideShield' ? 'wood' : 'metal') : 'blade');

  // ---------- skills and perks: Skyrim's curves, half as fast again (Broden, round four) ----------
  // A use gives (base x the skill's use multiplier) skill XP; the next skill level needs
  // improveMult x level^1.95 + improveOffset. Each skill level gives that many character XP,
  // and a character level needs 75 + 25 x level. The bases: a weapon's base damage per hit,
  // the incoming blow's damage when blocking or wearing armour.
  const SKILL_NAMES = { OneHanded: 'One-handed', TwoHanded: 'Two-handed', Block: 'Block', HeavyArmor: 'Heavy Armor', LightArmor: 'Light Armor', Smithing: 'Smithing', Speech: 'Speech', Rage: 'Rage' };
  const SKD = Object.fromEntries(SKILLS.map((k) => [k.skill, k])), FAST = 1.5;
  // Rage is ours, not Skyrim's (bible 10, PROPOSED): it levels like the others, by use. Roaring,
  // and every blow, kill and finisher while Fury burns, train it. Its perks cost perk points.
  SKD.Rage = { skill: 'Rage', useMult: 1, useOffset: 0, improveMult: 1.5, improveOffset: 0 };
  const RAGE_TREE = [
    ['RageBloodlust', 'Bloodlust', [0, 30, 60], 'Fury lasts 3 seconds longer.', []],
    ['RageSavage', 'Savage', [10, 40, 70], 'Blows in Fury do 15 percent more damage.', ['RageBloodlust']],
    ['RagePain', 'Pain Is Nothing', [20, 50, 80], 'Take 15 percent less damage in Fury.', ['RageBloodlust']],
    ['RageWind', 'Second Wind', [20], 'Stamina is unlimited in Fury.', ['RageBloodlust']],
    ['RageSeething', 'Seething', [30], 'Rage builds half as fast again outside Fury.', ['RageSavage']],
    ['RageWarCry', 'War Cry', [40], 'The roar reaches further and staggers longer; the badly hurt run in terror.', ['RageWind']],
    ['RageRedMist', 'Red Mist', [50], 'Every kill in Fury adds 2 seconds to it.', ['RageSavage']],
    ['RageButcher', 'Butcher', [60], 'In Fury anyone can be finished, and every kill takes something off.', ['RageRedMist']],
    ['RageSmoulder', 'Smouldering', [60], 'Rage never cools below 25.', ['RageSeething']],
    ['RageUnstoppable', 'Unstoppable', [70], 'In Fury nothing knocks you back and no shield stops your blows.', ['RagePain']],
    ['RageUntouchable', 'Untouchable', [90], 'Take no damage for the first 4 seconds of Fury.', ['RageUnstoppable']],
    ['RageDeathless', 'Deathless', [100], 'Once each Fury, a killing blow leaves you on 1 Health and adds 3 seconds.', ['RageUntouchable']],
  ];
  for (const [id, name, reqs, description, requires] of RAGE_TREE) reqs.forEach((lvl, i) => PERKS.push({
    edid: i ? `${id}${i + 1}` : id, name, description, skill: 'Rage', skillReq: [{ skill: 'Rage', level: lvl }], requires: i ? [] : requires, nextPerk: i + 1 < reqs.length ? `${id}${i + 2}` : null, effects: [], abilities: [],
  }));
  const toNext = (k) => SKD[k].improveMult * Math.pow(state.skills[k].level, 1.95) + SKD[k].improveOffset;
  function train(skill, base) {
    if (!skill) return;
    const s = state.skills[skill]; s.xp += (base * SKD[skill].useMult + SKD[skill].useOffset) * FAST;
    while (s.level < 100 && s.xp >= toNext(skill)) {
      s.xp -= toNext(skill); s.level++;
      say(`${SKILL_NAMES[skill]} increased to ${s.level}`, 'skill');
      state.xp += s.level;
      while (state.xp >= 75 + state.level * 25) { state.xp -= 75 + state.level * 25; state.level++; state.perkPoints++; pl.maxHp += 10; pl.hp = pl.maxHp; say(`You reached level ${state.level}`, 'level'); sfx('level'); }
    }
  }
  // Perks: the game's data (Skyrim's perk trees), taken with perk points, rank by rank.
  const PERK = Object.fromEntries(PERKS.map((q) => [q.edid, q]));
  const chainOf = (first) => { const c = []; for (let q = PERK[first]; q && c.length < 6; q = PERK[q.nextPerk]) c.push(q.edid); return c; };
  const rank = (first) => chainOf(first).filter((e) => state.perks.has(e)).length;
  const has = (first) => rank(first) > 0;
  // Perks for things this sample (or the game) does not have yet.
  const NOT_HERE = { DualFlurry30: 'No dual wielding yet', DualSavagery: 'No dual wielding yet', DeflectArrows: 'No archers in this camp', ElementalProtection: 'No magic in this camp', Cushioned: 'No falling in this camp' };
  function canTake(first) {
    const e = chainOf(first).find((x) => !state.perks.has(x));
    if (!e) return 'Taken';
    const q = PERK[e], req = q.skillReq[0]?.level || 0;
    if (NOT_HERE[first]) return NOT_HERE[first];
    if (q.skill === 'Smithing' || q.skill === 'Speech') return 'Comes with crafting and trading';
    if (state.skills[q.skill].level < req) return `Needs ${SKILL_NAMES[q.skill]} ${req}`;
    for (const r of q.requires) if (!state.perks.has(r)) return `Needs ${PERK[r]?.name || r}`;
    if (state.perkPoints <= 0) return 'No perk points';
    return 'ok';
  }
  function takePerk(first) {
    if (canTake(first) !== 'ok') return false;
    state.perks.add(chainOf(first).find((x) => !state.perks.has(x))); state.perkPoints--;
    say(`Perk: ${PERK[first].name}${chainOf(first).length > 1 ? ` (${rank(first)}/${chainOf(first).length})` : ''}`, 'skill'); sfx('level');
    return true;
  }
  // What he is wearing, for the armour perks.
  const worn = () => ['body', 'hands', 'feet', 'head'].map((k) => ITEMS[pl.eq[k]]);
  const allOf = (type) => worn().every((it) => it && it.armourType === type);
  const matched = () => { const sets = ['body', 'hands', 'feet', 'head'].map((k) => PIECE[pl.eq[k]]?.[0]); return sets.every((x) => x && x === sets[0]); };

  // ---------- blood ----------
  // Blood: more and heavier on full gore. Drops land as spatter; a fast blow also leaves a
  // streak along the ground in the direction it was struck.
  const BLOOD = ['#5a0907', '#6e0c09', '#8a120c', '#9c160e', '#b01d12'];
  function spray(x, y, z, n, dir = [0, 0], force = 1) {
    if (gore() === 'off') return;
    const k = gore() === 'full' ? 1.7 : 1;
    for (let i = 0; i < n * k; i++) particles.push({ x, y, z: z + Math.random() * 4, vx: (dir[0] * 70 + (Math.random() - 0.5) * 80) * force, vy: (dir[1] * 45 + (Math.random() - 0.5) * 34) * force, vz: (20 + Math.random() * 70) * force, c: BLOOD[Math.floor(Math.random() * BLOOD.length)], big: Math.random() < 0.35 });
    if (gore() === 'full' && (dir[0] || dir[1])) streak(x, y, dir, 10 + n * 0.8);
  }
  function streak(x, y, dir, len) {
    const l = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / l, uy = dir[1] / l;
    for (let i = 4; i < len; i++) { if (Math.random() < 0.3) continue; const w = Math.random() < 0.5 ? 2 : 1; dg.fillStyle = BLOOD[Math.floor(Math.random() * 3)]; dg.fillRect(Math.round(x + ux * i + (Math.random() - 0.5) * 3), Math.round(y + uy * i * 0.6 + (Math.random() - 0.5) * 2), w, 1); }
  }
  // Chunks: bone, flesh and worse, which bounce and stay where they land.
  function bits(x, y, z, n) {
    const C = ['#c7bc9b', '#e2d9bb', '#7c3920', '#622817', '#c87a7a', '#a85a5a'];
    for (let i = 0; i < n * (gore() === 'full' ? 1.6 : 1); i++) particles.push({ x, y, z, vx: (Math.random() - 0.5) * 110, vy: (Math.random() - 0.5) * 50, vz: 40 + Math.random() * 90, c: C[Math.floor(Math.random() * C.length)], big: Math.random() < 0.6, chunk: true });
  }
  function sparks(x, y) { for (let i = 0; i < 9; i++) particles.push({ x, y, z: 20, vx: (Math.random() - 0.5) * 110, vy: (Math.random() - 0.5) * 50, vz: 30 + Math.random() * 50, c: '#ffe7a0', spark: 0.22 }); }
  function pool(x, y, max) { if (gore() !== 'off') pools.push({ x, y, r: 1, max: max * (gore() === 'full' ? 1.5 : 1) }); }
  function pixelEllipse(g, cx, cy, rx, ry, c) { g.fillStyle = c; for (let y = -Math.floor(ry); y <= ry; y++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2))); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }

  // ---------- hurting and killing ----------
  function sever(f, part, from) {
    if (gore() !== 'full' || f.cut.includes(part)) return;
    const img = frameOf(f, f.anim, f.fi, f.face, { only: part, cut: [] }), c = crop(img.canvas);
    f.cut = [...f.cut, part]; f.spurt = part === 'head' ? 2.2 : 1.6; state.stats.severed++; sfx(part === 'head' ? 'decap' : 'dismember');
    if (gore() === 'full') bits(f.x, f.y, OY - 40, 5);
    if (!c) return;
    const dx = f.x - from.x, dy = f.y - from.y, d = Math.hypot(dx, dy) || 1;
    pieces.push({ canvas: c.canvas, x: f.x + (c.cx - OX), y: f.y + 2, z: OY - c.cy, vx: (dx / d) * 45 + (Math.random() - 0.5) * 30, vy: (dy / d) * 25 + (Math.random() - 0.5) * 12, vz: part === 'head' ? 95 : 70, rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 6), rest: false });
    spray(f.x, f.y, OY - c.cy, 42, [dx / d, dy / d], 1.3);
  }
  // A body becomes a container of what he carried, his gold, and odds and ends.
  function lootOf(f) {
    const items = {};
    for (const k of ['weapon', 'shield', 'body', 'hands', 'feet', 'head']) if (f.eq[k]) items[f.eq[k]] = 1;
    for (const e of f.dropped || []) items[e] = 1; // a weapon knocked from his hand
    if (Math.random() < 0.6) items.Bandage = 1 + Math.floor(Math.random() * 2);
    if (Math.random() < 0.35) items.PotionHealth = 1;
    if (Math.random() < 0.4) items.Salt = 1 + Math.floor(Math.random() * 3);
    if (f.chief) { items.ChiefNote = 1; items.PotionHealth = 2; }
    return { items, gold: f.chief ? 60 : 5 + Math.floor(Math.random() * 25) };
  }
  function kill(f, by, how = {}) {
    f.dead = true; f.hp = 0; play(f, how.anim || 'death'); f.stagger = 0; f.kb = [f.kb[0] * 0.5, f.kb[1] * 0.5];
    if (how.part) sever(f, how.part, by);
    if (how.crush) { sfx('crush'); if (gore() !== 'off') { f.crushed = gore() === 'full'; spray(f.x, f.y, 40, 46, [0, 0], 1.4); if (gore() === 'full') bits(f.x, f.y, 40, 16); } }
    if (how.throat) { f.spurt = 2.6; sfx('throat'); }
    f.poolAt = 0.6; if (attacker === f) attacker = null;
    if (!how.part && !how.crush && !how.throat) sfx('death');
    if (f === pl) { say('You died. Esc, then Reset the camp, to try again.', 'warn'); setTimeout(() => bark('victory', witness(pl)), 1000); return; }
    f.loot = lootOf(f); state.stats.kills++; addRage(8);
    if (furious()) { train('Rage', 40); if (has('RageRedMist')) state.fury += 2; }
    // Whoever is nearest says what he saw; now and then Kasim says something too.
    const what = how.part === 'head' ? 'allyHead' : how.part ? 'allyArm' : how.crush ? 'allyCrushed' : how.throat ? 'allyThroat' : 'allyDeath', w8 = witness(f);
    if (w8 && w8.aggro) setTimeout(() => bark(what, w8, { name: f.pname }), 600);
    else if (!foes.some((e) => !e.dead)) setTimeout(() => bark('clear', pl), 1200);
    if (Math.random() < 0.25) setTimeout(() => bark('kill', pl), 400);
    if (f.chief) { state.quest.chief = true; say('Objective complete: Kill the bandit chief', 'quest'); }
    if (foes.every((e) => e.dead)) say('The camp is quiet.', 'hint');
  }
  function addRage(n) { state.rage = clamp(state.rage + n * (n > 0 && state.fury <= 0 && has('RageSeething') ? 1.5 : 1), 0, 100); }
  // Fury, before and after the Rage perks: 8 s, blows x1.25, damage taken x0.75, no flinching.
  const furyLength = () => 8 + 3 * rank('RageBloodlust');
  const furyDealt = () => 1.25 + 0.15 * rank('RageSavage');
  const furyTaken = () => [0.75, 0.6, 0.45, 0.3][rank('RagePain')];
  const furious = () => state.fury > 0;
  const bark = (kind, f, ctx) => window.HFV?.bark(kind, f, ctx);
  // The nearest bandit still standing and fighting, to answer what happened.
  const witness = (near) => foes.filter((e) => !e.dead && e !== near).sort((a, b) => Math.hypot(a.x - near.x, a.y - near.y) - Math.hypot(b.x - near.x, b.y - near.y))[0];
  function damage(att, def, kind) {
    const w = W8(att), third = kind === 'combo3', power = kind === 'power', heavy = power || third || w.hands === 2, a = att.atk || {};
    let dmg, crit = false;
    if (att === pl) {
      dmg = (w.damage / 7) * (1 + ((w.skillName ? state.skills[w.skillName].level : 15) - 15) / 200);
      if (w.skillName) dmg *= 1 + 0.2 * rank(w.hands === 2 ? 'Barbarian00' : 'Armsman00');                       // Armsman, Barbarian
      if (w.shape === 'mace') dmg *= 1 + 0.15 * rank('BoneBreaker30');                                                 // armour ignored, as extra damage here
      if (w.shape === 'warhammer') dmg *= 1 + 0.15 * rank('Skullcrusher30');
      if (w.cls === 'fist' && has('FistsOfSteel') && ITEMS[pl.eq.hands]?.armourType === 'Heavy') dmg += ITEMS[pl.eq.hands].rating / 8;
      if (power) { dmg *= 2; if (a.standing && has(w.hands === 2 ? 'DevastatingBlow' : 'SavageStrike')) dmg *= 1.25; }
      else if (third) dmg *= 1.5;
      const critRank = (w.shape === 'sword' || w.shape === 'scimitar') ? rank('Bladesman30') : w.shape === 'greatsword' ? rank('DeepWounds30') : 0;
      if (power && a.running && has(w.hands === 2 ? 'GreatCriticalCharge' : 'CriticalCharge')) { dmg *= 2; crit = true; }
      else if (critRank && Math.random() < [0, 0.1, 0.15, 0.2][critRank]) { dmg *= 1.5; crit = true; }
      if (furious()) { dmg *= furyDealt(); train('Rage', 6); }
    } else {
      // Light armour all round: Deft Movement may avoid it. Heavy all round: Reflect Blows may send some back.
      if (allOf('Light') && has('DeftMovement') && Math.random() < 0.1) { say('Evaded', 'hint'); sfx('dodge'); return; }
      if (furious() && has('RageUntouchable') && state.furyT < 4) { sparks(def.x, def.y); say('Untouchable', 'hint'); return; }
      dmg = (w.cls === 'fist' ? 6 : w.hands === 2 ? 22 : 13) * (power ? 1.4 : 1) * (1 - Math.min(0.8, armourRating() * 0.004)) * (furious() ? furyTaken() : 1);
      // Deathless: once each Fury, a killing blow leaves him on 1 Health.
      if (furious() && has('RageDeathless') && !state.deathless && pl.hp - dmg <= 0) { dmg = pl.hp - 1; state.deathless = true; state.fury += 3; say('Deathless', 'level'); }
      if (allOf('Heavy') && has('ReflectBlows') && Math.random() < 0.1) { att.hp -= 1; att.flash = 0.08; say('Reflected', 'hint'); }
    }
    def.hp -= dmg; def.flash = 0.08;
    sfx('impact', { cls: w.cls, mat: matOf(def), heavy, crit, gore: gore() !== 'off', hurt: def.hp > 0 && Math.random() < 0.35 }); if (crit) say('Critical', 'skill');
    if (gore() === 'full' && matOf(def) !== 'metal') { const ddx = def.x - att.x, ddy = def.y - att.y, dd = Math.hypot(ddx, ddy) || 1; streak(def.x, def.y, [ddx / dd, ddy / dd], heavy ? 22 : 12); }
    // Hack and Slash, Limbsplitter: axes leave him bleeding.
    if (att === pl && ((w.shape === 'waraxe' && has('HackAndSlash30')) || (w.shape === 'battleaxe' && has('Limbsplitter30')))) { def.bleed = 3; def.bleedRate = 0.12 * rank(w.shape === 'waraxe' ? 'HackAndSlash30' : 'Limbsplitter30'); }
    // Paralysing Strike, Warmaster: a power attack stepping backwards may freeze him.
    if (att === pl && power && a.backward && has(w.hands === 2 ? 'Warmaster' : 'ParalyzingStrike') && Math.random() < 0.25 && def.hp > 0) { play(def, 'stagger'); def.stagger = 3.5; say('Paralysed', 'skill'); }
    const dx = def.x - att.x, dy = def.y - att.y, d = Math.hypot(dx, dy) || 1;
    // Quick blows barely move the target, so a chain stays in reach; heavy ones throw him back.
    const kbk = att === pl ? (power ? 110 : third ? 100 : w.hands === 2 ? 70 : 28) : heavy ? 90 : 50;
    def.kb = def === pl && furious() && has('RageUnstoppable') ? [0, 0] : [(dx / d) * kbk, (dy / d) * kbk * 0.7];
    hitStop = Math.max(hitStop, heavy ? 0.1 : 0.06); shake = Math.max(shake, heavy ? 3.5 : 2);
    spray(def.x, def.y, 34, heavy ? 16 : 8, [dx / d, dy / d]);
    if (att === pl) { train(w.skillName, w.damage); addRage(4); }
    if (def === pl) {
      addRage(dmg * 0.6); if (Math.random() < 0.5) sfx('hurt');
      if (pl.hp - dmg < pl.maxHp * 0.3 && pl.hp >= pl.maxHp * 0.3) { bark('low', pl); setTimeout(() => bark('taunt', att), 1200); }
      for (const it of worn()) if (it && it.armourType !== 'Clothing') train(it.armourType === 'Heavy' ? 'HeavyArmor' : 'LightArmor', dmg / 4);
    }
    if (def.hp <= 0) {
      hitStop = 0.14; shake = 5;
      let how = {};
      const savage = power && a.standing && has(w.hands === 2 ? 'DevastatingBlow' : 'SavageStrike') ? 0.3 : 0;
      if (att === pl && furious() && has('RageButcher') && w.cls !== 'fist') how = w.cls === 'blunt' ? { crush: true } : { part: Math.random() < 0.6 ? 'head' : Math.random() < 0.5 ? 'armR' : 'armL' };
      else if (att === pl && heavy && w.cls !== 'fist' && Math.random() < (w.cls === 'axe' ? 0.75 : 0.55) + savage) how = w.cls === 'blunt' ? { crush: true } : { part: Math.random() < (w.cls === 'axe' ? 0.45 : 0.6) + savage ? 'head' : (Math.random() < 0.5 ? 'armR' : 'armL') };
      kill(def, att, how);
      return;
    }
    if (def !== pl) { if (def.hp <= def.maxHp * 0.3 && !def.scaredSaid) { def.scaredSaid = true; bark('scared', def); } else if (Math.random() < 0.25) bark('hurt', def); }
    if (def !== pl && def.stagger > 2) return; // paralysed
    if (def !== pl && (heavy || def.hp <= def.maxHp * 0.3)) { play(def, 'stagger'); def.stagger = 1.6; if (attacker === def) attacker = null; }
    else if (def === pl && (state.fury > 0 || (allOf('Heavy') && has('TowerOfStrength') && Math.random() < 0.5) || pl.anim === 'roar')) { /* no flinch */ }
    else play(def, 'hit');
  }
  function landBlow(att) {
    if (fin && att !== pl) return; // nobody strikes the player mid-finisher
    if (att !== pl) sfx('swing', { shape: W8(att).shape, heavy: W8(att).hands === 2 });
    const targets = att === pl ? foes : [pl];
    const kind = att.anim === 'power' ? 'power' : att.anim === 'chop' && att === pl ? 'combo3' : att.anim === 'enemyChop' ? 'power' : 'quick';
    for (const def of targets) {
      const sweep = att === pl && kind === 'power' && W8(att).hands === 2 && has('Sweep');
      if (def.dead || !inArc(att, def, reachOf(att), sweep ? -0.25 : 0.3)) continue;
      if (att !== pl && def.inv > 0) continue;
      // The player blocks: a shield takes all of it and parries more easily; a blade takes most of it.
      if (def === pl && (def.anim === 'block' || def.anim === 'shieldBlock') && inArc(def, att, 80, 0)) {
        const parry = def.blockT < (shieldOn(pl) ? 0.35 : 0.22);
        sparks((att.x + def.x) / 2, (att.y + def.y) / 2); hitStop = 0.06; shake = 1.5;
        def.kb = [(def.x - att.x) * 2, (def.y - att.y) * 1.5];
        const wall = 1 - 0.1 * rank('ShieldWall00'), raw = W8(att).hands === 2 ? 22 : 13;
        state.stamina = Math.max(0, state.stamina - (kind === 'power' ? 30 : 15) * (shieldOn(pl) ? 0.6 : 1) * wall); state.staminaWait = 0.8; train('Block', raw); state.stats.blocks++;
        if (!shieldOn(pl)) pl.hp -= 3 * wall;
        sfx('clash', { cls: W8(att).cls, guard: guardOf(pl), parry });
        if (parry) { play(att, 'stagger'); att.stagger = 1.6; if (attacker === att) attacker = null; state.stats.parries++; say('Parried', 'hint'); }
        continue;
      }
      // A bandit with a shield may catch quick blows; power attacks and the third hit break through.
      if (att === pl && shieldOn(def) && kind === 'quick' && !(furious() && has('RageUnstoppable')) && !busy(def) && inArc(def, att, 80, 0.2) && Math.random() < 0.5) {
        sparks((att.x + def.x) / 2, (att.y + def.y) / 2); hitStop = 0.05; shake = 1.2; play(def, 'shieldBlock'); def.blockFor = 0.5; sfx('clash', { cls: W8(att).cls, guard: guardOf(def) });
        continue;
      }
      damage(att, def, kind);
      if (att === pl && W8(att).hands === 1) break;
    }
  }
  // Power Bash (Block 30): block and attack to slam the shield (or the hilt) into him. It breaks
  // his guard, stops a swing, and opens a finisher. Deadly Bash: five times the damage.
  // Disarming Bash: half the time his weapon goes flying.
  function bash() {
    if (!has('PowerBashPerk')) { say('Bashing needs the Power Bash perk (Block 30)', 'warn'); return; }
    if (!canAct(pl) && pl.anim !== 'block' && pl.anim !== 'shieldBlock') return;
    if (!spend(20)) return;
    const t = nearest(40, 0); if (t) pl.face = faceOf(t.x - pl.x, t.y - pl.y);
    const [fx, fy] = fwd(pl); pl.kb = [fx * 50, fy * 40];
    play(pl, 'bash'); sfx('swing', {});
  }
  function landBash() {
    for (const e of foes) {
      if (e.dead || !inArc(pl, e, 30, 0.2)) continue;
      e.hp -= 0.4 * (has('DeadlyBash') ? 5 : 1); e.flash = 0.08;
      const dx = e.x - pl.x, dy = e.y - pl.y, d = Math.hypot(dx, dy) || 1; e.kb = [(dx / d) * 120, (dy / d) * 80];
      hitStop = 0.09; shake = 3.5; sfx('bash', { guard: guardOf(pl) }); train('Block', 10);
      if (e.hp <= 0) { kill(e, pl); continue; }
      play(e, 'stagger'); e.stagger = 1.8; if (attacker === e) attacker = null;
      if (has('DisarmingBash') && e.eq.weapon && Math.random() < 0.5) { e.dropped = [...(e.dropped || []), e.eq.weapon]; e.eq = { ...e.eq, weapon: null }; say(`Disarmed the ${e.name.toLowerCase()}`, 'skill'); bark('disarmed', e); }
      break;
    }
  }

  // ---------- the player ----------
  function spend(n) { if (furious() && has('RageWind')) return true; if (state.stamina < n) { say('Not enough stamina', 'warn'); return false; } state.stamina -= n; state.staminaWait = 0.8; return true; }
  function attack(power) {
    if (pl.dead || fin || state.paused) return;
    if (!canAct(pl)) { pl.buffer = { power, left: 0.35 }; return; }
    const w = W8(pl);
    if (!spend(power ? 25 * (has(w.hands === 2 ? 'ChampionsStance' : 'FightingStance') ? 0.75 : 1) : 6)) return;
    let mx = 0, my = 0; if (keys.has('KeyW')) my -= 1; if (keys.has('KeyS')) my += 1; if (keys.has('KeyA')) mx -= 1; if (keys.has('KeyD')) mx += 1;
    const [ffx, ffy] = fwd(pl), running = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && !!(mx || my);
    pl.atk = { standing: !mx && !my, running, backward: !!(mx || my) && (mx * ffx + my * ffy) / Math.hypot(mx, my) < -0.5 };
    sfx('swing', { shape: w.shape, heavy: power || w.hands === 2 });
    const chained = !power && (COMBO.includes(pl.anim) || pl.comboT < 0.45);
    pl.combo = chained ? (pl.combo + 1) % 3 : 0;
    // Aim assist and a step in: close the gap so the chain keeps landing.
    const t = nearest(60, 0.0);
    if (t) {
      pl.face = faceOf(t.x - pl.x, t.y - pl.y);
      const dx = t.x - pl.x, dy = t.y - pl.y, d = Math.hypot(dx, dy * 1.3), step = clamp(d - reachOf(pl) * 0.7, 3, power && running ? 46 : 26);
      pl.kb = [(dx / (d || 1)) * step * 9, (dy / (d || 1)) * step * 9];
    } else { const [fx, fy] = fwd(pl); pl.kb = [fx * 4 * 9, fy * 4 * 9]; }
    play(pl, power ? 'power' : COMBO[pl.combo]);
  }
  function nearest(r, cos, pred = () => true) {
    let best = null, bd = r;
    for (const e of foes) { if (e.dead || !pred(e)) continue; const d = Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.3); if (d < bd && (cos <= -1 || inArc(pl, e, r, cos) || d < 20)) { best = e; bd = d; } }
    return best;
  }
  const finishable = (e) => !e.dead && (e.stagger > 0 || e.hp <= e.maxHp * 0.3 || (furious() && has('RageButcher')));
  function finisher() {
    if (fin || pl.dead || state.paused || (busy(pl) && !canAct(pl))) return;
    const e = nearest(46, -2, finishable);
    if (!e) { say('Stagger him first: a third hit, a power attack or a parry', 'warn'); return; }
    const cls = W8(pl).cls, list = FINISHERS[cls], kind = list[(finTurn[cls] = ((finTurn[cls] ?? -1) + 1) % list.length)];
    pl.face = faceOf(e.x - pl.x, e.y - pl.y); const [fx, fy] = fwd(pl), gap = kind === 'throat' || kind === 'stabs' ? 11 : 17;
    e.x = pl.x + fx * gap; e.y = pl.y + fy * gap / 1.3; e.face = faceOf(pl.x - e.x, pl.y - e.y); e.kb = [0, 0]; e.stagger = 0;
    if (KNEELS[kind]) play(e, 'kneel'); else { play(e, 'stagger'); e.fi = 1; }
    play(pl, `fin_${kind}`); pl.kb = [0, 0];
    fin = { e, kind }; if (attacker === e) attacker = null;
  }
  const P_gurgle = () => sfx('throat');
  // A finisher's blows land on its hit frames in turn (n counts them).
  function landFinisher(n) {
    const { e, kind } = fin, [fx, fy] = fwd(pl), last = { impale: 1, headsplit: 1, legbreak: 1, stabs: 2 }[kind] ?? 0;
    hitStop = n === last ? 0.22 : 0.12; shake = n === last ? 6.5 : 4; if (n === last) { slow = 0.55; state.stats.finishers++; addRage(15); train(W8(pl).skillName, W8(pl).damage * 3); if (furious()) train('Rage', 80); say(FIN_NAMES[kind], 'skill'); if (Math.random() < 0.5) setTimeout(() => bark('finisher', pl), 1100); }
    if (n === last) sfx('finisher');
    const chest = () => { spray(e.x, e.y, 30, 30, [fx, fy], 1.3); if (gore() === 'full') bits(e.x, e.y, 30, 3); };
    switch (kind) {
      case 'behead': kill(e, pl, { part: gore() === 'full' ? 'head' : null }); spray(e.x, e.y, 34, 36, [fx, fy], 1.4); if (gore() !== 'full') sfx('impact', { cls: 'blade', mat: 'flesh', heavy: true }); break;
      case 'impale': if (n === 0) { chest(); play(e, 'impaled'); e.spurt = 1.6; e.spurtAt = 'chest'; sfx('impale'); } else { kill(e, pl); e.kb = [fx * 160, fy * 110]; spray(e.x, e.y, 26, 26, [-fx, -fy], 1.2); sfx('impact', { cls: 'fist', mat: 'flesh', heavy: true }); } break;
      case 'cleave': kill(e, pl, { part: gore() === 'full' ? 'armL' : null }); spray(e.x, e.y, 30, 46, [fx, fy], 1.5); if (gore() === 'full') bits(e.x, e.y, 30, 6); else sfx('impact', { cls: 'axe', mat: 'flesh', heavy: true }); break;
      case 'headsplit': if (n === 0) kill(e, pl, { crush: true }); else { spray(e.x, e.y, 30, 30, [-fx, -fy], 1.2); if (gore() === 'full') bits(e.x, e.y, 34, 8); sfx('dismember'); } break;
      case 'crush': kill(e, pl, { crush: true }); break;
      case 'legbreak': if (n === 0) { play(e, 'kneel'); spray(e.x, e.y, 8, 18, [fx, fy]); if (gore() === 'full') bits(e.x, e.y, 6, 6); sfx('snapLeg'); } else kill(e, pl, { crush: true }); break;
      case 'throat': kill(e, pl, { throat: true }); play(e, 'clutch'); e.dying = 1.1; spray(e.x, e.y, 36, 24, [fx, fy], 1.2); break;
      case 'stabs': if (n < 2) { chest(); e.flash = 0.06; play(e, 'clutch'); sfx('stab'); } else { kill(e, pl); chest(); e.kb = [fx * 60, fy * 40]; e.spurt = 1.4; e.spurtAt = 'chest'; sfx('stab'); P_gurgle(); } break;
    }
  }
  // Space: a quick dodge (a hop, short, cheap). C: a roll (further, safe for longer, dearer).
  const heavyBody = () => ITEMS[pl.eq.body]?.armourType === 'Heavy' && !has('Conditioning');
  function evade(kind, mx, my) {
    if (!canAct(pl) || pl.anim === 'dodge' || pl.anim === 'roll' || state.paused) return;
    const roll = kind === 'roll';
    if (!spend((roll ? 25 : 15) + (heavyBody() ? 5 : 0))) return;
    const [dx, dy] = mx || my ? [mx, my] : (() => { const [fx, fy] = fwd(pl); return [-fx, -fy]; })(), l = Math.hypot(dx, dy) || 1, v = roll ? 330 : 160;
    if (roll && (mx || my)) pl.face = faceOf(dx, dy);
    pl.kb = [(dx / l) * v, (dy / l) * v * 0.8]; pl.inv = roll ? 0.42 : 0.22; play(pl, roll ? 'roll' : 'dodge'); sfx(roll ? 'roll' : 'dodge');
  }
  // Q: Fury. He gathers himself and roars; the blast throws back and staggers everyone near.
  function fury() {
    if (pl.dead || state.fury > 0 || pl.anim === 'roar') return;
    if (state.rage < 60) { say('Not enough Rage', 'warn'); return; }
    if (!canAct(pl) && pl.anim !== 'block' && pl.anim !== 'shieldBlock') return;
    state.rage -= 60; play(pl, 'roar'); pl.inv = 1.0; pl.kb = [0, 0];
  }
  function landRoar() {
    state.fury = furyLength(); state.furyT = 0; state.deathless = false; state.flash = 0.25; shake = 9; hitStop = 0.08; slow = 0.4; state.shock = { x: pl.x, y: pl.y, r: 4 };
    sfx('roar'); say('FURY', 'level'); train('Rage', 30);
    const reach = has('RageWarCry') ? 110 : 70;
    for (const e of foes) {
      if (e.dead) continue;
      const dx = e.x - pl.x, dy = e.y - pl.y, d = Math.hypot(dx, dy * 1.3);
      if (d > reach) continue;
      e.kb = [(dx / (d || 1)) * 200, (dy / (d || 1)) * 140]; play(e, 'stagger'); e.stagger = has('RageWarCry') ? 3.2 : 2.2; if (attacker === e) attacker = null;
      if (has('RageWarCry') && e.hp <= e.maxHp * 0.4) e.fleeT = 5; // terrified
    }
    setTimeout(() => bark('fury', witness(pl)), 900);
  }

  // ---------- the bandits: one swings at a time, the others circle ----------
  function think(e, dt) {
    if (e.dead || fin) return;
    if (e.stagger > 0) { e.stagger -= dt; if (e.stagger <= 0) play(e, 'idle'); return; }
    if (e.anim === 'shieldBlock') { if ((e.blockFor -= dt) <= 0) play(e, 'idle'); return; }
    if (busy(e)) return;
    const dx = pl.x - e.x, dy = pl.y - e.y, d = Math.hypot(dx, dy * 1.3);
    if (!e.aggro && !pl.dead && d < 120 && inCamp(pl.x, pl.y, 1.25)) { for (const o of foes) o.aggro = true; say('The bandits have seen you', 'warn'); bark('spot', e); }
    if (e.fleeT > 0) { e.fleeT -= dt; const l = Math.hypot(dx, dy) || 1; e.x -= (dx / l) * 40 * dt; e.y -= (dy / l) * 32 * dt; e.face = faceOf(-dx, -dy); if (e.anim !== 'run') play(e, 'run'); if (Math.random() < dt * 0.5) bark('scared', e); return; }
    if (!e.aggro || pl.dead) {
      const hx = e.home[0] - e.x, hy = e.home[1] - e.y, hd = Math.hypot(hx, hy);
      if (hd > 3) { e.face = faceOf(hx, hy); e.x += (hx / hd) * 22 * dt; e.y += (hy / hd) * 22 * dt; if (e.anim !== 'walk') play(e, 'walk'); }
      else if (e.anim !== 'idle') play(e, 'idle');
      return;
    }
    e.face = faceOf(dx, dy); e.cool -= dt;
    const mine = attacker === e;
    if (!attacker && e.cool <= 0 && d < 70) attacker = e;
    const want = mine ? 20 + SHAPES[W8(e).shape].len * 0.6 : 44 + (e.id % 3) * 6, sp = mine ? 30 : 24;
    if (d > want + 4) { e.x += (dx / d) * sp * dt; e.y += (dy / d) * sp * dt * 0.8; if (e.anim !== 'walk') play(e, 'walk'); }
    else if (d < want - 6 && !mine) { e.x -= (dx / d) * 18 * dt; e.y -= (dy / d) * 18 * dt * 0.8; if (e.anim !== 'walk') play(e, 'walk'); }
    else if (mine) {
      const heavyBlow = W8(e).hands === 2 || W8(e).cls === 'blunt';
      play(e, heavyBlow ? 'enemyChop' : 'enemySlash'); e.cool = 1.4 + Math.random() * 1.6; e.releaseAfter = true;
      if (Math.random() < 0.3) bark('attack', e);
      // Quick Reflexes: time slows if he winds up a power blow while you block.
      if (heavyBlow && has('QuickReflexes') && (pl.anim === 'block' || pl.anim === 'shieldBlock')) { slow = 0.9; say('Quick Reflexes', 'hint'); }
    }
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
        if (fr[f.fi].hit) {
          if (f.anim.startsWith('fin_')) landFinisher(f.hits++);
          else if (!f.struck) { f.struck = true; if (f.anim === 'bash') landBash(); else if (f.anim === 'roar') landRoar(); else landBlow(f); }
        }
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
    if (f.dying !== undefined && (f.dying -= dt) <= 0) { play(f, 'death'); f.dying = undefined; }
    if (f.spurt > 0 && f.pt) { f.spurt -= dt; const beat = Math.sin(f.spurt * 16) > 0.2; if (beat && Math.random() < 0.95) { const src = f.spurtAt === 'chest' ? f.pt.chest : f.cut.includes('head') || f.anim === 'clutch' || f.spurt > 1.7 ? f.pt.neck : f.cut.includes('armR') ? f.pt.shR : f.pt.shL; spray(f.x + src[0] - OX, f.y + 1, OY - src[1], 3, [Math.sin(f.face) * -0.4, -0.2], 0.9); } }
    // Bleeding (Hack and Slash, Limbsplitter).
    if (f.bleed > 0 && !f.dead) { f.bleed -= dt; f.hp -= (f.bleedRate || 0.1) * dt; if (Math.random() < 6 * dt) spray(f.x, f.y, 26, 1, [0, 0], 0.4); if (f.hp <= 0) kill(f, pl); }
    if (f.dead && f.poolAt !== undefined && f.anim === 'death' && f.fi === frames(f).length - 1 && (f.poolAt -= dt) <= 0) { pool(f.x + Math.sin(f.face) * 10, f.y + Math.cos(f.face) * 6, 9 + (f.cut.length ? 4 : 0) + (f.crushed ? 3 : 0)); f.poolAt = undefined; }
    if (f.anim === 'dodge' || f.anim === 'roll') f.ghosts.push({ x: f.x, y: f.y, t: 0.18, img: frameOf(f).canvas });
    f.ghosts = f.ghosts.filter((g) => (g.t -= dt) > 0);
  }
  function solidPush(f) {
    for (const q of props) for (const [qx, qy, r] of q.solid || []) {
      const ex = f.x - qx, ey = (f.y - qy) * 1.6, e = Math.hypot(ex, ey);
      if (e < r + 5) { f.x += (ex / (e || 1)) * (r + 5 - e); f.y += (ey / (e || 1)) * (r + 5 - e) / 1.6; }
    }
    f.x = clamp(f.x, 8, WW - 8); f.y = clamp(f.y, 20, WH - 4);
  }
  // What E would do here: search a body or open a container.
  function activatable() {
    if (!pl || pl.dead) return null;
    let best = null, bd = 22;
    for (const e of foes) if (e.dead && e.loot) { const d = Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.3); if (d < bd) { best = { kind: 'body', ref: e, name: e.name, verb: 'Search' }; bd = d; } }
    for (const c of containers) { const d = Math.hypot(c.x - pl.x, (c.y - pl.y) * 1.3); if (d < bd + 4) { best = { kind: 'container', ref: c, name: c.name, verb: 'Open' }; bd = d; } }
    return best;
  }
  function update(rdt) {
    if (state.paused) return;
    shake = Math.max(0, shake - 25 * rdt);
    if (state.flash > 0) state.flash -= rdt;
    if (state.shock) { state.shock.r += 260 * rdt; if (state.shock.r > 110) state.shock = null; }
    letter += ((fin ? 1 : 0) - letter) * Math.min(1, rdt * 8);
    if (hitStop > 0) { hitStop -= rdt; return; }
    const dt = slow > 0 ? rdt * 0.3 : rdt; if (slow > 0) slow -= rdt;
    let mx = 0, my = 0;
    if (keys.has('KeyW')) my -= 1; if (keys.has('KeyS')) my += 1; if (keys.has('KeyA')) mx -= 1; if (keys.has('KeyD')) mx += 1;
    const blocking = keys.has('KeyK') || keys.has('mouse2');
    if (!pl.dead && !fin) {
      const blockAnim = shieldOn(pl) ? 'shieldBlock' : 'block';
      if (!busy(pl)) {
        if (blocking && state.stamina > 0) {
          if (pl.anim !== blockAnim) { play(pl, blockAnim); pl.blockT = 0; } pl.blockT += dt;
          if (mx || my) {
            // Block Runner: move faster with the shield up. Shield Charge: sprint into them with it.
            const l = Math.hypot(mx, my), charge = shieldOn(pl) && has('ShieldCharge') && (keys.has('ShiftLeft') || keys.has('ShiftRight')) && state.stamina > 1;
            const sp = charge ? 60 : shieldOn(pl) && has('BlockRunner') ? 30 : 16;
            pl.x += (mx / l) * sp * dt; pl.y += (my / l) * sp * dt * 0.8;
            if (charge) {
              state.stamina -= 18 * dt; state.staminaWait = 0.5;
              for (const e of foes) if (!e.dead && e.stagger <= 0 && Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.3) < 17) { e.kb = [(mx / l) * 220, (my / l) * 160]; play(e, 'stagger'); e.stagger = 2; if (attacker === e) attacker = null; hitStop = 0.08; shake = 4; sfx('bash', { guard: guardOf(pl) }); }
            }
          }
        }
        else if (mx || my) {
          const run = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && state.stamina > 1, l = Math.hypot(mx, my), sp = run ? (heavyBody() ? 58 : 66) : 36;
          if (run && !(furious() && has('RageWind'))) { state.stamina -= 14 * dt; state.staminaWait = 0.5; }
          pl.face = faceOf(mx, my); pl.heading = Math.atan2(mx, -my); pl.x += (mx / l) * sp * dt; pl.y += (my / l) * sp * dt * 0.8;
          if (pl.anim !== (run ? 'run' : 'walk')) play(pl, run ? 'run' : 'walk');
        } else if (pl.anim !== 'idle') play(pl, 'idle');
      } else if (SWINGS.includes(pl.anim) && (mx || my)) {
        // Mid-swing he can still step and steer, at a bit over half his walking pace.
        const l = Math.hypot(mx, my); pl.x += (mx / l) * 20 * dt; pl.y += (my / l) * 20 * dt * 0.8; pl.heading = Math.atan2(mx, -my);
      }
      if (keys.has('Space')) { keys.delete('Space'); evade('dodge', mx, my); }
      if (keys.has('KeyC')) { keys.delete('KeyC'); evade('roll', mx, my); }
      if (pl.buffer && (pl.buffer.left -= dt) <= 0) pl.buffer = null;
      if (pl.buffer && canAct(pl)) { const b = pl.buffer; pl.buffer = null; attack(b.power); }
      if (holdStart !== null && performance.now() - holdStart > 250) { holdStart = null; attack(true); }
      const fighting = foes.some((e) => e.aggro && !e.dead);
      if (!fighting) pl.hp = Math.min(pl.maxHp, pl.hp + 4 * dt);
      if ((state.staminaWait -= dt) <= 0 && !(blocking && busy(pl))) state.stamina = Math.min(100, state.stamina + 22 * dt * (allOf('Light') && has('WindWalker') ? 1.5 : 1));
      if (state.rage >= 60 && !state.ragePing && state.fury <= 0) { state.ragePing = true; say('Rage is ready: Q', 'skill'); } else if (state.rage < 60) state.ragePing = false;
      if (state.fury > 0) { state.fury -= dt; state.furyT += dt; } else if (!fighting) state.rage = Math.max(has('RageSmoulder') ? Math.min(state.rage, 25) : 0, state.rage - 2 * dt);
      if (!fighting && !pl.dead && Math.hypot(pl.x - FIRE.x, pl.y - FIRE.y) < 190) { const by = foes.filter((e) => !e.dead && !e.aggro && Math.hypot(e.x - FIRE.x, e.y - FIRE.y) < 140); window.HFV?.chat(by[0], by[1]); }
      if (!state.discovered && inCamp(pl.x, pl.y, 1.05)) { state.discovered = true; state.events.push({ kind: 'discover', text: 'Coast Road Camp' }); bark('spot', pl); }
    }
    step(pl, dt);
    for (const e of foes) { think(e, dt); step(e, dt); }
    const alive = [pl, ...foes].filter((f) => !f.dead);
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j]; if (fin && (a === fin.e || b === fin.e)) continue;
      const dx = b.x - a.x, dy = (b.y - a.y) * 1.3, d = Math.hypot(dx, dy);
      if (d < 15) { const push = (15 - d) / 2, ux = dx / (d || 1), uy = dy / (d || 1); a.x -= ux * push; a.y -= uy * push / 1.3; b.x += ux * push; b.y += uy * push / 1.3; }
    }
    for (const f of alive) solidPush(f);
    for (const q of pieces) {
      if (q.rest) continue;
      q.vz -= 300 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (Math.random() < 0.5 && gore() !== 'off') particles.push({ x: q.x, y: q.y, z: q.z, vx: 0, vy: 0, vz: 0, c: '#7a0d0a' });
      if (q.z <= 2) { q.z = 2; if (q.vz < -50) { if (!q.bounced) { sfx('land'); spray(q.x, q.y, 2, 6, [q.vx, q.vy], 0.5); } q.bounced = true; q.vz *= -0.35; q.vx *= 0.5; q.vy *= 0.5; q.vr *= 0.5; } else { q.rest = true; q.rot = Math.round(q.rot / (Math.PI / 2)) * (Math.PI / 2); pool(q.x, q.y + 1, 6); streak(q.x, q.y, [q.vx || 1, q.vy], 8); } }
    }
    for (const q of pools) if (q.r < q.max) { q.r += dt * 4; pixelEllipse(dg, q.x, q.y, q.r, q.r * 0.45, '#4a0b0b'); pixelEllipse(dg, q.x, q.y, q.r * 0.7, q.r * 0.3, '#5e100e'); }
    particles = particles.filter((q) => {
      q.vz -= 280 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.spark !== undefined) return (q.spark -= dt) > 0;
      if (q.z <= 0) { dg.fillStyle = q.c; dg.fillRect(Math.round(q.x), Math.round(q.y), q.big ? 2 : 1, q.chunk && q.big ? 2 : 1); if (q.big && !q.chunk && Math.random() < 0.3) dg.fillRect(Math.round(q.x + (Math.random() - 0.5) * 4), Math.round(q.y + (Math.random() - 0.5) * 2), 1, 1); return false; }
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
    const glow = fr.glow, white = f.flash > 0, charge = fr.charge && f === pl, furious = f === pl && state.fury > 0;
    if (glow || white || charge || furious) {
      tg.clearRect(0, 0, SW, SH); tg.globalCompositeOperation = 'source-over'; tg.drawImage(img.canvas, 0, 0); tg.globalCompositeOperation = 'source-atop';
      tg.fillStyle = white ? 'rgba(255,255,255,0.85)' : charge ? 'rgba(255,230,180,0.25)' : furious ? 'rgba(200,30,20,0.28)' : `rgba(255,${Math.floor(performance.now() / 70) % 2 ? 190 : 140},60,0.45)`; tg.fillRect(0, 0, SW, SH);
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
    ctx.fillStyle = 'rgba(10,8,4,0.35)';
    for (const f of [pl, ...foes]) if (!(f.dead && f.anim === 'death' && f.fi > 2)) { ctx.beginPath(); ctx.ellipse(Math.round(f.x), Math.round(f.y), 9, 3.2, 0, 0, 2 * Math.PI); ctx.fill(); }
    const vis = (x, y) => x > camX - 60 && x < camX + W + 60 && y > camY - 20 && y < camY + H + 80;
    const items = [];
    for (const q of props) if (vis(q.x, q.y)) items.push({ y: q.y, draw: () => { const c = q.anim ? q.anim[Math.floor(now / 110) % q.anim.length] : q.canvas; ctx.drawImage(c, Math.round(q.x - q.ox), Math.round(q.y - q.oy)); } });
    for (const f of [pl, ...foes]) if (vis(f.x, f.y)) items.push({ y: f.y - (f.dead && f.fi > 2 ? 8 : 0), draw: () => drawFighter(f) });
    for (const q of pieces) items.push({ y: q.y - (q.rest ? 6 : 0), draw: () => { ctx.save(); ctx.translate(Math.round(q.x), Math.round(q.y - q.z)); ctx.rotate(q.rot); ctx.drawImage(q.canvas, -Math.round(q.canvas.width / 2), -Math.round(q.canvas.height / 2)); ctx.restore(); } });
    items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());
    for (const q of particles) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y - q.z), q.big ? 2 : 1, q.big ? 2 : 1); }
    for (let i = 0; i < 6; i++) { const t = ((now / 1000 + i * 0.37) % 1.6) / 1.6; ctx.fillStyle = t < 0.5 ? '#fdd56a' : '#e07a16'; ctx.fillRect(Math.round(FIRE.x + Math.sin(i * 7 + now / 400) * 6 * t + (i - 3) * 2), Math.round(FIRE.y - 16 - t * 40), 1, 1); }
    if (state.shock) { const s = state.shock; ctx.strokeStyle = `rgba(255,${180 - s.r},120,${1 - s.r / 110})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(Math.round(s.x), Math.round(s.y - 6), s.r, s.r * 0.7, 0, 0, 2 * Math.PI); ctx.stroke(); }
    for (const e of foes) if (finishable(e) && e.aggro && !fin && Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.3) < 60) { const x = Math.round(e.x) - 3, y = Math.round(e.y) - 70; ctx.fillStyle = '#100a07'; ctx.fillRect(x, y, 7, 7); glyph('F', x + 2, y + 1, Math.floor(now / 200) % 2 ? '#fdd56a' : '#fff2b8'); }
    ctx.restore();
    if (settings.light === 'dusk') {
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(178,160,192)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const fl = 1 + (Math.sin(now / 90 * l.flicker) * 0.04 + Math.sin(now / 37) * 0.03) * l.flicker, x = l.x + ox, y = l.y + oy, r = l.r * fl;
        if (x < -r || x > W + r || y < -r || y > H + r) continue;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${l.c[0]},${l.c[1]},${l.c[2]},${l.a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // Fury: the world goes red with anger, the edges pulse with his heartbeat.
    if (state.fury > 0 || pl.anim === 'roar') {
      const beat = Math.pow(Math.max(0, Math.sin(now / 1000 * Math.PI * 2.4)), 6), k = Math.min(1, state.fury > 0 ? Math.min(1, state.fury / 1.5) : 0.6);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(255,${Math.round(255 - 120 * k)},${Math.round(255 - 130 * k)})`; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(150,0,0,${(0.45 + 0.25 * beat) * k})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (state.flash > 0) { ctx.fillStyle = `rgba(255,235,210,${state.flash * 3})`; ctx.fillRect(0, 0, W, H); }
    if (letter > 0.01) { const h = Math.round(18 * letter); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h); }
  }
  // The area as a parchment map, for the Map menu.
  function mapCanvas() {
    const c = document.createElement('canvas'); c.width = WW; c.height = WH; const g = c.getContext('2d');
    g.drawImage(ground, 0, 0);
    for (const q of [...props].sort((a, b) => a.y - b.y)) { const s = q.anim ? q.anim[0] : q.canvas; g.drawImage(s, Math.round(q.x - q.ox), Math.round(q.y - q.oy)); }
    g.globalCompositeOperation = 'color'; g.fillStyle = '#a08860'; g.fillRect(0, 0, WW, WH);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#e8d8b0'; g.fillRect(0, 0, WW, WH);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // ---------- what the menus need (ui.js) ----------
  function take(edid, n) { state.inv[edid] = (state.inv[edid] || 0) + n; if (state.inv[edid] <= 0) { delete state.inv[edid]; for (const k of Object.keys(pl.eq)) if (pl.eq[k] === edid) pl.eq[k] = null; } }
  function equip(edid) {
    const it = ITEMS[edid]; if (!it || !state.inv[edid]) return;
    if (it.cat === 'weapon') { pl.eq.weapon = pl.eq.weapon === edid ? null : edid; if (it.hands === 2 && pl.eq.shield) say('Two-handed: the shield goes on your back', 'info'); }
    else if (it.cat === 'apparel') pl.eq[it.slot] = pl.eq[it.slot] === edid ? null : edid;
  }
  function useItem(edid) {
    const it = ITEMS[edid]; if (!it || !state.inv[edid]) return;
    if (it.cat === 'weapon' || it.cat === 'apparel') return equip(edid);
    if (it.heal) { if (pl.hp >= pl.maxHp) { say('Your health is full', 'warn'); return; } pl.hp = Math.min(pl.maxHp, pl.hp + it.heal); take(edid, -1); say(`${it.name} used`, 'info'); }
  }
  function drop(edid) { if (!state.inv[edid]) return; take(edid, -1); say(`${ITEMS[edid].name} dropped`, 'info'); }
  function lootFrom(src, edid, all) {
    const box = src.loot || src;
    if (edid === 'Gold') { if (!box.gold) return; state.gold += box.gold; state.stats.gold += box.gold; say(`${box.gold} Gold added`, 'item'); box.gold = 0; }
    else {
      if (!box.items[edid]) return; const n = all ? box.items[edid] : 1; take(edid, n); box.items[edid] -= n; if (box.items[edid] <= 0) delete box.items[edid];
      say(`${ITEMS[edid].name}${n > 1 ? ` (${n})` : ''} added`, 'item'); state.stats.looted += n;
      // Gear taken off a body comes off him.
      if (src.loot && !box.items[edid]) src.eq = Object.fromEntries(Object.entries(src.eq).map(([k, v]) => [k, v === edid ? null : v]));
    }
    sfx('pickup'); if (edid === 'ChiefNote') setTimeout(() => bark('note', pl), 400);
    if (src.id === 'chiefChest' && !state.quest.chest) { state.quest.chest = true; say("Objective complete: Search the chief's chest", 'quest'); }
    if (state.quest.chief && state.quest.chest && !state.quest.done) { state.quest.done = true; say('Quest complete: Bandits on the Coast Road', 'quest'); }
  }
  // The armoury buttons put a whole set (or a weapon or shield) in the pack and wear it.
  function wearSet(set) { for (const [slot, e] of Object.entries(SETS[set].pieces)) { if (!state.inv[e]) take(e, 1); pl.eq[slot] = e; } for (const s of ['hands', 'head']) if (!SETS[set].pieces[s]) pl.eq[s] = null; }
  function wear(edid) { if (!edid) { pl.eq.shield = null; return; } if (!state.inv[edid]) take(edid, 1); const it = ITEMS[edid]; if (it.cat === 'weapon') pl.eq.weapon = edid; else pl.eq[it.slot] = edid; }

  window.HF = {
    ITEMS, SETS, SHIELDS, SKILLS, PERKS, SKILL_NAMES, state, settings, toNext, PERK, chainOf, rank, canTake, takePerk, NOT_HERE,
    cheat: { perks: (n) => { state.perkPoints += n; }, skills: (n) => { for (const k of ['OneHanded', 'TwoHanded', 'Block', 'HeavyArmor', 'LightArmor', 'Rage']) state.skills[k].level = Math.min(100, state.skills[k].level + n); } }, get pl() { return pl; }, get foes() { return foes; },
    icon, mapCanvas, equip, useItem, drop, lootFrom, wearSet, wear, activatable, armourRating, carried, reset, fury, finisher, attack,
    inCombat: () => foes.some((e) => e.aggro && !e.dead),
    target: () => (attacker && !attacker.dead ? attacker : foes.find((e) => e.aggro && !e.dead && Math.hypot(e.x - pl.x, e.y - pl.y) < 70)) || null,
    containers: () => containers, world: { W: WW, H: WH, camp: CAMP }, keys,
    screenOf: (x, y) => [((x - camX) / W) * 100, ((y - camY) / H) * 100],
    // For checking the page from a script.
    teleport: (x, y) => { pl.x = x; pl.y = y; camX = clamp(x - W / 2, 0, WW - W); camY = clamp(y - H / 2, 0, WH - H); },
    stagger: (i) => { const e = foes[i]; play(e, 'stagger'); e.stagger = 5; e.aggro = true; }, face: (x, y) => { pl.face = faceOf(x - pl.x, y - pl.y); },
    killAll: () => { for (const e of foes) if (!e.dead) kill(e, pl); },
    frameFor: (person, eq, anim, i, face) => frameOf({ person, eq, cut: [], crushed: false }, anim, i, face).canvas,
  };

  // ---------- controls (the menus take the keyboard while open: ui.js) ----------
  addEventListener('keydown', (e) => {
    if (state.paused || e.target.tagName === 'INPUT') return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyJ', 'KeyK', 'KeyF', 'KeyQ', 'KeyC', 'ShiftLeft'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyJ') { if (keys.has('KeyK') || keys.has('mouse2')) { bash(); return; } holdStart = performance.now(); }
    if (e.code === 'KeyF') finisher();
    if (e.code === 'KeyQ') fury();
  });
  addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'KeyJ' && holdStart !== null) { holdStart = null; attack(false); } });
  view.addEventListener('contextmenu', (e) => e.preventDefault());
  view.addEventListener('mousedown', (e) => { if (state.paused) return; if (e.button === 0) { if (keys.has('KeyK') || keys.has('mouse2')) { bash(); return; } holdStart = performance.now(); } if (e.button === 2) keys.add('mouse2'); });
  addEventListener('mouseup', (e) => { if (e.button === 0 && holdStart !== null) { holdStart = null; attack(false); } if (e.button === 2) keys.delete('mouse2'); });
  addEventListener('blur', () => keys.clear());

  reset();
  let last = performance.now();
  function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); draw(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  window.dispatchEvent(new Event('hf-ready'));
})();
