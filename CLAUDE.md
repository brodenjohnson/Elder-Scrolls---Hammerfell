# Project guide for Claude

A mature 2D isometric open-world RPG for the browser, in the mould of Skyrim, set in Hammerfell about 4E 201 with our own story. Working title TBD. Hobby project by Broden Johnson (Gold Coast, Australia), built with Claude in VS Code.

## Start here
1. Read `DESIGN_BIBLE.md` in full. It is the source of truth. LOCKED items are decisions. PROPOSED items are defaults you may refine with reasons. OPEN items need Broden's answer before you build anything that depends on them. Section 16 lists what is still to cover.
2. Read `MAIN_QUEST.md` (main quest beat sheet and dialogue), `GUILDS.md` (four faction questlines), `SYSTEMS_SPEC.md` (all decided systems), and `WORLD_MAP.md` with `reference/master-map-v0.png`. They are PROPOSED content that Broden is still refining.
3. Read `data/skyrim/README.md`. **All stats, skills, perks, gear, armour, weapons and enemies use Skyrim's own numbers.** The player has no magic. NPCs can use magic with Skyrim spell numbers. Rows tagged [X] in that folder are not captured yet.
4. Look at `reference/concept-art/` for the target visual style. These are concept images, not game assets. Add the art brief text as `docs/ART_BRIEF.md` if it is not there yet.
5. Do not start building until Broden approves Phase 0 (section 14 of the design bible).

## How we work
- Australian English. Plain, a little dry. No emojis. No em dashes. Never use the words "genuinely" or "honestly".
- Challenge scope creep and overextension. If a request would spread the project too thin, say so and propose an order.
- Broden decides direction. You may reorder the roadmap and overrule suggestions where you have a good reason, and you say why.
- Build in small, tested increments. After each feature, run the regression tests, then release. Say plainly what you did and did not do.
- Keep `DESIGN_BIBLE.md` and this file up to date. When a decision changes, edit the bible and add a line to its decisions log.

## Technical rules (carry-over from an earlier project, adapt to the chosen stack)
- Everything content-like is data: items, perks, skills, quests, dialogue, enemies, places, factions. Code reads data.
- Testability first. Expose a debug handle (for example `window.__game`) so Playwright tests can drive and inspect the game. Write a test for each feature. Keep a regression list and run it before every release.
- Save compatibility is non-negotiable. Use a versioned save schema with explicit migrations. Never break an old save without saying so first. Never rename an item or change saved data without a migration.
- Stream only the slices around the player (3 by 3). Keep per-slice saved state.
- Keep the art pipeline separate from game code so art can be swapped without code changes.
- Release flow: `VERSION` file, `CHANGELOG.md`, a release script, GitHub Pages hosting, and an in-game notice when a newer version is published.
- Player magic is deferred, not blocked. Keep attributes, skills and equipment slots extensible. NPC magic is in from the start.
- Skyrim numbers are data. Load from `data/skyrim/json/`, never hard-code.
- Use `data/world/slices.json` as the source for the map. Rerun `data/world/build_map.py` after editing the grid.

## Phase 0 (first job, after Broden approves)
Four spikes, then a short report with numbers and screenshots:
1. **Tech:** isometric renderer with depth sorting and a layered character on a streamed two-slice map. Measure frame rate, memory and slice-load time. Include headless test hooks. Recommend a stack (PixiJS, Phaser 3 or a thin custom canvas renderer) with evidence.
2. **Art:** one character in eight directions with swappable equipment layers, a coastal and a desert tileset, one town building and a sample scene at target resolution. Compare side by side with the concept art and say plainly how close it is.
3. **Combat feel:** a bare arena with attack, dodge and block, using the numbers in section 11 of the bible as starting values.
4. **Data:** finish `data/skyrim/`. First ask Broden whether you may export records from his copy of `Skyrim.esm` with xEdit (best accuracy). If not, extract from UESP or its mirrors. Import to JSON in `data/skyrim/json/`, write a loader, and spot-check ten rows. Report any numbers you could not confirm.
Then ask Broden the blocking questions in section 16 of the bible before Phase 1.

## Status (keep current)
- Phase 0 done and approved (2026-11-05): reports in `docs/` (PHASE0, ART_SPIKE, TECH_SPIKE, COMBAT_SPIKE).
- Phase 1 engine core: `game/` (TypeScript, Vite, PixiJS 8), released as 0.1.0. Run `npm test` in `game/` before every release; release with `npm run release`.
- Phase 3 combat, first part, released as 0.3.0: melee against the Coast Road bandit camp (`game/src/combat/`). Still to do in Phase 3: Rage and Fury, more enemy types, wounds and limp, dismemberment in the world, finishers.
- Phase 2 systems core released as 0.2.0: skills, perks, inventory and equipment, reputation, dialogue (`game/src/systems/`). Game data pack: `game/public/data/game/`, built by `npm run data` from the Skyrim export.
- Art pipeline: `art/` (code-drawn sprites). The game reads only exported PNG and JSON, copied in by `game/scripts/assets.mjs`.
- Skyrim numbers: `data/skyrim/json/`, exported from Broden's game (`data/skyrim/extract/`), kept out of git; the game's subset (`game/public/data/game/`) is committed (Broden is fine with the repo being public).
