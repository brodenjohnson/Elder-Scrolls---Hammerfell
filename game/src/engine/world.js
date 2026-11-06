/* =====================================================================
   Maps: the outdoor region and the rooms inside buildings (public/data/world/maps.json).
   Outdoors, the ground is painted from shapes in the map's data (the sea, roads, fields,
   salt pans, the desert's edge) onto a coarse grid, then drawn in 256-pixel chunks as
   they come into view, each pixel textured by its material. Beaches and shallows come
   from the coastline by themselves. Props, doors, containers and lights are placed from
   the data and can depend on story flags (`if`, `ifNot`), so the world changes with the
   story: the farm burns, graves appear. Indoors, a room is a floor and a back wall.
   ===================================================================== */
import { Px, tone, fbm, noise, hash, finish } from './art.js';
import { MAKERS, ANIMATED, SOLID } from './props.js';

const CELL = 4, CHUNK = 256;
// Materials, their ramps and how they are textured. walk: how fast you move on it (0: not at all).
export const MATS = {
  grass:   { ramp: 'grass', base: 0.42, walk: 1 },
  dry:     { ramp: 'dry', base: 0.45, walk: 1 },
  dirt:    { ramp: 'dirt', base: 0.44, walk: 1 },
  road:    { ramp: 'dirt', base: 0.52, walk: 1.1 },
  sand:    { ramp: 'sand', base: 0.55, walk: 0.9 },
  desert:  { ramp: 'desert', base: 0.52, walk: 0.85 },
  field:   { ramp: 'field', base: 0.42, walk: 0.95 },
  salt:    { ramp: 'salt', base: 0.55, walk: 1 },
  rock:    { ramp: 'stone', base: 0.45, walk: 1 },
  ash:     { ramp: 'ash', base: 0.4, walk: 1 },
  shallow: { ramp: 'shallow', base: 0.5, walk: 0.55 },
  water:   { ramp: 'water', base: 0.45, walk: 0 },
  floorWood: { ramp: 'wood', base: 0.5, walk: 1 }, floorStone: { ramp: 'stone', base: 0.5, walk: 1 }, floorTile: { ramp: 'tile', base: 0.45, walk: 1 }, floorDirt: { ramp: 'dirt', base: 0.42, walk: 1 },
};
const MAT_IDS = Object.keys(MATS), MAT_INDEX = Object.fromEntries(MAT_IDS.map((k, i) => [k, i]));
export const flagOk = (o, flags) => (!o.if || [].concat(o.if).every((f) => flags.has(f))) && (!o.ifNot || ![].concat(o.ifNot).some((f) => flags.has(f)));

const spriteCache = new Map();
function sprite(k, v = 0, o = {}) {
  const key = `${k}|${v}|${JSON.stringify(o)}`;
  let s = spriteCache.get(key);
  if (!s) { s = ANIMATED[k] ? { frames: ANIMATED[k]() } : MAKERS[k](v, o); if (s.frames) s = { frames: s.frames.map((f) => (f.canvas ? f : { canvas: f, ox: f.width / 2, oy: f.height - 4 })), ...{ ox: 0, oy: 0 } }; spriteCache.set(key, s); }
  return s;
}

export class World {
  constructor(def, flags, rng = Math.random) {
    this.def = def; this.id = def.id; this.w = def.w; this.h = def.h; this.indoor = def.kind === 'interior'; this.rng = rng;
    this.chunks = new Map();
    if (this.indoor) this.buildRoom(); else this.buildGrid();
    this.refresh(flags);
  }

