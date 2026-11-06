/* =====================================================================
   The world's things, drawn by code: buildings in the coastal Redguard style (whitewash
   and sandstone, flat roofs with parapets, the odd dome, wooden roof beams, striped
   awnings), trees of the coast, the farm, the village, the camp, the ruins and the
   furniture inside. Each maker returns { canvas, ox, oy }: (ox, oy) is where the thing
   stands on the ground. SOLID says how much of the ground each kind blocks.
   ===================================================================== */
import { Px, blob, poly, rod, finish, tone, hash, fbm, clamp, RAMPS, done, ITEM_ART,
  stake, tent, crate, chest, sack, barrel, logSeat, rack, pike, torchPost, flame, fireFrames, torchFrames, tree, rock } from './art.js';

const C = 0.77; // how tall a height looks from the camera (cos 40 degrees)

// ---------- buildings ----------
// A house: a front wall and a flat roof seen from above and in front. w and d are the
// footprint on the ground, h the wall height. door: where along the front the door is (0..1).
export function house(o = {}) {
  const w = o.w ?? 60, d = o.d ?? 40, h = o.h ?? 26, hh = Math.round(h * C), wall = o.wall ?? 'plaster', trim = o.trim ?? 'sandstone';
  const W = w + 10, H = d + hh + 16, x0 = 5, x1 = 5 + w, base = H - 3, top = base - hh, roofTop = top - d;
  const p = new Px(W, H), burned = !!o.burned;
  // the roof: flat, with a parapet; on a burned house, open to the sky and full of ash
  for (let y = roofTop; y < top; y++) for (let x = x0; x < x1; x++) {
    const edge = x < x0 + 2 || x >= x1 - 2 || y < roofTop + 2 || y >= top - 1;
    let v = 0.62 - (y - roofTop) / d * 0.12 + 0.1 * (fbm(x * 0.3, y * 0.3, 7) - 0.5);
    if (burned) { p.set(x, y, edge ? tone('ash', 0.4 + v * 0.3, x, y) : tone(hash(x >> 2, y >> 2, 3) < 0.15 ? 'wood' : 'ash', 0.25 + 0.2 * fbm(x * 0.2, y * 0.2, 9), x, y)); continue; }
    p.set(x, y, tone(o.roof === 'tile' ? 'tile' : wall, edge ? v + 0.12 : v - 0.04 + ((x + y) % 23 === 0 ? -0.1 : 0), x, y));
  }
  if (!burned && o.dome) blob(p, x0 + w * 0.5, roofTop + d * 0.45, w * 0.22, d * 0.32, o.dome === true ? 'white' : o.dome, { tex: 0.08, bias: 0.12 });
  if (!burned && o.clutter) for (let k = 0; k < 3; k++) { const cx = x0 + 6 + hash(k, 1, w) * (w - 12), cy = roofTop + 5 + hash(k, 2, d) * (d - 10); blob(p, cx, cy, 2.5, 2, k % 2 ? 'tile' : 'hide', { tex: 0 }); }
  // the front wall
  for (let y = top; y < base; y++) for (let x = x0; x < x1; x++) {
    const n = fbm(x * 0.25, y * 0.25, 11), u = (x - x0) / w;
    let v = 0.5 - u * 0.12 + 0.12 * (n - 0.5) - (y > base - 3 ? 0.18 : 0) + (y < top + 2 ? 0.08 : 0);
    if (burned) { p.set(x, y, tone(n > 0.55 ? 'ash' : wall, v - (n > 0.55 ? 0 : 0.28), x, y)); continue; }
    if (wall === 'sandstone' && (y - top) % 5 === 0) v -= 0.08;
    if (wall === 'sandstone' && ((x + Math.floor((y - top) / 5) * 4) % 9 === 0)) v -= 0.06;
    p.set(x, y, tone(wall, v, x, y));
  }
  // roof beams poking through the top of the wall
  if (o.beams !== false) for (let x = x0 + 4; x < x1 - 3; x += 7) { rod(p, x, top + 2, x + 0.5, top + 4, 2.2, 2.2, burned ? 'ash' : 'wood'); }
  // windows with shutters
  const nw = o.windows ?? 2, door = o.door ?? 0.5;
  for (let k = 0; k < nw; k++) {
    const u = (k + 0.5) / nw, wx = Math.round(x0 + u * w);
    if (Math.abs(u - door) < 0.18) continue;
    const wy = top + Math.round(hh * 0.3);
    for (let y = wy; y < wy + 6; y++) for (let x = wx - 3; x < wx + 3; x++) p.set(x, y, burned ? '#0a0806' : o.lit ? (y < wy + 2 ? '#f0b050' : '#c07a30') : '#141010');
    if (!burned) { for (let y = wy; y < wy + 6; y++) { p.set(wx - 4, y, tone(o.shutter ?? 'teal', 0.5, wx, y)); p.set(wx + 3, y, tone(o.shutter ?? 'teal', 0.4, wx, y)); } for (let x = wx - 4; x < wx + 4; x++) p.set(x, wy - 1, tone(trim, 0.6, x, wy)); }
  }
  // the door: an arch in dark wood, or a black hole if burned
  if (door >= 0) {
    const dx = Math.round(x0 + door * w), dw = o.doorW ?? 9, dh = Math.min(hh - 3, 16);
    poly(p, [[dx - dw / 2, base], [dx - dw / 2, base - dh + 3], [dx - dw / 4, base - dh], [dx + dw / 4, base - dh], [dx + dw / 2, base - dh + 3], [dx + dw / 2, base]],
      (x, y) => (burned ? '#070505' : tone('wood', 0.35 + (x % 3 === 0 ? -0.1 : 0), x, y)));
    if (!burned) { for (let y = base - dh; y < base; y++) { p.set(dx - dw / 2 - 1, y, tone(trim, 0.55, dx, y)); p.set(dx + dw / 2, y, tone(trim, 0.45, dx, y)); } p.set(dx + 2, base - dh / 2, tone('brass', 0.7, dx, base)); }
    // a striped awning over the door
    if (o.awning && !burned) {
      const aw = dw + 12, ay = base - dh - 3;
      poly(p, [[dx - aw / 2, ay - 6], [dx + aw / 2, ay - 6], [dx + aw / 2 + 3, ay + 2], [dx - aw / 2 - 3, ay + 2]], (x, y) => tone(Math.floor((x - dx) / 3) % 2 ? o.awning : 'white', 0.62 - (y - ay + 6) * 0.03, x, y));
      for (const s of [-1, 1]) rod(p, dx + s * (aw / 2 + 2), ay + 2, dx + s * (aw / 2 + 2), base - 1, 1.4, 1.4, 'wood');
    }
  }
  if (o.sign) { const sx = x0 + Math.round(w * (door > 0.5 ? 0.22 : 0.78)), sy = top + Math.round(hh * 0.25); rod(p, sx - 6, sy - 3, sx + 6, sy - 3, 1, 1, 'iron'); for (let y = sy - 2; y < sy + 4; y++) for (let x = sx - 5; x < sx + 5; x++) p.set(x, y, tone(o.sign, 0.5 + (x === sx - 5 || y === sy + 3 ? -0.15 : 0), x, y)); }
  if (o.banner && !burned) { const bx = x0 + w - 8; for (let y = top + 2; y < top + 14; y++) for (let x = bx; x < bx + 5; x++) p.set(x, y, tone(o.banner, 0.55 - (y - top) * 0.01, x, y)); }
  return { ...done(p, Math.round(W / 2), base), door: [Math.round(x0 + door * w) - Math.round(W / 2), 0] };
}

