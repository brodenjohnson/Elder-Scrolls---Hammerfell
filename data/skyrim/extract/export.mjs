// Export Skyrim SE game data to data/skyrim/json/, one file per record type.
// Usage: node data/skyrim/extract/export.mjs "<Skyrim Special Edition folder>"
// Reads Skyrim.esm with Update.esm applied over it (the official patch), and the
// English string tables from "Skyrim - Interface.bsa". Numbers only: no models,
// textures or sounds. Field offsets follow UESP's "Skyrim Mod:Mod File Format" pages;
// each decoder notes which fields it reads.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPlugin, sub, subs, zstring, hex } from './esm.mjs';
import { readFromBsa, parseStrings } from './strings.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../json');
const game = process.argv[2] ?? 'C:/Program Files (x86)/Steam/steamapps/common/Skyrim Special Edition';
const DATA = path.join(game, 'Data');
const TYPES = ['WEAP', 'ARMO', 'AMMO', 'PERK', 'RACE', 'NPC_', 'SPEL', 'MGEF', 'LVLI', 'LVLN', 'GMST', 'CLAS', 'KYWD', 'AVIF'];

// ---------- load and merge ----------

const t0 = Date.now();
const base = readPlugin(path.join(DATA, 'Skyrim.esm'), TYPES);
const update = readPlugin(path.join(DATA, 'Update.esm'), TYPES);
const records = new Map(); // formId -> record, Update.esm winning
for (const r of base.records) records.set(r.formId, { ...r, source: 'Skyrim.esm' });
for (const r of update.records) records.set(r.formId, { ...r, source: 'Update.esm' });

// String tables: names (.strings), descriptions (.dlstrings, length-prefixed).
const files = ['skyrim', 'update'].flatMap((p) => [`strings/${p}_english.strings`, `strings/${p}_english.dlstrings`]);
const bsa = readFromBsa(path.join(DATA, 'Skyrim - Interface.bsa'), files);
function parseDl(buf) {
  const count = buf.readUInt32LE(0), baseOff = 8 + count * 8, map = new Map();
  for (let i = 0; i < count; i++) {
    const off = baseOff + buf.readUInt32LE(12 + i * 8), len = buf.readUInt32LE(off);
    map.set(buf.readUInt32LE(8 + i * 8), buf.toString('utf8', off + 4, off + 4 + len).replace(/\0$/, ''));
  }
  return map;
}
const names = { 'Skyrim.esm': parseStrings(bsa['strings/skyrim_english.strings']), 'Update.esm': parseStrings(bsa['strings/update_english.strings']) };
const descs = { 'Skyrim.esm': parseDl(bsa['strings/skyrim_english.dlstrings']), 'Update.esm': parseDl(bsa['strings/update_english.dlstrings']) };
const lstr = (rec, type, table = names) => {
  const d = sub(rec, type);
  if (!d) return null;
  const id = d.readUInt32LE(0);
  return table[rec.source].get(id) ?? table['Skyrim.esm'].get(id) ?? null;
};
const edidOf = new Map();
for (const r of records.values()) { const e = sub(r, 'EDID'); if (e) edidOf.set(r.formId, zstring(e)); }
const ref = (id) => (id ? edidOf.get(id) ?? hex(id) : null);
const keywords = (r) => { const k = sub(r, 'KWDA'); if (!k) return []; const out = []; for (let i = 0; i + 4 <= k.length; i += 4) out.push(ref(k.readUInt32LE(i))); return out; };
const of = (type) => [...records.values()].filter((r) => r.type === type);
const row = (r, fields) => ({ formId: hex(r.formId), edid: edidOf.get(r.formId) ?? null, ...fields, source: r.source, verified: 'export' });
const round = (x, d = 4) => (x === null || x === undefined ? x : Math.round(x * 10 ** d) / 10 ** d);

// Actor values by index (skills are 6 to 23).
const AV = ['Aggression', 'Confidence', 'Energy', 'Morality', 'Mood', 'Assistance', 'OneHanded', 'TwoHanded', 'Archery', 'Block', 'Smithing',
  'HeavyArmor', 'LightArmor', 'Pickpocket', 'Lockpicking', 'Sneak', 'Alchemy', 'Speech', 'Alteration', 'Conjuration', 'Destruction',
  'Illusion', 'Restoration', 'Enchanting', 'Health', 'Magicka', 'Stamina'];
