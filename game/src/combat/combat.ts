import type { Character } from '../systems/character';
import type { GameData, WeaponDef } from '../systems/data';
import { facingOf, toGround, toScreen, FACINGS, type Facing } from '../render/iso';

// Melee combat (bible section 11), ported from the Phase 0 arena into the world.
// Damage, armour, blocking and stamina use Skyrim's numbers (the data pack) and the
// player's real skills, perks and gear; the dodge and parry timings are the bible's.

export const TIMING = {
  rollSeconds: 8 / 14, rollInvulnerable: 0.25, perfectDodgeWindow: 0.15,
  slowMotionSeconds: 1.0, slowMotionScale: 0.35, parryWindow: 0.2,
  quickFps: 14, powerFps: 8, hitFrame: 3, powerHoldSeconds: 0.3,
  hitSeconds: 3 / 12, parriedSeconds: 1.2, deathFps: 10,
};
export const COSTS = { quickAttack: 10, roll: 20 }; // ours: Skyrim does not charge for these

// Wounds (SYSTEMS_SPEC section 4). A serious hit is one of 30 percent of max Health or more:
// it bleeds 1 Health a second for 10 s, and if it lands on the legs (a quarter of hits) it
// leaves a limp, 25 percent slower, until bandaged or a game day passes (72 real minutes
// at Skyrim's timescale of 20).
export const WOUNDS = { serious: 0.3, bleedPerSecond: 1, bleedSeconds: 10, legChance: 0.25, limpSpeed: 0.75, limpSeconds: (24 * 3600) / 20 };

// Rage and Fury (SYSTEMS_SPEC section 5).
export const RAGE = { perPercentTaken: 1, perFivePercentDealt: 1, kill: 3, finisher: 10, decayPerSecond: 1, calmBeforeDecay: 10, exhaustionSeconds: 30, furyBlock: 0.5 };
export type FuryId = 'burst' | 'sweep' | 'execution' | 'berserk';
export const FURY: Record<FuryId, { name: string; cost: number; seconds: number }> = {
  burst: { name: 'Pain-ignoring burst', cost: 30, seconds: 8 },     // ignores flinch, +15 percent damage resistance
  sweep: { name: 'Cleaving sweep', cost: 40, seconds: 0 },          // 270 degrees, power damage x1.5 to all in reach
  execution: { name: 'Execution', cost: 50, seconds: 0 },           // a finisher on anyone in reach, no stagger needed
  berserk: { name: 'Berserk', cost: 60, seconds: 12 },              // double damage dealt, half taken, Exhaustion doubled
};

// Dismemberment (bible 11.3): power killing blows only, always on finishers.
export const GORE = { base: 0.25, twoHanded: 0.15, axe: 0.1, heavyArmour: -0.1 };
// Body parts by the art rig's segments; a severed part is left out of the body's frames
// and thrown as its own sprite. Where a blow takes something, the head is likeliest.
export const PARTS: Record<string, string[]> = {
  head: ['head'], armR: ['upperArm.R', 'forearm.R', 'mainHand'], armL: ['upperArm.L', 'forearm.L', 'offHand'], legR: ['leg.R', 'foot.R'], legL: ['leg.L', 'foot.L'],
};
const PART_ODDS: [string, number][] = [['head', 0.5], ['armR', 0.15], ['armL', 0.15], ['legR', 0.1], ['legL', 0.1]];

// Finishers (bible 11.3, F): on a staggered target or one under 25 percent Health, in reach.
// The strike lands at 0.6 s and the player is open for 1.4 s in all.
export const FINISHER = { lowHealth: 0.25, reach: 2.0, strike: 0.6, seconds: 1.4 };
export type FinisherKind = 'behead' | 'disarm' | 'hamstring';
const FINISHER_PART: Record<FinisherKind, string> = { behead: 'head', disarm: 'armR', hamstring: 'head' };

// A thrown body part. z is its height above the ground in pixels; null until the game
// has placed it where it sat on the body.
export type Part = { owner: string; outfit: string; part: string; facing: Facing; a: number; b: number; z: number | null; va: number; vb: number; vz: number; rot: number; vrot: number; settled: boolean };
// A body as the save keeps it: where it lies, which way, what was cut off and where that landed.
export type BodyState = { a: number; b: number; facing: Facing; severed: string[]; parts: { part: string; a: number; b: number; rot: number }[] };

export type FighterState = 'idle' | 'walk' | 'attack' | 'block' | 'roll' | 'hit' | 'finisher' | 'dead';
export type Fighter = {
  id: string; isPlayer: boolean; name: string;
  a: number; b: number; facing: Facing;
  state: FighterState; t: number; hitFor: number;
  health: number; maxHealth: number; stamina: number; maxStamina: number;
  blocking: boolean; blockT: number; power: boolean; struck: boolean; queued: boolean; counter: boolean; guardBroken: number;
  weapon: WeaponDef; skills: { weapon: number; block: number; armour: number }; armourBase: number;
  outfit: string; gear: string[]; heavy: boolean;
  bleed: number; limp: number; severed: string[]; // seconds of bleeding and limp left; parts cut off
  finisher?: { target: string; kind: FinisherKind };
  ai?: { home: [number, number]; cooldown: number; blockHold: number; aggro: boolean; style: string; circle: number; passive?: boolean }; // passive: tests switch the AI off
  encounter?: { id: string; index: number };
};