// ---------- nature ----------
export function palm(v = 0) {
  const p = new Px(54, 72), lean = [-6, 4, -2][v % 3], tx = 27 + lean;
  for (let k = 0; k < 9; k++) { const t = k / 9; rod(p, 27 + lean * t * t, 70 - t * 46, 27 + lean * (t + 0.11) ** 2, 70 - (t + 0.11) * 46, 4.2, 3.8, 'wood', { fn: (x, y, tt, a, val) => (y % 3 === 0 ? tone('wood', val - 0.18, x, y) : null) }); }
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + v, ex = tx + Math.cos(a) * 22, ey = 22 + Math.sin(a) * 11 + 6;
    for (let j = 0; j < 6; j++) { const t0 = j / 6, t1 = (j + 1) / 6, sag = (t) => Math.sin(t * Math.PI) * -5 + t * t * 6; rod(p, tx + (ex - tx) * t0, 22 + (ey - 22) * t0 + sag(t0), tx + (ex - tx) * t1, 22 + (ey - 22) * t1 + sag(t1), 4 - t0 * 2.5, 3.5 - t1 * 2.5, 'leaf', { bias: 0.08 - (Math.sin(a) > 0 ? 0.12 : 0), fn: (x, y, t, aa, val) => ((x + y) % 2 && Math.abs(aa) > 0.6 ? tone('leaf', val - 0.15, x, y) : null) }); }
  }
  blob(p, tx, 23, 3, 2.5, 'wood', { tex: 0 });
  return done(p, 27, 70);
}
export function olive(v = 0) {
  const p = new Px(50, 50);
  rod(p, 25, 48, 23, 30, 4.5, 3.5, 'wood', { tex: 0.25 }); rod(p, 24, 34, 16, 26, 2.5, 2, 'wood'); rod(p, 24, 34, 32, 25, 2.5, 2, 'wood');
  blob(p, 25, 21, 18 + v, 13, 'dry', { rough: 0.35, seed: 80 + v, tex: 0.35, bias: 0.05 });
  for (let k = 0; k < 14; k++) blob(p, 12 + hash(k, v, 81) * 26, 12 + hash(k, v + 3, 81) * 16, 3, 2.4, 'dry', { bias: 0.15 - (hash(k, 9, 81) > 0.5 ? 0.2 : 0), tex: 0.2, seed: k });
  return done(p, 25, 48);
}
// The pomegranate under which the family is buried: dark leaves and red fruit.
export function pomegranate() {
  const p = new Px(52, 54);
  rod(p, 26, 52, 26, 32, 4, 3.4, 'wood', { tex: 0.25 });
  blob(p, 26, 22, 20, 16, 'leaf', { rough: 0.3, seed: 90, tex: 0.3, bias: -0.08 });
  for (let k = 0; k < 12; k++) blob(p, 10 + hash(k, 1, 91) * 32, 10 + hash(k, 2, 91) * 22, 3.2, 2.6, 'leaf', { bias: 0.08, tex: 0.2, seed: k });
  for (let k = 0; k < 9; k++) blob(p, 11 + hash(k, 3, 92) * 30, 12 + hash(k, 4, 92) * 20, 1.6, 1.6, 'red', { bias: 0.2, tex: 0 });
  return done(p, 26, 52);
}
export function bush(v = 0) { const p = new Px(28, 22); blob(p, 14, 12, 11, 8, v % 2 ? 'dry' : 'leaf', { rough: 0.35, seed: 30 + v, tex: 0.35 }); for (let k = 0; k < 5; k++) blob(p, 6 + hash(k, v, 31) * 16, 7 + hash(k, v + 1, 31) * 8, 2.4, 2, v % 2 ? 'dry' : 'leaf', { bias: 0.15, tex: 0.2, seed: k }); return done(p, 14, 19); }
export function scrub(v = 0) { const p = new Px(22, 16); for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI - Math.PI, l = 6 + hash(k, v, 5) * 4; rod(p, 11, 14, 11 + Math.cos(a) * l, 14 + Math.sin(a) * l * 0.8, 1.2, 0.8, 'dry'); } return done(p, 11, 14); }
export function boulder(v = 0) { const p = new Px(40, 30); blob(p, 20, 17, 17 - v * 2, 11 - v, 'stone', { rough: 0.3, seed: 41 + v, tex: 0.3 }); blob(p, 13, 21, 7, 5, 'stone', { rough: 0.3, seed: 44 + v, tex: 0.3, bias: -0.05 }); return done(p, 20, 26); }
export function reeds() { const p = new Px(20, 22); for (let k = 0; k < 9; k++) { const x = 3 + k * 1.7 + hash(k, 1, 6) * 2; rod(p, x, 21, x + (hash(k, 2, 6) - 0.5) * 4, 6 + hash(k, 3, 6) * 6, 1, 0.8, 'dry', { bias: 0.1 }); } return done(p, 10, 21); }
export function driftwood() { const p = new Px(30, 10); rod(p, 3, 6, 27, 4, 3.4, 2.4, 'bone', { bias: -0.1, tex: 0.2 }); rod(p, 18, 5, 23, 1, 1.4, 1, 'bone'); return done(p, 15, 8); }

