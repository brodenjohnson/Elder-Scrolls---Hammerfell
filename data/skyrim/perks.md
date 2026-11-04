# Perks: the 12 retained trees

Skyrim totals for the 12 retained skills: **107 unique perks, 165 counting ranks** [V from UESP perk summary].
| Skill | Unique / ranks [V] |
|---|---|
| Archery | 9 / 16 |
| Block | 9 / 13 |
| Heavy Armor | 8 / 12 |
| One-handed | 10 / 21 |
| Smithing | 10 / 10 |
| Two-handed | 9 / 19 |
| Alchemy | 9 / 15 |
| Light Armor | 6 / 10 |
| Lockpicking | 11 / 11 |
| Pickpocket | 8 / 12 |
| Sneak | 9 / 13 |
| Speech | 9 / 13 |

Perk effect text, skill requirements and prerequisites: capture in Phase 0 (`data/skyrim/json/perks.json`). Names below are from memory [M] unless a tree is marked fully captured.

## One-handed (fully captured [V])
| Perk | Ranks | Requirement | Effect |
|---|---|---|---|
| Armsman | 5 | One-handed 0 / 20 / 40 / 60 / 80 | One-handed weapons do 20 / 40 / 60 / 80 / 100 percent more damage |
| Fighting Stance | 1 | One-handed 20, Armsman | Power attacks cost 25 percent less Stamina |
| Hack and Slash | 3 | One-handed 30 / 60 / 90, Armsman | War axes cause bleeding damage, more at each rank |
| Bone Breaker | 3 | One-handed 30 / 60 / 90, Armsman | Maces ignore 25 / 50 / 75 percent of armour |
| Bladesman | 3 | One-handed 30 / 60 / 90, Armsman | Swords have a 10 / 15 / 20 percent chance of critical damage, with higher critical damage at rank 3 |
| Dual Flurry | 2 | One-handed 30 / 50, Armsman | Dual-wielding attacks are 20 / 35 percent faster |
| Critical Charge | 1 | One-handed 50, Fighting Stance | A sprinting power attack does double critical damage |
| Savage Strike | 1 | One-handed 50, Fighting Stance | Standing power attacks do 25 percent bonus damage with a chance to decapitate |
| Paralyzing Strike | 1 | One-handed 100, Critical Charge or Savage Strike | Backwards power attack has a 25 percent chance to paralyse |
| Dual Savagery | 1 | One-handed 70, Dual Flurry | Dual-wielding power attacks do 50 percent bonus damage |
Some requirement levels above are [M] (Armsman steps, Dual Flurry second rank). Confirm in Phase 0.

## Other trees (names [M], ranks per the unique/ranks totals)
- **Archery:** Overdraw (5), Critical Shot (3), Steady Hand (2), Eagle Eye, Hunter's Discipline, Ranger, Quick Shot, Bullseye, Power Shot.
- **Block:** Shield Wall (5), Deflect Arrows, Elemental Protection, Block Runner, Deadly Bash, Disarming Bash, Quick Reflexes, Power Bash, Shield Charge.
- **Heavy Armor:** Juggernaut (5), Fists of Steel, Well Fitted, Tower of Strength, Conditioning, Matching Set, Reflect Blows, Cushioned.
- **Smithing:** Steel Smithing, Arcane Blacksmith, Elven Smithing, Dwarven Smithing, Orcish Smithing, Ebony Smithing, Daedric Smithing, Glass Smithing, Advanced Armors, Dragon Armor. **Dragon Armor is excluded and Arcane Blacksmith is changed**, since it improves enchanted items. Replace both with two new perks (see `SYSTEMS_SPEC.md` section 3).
- **Two-handed:** Barbarian (5), Limbsplitter (3), Deep Wounds (3), Skullcrusher (3), Champion's Stance, Devastating Blow, Great Critical Charge, Sweep, Warmaster. Devastating Blow carries the decapitation chance for two-handers [M].
- **Alchemy:** Alchemist (5), Experimenter (3), Physician, Benefactor, Poisoner, Concentrated Poison, Green Thumb, Snakeblood, Purity.
- **Light Armor:** Agile Defender (5), Custom Fit, Matching Set, Wind Walker, Deft Movement, Unhindered.
- **Lockpicking:** Novice Locks, Apprentice Locks, Adept Locks, Expert Locks, Master Locks, Quick Hands, Wax Key, Locksmith, Unbreakable, Treasure Hunter, Golden Touch.
- **Pickpocket:** Light Fingers, Night Thief, Cutpurse, Poisoned, Extra Pockets, Keymaster, Misdirection, Perfect Touch. (Rank counts [X]: the wiki total is 12.)
- **Sneak:** Stealth (5), Muffled Movement, Light Foot, Backstab, Deadly Aim, Assassin's Blade, Silent Roll, Silence, Shadow Warrior. (Rank counts [X]: the wiki total is 13.)
- **Speech:** Haggling (5), Allure, Merchant, Persuasion, Bribery, Intimidation, Fence, Master Trader, Investor.

## Perks that need a magic-free rewrite
Anything that mentions spells, Magicka, or enchanting. The known cases: Smithing's Arcane Blacksmith (enchanted gear), Heavy Armor's Reflect Blows (kept, no magic), Block's Elemental Protection (kept: it reduces elemental damage from NPC mages), Block's Deflect Arrows (kept), Alchemy's Physician and Benefactor (potion effects, kept). Check every perk's text for "spell" and "Magicka" during extraction and list the changes in the Phase 0 report.