// How each kind of enemy fights (ours; Skyrim's combat styles are not exported yet).
// block: chance to raise a guard when the player swings; power: chance a swing is a power
// attack; cooldown: seconds between swings (plus up to `jitter`); speed: tiles a second
// closing in; dodge: chance to roll away from a power attack; circle: side-steps while waiting.
export const STYLES: Record<string, { block: number; power: number; cooldown: number; jitter: number; speed: number; dodge: number; circle: boolean; counter: boolean }> = {
  tank: { block: 0.3, power: 0.3, cooldown: 1.3, jitter: 1.2, speed: 2.6, dodge: 0, circle: false, counter: false },
  berserker: { block: 0.05, power: 0.55, cooldown: 1.6, jitter: 1.0, speed: 2.9, dodge: 0, circle: false, counter: false },
  duelist: { block: 0.55, power: 0.2, cooldown: 1.0, jitter: 0.8, speed: 2.6, dodge: 0.25, circle: true, counter: true },
};

export type Encounter = { id: string; slice: [number, number]; at: [number, number]; name: string; enemies: { actor: string; outfit: string; offset: [number, number]; gear: string[] }[] };

export class Combat {
  enemies: Fighter[] = [];
  slowLeft = 0;
  log: string[] = [];
  drops: { x: number; y: number; vx: number; vy: number; floor: number }[] = [];
  decals: { x: number; y: number; dark: boolean }[] = [];
  parts: Part[] = [];
  bodies: Record<string, BodyState> = {};
  // The player's Rage, any Fury burning, and the Exhaustion after it.
  rage = 0;
  fury: { power: FuryId; left: number } | null = null;
  exhausted = 0;
  private calm = 0; // seconds since the player last dealt or took a blow
  rng: () => number = Math.random; // tests pin this to force or forbid wounds and gore
  private spawned = new Set<string>();

  constructor(private readonly data: GameData, private readonly encounters: Encounter[], private readonly hooks: {
    character: () => Character; flags: () => Set<string>; say: (m: string) => void; sliceLoaded: (sx: number, sy: number) => boolean;
    playerOutfit: () => string;
  }) {}

  get S() { return this.data.settings; }
  get timeScale() { return this.slowLeft > 0 ? TIMING.slowMotionScale : 1; }

  // ---------- spawning ----------

  // Spawn the enemies of every encounter whose slice is loaded; the dead come back as bodies.
  sync() {
    for (const e of this.encounters) {
      const loaded = this.hooks.sliceLoaded(e.slice[0], e.slice[1]);
      if (loaded && !this.spawned.has(e.id)) { this.spawned.add(e.id); e.enemies.forEach((_, i) => this.enemies.push(this.makeEnemy(e, i))); }
      if (!loaded && this.spawned.has(e.id)) {
        this.spawned.delete(e.id);
        this.enemies = this.enemies.filter((f) => f.encounter?.id !== e.id);
        this.parts = this.parts.filter((p) => !p.owner.startsWith(`${e.id}:`));
      }
    }
  }
  reset() {
    this.enemies = []; this.spawned.clear(); this.drops = []; this.decals = []; this.parts = []; this.bodies = {}; this.slowLeft = 0;
    this.rage = 0; this.fury = null; this.exhausted = 0; this.calm = 0;
  }