// ---------- the farm and the village ----------
export function fence(o = {}) { // along x (len) or along y (vert)
  if (o.vert) { const len = o.len ?? 24, p = new Px(10, len + 16); for (let y = 2; y <= len; y += 12) rod(p, 5, y + 12, 5, y + 2, 2.4, 2.2, 'wood'); rod(p, 5, 6, 5, len + 6, 1.6, 1.6, 'wood', { bias: 0.1 }); return done(p, 5, len + 14); }
  const len = o.len ?? 24, p = new Px(len + 6, 18);
  for (let x = 3; x <= len + 3; x += 12) rod(p, x, 16, x, 4, 2.4, 2.2, 'wood');
  if (!o.broken) { rod(p, 3, 7, len + 3, 7, 1.6, 1.6, 'wood', { bias: 0.1 }); rod(p, 3, 11, len + 3, 11, 1.6, 1.6, 'wood', { bias: 0.05 }); }
  else { rod(p, 3, 7, len * 0.4, 9, 1.6, 1.6, 'wood'); rod(p, len * 0.55, 15, len + 3, 11, 1.6, 1.6, 'wood', { bias: -0.1 }); }
  return done(p, Math.round((len + 6) / 2), 16);
}
export function well() {
  const p = new Px(30, 36);
  blob(p, 15, 27, 12, 6.5, 'stone', { tex: 0.25, fn: (x, y, v) => (Math.hypot(x - 15, (y - 26) * 1.8) < 8 ? tone('water', 0.35, x, y) : (x + y) % 4 === 0 ? tone('stone', v - 0.12, x, y) : null) });
  for (const x of [5, 25]) rod(p, x, 26, x, 6, 2.2, 2.2, 'wood');
  rod(p, 4, 7, 26, 7, 2, 2, 'wood', { bias: 0.1 }); poly(p, [[2, 6], [28, 6], [24, 1], [6, 1]], (x, y) => tone('tile', 0.5 - y * 0.03, x, y));
  rod(p, 15, 8, 15, 16, 0.8, 0.8, 'leather'); blob(p, 15, 17, 2.4, 2, 'wood', { tex: 0 });
  return done(p, 15, 32);
}
export function stall(o = {}) {
  const c = o.cloth ?? 'red', p = new Px(46, 40);
  for (const x of [5, 41]) rod(p, x, 37, x, 10, 1.8, 1.8, 'wood');
  poly(p, [[1, 12], [45, 12], [43, 2], [3, 2]], (x, y) => tone(Math.floor(x / 5) % 2 ? c : 'white', 0.6 - y * 0.02, x, y));
  for (let y = 22; y < 34; y++) for (let x = 4; x < 42; x++) p.set(x, y, tone('wood', y < 25 ? 0.62 : 0.38 - (y - 25) * 0.02 + (x % 7 === 0 ? -0.1 : 0), x, y));
  const goods = o.goods ?? 'salt';
  for (let k = 0; k < 5; k++) { const gx = 8 + k * 7.5; if (goods === 'salt') blob(p, gx, 20, 3.2, 2.6, 'salt', { bias: 0.15, tex: 0.1 }); else if (goods === 'bread') blob(p, gx, 21, 3, 1.8, 'hide', { bias: 0.15, tex: 0.1 }); else if (goods === 'herbs') { blob(p, gx, 21, 2.6, 2, k % 2 ? 'leaf' : 'dry', { tex: 0.3 }); } else if (goods === 'fish') rod(p, gx - 3, 21, gx + 3, 20, 2, 1.2, 'steel', { bias: 0.1 }); else blob(p, gx, 21, 2.6, 2.6, ['red', 'ochre', 'teal'][k % 3], { tex: 0.2 }); }
  return done(p, 23, 36);
}
export function saltPile(v = 0) { const p = new Px(26, 18); blob(p, 13, 11, 11 - v, 7, 'salt', { tex: 0.15, bias: 0.12, rough: 0.15, seed: v }); return done(p, 13, 16); }
export function boat(v = 0) {
  const p = new Px(52, 22);
  poly(p, [[3, 9], [8, 3], [44, 3], [50, 9], [44, 16], [8, 16]], (x, y) => (y > 5 && y < 14 && x > 8 && x < 44 ? tone('wood', 0.28 + (y % 3 === 0 ? -0.08 : 0), x, y) : tone(v % 2 ? 'teal' : 'wood', 0.55 - Math.abs(y - 9) * 0.03, x, y)));
  for (const x of [18, 30]) rod(p, x, 5, x, 14, 1.4, 1.4, 'wood', { bias: 0.1 });
  return done(p, 26, 18);
}
export function dock(o = {}) { const len = o.len ?? 60, p = new Px(22, len + 8); for (let y = 2; y < len; y++) for (let x = 3; x < 19; x++) p.set(x, y, tone('wood', 0.5 + ((y % 5) === 0 ? -0.15 : 0) + 0.08 * (fbm(x * 0.4, y * 0.4, 4) - 0.5), x, y)); for (const x of [3, 18]) for (let y = 4; y < len; y += 14) rod(p, x, y, x, y + 6, 2.4, 2.4, 'wood', { bias: -0.15 }); return done(p, 11, len); }
export function signpost(o = {}) { const p = new Px(28, 34); rod(p, 14, 32, 14, 6, 2.2, 2.2, 'wood'); poly(p, [[3, 6], [22, 6], [26, 9], [22, 12], [3, 12]], (x, y) => tone('wood', 0.6, x, y)); poly(p, [[5, 15], [24, 15], [24, 21], [5, 21], [1, 18]], (x, y) => tone('wood', 0.5, x, y)); return done(p, 14, 32); }
export function noticeBoard() { const p = new Px(30, 34); for (const x of [4, 26]) rod(p, x, 32, x, 6, 2, 2, 'wood'); for (let y = 6; y < 22; y++) for (let x = 3; x < 28; x++) p.set(x, y, tone('wood', 0.5, x, y)); for (const [x, y] of [[6, 8], [14, 9], [20, 8], [10, 14]]) for (let yy = y; yy < y + 6; yy++) for (let xx = x; xx < x + 5; xx++) p.set(xx, yy, tone('bone', 0.75 - (yy - y) * 0.02, xx, yy)); return done(p, 15, 32); }
export function cart() { const p = new Px(40, 28); for (let y = 6; y < 18; y++) for (let x = 4; x < 32; x++) p.set(x, y, tone('wood', y < 9 ? 0.6 : 0.4 + (x % 6 === 0 ? -0.1 : 0), x, y)); for (const x of [10, 26]) blob(p, x, 20, 5, 5, 'wood', { tex: 0, fn: (xx, yy, v) => (Math.hypot(xx - x, yy - 20) < 3 ? tone('wood', v - 0.25, xx, yy) : null) }); rod(p, 32, 14, 39, 16, 1.6, 1.6, 'wood'); blob(p, 18, 5, 8, 3.5, 'canvas', { tex: 0.2 }); return done(p, 18, 25); }
export function hay() { const p = new Px(26, 22); blob(p, 13, 12, 11, 8, 'ochre', { tex: 0.3, rough: 0.2, fn: (x, y, v) => ((x * 3 + y) % 5 === 0 ? tone('ochre', v + 0.15, x, y) : null) }); return done(p, 13, 19); }
export function brazier(i = 0) { const p = new Px(16, 26); rod(p, 8, 24, 8, 12, 2, 2, 'iron'); blob(p, 8, 11, 6, 3, 'iron', { tex: 0 }); const c = p.canvas(); c.getContext('2d').drawImage(flame(9, 11, i * 0.7, 93), 4, 0); return { canvas: c, ox: 8, oy: 24 }; }
export function lampPost(i = 0) { const p = new Px(14, 40); rod(p, 7, 38, 7, 8, 2, 2, 'iron'); rod(p, 7, 8, 11, 8, 1.2, 1.2, 'iron'); const g = finish(p, 0.28).canvas(); const c = document.createElement('canvas'); c.width = 14; c.height = 40; const x = c.getContext('2d'); x.drawImage(g, 0, 0); x.fillStyle = i % 2 ? '#ffd27a' : '#ffc060'; x.fillRect(9, 9, 4, 5); return { canvas: c, ox: 7, oy: 38 }; }
export function bench() { const p = new Px(30, 14); rod(p, 3, 6, 27, 6, 4, 4, 'wood', { bias: 0.1 }); for (const x of [6, 24]) rod(p, x, 8, x, 12, 1.6, 1.6, 'wood'); return done(p, 15, 12); }

