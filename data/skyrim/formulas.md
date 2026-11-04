# Formulas (Skyrim vanilla)

## Character leveling [V]
- XP needed to go from level L to L+1: **75 + 25 x L**, equivalently (L + 3) x 25. Level 1 to 2 needs 100 XP. Level 49 to 50 needs 1,300.
- Character XP gained = the new skill level reached (training Alchemy from 20 to 21 gives 21 XP).
- Each level: **+1 perk point** and **+10** to one attribute. Skyrim lets you pick Health, Magicka or Stamina. **This game offers Health or Stamina only.**
- Unused perk points cap at 255 in Skyrim (a roll-over bug). Not needed here, but do not allow more than 255.
- Starting Health 100 and Stamina 100 for every race [M].
- Trainers: up to five training sessions per character level [V].

## Skill leveling [V]
- Skill XP to reach the next level is roughly **Skill Improve Mult x (level^1.95) + Skill Improve Offset**. Each skill has its own multipliers (for example Lockpicking uses 0.25 and 300). [X] extract the per-skill multipliers and use-multipliers from the game settings.
- Skills start at 15 plus race bonuses and cap at 100.
- **Legendary** (patch 1.9): a skill at 100 can reset to 15 and refund its perks [V].

## Maximum level in this game (computed)
Total XP to reach level N from level 1 = 75(N-1) + 12.5(N-1)N.
- Skyrim, 18 skills at 100: about 88,740 skill XP, which gives **level 81** (80 perk points). [V against UESP's 81 and 80]
- This game, 12 skills at 100 from a start of 15: 12 x 4,930 = 59,160 skill XP, which gives **level 66** and **65 perk points** before race starting bonuses.
- Perks available to take: **107 unique, 165 counting every rank.** A level 66 character takes about 39 percent of all ranks, versus about 32 percent in Skyrim, so specialisation still matters. Legendary resets raise the ceiling the same way Skyrim's do.

## Armour [V]
- Damage reduction % = **(displayed armour rating + hidden armour rating) x 0.12**.
- Hidden armour rating = **25 per equipped armour piece or shield** (up to 100 for four pieces, shield counts as a slot).
- Cap: **80% physical damage reduction.** The displayed rating needed to reach the cap is 567 with four armour pieces and no shield, 542 with a shield, and 667 with none.
- Armour reduces **physical damage only**, not magical damage.
- Worked example from UESP (Dragonscale, light armour, maxed): cuirass rating = CEILING[(base + tempering) x (1 + 0.4 x (skill/100))] x perk multipliers. Heavy armour uses the same shape.
- Tempering and Smithing perks raise the base. [X] extract the tempering formula and the Matching Set, Well Fitted, Custom Fit and Agile Defender multipliers.

## Weapon damage [M, X]
- Weapon base damage comes from the tables in `weapons.md`.
- Skill multiplier on damage is about +50 percent at skill 100 (the 1 + skill/200 form). Perks multiply on top (Armsman and Barbarian add 20 percent per rank, five ranks, so +100 percent at the top). [M]
- Power attacks, sneak attacks, critical hits and block values: [X] extract the exact multipliers (for example the dagger sneak multiplier and the backstab perk).
- Enemy armour reduces damage with the same armour formula above.

## Where this game adds numbers Skyrim does not have
Dodge roll, perfect dodge, timed parry, finishers, dismemberment chance, morale, wounds, Rage and Fury are in `DESIGN_BIBLE.md` section 11 and `SYSTEMS_SPEC.md`. They use Skyrim's stamina and damage as inputs.
