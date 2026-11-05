# Phase 0 report

All four Phase 0 spikes are done. Each has its own report with numbers and screenshots.

| Spike | Result | Report |
|---|---|---|
| Art | Code-drawn, layered pipeline. One character in eight directions, three outfits, idle, walk, attack, block, roll, dismemberment; tiles, a house, props, a sample scene. Same family as the concept art, simpler in detail. | `docs/ART_SPIKE_REPORT.md` |
| Tech | PixiJS 8 chosen over Phaser 3 and Canvas2D: steadiest frames, a tenth of Phaser's memory. A streamed two-slice world runs at hundreds of fps even with the CPU slowed six times. | `docs/TECH_SPIKE_REPORT.md` |
| Combat feel | Arena with quick and power attacks, chain, block, parry, dodge roll and perfect dodge on Skyrim's numbers plus one lethality multiplier. Five mechanics tests pass. | `docs/COMBAT_SPIKE_REPORT.md` |
| Data | Skyrim SE exported from the game files: 2,484 weapons, 2,767 armour pieces, 377 perks, 5,120 NPCs and creatures, 1,628 game settings and more. 15 of 15 spot checks match. | `data/skyrim/README.md` |

## Decisions made (bible section 15, items 31 to 35)

Characters at a 12 degree camera on true isometric ground; 12 tiles per Skyrim cell kept; all eight directions drawn; PixiJS 8; slice size 128 confirmed; lethality multiplier 3 (PROPOSED).

## Needed from Broden to close Phase 0

1. Approve the stack (PixiJS 8) and the art direction (code-drawn now, painted detail later).
2. Play the combat arena and say what feels wrong.
3. Make the GitHub repo private, so the Skyrim export can be committed.

## Phase 1 (engine core), once approved

TypeScript project for the game itself, separate from `art/` and `spikes/`: the PixiJS renderer from the spike with chunk building moved off the main thread, movement and collision, 3 by 3 slice streaming with per-slice saved state, a versioned save system with migrations, `window.__game` debug hooks, a Playwright regression list, and the release flow (VERSION, CHANGELOG, GitHub Pages, newer-version notice). Done when a seamless two-slice walk works, saves and loads.
