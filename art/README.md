# Character art pipeline

Code-generated, layered pixel-art sprites. Kept apart from game code: the game will only ever read the exported PNGs and JSON atlases, so better art can replace these files later with no code changes.

## Run

```
cd art
npm install
npm run gen                     # player style frame to art/out/gate1/ (not committed)
npm run sprites                 # player idle and walk, 8 directions, sheets and atlases to art/out/sprites/ (about 3 min)
npm run sprites -- walk         # one animation only (attack, block and roll are drawn for the leather set)
npm run dismember               # gate 5: head and arm severed, tumbling, to docs/gates/gate5/
npm run samples                 # tiles, building, props, figures, icons, scene to art/out/samples/ (about 5 min)
npm run samples -- house scene  # redo only some parts; the rest are read back from the last run
node compare/shoot.mjs gate1    # comparison sheet to docs/gates/gate1/
node compare/shoot.mjs samples asset-samples.png
```

To look at the art, open `viewer/index.html` (sprites: turntable, play, layers, scale), `compare/sprites.html`, `compare/gate1.html` or `compare/samples.html` in Chrome or Edge after a render. Committed screenshots are in `docs/gates/`.

## How it works

- `data/palettes.json` holds every colour: material ramps (dark to light), the light direction, outline, ground shadow and cast shadow settings.
- `data/rig.json` holds the sprite cell, the material to ramp map per race (a race swap is a palette swap), and the layer draw order.
- `generator/src/` builds the figure from signed distance shapes, then raymarches each layer separately:
  - **One continuous body**, split into detachable segments (head, torso, upper arms, forearms with hands, legs, feet) by which segment's own shapes are nearest. Joints shade seamlessly and the split lines fall in the creases.
  - **Garments** are one surface each, shared out over the segments they cover. A detached arm takes its sleeve with it.
  - **Shading:** 4 by 4 supersampling decides coverage, normal and material. Light is fixed to the screen (top-left) and quantised to the material ramp. Then a lone-pixel clean-up, selective outlines (near-black on the shadow side, the material's darkest tone elsewhere), and 1 by 2 px cast shadows where one layer sits clearly in front of another.
- **Camera:** the ground grid is true isometric (30 degree pitch, 64 by 32 tiles). Characters are drawn at a shallower 12 degree pitch so faces and chests read, as the concept scenes do. 134 units at 0.88 px per unit gives a figure 119 px tall.

## Tiles, objects and scenes

- **Ground tiles** (`ground.ts`): 64 by 32 diamonds shaded from a height field with the same light and ramps. All noise wraps once per tile, so tiles join seamlessly. Variants keep their extra details (stones, shells, flowers) away from the edges.
- **Transitions** are overlays, not blended tiles. Materials have a priority (`samples.ts`, `PRIORITY`). A tile draws each higher neighbour's edge (a0, a1, b0, b1) or corner (a0b0 and so on) over itself. Eight overlays per material cover every case, inner corners included. The beach overlay adds wet sand and foam when drawn over water.
- **Objects** (`objects.ts`): buildings, props, creatures and icons use the character's shapes and renderer at the true 30 degree pitch, turned 45 degrees to sit on the grid. Ground shadows are cast by marching toward the sun (`groundShadowSun` in the palette file). Each object exports the full sprite, the body alone and the shadow alone. Scenes lay every shadow down first, so shadows never darken another object.
- **Scale:** a tile edge is about 51 units, or 0.69 m, at the character's scale.

## Sprite sheets and atlases (`sprites.ts`, `frames.ts`)

- Frames render in parallel on worker threads (one per core, less one). One frame is about 8 s on one core; the 112 frames of idle and walk take about 3 minutes.
- Each frame is exported as separate layer pieces, trimmed and packed into one 1024 px wide sheet per outfit and animation (`farm_idle.png`, `farm_walk.png`).
- The atlas (`farm_idle.json`, and a `.js` copy for file://) records, per `facing/frame`: the draw order and, for every piece, its place in the sheet (`sx, sy, w, h`), its offset in the 192 by 192 cell (`x, y`), its `kind`, `segment` and `slot`. The cell anchor (`ox, oy`) is the point between the feet.
- **Cast shadows travel with their caster.** A piece `id#shade` is drawn just before layer `id`, composited `source-atop`: black at 97 alpha darkens what is already drawn by the palette's multiply factor. Hide or detach a layer and its shadow goes with it.
- **Animation poses** (`pose.ts`): idle breathes over 6 frames at 5 fps. Walk is 8 frames at 10 fps, with feet planted and sliding, two-bone leg IK, a pelvis dip at each double support and arms swinging against the legs.
- **Texture follows the limb.** Each segment maps surface points back to its rest pose before texture is looked up, so cloth grain does not crawl between frames.

### Draw order

Worked out per frame from where the limbs are (`segmentOrder` in `frames.ts`), back to front:

1. ground shadow;
2. back item (cloak, quiver) if he faces the viewer;
3. any arm well behind the torso (the far arm in side and three-quarter views), forearm then upper arm;
4. legs, far first, each followed by its foot (boots overlap trousers);
5. torso (the shirt skirt hangs over the thighs);
6. back item if he faces away;
7. remaining arms, far first, forearm then upper arm (the sleeve overlaps the elbow);
8. head, then off hand and main hand.

Within a segment, slots stack in slot order (below). The exact order for every frame is in the atlas.

### Mirroring: not used

Tested by mirroring E to stand in for W: 79% of figure pixels differ. Mirroring moves the light to the top right, and puts the brand, pouch and parting on the wrong side. Rendering all eight directions costs only machine time and about 1.6 times the sheet space of five, so every direction is drawn directly.

## Equipment (`equipment.ts`, `data/outfits.json`)

- Three outfits: Farm Clothes; Leather Armor, Leather Bracers, Leather Boots and an Iron Sword; Steel Armor, Steel Gauntlets, Steel Shin Boots and a Steel Greatsword. Names are Skyrim's. Stats in `data/outfits.json` are copied from `data/skyrim/` as labels only.
- Armour reuses the shirt and trousers underneath and adds its own garment layers: cuirass (`torso/armour`), pauldrons (`upperArm.*/armour`), bracers or gauntlets (`forearm.*/gloves`), boots or greaves (`leg.*/boots`, `foot.*/boots`). Each detaches with its segment.
- Weapons are a layer on `mainHand`, drawn last. Their occluders are every worn surface, so a blade hides where the body or armour is in front of it and shows where it is not. The one-handed sword follows the forearm, or the blade direction the animation sets. The greatsword is carried on the right shoulder; the outfit poses the right arm for it.

## Combat animations (`combat.ts`)

- Quick attack (6 frames, 14 fps), block (4 frames, 8 fps) and dodge roll (8 frames, 14 fps), drawn for the leather set.
- Attack and block are keyframed hand positions and blade directions over a fighting stance, with the elbows found by IK and a twist of the shoulders.
- The roll tucks the figure and turns it whole (`pose.root`), so every shape turns with it; draw order follows where the joints end up.

## Dismemberment (`dismember.ts`)

- A severed segment's layers are drawn on their own, turned and moved with `moved()` in `character.ts`.
- Cut faces are hidden while attached. Once a neighbour is severed, `layer.wound` paints them: flesh with bone at the joint on the body, a darkened edge on cloth and leather.
- Blood goes on the outermost surface (`equipBlood` slot) and on the ground as pools.

## Layers

Layer ids are `segment/slot`. Slots stack within a segment in this order: body, scar, blood, facialHair, hair, clothes, armour, gloves, boots, helmet, weapon, equipBlood.

Segment draw order: see Draw order above.

## Known limits

- About 8 s to render one character frame on one core (3 minutes for idle and walk in all directions on 11 threads), 90 s for the house.
- Coastlines follow the tile grid in visible steps. A larger transition set or per-pixel blending would smooth them.
- The wolf is one solid, not yet split into detachable segments.
- Cast shadows multiply colours, so the final sprite has some colours that are not in the palette (58 colours in the dressed frame).