// ---------- the farm in the story ----------
export function cairn(v = 0) { const p = new Px(v === 2 ? 18 : 28, 18); const n = v === 2 ? 5 : 9, w = v === 2 ? 14 : 24; for (let k = 0; k < n; k++) blob(p, 2 + hash(k, v, 7) * w, 7 + hash(k, v + 1, 7) * 7, 3, 2.4, 'stone', { tex: 0.2, seed: k + v * 9 }); if (v === 1) for (let y = 2; y < 9; y++) for (let x = 11; x < 16; x++) p.set(x, y, tone('stone', 0.6 + (y === 2 ? 0.1 : 0), x, y)); return done(p, Math.round(p.w / 2), 15); }
export function shrine() {
  const p = new Px(30, 44);
  for (let y = 30; y < 40; y++) for (let x = 3; x < 27; x++) p.set(x, y, tone('sandstone', y < 33 ? 0.62 : 0.4, x, y));
  rod(p, 15, 31, 15, 12, 7, 6, 'sandstone', { bias: 0.05 });
  blob(p, 15, 8, 5, 5, 'sandstone', { bias: 0.08 }); // a weathered figure: Tu'whacca, guide of souls
  rod(p, 9, 18, 21, 18, 2, 2, 'sandstone');
  for (let k = 0; k < 4; k++) blob(p, 7 + k * 5, 29, 1.2, 1.2, k % 2 ? 'red' : 'ochre', { tex: 0 }); // offerings
  return done(p, 15, 38);
}

