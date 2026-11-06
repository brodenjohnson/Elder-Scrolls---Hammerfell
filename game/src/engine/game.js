/* =====================================================================
   The game (0.8.0, design bible v0.3): style A art drawn at runtime, the Sentinel Coast
   as one full region with rooms to enter, people with days of their own, Skyrim's skills
   and perks, Rage, smithing and trading, torches and dark nights, the prologue and Act One.
   The fighting was lifted from the art sample (public/art-sample).
   ===================================================================== */
import { frameOf, crop, faceOf, fwd, ANIMS, COMBO, SWINGS, FINISHERS, KNEELS, FIN_NAMES, useItems, SHAPES, SETS, SHIELDS, PIECE, icon, OX, OY, SW, SH, clamp, hash, baseOf, flame } from './art.js';
import { creatureFrame, BEAST_ANIMS, BEAST_CELL } from './creatures.js';
import { World, flagOk, MATS } from './world.js';
import { Quests, newQuestState } from '../systems/quests';
import { Conversation } from '../systems/dialogue';
import { Cutscene } from '../systems/cutscene';
import { TIMESCALE, DAY, clockText, daylight } from '../systems/clock';
import { SAVE_VERSION, migrate, writeSave, readSave, listSaves, freshGame } from '../save/save';
import { newReputation, applyReputation } from '../systems/reputation';
import './audio.js';
import './voice.js';

const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const get = (p) => fetch(`./data/${p}`).then((r) => r.json());

// ---------- data: Skyrim's numbers from the game's data pack, and our own ----------
const [WDATA, ADATA, SKILLS, PERKS, EXTRA, MAPS, NPCS, QDEFS, SCENES, ENCOUNTERS, SMITH] = await Promise.all([
  get('game/weapons.json'), get('game/armour.json'), get('game/skills.json'), get('game/perks.json'), get('items.json'),
  get('world/maps.json'), get('world/people.json'), get('quests.json'), get('scenes.json'), get('world/encounters.json'), get('smithing.json'),
]);
const ITEMS = {};
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
for (const [k, v] of Object.entries(EXTRA)) if (!k.startsWith('_')) ITEMS[k] = { edid: k, weight: 0, value: 0, ...v };
ITEMS.Fists = { edid: 'Fists', name: 'Fists', cat: 'none', damage: 4, speed: 1.2, reach: 0.7, weight: 0, value: 0, shape: 'none', metal: 'iron', hands: 1, cls: 'fist', skillName: null };
useItems(ITEMS);
// Improved weapons and armour are items of their own: IronSword+2 is an Iron Sword improved by 2
// (Skyrim's Fine to Legendary). They are made the first time they are needed, so a save needs nothing new.
function variant(e) {
  if (ITEMS[e] || !String(e).includes('+')) return ITEMS[e];
  const [b, n] = String(e).split('+'), it = ITEMS[b], k = +n;
  if (!it || !(k > 0)) return undefined;
  const weapon = it.cat === 'weapon', tier = clamp(Math.ceil(weapon ? k : k / 2), 1, 6);
  return (ITEMS[e] = { ...it, edid: e, improved: k, name: `${it.name} (${SMITH.qualities[tier]})`, damage: weapon ? it.damage + k : it.damage, rating: weapon ? it.rating : it.rating + k, value: Math.round(it.value * (1 + 0.15 * tier)) });
}
const DIALOGUES = {};
await Promise.all(NPCS.dialogues.map((id) => get(`dialogue/${id}.json`).then((d) => { DIALOGUES[id] = d; }).catch(() => {})));

// ---------- the running game ----------
// `state` keeps the names the art sample's combat code uses; save() and load() turn it into
// the saved GameState (save.ts) and back.
const state = {
  paused: false, gold: 0, inv: {}, rage: 0, fury: 0, furyT: 0, deathless: false, stamina: 100, staminaWait: 0, level: 1, xp: 0, skills: {}, perkPoints: 0, ragePoints: 0, perks: new Set(),
  flash: 0, shock: null, ragePing: false, stats: { kills: 0, finishers: 0, severed: 0, looted: 0, gold: 0, blocks: 0, parries: 0 }, events: [], quest: {},
};
const settings = { gore: 'full', light: 'auto' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('hammerfell.settings') || '{}')); } catch { /* private window */ }
const gore = () => settings.gore;
const say = (text, kind = 'info') => state.events.push({ text, kind });
let pl = null, foes = [], actors = [], pieces = [], particles = [], pools = [], hitStop = 0, slow = 0, shake = 0, fin = null, attacker = null, camX = 0, camY = 0, letter = 0;
const keys = new Set();
let holdStart = null;

// ---------- fighters: people and beasts share these ----------
const W8 = (f) => ITEMS[f.eq?.weapon] || ITEMS.Fists;
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
const guardOf = (f) => (shieldOn(f) ? (baseOf(f.eq.shield) === 'ArmorHideShield' ? 'wood' : 'metal') : 'blade');
const finTurn = {}; // the next finisher of each kind, so they take turns
const shieldOn = (f) => !!(f.eq?.shield && f.eq.shield !== 'Torch' && W8(f).hands === 1);
const torchLit = (f) => !f.dead && !f.beast && f.eq?.shield === 'Torch' && W8(f).hands === 1;
const BEAST_FOR = { stagger: 'hit', kneel: 'hit', clutch: 'hit', impaled: 'hit', shieldBlock: 'idle', enemyChop: 'attack', enemySlash: 'attack', run: 'run', block: 'idle' };
const animsOf = (f) => (f.beast ? BEAST_ANIMS : ANIMS);
const frames = (f) => animsOf(f)[f.anim].frames;
const swingSpeed = (w) => w.speed * (w.hands === 2 ? 0.85 : w.cls === 'dagger' ? 1.1 : 1);
const dur = (f, i) => { const fr = frames(f)[i]; return animsOf(f)[f.anim].attack || f.anim === 'power' ? fr.d / (f.beast ? 1 : swingSpeed(W8(f))) : fr.d; };
function play(f, anim) { if (f.beast) anim = BEAST_FOR[anim] || anim; if (!animsOf(f)[anim]) anim = 'idle'; f.anim = anim; f.fi = 0; f.ft = 0; f.struck = false; f.hits = 0; }
const busy = (f) => !['idle', 'walk', 'run', 'block', 'shieldBlock'].includes(f.anim);
const canAct = (f) => !fin && !f.dead && (!busy(f) || (SWINGS.includes(f.anim) && f.struck && f.fi > frames(f).findIndex((q) => q.hit)));
const reachOf = (f) => (f.beast ? 22 : 14 + SHAPES[W8(f).shape].len * 1.25);
function inArc(a, b, r, cos = 0.3) { const dx = b.x - a.x, dy = (b.y - a.y) * 1.3, d = Math.hypot(dx, dy), [fx, fy] = fwd(a); return d < r && (fx * dx + fy * dy) / (d || 1) > cos; }
// Blood lands on the ground for good: on chunks of decals the size of the ground's chunks.
let decalChunks = new Map();
function stain(x, y, w, h, c) {
  if (!world) return;
  const cx = Math.floor(x / 256), cy = Math.floor(y / 256), key = cx * 1000 + cy;
  let d = decalChunks.get(key);
  if (!d) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; d = { cv, g: cv.getContext('2d') }; decalChunks.set(key, d); }
  d.g.fillStyle = c; d.g.fillRect(Math.round(x) - cx * 256, Math.round(y) - cy * 256, w, h);
}
let world = null;