const SKILLS = AV.slice(6, 24);
const av = (i) => (i >= 0 && i < AV.length ? AV[i] : i === -1 || i === 0xffffffff ? null : i);

// ---------- decoders ----------

const ANIM = ['HandToHand', 'OneHandSword', 'OneHandDagger', 'OneHandAxe', 'OneHandMace', 'TwoHandSword', 'TwoHandAxe', 'Bow', 'Staff', 'Crossbow'];
// WEAP: DATA value u32, weight f32, damage u16. DNAM: anim type u8 @0, speed @4, reach @8, flags @12, skill @88, stagger @96.
// CRDT: critical damage u16 @0, critical multiplier @4.
const weapons = of('WEAP').map((r) => {
  const d = sub(r, 'DATA'), n = sub(r, 'DNAM'), c = sub(r, 'CRDT');
  return row(r, {
    name: lstr(r, 'FULL'),
    type: n ? ANIM[n[0]] ?? n[0] : null,
    damage: d?.readUInt16LE(8) ?? null, weight: round(d?.readFloatLE(4)), value: d?.readUInt32LE(0) ?? null,
    speed: round(n?.readFloatLE(4)), reach: round(n?.readFloatLE(8)), stagger: round(n?.readFloatLE(96)),
    skill: n ? av(n.readInt32LE(88)) : null,
    critDamage: c?.readUInt16LE(0) ?? null, critMult: round(c?.readFloatLE(4)),
    enchanted: !!sub(r, 'EITM'), template: ref(sub(r, 'CNAM')?.readUInt32LE(0)), keywords: keywords(r),
  });
});

// ARMO: BOD2 slot mask u32, armour type u32 (0 light, 1 heavy, 2 clothing). DATA value i32, weight f32. DNAM rating x 100.
const ARMOUR_TYPE = ['Light', 'Heavy', 'Clothing'];
const SLOTS = ['Head', 'Hair', 'Body', 'Hands', 'Forearms', 'Amulet', 'Ring', 'Feet', 'Calves', 'Shield', 'Tail', 'LongHair', 'Circlet', 'Ears'];
const armour = of('ARMO').map((r) => {
  const b = sub(r, 'BOD2'), d = sub(r, 'DATA'), n = sub(r, 'DNAM');
  const mask = b?.readUInt32LE(0) ?? 0;
  return row(r, {
    name: lstr(r, 'FULL'),
    armourType: b ? ARMOUR_TYPE[b.readUInt32LE(4)] ?? b.readUInt32LE(4) : null,
    slots: SLOTS.filter((_, i) => mask & (1 << i)),
    rating: n ? round(n.readInt32LE(0) / 100, 2) : null, weight: round(d?.readFloatLE(4)), value: d?.readInt32LE(0) ?? null,
    enchanted: !!sub(r, 'EITM'), template: ref(sub(r, 'TNAM')?.readUInt32LE(0)), race: ref(sub(r, 'RNAM')?.readUInt32LE(0)), keywords: keywords(r),
  });
});

// AMMO: DATA projectile u32, flags u32, damage f32, value u32 (SSE layout), weight f32 when present.
const ammo = of('AMMO').map((r) => {
  const d = sub(r, 'DATA');
  return row(r, {
    name: lstr(r, 'FULL'), damage: round(d?.readFloatLE(8)), value: d?.readUInt32LE(12) ?? null,
    weight: d && d.length >= 20 ? round(d.readFloatLE(16)) : null, keywords: keywords(r),
  });
});

// GMST: value type from the editor id prefix (f float, i int, b bool, s string).
const gameSettings = of('GMST').map((r) => {
  const e = edidOf.get(r.formId) ?? '', d = sub(r, 'DATA');
  let value = null;
  if (d) {
    if (e[0] === 'f') value = round(d.readFloatLE(0), 6);
    else if (e[0] === 'i' || e[0] === 'u') value = d.readInt32LE(0);
    else if (e[0] === 'b') value = d.readUInt32LE(0) !== 0;
    else if (e[0] === 's') value = names[r.source].get(d.readUInt32LE(0)) ?? names['Skyrim.esm'].get(d.readUInt32LE(0)) ?? null;
  }
  return row(r, { value });
});

