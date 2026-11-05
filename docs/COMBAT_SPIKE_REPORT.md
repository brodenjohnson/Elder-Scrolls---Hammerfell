# Combat spike report (Phase 0)

A bare arena in PixiJS (`spikes/combat/`): the farmer in Leather Armor with an Iron Sword against two level 1 bandits. Open it with `node spikes/tech/server.mjs`, then go to `http://localhost:5179/spikes/combat/`. It needs the Skyrim export in `data/skyrim/json/` and the art in `art/out/`.

## What is in it

| Bible 11.1 control | In the arena |
|---|---|
| WASD move, Shift sprint | Yes. Sprinting drains 7 stamina a second (Skyrim `fSprintStaminaDrainMult`). |
| Melee faces the cursor | Yes, in eight directions. |
| Left click quick attack, a three-hit chain | Yes. A click late in a swing queues the next. All three hits use the same animation for now. |
| Hold left click for a power attack | Yes: hold 0.3 s; slower frames, double damage, Skyrim's stamina cost. |
| Right click block, timed block parries | Yes: 0.2 s parry window. A parry staggers the attacker for 1.2 s and marks their guard broken. |
| Space dodge roll | Yes: 0.57 s, invulnerable for the first 0.25 s. A roll begun within 0.15 s of the blow is a perfect dodge: time runs at 35% for a second, the attacker is off balance, and the counter does double damage and staggers. |
| F finisher, Q Fury | Not yet. A broken guard is marked, but there is no finisher animation. |

Bandits approach, swing quick or power attacks on a cooldown, and sometimes raise a guard when you swing. Blood sprays on every hit and stays on the ground.

## The numbers

Skyrim's numbers come from the export (Iron Sword 7 damage, reach 1; Leather Armor, Boots and Bracers rated 40; a level 1 bandit with 35 health, One-handed 25, Block 20; a Redguard farmer with One-handed 25, Block 20). The formulas use Skyrim's game settings: skill bonus, `fPowerAttackDefaultBonus` (double), `fArmorScalingFactor` 0.12 and the 80% cap, `fBlockWeaponBase`, `fBlockWeaponScaling`, `fBlockSkillMult`, `fBlockMax` 0.7, `fBlockPowerAttackMult`, and `fStaminaBlockDmgMult`.

**Tension found and resolved:** with Skyrim's numbers alone, a bandit's Iron Sword does 7.5 to the farmer, so he survives 13 hits. The bible wants three or four. The arena applies one **lethality** multiplier, set to Skyrim's own Legendary value (`fDiffMultHPToPCL` = 3), to both sides, as the bible's "enemies are as dangerous as he is" asks:

| Blow | Damage | Hits to kill |
|---|---|---|
| Bandit quick attack on the farmer | 22.5 | 5 |
| Bandit power attack on the farmer | 45 | 3 |
| Bandit power attack, farmer blocking | 33.7 | 3 |
| Farmer quick attack on a bandit | 22.5 | 2 |
| Farmer power attack on a bandit | 45 | 1 |

That meets "dies in three or four hits" for a mix of quick and power attacks. The multiplier is one number to tune; I recommend logging it in the bible as the difficulty baseline.

Stamina costs Skyrim does not have are ours: quick attack 10, dodge roll 20. Skyrim's costs are used for power attacks (29: `fStaminaAttackWeaponBase` 20 plus the sword's weight 9), blocking (25% of the blocked damage) and sprinting.

## Tests

`node spikes/combat/test.mjs` drives the arena through `window.__game` and checks each mechanic against the rules module. All five pass:

- an unblocked quick hit takes 22.49, as the rules say;
- a held block takes 13.94 and costs stamina;
- a block raised 0.1 s before the blow parries and staggers the bandit;
- a roll 0.08 s before a power attack is a perfect dodge (time at 35%, counter armed);
- a power attack kills a level 1 bandit outright.

## Not done, and what the feel needs next

- **Hand-tuning in play.** The windows and costs are the bible's starting values. They need you at the keyboard: try it and say what feels off.
- **Readability:** bandits wear the same leather as the player, told apart only by a tint. They need their own outfits.
- **Missing animations:** hit reaction, death, a second and third chain swing, power-attack wind-up, finishers. Deaths currently just vanish.
- **Enemy telegraphs:** a bandit's wind-up is only the first frames of its swing. A clear tell (a flash, a sound, a longer wind-up on power attacks) will make parries and perfect dodges fair.
- **The bandit's health** uses the record's base value (35). Whether Skyrim also applies the record's offset (-15) needs checking against the game.
