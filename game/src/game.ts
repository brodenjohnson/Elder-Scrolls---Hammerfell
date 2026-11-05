import { Renderer, type Atlas, type Drawable } from './render/renderer';
import { facingOf, toScreen, toGround, type Facing } from './render/iso';
import { WorldMap, SLICE } from './world/map';
import { M, MATERIALS, SHAPES, Terrain, type Thing, type ThingId } from './world/terrain';
import { Streamer } from './world/streamer';
import { SAVE_VERSION, readSave, writeSave, type Save } from './save/save';

declare const __APP_VERSION__: string;
export const VERSION = __APP_VERSION__;

type Manifest = {
  tiles: { id: string; file: string }[]; overlays: { material: string; files: { side: string; file: string }[] }[];
  objects: Record<ThingId, { w: number; h: number; ox: number; oy: number; shadow: boolean }>; sheets: string[];
};

const PLAYER_RADIUS = 0.3;          // tiles
const WALK = 3.2, RUN = 5;          // tiles a second (bible: about 5 running)
const START = { sx: 4, sy: 7, a: 60, b: 61 }; // the Sentinel Coast, by the settlement fire

const load = (src: string) => new Promise<HTMLImageElement>((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => err(new Error(src)); i.src = src; });
const json = <T>(src: string): Promise<T> => fetch(src).then((r) => r.json());

export class Game {
  readonly renderer = new Renderer();
  map!: WorldMap;
  terrain!: Terrain;
  streamer!: Streamer;
  manifest!: Manifest;
  sheets: Record<string, { atlas: Atlas; image: HTMLImageElement }> = {};
  objects: Partial<Record<ThingId, { body: HTMLImageElement; shadow?: HTMLImageElement }>> = {};
  player = { a: 0, b: 0, facing: 'S' as Facing, moving: false, speed: 0, t: 0 };
  playSeconds = 0;
  keys = new Set<string>();
  fps = 0;
  private frameTimes: number[] = [];
  readonly frameLog: number[] = []; // every frame time, for tests (kept short)
  message = '';
  private messageUntil = 0;