// RACE DATA: skill boosts 7 x (skill u8, boost u8), heights and weights @16-28, flags @32,
// starting health/magicka/stamina @36/40/44, carry weight @48, regen rates @84/88/92, unarmed damage @96, reach @100.
const races = of('RACE').map((r) => {
  const d = sub(r, 'DATA');
  if (!d) return row(r, { name: lstr(r, 'FULL') });
  const boosts = [];
  for (let i = 0; i < 7; i++) { const s = d[i * 2], v = d[i * 2 + 1]; if (s !== 255 && v) boosts.push({ skill: av(s), boost: v }); }
  return row(r, {
    name: lstr(r, 'FULL'), playable: (d.readUInt32LE(32) & 1) === 1,
    skillBoosts: boosts,
    height: { male: round(d.readFloatLE(16)), female: round(d.readFloatLE(20)) },
    startingHealth: round(d.readFloatLE(36)), startingMagicka: round(d.readFloatLE(40)), startingStamina: round(d.readFloatLE(44)),
    carryWeight: round(d.readFloatLE(48)),
    regen: { health: round(d.readFloatLE(84)), magicka: round(d.readFloatLE(88)), stamina: round(d.readFloatLE(92)) },
    unarmedDamage: round(d.readFloatLE(96)), unarmedReach: round(d.readFloatLE(100)),
    spells: subs(r, 'SPLO').map((s) => ref(s.readUInt32LE(0))),
    keywords: keywords(r),
  });
});

// CLAS DATA: teaches skill i8 @4, max training u8 @5, 18 skill weights @6, bleedout @24, health/magicka/stamina weights @32-34.
const classes = of('CLAS').map((r) => {
  const d = sub(r, 'DATA');
  if (!d) return row(r, { name: lstr(r, 'FULL') });
  const weights = {}; SKILLS.forEach((s, i) => { weights[s] = d[6 + i]; });
  return row(r, { name: lstr(r, 'FULL'), skillWeights: weights, levelUpWeights: { health: d[32], magicka: d[33], stamina: d[34] } });
});

// NPC_ ACBS: flags u32, magicka offset i16 @4, stamina offset @6, level i16 @8 (x1000 when it is a
// PC level multiplier, flag 0x80), calc min/max @10/12, speed mult @14, health offset i16 @20.
// DNAM: 18 skill values, 18 skill offsets, then health/magicka/stamina u16 @36/38/40.
const npcs = of('NPC_').map((r) => {
  const a = sub(r, 'ACBS'), d = sub(r, 'DNAM');
  const flags = a?.readUInt32LE(0) ?? 0, pcMult = (flags & 0x80) !== 0;
  const skills = {};
  if (d) SKILLS.forEach((s, i) => { skills[s] = d[i]; });
  return row(r, {
    name: lstr(r, 'FULL'),
    race: ref(sub(r, 'RNAM')?.readUInt32LE(0)), class: ref(sub(r, 'CNAM')?.readUInt32LE(0)), template: ref(sub(r, 'TPLT')?.readUInt32LE(0)),
    level: a ? (pcMult ? { pcLevelMult: a.readInt16LE(8) / 1000 } : a.readInt16LE(8)) : null,
    calcLevel: a ? { min: a.readUInt16LE(10), max: a.readUInt16LE(12) } : null,
    unique: (flags & 0x20) !== 0, essential: (flags & 0x2) !== 0, autoCalc: (flags & 0x10) !== 0,
    offsets: a ? { health: a.readInt16LE(20), magicka: a.readInt16LE(4), stamina: a.readInt16LE(6) } : null,
    base: d ? { health: d.readUInt16LE(36), magicka: d.readUInt16LE(38), stamina: d.readUInt16LE(40) } : null,
    skills: d ? skills : null,
    speedMult: a?.readUInt16LE(14) ?? null,
    spells: subs(r, 'SPLO').map((s) => ref(s.readUInt32LE(0))),
    perks: subs(r, 'PRKR').map((s) => ref(s.readUInt32LE(0))),
    keywords: keywords(r),
  });
});