  private makeEnemy(e: Encounter, i: number): Fighter {
    const spec = e.enemies[i], actor = this.data.actors[spec.actor];
    const a = e.slice[0] * 128 + e.at[0] + spec.offset[0], b = e.slice[1] * 128 + e.at[1] + spec.offset[1];
    const weapon = this.data.weapons.get(spec.gear.find((g) => this.data.weapons.has(g)) ?? 'IronSword')!;
    const armourBase = spec.gear.map((g) => this.data.armour.get(g)?.rating ?? 0).reduce((p, q) => p + q, 0);
    const id = `${e.id}:${i}`, dead = this.hooks.flags().has(`dead:${e.id}:${i}`), body = dead ? this.bodies[id] : undefined;
    const heavy = spec.gear.some((g) => this.data.armour.get(g)?.armourType === 'Heavy');
    const twoHanded = weapon.type.startsWith('TwoHand');
    const f: Fighter = {
      id, isPlayer: false, name: actor.name, a: body?.a ?? a, b: body?.b ?? b, facing: body?.facing ?? 'S', state: dead ? 'dead' : 'idle', t: dead ? 99 : 0, hitFor: 0,
      health: dead ? 0 : actor.health, maxHealth: actor.health, stamina: actor.stamina, maxStamina: actor.stamina,
      blocking: false, blockT: 0, power: false, struck: false, queued: false, counter: false, guardBroken: 0,
      weapon, skills: { weapon: actor.skills[twoHanded ? 'TwoHanded' : 'OneHanded'] ?? 15, block: actor.skills.Block ?? 15, armour: actor.skills[heavy ? 'HeavyArmor' : 'LightArmor'] ?? 15 }, armourBase,
      outfit: spec.outfit, gear: spec.gear, heavy, bleed: 0, limp: 0, severed: body ? [...body.severed] : [],
      ai: { home: [a, b], cooldown: 1 + i * 0.4, blockHold: 0, aggro: false, style: actor.style, circle: i % 2 ? 1 : -1 }, encounter: { id: e.id, index: i },
    };
    // Parts cut from a body earlier lie where they fell.
    for (const p of body?.parts ?? []) this.parts.push({ owner: id, outfit: spec.outfit, part: p.part, facing: f.facing, a: p.a, b: p.b, z: 0, va: 0, vb: 0, vz: 0, rot: p.rot, vrot: 0, settled: true });
    return f;
  }

  // The player as a fighter, kept in step with the game's player and character.
  playerFighter(p: { a: number; b: number; facing: Facing }, prev?: Fighter): Fighter {
    const c = this.hooks.character(), w = c.weapon();
    const f: Fighter = prev ?? {
      id: 'player', isPlayer: true, name: 'You', a: p.a, b: p.b, facing: p.facing, state: 'idle', t: 0, hitFor: 0,
      health: c.maxHealth, maxHealth: c.maxHealth, stamina: c.maxStamina, maxStamina: c.maxStamina,
      blocking: false, blockT: 0, power: false, struck: false, queued: false, counter: false, guardBroken: 0,
      weapon: w ?? this.data.weapons.get('IronSword')!, skills: { weapon: 0, block: 0, armour: 0 }, armourBase: 0, outfit: '', gear: [],
      heavy: false, bleed: 0, limp: 0, severed: [],
    };
    f.a = p.a; f.b = p.b;
    if (w) f.weapon = w;
    f.maxHealth = c.maxHealth; f.maxStamina = c.maxStamina;
    f.skills = { weapon: c.s.skills[w?.type.startsWith('TwoHand') ? 'TwoHanded' : 'OneHanded'].level, block: c.s.skills.Block.level, armour: 0 };
    f.heavy = c.armourPieces().some((p) => p.armourType === 'Heavy');
    f.outfit = this.hooks.playerOutfit();
    return f;
  }

  // ---------- the rules ----------

  private armourRating(f: Fighter) {
    if (f.isPlayer) return this.hooks.character().armourRating();
    return f.armourBase * (1 + (0.4 * (f.skills.armour + 15)) / 100);
  }
  // One blow, every step kept so the log can show the sum.
  hit(att: Fighter, def: Fighter, opts: { power?: boolean; blocking?: boolean } = {}) {
    const S = this.S, c = this.hooks.character(), kw = att.weapon.keywords, steps: string[] = [];
    let d = att.weapon.damage; steps.push(`${d} ${att.weapon.name}`);
    const skill = 1 + (0.5 * att.skills.weapon) / 100; d *= skill; steps.push(`x${skill.toFixed(2)} skill`);
    if (att.isPlayer) { const m = c.perkValue('ModAttackDamage', 1, kw); if (m !== 1) { d *= m; steps.push(`x${m.toFixed(2)} perks`); } }
    if (att.isPlayer && this.fury?.power === 'berserk') { d *= 2; steps.push('x2 berserk'); }
    if (opts.power) {
      let m = 1 + S.fPowerAttackDefaultBonus;
      if (att.isPlayer) m *= c.perkValue('ModPowerAttackDamage', 1, kw);
      d *= m; steps.push(`x${m.toFixed(2)} power`);
    }
    const armour = 1 - Math.min(S.fMaxArmorRating, this.armourRating(def) * S.fArmorScalingFactor) / 100;
    d *= armour; steps.push(`x${armour.toFixed(3)} armour`);
    let staminaCost = 0;
    if (opts.blocking) {
      let block = Math.min(S.fBlockMax, S.fBlockWeaponBase + S.fBlockWeaponScaling * S.fBlockSkillMult * (def.skills.block / 100));
      if (def.isPlayer) block = Math.min(1, c.perkValue('ModPercentBlocked', block, []));
      if (opts.power) block *= S.fBlockPowerAttackMult;
      if (def.isPlayer && this.fury) block *= RAGE.furyBlock; // Fury: no clean blocks
      staminaCost = d * S.fStaminaBlockDmgMult * S.fDiffMultHPToPCL;
      d *= 1 - block; steps.push(`x${(1 - block).toFixed(2)} blocked`);
    }
    if (def.isPlayer && this.fury?.power === 'burst') { d *= 0.85; steps.push('x0.85 burst'); }
    if (def.isPlayer && this.fury?.power === 'berserk') { d *= 0.5; steps.push('x0.5 berserk'); }
    d *= S.fDiffMultHPToPCL; steps.push(`x${S.fDiffMultHPToPCL} lethality`);
    return { damage: d, staminaCost, steps: steps.join(' ') };
  }
  powerCost(f: Fighter) {
    const base = this.S.fStaminaAttackWeaponBase + f.weapon.weight * this.S.fStaminaAttackWeaponMult;
    return f.isPlayer ? this.hooks.character().perkValue('ModPowerAttackStamina', base, f.weapon.keywords) : base;
  }