// ---------- ruins: the drowned Yokudan stair ----------
export function column(v = 0) { const p = new Px(18, 50), top = v === 1 ? 26 : 6; rod(p, 9, 46, 9, top, 9, 8, 'sandstone', { fn: (x, y, t, a, val) => (Math.round(a * 3) % 2 === 0 ? tone('sandstone', val - 0.1, x, y) : null) }); if (v !== 1) for (let y = top - 4; y < top + 2; y++) for (let x = 2; x < 16; x++) p.set(x, y, tone('sandstone', 0.6, x, y)); else for (let k = 0; k < 4; k++) blob(p, 3 + k * 4, 46, 2.5, 2, 'sandstone', { tex: 0.2 }); return done(p, 9, 46); }
export function carvedBlock(v = 0) { const p = new Px(26, 22); for (let y = 4; y < 20; y++) for (let x = 2; x < 24; x++) { const top = y < 9, glyph = !top && (x * 7 + y * 3 + v) % 11 === 0; p.set(x, y, tone('sandstone', top ? 0.62 : glyph ? 0.25 : 0.42 + 0.08 * (fbm(x * 0.3, y * 0.3, 12) - 0.5), x, y)); } return done(p, 13, 19); }
export function arch() {
  const p = new Px(58, 60);
  for (const x of [10, 48]) rod(p, x, 58, x, 18, 11, 10, 'sandstone', { fn: (xx, y, t, a, v) => (y % 7 === 0 ? tone('sandstone', v - 0.12, xx, y) : null) });
  for (let k = 0; k <= 12; k++) { const a0 = Math.PI * (k / 12), a1 = Math.PI * ((k + 1) / 12); rod(p, 29 - Math.cos(a0) * 19, 20 - Math.sin(a0) * 14, 29 - Math.cos(a1) * 19, 20 - Math.sin(a1) * 14, 9, 9, 'sandstone'); }
  return done(p, 29, 58);
}
export function steps() { const p = new Px(60, 40); for (let k = 0; k < 6; k++) for (let y = k * 6; y < k * 6 + 6; y++) for (let x = 2 + k * 2; x < 58 - k * 2; x++) p.set(x, y, tone('sandstone', (y % 6 < 2 ? 0.62 : 0.4) - k * 0.04, x, y)); return done(p, 30, 36); }
export function kennel() { const p = new Px(30, 26); for (let y = 8; y < 22; y++) for (let x = 3; x < 27; x++) p.set(x, y, tone('wood', y < 11 ? 0.6 : 0.4 + (x % 5 === 0 ? -0.1 : 0), x, y)); poly(p, [[10, 22], [10, 15], [15, 12], [20, 15], [20, 22]], () => '#0d0906'); return done(p, 15, 22); }

