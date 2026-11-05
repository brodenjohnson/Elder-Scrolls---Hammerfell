import { Game, VERSION } from './game';
import { FURY, type FuryId } from './combat/combat';
import { clockText } from './systems/clock';
import { DEFAULT_NAME } from './systems/character';
import { listSaves, readSave } from './save/save';
import { SLICE } from './world/map';

// Boot: the game, a small HUD, the newer-version notice and the debug handle.

const game = new Game();
const hud = document.getElementById('hud')!, msg = document.getElementById('msg')!, notice = document.getElementById('notice')!;
document.getElementById('version')!.textContent = `v${VERSION}`;

await game.start(document.getElementById('stage')!);

// Character creation: shown for a new game (the first visit, and N after death).
// Ten races with Skyrim's skill boosts; only those with drawn sprites can be picked yet.
const DRAWN = ['RedguardRace'];
const create = document.getElementById('create')!, nameBox = document.getElementById('create-name') as HTMLInputElement;
let race = 'RedguardRace';
function showCreate() {
  nameBox.value = DEFAULT_NAME;
  const races = [...game.data.races.values()];
  document.getElementById('create-races')!.innerHTML = races.map((r) => `<button data-race="${r.edid}" ${DRAWN.includes(r.edid) ? '' : 'disabled title="Sprites for this race come in a later release"'} class="${r.edid === race ? 'sel' : ''}">${r.name}</button>`).join('');
  const r = game.data.races.get(race)!;
  document.getElementById('create-race-note')!.textContent = `${r.name}: ${r.skillBoosts.filter((b) => ['OneHanded', 'TwoHanded', 'Archery', 'Block', 'Smithing', 'HeavyArmor', 'LightArmor', 'Pickpocket', 'Lockpicking', 'Sneak', 'Alchemy', 'Speech'].includes(b.skill)).map((b) => `${b.skill.replace(/([a-z])([A-Z])/g, '$1 $2')} +${b.boost}`).join(', ')}. Other races open as their sprites are drawn.`;
  create.hidden = false;
}
create.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.race) { race = t.dataset.race; showCreate(); }
  if (t.id === 'create-go') { game.create(nameBox.value, race); create.hidden = true; }
});
game.onNewGame = showCreate;
if (!listSaves().length) showCreate();

// The mature content warning, once per browser (bible 11.3), with a gore choice.
const warning = document.getElementById('warning')!;
warning.hidden = game.settings.warned;
warning.addEventListener('click', (e) => {
  const gore = (e.target as HTMLElement).dataset.gore as 'off' | 'some' | 'full' | undefined;
  if (!gore) return;
  game.setSettings({ gore, warned: true });
  warning.hidden = true;
});

