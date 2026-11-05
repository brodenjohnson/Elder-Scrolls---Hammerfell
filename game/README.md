# The game

TypeScript, Vite and PixiJS 8 (chosen in the Phase 0 tech spike, `docs/TECH_SPIKE_REPORT.md`).

```
npm install
npm run assets     # copy exported art and world data into public/ (after building art/)
npm run dev        # http://localhost:5173
npm test           # builds, then runs the regression list (tests/) in Chromium
npm run release -- patch "what changed" --push
```

## How it fits together

- `src/world/map.ts`: the master map (`data/world/slices.json`), 12 by 9 slices of 128 by 128 tiles. Tile coordinates (a, b): a runs east (screen down-right), b south (screen down-left).
- `src/world/terrain.ts`: ground material and props for any tile, worked out from the slice's biome and the position alone (deterministic noise), so nothing needs storing and the worker agrees with the game. Thing ids are stable per slice for saved state.
- `src/world/streamer.ts`: keeps the 3 by 3 slices around the player loaded and holds per-slice saved state (smashed things).
- `src/render/chunkWorker.ts`: builds 16 by 16 tile ground chunks (tiles plus transition overlays) on an OffscreenCanvas in a Web Worker.
- `src/render/renderer.ts`: PixiJS layers (ground chunks, shadows, depth-sorted things and people), composed character frames, chunk cache (48, least recently used).
- `src/game.ts`: movement, collision (footprints: boxes for houses and ledges, circles for props; deep water blocks), depth sorting by footprint, smashing, saving.
- `src/save/save.ts`: versioned saves in localStorage. Bump `SAVE_VERSION` and add a migration for any change to saved data.
- `src/systems/`: the Phase 2 systems. `character.ts` (skills on Skyrim's curves, levels, perks through entry points, inventory and equipment), `reputation.ts`, `dialogue.ts` (conversations as data in `public/data/dialogue/`), `data.ts` (the data pack in `public/data/game/`, built by `npm run data`).
- `src/combat/combat.ts`: melee (Phase 3): fighters, the damage rules from the data pack and the player's character, block, parry, roll, perfect dodge, bandit AI, blood. Encounters are data: `public/data/encounters.json`.
- `src/ui/panels.ts`: character sheet (C), inventory (I), dialogue.
- `src/main.ts`: HUD, newer-version notice, and `window.__game`, the debug handle tests use.

## Releasing

1. Add the player-facing entry to the top of `CHANGELOG.md` under the new version.
2. `npm run release -- minor "summary" --push`: bumps `VERSION`, runs the type check and the regression list, commits, tags and pushes.
3. The `Deploy game` workflow builds and publishes to GitHub Pages. Running copies see the new `version.json` and show a notice.