  // ---------- the ground ----------
  buildGrid() {
    const gw = Math.ceil(this.w / CELL), gh = Math.ceil(this.h / CELL), g = new Uint8Array(gw * gh).fill(MAT_INDEX[this.def.ground?.base || 'grass']);
    this.gw = gw; this.gh = gh; this.grid = g;
    const fillPoly = (pts, m) => {
      const ys = pts.map((q) => q[1] / CELL), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(gh - 1, Math.ceil(Math.max(...ys)));
      for (let y = y0; y <= y1; y++) {
        const cross = [];
        for (let k = 0; k < pts.length; k++) { const [ax, ay] = pts[k].map((v) => v / CELL), [bx, by] = pts[(k + 1) % pts.length].map((v) => v / CELL); if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) cross.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax)); }
        cross.sort((a, b) => a - b);
        for (let k = 0; k + 1 < cross.length; k += 2) for (let x = Math.max(0, Math.round(cross[k])); x < Math.min(gw, Math.round(cross[k + 1])); x++) g[y * gw + x] = m;
      }
    };
    const disc = (cx, cy, r, m) => { for (let y = Math.max(0, Math.floor((cy - r) / CELL)); y <= Math.min(gh - 1, (cy + r) / CELL); y++) for (let x = Math.max(0, Math.floor((cx - r) / CELL)); x <= Math.min(gw - 1, (cx + r) / CELL); x++) if (Math.hypot(x * CELL + 2 - cx, y * CELL + 2 - cy) <= r) g[y * gw + x] = m; };
    let shoreDone = false;
    for (const s of this.def.ground?.shapes || []) {
      const m = MAT_INDEX[s.m || (s.t === 'sea' ? 'water' : 'dirt')];
      if (s.t === 'sea') fillPoly(s.poly, m);
      // The shore is worked out after the sea and before anything that should sit on top of a beach.
      if (s.t !== 'sea' && !shoreDone) { this.shore(); shoreDone = true; }
      if (s.t === 'area' && s.poly) fillPoly(s.poly, m);
      if (s.t === 'area' && s.circle) disc(...s.circle, m);
      if (s.t === 'road') for (let k = 0; k + 1 < s.pts.length; k++) { const [ax, ay] = s.pts[k], [bx, by] = s.pts[k + 1], l = Math.hypot(bx - ax, by - ay); for (let d = 0; d <= l; d += 3) disc(ax + ((bx - ax) * d) / l, ay + ((by - ay) * d) / l, s.w / 2, m); }
    }
    if (!shoreDone) this.shore();
  }
  // Water near land becomes shallows; land near water becomes beach.
  shore() {
    const { gw, gh, grid: g } = this, W = MAT_INDEX.water, dist = new Int16Array(gw * gh).fill(-1), q = [];
    for (let i = 0; i < g.length; i++) if (g[i] !== W) { dist[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % gw, y = (i / gw) | 0, d = dist[i]; if (d >= 4) continue; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const j = ny * gw + nx; if (dist[j] < 0 && g[j] === W) { dist[j] = d + 1; q.push(j); } } }
    for (let i = 0; i < g.length; i++) if (g[i] === W && dist[i] > 0 && dist[i] <= 3) g[i] = MAT_INDEX.shallow;
    const d2 = new Int16Array(gw * gh).fill(-1), q2 = [];
    for (let i = 0; i < g.length; i++) if (g[i] === W || g[i] === MAT_INDEX.shallow) { d2[i] = 0; q2.push(i); }
    for (let h = 0; h < q2.length; h++) { const i = q2[h], x = i % gw, y = (i / gw) | 0, d = d2[i]; if (d >= 9) continue; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const j = ny * gw + nx; if (d2[j] < 0) { d2[j] = d + 1; q2.push(j); } } }
    for (let i = 0; i < g.length; i++) if (d2[i] > 0 && d2[i] <= 7 + ((hash(i % gw >> 3, (i / gw) >> 3, 5) * 3) | 0) && g[i] !== W && g[i] !== MAT_INDEX.shallow) g[i] = MAT_INDEX.sand;
  }
  matAt(x, y) {
    if (this.indoor) return this.def.floor || 'floorWood';
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    if (gx < 0 || gy < 0 || gx >= this.gw || gy >= this.gh) return 'water';
    return MAT_IDS[this.grid[gy * this.gw + gx]];
  }
  // One 256-pixel chunk of ground, drawn the first time it is seen.
  chunk(cx, cy) {
    const key = cx * 1000 + cy;
    let c = this.chunks.get(key);
    if (c) return c;
    const p = new Px(CHUNK, CHUNK), x0 = cx * CHUNK, y0 = cy * CHUNK;
    for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) {
      const X = x0 + x, Y = y0 + y, j = (noise(X * 0.07, Y * 0.07, 17) - 0.5) * 9, mat = this.matAt(X + j, Y - j), M = MATS[mat];
      const n = fbm(X * 0.04, Y * 0.04, 11, 2), m = noise(X * 0.3, Y * 0.3, 12), sp = hash(X, Y, 15);
      let v = M.base + 0.32 * (n - 0.5) + 0.16 * (m - 0.5);
      if (mat === 'grass' || mat === 'dry') v += sp < 0.05 ? 0.22 : sp > 0.97 ? -0.15 : 0;
      else if (mat === 'road') v += (Math.abs(((X * 0.7 + Y * 0.7) % 9) - 4.5) < 0.6 ? -0.06 : 0) + (sp < 0.03 ? 0.18 : 0);
      else if (mat === 'dirt' || mat === 'ash') v += sp < 0.04 ? 0.18 : 0;
      else if (mat === 'desert') v += Math.sin(X * 0.22 + Y * 0.08 + n * 4) * 0.06;
      else if (mat === 'field') v += (Y % 7 < 2 ? -0.14 : 0) + (Y % 7 === 3 && sp < 0.3 ? 0.25 : 0);
      else if (mat === 'salt') v += Math.abs(noise(X * 0.15, Y * 0.15, 21) - 0.5) < 0.03 ? -0.25 : 0;
      else if (mat === 'water' || mat === 'shallow') v += Math.sin(X * 0.11 + Y * 0.05) * 0.05 + (sp < 0.01 ? 0.25 : 0);
      else if (mat === 'sand') v += sp < 0.04 ? -0.12 : sp > 0.985 ? 0.2 : 0;
      p.set(x, y, tone(M.ramp, v, X, Y));
    }
    c = p.canvas(); this.chunks.set(key, c);
    return c;
  }

  // ---------- a room ----------
  buildRoom() {
    const d = this.def, wallH = 34, p = new Px(d.w, d.h), M = MATS[d.floor || 'floorWood'];
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      if (y < wallH) { const v = 0.5 - (y < 3 ? -0.1 : 0) + (y > wallH - 4 ? -0.2 : 0) + 0.08 * (fbm(x * 0.2, y * 0.2, 31) - 0.5) + ((d.wall === 'sandstone' && y % 6 === 0) ? -0.1 : 0); p.set(x, y, tone(d.wall || 'plaster', v, x, y)); continue; }
      if (x < 4 || x >= d.w - 4) { p.set(x, y, tone(d.wall || 'plaster', 0.3, x, y)); continue; }
      let v = M.base + 0.1 * (fbm(x * 0.15, y * 0.15, 33) - 0.5);
      if (d.floor === 'floorWood' || !d.floor) v += ((y - wallH) % 8 === 0 ? -0.15 : 0) + ((x + Math.floor((y - wallH) / 8) * 13) % 31 === 0 ? -0.1 : 0);
      if (d.floor === 'floorStone' || d.floor === 'floorTile') v += ((y - wallH) % 10 === 0 || (x + ((y - wallH) / 10 | 0) * 5) % 12 === 0 ? -0.15 : 0);
      p.set(x, y, tone(M.ramp, v, x, y));
    }
    this.room = finish(p, 0.15).canvas(); this.wallH = wallH;
  }

  // ---------- what stands on the map ----------
  // Built from the data and the story's flags; called again when the flags change.
  refresh(flags) {
    const d = this.def, props = [], solids = [], doors = [], lights = [], containers = [], uses = [];
    const add = (o) => {
      if (!flagOk(o, flags)) return;
      const s = sprite(o.k, o.v || 0, o.o || {});
      const pr = { ...o, s, x: o.x, y: o.y, flat: s.flat };
      props.push(pr);
      const sol = o.solid ?? SOLID[o.k];
      if (o.k === 'house') { const w = o.o?.w ?? 60, dd = o.o?.d ?? 40; solids.push({ rect: [o.x - w / 2, o.y - dd - 2, o.x + w / 2, o.y - 1] }); if (o.door) { const door = { x: o.x + s.door[0], y: o.y + 4, ...o.door }; if (flagOk(door, flags)) doors.push(door); } }
      else if (sol === 'fence') { const len = o.o?.len ?? 24; solids.push({ rect: o.o?.vert ? [o.x - 3, o.y - len - 8, o.x + 3, o.y] : [o.x - len / 2 - 3, o.y - 4, o.x + len / 2 + 3, o.y + 1] }); }
      else if (typeof sol === 'number' && sol > 0) solids.push({ x: o.x, y: o.y, r: sol });
      else if (Array.isArray(sol)) for (const r of Array.isArray(sol[0]) ? sol : [sol]) solids.push({ rect: [o.x + r[0], o.y + r[1], o.x + r[2], o.y + r[3]] });
      const L = { fire: [110, [255, 150, 60], 0.42], torch: [50, [255, 170, 80], 0.32], brazier: [60, [255, 160, 70], 0.34], hearth: [90, [255, 150, 70], 0.4], forge: [80, [255, 130, 50], 0.4], smelter: [70, [255, 130, 50], 0.38], lampPost: [60, [255, 200, 120], 0.3] }[o.k];
      if (L) lights.push({ x: o.x, y: o.y - 20, r: L[0], c: L[1], a: L[2], flicker: o.k === 'lampPost' ? 0.3 : 1.2 });
      if (o.use) uses.push({ x: o.x, y: o.y, ...o.use, prop: pr });
    };
    for (const o of d.props || []) {
      // A ring of things (a palisade): ring [cx, cy, rx, ry, fromDegrees, toDegrees, stepDegrees].
      if (o.ring) { const [cx, cy, rx, ry, a0, a1, st] = o.ring; if (!flagOk(o, flags)) continue; for (let a = a0; a <= a1; a += st) { const r = (a * Math.PI) / 180; add({ ...o, ring: undefined, x: Math.round(cx + Math.cos(r) * rx), y: Math.round(cy + Math.sin(r) * ry), v: Math.floor(a * 10) % 5 }); } continue; }
      add(o);
    }
    // Scattered things: trees on grass, palms on sand, scrub in the dry hills, never on a road
    // or in a cleared place.
    const rnd = (k, s) => hash(k, s, 77);
    for (const sc of d.scatter || []) {
      if (!flagOk(sc, flags)) continue;
      let placed = 0;
      for (let k = 0; k < sc.count * 6 && placed < sc.count; k++) {
        const x = (sc.area ? sc.area[0] + rnd(k, sc.seed) * (sc.area[2] - sc.area[0]) : rnd(k, sc.seed) * this.w), y = (sc.area ? sc.area[1] + rnd(k, sc.seed + 1) * (sc.area[3] - sc.area[1]) : rnd(k, sc.seed + 1) * this.h);
        if (!sc.on.includes(this.matAt(x, y)) || !sc.on.includes(this.matAt(x + 14, y)) || !sc.on.includes(this.matAt(x - 14, y + 6))) continue;
        if ((d.clear || []).some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r)) continue;
        if (solids.some((s) => (s.rect ? x > s.rect[0] - 16 && x < s.rect[2] + 16 && y > s.rect[1] - 16 && y < s.rect[3] + 16 : Math.hypot(x - s.x, y - s.y) < s.r + 16))) continue;
        add({ k: sc.k[Math.floor(rnd(k, sc.seed + 2) * sc.k.length)], x: Math.round(x), y: Math.round(y), v: Math.floor(rnd(k, sc.seed + 3) * 3) });
        placed++;
      }
    }
    for (const dr of d.doors || []) if (flagOk(dr, flags)) doors.push(dr);
    for (const c of d.containers || []) if (flagOk(c, flags)) { containers.push(c); add({ k: c.look || 'chest', x: c.x, y: c.y, v: 0 }); }
    for (const l of d.lights || []) if (flagOk(l, flags)) lights.push(l);
    for (const u of d.uses || []) uses.push(u); // things to do with no prop of their own (their flags are checked when used)
    Object.assign(this, { props, solids, doors, lights, containers, uses });
  }

  // ---------- moving about ----------
  // Push a body of radius r out of anything solid, out of deep water and back inside the map.
  collide(f, r = 5) {
    for (const s of this.solids) {
      if (s.rect) {
        const [x0, y0, x1, y1] = s.rect;
        if (f.x > x0 - r && f.x < x1 + r && f.y > y0 - r * 0.6 && f.y < y1 + r * 0.6) {
          const dl = f.x - (x0 - r), dr = x1 + r - f.x, du = f.y - (y0 - r * 0.6), dd = y1 + r * 0.6 - f.y, m = Math.min(dl, dr, du, dd);
          if (m === dl) f.x = x0 - r; else if (m === dr) f.x = x1 + r; else if (m === du) f.y = y0 - r * 0.6; else f.y = y1 + r * 0.6;
        }
      } else {
        const ex = f.x - s.x, ey = (f.y - s.y) * 1.6, e = Math.hypot(ex, ey);
        if (e < s.r + r) { f.x += (ex / (e || 1)) * (s.r + r - e); f.y += (ey / (e || 1)) * (s.r + r - e) / 1.6; }
      }
    }
    if (this.indoor) { f.x = Math.max(10, Math.min(this.w - 10, f.x)); f.y = Math.max(this.wallH + 6, Math.min(this.h - 4, f.y)); return; }
    f.x = Math.max(6, Math.min(this.w - 6, f.x)); f.y = Math.max(16, Math.min(this.h - 4, f.y));
    if (MATS[this.matAt(f.x, f.y)].walk === 0 && f.lastDry) { f.x = f.lastDry[0]; f.y = f.lastDry[1]; } else f.lastDry = [f.x, f.y];
  }
  speedAt(x, y) { return MATS[this.matAt(x, y)].walk || 1; }

  // ---------- drawing ----------
  drawGround(ctx, camX, camY, W, H) {
    if (this.indoor) { ctx.fillStyle = '#050403'; ctx.fillRect(camX, camY, W, H); ctx.drawImage(this.room, 0, 0); return; }
    for (let cy = Math.floor(camY / CHUNK); cy <= Math.floor((camY + H) / CHUNK); cy++) for (let cx = Math.floor(camX / CHUNK); cx <= Math.floor((camX + W) / CHUNK); cx++) {
      if (cx < 0 || cy < 0 || cx * CHUNK >= this.w || cy * CHUNK >= this.h) continue;
      ctx.drawImage(this.chunk(cx, cy), cx * CHUNK, cy * CHUNK);
    }
  }
  // Draw the chunks round a point in advance, so walking into them does not stutter.
  warm(x, y, budget = 2) {
    if (this.indoor) return;
    for (let r = 0; r <= 2 && budget > 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const cx = Math.floor(x / CHUNK) + dx, cy = Math.floor(y / CHUNK) + dy;
      if (cx < 0 || cy < 0 || cx * CHUNK >= this.w || cy * CHUNK >= this.h || this.chunks.has(cx * 1000 + cy)) continue;
      this.chunk(cx, cy); if (--budget <= 0) return;
    }
  }
  // The region as a small map for the Map menu: one pixel for every four cells.
  overview() {
    if (this.indoor) return null;
    const s = 4, w = Math.ceil(this.gw / s), h = Math.ceil(this.gh / s), c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h);
    const COL = { grass: [118, 140, 84], dry: [150, 142, 92], dirt: [150, 120, 84], road: [176, 146, 104], sand: [210, 190, 140], desert: [205, 168, 112], field: [140, 108, 74], salt: [226, 222, 212], rock: [128, 124, 120], ash: [70, 64, 60], shallow: [104, 150, 150], water: [62, 96, 118] };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const m = MAT_IDS[this.grid[(y * s) * this.gw + x * s]], col = COL[m] || [120, 120, 100], i = (y * w + x) * 4; img.data.set([col[0], col[1], col[2], 255], i); }
    g.putImageData(img, 0, 0);
    return c;
  }
}
export { sprite };