// ---------- inside ----------
export function bed(o = {}) { const p = new Px(26, 38); for (let y = 4; y < 34; y++) for (let x = 3; x < 23; x++) p.set(x, y, x < 5 || x > 20 || y < 6 ? tone('wood', 0.45, x, y) : y < 12 ? tone('white', 0.7, x, y) : tone(o.cloth ?? 'red', 0.5 + 0.06 * Math.sin(y * 0.8), x, y)); return done(p, 13, 34); }
export function table(o = {}) { const p = new Px(36, 26); for (let y = 3; y < 18; y++) for (let x = 2; x < 34; x++) p.set(x, y, tone('wood', y < 15 ? 0.58 + (x % 8 === 0 ? -0.08 : 0) : 0.35, x, y)); for (const x of [4, 31]) rod(p, x, 18, x, 23, 1.8, 1.8, 'wood'); if (o.laid) { for (const x of [9, 18, 27]) blob(p, x, 9, 3, 2, 'white', { tex: 0, fn: (xx, yy, v) => (Math.hypot(xx - x, (yy - 9) * 1.4) < 1.8 ? tone(o.food ?? 'field', v - 0.1, xx, yy) : null) }); } if (o.salt) blob(p, 18, 13, 1.6, 1.2, 'white', { bias: 0.3, tex: 0 }); return done(p, 18, 23); }
export function chair() { const p = new Px(14, 20); for (let y = 8; y < 13; y++) for (let x = 2; x < 12; x++) p.set(x, y, tone('wood', 0.55, x, y)); rod(p, 3, 8, 3, 1, 1.6, 1.6, 'wood'); rod(p, 11, 8, 11, 1, 1.6, 1.6, 'wood'); rod(p, 3, 3, 11, 3, 1.4, 1.4, 'wood'); for (const x of [3, 11]) rod(p, x, 13, x, 18, 1.4, 1.4, 'wood'); return done(p, 7, 18); }
export function hearth(i = 0) { const p = new Px(36, 40); for (let y = 4; y < 36; y++) for (let x = 2; x < 34; x++) { const inner = x > 9 && x < 27 && y > 16; p.set(x, y, inner ? tone('ash', 0.15, x, y) : tone('stone', 0.5 + ((x + (y >> 2) * 3) % 6 === 0 ? -0.12 : 0) - (y > 32 ? 0.1 : 0), x, y)); } const c = finish(p, 0.28).canvas(), g = c.getContext('2d'); g.drawImage(flame(14, 16, i * 0.6, 94), 11, 18); return { canvas: c, ox: 18, oy: 36 }; }
export function shelf() { const p = new Px(30, 34); for (let y = 2; y < 32; y++) for (let x = 2; x < 28; x++) p.set(x, y, (y - 2) % 10 < 2 ? tone('wood', 0.55, x, y) : x < 4 || x > 25 ? tone('wood', 0.4, x, y) : '#1a120c'); for (let k = 0; k < 7; k++) blob(p, 6 + (k % 4) * 6, 8 + Math.floor(k / 4) * 10, 2, 2.6, ['tile', 'white', 'ochre', 'teal'][k % 4], { tex: 0 }); return done(p, 15, 32); }
export function rug(o = {}) { const w = o.w ?? 40, h = o.h ?? 24, p = new Px(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const b = x < 3 || x > w - 4 || y < 3 || y > h - 4, m = (Math.abs(x - w / 2) + Math.abs(y - h / 2)) % 8 < 2; p.set(x, y, tone(b ? 'ochre' : m ? 'navy' : o.cloth ?? 'red', 0.45, x, y)); } return { canvas: p.canvas(), ox: w / 2, oy: h / 2, flat: true }; }
export function anvil() { const p = new Px(26, 20); rod(p, 13, 18, 13, 11, 6, 4, 'iron'); poly(p, [[3, 6], [20, 6], [24, 8], [20, 11], [6, 11]], (x, y) => tone('iron', 0.6 - (y - 6) * 0.05, x, y)); return done(p, 13, 18); }
export function forge(i = 0) { const p = new Px(40, 40); for (let y = 6; y < 36; y++) for (let x = 3; x < 37; x++) p.set(x, y, x > 10 && x < 30 && y > 14 && y < 24 ? '#1a0d06' : tone('stone', 0.45 + ((x + (y >> 2) * 2) % 5 === 0 ? -0.1 : 0), x, y)); const c = finish(p, 0.28).canvas(); c.getContext('2d').drawImage(flame(16, 10, i * 0.6, 95), 12, 13); return { canvas: c, ox: 20, oy: 36 }; }
export function counter() { const p = new Px(60, 22); for (let y = 2; y < 20; y++) for (let x = 2; x < 58; x++) p.set(x, y, tone('wood', y < 7 ? 0.6 : 0.38 + (x % 10 === 0 ? -0.1 : 0), x, y)); for (const x of [12, 30, 46]) blob(p, x, 4, 2.5, 1.6, ['tile', 'white', 'ochre'][x % 3], { tex: 0 }); return done(p, 30, 20); }
export function dummy() { const p = new Px(20, 40); rod(p, 10, 38, 10, 10, 2.4, 2.4, 'wood'); rod(p, 3, 16, 17, 16, 2, 2, 'wood'); blob(p, 10, 22, 6, 9, 'canvas', { tex: 0.3, fn: (x, y, v) => ((x + y) % 5 === 0 ? tone('hay' in RAMPS ? 'hay' : 'ochre', v, x, y) : null) }); blob(p, 10, 8, 4, 4, 'canvas', { tex: 0.2 }); return done(p, 10, 38); }

