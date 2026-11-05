# Changelog

Newest first. Each release says what changed for the player, and any save changes.

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
