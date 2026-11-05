# Art spike report (Phase 0)

All six character gates are done, plus samples of the other main asset types. The art is code-drawn: one generator in `art/`, kept apart from game code. The game will read only PNG sheets and JSON atlases.

## Verdict

The pipeline works, and the art is usable as real placeholder art, in the same family as the concept images but clearly simpler. It is strongest on hard shapes (armour, weapons, buildings, props) and weakest on faces, cloth and animation. Measured against concept-05 reduced to our 120 px height, the concept still holds more detail in every area: highlights, worn edges, a cloak, and a face with expression.

My recommendation stands: keep this pipeline for structure (layers, eight directions, lighting, animation, dismemberment) and add painted detail on top later, by hand or from an artist painting over the generated frames. Nothing in the game code needs to change when that happens.

## What was built

| Gate | Result | Screenshot |
|---|---|---|
| 1. Style frame | Redguard farmer, 119 px, 20 layers plus shadow | `docs/gates/gate1/style-frame.png` |
| Samples | 11 tiles, 48 transitions, a house, 13 props, a wolf, a palette-swapped Nord, 3 icons, a scene | `docs/gates/samples/` |
| 2. Eight-direction idle | 6-frame breathing loop, all layers, every direction drawn (no mirroring) | `docs/gates/gate2-3/` |
| 3. Walk | 8 frames, planted feet, leg IK, arm swing | `docs/gates/gate2-3/` |
| 4. Equipment swap | Farm Clothes; Leather Armor and Iron Sword; Steel Armor and Steel Greatsword | `docs/gates/gate4/equipment-swap.png` |
| 5. Dismemberment | Head and right arm severed, stumps, blood, parts tumbling | `docs/gates/gate5/dismemberment.png` |
| 6. Combat | Quick attack (6 frames), block (4), dodge roll (8), leather set | `docs/gates/gate6/combat.png` |

The viewer (`art/viewer/index.html`) plays every sheet with a turntable, play and pause, layer toggles, scale and ground.

## Numbers

- **Frames rendered:** 480 (three outfits; idle and walk for all, attack, block and roll for the leather set), in about 33 minutes on this PC's 12 threads.
- **Render cost per frame:** farm clothes 8 s on one core; leather about two and a half times that; steel about three and a half times. Faster than gate 1 (29 s) by bounding the body queries, dropping `Math.hypot` and using a worker pool.
- **Sheets:** 9 sheets, 1024 px wide, 4.7 MB of PNG in total. About 33 MB of video memory if all nine are loaded at once.
- **Layers per frame:** 18 to 30 layer pieces, plus a cast-shadow piece per layer that shades another.
- **Mirroring:** 79% of figure pixels differ between W drawn directly and E mirrored. Not used.
- **Colours:** about 60 per character frame.

## Decisions made (logged in `DESIGN_BIBLE.md`)

- Characters at a 12 degree camera, ground and buildings at true 30 degree isometric.
- World kept at 12 tiles per Skyrim cell (about 1 km by 0.8 km at character scale).
- All eight directions drawn, none mirrored.

## Weak spots

1. **Faces** read as a mask. Needs painted detail.
2. **Animation** is stiff: no torso twist in the walk, no follow-through, the roll is a turning ball.
3. **Wounds** barely show at the 12 degree camera; the stumps are thin red edges. Bigger blood spray and decals would sell it more than the geometry does.
4. **Cloth** is shaped by the body underneath, so there is no loose drape, no cloak and no tattered edges yet.
5. **The wolf** is one solid with no skeleton, so it cannot animate yet.
6. **Video memory:** each outfit repeats the body layers under the armour. Before many NPC outfits, the sheets should share body layers across outfits.

## Next

1. Tech spike: load these sheets into PixiJS, Phaser 3 and a plain canvas renderer, stream the sample scene with 20 to 50 animated characters, and measure frame rate, memory and load times. Pick the engine.
2. Combat-feel arena in the chosen engine, with these sprites and the bible's starting numbers.
3. Skyrim data, exported from Broden's copy of `Skyrim.esm` once it is downloaded.
4. The open questions in bible section 16, then Phase 1.
