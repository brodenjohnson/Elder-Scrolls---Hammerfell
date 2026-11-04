# Character art pipeline

Code-generated, layered pixel-art sprites. Kept apart from game code: the game will only ever read the exported PNGs and JSON atlases, so better art can replace these files later with no code changes.

## Run

```
cd art
npm install
npm run gen                     # renders to art/out/ (not committed)
node compare/shoot.mjs gate1    # comparison sheet to docs/gates/gate1/
```

## How it works

- `data/palettes.json` holds every colour: material ramps (dark to light), the light direction, outline, ground shadow and cast shadow settings.
- `data/rig.json` holds the sprite cell, the material to ramp map per race (a race swap is a palette swap), and the layer draw order.
- `generator/src/` builds the figure from signed distance shapes, then raymarches each layer separately:
  - **One continuous body**, split into detachable segments (head, torso, upper arms, forearms with hands, legs, feet) by which segment's own shapes are nearest. Joints shade seamlessly and the split lines fall in the creases.
  - **Garments** are one surface each, shared out over the segments they cover. A detached arm takes its sleeve with it.
  - **Shading:** 4 by 4 supersampling decides coverage, normal and material. Light is fixed to the screen (top-left) and quantised to the material ramp. Then a lone-pixel clean-up, selective outlines (near-black on the shadow side, the material's darkest tone elsewhere), and 1 by 2 px cast shadows where one layer sits clearly in front of another.
- **Camera:** the ground grid is true isometric (30 degree pitch, 64 by 32 tiles). Characters are drawn at a shallower 12 degree pitch so faces and chests read, as the concept scenes do. 134 units at 0.88 px per unit gives a figure 119 px tall.

## Layers

Layer ids are `segment/slot`. Slots stack within a segment in this order: body, scar, blood, facialHair, hair, armour, gloves, boots, helmet, equipBlood.

Segment draw order, back to front:

| Facing | Order |
|---|---|
| S | shadow, back, leg.L, leg.R, foot.L, foot.R, torso, forearm.L, forearm.R, upperArm.L, upperArm.R, head, offHand, mainHand |

The other seven facings are added at gate 2.

## Known limits (gate 1)

- About 30 s to render one frame with all its layers. Needs a speed-up before the eight-direction and animation gates.
- Cast shadows multiply colours, so the final sprite has some colours that are not in the palette (58 colours in the dressed frame).
- Texture uses character-space coordinates. It has to move to segment-local coordinates before animation, or it will crawl.
