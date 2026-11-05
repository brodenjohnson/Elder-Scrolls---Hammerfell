import type { ArmourDef, GameData, PerkDef, SkillId, WeaponDef } from './data';

// The player character: skills that level by use (Skyrim's curves), player levels
// from skill ranks, perk points, Health and Stamina (no Magicka: bible section 9),
// and an inventory with equipment. Plain data plus rules, so saves are simple.

export type CharacterState = {
  race: string;
  level: number; xp: number;
  skills: Record<SkillId, { level: number; xp: number }>;
  perks: string[]; perkPoints: number;
  pendingLevelUps: number;          // each one is a Health-or-Stamina choice (bible section 9)
  baseHealth: number; baseStamina: number;
  inventory: Record<string, number>; // edid -> count
  equipped: { mainHand: string | null; body: string | null; hands: string | null; feet: string | null; head: string | null; shield: string | null };
};

export const SKILL_START = 15;   // Skyrim: every skill starts at 15, plus the race's boosts
const SKILL_CAP = 100;

export function newCharacter(data: GameData, race = 'RedguardRace'): CharacterState {
  const r = data.races.get(race)!;
  const skills = Object.fromEntries(data.skills.map((s) => [s.skill, { level: SKILL_START + (r.skillBoosts.find((b) => b.skill === s.skill)?.boost ?? 0), xp: 0 }])) as CharacterState['skills'];
  return {
    race, level: 1, xp: 0, skills, perks: [], perkPoints: 0, pendingLevelUps: 0,
    baseHealth: 100, baseStamina: 100, // bible: Health 100 and Stamina 100 for every race
    inventory: { ClothesFarmClothes01: 1, ClothesFarmBoots01: 1 },
    equipped: { mainHand: null, body: 'ClothesFarmClothes01', hands: null, feet: 'ClothesFarmBoots01', head: null, shield: null },
  };
}

export class Character {
  constructor(readonly data: GameData, public s: CharacterState) {}
  private def(skill: SkillId) { return this.data.skills.find((d) => d.skill === skill)!; }
  private get set() { return this.data.settings; }

  // Skill XP to go from `level` to the next: improveMult x level^fSkillUseCurve + improveOffset.
  skillXpToNext(skill: SkillId, level = this.s.skills[skill].level) {
    const d = this.def(skill);
    return d.improveMult * Math.pow(level, this.set.fSkillUseCurve) + d.improveOffset;
  }
  // Player XP to go from `level` to the next: fXPLevelUpBase + fXPLevelUpMult x level.
  xpToNext(level = this.s.level) { return this.set.fXPLevelUpBase + this.set.fXPLevelUpMult * level; }

  // Use a skill: `amount` is the game's base use value for the action (a hit, a
  // lock, a sale...), turned into skill XP by the skill's use multiplier and offset.
  // Returns the skill levels gained.
  useSkill(skill: SkillId, amount: number): number {
    const d = this.def(skill), sk = this.s.skills[skill];
    if (sk.level >= SKILL_CAP) return 0;
    const mult = this.perkValue('ModSkillUse', 1, []);
    sk.xp += (amount * d.useMult + d.useOffset) * mult;
    let gained = 0;
    while (sk.level < SKILL_CAP && sk.xp >= this.skillXpToNext(skill)) {
      sk.xp -= this.skillXpToNext(skill);
      sk.level++; gained++;
      // Each skill rank feeds player XP equal to the new skill level (fXPPerSkillRank, Skyrim default 1).
      this.gainXp(sk.level * (this.set.fXPPerSkillRank ?? 1));
    }
    return gained;
  }
  private gainXp(n: number) {
    this.s.xp += n;
    while (this.s.xp >= this.xpToNext()) {
      this.s.xp -= this.xpToNext();
      this.s.level++; this.s.perkPoints++; this.s.pendingLevelUps++;
    }
  }
  // Spend a level-up on Health or Stamina (+10 each, Skyrim's iAVDhmsLevelUp).
  chooseLevelUp(stat: 'health' | 'stamina') {
    if (this.s.pendingLevelUps <= 0) return false;
    this.s.pendingLevelUps--;
    if (stat === 'health') this.s.baseHealth += this.set.iAVDhmsLevelUp; else this.s.baseStamina += this.set.iAVDhmsLevelUp;
    return true;
  }

  // ---------- perks ----------

