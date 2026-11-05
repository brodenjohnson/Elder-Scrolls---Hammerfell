// Builds ground chunk images off the main thread: tiles, then the transition
// overlays from higher-priority neighbours. Uses the same terrain code as the game.
import { WorldMap } from '../world/map';
import { MATERIALS, Terrain, hash } from '../world/terrain';
import { CHUNK, TILE_H, TILE_W, toScreen } from './iso';

type Init = { type: 'init'; base: string; manifest: { tiles: { id: string; file: string }[]; overlays: { material: string; files: { side: string; file: string }[] }[] }; slices: ConstructorParameters<typeof WorldMap>[0] };
type Build = { type: 'build'; key: string; ca: number; cb: number };

let terrain: Terrain;
const tiles = new Map<string, ImageBitmap>(), overlays = new Map<string, ImageBitmap>();
let ready: Promise<void>;

const bitmap = async (url: string) => createImageBitmap(await (await fetch(url)).blob());

// The worker scope, typed locally so the DOM types stay right for the rest of the game.
const scope = self as unknown as { onmessage: (e: MessageEvent<Init | Build>) => void; postMessage: (m: unknown, t: Transferable[]) => void };
scope.onmessage = async (e) => {
  const m = e.data;
  if (m.type === 'init') {
    terrain = new Terrain(new WorldMap(m.slices));
    ready = (async () => {
      await Promise.all(m.manifest.tiles.map(async (t) => tiles.set(t.id, await bitmap(m.base + t.file))));
      await Promise.all(m.manifest.overlays.flatMap((o) => o.files.map(async (f) => overlays.set(`${o.material}__${f.side}`, await bitmap(m.base + f.file)))));
    })();
    return;
  }
  await ready;
  const t0 = performance.now();
  const W = CHUNK * TILE_W, H = CHUNK * TILE_H + TILE_H;
  const canvas = new OffscreenCanvas(W, H);
  const g = canvas.getContext('2d')!;
  const [ox, oy] = toScreen(m.ca * CHUNK, m.cb * CHUNK);
  const left = ox - W / 2, top = oy;
  // Materials for the chunk plus a one-tile border, so overlays can see their neighbours.
  const N = CHUNK + 2, mats = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) mats[j * N + i] = terrain.material(m.ca * CHUNK + i - 1, m.cb * CHUNK + j - 1);
  const at = (i: number, j: number) => mats[(j + 1) * N + (i + 1)];
  for (let j = 0; j < CHUNK; j++) for (let i = 0; i < CHUNK; i++) {
    const a = m.ca * CHUNK + i, b = m.cb * CHUNK + j, mat = at(i, j), name = MATERIALS[mat];
    const [x, y] = toScreen(a, b);
    const variant = name === 'sand.desert' && hash(a, b, 5) > 0.7 ? 1 : 0;
    const img = tiles.get(`${name}_${variant}`) ?? tiles.get(`${name}_0`);
    if (img) g.drawImage(img, x - left - TILE_W / 2, y - top);
    for (let hm = mat + 1; hm < MATERIALS.length; hm++) {
      const is = (di: number, dj: number) => at(i + di, j + dj) === hm;
      const sides: string[] = [];
      if (is(-1, 0)) sides.push('a0'); if (is(1, 0)) sides.push('a1'); if (is(0, -1)) sides.push('b0'); if (is(0, 1)) sides.push('b1');
      if (is(-1, -1) && !is(-1, 0) && !is(0, -1)) sides.push('a0b0');
      if (is(-1, 1) && !is(-1, 0) && !is(0, 1)) sides.push('a0b1');
      if (is(1, -1) && !is(1, 0) && !is(0, -1)) sides.push('a1b0');
      if (is(1, 1) && !is(1, 0) && !is(0, 1)) sides.push('a1b1');
      for (const s of sides) { const o = overlays.get(`${MATERIALS[hm]}__${s}`); if (o) g.drawImage(o, x - left - TILE_W / 2, y - top); }
    }
  }
  const image = canvas.transferToImageBitmap();
  scope.postMessage({ key: m.key, x: left, y: top, image, ms: performance.now() - t0 }, [image]);
};