  async start(parent: HTMLElement) {
    const base = './assets/';
    const [slices, manifest] = await Promise.all([json<ConstructorParameters<typeof WorldMap>[0]>('./data/slices.json'), json<Manifest>(base + 'manifest.json')]);
    this.manifest = manifest;
    this.map = new WorldMap(slices);
    this.terrain = new Terrain(this.map);
    this.streamer = new Streamer(this.terrain);
    for (const name of manifest.sheets) {
      const atlas = await json<Atlas>(`${base}sprites/${name}.json`);
      this.sheets[name] = { atlas, image: await load(`${base}sprites/${atlas.sheet}`) };
    }
    await Promise.all(Object.entries(manifest.objects).map(async ([id, m]) => {
      this.objects[id as ThingId] = { body: await load(`${base}objects/${id}__body.png`), shadow: m.shadow ? await load(`${base}objects/${id}__shadow.png`) : undefined };
    }));
    // The worker resolves asset paths itself, so give it an absolute base.
    await this.renderer.init(parent, { type: 'init', base: new URL(base, location.href).href, manifest, slices });
    this.newGame();
    this.bindInput();
    let last = performance.now();
    this.renderer.app.ticker.add(() => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
      this.frameTimes.push(now - last); this.frameLog.push(now - last); if (this.frameLog.length > 2000) this.frameLog.shift();
      last = now;
      if (this.frameTimes.length >= 30) { this.fps = Math.round(30000 / this.frameTimes.reduce((p, q) => p + q, 0)); this.frameTimes = []; }
      this.update(dt);
      this.draw();
    });
  }

  newGame() {
    this.streamer.states = {};
    this.streamer.reset();
    this.place(START.sx * SLICE + START.a, START.sy * SLICE + START.b, 'S');
    this.playSeconds = 0;
  }
  place(a: number, b: number, facing: Facing = this.player.facing) {
    this.player.a = a; this.player.b = b; this.player.facing = facing;
    this.streamer.update(...this.map.sliceOf(a, b));
    [this.player.a, this.player.b] = this.resolve(a, b);
  }

  // ---------- input ----------

  private bindInput() {
    addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'F5') { e.preventDefault(); this.save('quick'); }
      if (e.code === 'F9') { e.preventDefault(); this.load('quick'); }
      if (e.code === 'KeyE') this.smash();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  // ---------- update ----------

  update(dt: number) {
    this.playSeconds += dt;
    const k = this.keys;
    let sx = 0, sy = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) sy -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) sy += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) sx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) sx += 1;
    const p = this.player;
    p.moving = !!(sx || sy);
    if (p.moving) {
      p.facing = facingOf(sx, sy);
      // A screen direction becomes a ground direction; speed is in tiles on the ground.
      const [ga, gb] = toGround(sx * 32, sy * 32), l = Math.hypot(ga, gb);
      let speed = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN : WALK;
      if (this.terrain.material(p.a, p.b) === M.shallow) speed *= 0.6;
      p.speed = speed;
      [p.a, p.b] = this.move(p.a, p.b, (ga / l) * speed * dt, (gb / l) * speed * dt);
    }
    p.t += dt;
    this.streamer.update(...this.map.sliceOf(p.a, p.b));
  }

  // Move, then push out of anything solid; deep water stops you outright.
  private move(a: number, b: number, da: number, db: number): [number, number] {
    const deep = (x: number, y: number) => this.terrain.material(x, y) === M.deep || x < 0 || y < 0 || x >= this.map.widthTiles || y >= this.map.heightTiles;
    let na = a + da, nb = b + db;
    if (deep(na, nb)) { if (!deep(a + da, b)) nb = b; else if (!deep(a, b + db)) na = a; else return [a, b]; }
    return this.resolve(na, nb);
  }
  resolve(a: number, b: number): [number, number] {
    for (const t of this.streamer.things()) {
      const s = SHAPES[t.id];
      if (!s.solid || Math.abs(t.a - a) > 4 || Math.abs(t.b - b) > 4) continue;
      if (s.box) {
        // Nearest point of the box; push out along it, or along the shallow axis if inside.
        const [ha, hb] = s.box, ca = Math.max(t.a - ha, Math.min(a, t.a + ha)), cb = Math.max(t.b - hb, Math.min(b, t.b + hb));
        const d = Math.hypot(a - ca, b - cb);
        if (d > 0 && d < PLAYER_RADIUS) { a = ca + ((a - ca) / d) * PLAYER_RADIUS; b = cb + ((b - cb) / d) * PLAYER_RADIUS; }
        else if (d === 0) {
          const pa = ha - Math.abs(a - t.a), pb = hb - Math.abs(b - t.b);
          if (pa < pb) a = t.a + Math.sign(a - t.a || 1) * (ha + PLAYER_RADIUS); else b = t.b + Math.sign(b - t.b || 1) * (hb + PLAYER_RADIUS);
        }
      } else {
        const d = Math.hypot(a - t.a, b - t.b), r = s.r + PLAYER_RADIUS;
        if (d < r) { const k = d > 0 ? r / d : 1; a = t.a + (a - t.a) * k + (d > 0 ? 0 : r); b = t.b + (b - t.b) * k; }
      }
    }
    return [a, b];
  }

  // Smash the nearest breakable thing within reach. It stays smashed: the slice remembers.
  smash(): Thing | null {
    let best: Thing | null = null, bd = 1.6;
    for (const t of this.streamer.things()) {
      if (!SHAPES[t.id].smash) continue;
      const d = Math.hypot(t.a - this.player.a, t.b - this.player.b);
      if (d < bd) { bd = d; best = t; }
    }
    if (best) { this.streamer.remove(best); this.say(`Smashed a ${best.id === 'potSmall' ? 'pot' : best.id}.`); }
    return best;
  }

  // ---------- draw ----------

  private draw() {
    const p = this.player, r = this.renderer;
    const reach = (r.view.w + r.view.h) / 32 + 6;
    type Item = Drawable & { a0: number; a1: number; b0: number; b1: number; c: number };
    const shadows: Drawable[] = [], items: Item[] = [];
    for (const t of this.streamer.things()) {
      if (Math.abs(t.a - p.a) > reach || Math.abs(t.b - p.b) > reach) continue;
      const m = this.manifest.objects[t.id], o = this.objects[t.id]!, [x, y] = toScreen(t.a, t.b), s = SHAPES[t.id];
      const [ha, hb] = s.box ?? [s.r, s.r];
      if (o.shadow) shadows.push({ texture: r.texture(o.shadow), x: Math.round(x - m.ox), y: Math.round(y - m.oy) });
      items.push({ texture: r.texture(o.body), x: Math.round(x - m.ox), y: Math.round(y - m.oy), a0: t.a - ha, a1: t.a + ha, b0: t.b - hb, b1: t.b + hb, c: t.a + t.b });
    }
    // The player: idle or walking frames, the walk sped up to match the pace.
    const sheet = p.moving ? this.sheets.farm_walk : this.sheets.farm_idle, atlas = sheet.atlas;
    const fps = p.moving ? atlas.fps * (p.speed / 2.6) : atlas.fps;
    const frame = Math.floor(p.t * fps) % atlas.frames;
    const [px, py] = toScreen(p.a, p.b);
    items.push({ texture: r.frame(p.moving ? 'farm_walk' : 'farm_idle', atlas, sheet.image, p.facing, frame), x: Math.round(px - atlas.cell.ox), y: Math.round(py - atlas.cell.oy), a0: p.a, a1: p.a, b0: p.b, b1: p.b, c: p.a + p.b });
    items.sort(depthOrder);
    r.draw(p.a, p.b, shadows, items);
  }

  // ---------- saving ----------

  snapshot(): Save {
    return {
      version: SAVE_VERSION, savedAt: new Date().toISOString(), gameVersion: VERSION, playSeconds: Math.round(this.playSeconds),
      player: { a: +this.player.a.toFixed(3), b: +this.player.b.toFixed(3), facing: this.player.facing }, slices: structuredClone(this.streamer.states),
    };
  }
  save(slot: string) { writeSave(slot, this.snapshot()); this.say(`Saved (${slot}).`); }
  load(slot: string): boolean {
    const s = readSave(slot);
    if (!s) { this.say(`No save in ${slot}.`); return false; }
    this.streamer.states = structuredClone(s.slices);
    this.streamer.reset();
    this.playSeconds = s.playSeconds;
    this.place(s.player.a, s.player.b, s.player.facing);
    this.say(`Loaded (${slot}).`);
    return true;
  }

  say(m: string) { this.message = m; this.messageUntil = performance.now() + 2500; }
  get currentMessage() { return performance.now() < this.messageUntil ? this.message : ''; }
  where() {
    const [sx, sy] = this.map.sliceOf(this.player.a, this.player.b), info = this.map.info(sx, sy);
    return { sx, sy, info, material: MATERIALS[this.terrain.material(this.player.a, this.player.b)] };
  }
}

// Draw order for things with footprints on the ground. The viewer looks from the
// +a, +b side, so something wholly beyond another along a or b is further away.
// Overlapping footprints fall back to the middle's depth.
type Foot = { a0: number; a1: number; b0: number; b1: number; c: number };
function depthOrder(A: Foot, B: Foot): number {
  const behind = A.a1 <= B.a0 || A.b1 <= B.b0, front = A.a0 >= B.a1 || A.b0 >= B.b1;
  if (behind && !front) return -1;
  if (front && !behind) return 1;
  return A.c - B.c;
}
