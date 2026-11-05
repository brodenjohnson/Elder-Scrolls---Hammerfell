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
    `<span class="dim">slice ${w.sx + 1},${w.sy + 1} &middot; tile ${Math.floor(p.a)},${Math.floor(p.b)} &middot; ${game.fps} fps</span><br>` +
    `Level ${game.character.s.level} &middot; Armour ${game.character.armourRating()}${game.character.s.pendingLevelUps ? ' &middot; <b>level up (C)</b>' : ''}`;
  msg.textContent = game.currentMessage;
  const f = game.pf;
  if (f) {
    document.getElementById('hp')!.style.width = `${(100 * Math.max(0, f.health)) / f.maxHealth}%`;
    document.getElementById('sp')!.style.width = `${(100 * Math.max(0, f.stamina)) / f.maxStamina}%`;
    document.getElementById('dead')!.hidden = f.state !== 'dead';
  }
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
  // Systems (Phase 2).
  character: () => structuredClone(game.character.s),
  useSkill: (skill: string, amount: number) => game.character.useSkill(skill as never, amount),
  skillXpToNext: (skill: string) => game.character.skillXpToNext(skill as never),
  xpToNext: () => game.character.xpToNext(),
  canTake: (perk: string) => game.character.canTake(perk),
  takePerk: (perk: string) => game.character.takePerk(perk),
  perkValue: (entryPoint: string, base: number, keywords: string[]) => game.character.perkValue(entryPoint, base, keywords),
  give: (edid: string, n = 1) => game.character.give(edid, n),
  equip: (edid: string) => game.character.equip(edid),
  armourRating: () => game.character.armourRating(),
  outfit: () => game.outfit(),
  interact: () => game.interact(),
  talk: (id: string) => { game.talk(id); return game.panels.conversation!.current.text; },
  choices: () => game.panels.conversation?.choices.map((c) => c.text) ?? [],
  choose: (i: number) => { game.panels.conversation?.choose(i); game.panels.render(); return game.panels.conversation?.done ? null : game.panels.conversation?.current.text; },
  reputation: () => structuredClone(game.reputation),
  flags: () => [...game.flags],
  npcs: () => game.npcs.map((n) => ({ ...n })),
  // Combat (Phase 3).
  fighters: () => [game.pf, ...game.combat.enemies].filter(Boolean).map((f) => ({ id: f!.id, a: f!.a, b: f!.b, state: f!.state, health: f!.health, stamina: f!.stamina, facing: f!.facing })),
  combatLog: () => [...game.combat.log],
  timeScale: () => game.combat.timeScale,
  attackAt: (id: string, power = false) => { const e = game.combat.enemies.find((x) => x.id === id)!; game.combat.faceTowards(game.pf!, e.a, e.b); game.player.facing = game.pf!.facing; return power ? game.combat.powerAttack(game.pf!) : game.combat.quick(game.pf!); },
  block: (on: boolean) => game.combat.block(game.pf!, on),
  roll: () => game.combat.roll(game.pf!),
  // Put one bandit next to the player and have it swing; the others are sent home and calmed.
  enemySwing: (id: string, power = false) => {
    const e = game.combat.enemies.find((x) => x.id === id)!, pf = game.pf!;
    for (const o of game.combat.enemies) if (o !== e) { o.ai!.passive = true; o.a = o.ai!.home[0] + 30; o.b = o.ai!.home[1]; }
    e.ai!.passive = true;
    e.a = pf.a - 1.2; e.b = pf.b; e.state = 'idle'; e.stamina = e.maxStamina; e.ai!.cooldown = 99;
    game.combat.faceTowards(e, pf.a, pf.b); game.combat.faceTowards(pf, e.a, e.b); game.player.facing = pf.facing;
    if (power) game.combat.powerAttack(e); else game.combat.quick(e);
    return game.combat.hitMoment(e);
  },
  calm: () => { for (const e of game.combat.enemies) e.ai!.passive = true; },
  rules: (attacker: string, defender: string, power = false, blocking = false) => {
    const all = [game.pf!, ...game.combat.enemies], a = all.find((x) => x.id === attacker)!, d = all.find((x) => x.id === defender)!;
    return game.combat.hit(a, d, { power, blocking });
  },
  ready: true,
};
