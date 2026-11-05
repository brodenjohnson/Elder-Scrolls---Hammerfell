# Changelog

Newest first. Each release says what changed for the player, and any save changes.

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