// MGEF DATA: flags @0, base cost @4, magic skill i32 @12, archetype u32 @64, actor value i32 @68.
const ARCHETYPE = { 0: 'ValueModifier', 1: 'Script', 2: 'Dispel', 3: 'CureDisease', 4: 'Absorb', 5: 'DualValueModifier', 6: 'Calm', 7: 'Demoralize', 8: 'Frenzy', 9: 'Disarm', 10: 'CommandSummoned', 11: 'Invisibility', 12: 'Light', 15: 'Lock', 16: 'Open', 17: 'BoundWeapon', 18: 'SummonCreature', 19: 'DetectLife', 20: 'Telekinesis', 21: 'Paralysis', 22: 'Reanimate', 23: 'SoulTrap', 24: 'TurnUndead', 25: 'Guide', 27: 'CureParalysis', 28: 'CureAddiction', 29: 'CurePoison', 30: 'Concussion', 32: 'Stagger', 34: 'PeakValueModifier', 35: 'Cloak', 36: 'Werewolf', 37: 'SlowTime', 38: 'Rally', 39: 'EnhanceWeapon', 40: 'SpawnHazard', 41: 'Etherealize', 42: 'Banish', 44: 'Disguise', 45: 'GrabActor', 46: 'VampireLord' };
const magicEffects = of('MGEF').map((r) => {
  const d = sub(r, 'DATA');
  return row(r, {
    name: lstr(r, 'FULL'), baseCost: round(d?.readFloatLE(4)), skill: d ? av(d.readInt32LE(12)) : null,
    archetype: d ? ARCHETYPE[d.readUInt32LE(64)] ?? d.readUInt32LE(64) : null, actorValue: d ? av(d.readInt32LE(68)) : null,
    description: lstr(r, 'DNAM', descs), keywords: keywords(r),
  });
});

// SPEL SPIT: cost u32 @0, flags @4, type u32 @8, charge time @12, cast type @16, delivery @20.
// Effects: EFID (magic effect) followed by EFIT (magnitude f32, area u32, duration u32).
const SPELL_TYPE = ['Spell', 'Disease', 'Power', 'LesserPower', 'Ability', 'Poison', 'Enchantment', 'Potion', 'Wortcraft', 'Leveled', 'Addiction', 'Voice', 'StaffEnchantment', 'Scroll'];
const DELIVERY = ['Self', 'Touch', 'Aimed', 'TargetActor', 'TargetLocation'];
const spells = of('SPEL').map((r) => {
  const s = sub(r, 'SPIT');
  const effects = [];
  r.subs.forEach((x, i) => {
    if (x.type !== 'EFID') return;
    const e = r.subs[i + 1]?.type === 'EFIT' ? r.subs[i + 1].data : null;
    effects.push({ effect: ref(x.data.readUInt32LE(0)), magnitude: round(e?.readFloatLE(0)), area: e?.readUInt32LE(4) ?? null, duration: e?.readUInt32LE(8) ?? null });
  });
  return row(r, {
    name: lstr(r, 'FULL'), cost: s?.readUInt32LE(0) ?? null, type: s ? SPELL_TYPE[s.readUInt32LE(8)] ?? s.readUInt32LE(8) : null,
    chargeTime: round(s?.readFloatLE(12)), delivery: s ? DELIVERY[s.readUInt32LE(20)] ?? s.readUInt32LE(20) : null, effects,
  });
});

