// Build the game's data pack (public/data/game/) from the Skyrim export.
// Only what the game uses: the player's 12 skills and their perk trees, playable
// unenchanted weapons and armour, the races, and the game settings the rules read.
// Usage: npm run data   (after node data/skyrim/extract/export.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const game = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.resolve(game, '../data/skyrim/json');
const out = path.join(game, 'public/data/game');
const load = (n) => JSON.parse(fs.readFileSync(path.join(src, `${n}.json`), 'utf8'));
fs.mkdirSync(out, { recursive: true });
const write = (n, v) => fs.writeFileSync(path.join(out, `${n}.json`), JSON.stringify(v));

// Bible section 9: twelve skills, the magic schools and Enchanting removed.
const SKILLS = ['OneHanded', 'TwoHanded', 'Archery', 'Block', 'Smithing', 'HeavyArmor', 'LightArmor', 'Pickpocket', 'Lockpicking', 'Sneak', 'Alchemy', 'Speech'];
const skills = load('skills').filter((s) => SKILLS.includes(s.skill))
  .map(({ skill, name, description, useMult, useOffset, improveMult, improveOffset, perks }) => ({ skill, name, description, useMult, useOffset, improveMult, improveOffset, perks }))
  .sort((a, b) => SKILLS.indexOf(a.skill) - SKILLS.indexOf(b.skill));

// Every rank of every perk in those trees (ranks chain through nextPerk).
const allPerks = load('perks');
const byEdid = new Map(allPerks.map((p) => [p.edid, p]));
const wanted = new Set();
for (const s of skills) for (const e of s.perks) for (let p = byEdid.get(e); p && !wanted.has(p.edid); p = byEdid.get(p.nextPerk)) wanted.add(p.edid);
const tree = new Map(); for (const s of skills) for (const e of s.perks) for (let p = byEdid.get(e), k = 0; p && k < 6; p = byEdid.get(p.nextPerk), k++) tree.set(p.edid, s.skill);
const perks = [...wanted].map((e) => byEdid.get(e)).map((p) => ({
  edid: p.edid, name: p.name, description: p.description, skill: tree.get(p.edid), skillReq: p.skillReq, requires: p.requires, nextPerk: p.nextPerk,
  effects: p.effects.filter((x) => x.type === 'entryPoint').map((x) => ({
    entryPoint: x.entryPoint, function: x.function, value: x.value,
    // Keyword conditions say which weapons or armour the effect applies to; HasPerk(next rank) == 0 stops ranks stacking.
    keywords: x.conditions.filter((c) => c.fn === 'HasKeyword' || c.fn === 'WornHasKeyword').map((c) => c.param),
  })),
  abilities: p.effects.filter((x) => x.type === 'ability').map((x) => x.spell),
}));

const plain = (r) => r.name && !r.enchanted && !r.template && r.value > 0 && !/dragon|daedric artifact/i.test(r.name);
const weapons = load('weapons').filter(plain).filter((w) => w.type && w.type !== 'Staff')
  .map(({ edid, name, type, damage, weight, value, speed, reach, stagger, skill, keywords }) => ({ edid, name, type, damage, weight, value, speed, reach, stagger, skill, keywords }));
const armour = load('armour').filter(plain).filter((a) => a.race === 'DefaultRace' || !a.race)
  .map(({ edid, name, armourType, slots, rating, weight, value, keywords }) => ({ edid, name, armourType, slots, rating, weight, value, keywords }));

const SETTINGS = ['fXPLevelUpBase', 'fXPLevelUpMult', 'fXPPerSkillRank', 'fSkillUseCurve', 'iAVDhmsLevelUp', 'fLevelUpCarryWeightMod',
  'fArmorScalingFactor', 'fMaxArmorRating', 'fPowerAttackDefaultBonus', 'fBlockWeaponBase', 'fBlockWeaponScaling', 'fBlockSkillMult', 'fBlockMax',
  'fBlockPowerAttackMult', 'fStaminaBlockDmgMult', 'fStaminaAttackWeaponBase', 'fStaminaAttackWeaponMult', 'fSprintStaminaDrainMult', 'fDiffMultHPToPCL'];
const gm = load('gameSettings');
const settings = Object.fromEntries(SETTINGS.map((e) => [e, gm.find((g) => g.edid === e)?.value]));

const races = load('races').filter((r) => r.playable && !/Vampire|Child/.test(r.edid))
  .map(({ edid, name, skillBoosts, startingHealth, startingStamina, carryWeight, regen, unarmedDamage }) => ({ edid, name, skillBoosts, startingHealth, startingStamina, carryWeight, regen, unarmedDamage }));

// Enemy templates: Skyrim's own NPC records (level, base health and stamina, combat skills).
// The name and fighting style (how the AI behaves, see combat.ts STYLES) are ours.
const ACTORS = {
  bandit1H: { edid: 'EncBandit01Melee1HTankRedguardM', name: 'Bandit', style: 'tank' },
  bandit2H: { edid: 'EncBandit01Melee2HBerserkNordM', name: 'Bandit marauder', style: 'berserker' },
  alikr: { edid: 'EncAlikr02Melee1HRedguardM01', name: "Alik'r warrior", style: 'duelist' },
};
const npcs = load('npcs');
const actors = Object.fromEntries(Object.entries(ACTORS).map(([id, { edid, name, style }]) => {
  const n = npcs.find((x) => x.edid === edid);
  const skills = Object.fromEntries(['OneHanded', 'TwoHanded', 'Block', 'LightArmor', 'HeavyArmor'].map((k) => [k, n.skills[k]]));
  return [id, { edid, name, style, level: n.level, health: n.base.health, stamina: n.base.stamina, skills }];
}));
write('actors', actors);
write('skills', skills); write('perks', perks); write('weapons', weapons); write('armour', armour); write('settings', settings); write('races', races);
console.log(`data: ${skills.length} skills, ${perks.length} perk ranks, ${weapons.length} weapons, ${armour.length} armour, ${races.length} races`);
console.log(settings);
