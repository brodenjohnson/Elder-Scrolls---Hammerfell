# Changelog

Newest first. Each release says what changed for the player, and any save changes.

## 0.1.0 (2026-11-05): engine core

- The Sentinel Coast and the whole master map as walkable slices, made from each slice's biome: coastal grassland, desert, badlands, highlands, jungle and sea, with wandering borders, beaches and shallows.
- Only the 3 by 3 slices around you are loaded; ground is built in the background, so crossing a slice border does not stall.
- Settlements where the map names a location, and props by biome.
- Walk (WASD) and run (Shift). Houses, rocks, palms and props are solid; deep water stops you; shallow water slows you.
- Smash barrels, crates and jars (E). Each slice remembers what you smashed.
- Saving (F5) and loading (F9). Saves are versioned (save version 1) and older saves are migrated.
- A notice when a newer version has been published.