// Condition functions this export names (others are kept as numbers).
const CONDITION = { 277: 'GetBaseActorValue', 448: 'HasPerk', 560: 'HasKeyword', 599: 'WornHasKeyword', 72: 'GetIsID', 682: 'WornApparelHasKeywordCount' };
const OPS = ['==', '!=', '>', '>=', '<', '<='];
// CTDA: type u8 (operator in the top 3 bits, 0x01 = OR with the next), value f32 @4,
// function u16 @8, parameter 1 u32 @12. GetBaseActorValue's parameter is an actor value index.
const condition = (c) => {
  const fn = c.readUInt16LE(8), p1 = c.readUInt32LE(12);
  return {
    fn: CONDITION[fn] ?? fn, op: OPS[c[0] >> 5], or: (c[0] & 1) === 1, value: round(c.readFloatLE(4)),
    param: fn === 277 ? av(p1) : ref(p1),
  };
};
// Perk entry points by index (UESP "Skyrim:Perk Entry Point"); function 1 set, 2 add, 3 multiply...
const ENTRY = ['CalculateWeaponDamage', 'CalculateMyCriticalHitChance', 'CalculateMyCriticalHitDamage', 'CalculateMineExplodeChance', 'AdjustLimbDamage',
  'AdjustBookSkillPoints', 'ModRecoveredHealth', 'GetShouldAttack', 'ModBuyPrices', 'AddLeveledListOnDeath', 'GetMaxCarryWeight', 'ModAddictionChance',
  'ModAddictionDuration', 'ModPositiveChemDuration', 'Activate', 'IgnoreRunningDuringDetection', 'IgnoreBrokenLock', 'ModEnemyCriticalHitChance',
  'ModSneakAttackMult', 'ModMaxPlaceableMines', 'ModBowZoom', 'ModRecoverArrowChance', 'ModSkillUse', 'ModTelekinesisDistance',
  'ModTelekinesisDamageMult', 'ModTelekinesisDamage', 'ModBashingDamage', 'ModPowerAttackStamina', 'ModPowerAttackDamage', 'ModSpellMagnitude',
  'ModSpellDuration', 'ModSecondaryValueWeight', 'ModArmorWeight', 'ModIncomingStagger', 'ModTargetStagger', 'ModAttackDamage', 'ModIncomingDamage',
  'ModTargetDamageResistance', 'ModSpellCost', 'ModPercentBlocked', 'ModShieldDeflectArrowChance', 'ModIncomingSpellMagnitude',
  'ModIncomingSpellDuration', 'ModPlayerIntimidation', 'ModPlayerReputation', 'ModFavorPoints', 'ModBribeAmount', 'ModDetectionLight',
  'ModDetectionMovement', 'ModSoulGemRecharge', 'SetSweepAttack', 'ApplyCombatHitSpell', 'ApplyBashingSpell', 'ApplyReanimateSpell',
  'SetBooleanGraphVariable', 'ModSpellCastingSoundEvent', 'ModPickpocketChance', 'ModDetectionSneakSkill', 'ModFallingDamage',
  'ModLockpickSweetSpot', 'ModSellPrices', 'CanPickpocketEquippedItem', 'SetLockpickStartingArc', 'SetProgressionPicking', 'Unknown64', // 64: not named on UESP; checked by perk indices around it
  'MakeLockpicksUnbreakable', 'ModAlchemyEffectiveness', 'ApplyWeaponSwingSpell', 'ModCommandedActorLimit', 'ApplySneakingSpell',
  'ModPlayerMagicSlowdown', 'ModWardMagickaAbsorptionPct', 'ModInitialIngredientEffectsLearned', 'PurifyAlchemyIngredients',
  'FilterActivation', 'CanDualCastSpell', 'ModTemperingHealth', 'ModEnchantmentPower', 'ModSoulPctCapturedToWeapon',
  'ModSoulGemEnchanting', 'ModAppliedEnchantmentsAllowed', 'SetActivateLabel', 'ModShoutOK', 'ModPoisonDoseCount', 'ShouldApplyPlacedItem',
  'ModArmorRating', 'ModLockpickingCrimeChance', 'ModIngredientsHarvested', 'ModSpellRange', 'ModPotionsCreated',
  'ModLockpickingKeyRewardChance', 'AllowMountActor'];
const FUNCTION = { 1: 'set', 2: 'add', 3: 'multiply', 4: 'addRange', 5: 'addActorValueMult', 6: 'absolute', 7: 'negativeAbsolute', 8: 'addLeveledList',
  9: 'addActivateChoice', 10: 'selectSpell', 11: 'selectText', 12: 'setToActorValueMult', 13: 'multiplyActorValueMult', 14: 'multiplyOnePlusActorValueMult', 15: 'setText' };

