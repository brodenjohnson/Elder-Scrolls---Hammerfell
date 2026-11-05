import { Application, Container, Sprite, Texture, TextureSource } from 'pixi.js';
import { CHUNK, toGround, toScreen } from './iso';
import ChunkWorker from './chunkWorker?worker';

// Draws the game with PixiJS: ground chunks (built in a worker), shadows, then the
// depth-sorted things and people. Knows nothing about rules; the game hands it
// drawables each frame.

export type Atlas = {
  cell: { w: number; h: number; ox: number; oy: number }; frames: number; fps: number; sheet: string;
  sprites: Record<string, { drawOrder: string[]; pieces: Record<string, { sx: number; sy: number; w: number; h: number; x: number; y: number; kind: string }> }>;
};
export type Drawable = { texture: Texture; x: number; y: number; alpha?: number };

export const SCALE = 2; // integer scaling, nearest-neighbour (bible)

export class Renderer {
  readonly app = new Application();
  readonly world = new Container();
  private readonly groundLayer = new Container();
  private readonly shadowLayer = new Container();
  private readonly actorLayer = new Container();
  private readonly chunks = new Map<string, { sprite: Sprite; used: number }>();
  private readonly pending = new Set<string>();
  private readonly worker = new ChunkWorker();
  private readonly textures = new Map<object, Texture>();
  private readonly frames = new Map<string, Texture>();
  private shadowPool: Sprite[] = [];
  private actorPool: Sprite[] = [];
  readonly stats = { chunksBuilt: 0, chunkMsMax: 0, chunkMsTotal: 0, chunksEvicted: 0, maxChunks: 48 };
  view = { w: 640, h: 360 };

  async init(parent: HTMLElement, workerInit: unknown) {
    TextureSource.defaultOptions.scaleMode = 'nearest';
    this.resize();
    await this.app.init({ width: this.view.w, height: this.view.h, background: '#071116', antialias: false, resolution: 1, preference: 'webgl' });
    parent.appendChild(this.app.canvas);
    this.app.canvas.style.imageRendering = 'pixelated';
    this.app.stage.addChild(this.world);
    this.world.addChild(this.groundLayer, this.shadowLayer, this.actorLayer);
    addEventListener('resize', () => { this.resize(); this.app.renderer.resize(this.view.w, this.view.h); this.fitCanvas(); });
    this.fitCanvas();
    this.worker.postMessage(workerInit);
    this.worker.onmessage = (e: MessageEvent<{ key: string; x: number; y: number; image: ImageBitmap; ms: number }>) => {
      const { key, x, y, image, ms } = e.data;
      this.pending.delete(key);
      const sprite = new Sprite(Texture.from(image));
      sprite.x = x; sprite.y = y;
      this.groundLayer.addChild(sprite);
      this.chunks.set(key, { sprite, used: performance.now() });
      this.stats.chunksBuilt++; this.stats.chunkMsTotal += ms; this.stats.chunkMsMax = Math.max(this.stats.chunkMsMax, ms);
    };
  }
  private resize() { this.view = { w: Math.max(320, Math.floor(innerWidth / SCALE)), h: Math.max(200, Math.floor(innerHeight / SCALE)) }; }
  private fitCanvas() { this.app.canvas.style.width = `${this.view.w * SCALE}px`; this.app.canvas.style.height = `${this.view.h * SCALE}px`; }

  // A texture for an image or canvas, made once.
  texture(src: HTMLImageElement | HTMLCanvasElement): Texture {
    let t = this.textures.get(src);
    if (!t) { t = Texture.from(src); this.textures.set(src, t); }
    return t;
  }

  // One character frame: its layers drawn in atlas order, cast shadows source-atop,
  // composed once on a canvas and kept as a texture.
  frame(name: string, atlas: Atlas, sheet: HTMLImageElement, facing: string, frame: number): Texture {
    const key = `${name}/${facing}/${frame}`;
    let t = this.frames.get(key);
    if (t) return t;
    const s = atlas.sprites[`${facing}/${frame}`];
    const c = document.createElement('canvas'); c.width = atlas.cell.w; c.height = atlas.cell.h;
    const g = c.getContext('2d')!;
    for (const id of s.drawOrder) {
      const p = s.pieces[id];
      g.globalCompositeOperation = p.kind === 'shade' ? 'source-atop' : 'source-over';
      g.drawImage(sheet, p.sx, p.sy, p.w, p.h, p.x, p.y, p.w, p.h);
    }
    t = Texture.from(c);
    this.frames.set(key, t);
    return t;
  }

  // Ask the worker for every chunk in view, plus a ring around it so ground is ready
  // before it scrolls in. Drop the least recently used beyond the cache size.
  private streamGround(camX: number, camY: number) {
    const w = this.view.w, h = this.view.h, now = performance.now();
    const corners = [[camX, camY], [camX + w, camY], [camX, camY + h], [camX + w, camY + h]].map(([x, y]) => toGround(x, y));
    const a0 = Math.floor(Math.min(...corners.map((c) => c[0])) / CHUNK) - 1, a1 = Math.floor(Math.max(...corners.map((c) => c[0])) / CHUNK) + 1;
    const b0 = Math.floor(Math.min(...corners.map((c) => c[1])) / CHUNK) - 1, b1 = Math.floor(Math.max(...corners.map((c) => c[1])) / CHUNK) + 1;
    for (let ca = a0; ca <= a1; ca++) for (let cb = b0; cb <= b1; cb++) {
      const key = `${ca},${cb}`, c = this.chunks.get(key);
      if (c) { c.used = now; continue; }
      if (this.pending.has(key) || this.pending.size > 6) continue;
      this.pending.add(key);
      this.worker.postMessage({ type: 'build', key, ca, cb });
    }
    if (this.chunks.size > this.stats.maxChunks) {
      const old = [...this.chunks.entries()].sort((p, q) => p[1].used - q[1].used).slice(0, this.chunks.size - this.stats.maxChunks);
      for (const [k, c] of old) { this.groundLayer.removeChild(c.sprite); c.sprite.texture.destroy(true); c.sprite.destroy(); this.chunks.delete(k); this.stats.chunksEvicted++; }
    }
  }
  get chunksPending() { return this.pending.size; }
  get chunksCached() { return this.chunks.size; }

  // Draw one frame centred on a ground point.
  draw(centreA: number, centreB: number, shadows: Drawable[], actors: Drawable[]) {
    const [cx, cy] = toScreen(centreA, centreB);
    const camX = Math.round(cx - this.view.w / 2), camY = Math.round(cy - this.view.h / 2 - 30);
    this.world.x = -camX; this.world.y = -camY;
    this.streamGround(camX, camY);
    this.fill(this.shadowLayer, this.shadowPool, shadows);
    this.fill(this.actorLayer, this.actorPool, actors);
  }
  private fill(layer: Container, pool: Sprite[], items: Drawable[]) {
    while (pool.length < items.length) { const s = new Sprite(); layer.addChild(s); pool.push(s); }
    pool.forEach((s, i) => {
      const d = items[i];
      s.visible = !!d;
      if (!d) return;
      s.texture = d.texture; s.x = d.x; s.y = d.y; s.alpha = d.alpha ?? 1;
    });
  }
}
