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

export type FighterState = 'idle' | 'walk' | 'attack' | 'block' | 'roll' | 'hit' | 'dead';
export type Fighter = {
  id: string; isPlayer: boolean; name: string;
  a: number; b: number; facing: Facing;
  state: FighterState; t: number; hitFor: number;
  health: number; maxHealth: number; stamina: number; maxStamina: number;
  blocking: boolean; blockT: number; power: boolean; struck: boolean; queued: boolean; counter: boolean; guardBroken: number;
  weapon: WeaponDef; skills: { weapon: number; block: number; armour: number }; armourBase: number;
  outfit: string; gear: string[];
  ai?: { home: [number, number]; cooldown: number; blockHold: number; aggro: boolean; passive?: boolean }; // passive: tests switch the AI off
  encounter?: { id: string; index: number };
};

export type Encounter = { id: string; slice: [number, number]; at: [number, number]; name: string; enemies: { actor: string; outfit: string; offset: [number, number]; gear: string[] }[] };

export class Combat {
  enemies: Fighter[] = [];
  slowLeft = 0;
  log: string[] = [];
  drops: { x: number; y: number; vx: number; vy: number; floor: number }[] = [];
  decals: { x: number; y: number; dark: boolean }[] = [];
  private spawned = new Set<string>();

  constructor(private readonly data: GameData, private readonly encounters: Encounter[], private readonly hooks: {
    character: () => Character; flags: () => Set<string>; say: (m: string) => void; sliceLoaded: (sx: number, sy: number) => boolean;
  }) {}

  get S() { return this.data.settings; }
  get timeScale() { return this.slowLeft > 0 ? TIMING.slowMotionScale : 1; }

  // ---------- spawning ----------

  // Spawn the enemies of every encounter whose slice is loaded; the dead come back as bodies.
  sync() {
    for (const e of this.encounters) {
      const loaded = this.hooks.sliceLoaded(e.slice[0], e.slice[1]);
      if (loaded && !this.spawned.has(e.id)) { this.spawned.add(e.id); e.enemies.forEach((_, i) => this.enemies.push(this.makeEnemy(e, i))); }
      if (!loaded && this.spawned.has(e.id)) { this.spawned.delete(e.id); this.enemies = this.enemies.filter((f) => f.encounter?.id !== e.id); }
    }
  }
  reset() { this.enemies = []; this.spawned.clear(); this.drops = []; this.decals = []; this.slowLeft = 0; }

  private makeEnemy(e: Encounter, i: number): Fighter {
    const spec = e.enemies[i], actor = this.data.actors[spec.actor];
    const a = e.slice[0] * 128 + e.at[0] + spec.offset[0], b = e.slice[1] * 128 + e.at[1] + spec.offset[1];
    const weapon = this.data.weapons.get(spec.gear.find((g) => this.data.weapons.has(g)) ?? 'IronSword')!;
    const armourBase = spec.gear.map((g) => this.data.armour.get(g)?.rating ?? 0).reduce((p, q) => p + q, 0);
    const dead = this.hooks.flags().has(`dead:${e.id}:${i}`);
    return {
      id: `${e.id}:${i}`, isPlayer: false, name: 'Bandit', a, b, facing: 'S', state: dead ? 'dead' : 'idle', t: dead ? 99 : 0, hitFor: 0,
      health: dead ? 0 : actor.health, maxHealth: actor.health, stamina: actor.stamina, maxStamina: actor.stamina,
      blocking: false, blockT: 0, power: false, struck: false, queued: false, counter: false, guardBroken: 0,
      weapon, skills: { weapon: actor.skills.OneHanded, block: actor.skills.Block, armour: actor.skills.LightArmor }, armourBase,
      outfit: spec.outfit, gear: spec.gear, ai: { home: [a, b], cooldown: 1 + i * 0.4, blockHold: 0, aggro: false }, encounter: { id: e.id, index: i },
    };
  }

