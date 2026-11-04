# Skyrim Reference Data Pack v0.1

**Rule (LOCKED by Broden):** every stat, skill, perk, weapon, armour piece, material and enemy uses **Skyrim's own numbers**. Where this game needs something Skyrim does not have (dodge roll, parry window, finishers, Rage, Hammerfell-native enemies), the numbers come from `DESIGN_BIBLE.md` and are built to sit beside Skyrim's.

Baseline: Skyrim Special Edition, vanilla values, with the Unofficial Skyrim Patch corrections where UESP notes them.

## Verification tags used in every file here
- **[V]** Verified against UESP or a mirror of it during the design session.
- **[M]** From memory or a secondary source. Plausible, but check before building.
- **[X]** Not captured yet. Extract in Phase 0.

## What was cut because magic is off for the player
Alteration, Conjuration, Destruction, Illusion, Restoration and Enchanting are removed as skills. Spell tomes, staves, scrolls, soul gems, enchanting tables, enchanted gear effects and the Magicka attribute are not in the player's game. Enchanted unique items keep their non-magical stats only. Dragon content (Dragon Armor, dragonbone, dragonscale, shouts) is excluded.

## Phase 0 task for Claude Code: finish this pack
1. **Best source, if Broden owns Skyrim SE:** export the real records with xEdit (SSEEdit) from `Skyrim.esm` to JSON: weapons (WEAP), armour (ARMO), ammo (AMMO), perks (PERK), races (RACE), creatures and NPC templates (NPC_), spells used by NPCs (SPEL), leveled lists (LVLI, LVLN), game settings (GMST). This gives exact numbers with zero transcription error. Ask Broden before assuming it is allowed on his machine.
2. **Fallback:** extract the tables from UESP (en.uesp.net) or its mirrors (content1.uesp.net, content1.m.uesp.net) with the page list in `SOURCES.md`. Note that en.uesp.net blocked an automated fetch during design. The mirrors worked for some pages.
3. Store results as JSON in `data/skyrim/json/` with one file per record type. Keep the tags: each row has `source` and `verified` fields.
4. Spot-check ten random rows against the wiki before trusting the import. List the checks in the Phase 0 report.
5. Write a loader and a test that fails if any item used in game content is missing from the pack.

## Files
- `formulas.md` leveling, perks, armour, damage and other formulas.
- `weapons.md` weapons by class and material.
- `armour.md` armour by set and slot, material availability, smithing unlocks.
- `races.md` ten races, vanilla bonuses, and the non-magic adaptation.
- `perks.md` the 12 retained trees (names, ranks, counts) with the One-handed tree fully captured.
- `bestiary.md` Skyrim creature roster, level bands, Hammerfell natives and NPC magic-user archetypes.
- `SOURCES.md` pages to extract from.