// ---------- the fighting (from the art sample) ----------
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
// Perks for things the game does not have. A perk that needs one of these needs what that one needs.
const NOT_HERE = {
  DualFlurry30: 'No dual wielding', DualSavagery: 'No dual wielding', DeflectArrows: 'No archers to face yet', ElementalProtection: 'No magic in this game', Cushioned: 'No falling in this game',
  DwarvenSmithing: 'No Dwemer metal on the coast', ElvenSmithing: 'No elven metal on the coast', AdvancedArmors: 'No such armour on the coast', GlassSmithing: 'No glass on the coast',
  EbonySmithing: 'No ebony on the coast', DaedricSmithing: 'No daedric metal on the coast', DragonArmor: 'No dragons on the coast', ArcaneBlacksmith: 'No magic in this game',
  fence: 'Nothing is stolen in this game', Bribery: 'No guards to bribe', Intimidation: 'No threats to make yet',
};
const unmet = (r) => (NOT_HERE[r] ? PERK[r].requires.map(unmet).find(Boolean) || null : state.perks.has(r) ? null : r);
function canTake(first) {
  const e = chainOf(first).find((x) => !state.perks.has(x));
  if (!e) return 'Taken';
  const q = PERK[e], req = q.skillReq[0]?.level || 0;
  if (NOT_HERE[first]) return NOT_HERE[first];
  if (state.skills[q.skill].level < req) return `Needs ${SKILL_NAMES[q.skill]} ${req}`;
  for (const r of q.requires) { const u = unmet(r); if (u) return `Needs ${PERK[u]?.name || u}`; }
  if (state.perkPoints <= 0 && !(q.skill === 'Rage' && state.ragePoints > 0)) return 'No perk points';
  return 'ok';
}
function takePerk(first) {
  if (canTake(first) !== 'ok') return false;
  state.perks.add(chainOf(first).find((x) => !state.perks.has(x))); if (PERK[first].skill === 'Rage' && state.ragePoints > 0) state.ragePoints--; else state.perkPoints--;
  say(`Perk: ${PERK[first].name}${chainOf(first).length > 1 ? ` (${rank(first)}/${chainOf(first).length})` : ''}`, 'skill'); sfx('level');
  return true;
}
// What he is wearing, for the armour perks.
const worn = () => ['body', 'hands', 'feet', 'head'].map((k) => ITEMS[pl.eq[k]]);
const allOf = (type) => worn().every((it) => it && it.armourType === type);
const matched = () => { const sets = ['body', 'hands', 'feet', 'head'].map((k) => PIECE[baseOf(pl.eq[k])]?.[0]); return sets.every((x) => x && x === sets[0]); };

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
  for (let i = 4; i < len; i++) { if (Math.random() < 0.3) continue; const w = Math.random() < 0.5 ? 2 : 1; stain(x + ux * i + (Math.random() - 0.5) * 3, y + uy * i * 0.6 + (Math.random() - 0.5) * 2, w, 1, BLOOD[Math.floor(Math.random() * 3)]); }
}
// Chunks: bone, flesh and worse, which bounce and stay where they land.
function bits(x, y, z, n) {
  const C = ['#c7bc9b', '#e2d9bb', '#7c3920', '#622817', '#c87a7a', '#a85a5a'];
  for (let i = 0; i < n * (gore() === 'full' ? 1.6 : 1); i++) particles.push({ x, y, z, vx: (Math.random() - 0.5) * 110, vy: (Math.random() - 0.5) * 50, vz: 40 + Math.random() * 90, c: C[Math.floor(Math.random() * C.length)], big: Math.random() < 0.6, chunk: true });
}
function sparks(x, y) { for (let i = 0; i < 9; i++) particles.push({ x, y, z: 20, vx: (Math.random() - 0.5) * 110, vy: (Math.random() - 0.5) * 50, vz: 30 + Math.random() * 50, c: '#ffe7a0', spark: 0.22 }); }
function pool(x, y, max) { if (gore() !== 'off') pools.push({ x, y, r: 1, max: max * (gore() === 'full' ? 1.5 : 1) }); }
function pixelEllipse(cx, cy, rx, ry, c) { for (let y = -Math.floor(ry); y <= ry; y++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2))); stain(cx - w, cy + y, w * 2 + 1, 1, c); } }

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
  if (!f.beast) {
    if (Math.random() < 0.6) items.Bandage = 1 + Math.floor(Math.random() * 2);
    if (Math.random() < 0.35) items.PotionHealth = 1;
    if (Math.random() < 0.3) items.Salt = 1 + Math.floor(Math.random() * 3);
  } else if (['boar', 'jackal', 'hound', 'wolf'].includes(f.beast)) items.Hide = 1;
  Object.assign(items, f.lootExtra || {});
  return { items, gold: f.beast ? 0 : f.gold ?? 5 + Math.floor(Math.random() * 25) };
}
// The story still needs them: at no Health they drop to one knee for a while, then get up.
function knockDown(f) {
  f.hp = 1; f.down = 8; f.stagger = 0; f.bleed = 0; f.spurt = 0; f.fleeT = 0; f.kb = [f.kb[0] * 0.3, f.kb[1] * 0.3];
  if (attacker === f) attacker = null; play(f, 'kneel'); say(`${f.pname} is down`, 'hint');
}
function kill(f, by, how = {}) {
  if (f.essential && f !== pl && !how.story) { knockDown(f); return; }
  f.dead = true; f.hp = 0; play(f, how.anim || 'death'); f.stagger = 0; f.kb = [f.kb[0] * 0.5, f.kb[1] * 0.5];
  if (how.part) sever(f, how.part, by);
  if (how.crush) { sfx('crush'); if (gore() !== 'off') { f.crushed = gore() === 'full'; spray(f.x, f.y, 40, 46, [0, 0], 1.4); if (gore() === 'full') bits(f.x, f.y, 40, 16); } }
  if (how.throat) { f.spurt = 2.6; sfx('throat'); }
  f.poolAt = 0.6; if (attacker === f) attacker = null;
  if (!how.part && !how.crush && !how.throat) sfx('death');
  if (f === pl) { say('You died. F9 loads your last save.', 'warn'); setTimeout(() => bark('victory', witness(pl)), 1000); onDeath(); return; }
  f.loot = lootOf(f); state.stats.kills++; addRage(8);
  if (furious()) { train('Rage', 40); if (has('RageRedMist')) state.fury += 2; }
  // Whoever is nearest says what he saw; now and then Kasim says something too.
  const what = how.part === 'head' ? 'allyHead' : how.part ? 'allyArm' : how.crush ? 'allyCrushed' : how.throat ? 'allyThroat' : 'allyDeath', w8 = witness(f);
  if (w8 && w8.aggro) setTimeout(() => bark(what, w8, { name: f.pname }), 600);
  else if (!foes.some((e) => !e.dead)) setTimeout(() => bark('clear', pl), 1200);
  if (Math.random() < 0.25) setTimeout(() => bark('kill', pl), 400);
  onKill(f, how);
}
function addRage(n) { state.rage = clamp(state.rage + n * (n > 0 && state.fury <= 0 && has('RageSeething') ? 1.5 : 1), 0, 100); }
// Fury, before and after the Rage perks: 8 s, blows x1.25, damage taken x0.75, no flinching.
const furyLength = () => 8 + 3 * rank('RageBloodlust');
const furyDealt = () => 1.25 + 0.15 * rank('RageSavage');
const furyTaken = () => [0.75, 0.6, 0.45, 0.3][rank('RagePain')];
const furious = () => state.fury > 0;
const bark = (kind, f, ctx) => { if (f && !f.beast && !f.def?.mute) window.HFV?.bark(kind, f, ctx); };
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
    dmg = (att.dmg ?? (w.cls === 'fist' ? 6 : w.hands === 2 ? 22 : 13)) * (power ? 1.4 : 1) * (1 - Math.min(0.8, armourRating() * 0.004)) * (furious() ? furyTaken() : 1);
    // Deathless: once each Fury, a killing blow leaves him on 1 Health.
    if (furious() && has('RageDeathless') && !state.deathless && pl.hp - dmg <= 0) { dmg = pl.hp - 1; state.deathless = true; state.fury += 3; say('Deathless', 'level'); }
    if (allOf('Heavy') && has('ReflectBlows') && Math.random() < 0.1) { att.hp -= 1; att.flash = 0.08; say('Reflected', 'hint'); }
  }
  def.hp -= dmg; def.flash = 0.08;
  if (def.essential && def !== pl && def.hp <= 0) { sfx('impact', { cls: w.cls, mat: matOf(def), heavy }); knockDown(def); return; }
  if (def.yieldAt && !def.yielded && def.hp <= def.maxHp * def.yieldAt) { def.hp = Math.max(def.hp, 0.5); sfx('impact', { cls: w.cls, mat: matOf(def), heavy }); yieldNow(def); return; }
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
  if ((fin || scene) && att !== pl) return; // nobody strikes the player mid-finisher or in a cutscene
  if (att !== pl) sfx('swing', { shape: W8(att).shape, heavy: W8(att).hands === 2 });
  const targets = att === pl ? foes : [pl];
  const kind = att.anim === 'power' ? 'power' : att.anim === 'chop' && att === pl ? 'combo3' : att.anim === 'enemyChop' ? 'power' : 'quick';
  for (const def of targets) {
    const sweep = att === pl && kind === 'power' && W8(att).hands === 2 && has('Sweep');
    if (def.dead || def.down > 0 || !inArc(att, def, reachOf(att), sweep ? -0.25 : 0.3)) continue;
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
      if (parry) { play(att, 'stagger'); att.stagger = 1.6; if (attacker === att) attacker = null; state.stats.parries++; onParry(att); say('Parried', 'hint'); }
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
  if (pl.sheathed) { sheathe(false); return; }
  if (!canAct(pl) && pl.anim !== 'block' && pl.anim !== 'shieldBlock') return;
  if (!spend(20)) return;
  const t = nearest(40, 0); if (t) pl.face = faceOf(t.x - pl.x, t.y - pl.y);
  const [fx, fy] = fwd(pl); pl.kb = [fx * 50, fy * 40];
  play(pl, 'bash'); sfx('swing', {});
}
function landBash() {
  for (const e of foes) {
    if (e.dead || e.down > 0 || !inArc(pl, e, 30, 0.2)) continue;
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
  if (pl.sheathed) { sheathe(false); return; }
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
  for (const e of foes) { if (e.dead || e.down > 0 || !pred(e)) continue; const d = Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.3); if (d < bd && (cos <= -1 || inArc(pl, e, r, cos) || d < 20)) { best = e; bd = d; } }
  return best;
}
const finishable = (e) => !e.dead && !e.beast && !e.yielded && !e.essential && !e.down && (e.stagger > 0 || e.hp <= e.maxHp * 0.3 || (furious() && has('RageButcher')));
function finisher() {
  if (fin || pl.dead || state.paused || (busy(pl) && !canAct(pl))) return;
  if (pl.sheathed) { sheathe(false); return; }
  const e = nearest(46, -2, finishable);
  if (!e) { const k = nearest(46, -2, (x) => x.essential && !x.down); say(k ? `${k.pname} is needed alive` : 'Stagger him first: a third hit, a power attack or a parry', 'warn'); return; }
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
  if (!e.aggro && !pl.dead && d < (e.sight || 110)) { for (const o of foes) if (o.group === e.group && Math.hypot(o.x - e.x, o.y - e.y) < 260) o.aggro = true; bark('spot', e); }
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
function step(f, dt) {
  f.ft += dt * 1000;
  while (f.ft >= dur(f, f.fi)) {
    f.ft -= dur(f, f.fi);
    const fr = frames(f);
    if (f.fi + 1 < fr.length) {
      f.fi++;
      if (fr[f.fi].hit) {
        if (f.anim.startsWith('fin_')) landFinisher(f.hits++);
        else if (!f.struck) { f.struck = true; if (f.anim === 'bash') landBash(); else if (f.anim === 'roar') landRoar(); else if (f.beast) landBite(f); else landBlow(f); }
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

// ---------- the saved game, and everything that is not the fighting ----------
let S = freshGame();                 // the saved state (save.ts GameState)
let tradeNext = false;
let flags = new Set(), quests = null, convo = null, convoWith = null, scene = null, shop = null, playSeconds = 0, fade = { a: 0, to: 0, then: null };
const WORLDS = new Map();            // map id -> { world, decals }
const dynamic = [];                  // random encounters on the road
let encT = 90, mapTime = 0;
const hourNow = () => (S.time % DAY) / 3600;
const inHours = (h, from, to) => (from <= to ? h >= from && h < to : h >= from || h < to);
const ws = (m) => (S.world[m] ??= { containers: {}, actors: {} });
const HOSTILE = new Set(['bandit', 'kesh', 'wild', 'alikr', 'training']);
const hostileTo = (a) => !a.dead && !a.yielded && !a.gone && (HOSTILE.has(a.faction) || flags.has(`hostile:${a.id}`)) && !flags.has(`calm:${a.id}`);
const nameOf = (e) => ITEMS[e]?.name ?? e;

// ---------- carrying things ----------
function take(edid, n) {
  variant(edid);
  state.inv[edid] = (state.inv[edid] || 0) + n;
  if (n > 0) { flags.add(`has:${edid}`); quests?.checkFlags(); }
  if (state.inv[edid] <= 0) { delete state.inv[edid]; flags.delete(`has:${edid}`); for (const k of Object.keys(pl.eq)) if (pl.eq[k] === edid) pl.eq[k] = null; }
}
function equip(edid) {
  const it = ITEMS[edid]; if (!it || !state.inv[edid]) return;
  if (it.cat === 'weapon') {
    pl.eq.weapon = pl.eq.weapon === edid ? null : edid;
    if (it.hands === 2 && pl.eq.shield === 'Torch' && pl.eq.weapon) { pl.eq.shield = null; say('Two hands on the weapon: the torch goes out', 'info'); }
    else if (it.hands === 2 && pl.eq.shield && pl.eq.weapon) say('Two-handed: the shield goes on your back', 'info');
  } else if (it.torch) {
    pl.eq.shield = pl.eq.shield === 'Torch' ? null : 'Torch';
    if (pl.eq.shield && W8(pl).hands === 2) { pl.eq.weapon = null; say('The torch takes a hand: the two-hander goes on your back', 'info'); }
  } else if (it.cat === 'apparel') pl.eq[it.slot] = pl.eq[it.slot] === edid ? null : edid;
}
// L: light a torch, or put it out.
function toggleTorch() {
  if (!pl || pl.dead) return;
  if (pl.eq.shield === 'Torch') { pl.eq.shield = null; say('Torch put out', 'info'); return; }
  if (!state.inv.Torch) { say('You have no torch. Dalia and Hamid sell them.', 'warn'); return; }
  equip('Torch'); sfx('torch');
}
// R: put the weapon away, or draw it. Attacking, bashing or a finisher draws it too.
function sheathe(on = !pl.sheathed) {
  if (!pl || pl.dead || fin || !pl.eq.weapon || !!pl.sheathed === on || (busy(pl) && !canAct(pl))) return false;
  pl.sheathed = on; sfx('sheathe', { draw: !on }); return true;
}
function useItem(edid) {
  const it = ITEMS[edid]; if (!it || !state.inv[edid]) return;
  if (it.cat === 'weapon' || it.cat === 'apparel' || it.torch) return equip(edid);
  if (it.read) { state.events.push({ kind: 'read', text: it.read, title: it.name }); if (it.readFlag) { flags.add(it.readFlag); quests.checkFlags(); } return; }
  if (it.heal) { if (pl.hp >= pl.maxHp && edid !== 'Bandage') { say('Your health is full', 'warn'); return; } pl.hp = Math.min(pl.maxHp, pl.hp + it.heal); take(edid, -1); say(`${it.name} used`, 'info'); }
}
function drop(edid) { if (!state.inv[edid]) return; if (ITEMS[edid]?.quest) { say('You keep that.', 'warn'); return; } take(edid, -1); say(`${ITEMS[edid].name} dropped`, 'info'); }
function lootFrom(src, edid, all) {
  const box = src.loot || src.box;
  if (!box) return;
  if (edid === 'Gold') { if (!box.gold) return; state.gold += box.gold; state.stats.gold += box.gold; say(`${box.gold} Gold added`, 'item'); box.gold = 0; }
  else {
    if (!box.items[edid]) return; const n = all ? box.items[edid] : 1; take(edid, n); box.items[edid] -= n; if (box.items[edid] <= 0) delete box.items[edid];
    say(`${nameOf(edid)}${n > 1 ? ` (${n})` : ''} added`, 'item'); state.stats.looted += n;
    if (src.loot && !box.items[edid]) src.eq = Object.fromEntries(Object.entries(src.eq).map(([k, v]) => [k, v === edid ? null : v])); // taken off the body
  }
  sfx('pickup');
  if (src.def?.lootFlag && !Object.keys(box.items).length && !box.gold) flags.add(src.def.lootFlag);
  if (src.box) { quests.notify({ type: 'interact', target: `open:${src.id}` }); ws(world.id).containers[src.id] = src.box; }
}

// ---------- people and beasts ----------
function placementOf(def) {
  const h = hourNow();
  for (const w of def.where || []) { if (!flagOk(w, flags)) continue; if (w.from !== undefined && !inHours(h, w.from, w.to)) continue; return w; }
  return null;
}
function mkActor(id, def, wp) {
  const hp = (def.hp ?? 5) * (HOSTILE.has(def.faction) && !def.beast ? 1.25 : 1); // round six: a quarter more health
  const a = {
    id, def, name: def.name, pname: def.pname || def.name, person: def.beast ? null : def.ap || def.person || 'kasim', apKey: id, build: def.build || 'man', eq: { ...(def.eq || {}) }, beast: def.beast || null,
    x: wp.x, y: wp.y, face: wp.face ?? Math.PI, home: [wp.x, wp.y], wander: wp.wander ?? 0, anim: 'idle', fi: 0, ft: Math.random() * 300, kb: [0, 0], flash: 0, hp, maxHp: hp,
    struck: false, combo: 0, comboT: 9, buffer: null, cut: [], crushed: false, stagger: 0, inv: 0, cool: 1 + Math.random() * 2, aggro: false, dead: false,
    prevBlade: null, curBlade: null, drawnFi: -1, drawnAnim: '', spurt: 0, pt: null, ghosts: [], blockT: 0, hits: 0,
    faction: def.faction || 'village', ai: def.ai || 'villager', dialogue: def.dialogue, shop: def.shop, voice: def.voice, vid: id, group: def.group || id, sight: def.sight, dmg: def.dmg,
    lootExtra: def.loot, gold: def.gold, yieldAt: def.yield, chief: def.boss, essential: def.essential, walkT: Math.random() * 3,
  };
  const saved = ws(world.id).actors[id];
  // Someone the story needs, left dead by a save from before 0.8.1, is up again.
  if (saved?.dead && !def.essential) { Object.assign(a, saved, { dead: true, hp: 0, anim: 'death', fi: frames({ ...a, anim: 'death' }).length - 1, ft: 0 }); }
  else if (saved?.eq) a.eq = saved.eq;
  return a;
}
function spawnActors() {
  actors = [];
  for (const [id, def] of Object.entries(NPCS.people)) {
    if (!flagOk(def, flags) || flags.has(`gone:${id}`)) continue;
    // A follower comes with you; everyone else is where their day puts them.
    if (def.follow && flags.has(def.follow) && placementOf(def)) { const a = mkActor(id, def, { x: pl.x - 14, y: pl.y + 8, face: pl.face }); a.ai = 'follow'; actors.push(a); continue; }
    const wp = placementOf(def);
    if (wp && wp.map === world.id) actors.push(mkActor(id, def, wp));
  }
  for (const d of dynamic) if (d.map === world.id) actors.push(d);
  torches();
}
// After dark, outdoors, people carry torches: villagers out late, travellers, raiders. A shield or a
// two-handed weapon leaves no hand free; a 'torch: false' in their data keeps it out of their hand.
const nightNow = () => { const h = hourNow(); return h >= 19.5 || h < 5.5; };
function torches() {
  const night = !world.indoor && nightNow();
  for (const a of actors) {
    if (a.beast || a.dead) continue;
    const free = !a.eq.shield || a.eq.shield === 'Torch', want = night && a.def?.torch !== false && free && W8(a).hands === 1;
    if (want && !a.eq.shield) a.eq = { ...a.eq, shield: 'Torch' };
    else if (!want && a.eq.shield === 'Torch' && a.def?.eq?.shield !== 'Torch') a.eq = { ...a.eq, shield: null };
  }
}
// Keep what matters about the people of a map when leaving it: who is dead, where, what they carry.
function storeActors() {
  if (!world) return;
  const w = ws(world.id);
  for (const a of actors) if (a.dead && !a.dynamic) w.actors[a.id] = { dead: true, x: Math.round(a.x), y: Math.round(a.y), face: a.face, eq: a.eq, cut: a.cut, crushed: a.crushed, loot: a.loot };
    else if (!a.dynamic && a.eq !== a.def.eq) w.actors[a.id] = { eq: a.eq };
}
function yieldNow(e) {
  e.yielded = true; e.aggro = false; e.stagger = 0; e.kb = [0, 0]; if (attacker === e) attacker = null;
  play(e, 'kneel'); say(`${e.pname} gives up`, 'hint'); bark('scared', e);
  if (e.def.yieldFlag) { flags.add(e.def.yieldFlag); quests.checkFlags(); }
}
function onParry() { quests.notify({ type: 'interact', target: 'parry' }); }
function onKill(f, how) {
  quests.notify({ type: 'kill', target: f.def?.questId || f.id });
  if (f.def?.killFlag) { flags.add(f.def.killFlag); quests.checkFlags(); }
  if (f.def?.namedTarget && !flags.has(`named:${f.id}`)) crossName(f.id);
  // The last of a group: a camp, a cave, a crew. cleared:<group> is what quests wait for.
  if (!actors.some((e) => e !== f && !e.dead && !e.yielded && e.group === f.group)) { flags.add(`cleared:${f.group}`); quests.checkFlags(); if (HOSTILE.has(f.faction) && !f.dynamic) say('That is the last of them.', 'hint'); }
}
// A name from the list crossed off: a free Rage perk point (Broden, 2026-11-06).
function crossName(id) {
  if (flags.has(`named:${id}`)) return;
  flags.add(`named:${id}`); state.ragePoints++; quests.checkFlags();
  state.events.push({ kind: 'banner', small: 'A name crossed off', text: NPCS.people[id]?.name || id, sub: 'A Rage perk point to spend' });
}
function onDeath() { state.events.push({ kind: 'dead' }); }

// ---------- what a press of E does ----------
function activatable() {
  if (!pl || pl.dead || scene || fin) return null;
  let best = null, bd = 99;
  const consider = (d, o) => { if (d < bd) { best = o; bd = d; } };
  const dist = (x, y) => Math.hypot(x - pl.x, (y - pl.y) * 1.3);
  for (const a of actors) {
    const d = dist(a.x, a.y);
    if (a.dead && a.loot && d < 30) consider(d, { kind: 'body', ref: a, name: a.pname || a.name, verb: 'Search' });
    else if (!a.dead && !hostileTo(a) && (a.dialogue || a.shop || a.def?.pet) && d < 42) consider(d - 4, { kind: 'talk', ref: a, name: a.pname || a.name, verb: a.def?.pet ? (flags.has(a.def.follow) ? 'Send home' : 'Pet') : 'Talk to' });
    else if (a.yielded && !a.dead && d < 44) consider(d - 6, { kind: 'talk', ref: a, name: a.pname, verb: 'Talk to' });
  }
  for (const c of world.containers) { const d = dist(c.x, c.y); if (d < 30) consider(d, { kind: 'container', ref: containerOf(c), name: c.name, verb: 'Open' }); }
  for (const dr of world.doors) { const d = dist(dr.x, dr.y); if (d < 26) consider(d, { kind: 'door', ref: dr, name: dr.label, verb: dr.locked && !flags.has(dr.locked) ? 'Locked:' : 'Enter' }); }
  for (const u of world.uses) { if (!flagOk(u, flags)) continue; const d = dist(u.x, u.y); if (d < (u.r || 20)) consider(d, { kind: 'use', ref: u, name: u.name, verb: u.verb || 'Use' }); }
  return best;
}
function containerOf(c) { const saved = ws(world.id).containers[c.id]; return { id: c.id, name: c.name, box: saved || { items: { ...(c.items || {}) }, gold: c.gold || 0 } }; }
function activate() {
  const a = activatable(); if (!a) return null;
  if (a.kind === 'door') {
    const dr = a.ref;
    if (dr.locked && !flags.has(dr.locked)) { say(dr.lockedMsg || 'Locked.', 'warn'); return null; }
    if (dr.scene && !flags.has(`scene:${dr.scene}`)) { playScene(dr.scene); return null; }
    enterMap(dr.to, dr.tx, dr.ty);
    return null;
  }
  if (a.kind === 'use') return use(a.ref);
  if (a.kind === 'talk') {
    const n = a.ref;
    if (n.def?.pet) { petDog(n); return null; }
    if (n.yielded && n.def.yieldDialogue) return talk(n, n.def.yieldDialogue);
    if (n.dialogue) return talk(n, n.dialogue);
    if (n.shop) return { kind: 'shop', ref: openShop(n) };
    return null;
  }
  return a; // a body or a container: the menus open it
}
function use(u) {
  if (u.need && !state.inv[u.need]) { say(u.needMsg || `You need ${nameOf(u.need)}.`, 'warn'); return null; }
  if (u.need && u.consume) take(u.need, -1);
  if (u.msg) say(u.msg, 'hint');
  if (u.give) for (const [k, n] of Object.entries(u.give)) { take(k, n); say(`${nameOf(k)}${n > 1 ? ` (${n})` : ''} added`, 'item'); }
  if (u.setFlag) { flags.add(u.setFlag); world.refresh(flags); }
  if (u.id) quests.notify({ type: 'interact', target: u.id });
  quests.checkFlags();
  if (u.scene) playScene(u.scene);
  if (u.run) runAction(u.run);
  if (u.sleep) return { kind: 'sleep' };
  if (u.smith) return { kind: 'smith', station: u.smith, name: u.name };
  if (u.read) state.events.push({ kind: 'read', title: u.name, text: u.read });
  return null;
}
function petDog(d) {
  const f = d.def.follow;
  if (!flags.has('pet:dune')) { flags.add('pet:dune'); S.bond.dog = Math.min(5, S.bond.dog + 1); say('Dune rolls over. Bond with Dune', 'hint'); quests.notify({ type: 'interact', target: 'dune' }); return; }
  if (state.inv.Bandage && flags.has('dune.hurt') && !flags.has('dune.bandaged')) { take('Bandage', -1); flags.add('dune.bandaged'); quests.checkFlags(); say('You bind the torn ear. Dune thumps his tail.', 'hint'); return; }
  if (flags.has(f)) { flags.delete(f); d.ai = 'villager'; say('Dune trots off home.', 'hint'); spawnActors(); } else { flags.add(f); d.ai = 'follow'; say('Dune falls in at your heel.', 'hint'); }
}
function talk(n, id) {
  const d = DIALOGUES[id]; if (!d) { say(`(${n.pname} has nothing to say yet.)`, 'hint'); return null; }
  convo = new Conversation(d, dialogueCtx()); convoWith = n;
  if (n.ai !== 'follow') n.face = faceOf(pl.x - n.x, pl.y - n.y);
  pl.face = faceOf(n.x - pl.x, n.y - pl.y);
  return { kind: 'talk', ref: convo };
}
function dialogueCtx() {
  return {
    character: { s: { skills: state.skills, inventory: state.inv }, give: (e, n) => take(e, n), useSkill: (k, n) => train(k, n), data: { weapons: { get: (k) => ITEMS[k] }, armour: { get: (k) => ITEMS[k] }, items: ITEMS } },
    reputation: S.reputation, flags, say: (m) => say(m, 'item'), quests, bond: S.bond, gold: () => state.gold, addGold: (g) => { state.gold += g; say(g > 0 ? `${g} Gold added` : `${-g} Gold given`, 'item'); }, run: (a) => runAction(a),
    checkEase: has('Persuasion') ? 0.7 : 1, // Persuasion: Speech checks are 30 percent easier
  };
}
function endConversation() {
  convo = null; const n = convoWith; convoWith = null;
  if (n?.def?.after) runAction(n.def.after);
  // A trader's 'Let me see your wares' opens the shop once the talking is over.
  if (tradeNext && n?.shop) state.events.push({ kind: 'open', what: { kind: 'shop', ref: openShop(n) } });
  tradeNext = false;
  world.refresh(flags);
}

// ---------- trading (Skyrim's way: prices by Speech and its perks, merchants with a purse) ----------
// A merchant's gold and stock come back every two days, as in Skyrim; what you sold them is gone by then.
// Investor adds 500 to one merchant's purse for good; Master Trader adds 1000 to every merchant's.
const purse = (n, s) => n.shop.gold + (s.invested ? 500 : 0) + (has('MasterTrader') ? 1000 : 0);
function shopState(n) {
  const sh = (S.world.shops ??= {}), s = (sh[n.id] ??= { gold: n.shop.gold, stock: { ...n.shop.stock }, at: S.time });
  if (S.time - (s.at ?? 0) >= 2 * DAY) Object.assign(s, { gold: purse(n, s), stock: { ...n.shop.stock }, at: S.time });
  for (const e of Object.keys(s.stock)) variant(e);
  return s;
}
function openShop(n) { shop = { npc: n, s: shopState(n) }; return shop; }
// Haggling: 10, 15, 20, 25 or 30 percent better. Allure: 10 percent better with a woman.
function haggle() {
  let k = [0, 0.1, 0.15, 0.2, 0.25, 0.3][rank('Haggling00')];
  if (has('Allure') && (shop?.npc.def.build === 'woman' || shop?.npc.def.female)) k += 0.1;
  return k;
}
const buyPrice = (e) => Math.max(1, Math.ceil(ITEMS[e].value * (1.9 - 0.6 * Math.min(100, state.skills.Speech.level) / 100) * (1 - haggle())));
const sellPrice = (e) => Math.max(0, Math.floor((ITEMS[e].value / (2.9 - 0.9 * Math.min(100, state.skills.Speech.level) / 100)) * (1 + haggle())));
// What a merchant will take off you (Merchant: anything, from anyone).
const buysIt = (n, e) => !ITEMS[e]?.quest && (has('Merchant') || !n.shop.buys || n.shop.buys.includes(ITEMS[e].cat));
function buy(e) {
  const s = shop.s, p = buyPrice(e);
  if (!s.stock[e]) return false; if (state.gold < p) { say('Not enough gold', 'warn'); return false; }
  state.gold -= p; s.gold += p; s.stock[e]--; if (!s.stock[e]) delete s.stock[e]; take(e, 1); train('Speech', p); sfx('pickup');
  quests.notify({ type: 'interact', target: `buy:${e}` });
  return true;
}
function sell(e) {
  const s = shop.s, p = sellPrice(e), it = ITEMS[e];
  if (!state.inv[e] || it.quest) { if (it?.quest) say('You keep that.', 'warn'); return false; }
  if (!buysIt(shop.npc, e)) { say(`${shop.npc.pname} doesn't buy that.`, 'warn'); return false; }
  if (s.gold < p) { say(`${shop.npc.pname} can't afford it.`, 'warn'); return false; }
  if (Object.values(pl.eq).includes(e) && state.inv[e] === 1) for (const k of Object.keys(pl.eq)) if (pl.eq[k] === e) pl.eq[k] = null;
  state.gold += p; s.gold -= p; s.stock[e] = (s.stock[e] || 0) + 1; take(e, -1); train('Speech', p); sfx('pickup');
  quests.notify({ type: 'interact', target: `sell:${e}` }); quests.notify({ type: 'interact', target: 'sell' });
  return true;
}
// Investor: 500 gold into a merchant's business, once, for a bigger purse from then on.
function invest() {
  const s = shop?.s; if (!s || !has('Investor') || s.invested) return false;
  if (state.gold < 500) { say('Investing takes 500 gold', 'warn'); return false; }
  state.gold -= 500; s.invested = true; s.gold += 500; say(`You invest 500 gold with ${shop.npc.pname}`, 'item'); return true;
}

// ---------- smithing (Skyrim's: make things at the forge, improve them at the grindstone and workbench) ----------
// Smelting and tanning teach nothing; making and improving train Smithing by the item's value.
const smithXp = (v) => 3 * Math.pow(Math.max(1, v), 0.65) + 25;
const haveAll = (need, n = 1) => Object.entries(need).every(([e, k]) => (state.inv[e] || 0) >= k * n);
function recipes(station) { return (SMITH[station] || []).map((r) => ({ ...r, perkOk: !r.perk || has(r.perk), have: haveAll(r.need) })); }
function craft(station, make) {
  const r = SMITH[station]?.find((x) => x.make === make); if (!r) return false;
  if (r.perk && !has(r.perk)) { say(`Needs the ${PERK[r.perk].name} perk`, 'warn'); return false; }
  if (!haveAll(r.need)) { say('You lack the materials', 'warn'); return false; }
  for (const [e, k] of Object.entries(r.need)) take(e, -k);
  take(make, r.n || 1); say(`${nameOf(make)}${(r.n || 1) > 1 ? ` (${r.n})` : ''} made`, 'item'); sfx('smith', { station });
  if (station === 'forge') train('Smithing', smithXp(ITEMS[make].value));
  quests.notify({ type: 'interact', target: `craft:${make}` });
  return true;
}
// What an item is made of, for the material that improves it.
function materialOf(e) {
  const it = ITEMS[e]; if (!it) return null;
  if (it.cat === 'weapon') return it.metal;
  if (it.cat !== 'apparel' || it.armourType === 'Clothing') return null;
  const b = baseOf(e), m = SHIELDS[b]?.face || PIECE[b]?.[0] || null;
  return m === 'orcish' ? 'orc' : m;
}
// Skyrim's quality tiers follow Smithing (Fine at 15 up to Legendary at 100); the perk for the
// material doubles the gain. Weapons gain damage, armour gains twice as much rating.
const smithTier = () => clamp(1 + Math.floor((state.skills.Smithing.level - 15) / 17), 1, 6);
function improvement(e) {
  const it = ITEMS[e], m = materialOf(e); if (!m || !SMITH.improveWith[m]) return { why: 'This cannot be improved.' };
  const mat = SMITH.improveWith[m], dbl = SMITH.doubles[m] && has(SMITH.doubles[m]) ? 2 : 1;
  const k = smithTier() * dbl * (it.cat === 'weapon' ? 1 : 2);
  if (k <= (it.improved || 0)) return { why: 'Your Smithing is not yet good enough to improve it further.', mat };
  const to = `${baseOf(e)}+${k}`; variant(to);
  return { to, mat };
}
function improve(e) {
  const r = improvement(e); if (!r.to) { say(r.why, 'warn'); return false; }
  if (!state.inv[e]) return false;
  if (!state.inv[r.mat]) { say(`Improving it takes ${nameOf(r.mat)}`, 'warn'); return false; }
  const slot = Object.keys(pl.eq).find((k) => pl.eq[k] === e);
  take(r.mat, -1); take(e, -1); take(r.to, 1); if (slot) pl.eq[slot] = r.to;
  say(`Improved: ${ITEMS[r.to].name}`, 'item'); sfx('smith', { station: ITEMS[e].cat === 'weapon' ? 'grindstone' : 'workbench' });
  train('Smithing', smithXp(ITEMS[r.to].value));
  quests.notify({ type: 'interact', target: 'improve' });
  return true;
}

// ---------- the story's actions (from scenes, dialogue and the world's data) ----------
function runAction(str) {
  for (const one of String(str).split(';')) {
    const [cmd, ...args] = one.trim().split(/\s+/);
    switch (cmd) {
      case 'go': { const [m, x, y] = args; enterMap(m, +x, +y, false); break; }
      case 'time': { // time H (the next H o'clock) or time day+N H
        let days = 0, h = +args[0]; if (args[0].startsWith('day+')) { days = +args[0].slice(4); h = +args[1]; }
        const now = S.time, base = Math.floor(now / DAY) * DAY; let t = base + days * DAY + h * 3600; if (t <= now && !days) t += DAY; S.time = t; spawnActors(); break;
      }
      case 'wait': S.time += +args[0] * 3600; break;
      case 'flag': flags.add(args[0]); quests.checkFlags(); break;
      case 'unflag': flags.delete(args[0]); break;
      case 'refresh': world.refresh(flags); spawnActors(); break;
      case 'heal': pl.hp = pl.maxHp; state.stamina = 100; break;
      case 'hurt': pl.hp = Math.max(1, pl.hp * +args[0]); break;
      case 'scene': playScene(args[0]); break;
      case 'quest': quests.start(args[0]); break;
      case 'name': crossName(args[0]); break;
      case 'ragepoint': state.ragePoints++; say('A Rage perk point to spend', 'level'); break;
      case 'hostile': flags.add(`hostile:${args[0]}`); flags.delete(`calm:${args[0]}`); for (const a of actors) if (a.id === args[0]) { a.yielded = false; a.aggro = true; } break;
      case 'calm': flags.add(`calm:${args[0]}`); break;
      case 'free': { flags.add(`gone:${args[0]}`); const a = actors.find((x) => x.id === args[0]); if (a) { a.gone = true; a.leaving = true; } break; }
      case 'finish': { const a = actors.find((x) => x.id === args[0]); if (a && !a.dead) { a.yielded = false; a.stagger = 5; play(a, 'stagger'); a.fi = 1; pl.face = faceOf(a.x - pl.x, a.y - pl.y); setTimeout(() => finisher(), 60); } break; }
      case 'kill': { const a = actors.find((x) => x.id === args[0]); if (a && !a.dead) kill(a, pl, { story: true }); break; }
      case 'give': take(args[0], +(args[1] || 1)); say(`${nameOf(args[0])} added`, 'item'); break;
      case 'take': take(args[0], -(+(args[1] || 1))); break;
      case 'equip': if (!state.inv[args[0]]) take(args[0], 1); pl.eq[ITEMS[args[0]].cat === 'weapon' ? 'weapon' : ITEMS[args[0]].slot] = args[0]; break;
      case 'strip': pl.eq.weapon = null; pl.eq.shield = null; break;
      case 'banner': state.events.push({ kind: 'banner', small: args[0].replace(/_/g, ' '), text: args.slice(1).join(' ').replace(/_/g, ' ') }); break;
      case 'say': say(args.join(' ').replace(/_/g, ' '), 'hint'); break;
      case 'save': autosave(); break;
      case 'nightFight': nightT = 0; break;
      case 'dynamicClear': dynamic.length = 0; break;
      case 'trade': tradeNext = true; break;
      case 'talk': { const a = actors.find((x) => x.id === args[0]); if (a) setTimeout(() => state.events.push({ kind: 'open', what: talk(a, args[1] || a.dialogue) }), 0); break; }
      default: console.warn('unknown action', one);
    }
  }
}
function playScene(id) {
  const sc = SCENES[id]; if (!sc) return false;
  flags.add(`scene:${id}`);
  keys.clear(); holdStart = null;
  scene = new Cutscene(sc, { flag: (f) => { flags.add(f); quests.checkFlags(); }, startQuest: (q) => quests.start(q), player: () => [pl.x, pl.y], token: (s) => s.replaceAll('[PLAYER]', S.name), run: (a) => runAction(a) }, sc.startFade ?? 0);
  return true;
}

// ---------- maps ----------
function getWorld(id) {
  let e = WORLDS.get(id);
  if (!e) { e = { world: new World(MAPS.maps[id], flags), decals: new Map() }; WORLDS.set(id, e); }
  else e.world.refresh(flags);
  // Keep the region and the three last rooms; older rooms are drawn again when you come back.
  if (WORLDS.size > 5) for (const k of WORLDS.keys()) { if (k !== id && k !== 'coast' && WORLDS.size > 5) WORLDS.delete(k); }
  return e;
}
function enterMap(id, x, y, withFade = true) {
  if (!MAPS.maps[id]) { console.warn('no map', id); return; }
  const go = () => {
    storeActors();
    if (world) WORLDS.get(world.id).decals = decalChunks;
    const e = getWorld(id); world = e.world; decalChunks = e.decals;
    S.map = id; pl.x = x; pl.y = y; pl.kb = [0, 0]; pieces = []; particles = []; pools = []; attacker = null; fin = null; mapTime = 0;
    for (const d of dynamic.slice()) if (d.map !== id) dynamic.splice(dynamic.indexOf(d), 1);
    spawnActors(); snapCamera(); world.warm(pl.x, pl.y, 9);
    if (MAPS.maps[id].name) state.events.push({ kind: 'place', text: MAPS.maps[id].name });
    autosave();
  };
  if (withFade) { fade = { a: fade.a, to: 1, then: go }; } else go();
}

// ---------- saving ----------
function snapshot() {
  storeActors();
  S.x = Math.round(pl.x); S.y = Math.round(pl.y); S.face = pl.face; S.hp = Math.max(1, pl.hp); S.maxHp = pl.maxHp; S.eq = { ...pl.eq };
  Object.assign(S, { gold: state.gold, rage: state.rage, level: state.level, xp: state.xp, perkPoints: state.perkPoints, ragePoints: state.ragePoints, perks: [...state.perks], skills: state.skills, inventory: state.inv, flags: [...flags], stats: state.stats });
  return { version: SAVE_VERSION, savedAt: new Date().toISOString(), gameVersion: VERSION, playSeconds, game: structuredClone(S) };
}
function save(slot = 'quick') { if (!pl || pl.dead || scene) return false; writeSave(slot, snapshot()); if (slot !== 'auto') say('Saved', 'hint'); return true; }
function autosave() { if (pl && !pl.dead && !scene) writeSave('auto', snapshot()); }
function latestSlot() { let best = null, t = ''; for (const k of listSaves()) { try { const s = JSON.parse(localStorage.getItem(`hammerfell.save.${k}`)); if (s.savedAt > t) { t = s.savedAt; best = k; } } catch { /* a broken save is skipped */ } } return best; }
function begin(g, seconds = 0) {
  S = g; playSeconds = seconds;
  flags = new Set(S.flags);
  quests = new Quests(QDEFS, S.quests, { flags: () => flags, give: (e, n) => { take(e, n); say(`${nameOf(e)} added`, 'item'); }, say: (m) => say(m, 'quest') });
  Object.assign(state, { gold: S.gold, inv: S.inventory, rage: S.rage, fury: 0, stamina: 100, level: S.level, xp: S.xp, skills: S.skills, perkPoints: S.perkPoints, ragePoints: S.ragePoints || 0, perks: new Set(S.perks), stats: { kills: 0, finishers: 0, severed: 0, looted: 0, gold: 0, blocks: 0, parries: 0, ...S.stats }, deathless: false, flash: 0, shock: null });
  state.skills.Rage ??= { level: 15, xp: 0 };
  for (const e of [...Object.keys(S.inventory), ...Object.values(S.eq)]) variant(e);
  attract = null; document.body.classList.remove('titling');
  pl = { person: 'kasim', apKey: 'kasim', build: 'man', id: 'player', vid: 'kasim', voice: { pitch: 0.5, rate: 0.85, v: 0 }, eq: S.eq, x: S.x, y: S.y, face: S.face, anim: 'idle', fi: 0, ft: 0, kb: [0, 0], flash: 0, hp: S.hp, maxHp: S.maxHp,
    struck: false, combo: 0, comboT: 9, buffer: null, cut: [], crushed: false, stagger: 0, inv: 0, cool: 0, aggro: false, dead: false, prevBlade: null, curBlade: null, drawnFi: -1, drawnAnim: '', spurt: 0, pt: null, ghosts: [], blockT: 0, heading: Math.PI, hits: 0 };
  WORLDS.clear(); world = null; decalChunks = new Map(); dynamic.length = 0; scene = null; convo = null; shop = null; fin = null; attacker = null; hitStop = 0; slow = 0;
  enterMap(S.map, S.x, S.y, false);
}
function load(slot) {
  let s; try { s = readSave(slot); } catch (err) { say(String(err.message || err), 'warn'); return false; } // a save from a newer version is refused, not broken
  if (!s) return false; begin(s.game, s.playSeconds); say('Loaded', 'hint'); return true;
}
function newGame(name) {
  const g = freshGame((name || '').trim().slice(0, 24) || 'Kasim');
  begin(g); playScene('opening');
}

// ---------- the night and other things the story watches for ----------
let nightT = -1;
function storyWatch(dt) {
  // The night: fight at the door until one of them is dead, he is badly hurt, or long enough.
  if (flags.has('night.fight') && !flags.has('night.over') && world.id === 'coast') {
    nightT += dt;
    const downed = actors.filter((a) => a.def?.group === 'nightRaiders' && a.dead).length;
    if (downed >= 1 || pl.hp < pl.maxHp * 0.4 || nightT > 30) { flags.add('night.over'); pl.hp = Math.max(pl.hp, 20); playScene('nightEnd'); }
  }
  // Khadija's second lesson: let the Rage fill, and hold it.
  if (quests.stage('a15')?.id === 'rage' && state.rage >= 60 && !flags.has('khadija.rageFull')) { flags.add('khadija.rageFull'); quests.checkFlags(); }
  // Sparring partners stop when the lesson says so.
  for (const a of actors) if (a.def?.calmOn && flags.has(a.def.calmOn) && !flags.has(`calm:${a.id}`) && hostileTo(a)) { flags.add(`calm:${a.id}`); a.aggro = false; if (attacker === a) attacker = null; play(a, 'idle'); }
  // Places: seen when you come near.
  for (const p of MAPS.maps[world.id].places || []) if (!flags.has(`seen:${p.id}`) && Math.hypot(pl.x - p.x, pl.y - p.y) < p.r) { flags.add(`seen:${p.id}`); quests.notify({ type: 'reach', target: p.id }); quests.checkFlags(); if (p.banner !== false) state.events.push({ kind: 'discover', text: p.name, sub: p.kind }); }
  // Trigger zones: a scene, a conversation or a flag when you walk into them.
  for (const t of MAPS.maps[world.id].triggers || []) {
    if (!flagOk(t, flags) || (t.once !== false && flags.has(`trig:${t.id}`)) || Math.hypot(pl.x - t.x, pl.y - t.y) > t.r || scene || convo) continue;
    if (t.once !== false) flags.add(`trig:${t.id}`);
    if (t.flag) { flags.add(t.flag); quests.checkFlags(); }
    if (t.say) say(t.say, 'hint');
    if (t.run) runAction(t.run);
    if (t.scene) playScene(t.scene);
    if (t.talk) { const n = actors.find((a) => a.id === t.talk); if (n) state.events.push({ kind: 'open', what: talk(n, t.dialogue || n.dialogue) }); }
  }
  // Someone who gave up comes to talk when you come near.
  for (const a of actors) if (a.yielded && !a.dead && !a.talked && a.def.yieldDialogue && Math.hypot(a.x - pl.x, a.y - pl.y) < 34 && !convo && !scene) { a.talked = true; state.events.push({ kind: 'open', what: talk(a, a.def.yieldDialogue) }); }
}

// ---------- random encounters on the roads ----------
function encounters(dt) {
  if (world.id !== 'coast' || scene || flags.has('night.fight') && !flags.has('night.over')) return;
  if (dynamic.some((d) => !d.dead && !d.gone)) return;
  encT -= dt;
  if (encT > 0) return;
  encT = 70 + Math.random() * 80;
  const m = world.matAt(pl.x, pl.y);
  if (!['road', 'dirt', 'dry', 'grass', 'desert', 'sand'].includes(m)) return;
  if ((MAPS.maps.coast.places || []).some((p) => p.safe && Math.hypot(pl.x - p.x, pl.y - p.y) < p.r * 1.6)) return;
  const pool = ENCOUNTERS.table.filter((e) => flagOk(e, flags) && (!e.on || e.on.includes(m)));
  if (!pool.length) return;
  let r = Math.random() * pool.reduce((s, e) => s + e.weight, 0), pick = pool[0];
  for (const e of pool) { r -= e.weight; if (r <= 0) { pick = e; break; } }
  // Somewhere ahead, out of sight, on open ground.
  const ang = Math.atan2(Math.sin(pl.heading || 0) * 0, 1) + (pl.heading || 0) - Math.PI / 2, dist = 210;
  let x = pl.x + Math.cos(ang) * dist, y = pl.y + Math.sin(ang) * dist;
  for (let k = 0; k < 8 && (MATS[world.matAt(x, y)].walk === 0 || x < 20 || y < 20 || x > world.w - 20 || y > world.h - 20); k++) { const a2 = Math.random() * Math.PI * 2; x = pl.x + Math.cos(a2) * dist; y = pl.y + Math.sin(a2) * dist; }
  if (MATS[world.matAt(x, y)].walk === 0) return;
  pick.who.forEach((w, i) => {
    const def = { ...NPCS.templates[w], name: NPCS.templates[w].name };
    const a = mkActor(`enc${Date.now()}_${i}`, def, { x: x + (i % 3) * 14 - 14, y: y + Math.floor(i / 3) * 12 });
    a.dynamic = true; a.map = 'coast'; a.group = `enc${Date.now()}`; if (pick.aggro) a.aggro = true;
    dynamic.push(a); actors.push(a);
  });
  torches();
  if (pick.say) say(pick.say, 'hint');
}

// ---------- the people who are not fighting ----------
function moveTo(a, tx, ty, speed, dt) {
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  if (d < 2) { if (a.anim === 'walk' || a.anim === 'run') play(a, 'idle'); return true; }
  const sp = Math.min(d, speed * dt * world.speedAt(a.x, a.y));
  a.x += (dx / d) * sp; a.y += (dy / d) * sp; a.face = faceOf(dx, dy);
  const anim = speed > 40 ? 'run' : 'walk'; if (a.anim !== anim) play(a, anim);
  return false;
}
function peaceful(a, dt) {
  if (busy(a) || a.dead) return;
  if (a.leaving) { if (moveTo(a, a.x + (a.x > pl.x ? 400 : -400), a.y + 80, 50, dt) || Math.hypot(a.x - pl.x, a.y - pl.y) > 260) a.gone = true; return; }
  if (a.yielded) return;
  if (convoWith === a) { if (a.anim !== 'idle') play(a, 'idle'); return; }
  if (a.ai === 'follow') {
    // Dune: at your heel; he goes for anything that attacks you.
    const t = foes.find((e) => e.aggro && Math.hypot(e.x - a.x, e.y - a.y) < 90);
    if (t && a.def.fights) {
      const d = Math.hypot(t.x - a.x, t.y - a.y);
      if (d > 18) moveTo(a, t.x, t.y, 60, dt);
      else if ((a.cool -= dt) <= 0) { a.face = faceOf(t.x - a.x, t.y - a.y); play(a, 'attack'); a.cool = 1.4 + Math.random(); a.biteTarget = t; }
      return;
    }
    const d = Math.hypot(pl.x - a.x, pl.y - a.y);
    if (d > 30) moveTo(a, pl.x - 10, pl.y + 6, d > 80 ? 70 : 40, dt); else if (a.anim !== 'idle') play(a, 'idle');
    return;
  }
  // Wandering about their place; turning to look at you when you come close.
  if (a.wander > 0) {
    if ((a.walkT -= dt) <= 0) { a.walkT = 3 + Math.random() * 5; a.goal = Math.random() < 0.6 ? [a.home[0] + (Math.random() - 0.5) * 2 * a.wander, a.home[1] + (Math.random() - 0.5) * 2 * a.wander] : null; }
    if (a.goal) { if (moveTo(a, a.goal[0], a.goal[1], a.def.speed || (a.beast ? 22 : 18), dt)) a.goal = null; return; }
  }
  if (a.anim !== 'idle') play(a, 'idle');
  if (!a.beast && Math.hypot(pl.x - a.x, pl.y - a.y) < 34) a.face = faceOf(pl.x - a.x, pl.y - a.y);
}
// Hostile beasts: close in and bite; jackals and skeevers lose heart when badly hurt.
function thinkBeast(e, dt) {
  if (e.dead || fin || busy(e)) return;
  if (e.stagger > 0) { e.stagger -= dt; return; }
  const dx = pl.x - e.x, dy = pl.y - e.y, d = Math.hypot(dx, dy * 1.3);
  if (!e.aggro && !pl.dead && d < (e.sight || 100)) e.aggro = true;
  if (!e.aggro || pl.dead) { peaceful(e, dt); return; }
  if (e.fleeT > 0 || (e.def.flees && e.hp < e.maxHp * 0.3)) { e.fleeT = (e.fleeT || 3) - dt; moveTo(e, e.x - dx, e.y - dy, 55, dt); return; }
  e.cool -= dt;
  if (d > 18) moveTo(e, pl.x, pl.y, e.def.speed || 46, dt);
  else if (e.cool <= 0) { e.face = faceOf(dx, dy); play(e, 'attack'); e.cool = (e.def.rate || 1.6) + Math.random(); e.releaseAfter = false; }
  else { e.face = faceOf(dx, dy); if (e.anim !== 'idle') play(e, 'idle'); }
}
// A beast's bite lands: on you if it is hostile, on its target if it is Dune.
function landBite(e) {
  if (e.ai === 'follow') { const t = e.biteTarget; if (t && !t.dead && Math.hypot(t.x - e.x, t.y - e.y) < 26) { damage(e, t, 'quick'); } return; }
  landBlow(e);
}

// ---------- the screen: a small canvas scaled up by whole pixels to fill the window ----------
const view = document.getElementById('view'), ctx = view.getContext('2d');
let W = 320, H = 180, SCALE = 3;
function resize() {
  SCALE = Math.max(2, Math.floor(Math.min(innerWidth / 300, innerHeight / 170)));
  W = Math.ceil(innerWidth / SCALE); H = Math.ceil(innerHeight / SCALE);
  view.width = W; view.height = H; view.style.width = `${W * SCALE}px`; view.style.height = `${H * SCALE}px`;
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();
function snapCamera() { camX = pl.x - W / 2; camY = pl.y - H / 2 - 10; clampCam(); }
function clampCam() {
  if (world.indoor) { camX = world.w < W ? (world.w - W) / 2 : clamp(camX, 0, world.w - W); camY = world.h < H ? (world.h - H) / 2 : clamp(camY, 0, world.h - H); return; }
  camX = clamp(camX, 0, world.w - W); camY = clamp(camY, 0, world.h - H);
}

// ---------- the title's backdrop ----------
// Behind the title the coast is shown at dusk with no one in it, the camera drifting slowly
// along the shore from Saltreach towards the farm and back.
let attract = null;
function showTitle(on) {
  if (!on) { attract = null; return; }
  if (pl) return;
  const e = getWorld('coast'); world = e.world; decalChunks = e.decals; actors = []; foes = [];
  S.time = 19.4 * 3600; attract = { t: 0 };
}
function attractCam(rdt) {
  attract.t += rdt;
  const u = (1 - Math.cos((attract.t / 90) * Math.PI)) / 2; // there and back in three minutes
  camX = 560 + u * 620 - W / 2; camY = 1000 + u * 340 - H / 2; clampCam();
  world.warm(camX + W / 2, camY + H / 2, 2);
}

// ---------- the loop ----------
let villagerHour = -1;
function update(rdt) {
  if (attract && !pl) { attractCam(rdt); return; }
  // Fading between maps.
  if (fade.to !== fade.a) { fade.a += Math.sign(fade.to - fade.a) * Math.min(Math.abs(fade.to - fade.a), rdt * 5); if (fade.a >= 1 && fade.then) { const f = fade.then; fade.then = null; f(); fade.to = 0; } }
  if (!pl || !world || state.paused) return;
  playSeconds += rdt;
  if (scene) { scene.update(rdt); if (scene.done) { scene = null; autosave(); } }
  shake = Math.max(0, shake - 25 * rdt);
  if (state.flash > 0) state.flash -= rdt;
  if (state.shock) { state.shock.r += 260 * rdt; if (state.shock.r > 110) state.shock = null; }
  letter += ((fin || scene ? 1 : 0) - letter) * Math.min(1, rdt * 8);
  if (hitStop > 0) { hitStop -= rdt; return; }
  const dt = slow > 0 ? rdt * 0.3 : rdt; if (slow > 0) slow -= rdt;
  if (!convo && !shop) S.time += dt * TIMESCALE;
  mapTime += dt;
  foes = actors.filter(hostileTo);
  // Who is where changes on the hour.
  const hr = Math.floor(hourNow());
  if (hr !== villagerHour) { villagerHour = hr; if (!foes.some((e) => e.aggro)) refreshPeople(); else torches(); }

  let mx = 0, my = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1; if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  const free = !scene && !convo && !shop && fade.to === 0;
  if (!free) { mx = 0; my = 0; }
  const blocking = free && (keys.has('KeyK') || keys.has('mouse2'));
  const fighting = foes.some((e) => e.aggro && !e.dead);
  if (!pl.dead && !fin) {
    const blockAnim = shieldOn(pl) ? 'shieldBlock' : 'block', ground = world.speedAt(pl.x, pl.y);
    if (!busy(pl)) {
      if (blocking && state.stamina > 0 && pl.eq.weapon && !pl.sheathed) {
        if (pl.anim !== blockAnim) { play(pl, blockAnim); pl.blockT = 0; } pl.blockT += dt;
        if (mx || my) {
          const l = Math.hypot(mx, my), charge = shieldOn(pl) && has('ShieldCharge') && (keys.has('ShiftLeft') || keys.has('ShiftRight')) && state.stamina > 1;
          const sp = (charge ? 60 : shieldOn(pl) && has('BlockRunner') ? 30 : 16) * ground;
          pl.x += (mx / l) * sp * dt; pl.y += (my / l) * sp * dt * 0.8;
          if (charge) {
            state.stamina -= 18 * dt; state.staminaWait = 0.5;
            for (const e of foes) if (!e.dead && e.stagger <= 0 && Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.3) < 17) { e.kb = [(mx / l) * 220, (my / l) * 160]; play(e, 'stagger'); e.stagger = 2; if (attacker === e) attacker = null; hitStop = 0.08; shake = 4; sfx('bash', { guard: guardOf(pl) }); }
          }
        }
      } else if (mx || my) {
        const run = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && state.stamina > 1, l = Math.hypot(mx, my), sp = (run ? (heavyBody() ? 58 : 66) : 36) * ground;
        if (run && !(furious() && has('RageWind')) && fighting) { state.stamina -= 14 * dt; state.staminaWait = 0.5; }
        pl.face = faceOf(mx, my); pl.heading = Math.atan2(mx, -my); pl.x += (mx / l) * sp * dt; pl.y += (my / l) * sp * dt * 0.8;
        if (pl.anim !== (run ? 'run' : 'walk')) play(pl, run ? 'run' : 'walk');
      } else if (pl.anim !== 'idle') play(pl, 'idle');
    } else if (SWINGS.includes(pl.anim) && (mx || my)) {
      // Mid-swing he can still step and steer, at a bit over half his walking pace.
      const l = Math.hypot(mx, my); pl.x += (mx / l) * 20 * dt; pl.y += (my / l) * 20 * dt * 0.8; pl.heading = Math.atan2(mx, -my);
    }
    if (free && keys.has('Space')) { keys.delete('Space'); evade('dodge', mx, my); }
    if (free && keys.has('KeyC')) { keys.delete('KeyC'); evade('roll', mx, my); }
    if (pl.buffer && (pl.buffer.left -= dt) <= 0) pl.buffer = null;
    if (pl.buffer && canAct(pl)) { const b = pl.buffer; pl.buffer = null; attack(b.power); }
    if (holdStart !== null && performance.now() - holdStart > 250) { holdStart = null; attack(true); }
    if (!fighting) pl.hp = Math.min(pl.maxHp, pl.hp + 1.5 * dt);
    if ((state.staminaWait -= dt) <= 0 && !(blocking && busy(pl))) state.stamina = Math.min(100, state.stamina + 22 * dt * (allOf('Light') && has('WindWalker') ? 1.5 : 1));
    if (state.fury > 0) { state.fury -= dt; state.furyT += dt; } else if (!fighting) state.rage = Math.max(has('RageSmoulder') ? Math.min(state.rage, 25) : 0, state.rage - 2 * dt);
    if (state.rage >= 60 && !state.ragePing && state.fury <= 0) { state.ragePing = true; say('Rage is ready: Q', 'skill'); } else if (state.rage < 60) state.ragePing = false;
  }
  step(pl, dt);
  for (const e of actors) {
    if (e.dead) { step(e, dt); continue; }
    if (e.down > 0) { if ((e.down -= dt) <= 0) { e.down = 0; e.hp = Math.max(e.hp, e.maxHp * 0.5); play(e, 'idle'); } step(e, dt); continue; }
    e.sheathed = !e.aggro && !(fighting && e.def?.fights);
    // A cutscene holds the fight still: nobody strikes while the player cannot.
    if (scene && hostileTo(e)) { if (!busy(e) && e.anim !== 'idle') play(e, 'idle'); step(e, dt); continue; }
    if (hostileTo(e)) (e.beast ? thinkBeast : think)(e, dt); else peaceful(e, dt);
    step(e, dt);
  }
  // Keep the living apart, and everyone out of solid things and the sea.
  const alive = [pl, ...actors.filter((a) => !a.dead && !a.gone)];
  for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
    const a = alive[i], b = alive[j]; if (fin && (a === fin.e || b === fin.e)) continue;
    const dx = b.x - a.x, dy = (b.y - a.y) * 1.3, d = Math.hypot(dx, dy), r = a.beast || b.beast ? 12 : 15;
    if (d < r) { const push = (r - d) / 2, ux = dx / (d || 1), uy = dy / (d || 1); a.x -= ux * push; a.y -= uy * push / 1.3; b.x += ux * push; b.y += uy * push / 1.3; }
  }
  for (const f of alive) world.collide(f);
  // Severed parts fly, bounce and come to rest in a little pool.
  for (const q of pieces) {
    if (q.rest) continue;
    q.vz -= 300 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
    if (Math.random() < 0.5 && gore() !== 'off') particles.push({ x: q.x, y: q.y, z: q.z, vx: 0, vy: 0, vz: 0, c: '#7a0d0a' });
    if (q.z <= 2) { q.z = 2; if (q.vz < -50) { if (!q.bounced) { sfx('land'); spray(q.x, q.y, 2, 6, [q.vx, q.vy], 0.5); } q.bounced = true; q.vz *= -0.35; q.vx *= 0.5; q.vy *= 0.5; q.vr *= 0.5; } else { q.rest = true; q.rot = Math.round(q.rot / (Math.PI / 2)) * (Math.PI / 2); pool(q.x, q.y + 1, 6); streak(q.x, q.y, [q.vx || 1, q.vy], 8); } }
  }
  for (const q of pools) if (q.r < q.max) { q.r += dt * 4; pixelEllipse(q.x, q.y, q.r, q.r * 0.45, '#4a0b0b'); pixelEllipse(q.x, q.y, q.r * 0.7, q.r * 0.3, '#5e100e'); }
  particles = particles.filter((q) => {
    q.vz -= 280 * dt; q.z += q.vz * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.spark !== undefined) return (q.spark -= dt) > 0;
    if (q.z <= 0) { stain(q.x, q.y, q.big ? 2 : 1, q.chunk && q.big ? 2 : 1, q.c); return false; }
    return true;
  });
  if (particles.length > 1500) particles.splice(0, particles.length - 1500);
  storyWatch(dt); encounters(dt);
  actors = actors.filter((a) => !a.gone || Math.hypot(a.x - pl.x, a.y - pl.y) < 300);
  // The camera follows him, or the scene's camera.
  const want = scene?.view.camera ? [scene.view.camera[0] - W / 2, scene.view.camera[1] - H / 2] : [pl.x - W / 2, pl.y - H / 2 - 10];
  camX += (want[0] - camX) * Math.min(1, rdt * 6); camY += (want[1] - camY) * Math.min(1, rdt * 6); clampCam();
  world.warm(pl.x, pl.y, 1);
}
// On the hour: villagers go where their day takes them. Fights, bodies and followers stay.
function refreshPeople() {
  const keep = actors.filter((a) => a.dead || a.dynamic || hostileTo(a) || a.yielded || a.ai === 'follow');
  const before = new Map(actors.map((a) => [a.id, a]));
  spawnActors();
  actors = actors.map((a) => { const old = before.get(a.id); return old && !old.dead && placementOf(a.def)?.map === world.id && Math.hypot(old.home[0] - a.home[0], old.home[1] - a.home[1]) < 1 ? old : a; });
  for (const k of keep) if (!actors.includes(k) && !actors.some((a) => a.id === k.id)) actors.push(k);
}

// ---------- drawing ----------
const tmp = document.createElement('canvas'); tmp.width = Math.max(SW, BEAST_CELL.W); tmp.height = Math.max(SH, BEAST_CELL.H); const tg = tmp.getContext('2d');
const FONT = { F: ['111', '100', '110', '100', '100'] };
function glyph(ch, x, y, c) { ctx.fillStyle = c; FONT[ch].forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') ctx.fillRect(x + i, y + j, 1, 1); })); }
function tinted(src, w, h, fill) { tg.clearRect(0, 0, tmp.width, tmp.height); tg.globalCompositeOperation = 'source-over'; tg.drawImage(src, 0, 0); tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = fill; tg.fillRect(0, 0, w, h); return tmp; }
function drawFighter(f) {
  const fr = frames(f)[Math.min(f.fi, frames(f).length - 1)], sx = Math.round(f.x), sy = Math.round(f.y);
  if (f.beast) {
    const img = creatureFrame(f.beast, f.anim, f.fi, f.face); f.pt = img.pt;
    let src = img.canvas;
    if (f.flash > 0) src = tinted(img.canvas, BEAST_CELL.W, BEAST_CELL.H, 'rgba(255,255,255,0.85)');
    else if (fr.glow) src = tinted(img.canvas, BEAST_CELL.W, BEAST_CELL.H, `rgba(255,${Math.floor(performance.now() / 70) % 2 ? 190 : 140},60,0.45)`);
    ctx.drawImage(src, sx - BEAST_CELL.OX, sy - BEAST_CELL.OY);
    return;
  }
  const img = frameOf(f);
  f.pt = img.pt;
  if (f.drawnFi !== f.fi || f.drawnAnim !== f.anim) { f.prevBlade = f.drawnAnim === f.anim ? f.curBlade : null; f.drawnFi = f.fi; f.drawnAnim = f.anim; }
  f.curBlade = img.blade;
  for (const g of f.ghosts) { ctx.globalAlpha = g.t * 2; ctx.drawImage(g.img, Math.round(g.x) - OX, Math.round(g.y) - OY); ctx.globalAlpha = 1; }
  if (fr.smear && f.prevBlade) {
    const [a0, a1] = f.prevBlade, [b0, b1] = img.blade;
    ctx.fillStyle = f.anim.startsWith('fin_') ? 'rgba(255,240,210,0.75)' : 'rgba(255,246,220,0.5)'; ctx.beginPath();
    ctx.moveTo(sx - OX + a0[0], sy - OY + a0[1]); ctx.lineTo(sx - OX + a1[0], sy - OY + a1[1]); ctx.lineTo(sx - OX + b1[0], sy - OY + b1[1]); ctx.lineTo(sx - OX + b0[0], sy - OY + b0[1]); ctx.closePath(); ctx.fill();
  }
  let src = img.canvas;
  const white = f.flash > 0, charge = fr.charge && f === pl, furiousNow = f === pl && state.fury > 0;
  if (fr.glow || white || charge || furiousNow) src = tinted(img.canvas, SW, SH, white ? 'rgba(255,255,255,0.85)' : charge ? 'rgba(255,230,180,0.25)' : furiousNow ? 'rgba(200,30,20,0.28)' : `rgba(255,${Math.floor(performance.now() / 70) % 2 ? 190 : 140},60,0.45)`);
  ctx.drawImage(src, sx - OX, sy - OY);
  if (torchLit(f) && f.pt.torT) { const fl = TORCH_FLAME[Math.floor(performance.now() / 90 + f.x) % TORCH_FLAME.length]; ctx.drawImage(fl, sx - OX + f.pt.torT[0] - 3, sy - OY + f.pt.torT[1] - 9); }
}
const TORCH_FLAME = [0, 1, 2, 3, 4].map((i) => flame(6, 10, i * 0.8, 97));
const GROUNDED = new Set(['rug', 'dock', 'steps']);
// The light map: the ambient light (the sun by the hour outdoors; a room or a cave sets its own), with
// every fire, lamp and torch painted in. The scene is multiplied by it, so at night only what is lit
// is seen properly; flames then add a soft glow of their own on top.
const lm = document.createElement('canvas'), lg = lm.getContext('2d');
const rgbOf = (s) => (s.match(/\d+/g) || [205, 178, 150]).map(Number);
function lightsNow(ox, oy) {
  const out = world.lights.map((l) => ({ ...l, x: l.x + ox, y: l.y + oy }));
  for (const f of pl ? [pl, ...actors] : actors) if (torchLit(f) && f.pt?.torT) out.push({ x: Math.round(f.x) - OX + f.pt.torT[0] + ox, y: Math.round(f.y) - OY + f.pt.torT[1] - 4 + oy, r: 78, c: [255, 170, 90], a: 0.42, flicker: 1.6 });
  return out;
}
function drawLight(ox, oy, now) {
  if (lm.width !== W || lm.height !== H) { lm.width = W; lm.height = H; }
  let amb;
  if (world.indoor) amb = rgbOf(world.def.ambient || 'rgb(205,178,150)');
  else { const c = daylight(S.time); amb = [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
  const dark = 1 - (amb[0] + amb[1] + amb[2]) / 765;
  lg.globalCompositeOperation = 'source-over'; lg.fillStyle = `rgb(${amb[0]},${amb[1]},${amb[2]})`; lg.fillRect(0, 0, W, H);
  lg.globalCompositeOperation = 'lighter';
  const lights = lightsNow(ox, oy);
  for (const l of lights) {
    const fl = 1 + (Math.sin(now / 90 * (l.flicker || 1) + l.x) * 0.04 + Math.sin(now / 37 + l.y) * 0.03) * (l.flicker || 1), r = l.r * fl * 1.25;
    if (l.x < -r || l.x > W + r || l.y < -r || l.y > H + r) continue;
    const k = Math.min(1, l.a * 2.4), [cr, cg, cb] = l.c, gr = lg.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
    gr.addColorStop(0, `rgba(${cr},${cg},${cb},${k})`); gr.addColorStop(0.45, `rgba(${cr},${cg},${cb},${k * 0.5})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = gr; lg.fillRect(l.x - r, l.y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(lm, 0, 0);
  if (dark > 0.25) {
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const r = l.r * 0.45; if (l.x < -r || l.x > W + r || l.y < -r || l.y > H + r) continue;
      const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r); gr.addColorStop(0, `rgba(${l.c[0]},${Math.round(l.c[1] * 0.8)},${Math.round(l.c[2] * 0.6)},${0.22 * dark})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
function draw() {
  const now = performance.now();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!world || (!pl && !attract)) return;
  const everyone = pl ? [pl, ...actors] : actors;
  const ox = -Math.round(camX) + Math.round((Math.random() - 0.5) * shake), oy = -Math.round(camY) + Math.round((Math.random() - 0.5) * shake);
  ctx.save(); ctx.translate(ox, oy);
  world.drawGround(ctx, camX, camY, W, H);
  for (const [k, d] of decalChunks) { const cx = Math.floor(k / 1000), cy = k % 1000; if (cx * 256 > camX + W || (cx + 1) * 256 < camX || cy * 256 > camY + H || (cy + 1) * 256 < camY) continue; ctx.drawImage(d.cv, cx * 256, cy * 256); }
  const vis = (x, y, m = 70) => x > camX - m && x < camX + W + m && y > camY - 20 && y < camY + H + 90;
  for (const q of world.props) if (GROUNDED.has(q.k) && vis(q.x, q.y, 140)) ctx.drawImage(q.s.canvas, Math.round(q.x - q.s.ox), Math.round(q.y - q.s.oy));
  ctx.fillStyle = 'rgba(10,8,4,0.32)';
  for (const f of everyone) if (!f.gone && !(f.dead && f.fi > 1) && vis(f.x, f.y)) { ctx.beginPath(); ctx.ellipse(Math.round(f.x), Math.round(f.y), f.beast ? 7 : 9, 3, 0, 0, 2 * Math.PI); ctx.fill(); }
  const items = [];
  for (const q of world.props) {
    if (GROUNDED.has(q.k) || !vis(q.x, q.y, 120)) continue;
    items.push({ y: q.y, draw: () => { const s = q.s.frames ? q.s.frames[Math.floor(now / 110) % q.s.frames.length] : q.s; ctx.drawImage(s.canvas, Math.round(q.x - s.ox), Math.round(q.y - s.oy)); } });
  }
  for (const f of everyone) if (!f.gone && vis(f.x, f.y)) items.push({ y: f.y - (f.dead && f.fi > 2 ? 8 : 0), draw: () => drawFighter(f) });
  for (const q of pieces) items.push({ y: q.y - (q.rest ? 6 : 0), draw: () => { ctx.save(); ctx.translate(Math.round(q.x), Math.round(q.y - q.z)); ctx.rotate(q.rot); ctx.drawImage(q.canvas, -Math.round(q.canvas.width / 2), -Math.round(q.canvas.height / 2)); ctx.restore(); } });
  items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());
  for (const q of particles) { ctx.fillStyle = q.c; ctx.fillRect(Math.round(q.x), Math.round(q.y - q.z), q.big ? 2 : 1, q.big ? 2 : 1); }
  if (state.shock) { const s = state.shock; ctx.strokeStyle = `rgba(255,${Math.round(180 - s.r)},120,${1 - s.r / 110})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(Math.round(s.x), Math.round(s.y - 6), s.r, s.r * 0.7, 0, 0, 2 * Math.PI); ctx.stroke(); }
  for (const e of foes) if (finishable(e) && e.aggro && !fin && Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.3) < 60) { const x = Math.round(e.x) - 3, y = Math.round(e.y) - 70; ctx.fillStyle = '#100a07'; ctx.fillRect(x, y, 7, 7); glyph('F', x + 2, y + 1, Math.floor(now / 200) % 2 ? '#fdd56a' : '#fff2b8'); }
  ctx.restore();
  drawLight(ox, oy, now);
  if (!pl) return;
  // Fury: the world goes red with anger, the edges pulse with his heartbeat.
  if (state.fury > 0 || pl.anim === 'roar') {
    const beat = Math.pow(Math.max(0, Math.sin(now / 1000 * Math.PI * 2.4)), 6), k = Math.min(1, state.fury > 0 ? Math.min(1, state.fury / 1.5) : 0.6);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(255,${Math.round(255 - 120 * k)},${Math.round(255 - 130 * k)})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(150,0,0,${(0.45 + 0.25 * beat) * k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (state.flash > 0) { ctx.fillStyle = `rgba(255,235,210,${state.flash * 3})`; ctx.fillRect(0, 0, W, H); }
  const sf = scene?.view.fade || 0, fa = Math.max(fade.a, sf);
  if (fa > 0.01) { ctx.fillStyle = `rgba(0,0,0,${fa})`; ctx.fillRect(0, 0, W, H); }
  if (letter > 0.01) { const h = Math.round(H * 0.1 * letter); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h); }
}

// ---------- what the menus and the tests use ----------
function questList() {
  const a = quests.tracker().map((q) => ({ ...q, done: false, giver: QDEFS[q.id].giver, main: !!QDEFS[q.id].main }));
  const d = quests.s.done.map((id) => ({ id, title: QDEFS[id].title, text: QDEFS[id].summary || '', objectives: [], done: true, main: !!QDEFS[id].main }));
  return [...a, ...d];
}
function placesSeen() { return (MAPS.maps.coast.places || []).filter((p) => flags.has(`seen:${p.id}`)).map((p) => ({ ...p })); }
function fastTravel(id) {
  const p = (MAPS.maps.coast.places || []).find((x) => x.id === id);
  if (!p || !flags.has(`seen:${id}`) || foes.some((e) => e.aggro)) return false;
  const from = world.id === 'coast' ? [pl.x, pl.y] : [p.x, p.y], hours = Math.hypot(p.x - from[0], p.y - from[1]) / 40 * 20 / 3600 * 3;
  S.time += hours * 3600; dynamic.length = 0;
  enterMap('coast', p.tx ?? p.x, p.ty ?? p.y + 30);
  return true;
}
function wait(hours) { if (foes.some((e) => e.aggro)) { say('You cannot rest with enemies nearby.', 'warn'); return false; } S.time += hours * 3600; pl.hp = pl.maxHp; state.stamina = 100; spawnActors(); return true; }
function questTargets() {
  const out = [];
  for (const q of quests.tracker()) for (const o of QDEFS[q.id].stages.find((s) => s.text === q.text)?.objectives || []) {
    const mk = o.marker; if (!mk) continue;
    const have = q.objectives.find((x) => x.text === o.text);
    if (have && have.have >= have.need) continue;
    if (mk.map === world.id) out.push({ x: mk.x, y: mk.y, title: q.title });
    else if (world.id !== 'coast' && mk.map === 'coast') out.push({ exit: true, title: q.title });
    else if (world.id === 'coast' && MAPS.maps[mk.map]?.from) out.push({ x: MAPS.maps[mk.map].from[0], y: MAPS.maps[mk.map].from[1], title: q.title });
  }
  return out;
}
const HF = {
  ITEMS, SETS, SHIELDS, SKILLS, PERKS, SKILL_NAMES, state, settings, toNext, PERK, chainOf, rank, canTake, takePerk, NOT_HERE,
  get pl() { return pl; }, get foes() { return foes; }, get actors() { return actors; }, get world() { return world; }, get S() { return S; }, get flags() { return flags; }, get quests() { return quests; },
  get convo() { return convo; }, get convoWith() { return convoWith; }, get scene() { return scene; }, get shop() { return shop; },
  icon, equip, useItem, drop, lootFrom, activatable, activate, armourRating, carried, fury, finisher, attack, endConversation, buy, sell, buyPrice, sellPrice, wait, fastTravel, placesSeen, questList, questTargets,
  buysIt: (e) => !!shop && buysIt(shop.npc, e), invest, has, SMITH, recipes, craft, improvement, improve, materialOf, smithTier, toggleTorch, showTitle, variant,
  closeShop: () => { shop = null; }, save, load, newGame, latestSlot, listSaves, clock: () => clockText(S.time), hour: hourNow, keys, nameOf,
  inCombat: () => foes.some((e) => e.aggro && !e.dead),
  target: () => (attacker && !attacker.dead ? attacker : foes.find((e) => e.aggro && !e.dead && Math.hypot(e.x - pl.x, e.y - pl.y) < 70)) || null,
  screenOf: (x, y) => [((x - camX) / W) * 100, ((y - camY) / H) * 100],
  overview: () => world?.overview?.() || WORLDS.get('coast')?.world.overview(), mapSize: () => ({ w: MAPS.maps.coast.w, h: MAPS.maps.coast.h }),
  saveSettings: () => { try { localStorage.setItem('hammerfell.settings', JSON.stringify(settings)); } catch { /* private window */ } },
  skipScene: () => { if (scene) { scene.skip(); scene = null; autosave(); } },
  advanceScene: () => scene?.advance(),
  sheathe: (on) => sheathe(on),
  version: VERSION,
};
window.HF = HF;
// Test hooks (Playwright drives the game through these).
window.__game = Object.assign(HF, {
  ready: true,
  teleport: (x, y) => { pl.x = x; pl.y = y; snapCamera(); },
  go: (m, x, y) => enterMap(m, x, y, false),
  run: (a) => runAction(a),
  setFlag: (f) => { flags.add(f); quests.checkFlags(); world.refresh(flags); },
  hasFlag: (f) => flags.has(f),
  give: (e, n = 1) => take(e, n),
  talkTo: (id) => { const n = actors.find((a) => a.id === id); return n ? !!talk(n, n.yielded && n.def.yieldDialogue ? n.def.yieldDialogue : n.dialogue) : false; },
  choices: () => convo?.choices.map((c) => c.text) ?? [],
  line: () => (convo ? { speaker: convo.current.speaker, text: convo.current.text } : null),
  choose: (i) => { convo?.choose(i); if (convo?.done) endConversation(); },
  use: (id) => { const u = world.uses.find((x) => x.id === id && flagOk(x, flags)); return u ? use(u) : null; },
  actor: (id) => actors.find((a) => a.id === id),
  stagger: (id) => { const e = actors.find((a) => a.id === id); play(e, 'stagger'); e.stagger = 5; e.aggro = true; },
  face: (x, y) => { pl.face = faceOf(x - pl.x, y - pl.y); },
  setTime: (h) => { S.time = Math.floor(S.time / DAY) * DAY + h * 3600; },
  time: () => S.time,
  killAll: () => { for (const e of foes) if (!e.dead) kill(e, pl); },
  pet: (id) => petDog(actors.find((a) => a.id === id)),
  yieldNow: (id) => yieldNow(actors.find((a) => a.id === id)),
  notify: (type, target) => quests.notify({ type, target }),
  encounterNow: () => { encT = 0; },
  shopWith: (id) => openShop(actors.find((a) => a.id === id)),
  dynamic: () => dynamic.length,
  fight: (id, power = false) => { const e = actors.find((a) => a.id === id); pl.face = faceOf(e.x - pl.x, e.y - pl.y); return power ? attack(true) : attack(false); },
});

// ---------- input (the menus take the keyboard while open: ui.js) ----------
addEventListener('keydown', (e) => {
  if (state.paused || e.target.tagName === 'INPUT') return;
  if (e.code === 'F5') { e.preventDefault(); save('quick'); return; }
  if (!pl) return; // the title is up
  if (e.code === 'F9') { e.preventDefault(); load('quick') || load(latestSlot()); return; }
  if (scene && e.code === 'Escape') { HF.skipScene(); e.stopImmediatePropagation(); return; }
  // A line in a cutscene stays up until Space, Enter, E or a click moves it on.
  if (scene && !e.repeat && ['Space', 'Enter', 'NumpadEnter', 'KeyE'].includes(e.code)) { e.preventDefault(); scene.advance(); return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyJ', 'KeyK', 'KeyF', 'KeyQ', 'KeyC', 'ShiftLeft', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat || scene || convo || shop) { keys.add(e.code); return; }
  keys.add(e.code);
  if (!pl?.eq.weapon && (e.code === 'KeyJ' || e.code === 'KeyF')) { if (!pl.dead) say('No weapon in hand: I for your things.', 'warn'); return; }
  if (e.code === 'KeyJ') { if (keys.has('KeyK') || keys.has('mouse2')) { bash(); return; } holdStart = performance.now(); }
  if (e.code === 'KeyF') finisher();
  if (e.code === 'KeyQ') fury();
  if (e.code === 'KeyL') toggleTorch();
  if (e.code === 'KeyR') sheathe();
});
addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'KeyJ' && holdStart !== null) { holdStart = null; attack(false); } });
view.addEventListener('contextmenu', (e) => e.preventDefault());
view.addEventListener('mousedown', (e) => {
  if (scene && e.button === 0 && !state.paused) { scene.advance(); return; }
  if (state.paused || scene || convo || shop || !pl) return;
  if (e.button === 0) { if (!pl.eq.weapon) return; if (keys.has('KeyK') || keys.has('mouse2')) { bash(); return; } holdStart = performance.now(); }
  if (e.button === 2) keys.add('mouse2');
});
addEventListener('mouseup', (e) => { if (e.button === 0 && holdStart !== null) { holdStart = null; attack(false); } if (e.button === 2) keys.delete('mouse2'); });
addEventListener('blur', () => keys.clear());

// ---------- go ----------
let last = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; try { update(dt); draw(); } catch (err) { console.error(err); } requestAnimationFrame(loop); }
requestAnimationFrame(loop);
window.dispatchEvent(new Event('hf-ready'));