  // ---------- actions ----------

  busy(f: Fighter) { return f.state === 'attack' || f.state === 'roll' || f.state === 'hit' || f.state === 'finisher' || f.state === 'dead'; }
  // Swings play at the weapon's Skyrim speed: a battleaxe (0.7) is slower than a sword (1.0).
  attackFps(f: Fighter) { return (f.power ? TIMING.powerFps : TIMING.quickFps) * f.weapon.speed; }
  attackLength(f: Fighter) { return 6 / this.attackFps(f); }
  hitMoment(f: Fighter) { return TIMING.hitFrame / this.attackFps(f); }
  quick(f: Fighter) {
    if (f.state === 'attack' && !f.power && f.t > 0.6 * this.attackLength(f)) { f.queued = true; return true; }
    if (this.busy(f) || f.stamina < COSTS.quickAttack) return false;
    f.stamina -= COSTS.quickAttack; this.startAttack(f, false); return true;
  }
  powerAttack(f: Fighter) {
    const cost = this.powerCost(f);
    if (this.busy(f) || f.stamina < cost) return false;
    f.stamina -= cost; this.startAttack(f, true); return true;
  }
  private startAttack(f: Fighter, power: boolean) { f.state = 'attack'; f.power = power; f.t = 0; f.struck = false; f.blocking = false; f.queued = false; }
  block(f: Fighter, on: boolean) {
    if (on && !this.busy(f)) { f.blocking = true; f.blockT = 0; f.state = 'block'; f.t = 0; }
    if (!on) { f.blocking = false; if (f.state === 'block') f.state = 'idle'; }
  }
  roll(f: Fighter, dir?: Facing) {
    if (this.busy(f) || f.stamina < COSTS.roll) return false;
    f.stamina -= COSTS.roll; f.state = 'roll'; f.t = 0; f.blocking = false; if (dir) f.facing = dir; return true;
  }
  private stagger(f: Fighter, seconds: number) {
    if (f.state === 'dead' || f.state === 'finisher') return;
    if (f.isPlayer && (this.fury?.power === 'burst' || this.fury?.power === 'berserk')) return; // pain ignored
    f.state = 'hit'; f.t = 0; f.hitFor = seconds; f.blocking = false;
  }

  // ---------- geometry ----------

  private static vec(facing: Facing): [number, number] { const i = FACINGS.indexOf(facing), ang = (i * Math.PI) / 4; return [Math.cos(ang), Math.sin(ang)]; }
  private inSwing(att: Fighter, def: Fighter) {
    if (Math.hypot(att.a - def.a, att.b - def.b) > 2.1 * att.weapon.reach) return false;
    const [ax, ay] = toScreen(att.a, att.b), [dx, dy] = toScreen(def.a, def.b), [fx, fy] = Combat.vec(att.facing);
    const vx = dx - ax, vy = (dy - ay) * 2, l = Math.hypot(vx, vy) || 1;
    return (fx * vx + fy * vy) / l > Math.cos(Math.PI / 3);
  }
  private faces(def: Fighter, att: Fighter) {
    const [ax, ay] = toScreen(att.a, att.b), [dx, dy] = toScreen(def.a, def.b), [fx, fy] = Combat.vec(def.facing);
    const vx = ax - dx, vy = (ay - dy) * 2; return fx * vx + fy * vy > 0;
  }
  faceTowards(f: Fighter, a: number, b: number) {
    const [fx, fy] = toScreen(f.a, f.b), [tx, ty] = toScreen(a, b);
    f.facing = facingOf(tx - fx, (ty - fy) * 2);
  }
  static groundStep(facing: Facing, dist: number): [number, number] {
    const [vx, vy] = Combat.vec(facing), [ga, gb] = toGround(vx * 32, vy * 32), l = Math.hypot(ga, gb) || 1;
    return [(ga / l) * dist, (gb / l) * dist];
  }

  // ---------- a blow lands ----------