// PERK: name, description, DATA (trait, level, ranks, playable, hidden), next rank (NNAM),
// requirements from the conditions before the first PRKE, then effects: each PRKE
// (type 0 quest, 1 ability, 2 entry point) with its DATA, conditions, EPFT and EPFD.
const perks = of('PERK').map((r) => {
  const d = sub(r, 'DATA');
  const conditions = [], effects = [];
  let cur = null;
  for (const x of r.subs) {
    if (x.type === 'PRKE') { cur = { type: ['quest', 'ability', 'entryPoint'][x.data[0]] ?? x.data[0], rank: x.data[1], conditions: [] }; effects.push(cur); continue; }
    if (!cur) { if (x.type === 'CTDA') conditions.push(condition(x.data)); continue; }
    if (x.type === 'DATA') {
      if (cur.type === 'entryPoint') { cur.entryIndex = x.data[0]; cur.entryPoint = ENTRY[x.data[0]] ?? x.data[0]; cur.function = FUNCTION[x.data[1]] ?? x.data[1]; }
      else if (cur.type === 'ability') cur.spell = ref(x.data.readUInt32LE(0));
      else cur.quest = ref(x.data.readUInt32LE(0));
    } else if (x.type === 'CTDA') cur.conditions.push(condition(x.data));
    else if (x.type === 'EPFT') cur.paramType = x.data[0];
    else if (x.type === 'EPFD') {
      if (cur.paramType === 1 || cur.paramType === 2) { cur.value = round(x.data.readFloatLE(0)); if (x.data.length >= 8) cur.value2 = round(x.data.readFloatLE(4)); }
      else if (x.data.length >= 4) cur.ref = ref(x.data.readUInt32LE(0));
    } else if (x.type === 'PRKF') cur = null;
  }
  const requires = conditions.filter((c) => c.fn === 'HasPerk' && c.value === 1).map((c) => c.param);
  const skillReq = conditions.filter((c) => c.fn === 'GetBaseActorValue').map((c) => ({ skill: c.param, level: c.value }));
  return row(r, {
    name: lstr(r, 'FULL'), description: lstr(r, 'DESC', descs),
    playable: d ? d[3] === 1 : null, hidden: d ? d[4] === 1 : null, ranks: d ? d[2] : null,
    nextPerk: ref(sub(r, 'NNAM')?.readUInt32LE(0)),
    requires, skillReq, conditions, effects,
  });
});

// AVIF (skills): AVSK use mult, use offset, improve mult, improve offset; the perk tree's perks (PNAM).
const SKILL_AVIF = { AVOneHanded: 'OneHanded', AVTwoHanded: 'TwoHanded', AVMarksman: 'Archery', AVBlock: 'Block', AVSmithing: 'Smithing',
  AVHeavyArmor: 'HeavyArmor', AVLightArmor: 'LightArmor', AVPickpocket: 'Pickpocket', AVLockpicking: 'Lockpicking', AVSneak: 'Sneak',
  AVAlchemy: 'Alchemy', AVSpeechcraft: 'Speech', AVAlteration: 'Alteration', AVConjuration: 'Conjuration', AVDestruction: 'Destruction',
  AVMysticism: 'Illusion', AVRestoration: 'Restoration', AVEnchanting: 'Enchanting' };
const skills = of('AVIF').filter((r) => SKILL_AVIF[edidOf.get(r.formId)]).map((r) => {
  const k = sub(r, 'AVSK');
  return row(r, {
    skill: SKILL_AVIF[edidOf.get(r.formId)], name: lstr(r, 'FULL'), description: lstr(r, 'DESC', descs),
    useMult: round(k?.readFloatLE(0)), useOffset: round(k?.readFloatLE(4)), improveMult: round(k?.readFloatLE(8)), improveOffset: round(k?.readFloatLE(12)),
    perks: [...new Set(subs(r, 'PNAM').map((x) => ref(x.readUInt32LE(0))).filter((e) => e && !/^0+$/.test(e)))],
  });
});

// LVLI / LVLN: LVLD chance none u8, LVLF flags u8, LVLO entries (level u16, ref u32 @4, count u16 @8).
const leveled = (type) => of(type).map((r) => row(r, {
  chanceNone: sub(r, 'LVLD')?.[0] ?? 0, flags: sub(r, 'LVLF')?.[0] ?? 0,
  entries: subs(r, 'LVLO').map((e) => ({ level: e.readUInt16LE(0), ref: ref(e.readUInt32LE(4)), count: e.readUInt16LE(8) })),
}));

// ---------- write ----------

fs.mkdirSync(OUT, { recursive: true });
const sets = {
  weapons, armour, ammo, perks, skills, races, classes, npcs, spells, magicEffects,
  leveledItems: leveled('LVLI'), leveledNpcs: leveled('LVLN'), gameSettings,
};
for (const [name, rows] of Object.entries(sets)) {
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(rows, null, 1));
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
  exported: new Date().toISOString().slice(0, 10),
  from: ['Skyrim.esm', 'Update.esm (applied over it)', 'Skyrim - Interface.bsa (English strings)'],
  counts: Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.length])),
  note: 'Numbers exported from Broden\'s own copy of Skyrim Special Edition for personal use. Do not publish.',
}, null, 2));
console.log(`exported in ${Date.now() - t0} ms:`, Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.length])));
