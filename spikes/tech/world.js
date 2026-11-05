// Shared by the three renderers: assets, a streamed two-slice world, ground chunks,
// composed character frames, walking agents and measurement. Each renderer only
// turns canvases into its own textures and draws them.

export const VIEW = { w: 800, h: 450, scale: 2 };
export const TILE_W = 64, TILE_H = 32;
export const SLICE = 128;             // tiles per slice side (bible, PROPOSED)
export const CHUNK = 16;              // tiles per ground chunk side
const ART = '/art/out/';

// ---------- assets ----------

const loadImage = (src) => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => err(new Error(src)); i.src = src; });
const loadJson = (src) => fetch(src).then((r) => r.json());

export async function loadAssets() {
  const t0 = performance.now();
  const manifest = await loadJson(ART + 'samples/manifest.json');
  const tiles = {}, overlays = {}, objects = {};
  await Promise.all(manifest.tiles.map(async (t) => { tiles[t.id] = await loadImage(ART + 'samples/' + t.file); }));
  await Promise.all(manifest.overlays.flatMap((o) => o.files.map(async (f) => { overlays[`${o.material}__${f.side}`] = await loadImage(ART + 'samples/' + f.file); })));
  for (const id of ['house', 'palm1', 'palm2', 'rock1', 'rock2', 'scrub1', 'scrub2', 'barrel', 'crate', 'pot', 'chest', 'cliff']) {
    const m = manifest.objects[id];
    objects[id] = { ...m, body: await loadImage(`${ART}samples/objects/${id}__body.png`), shadow: await loadImage(`${ART}samples/objects/${id}__shadow.png`) };
  }
  const sheets = {};
  for (const name of ['farm_walk', 'leather_walk', 'steel_walk', 'farm_idle']) {
    const atlas = await loadJson(`${ART}sprites/${name}.json`);
    sheets[name] = { atlas, image: await loadImage(`${ART}sprites/${atlas.sheet}`) };
  }
  return { tiles, overlays, objects, sheets, priority: manifest.priority, loadMs: performance.now() - t0 };
}

// ---------- world ----------

// Small deterministic noise, enough to lay out terrain.
function hash(x, y, s) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// A slice: terrain for 128 by 128 tiles plus the things standing on it.
// Slices sit side by side along the a axis: slice k covers a in [k*128, k*128+128).
export function makeSlice(k) {
  const t0 = performance.now();
  const ground = new Array(SLICE * SLICE);
  for (let j = 0; j < SLICE; j++) for (let i = 0; i < SLICE; i++) {
    const a = k * SLICE + i, b = j;
    const w = b - 0.25 * a + 30 * (noise(a / 18, b / 18, 1) - 0.5) - 60;
    let m;
    if (w > 24) m = 'water.deep';
    else if (w > 14) m = 'water.shallow';
    else if (w > 8) m = 'sand.beach';
    else if (noise(a / 14, b / 14, 2) < 0.38) m = 'grass.coast';
    else if (noise(a / 9, b / 9, 3) > 0.74) m = 'earth.cracked';
    else m = 'sand.desert';
    if (Math.abs(b - 40 - 12 * Math.sin(a / 20)) < 1.2 && !m.startsWith('water')) m = 'road';
    ground[j * SLICE + i] = m;
  }
  // Props, a few houses, on land, kept apart.
  const things = [];
  const taken = new Set();
  for (let n = 0; n < 900; n++) {
    const i = Math.floor(hash(n, k, 7) * SLICE), j = Math.floor(hash(n, k, 8) * SLICE);
    const m = ground[j * SLICE + i];
    if (m.startsWith('water') || m === 'road') continue;
    const cell = `${i >> 2},${j >> 2}`;
    if (taken.has(cell)) continue;
    taken.add(cell);
    const r = hash(n, k, 9);
    const id = n < 14 ? 'house' : m === 'grass.coast' || m === 'sand.beach' ? (r < 0.5 ? 'palm1' : r < 0.7 ? 'palm2' : 'scrub1') :
      r < 0.25 ? 'rock1' : r < 0.45 ? 'rock2' : r < 0.7 ? 'scrub2' : r < 0.8 ? 'barrel' : r < 0.88 ? 'crate' : r < 0.94 ? 'pot' : 'cliff';
    if (id === 'house') for (let di = -3; di <= 3; di++) for (let dj = -3; dj <= 3; dj++) taken.add(`${(i >> 2) + di},${(j >> 2) + dj}`);
    things.push({ id, a: k * SLICE + i + 0.5, b: j + 0.5 });
  }
  return { k, ground, things, genMs: performance.now() - t0 };
}