  canTake(edid: string): { ok: boolean; why?: string } {
    const p = this.data.perks.get(edid);
    if (!p) return { ok: false, why: 'unknown perk' };
    if (this.s.perks.includes(edid)) return { ok: false, why: 'already taken' };
    if (this.s.perkPoints <= 0) return { ok: false, why: 'no perk points' };
    for (const r of p.skillReq) if ((this.s.skills[r.skill as SkillId]?.level ?? 0) < r.level) return { ok: false, why: `needs ${r.skill} ${r.level}` };
    for (const r of p.requires) if (!this.s.perks.includes(r)) return { ok: false, why: `needs ${this.data.perks.get(r)?.name ?? r}` };
    return { ok: true };
  }
  takePerk(edid: string) {
    const c = this.canTake(edid);
    if (!c.ok) return c;
    this.s.perks.push(edid); this.s.perkPoints--;
    return c;
  }
  // The perks whose effects count: for a chain of ranks, only the highest owned rank
  // (Skyrim gates each rank on "does not have the next rank").
  private activePerks(): PerkDef[] {
    const owned = new Set(this.s.perks);
    return this.s.perks.map((e) => this.data.perks.get(e)!).filter((p) => !(p.nextPerk && owned.has(p.nextPerk)));
  }
  // Apply every active perk effect for an entry point to a base value. An effect with
  // keywords applies when any of them is among `keywords` (the weapon's or armour's).
  perkValue(entryPoint: string, base: number, keywords: string[]): number {
    let v = base;
    for (const p of this.activePerks()) for (const e of p.effects) {
      if (e.entryPoint !== entryPoint || e.value === undefined) continue;
      if (e.keywords.length && !e.keywords.some((k) => keywords.includes(k))) continue;
      if (e.function === 'multiply') v *= e.value; else if (e.function === 'add') v += e.value; else if (e.function === 'set') v = e.value;
    }
    return v;
  }

  // ---------- inventory and equipment ----------

  give(edid: string, n = 1) { this.s.inventory[edid] = (this.s.inventory[edid] ?? 0) + n; }
  weapon(): WeaponDef | null { return this.s.equipped.mainHand ? this.data.weapons.get(this.s.equipped.mainHand) ?? null : null; }
  armourPieces(): ArmourDef[] {
    return (['body', 'hands', 'feet', 'head', 'shield'] as const).map((k) => this.s.equipped[k]).filter((e): e is string => !!e).map((e) => this.data.armour.get(e)).filter((a): a is ArmourDef => !!a);
  }
  // Equip by editor id; armour goes to the slot its record names.
  equip(edid: string): boolean {
    if (!this.s.inventory[edid]) return false;
    if (this.data.weapons.has(edid)) { this.s.equipped.mainHand = edid; return true; }
    const a = this.data.armour.get(edid);
    if (!a) return false;
    const slot = a.slots.includes('Body') ? 'body' : a.slots.includes('Hands') ? 'hands' : a.slots.includes('Feet') ? 'feet' : a.slots.includes('Shield') ? 'shield' : a.slots.includes('Head') || a.slots.includes('Hair') ? 'head' : null;
    if (!slot) return false;
    this.s.equipped[slot] = edid;
    return true;
  }
  unequip(slot: keyof CharacterState['equipped']) { this.s.equipped[slot] = null; }

  // Armour rating as the inventory shows it. Each piece's base rating is raised by
  // its armour skill (Skyrim: x (1 + 0.4 x (skill + 15) / 100), PROPOSED until checked
  // in game), then by perks such as Juggernaut and Agile Defender.
  armourRating(): number {
    let total = 0;
    for (const a of this.armourPieces()) {
      if (a.armourType === 'Clothing') continue;
      const skill = this.s.skills[a.armourType === 'Heavy' ? 'HeavyArmor' : 'LightArmor'].level;
      total += this.perkValue('ModArmorRating', a.rating * (1 + (0.4 * (skill + 15)) / 100), a.keywords);
    }
    return Math.round(total);
  }
  carried(): number {
    let w = 0;
    for (const [e, n] of Object.entries(this.s.inventory)) w += n * (this.data.weapons.get(e)?.weight ?? this.data.armour.get(e)?.weight ?? this.data.items[e]?.weight ?? 0);
    return +w.toFixed(1);
  }
  get maxHealth() { return this.s.baseHealth; }
  get maxStamina() { return this.s.baseStamina; }
}
