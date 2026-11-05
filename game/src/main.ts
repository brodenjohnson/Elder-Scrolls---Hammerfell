import { Game, VERSION } from './game';
import { listSaves, readSave } from './save/save';
import { SLICE } from './world/map';

// Boot: the game, a small HUD, the newer-version notice and the debug handle.

const game = new Game();
const hud = document.getElementById('hud')!, msg = document.getElementById('msg')!, notice = document.getElementById('notice')!;
document.getElementById('version')!.textContent = `v${VERSION}`;

await game.start(document.getElementById('stage')!);

setInterval(() => {
  const w = game.where(), p = game.player;
  hud.innerHTML = `<b>${w.info.region}</b><br>${w.info.biome}${w.info.level_band ? `, levels ${w.info.level_band}` : ''}<br>` +
    `<span class="dim">slice ${w.sx + 1},${w.sy + 1} &middot; tile ${Math.floor(p.a)},${Math.floor(p.b)} &middot; ${game.fps} fps</span>`;
  msg.textContent = game.currentMessage;
}, 100);

// Newer-version notice: the deployed site publishes version.json; a running copy
// that is older says so (CLAUDE.md release flow).
const newer = (a: string, b: string) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
};
async function checkVersion() {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    const { version } = await r.json();
    if (newer(version, VERSION)) { notice.textContent = `Version ${version} is out. Save, then reload the page to update.`; notice.hidden = false; }
  } catch { /* offline: say nothing */ }
}
checkVersion();
setInterval(checkVersion, 10 * 60 * 1000);

// Debug handle: Playwright tests drive and inspect the game through this.
(window as any).__game = {
  version: VERSION, game,
  get player() { return { ...game.player }; },
  where: () => { const w = game.where(); return { sx: w.sx, sy: w.sy, region: w.info.region, biome: w.info.biome, material: w.material }; },
  teleport: (a: number, b: number) => game.place(a, b),
  material: (a: number, b: number) => game.terrain.material(a, b),
  loadedSlices: () => [...game.streamer.loaded.keys()].sort(),
  things: () => [...game.streamer.things()].map((t) => ({ ...t })),
  smash: () => game.smash(),
  save: (slot: string) => game.save(slot), load: (slot: string) => game.load(slot), readSave, listSaves,
  checkVersion,
  stats: () => ({ fps: game.fps, streamer: { ...game.streamer.stats }, chunks: { ...game.renderer.stats, cached: game.renderer.chunksCached, pending: game.renderer.chunksPending }, frameLog: game.frameLog.slice(-600) }),
  SLICE,
  ready: true,
};