export class World {
  constructor(assets) {
    this.assets = assets;
    this.slices = new Map();
    this.chunks = new Map();     // key -> { canvas, x, y }
    this.stats = { sliceGenMs: [], chunkBuildMs: [], chunksBuilt: 0, chunksEvicted: 0 };
    this.maxChunks = 30;
  }
  slice(k) {
    if (!this.slices.has(k)) { const s = makeSlice(k); this.slices.set(k, s); this.stats.sliceGenMs.push(s.genMs); }
    return this.slices.get(k);
  }
  ground(a, b) {
    if (b < 0 || b >= SLICE || a < 0) return null;
    const k = Math.floor(a / SLICE);
    return this.slice(k).ground[b * SLICE + (a - k * SLICE)];
  }
  // Screen position (world pixels) of a ground point.
  static screen(a, b) { return [(a - b) * TILE_W / 2, (a + b) * TILE_H / 2]; }
  static ground(x, y) { return [(x / (TILE_W / 2) + y / (TILE_H / 2)) / 2, (y / (TILE_H / 2) - x / (TILE_W / 2)) / 2]; }

  // Ground chunk canvases overlapping the view, building missing ones (at most `budget` per frame).
  visibleChunks(cam, budget = 2) {
    const out = [];
    const corners = [[cam.x, cam.y], [cam.x + VIEW.w, cam.y], [cam.x, cam.y + VIEW.h], [cam.x + VIEW.w, cam.y + VIEW.h]].map(([x, y]) => World.ground(x, y));
    const a0 = Math.floor(Math.min(...corners.map((c) => c[0])) / CHUNK) - 1, a1 = Math.floor(Math.max(...corners.map((c) => c[0])) / CHUNK) + 1;
    const b0 = Math.floor(Math.min(...corners.map((c) => c[1])) / CHUNK) - 1, b1 = Math.floor(Math.max(...corners.map((c) => c[1])) / CHUNK) + 1;
    for (let ca = Math.max(0, a0); ca <= a1; ca++) for (let cb = Math.max(0, b0); cb <= Math.min(SLICE / CHUNK - 1, b1); cb++) {
      const key = `${ca},${cb}`;
      let c = this.chunks.get(key);
      if (!c && budget > 0) { c = this.buildChunk(ca, cb); budget--; }
      if (c) { c.used = performance.now(); out.push(c); }
    }
    // Keep the cache bounded: drop the least recently used.
    if (this.chunks.size > this.maxChunks) {
      const old = [...this.chunks.entries()].sort((p, q) => p[1].used - q[1].used).slice(0, this.chunks.size - this.maxChunks);
      for (const [k, c] of old) { this.chunks.delete(k); c.dispose?.(); this.stats.chunksEvicted++; }
    }
    return out;
  }

  // One chunk: its tiles, the transition overlays from higher neighbours, and the
  // shadows of everything standing on it, baked into one canvas.
  buildChunk(ca, cb) {
    const t0 = performance.now();
    const { tiles, overlays, priority, objects } = this.assets;
    const W = CHUNK * TILE_W, H = CHUNK * TILE_H;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H + TILE_H;
    const g = canvas.getContext('2d');
    // Chunk origin: screen position of its top tile corner, shifted so the diamond fits.
    const [ox, oy] = World.screen(ca * CHUNK, cb * CHUNK);
    const left = ox - W / 2, top = oy;
    for (let j = 0; j < CHUNK; j++) for (let i = 0; i < CHUNK; i++) {
      const a = ca * CHUNK + i, b = cb * CHUNK + j, m = this.ground(a, b);
      if (!m) continue;
      const [x, y] = World.screen(a, b);
      const v = m === 'sand.desert' && hash(a, b, 5) > 0.7 ? 1 : 0;
      g.drawImage(tiles[`${m}_${v}`] ?? tiles[`${m}_0`], x - left - 32, y - top);
      const rank = priority.indexOf(m);
      for (const hm of priority.slice(rank + 1)) {
        const is = (di, dj) => this.ground(a + di, b + dj) === hm;
        const sides = [];
        if (is(-1, 0)) sides.push('a0'); if (is(1, 0)) sides.push('a1'); if (is(0, -1)) sides.push('b0'); if (is(0, 1)) sides.push('b1');
        if (is(-1, -1) && !is(-1, 0) && !is(0, -1)) sides.push('a0b0');
        if (is(-1, 1) && !is(-1, 0) && !is(0, 1)) sides.push('a0b1');
        if (is(1, -1) && !is(1, 0) && !is(0, -1)) sides.push('a1b0');
        if (is(1, 1) && !is(1, 0) && !is(0, 1)) sides.push('a1b1');
        for (const s of sides) { const o = overlays[`${hm}__${s}`]; if (o) g.drawImage(o, x - left - 32, y - top); }
      }
    }
    g.globalAlpha = 1;
    for (const t of this.thingsIn(ca, cb)) {
      const o = objects[t.id], [x, y] = World.screen(t.a, t.b);
      g.drawImage(o.shadow, Math.round(x - o.ox - left), Math.round(y - o.oy - top));
    }
    const chunk = { key: `${ca},${cb}`, canvas, x: left, y: top, used: performance.now() };
    this.chunks.set(chunk.key, chunk);
    this.stats.chunkBuildMs.push(performance.now() - t0);
    this.stats.chunksBuilt++;
    return chunk;
  }
  thingsIn(ca, cb) {
    const k = Math.floor((ca * CHUNK) / SLICE);
    return this.slice(k).things.filter((t) => Math.floor(t.a / CHUNK) === ca && Math.floor(t.b / CHUNK) === cb);
  }
  // Standing things near the view, as drawables.
  visibleThings(cam) {
    const out = [];
    const [ga, gb] = World.ground(cam.x + VIEW.w / 2, cam.y + VIEW.h / 2);
    for (const k of [Math.floor(ga / SLICE) - 1, Math.floor(ga / SLICE), Math.floor(ga / SLICE) + 1]) {
      if (k < 0) continue;
      for (const t of this.slice(k).things) {
        if (Math.abs(t.a - ga) > 22 || Math.abs(t.b - gb) > 22) continue;
        const o = this.assets.objects[t.id], [x, y] = World.screen(t.a, t.b);
        if (x - o.ox > cam.x + VIEW.w || x - o.ox + o.w < cam.x || y - o.oy > cam.y + VIEW.h || y - o.oy + o.h < cam.y) continue;
        out.push({ key: t.id, image: o.body, x: x - o.ox, y: y - o.oy, depth: y });
      }
    }
    return out;
  }
}