// ---------- what each kind is and how much ground it blocks ----------
// SOLID: a radius (a post, a trunk) or a rectangle [x0, y0, x1, y1] about the anchor.
export const MAKERS = {
  palm: (v) => palm(v), olive: (v) => olive(v), tree: (v) => tree(v), pomegranate: () => pomegranate(), bush: (v) => bush(v), scrub: (v) => scrub(v), rock: () => rock(), boulder: (v) => boulder(v), reeds: () => reeds(), driftwood: () => driftwood(),
  fence: (v, o) => fence(o), well: () => well(), stall: (v, o) => stall(o), saltPile: (v) => saltPile(v), boat: (v) => boat(v), dock: (v, o) => dock(o), signpost: () => signpost(), noticeBoard: () => noticeBoard(), cart: () => cart(), hay: () => hay(), bench: () => bench(),
  cairn: (v) => cairn(v), shrine: () => shrine(), column: (v) => column(v), carvedBlock: (v) => carvedBlock(v), arch: () => arch(), steps: () => steps(), kennel: () => kennel(),
  bed: (v, o) => bed(o), table: (v, o) => table(o), chair: () => chair(), shelf: () => shelf(), rug: (v, o) => rug(o), anvil: () => anvil(), counter: () => counter(), dummy: () => dummy(),
  crate: () => crate(), chest: () => chest(), sack: () => sack(), barrel: () => barrel(), stake: (v) => stake(24 + v * 2, v % 5), tent: (v, o) => tent(o.big ? 1.35 : 1), logSeat: () => logSeat(), rack: () => rack(), pike: () => pike(), house: (v, o) => house(o),
};
// Animated kinds: a list of frames.
export const ANIMATED = {
  fire: () => fireFrames(), torch: () => torchFrames(), brazier: () => [0, 1, 2, 3, 4].map((i) => brazier(i)), hearth: () => [0, 1, 2, 3, 4].map((i) => hearth(i)), forge: () => [0, 1, 2, 3].map((i) => forge(i)), lampPost: () => [0, 1].map((i) => lampPost(i)),
};
export const SOLID = {
  palm: 4, olive: 5, tree: 6, pomegranate: 5, bush: 8, boulder: 13, rock: 8, well: 11, saltPile: 9, boat: [-24, -8, 24, 4], cart: [-16, -8, 16, 2], hay: 10, signpost: 3, noticeBoard: [-12, -3, 12, 1], bench: [-13, -3, 13, 2], stall: [-21, -10, 21, 1],
  shrine: [-12, -8, 12, 2], column: 6, carvedBlock: [-11, -12, 11, 1], arch: [[-24, -4, -14, 1], [14, -4, 24, 1]], kennel: [-13, -10, 13, 1], cairn: 0, fire: 9, torch: 3, brazier: 5, lampPost: 3,
  bed: [-11, -28, 11, 0], table: [-16, -14, 16, 0], chair: 0, shelf: [-13, -8, 13, 0], hearth: [-16, -10, 16, 0], anvil: [-10, -6, 10, 0], forge: [-18, -12, 18, 0], counter: [-28, -10, 28, 0], dummy: 5,
  crate: 7, chest: 7, sack: 6, barrel: 7, stake: 3.5, tent: [[-24, -16, 24, 0]], logSeat: [-12, -3, 12, 2], rack: [-18, -4, 18, 1], pike: 3, fence: 'fence', dock: 0, rug: 0, reeds: 0, driftwood: 0, scrub: 0, steps: 0,
};

