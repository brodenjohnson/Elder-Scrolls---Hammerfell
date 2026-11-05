# Tech spike report (Phase 0)

**Decision: PixiJS 8**, with our own world, streaming, depth sorting and game logic on top. The code is in `spikes/tech/`.

## What was tested

One shared world module (`world.js`) feeds three renderers the same work each frame: PixiJS 8.22 (WebGL), Phaser 3.90 (WebGL) and plain Canvas2D.

- **The world:** two 128 by 128 tile slices made from noise, with every terrain type and transition overlay, about 600 props and houses per slice, and a road.
- **Streaming:** the ground is built into 16 by 16 tile chunks (one canvas each, object shadows baked in) only around the camera. Missing chunks are built at up to two per frame. Least-recently-used chunks are dropped above 30.
- **Characters:** each character frame is composed once from its layers (Canvas2D, for the source-atop cast shadows) and reused as one texture. Characters walk in three outfits, in eight directions, at 10 fps.
- **Depth sorting:** props, houses and characters are sorted by ground depth every frame.
- **The run:** the camera pans back and forth across the slice boundary for 15 seconds after a one-second warm-up. It ran with 20, 50, 100 and 300 characters on screen, in a real (headed) Chromium window with the frame-rate cap off.
- **Hardware:** this PC (RTX 4060 Ti through Direct3D 11), then again with the CPU slowed six times through DevTools, to stand in for a modest laptop.

Results are in `spikes/tech/results.json` and `results-cpu6x.json`. Screenshots are in `docs/spikes/tech/`.

## Results

Frames per second (uncapped), and the slowest 1% of frames:

| Renderer | 20 | 50 | 100 | 300 | Slowest 1% at 100 | JS heap |
|---|---|---|---|---|---|---|
| **This PC** | | | | | | |
| PixiJS | 1,864 | 1,640 | 1,466 | 1,804 | 1.3 ms | 13 to 16 MB |
| Phaser | 3,358 | 3,167 | 2,515 | 1,444 | 0.9 ms | 115 to 122 MB |
| Canvas2D | 2,253 | 1,334 | 991 | 467 | 12 ms | 5 to 9 MB |
| **CPU slowed 6 times** | | | | | | |
| PixiJS | 221 | 192 | 165 | 108 | 23.8 ms | 9 to 11 MB |
| Phaser | 212 | 179 | 154 | 143 | 33.5 ms | 117 to 129 MB |
| Canvas2D | 146 | 126 | 97 | 58 | 42.3 ms | 4 to 5 MB |

Streaming (50 characters):

| | This PC | CPU slowed 6 times |
|---|---|---|
| Asset load (tiles, props, three sprite sheets) | 250 to 340 ms | 0.9 to 1.1 s |
| Generate one 128 by 128 slice | 2 to 9 ms | 17 to 53 ms |
| Build one ground chunk | 1.3 ms average, 12 ms worst | 14 ms average, 86 ms worst |
| Compose one character frame | 0.2 ms | 2 ms |
| Texture memory (30 chunks, 192 character frames) | about 95 MB | |

## Why PixiJS

- **Steadiest frames:** the slowest 1% stays near 1 ms on this PC at every crowd size, and it leads on the slow CPU up to 100 characters.
- **Light:** about 10 to 16 MB of JS heap against Phaser's 115 to 130 MB.
- **It is a renderer, not a framework.** Our isometric world, streaming, sorting, combat and data loading are our own code either way. The spike's world module runs unchanged under all three renderers, which also keeps game logic testable without a GPU through `window.__game`.
- Phaser's extras (physics, scenes, tweens, input) would mostly sit unused. Its average frame rate was higher on the fast PC, but every renderer is far above 60 fps there, so the steadier, lighter one wins.
- Canvas2D is the simplest, but it falls to 58 fps with 300 characters on the slow CPU, and has the worst stutter.

## Problems found, to fix in Phase 1

1. **Stutter when new ground appears.** The worst frames (100 to 350 ms on the slow CPU) come from building chunks and uploading them to the GPU. The fix: build chunks ahead of the camera in a worker (OffscreenCanvas), one per frame at most, and prebuild the next slice's border.
2. **Texture memory.** At about 2.2 MB each, 30 cached chunks are about 67 MB. Use smaller chunks (8 by 8 tiles) or a tighter cache, and share body layers between outfits in the sprite sheets.
3. **Tall-object sorting.** Sorting by anchor depth is right for people and small props. Large buildings need their footprint split (or sorted by their front edge), or a character beside a house can be drawn on the wrong side of it.
4. **Slice size 128 by 128 is fine.** A slice generates in under 10 ms here and under 60 ms on the slow CPU, so the bible's PROPOSED size can stand.