// ---------- characters ----------

const FACINGS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];

// Composed frames, made once per (sheet, facing, frame) with Canvas2D so the cast
// shadow pieces can use source-atop. Renderers turn each into a texture once.
export class FrameCache {
  constructor(sheets) { this.sheets = sheets; this.frames = new Map(); this.composeMs = []; }
  get(sheet, facing, frame) {
    const key = `${sheet}/${facing}/${frame}`;
    let f = this.frames.get(key);
    if (f) return f;
    const t0 = performance.now();
    const { atlas, image } = this.sheets[sheet], s = atlas.sprites[`${facing}/${frame}`];
    const c = document.createElement('canvas'); c.width = atlas.cell.w; c.height = atlas.cell.h;
    const g = c.getContext('2d');
    for (const id of s.drawOrder) {
      const p = s.pieces[id];
      g.globalCompositeOperation = p.kind === 'shade' ? 'source-atop' : 'source-over';
      g.drawImage(image, p.sx, p.sy, p.w, p.h, p.x, p.y, p.w, p.h);
    }
    f = { key, canvas: c, ox: atlas.cell.ox, oy: atlas.cell.oy };
    this.frames.set(key, f);
    this.composeMs.push(performance.now() - t0);
    return f;
  }
}

// Walking people: pick a nearby point, walk to it at walking pace, repeat.
export function makeAgents(n, world, around) {
  const outfits = ['farm_walk', 'leather_walk', 'steel_walk'];
  return Array.from({ length: n }, (_, i) => {
    const a = around[0] + (hash(i, 1, 3) - 0.5) * 24, b = around[1] + (hash(i, 2, 3) - 0.5) * 14;
    return { i, a, b, ta: a, tb: b, sheet: outfits[i % 3], facing: 'S', t: hash(i, 3, 3) };
  });
}
export function stepAgents(agents, dt, world, center) {
  const speed = 2.2; // tiles a second, a walk
  for (const g of agents) {
    // Anyone the camera has left far behind steps back in near it.
    if (Math.hypot(g.a - center[0], g.b - center[1]) > 20) {
      g.a = center[0] + (Math.random() - 0.5) * 24; g.b = Math.max(2, Math.min(SLICE - 2, center[1] + (Math.random() - 0.5) * 14));
      g.ta = g.a; g.tb = g.b;
    }
    let da = g.ta - g.a, db = g.tb - g.b, d = Math.hypot(da, db);
    if (d < 0.2) {
      g.ta = center[0] + (Math.random() - 0.5) * 26; g.tb = Math.max(2, Math.min(SLICE - 2, center[1] + (Math.random() - 0.5) * 16));
      continue;
    }
    g.a += (da / d) * speed * dt; g.b += (db / d) * speed * dt;
    // Facing from the screen direction of travel.
    const sx = (da - db), sy = (da + db) / 2;
    const ang = Math.atan2(sy, sx); // 0 = screen right (E), pi/2 = down (S)
    g.facing = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    g.t += dt;
  }
}
export function agentDrawables(agents, frames, cam) {
  const out = [];
  for (const g of agents) {
    const sheet = g.sheet, a = frames.sheets[sheet].atlas;
    const f = frames.get(sheet, g.facing, Math.floor(g.t * a.fps) % a.frames);
    const [x, y] = World.screen(g.a, g.b);
    if (x - f.ox > cam.x + VIEW.w || x + 96 < cam.x || y - f.oy > cam.y + VIEW.h || y + 30 < cam.y) continue;
    out.push({ key: f.key, image: f.canvas, x: Math.round(x - f.ox), y: Math.round(y - f.oy), depth: y });
  }
  return out;
}