setInterval(() => {
  const w = game.where(), p = game.player;
  hud.innerHTML = `<b>${w.info.region}</b><br>${w.info.biome}${w.info.level_band ? `, levels ${w.info.level_band}` : ''}<br>` +
    `<span class="dim">slice ${w.sx + 1},${w.sy + 1} &middot; tile ${Math.floor(p.a)},${Math.floor(p.b)} &middot; ${game.fps} fps</span><br>` +
    `${clockText(game.time)}<br>Level ${game.character.s.level} &middot; Armour ${game.character.armourRating()}${game.character.s.pendingLevelUps ? ' &middot; <b>level up (C)</b>' : ''}`;
  msg.textContent = game.currentMessage;
  const f = game.pf;
  if (f) {
    document.getElementById('hp')!.style.width = `${(100 * Math.max(0, f.health)) / f.maxHealth}%`;
    document.getElementById('sp')!.style.width = `${(100 * Math.max(0, f.stamina)) / f.maxStamina}%`;
    document.getElementById('dead')!.hidden = f.state !== 'dead';
    const c = game.combat, rp = document.getElementById('rp')!;
    rp.style.width = `${c.rage}%`;
    rp.parentElement!.classList.toggle('ready', c.rage >= FURY[game.furyPower].cost && !c.fury);
    const status = [
      c.fury && `${FURY[c.fury.power].name} ${Math.ceil(c.fury.left)}s`, c.exhausted > 0 && `Exhausted ${Math.ceil(c.exhausted)}s`,
      f.bleed > 0 && 'Bleeding', f.limp > 0 && 'Limping',
    ].filter(Boolean);
    const tr = document.getElementById('tracker')!, quests = game.quests.tracker();
    tr.hidden = !quests.length;
    tr.innerHTML = quests.map((t) => `<b>${t.title}</b>${t.objectives.filter((o) => o.have < o.need).map((o) => `<div>&middot; ${o.text}${o.need > 1 ? ` (${o.have}/${o.need})` : ''}</div>`).join('')}`).join('<br>');
    document.getElementById('status')!.textContent = status.join(' \u00b7 ');
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
  fighters: () => [game.pf, ...game.combat.enemies].filter(Boolean).map((f) => ({ id: f!.id, name: f!.name, weapon: f!.weapon.edid, outfit: f!.outfit, a: f!.a, b: f!.b, state: f!.state, health: f!.health, maxHealth: f!.maxHealth, stamina: f!.stamina, facing: f!.facing })),
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
  // Phase 3, second part: Rage and Fury, wounds, gore and finishers.
  rage: () => game.combat.rage,
  setRage: (n: number) => { game.combat.rage = n; },
  fury: (power?: FuryId) => game.fury(power),
  furyState: () => ({ fury: game.combat.fury, exhausted: game.combat.exhausted, unlocked: game.furyUnlocked() }),
  unlockFury: (power: FuryId) => game.flags.add(`fury:${power}`),
  finish: () => game.finisher(),
  bandage: () => game.useItem('Bandage'),
  wounds: (id = 'player') => { const f = [game.pf!, ...game.combat.enemies].find((x) => x.id === id)!; return { bleed: f.bleed, limp: f.limp, severed: [...f.severed] }; },
  parts: () => game.combat.parts.map((p) => ({ owner: p.owner, part: p.part, settled: p.settled, a: p.a, b: p.b })),
  bodies: () => structuredClone(game.combat.bodies),
  // Pin the dice: 0 makes every chance happen, 0.999 none; null goes back to random.
  settings: () => ({ ...game.settings }),
  time: () => game.time,
  create: (name: string) => { game.create(name); create.hidden = true; },
  setTime: (t: number) => { game.time = t; },
  light: () => game.renderer.world.tint,
  quests: () => ({ tracker: game.quests.tracker(), done: [...game.quests.s.done] }),
  startQuest: (id: string) => game.quests.start(id),
  morale: (id: string) => { const e = game.combat.enemies.find((x) => x.id === id)!; return { fleeing: e.ai!.fleeing, checked: e.ai!.moraleChecked }; },
  wake: (id: string) => { const e = game.combat.enemies.find((x) => x.id === id)!; e.ai!.passive = false; e.ai!.aggro = true; },
  setGore: (gore: 'off' | 'some' | 'full') => game.setSettings({ gore }),
  decals: () => game.combat.decals.length,
  setRandom: (v: number | null) => { game.combat.rng = v === null ? Math.random : () => v; },
  setHealth: (id: string, h: number) => { const f = [game.pf!, ...game.combat.enemies].find((x) => x.id === id)!; f.health = h; },
  stagger: (id: string) => { const e = game.combat.enemies.find((x) => x.id === id)!; e.state = 'hit'; e.t = 0; e.hitFor = 2; },
  placeEnemy: (id: string, da: number, db: number) => { const e = game.combat.enemies.find((x) => x.id === id)!, pf = game.pf!; e.a = pf.a + da; e.b = pf.b + db; e.state = 'idle'; game.combat.faceTowards(pf, e.a, e.b); game.player.facing = pf.facing; game.combat.faceTowards(e, pf.a, pf.b); },
  rules: (attacker: string, defender: string, power = false, blocking = false) => {
    const all = [game.pf!, ...game.combat.enemies], a = all.find((x) => x.id === attacker)!, d = all.find((x) => x.id === defender)!;
    return game.combat.hit(a, d, { power, blocking });
  },
  sheetsLoaded: () => game.sheetsLoaded(),
  ready: true,
};
