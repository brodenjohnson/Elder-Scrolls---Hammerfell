// Combat rules for the arena. Skyrim's numbers come from the export (data/skyrim/json);
// the timings Skyrim does not have (dodge, perfect dodge, parry window) come from the
// design bible, section 11. Pure functions: the page and the Node test both use them.

// Bible section 11.2 (PROPOSED numbers, tune in testing).
export const TIMING = {
  rollSeconds: 0.57,          // 8 frames at 14 fps
  rollInvulnerable: 0.25,     // invulnerable for the first 0.25 s of a roll
  perfectDodgeWindow: 0.15,   // roll started within 0.15 s before impact
  slowMotionSeconds: 1.0,
  slowMotionScale: 0.35,
  parryWindow: 0.2,           // block pressed within 0.2 s before impact
  quickHitAt: 3 / 14,         // attack frame 3 of 6 at 14 fps lands the blow
  powerHoldSeconds: 0.3,      // hold the button this long for a power attack
  powerFps: 8,                // a power attack plays the same frames slower
  staggerSeconds: 0.5,
  parriedStaggerSeconds: 1.2,
};

// Stamina costs Skyrim does not set for these actions (ours, bible: everything costs stamina).
export const COSTS = { quickAttack: 10, roll: 20 };

export function makeRules(sk) {
  const setting = (e) => sk.gameSettings.find((g) => g.edid === e)?.value;
  const item = (rows, name, extra = () => true) => rows.find((r) => r.name === name && !r.enchanted && !r.template && extra(r));
  const S = {
    armourScaling: setting('fArmorScalingFactor'),          // 0.12 % per point
    maxArmour: setting('fMaxArmorRating'),                   // 80 %
    powerBonus: setting('fPowerAttackDefaultBonus'),         // +1, so power attacks do double
    blockBase: setting('fBlockWeaponBase'), blockScaling: setting('fBlockWeaponScaling'), blockSkillMult: setting('fBlockSkillMult'),
    blockMax: setting('fBlockMax'), blockPowerMult: setting('fBlockPowerAttackMult'),
    staminaBlockDmgMult: setting('fStaminaBlockDmgMult'),
    staminaAttackBase: setting('fStaminaAttackWeaponBase'), staminaAttackMult: setting('fStaminaAttackWeaponMult'),
    lethality: setting('fDiffMultHPToPCL'),                 // Skyrim's Legendary incoming multiplier, used both ways
  };
  const sword = item(sk.weapons, 'Iron Sword');
  const leather = ['Leather Armor', 'Leather Boots', 'Leather Bracers'].map((n) => item(sk.armour, n)).reduce((s, a) => s + a.rating, 0);
  const bandit = sk.npcs.find((n) => n.edid === 'EncBandit01Melee1HTankRedguardM');
  const redguard = sk.races.find((r) => r.edid === 'RedguardRace');
  const boost = (skill) => redguard.skillBoosts.find((b) => b.skill === skill)?.boost ?? 0;

  const fighters = {
    // Skyrim's player starts every skill at 15 plus the racial boost; health 100 (bible).
    player: { name: 'You', health: 100, stamina: 100, oneHanded: 15 + boost('OneHanded'), block: 15 + boost('Block'), armour: leather, weapon: sword },
    // A level 1 bandit as Skyrim builds one; base health from the record (the offset is not applied: to confirm).
    bandit: { name: 'Bandit', health: bandit.base.health, stamina: bandit.base.stamina, oneHanded: bandit.skills.OneHanded, block: bandit.skills.Block, armour: leather, weapon: sword },
  };

  // Damage of one blow, with every step kept so the arena can show the sum.
  function hit(att, def, { power = false, blocking = false } = {}) {
    const steps = [];
    let d = att.weapon.damage; steps.push(`${d} ${att.weapon.name}`);
    const skill = 1 + (0.5 * att.oneHanded) / 100; d *= skill; steps.push(`x${skill.toFixed(2)} skill`);
    if (power) { d *= 1 + S.powerBonus; steps.push(`x${1 + S.powerBonus} power`); }
    const armour = 1 - Math.min(S.maxArmour, def.armour * S.armourScaling) / 100; d *= armour; steps.push(`x${armour.toFixed(3)} armour`);
    let staminaCost = 0;
    if (blocking) {
      let block = Math.min(S.blockMax, S.blockBase + S.blockScaling * S.blockSkillMult * (def.block / 100));
      if (power) block *= S.blockPowerMult;
      staminaCost = d * S.staminaBlockDmgMult * S.lethality;
      d *= 1 - block; steps.push(`x${(1 - block).toFixed(2)} blocked`);
    }
    d *= S.lethality; steps.push(`x${S.lethality} lethality`);
    return { damage: d, staminaCost, steps: steps.join(' ') };
  }
  // Skyrim: a power attack costs the weapon base plus its weight.
  const powerCost = (f) => S.staminaAttackBase + f.weapon.weight * S.staminaAttackMult;
  return { S, fighters, hit, powerCost, sword, leather };
}