// ---------- the benchmark run ----------

// A camera that pans steadily from slice 0 across into slice 1 and back.
export function cameraAt(t) {
  const a = 100 + 50 * Math.sin(t * 0.18), b = 52 + 6 * Math.sin(t * 0.31);
  const [x, y] = World.screen(a, b);
  return { x: Math.round(x - VIEW.w / 2), y: Math.round(y - VIEW.h / 2), a, b };
}

export class Meter {
  constructor() { this.frames = []; this.work = []; this.last = 0; }
  frame(now, workMs) { if (this.last) this.frames.push(now - this.last); this.last = now; this.work.push(workMs); }
  summary() {
    const s = [...this.frames].sort((p, q) => p - q), w = [...this.work].sort((p, q) => p - q);
    const avg = s.reduce((x, y) => x + y, 0) / (s.length || 1);
    return {
      frames: s.length, fps: Math.round(1000 / avg), p99FrameMs: +(s[Math.floor(s.length * 0.99)] ?? 0).toFixed(1),
      worstFrameMs: +(s[s.length - 1] ?? 0).toFixed(1), avgWorkMs: +(w.reduce((x, y) => x + y, 0) / (w.length || 1)).toFixed(2),
      p99WorkMs: +(w[Math.floor(w.length * 0.99)] ?? 0).toFixed(2),
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null,
    };
  }
}
export const params = () => {
  const q = new URLSearchParams(location.search);
  return { n: +(q.get('n') ?? 50), seconds: +(q.get('s') ?? 15) };
};

// One benchmark run, shared by every renderer. draw(chunks, drawables, cam) is the
// renderer's part; tick(now) is called once per displayed frame.
export function makeRunner(assets, n, seconds, draw) {
  const world = new World(assets), frames = new FrameCache(assets.sheets), meter = new Meter();
  let agents = null, t0 = 0, last = 0;
  const run = { world, frames, meter, done: false, result: null };
  run.tick = (now) => {
    if (run.done) return;
    const w0 = performance.now();
    if (!t0) { t0 = now; last = now; }
    const t = (now - t0) / 1000, dt = Math.min(0.1, (now - last) / 1000); last = now;
    const cam = cameraAt(t);
    if (!agents) agents = makeAgents(n, world, [cam.a, cam.b]);
    stepAgents(agents, dt, world, [cam.a, cam.b]);
    const chunks = world.visibleChunks(cam);
    const things = [...world.visibleThings(cam), ...agentDrawables(agents, frames, cam)].sort((p, q) => p.depth - q.depth);
    draw(chunks, things, cam);
    // The first second warms caches; it is not measured.
    if (t > 1) meter.frame(now, performance.now() - w0);
    if (t > seconds + 1) {
      run.done = true;
      const st = world.stats, avg = (a) => +(a.reduce((x, y) => x + y, 0) / (a.length || 1)).toFixed(1);
      run.result = {
        ...meter.summary(), characters: n, seconds,
        assetLoadMs: Math.round(assets.loadMs), sliceGenMs: st.sliceGenMs.map((x) => +x.toFixed(1)),
        chunksBuilt: st.chunksBuilt, chunksEvicted: st.chunksEvicted, chunkBuildMsAvg: avg(st.chunkBuildMs), chunkBuildMsMax: +Math.max(0, ...st.chunkBuildMs).toFixed(1),
        framesComposed: frames.frames.size, composeMsAvg: avg(frames.composeMs),
        // Texture memory estimate: cached chunk canvases plus composed character frames.
        textureMB: +((world.chunks.size * CHUNK * TILE_W * (CHUNK * TILE_H + TILE_H) + frames.frames.size * 192 * 192) * 4 / 1e6).toFixed(1),
      };
      window.__result = run.result;
    }
  };
  window.__game = run; // debug handle for tests
  return run;
}