  private strike(att: Fighter, def: Fighter) {
    if (def.state === 'dead' || !this.inSwing(att, def)) return;
    const c = this.hooks.character();
    if (def.state === 'roll' && def.t < TIMING.rollInvulnerable) {
      if (def.t <= TIMING.perfectDodgeWindow) {
        this.slowLeft = TIMING.slowMotionSeconds; def.counter = true; this.stagger(att, 0.8);
        this.say(`${def.name === 'You' ? 'Perfect dodge' : `${def.name} dodged`}: time slows, the counter does double.`);
      }
      return;
    }
    if (def.blocking && this.faces(def, att)) {
      if (def.blockT <= TIMING.parryWindow && !(def.isPlayer && this.fury)) {
        this.stagger(att, TIMING.parriedSeconds); att.guardBroken = 2;
        this.say(`${def.isPlayer ? 'You parried' : `${def.name} parried`}: guard broken.`);
        if (def.isPlayer) c.useSkill('Block', att.weapon.damage);
        return;
      }
      const h = this.hit(att, def, { power: att.power, blocking: true });
      def.stamina -= h.staminaCost;
      if (def.stamina < 0) { def.stamina = 0; this.stagger(def, TIMING.hitSeconds * 2); }
      if (def.isPlayer) c.useSkill('Block', att.weapon.damage);
      this.wound(att, def, h.damage, `${att.name} hit ${def.isPlayer ? 'your' : `${def.name}'s`} guard: ${h.steps} = ${h.damage.toFixed(1)}`, { blocked: true });
      return;
    }
    const h = this.hit(att, def, { power: att.power });
    let dmg = h.damage, steps = h.steps;
    if (att.counter) { dmg *= 2; steps += ' x2 counter'; att.counter = false; this.stagger(def, 0.8); }
    else this.stagger(def, TIMING.hitSeconds * (att.power ? 2 : 1));
    // Skyrim trains weapon skills by the weapon's base damage per hit, armour skills by taking hits.
    if (att.isPlayer) c.useSkill(att.weapon.type.startsWith('TwoHand') ? 'TwoHanded' : 'OneHanded', att.weapon.damage);
    if (def.isPlayer) for (const p of c.armourPieces()) if (p.armourType !== 'Clothing') c.useSkill(p.armourType === 'Heavy' ? 'HeavyArmor' : 'LightArmor', att.weapon.damage / 2);
    this.wound(att, def, dmg, `${att.name} ${att.power ? 'power-attacked' : 'hit'} ${def.isPlayer ? 'you' : def.name}: ${steps} = ${dmg.toFixed(1)}`, { power: att.power });
  }
  private wound(att: Fighter, def: Fighter, dmg: number, line: string, opts: { power?: boolean; blocked?: boolean; finisher?: FinisherKind } = {}) {
    def.health -= dmg;
    this.say(line, false);
    // Rage: 1 per 1 percent of your Health lost, 1 per 5 percent of an enemy's dealt.
    if (def.isPlayer) this.addRage(((100 * dmg) / def.maxHealth) * RAGE.perPercentTaken);
    if (att.isPlayer) this.addRage(((20 * dmg) / def.maxHealth) * RAGE.perFivePercentDealt);
    if (att.isPlayer || def.isPlayer) this.calm = 0;
    this.spray(def, 6 + dmg / 2);
    // Serious wounds bleed, and on the legs they lame.
    if (!opts.blocked && dmg >= WOUNDS.serious * def.maxHealth && def.health > 0) {
      def.bleed = WOUNDS.bleedSeconds;
      const leg = this.rng() < WOUNDS.legChance;
      if (leg) def.limp = WOUNDS.limpSeconds;
      this.say(def.isPlayer ? (leg ? 'A deep cut to the leg: bleeding and limping. B to bandage.' : 'You are bleeding. B to bandage.') : `${def.name} is bleeding${leg ? ' and limping' : ''}.`, def.isPlayer);
    }
    if (def.health <= 0) {
      // Power killing blows may take a part off; a finisher always does.
      let part: string | undefined = opts.finisher && FINISHER_PART[opts.finisher];
      if (!part && opts.power && !opts.blocked && this.rng() < this.goreChance(att, def)) {
        let r = this.rng();
        part = PART_ODDS.find(([, w]) => (r -= w) < 0)?.[0] ?? 'head';
      }
      this.kill(att, def, part);
    }
  }
  // Chance a power killing blow takes a part: base, two-handed and axes up, heavy armour down.
  goreChance(att: Fighter, def: Fighter) {
    let c = GORE.base;
    if (att.weapon.type.startsWith('TwoHand')) c += GORE.twoHanded;
    if (/Axe/.test(att.weapon.type) || att.weapon.keywords.some((k) => /WarAxe|Battleaxe/.test(k))) c += GORE.axe;
    if (def.heavy) c += GORE.heavyArmour;
    return c;
  }
  private kill(att: Fighter, def: Fighter, part?: string) {
    def.health = 0; def.state = 'dead'; def.t = 0; def.blocking = false; def.bleed = 0;
    if (part) this.dismember(att, def, part);
    if (att.isPlayer && !def.isPlayer) this.addRage(RAGE.kill);
    if (def.encounter) {
      this.hooks.flags().add(`dead:${def.encounter.id}:${def.encounter.index}`);
      this.bodies[def.id] = { a: +def.a.toFixed(3), b: +def.b.toFixed(3), facing: def.facing, severed: [...def.severed], parts: this.bodies[def.id]?.parts ?? [] };
    }
    this.say(def.isPlayer ? 'You are dead.' : `${def.name} is dead.`);
  }
  // Cut a part off and throw it away from the blow, with a gout of blood.
  private dismember(att: Fighter, def: Fighter, part: string) {
    if (def.severed.includes(part)) return;
    def.severed.push(part);
    if (this.bodies[def.id]) this.bodies[def.id].severed = [...def.severed];
    const d = Math.hypot(def.a - att.a, def.b - att.b) || 1, ua = (def.a - att.a) / d, ub = (def.b - att.b) / d, side = this.rng() - 0.5;
    const speed = part === 'head' ? 1.7 : 1.3;
    this.parts.push({
      owner: def.id, outfit: def.outfit, part, facing: def.facing, a: def.a, b: def.b, z: null,
      va: (ua - ub * side) * speed, vb: (ub + ua * side) * speed, vz: 70 + this.rng() * 40, rot: 0, vrot: (this.rng() < 0.5 ? -1 : 1) * (6 + this.rng() * 6), settled: false,
    });
    this.spray(def, 40, part === 'head' ? 70 : 50);
  }
  private spray(f: Fighter, n: number, height = 60) {
    const [x, y] = toScreen(f.a, f.b);
    for (let i = 0; i < n; i++) this.drops.push({ x, y: y - height, vx: (this.rng() - 0.5) * 120, vy: -40 - this.rng() * 80, floor: y + (this.rng() - 0.5) * 10 });
  }
  addRage(n: number) { this.rage = Math.max(0, Math.min(100, this.rage + n)); }

  // ---------- wounds ----------

  // A bandage stops bleeding and binds a limp.
  bandage(f: Fighter) { const had = f.bleed > 0 || f.limp > 0; f.bleed = 0; f.limp = 0; return had; }

  // ---------- finishers and Fury ----------

  // Someone the player can finish: alive, in reach and in front, and staggered or badly hurt.
  finisherTarget(p: Fighter, any = false) {
    let best: Fighter | undefined, bd = FINISHER.reach;
    for (const e of this.enemies) {
      if (e.state === 'dead' || !this.inSwing(p, e)) continue;
      const d = Math.hypot(e.a - p.a, e.b - p.b);
      if (d > bd) continue;
      if (any || e.state === 'hit' || e.guardBroken > 0 || e.health < FINISHER.lowHealth * e.maxHealth) { best = e; bd = d; }
    }
    return best;
  }
  finish(p: Fighter, any = false) {
    if (this.busy(p)) return false;
    const e = this.finisherTarget(p, any);
    if (!e) return false;
    // A broken guard takes the sword arm, a back turned takes the legs first, otherwise the head.
    const kind: FinisherKind = e.guardBroken > 0 ? 'disarm' : !this.faces(e, p) ? 'hamstring' : 'behead';
    this.faceTowards(p, e.a, e.b);
    p.state = 'finisher'; p.t = 0; p.struck = false; p.blocking = false; p.finisher = { target: e.id, kind };
    e.state = 'hit'; e.t = 0; e.hitFor = 99; e.blocking = false;
    return true;
  }
  private landFinisher(p: Fighter) {
    const e = this.enemies.find((x) => x.id === p.finisher!.target);
    if (!e || e.state === 'dead') return;
    const kind = p.finisher!.kind;
    if (kind === 'hamstring') this.dismember(p, e, 'legR');
    this.wound(p, e, e.health, `You finished ${e.name}: ${kind}.`, { finisher: kind });
    this.addRage(RAGE.finisher);
    this.hooks.character().useSkill(p.weapon.type.startsWith('TwoHand') ? 'TwoHanded' : 'OneHanded', p.weapon.damage * 2);
    this.say(`Finisher: ${kind === 'behead' ? 'beheaded' : kind === 'disarm' ? 'took the sword arm off' : 'hamstrung, then beheaded'} ${e.name}.`);
  }
  // Q: spend Rage on a Fury power.
  useFury(p: Fighter, power: FuryId) {
    const def = FURY[power];
    if (p.state === 'dead' || this.fury || this.rage < def.cost) return false;
    if (power === 'execution' && (this.busy(p) || !this.finisherTarget(p, true))) return false;
    this.rage -= def.cost;
    if (power === 'sweep') {
      this.startAttack(p, true); p.struck = true; // the sweep lands now, all round
      for (const e of this.enemies) {
        if (e.state === 'dead' || Math.hypot(e.a - p.a, e.b - p.b) > 2.1 * p.weapon.reach || this.behind(p, e)) continue;
        const h = this.hit(p, e, { power: true });
        this.stagger(e, TIMING.hitSeconds * 2);
        this.wound(p, e, h.damage * 1.5, `Cleaving sweep hit ${e.name}: ${h.steps} x1.5 sweep = ${(h.damage * 1.5).toFixed(1)}`, { power: true });
      }
    } else if (power === 'execution') this.finish(p, true);
    else this.fury = { power, left: def.seconds };
    this.say(`${def.name}.`);
    return true;
  }
  // In the 90 degrees straight behind the attacker, the one place a 270 degree sweep misses.
  private behind(att: Fighter, def: Fighter) {
    const [ax, ay] = toScreen(att.a, att.b), [dx, dy] = toScreen(def.a, def.b), [fx, fy] = Combat.vec(att.facing);
    const vx = dx - ax, vy = (dy - ay) * 2, l = Math.hypot(vx, vy) || 1;
    return (fx * vx + fy * vy) / l < -Math.cos(Math.PI / 4);
  }

  private say(m: string, show = true) { this.log.unshift(m); this.log = this.log.slice(0, 20); if (show) this.hooks.say(m); }

  // ---------- update ----------

  update(dt: number, player: Fighter) {
    if (this.slowLeft > 0) this.slowLeft -= dt;
    const gdt = dt * this.timeScale;
    for (const e of this.enemies) this.think(e, player, gdt);
    for (const f of [player, ...this.enemies]) {
      f.t += gdt;
      if (f.state === 'dead') continue;
      if (f.blocking) f.blockT += gdt;
      if (f.guardBroken > 0) f.guardBroken -= gdt;
      const regen = f.isPlayer && this.exhausted > 0 ? 0.5 : 1; // Exhaustion after Fury halves it
      if (f.state !== 'attack' && f.state !== 'block') f.stamina = Math.min(f.maxStamina, f.stamina + 0.05 * f.maxStamina * regen * gdt);
      if (f.limp > 0) f.limp = Math.max(0, f.limp - gdt);
      if (f.bleed > 0) {
        f.bleed = Math.max(0, f.bleed - gdt); f.health -= WOUNDS.bleedPerSecond * gdt;
        if (this.rng() < 4 * gdt) this.spray(f, 1, 30);
        if (f.health <= 0) { this.kill(player, f); continue; }
      }
      if (f.state === 'finisher') {
        if (!f.struck && f.t >= FINISHER.strike) { f.struck = true; this.landFinisher(f); }
        if (f.t >= FINISHER.seconds) { f.state = 'idle'; f.finisher = undefined; }
      }
      if (f.state === 'attack') {
        if (!f.struck && f.t >= this.hitMoment(f)) { f.struck = true; for (const d of f.isPlayer ? this.enemies : [player]) this.strike(f, d); }
        if (f.t >= this.attackLength(f)) { f.state = 'idle'; if (f.queued) this.startAttack(f, false); }
      }
      if (f.state === 'roll') {
        const [da, db] = Combat.groundStep(f.facing, 6 * gdt); f.a += da; f.b += db;
        if (f.t >= TIMING.rollSeconds) f.state = 'idle';
      }
      if (f.state === 'hit' && f.t >= f.hitFor) f.state = 'idle';
    }
    // Rage cools after 10 s without a blow; Fury burns down into Exhaustion.
    if (this.enemies.some((e) => e.ai?.aggro && e.state !== 'dead')) this.calm = 0; else this.calm += dt;
    if (this.calm > RAGE.calmBeforeDecay) this.addRage(-RAGE.decayPerSecond * dt);
    if (this.fury && (this.fury.left -= dt) <= 0) {
      this.exhausted = RAGE.exhaustionSeconds * (this.fury.power === 'berserk' ? 2 : 1);
      this.say(`${FURY[this.fury.power].name} spent. Exhausted: Stamina returns at half rate.`);
      this.fury = null;
    }
    if (this.exhausted > 0) this.exhausted = Math.max(0, this.exhausted - dt);
    for (const p of this.parts) {
      if (p.settled || p.z === null) continue;
      p.vz -= 320 * gdt; p.z += p.vz * gdt; p.a += p.va * gdt; p.b += p.vb * gdt; p.rot += p.vrot * gdt;
      if (p.z <= 0) {
        p.z = 0;
        if (p.vz < -60) { p.vz *= -0.3; p.va *= 0.4; p.vb *= 0.4; p.vrot *= 0.4; }
        else {
          // Come to rest on a side, a quarter turn at a time, and leave a pool.
          p.settled = true; p.rot = Math.round(p.rot / (Math.PI / 2)) * (Math.PI / 2); p.va = p.vb = p.vz = p.vrot = 0;
          const [x, y] = toScreen(p.a, p.b);
          for (let i = 0; i < 30; i++) this.decals.push({ x: Math.round(x + (this.rng() - 0.5) * 8), y: Math.round(y + (this.rng() - 0.5) * 4), dark: this.rng() < 0.6 });
          const body = this.bodies[p.owner];
          if (body) body.parts.push({ part: p.part, a: +p.a.toFixed(3), b: +p.b.toFixed(3), rot: +p.rot.toFixed(3) });
        }
      }
    }
    this.drops = this.drops.filter((d) => {
      d.vy += 400 * gdt; d.x += d.vx * gdt; d.y += d.vy * gdt;
      if (d.y >= d.floor) { this.decals.push({ x: Math.round(d.x), y: Math.round(d.floor), dark: Math.random() < 0.5 }); return false; }
      return true;
    });
    if (this.decals.length > 3000) this.decals.splice(0, this.decals.length - 3000);
  }

  // Enemies notice the player within 8 tiles, close in, swing on a cooldown, sometimes
  // guard or roll when the player swings, and give up past 16 tiles from home. How
  // often each happens is the enemy's style.
  private think(e: Fighter, p: Fighter, dt: number) {
    const ai = e.ai!, st = STYLES[ai.style] ?? STYLES.tank;
    if (e.state === 'dead' || this.busy(e) || ai.passive) return;
    const d = Math.hypot(p.a - e.a, p.b - e.b), fromHome = Math.hypot(e.a - ai.home[0], e.b - ai.home[1]), pace = e.limp > 0 ? WOUNDS.limpSpeed : 1;
    if (!ai.aggro && d < 8 && p.state !== 'dead') ai.aggro = true;
    if (ai.aggro && (fromHome > 16 || p.state === 'dead')) ai.aggro = false;
    ai.cooldown -= dt;
    if (!ai.aggro) {
      if (fromHome > 1) { this.faceTowards(e, ai.home[0], ai.home[1]); e.a += ((ai.home[0] - e.a) / fromHome) * 2 * pace * dt; e.b += ((ai.home[1] - e.b) / fromHome) * 2 * pace * dt; e.state = 'walk'; }
      else e.state = 'idle';
      return;
    }
    this.faceTowards(e, p.a, p.b);
    const swingStarting = (p.state === 'attack' || p.state === 'finisher') && p.t < 0.08 && d < 2.6;
    if (swingStarting && p.power && this.rng() < st.dodge) {
      const away = facingOf(...((): [number, number] => { const [ex, ey] = toScreen(e.a, e.b), [px, py] = toScreen(p.a, p.b); return [ex - px, (ey - py) * 2]; })());
      if (this.roll(e, away)) return;
    }
    if (swingStarting && !e.blocking && this.rng() < st.block) { this.block(e, true); ai.blockHold = 0.7; return; }
    if (e.blocking) {
      ai.blockHold -= dt;
      if (ai.blockHold <= 0) { this.block(e, false); if (st.counter) ai.cooldown = Math.min(ai.cooldown, 0.1); }
      return;
    }
    if (d > 1.7) { e.a += ((p.a - e.a) / d) * st.speed * pace * dt; e.b += ((p.b - e.b) / d) * st.speed * pace * dt; e.state = 'walk'; }
    else if (ai.cooldown <= 0) { if (this.rng() < st.power) this.powerAttack(e); else this.quick(e); ai.cooldown = st.cooldown + this.rng() * st.jitter; }
    else if (st.circle && d > 1.2) {
      // Circle the player while waiting for an opening.
      const ua = (p.a - e.a) / d, ub = (p.b - e.b) / d;
      e.a += -ub * ai.circle * 1.2 * pace * dt; e.b += ua * ai.circle * 1.2 * pace * dt; e.state = 'walk';
      if (this.rng() < 0.5 * dt) ai.circle *= -1;
    }
    else e.state = 'idle';
  }

  // The animation and frame to draw for a fighter.
  frame(f: Fighter): [string, number] {
    switch (f.state) {
      case 'walk': return ['walk', Math.floor(f.t * 10) % 8];
      case 'attack': return ['attack', Math.min(5, Math.floor(f.t * this.attackFps(f)))];
      case 'block': return ['block', Math.min(3, Math.floor(f.t * 8))];
      case 'roll': return ['roll', Math.min(7, Math.floor((f.t / TIMING.rollSeconds) * 8))];
      case 'hit': return ['hit', Math.min(2, Math.floor((f.t / Math.max(0.01, f.hitFor)) * 3))];
      case 'finisher': return ['attack', Math.min(5, Math.floor((f.t / FINISHER.strike) * TIMING.hitFrame))];
      case 'dead': return ['death', Math.min(7, Math.floor(f.t * TIMING.deathFps))];
      default: return ['idle', Math.floor(performance.now() / 200) % 6];
    }
  }
}