// ---------- item pictures for things with no Skyrim record ----------
const art = (draw, w = 24, h = 24) => () => { const p = new Px(w, h); draw(p); return finish(p, 0.3).canvas(); };
Object.assign(ITEM_ART, {
  CarvedGull: art((p) => { blob(p, 12, 14, 6, 3.4, 'wood', { bias: 0.2, tex: 0.1 }); rod(p, 9, 13, 3, 8, 2.2, 1.2, 'wood', { bias: 0.15 }); rod(p, 15, 13, 21, 10, 2.2, 1.2, 'wood', { bias: 0.1 }); blob(p, 17, 13, 1.8, 1.6, 'wood', { bias: 0.25 }); }),
  RustyTin: art((p) => { blob(p, 12, 14, 8, 6, 'iron', { tex: 0.4, fn: (x, y, v) => (hash(x, y, 4) < 0.3 ? tone('tile', v, x, y) : null) }); }),
  GullKey: art((p) => { rod(p, 6, 16, 16, 8, 1.6, 1.6, 'brass'); blob(p, 18, 7, 3.4, 3.4, 'brass', { bias: 0.15, tex: 0 }); rod(p, 8, 16, 6, 19, 1.4, 1.4, 'brass'); }),
  LedgerPage: art((p) => { poly(p, [[5, 4], [19, 3], [20, 21], [4, 20]], (x, y) => (y % 3 === 0 && x > 6 && x < 18 ? tone('red', 0.3, x, y) : tone('bone', 0.7 - (x === 19 ? 0.2 : 0), x, y))); }),
  Folio: art((p) => { for (let y = 4; y < 21; y++) for (let x = 4; x < 21; x++) p.set(x, y, x < 7 ? tone('leather', 0.35, x, y) : y % 4 === 0 ? tone('bone', 0.55, x, y) : tone('leather', 0.55, x, y)); }),
  SaltHookSeal: art((p) => { blob(p, 12, 12, 7, 7, 'iron', { bias: 0.1, tex: 0.1, fn: (x, y, v) => (Math.abs(Math.hypot(x - 12, y - 12) - 3.5) < 0.8 && x < 13 ? tone('salt', 0.9, x, y) : null) }); }),
  ZeynaBundle: art((p) => { blob(p, 12, 14, 7, 5, 'canvas', { tex: 0.2 }); rod(p, 6, 13, 18, 13, 1, 1, 'leather'); }),
  GoatCheese: art((p) => { blob(p, 12, 14, 7, 4.5, 'white', { bias: 0.05, tex: 0.15 }); }),
  Eggs: art((p) => { for (const [x, y] of [[9, 14], [14, 13], [12, 17]]) blob(p, x, y, 2.6, 3.2, 'white', { bias: 0.1, tex: 0 }); }),
  LampOil: art((p) => { blob(p, 12, 15, 6, 6, 'ochre', { bias: 0.1, tex: 0 }); rod(p, 12, 9, 12, 5, 2.4, 2.4, 'glass'); }),
  ClothBolt: art((p) => { rod(p, 5, 14, 19, 12, 7, 7, 'teal', { fn: (x, y, t, a, v) => (Math.round(t * 10) % 2 ? tone('teal', v - 0.1, x, y) : null) }); }),
  Nails: art((p) => { for (let k = 0; k < 5; k++) rod(p, 6 + k * 3, 8, 7 + k * 3, 17, 1, 0.8, 'iron', { bias: 0.15 }); }),
  Wood: art((p) => { rod(p, 4, 15, 20, 11, 4, 4, 'wood'); rod(p, 4, 10, 20, 9, 3.4, 3.4, 'wood', { bias: 0.1 }); }),
  BoarMeat: art((p) => { blob(p, 12, 13, 8, 5, 'meat', { bias: 0.2, tex: 0.2, fn: (x, y, v) => (y < 11 ? tone('white', v - 0.2, x, y) : null) }); }),
  Note: art((p) => { poly(p, [[5, 5], [19, 4], [20, 20], [4, 19]], (x, y) => (y % 3 === 0 && x > 6 && x < 18 ? tone('leather', 0.3, x, y) : tone('bone', 0.75, x, y))); }),
  PotionHealthMinor: art((p) => { blob(p, 12, 16, 4.5, 4.5, 'red', { bias: 0.1, tex: 0 }); rod(p, 12, 11, 12, 6, 2.4, 2.4, 'glass'); rod(p, 12, 6, 12, 5, 3, 3, 'wood'); }),
  SweetRoll: art((p) => { blob(p, 12, 14, 7, 5, 'hide', { bias: 0.15, tex: 0.1 }); blob(p, 12, 11, 5, 2.4, 'white', { bias: 0.1, tex: 0 }); }),
  Apple: art((p) => { blob(p, 12, 14, 6, 6, 'red', { bias: 0.1, tex: 0.05 }); rod(p, 12, 8, 13, 5, 1, 1, 'wood'); }),
  Salmon: art((p) => { blob(p, 12, 13, 9, 3.6, 'steel', { bias: 0.1, tex: 0.1, fn: (x, y, v) => (y > 13 ? tone('meat', v + 0.1, x, y) : null) }); rod(p, 3, 13, 1, 10, 2, 1, 'steel'); }),
  Ale: art((p) => { rod(p, 12, 19, 12, 7, 5, 5, 'wood', { bias: 0.1 }); blob(p, 12, 7, 5, 2, 'cream', { tex: 0 }); rod(p, 17, 10, 19, 15, 1.4, 1.4, 'wood'); }),
  Torch: art((p) => { rod(p, 8, 20, 15, 7, 2, 1.8, 'wood'); blob(p, 16, 6, 3, 3, 'fire', { bias: 0.3, tex: 0.2 }); }),
  CrabClaw: art((p) => { rod(p, 6, 16, 14, 11, 3.2, 2.6, 'red', { bias: 0.1 }); rod(p, 14, 11, 19, 6, 2.2, 1.2, 'red', { bias: 0.2 }); rod(p, 14, 12, 20, 12, 1.8, 1, 'red', { bias: 0.15 }); }),
});
for (const k of ['BanditNote', 'SmugglerNote', 'KeshLetter', 'TaxLedger']) ITEM_ART[k] = ITEM_ART.Note;
ITEM_ART.TaxLedgerKey = ITEM_ART.GullKey;
export { RAMPS, clamp, stake, tent, crate, chest, sack, barrel, logSeat, rack, pike, torchPost };
