# Changelog

Newest first. Each release says what changed for the player, and any save changes.

## 0.5.0 (2026-11-06): three enemy types, two-handed combat, quests, the farm and the family

- **Bandit marauder.** A Nord in Fur Armor with an Iron Battleaxe, now in the Coast Road camp. Swings slowly (the battleaxe's Skyrim speed, 0.7) and hard, power-attacks often, hardly ever blocks. Two-handed and axe, so its killing blows take parts off more often.
- **Alik'r warriors.** Two of them at the edge of the Alik'r Desert, just north of the bandit camp: Hammerfell garb, hoods wrapped to the eyes, curved scimitars. Skyrim's level 6 Alik'r (85 Health, One-handed 36). They circle, guard often, counter straight after a block, and roll away from power attacks.
- **The Steel set fights.** The Steel Greatsword now has its own two-handed swing and guard, so Steel armour is no longer only for walking.
- Bodies of the new enemies carry bandages.
- Wearing looted Fur Armor or Alik'r clothes draws you in the Leather or farm clothes sprites for now.
- **Morale.** A badly hurt enemy may break and run (bandits most often, marauders hardly ever), more often the more feared you are. Cutting down a runner costs 3 Infamy.
- **Quests and a journal (J).** The settler by the fire has work: clear the Coast Road camp. The tracker in the top right shows what is left to do.
- **The clock.** Time runs at Skyrim's rate (a day is 72 real minutes), shown under the region name. Dawn, dusk and night light the world.
- **Character creation.** Name him on your first visit, or after N for a new game. All ten races are listed with Skyrim's skill bonuses; only the Redguard can be picked until the others are drawn.
- **Gore setting and warning.** A mature content warning on first launch, and Options (O) to turn gore down: off (no blood), some (blood, nothing cut off), or full.
- **Cutscenes.** A short opening plays after you name him; Esc skips.
- **The farm and the family (the prologue begins).** A new game now wakes at the farm on the hill south of the settlement: the house, the well, a goat pen. Nadira, Tavi and Dune are there. Nadira sets the morning chores (water from the well, feed the goats, mend the north fence), Tavi has found a bone, and Dune can be petted, then called to heel (press E again). What you say moves a hidden bond with each of them. The rest of the prologue (the market, Kerrash's visit, the night) comes in later releases.
- **Saves:** save version 4 (quests, the clock, the character's name and the family bond). Older saves load: no quests, the clock set from time played, the name Kasim, and you stay where you saved.

## 0.4.0 (2026-11-06): combat, second part

- **Rage.** The amber bar under Stamina fills as you take and deal damage, more for kills and finishers, and cools after ten quiet seconds. It glows when you can spend it.
- **Fury (Q).** Pain-ignoring burst for 30 Rage: eight seconds where blows do not stagger you and hurt 15 percent less. While Fury burns you cannot parry or sneak and your block is halved; afterwards you are Exhausted (Stamina returns at half rate for 30 s). The other Fury powers unlock as names come off the list; Shift+Q chooses between those you have.
- **Wounds.** A hit of 30 percent of your Health or more bleeds (1 Health a second for 10 s). Some land on the legs and leave a limp (25 percent slower) until bandaged or a game day passes. Enemies bleed and limp too.
- **Bandages (B, or Use in the inventory).** Stop bleeding and bind a limp. Three in the settlement chest.
- **Dismemberment.** A power attack that kills can take off a head, an arm or a leg (a one in four chance with a one-handed sword; more with two-handers and axes, less against heavy armour). The part flies off and stays where it lands, through saving and loading. It can happen to you too.
- **Finishers (F).** On an enemy who is staggered or under a quarter Health, in front of you and in reach: behead them, take the sword arm after a parry, or hamstring and behead from behind. You are open for about a second and a half. Finishers feed Rage.
- Bodies now stay where they fell after loading, instead of going back to their camp.
- Two-handed weapons and axes swing at their Skyrim speed (slower than a sword).
- **Saves:** save version 3. Older saves load and migrate: Rage and wounds start at none, and bodies killed before this version lie at their camp.

## 0.3.1 (2026-11-06): faster loading

- The game starts after loading only the farm clothes. Other outfits and the bandits load the first time they appear (a moment of idle pose at most).
- Every sprite and ground image is now an 8-bit palette PNG: the same pixels, a quarter of the size. Images went from 12.4 MB to 3.1 MB.
- **Saves:** no change.

## 0.3.0 (2026-11-05): combat, first part

- Melee in the world. Left click a quick attack (click again to chain), hold for a power attack, right click to block (a block just before the blow parries), Space to roll (a roll in the last instant is a perfect dodge: time slows and your counter does double).
- Damage uses Skyrim's numbers with your real weapon, skills, perks and armour, multiplied by 3 both ways (bible decision 35): a bandit can kill you in three to five blows, and you can kill one in one or two.
- Fighting trains One-handed, Block and your armour skill.
- A bandit camp on the Coast Road, east of the start: three Nord bandits in leather. They notice you within about eight tiles and give up if you lead them far from camp.
- Hit reactions and deaths. Blood sprays and stays on the ground.
- Search bodies (E) for their gear. The dead stay dead, through saving and loading.
- If you die: F9 loads your last save, N starts again.
- The farmer now carries the sword he has equipped. The Steel set cannot fight yet (no combat frames for the greatsword).
- **Saves:** no format change (still save version 2); the dead and searched are stored as flags.

## 0.2.0 (2026-11-05): systems core

- Twelve skills (no magic), each starting at 15 plus your race's bonuses, levelling by use on Skyrim's own curves. Skill ranks level you up; each level gives a perk point and +10 Health or Stamina, your choice.
- All twelve perk trees from Skyrim, 165 ranks, with Skyrim's requirements and effects (Armsman, Agile Defender and the rest apply to the right weapons and armour).
- Inventory and equipment with Skyrim's items and stats. Wearing Leather or Steel armour changes how you look; armour rating follows your armour skill and perks.
- Reputation: Infamy, Collateral and Standing with each faction.
- Conversations as data, with Speech checks that also train Speech. A settler by the Sentinel Coast fire to talk to.
- The settlement chest holds a Leather and a Steel set, and a Steel Greatsword, to try.
- Sneaking (Ctrl) trains Sneak; opening chests trains Lockpicking; smashing with a weapon trains its skill.
- C for the character sheet, I for inventory.
- **Saves:** save version 2 adds the character, reputation and flags. Saves from 0.1.0 load with the default character.

## 0.1.0 (2026-11-05): engine core

- The Sentinel Coast and the whole master map as walkable slices, made from each slice's biome: coastal grassland, desert, badlands, highlands, jungle and sea, with wandering borders, beaches and shallows.
- Only the 3 by 3 slices around you are loaded; ground is built in the background, so crossing a slice border does not stall.
- Settlements where the map names a location, and props by biome.
- Walk (WASD) and run (Shift). Houses, rocks, palms and props are solid; deep water stops you; shallow water slows you.
- Smash barrels, crates and jars (E). Each slice remembers what you smashed.
- Saving (F5) and loading (F9). Saves are versioned (save version 1) and older saves are migrated.
- A notice when a newer version has been published.