  // The player as a fighter, kept in step with the game's player and character.
  playerFighter(p: { a: number; b: number; facing: Facing }, prev?: Fighter): Fighter {
    const c = this.hooks.character(), w = c.weapon();
    const f: Fighter = prev ?? {
      id: 'player', isPlayer: true, name: 'You', a: p.a, b: p.b, facing: p.facing, state: 'idle', t: 0, hitFor: 0,
      health: c.maxHealth, maxHealth: c.maxHealth, stamina: c.maxStamina, maxStamina: c.maxStamina,
      blocking: false, blockT: 0, power: false, struck: false, queued: false, counter: false, guardBroken: 0,
      weapon: w ?? this.data.weapons.get('IronSword')!, skills: { weapon: 0, block: 0, armour: 0 }, armourBase: 0, outfit: '', gear: [],
    };
    f.a = p.a; f.b = p.b;
    if (w) f.weapon = w;
    f.maxHealth = c.maxHealth; f.maxStamina = c.maxStamina;
    f.skills = { weapon: c.s.skills[w?.type.startsWith('TwoHand') ? 'TwoHanded' : 'OneHanded'].level, block: c.s.skills.Block.level, armour: 0 };
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
      staminaCost = d * S.fStaminaBlockDmgMult * S.fDiffMultHPToPCL;
      d *= 1 - block; steps.push(`x${(1 - block).toFixed(2)} blocked`);
    }
    d *= S.fDiffMultHPToPCL; steps.push(`x${S.fDiffMultHPToPCL} lethality`);
    return { damage: d, staminaCost, steps: steps.join(' ') };
  }
  powerCost(f: Fighter) {
    const base = this.S.fStaminaAttackWeaponBase + f.weapon.weight * this.S.fStaminaAttackWeaponMult;
    return f.isPlayer ? this.hooks.character().perkValue('ModPowerAttackStamina', base, f.weapon.keywords) : base;
  }

  // ---------- actions ----------

  busy(f: Fighter) { return f.state === 'attack' || f.state === 'roll' || f.state === 'hit' || f.state === 'dead'; }
  attackLength(f: Fighter) { return 6 / (f.power ? TIMING.powerFps : TIMING.quickFps); }
  hitMoment(f: Fighter) { return TIMING.hitFrame / (f.power ? TIMING.powerFps : TIMING.quickFps); }
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
  private stagger(f: Fighter, seconds: number) { if (f.state === 'dead') return; f.state = 'hit'; f.t = 0; f.hitFor = seconds; f.blocking = false; }

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
      if (def.blockT <= TIMING.parryWindow) {
        this.stagger(att, TIMING.parriedSeconds); att.guardBroken = 2;
        this.say(`${def.isPlayer ? 'You parried' : `${def.name} parried`}: guard broken.`);
        if (def.isPlayer) c.useSkill('Block', att.weapon.damage);
        return;
      }
      const h = this.hit(att, def, { power: att.power, blocking: true });
      def.stamina -= h.staminaCost;
      if (def.stamina < 0) { def.stamina = 0; this.stagger(def, TIMING.hitSeconds * 2); }
      if (def.isPlayer) c.useSkill('Block', att.weapon.damage);
      this.wound(att, def, h.damage, `${att.name} hit ${def.isPlayer ? 'your' : `${def.name}'s`} guard: ${h.steps} = ${h.damage.toFixed(1)}`);
      return;
    }
    const h = this.hit(att, def, { power: att.power });
    let dmg = h.damage, steps = h.steps;
    if (att.counter) { dmg *= 2; steps += ' x2 counter'; att.counter = false; this.stagger(def, 0.8); }
    else this.stagger(def, TIMING.hitSeconds * (att.power ? 2 : 1));
    // Skyrim trains weapon skills by the weapon's base damage per hit, armour skills by taking hits.
    if (att.isPlayer) c.useSkill(att.weapon.type.startsWith('TwoHand') ? 'TwoHanded' : 'OneHanded', att.weapon.damage);
    if (def.isPlayer) for (const p of c.armourPieces()) if (p.armourType !== 'Clothing') c.useSkill(p.armourType === 'Heavy' ? 'HeavyArmor' : 'LightArmor', att.weapon.damage / 2);
    this.wound(att, def, dmg, `${att.name} ${att.power ? 'power-attacked' : 'hit'} ${def.isPlayer ? 'you' : def.name}: ${steps} = ${dmg.toFixed(1)}`);
  }
  private wound(_att: Fighter, def: Fighter, dmg: number, line: string) {
    def.health -= dmg;
    this.say(line, false);
    const [x, y] = toScreen(def.a, def.b);
    for (let i = 0; i < 6 + dmg / 2; i++) this.drops.push({ x, y: y - 60, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, floor: y + (Math.random() - 0.5) * 10 });
    if (def.health <= 0) {
      def.health = 0; def.state = 'dead'; def.t = 0; def.blocking = false;
      if (def.encounter) this.hooks.flags().add(`dead:${def.encounter.id}:${def.encounter.index}`);
      this.say(def.isPlayer ? 'You are dead.' : `${def.name} is dead.`);
    }
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
      if (f.state !== 'attack' && f.state !== 'block') f.stamina = Math.min(f.maxStamina, f.stamina + 0.05 * f.maxStamina * gdt);
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
    this.drops = this.drops.filter((d) => {
      d.vy += 400 * gdt; d.x += d.vx * gdt; d.y += d.vy * gdt;
      if (d.y >= d.floor) { this.decals.push({ x: Math.round(d.x), y: Math.round(d.floor), dark: Math.random() < 0.5 }); return false; }
      return true;
    });
    if (this.decals.length > 3000) this.decals.splice(0, this.decals.length - 3000);
  }

  // Bandits: notice the player within 8 tiles, close in, swing on a cooldown, sometimes
  // raise a guard when the player swings, and give up past 16 tiles from camp.
  private think(e: Fighter, p: Fighter, dt: number) {
    const ai = e.ai!;
    if (e.state === 'dead' || this.busy(e) || ai.passive) return;
    const d = Math.hypot(p.a - e.a, p.b - e.b), fromHome = Math.hypot(e.a - ai.home[0], e.b - ai.home[1]);
    if (!ai.aggro && d < 8 && p.state !== 'dead') ai.aggro = true;
    if (ai.aggro && (fromHome > 16 || p.state === 'dead')) ai.aggro = false;
    ai.cooldown -= dt;
    if (!ai.aggro) {
      if (fromHome > 1) { this.faceTowards(e, ai.home[0], ai.home[1]); e.a += ((ai.home[0] - e.a) / fromHome) * 2 * dt; e.b += ((ai.home[1] - e.b) / fromHome) * 2 * dt; e.state = 'walk'; }
      else e.state = 'idle';
      return;
    }
    this.faceTowards(e, p.a, p.b);
    if (p.state === 'attack' && p.t < 0.08 && d < 2.6 && !e.blocking && Math.random() < 0.3) { this.block(e, true); ai.blockHold = 0.7; return; }
    if (e.blocking) { ai.blockHold -= dt; if (ai.blockHold <= 0) this.block(e, false); return; }
    if (d > 1.7) { e.a += ((p.a - e.a) / d) * 2.6 * dt; e.b += ((p.b - e.b) / d) * 2.6 * dt; e.state = 'walk'; }
    else if (ai.cooldown <= 0) { if (Math.random() < 0.3) this.powerAttack(e); else this.quick(e); ai.cooldown = 1.3 + Math.random() * 1.2; }
    else e.state = 'idle';
  }

  // The animation and frame to draw for a fighter.
  frame(f: Fighter): [string, number] {
    switch (f.state) {
      case 'walk': return ['walk', Math.floor(f.t * 10) % 8];
      case 'attack': return ['attack', Math.min(5, Math.floor(f.t * (f.power ? TIMING.powerFps : TIMING.quickFps)))];
      case 'block': return ['block', Math.min(3, Math.floor(f.t * 8))];
      case 'roll': return ['roll', Math.min(7, Math.floor((f.t / TIMING.rollSeconds) * 8))];
      case 'hit': return ['hit', Math.min(2, Math.floor((f.t / Math.max(0.01, f.hitFor)) * 3))];
      case 'dead': return ['death', Math.min(7, Math.floor(f.t * TIMING.deathFps))];
      default: return ['idle', Math.floor(performance.now() / 200) % 6];
    }
  }
}
