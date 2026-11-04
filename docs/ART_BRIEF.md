# Art Brief v1.0 (The Ashen Warden)

Source: Broden's consolidated art direction brief, with the concept images in `reference/concept-art/`. Text kept as supplied, apart from em dashes replaced with colons.

**Where this brief and `DESIGN_BIBLE.md` disagree, the bible wins.** Known differences:
- Camera: the brief says avoid strict isometric. The bible (section 4.1, LOCKED) says true isometric on a 64 by 32 diamond grid.
- Engine: the brief lists Godot, Unity, Unreal and GameMaker. The bible (section 5) says browser, TypeScript, with the renderer decided by the Phase 0 tech spike.
- The Ashen Warden is a style reference only. The player character is the Redguard farmer from `MAIN_QUEST.md`.
- The player has no magic, so no mana bar or casting for the player.

---

## Game Art Direction & Asset Production Brief

Document: Master Art & Visual Development Specification
Version: 1.0
Status: Initial direction established
Genre: Open-world fantasy RPG
Visual Style: High-detail, atmospheric pixel art
Camera: 2D three-quarter / isometric-style perspective

## 1. Project vision

### 1.1 Overview

The game is envisioned as a fantasy RPG inspired by the exploration, worldbuilding, character progression, equipment systems, and sense of adventure found in games such as The Elder Scrolls.

The game will use a fully 2D, high-detail pixel-art presentation, with a three-quarter perspective camera.

The objective is to combine the scale and atmosphere of a traditional fantasy RPG with the visual charm and detail of handcrafted pixel art.

The world should feel expansive, immersive, dangerous, and alive.

Players should be able to explore forests, mountains, villages, ancient ruins, castles, caves, dungeons, and other distinctive locations while encountering NPCs, enemies, resources, quests, equipment, and environmental discoveries.

The art direction must support a cohesive experience across every aspect of the game.

### 1.2 Core creative vision

The central creative principle is: **A beautiful world with dangerous places.**

The game should not be uniformly dark or depressing. Instead, it should feature:

- Beautiful natural landscapes.
- Bright and welcoming settlements.
- Atmospheric forests and wilderness.
- Ancient civilizations and architecture.
- Mysterious magical locations.
- Dark underground environments.
- Dangerous dungeons and abandoned castles.
- Visceral, bloody combat.
- Detailed characters and equipment.
- Rich environmental storytelling.

The contrast between beautiful exploration and dangerous encounters is an important part of the game's identity.

## 2. Art direction

### 2.1 Primary visual style

The game will use detailed, realistic-proportioned pixel art.

The initial visual reference is a detailed medieval fantasy character wearing weathered steel armour, layered leather, a distinctive dark teal cloak, and carrying a worn sword.

The desired rendering style includes:

- High-density pixel clusters.
- Detailed character faces and expressions.
- Realistic medieval armour construction.
- Distinctive metal, leather, fabric, wood, stone, and bone textures.
- Detailed highlights and shadows.
- Strong silhouettes.
- Natural and atmospheric colour variation.
- Carefully controlled lighting.
- Minimal reliance on smooth gradients.
- No blurry or artificially smoothed pixel-art scaling.

The art should feel handcrafted rather than procedurally generic.

### 2.2 Visual influences

**The Elder Scrolls:** fantasy worldbuilding; exploration and discovery; diverse environments; medieval settlements; distinctive factions and cultures; ancient ruins and mysterious locations; equipment and character progression.

**Detailed fantasy pixel art:** high-detail character sprites; intricate armour and weapons; detailed environment tiles; expressive animation; rich textures; strong visual readability.

**Dark medieval fantasy:** weathered equipment; battle damage; blood and gore; ancient architecture; dangerous creatures; ruined and abandoned locations.

The result should be recognizable as its own game rather than a direct imitation of any existing title.

## 3. Camera and presentation

### 3.1 Camera perspective

Confirmed decision: three-quarter perspective with an isometric-style presentation. The game will be fully 2D.

The camera should:

- Show the character from a three-quarter overhead perspective.
- Display enough of the character to appreciate equipment and animation.
- Show environmental depth and surrounding scenery.
- Support exploration and directional combat.
- Make buildings, trees, cliffs, and other objects feel dimensional.
- Allow characters to move naturally around environmental objects.

We should avoid enforcing mathematically strict isometric projection unless required by the eventual engine implementation. (Superseded: the bible locks true isometric.)

The priority is a visually convincing three-quarter perspective that works well for RPG gameplay.

### 3.2 Character presentation

Characters should be immediately recognizable from the gameplay camera. Important equipment must remain visible at gameplay scale.

The player should be able to distinguish: different armour types; helmets and headgear; weapons; shields; cloaks and clothing; enemy types; NPCs and hostile characters.

The camera and character scale must be tested early to ensure the detail remains readable.

## 4. Colour palette and lighting

### 4.1 Core colour philosophy

The palette should be grounded in natural colours, with darker tones reserved for appropriate environments and materials.

| Material / Category | Colour direction |
|---|---|
| Steel | Cool grey, silver, charcoal |
| Leather | Dark brown, warm brown, aged tan |
| Cloth | Teal, navy, burgundy, muted earth tones |
| Wood | Warm brown, dark oak |
| Stone | Grey, slate, sandstone |
| Nature | Emerald, olive, forest green |
| Magic | Blue, cyan, violet, occasional green |
| Blood | Deep crimson, dark red |
| Gold | Aged gold, bronze |

### 4.2 Environment lighting

Lighting should vary according to location and time of day.

- **Bright environments:** warm sunlight; natural shadows; blue skies; rich vegetation; atmospheric distance; clear visibility.
- **Forests:** dappled sunlight; dense foliage; mist and atmospheric depth; natural variations in vegetation.
- **Dungeons:** deep shadows; torchlight; firelight; cold stone; restricted visibility; subtle atmospheric effects.
- **Caves:** dark stone; glowing minerals; underground water; bioluminescent vegetation where appropriate; small sources of environmental light.
- **Cursed regions:** desaturated colours; heavy fog; unusual vegetation; corrupted structures; unnatural lighting.

The lighting direction and material rendering must remain consistent across assets.

## 5. Character design

### 5.1 The Ashen Warden

The Ashen Warden is our initial reference character and master design for the game's character art. This is a working character identity that establishes the visual standard for future player characters, NPCs, and enemies.

**Physical appearance:** male medieval fantasy warrior; approximately 1.8 metres tall; rugged, weathered appearance; dark, slightly messy hair; beard and facial stubble; scarred and battle-worn face; strong, realistic proportions.

**Equipment:** tarnished steel plate armour; exposed chainmail; layered leather protection; heavy leather belt and pouches; dark teal tattered cloak; steel knee and shoulder protection; worn leather boots and gloves; longsword with a weathered blade.

**Character personality conveyed through art:** the Warden should look experienced, capable, and battle-hardened. He should feel like a survivor who has travelled through dangerous lands rather than a pristine fantasy hero. Equipment should communicate history, use, and progression.

### 5.2 Character production sheets

Every major character should eventually have a standardized reference sheet containing:

1. Full front view.
2. Full rear view.
3. Side view.
4. Three-quarter view.
5. Head and facial details.
6. Equipment breakdown.
7. Colour palette.
8. Scale reference.
9. Animation reference.
10. Equipment variations.

The Ashen Warden will serve as the first template.

### 5.3 Character classes

The initial character-class visual library should accommodate: Warrior; Ranger; Mage; Priest; Barbarian. These are proposed initial archetypes rather than a finalized gameplay class list. Each class should have recognizable equipment, silhouettes, clothing, and visual characteristics.

## 6. Modular equipment system

A major priority is making character equipment visually interchangeable. Where practical, equipment should be separated into reusable visual layers.

### 6.1 Equipment categories

- **Head:** helmets; hoods; hats; circlets; masks; hair and facial accessories.
- **Body:** cloth clothing; leather armour; chainmail; plate armour; robes; chest pieces.
- **Shoulders:** shoulder plates; leather guards; cloth coverings; decorative accessories.
- **Hands and arms:** gloves; gauntlets; arm guards; bracers.
- **Legs:** trousers; leg armour; greaves; knee protection; boots.
- **Back:** cloaks; capes; quivers; backpacks; scabbards.
- **Weapons:** swords; axes; daggers; spears; bows; staves; two-handed weapons.
- **Off-hand equipment:** shields; secondary weapons; magical items.

### 6.2 Equipment design principles

Every equipment item should: have a recognizable silhouette; use consistent pixel density; have appropriate material textures; match the game's lighting direction; fit the character's established proportions; be readable at gameplay resolution; support visual progression.

Equipment rarity and quality can eventually be represented through design differences, materials, ornamentation, and colour accents.

## 7. Animation standards

The character animation system should support eight-direction movement: North, North-east, East, South-east, South, South-west, West, North-west.

Animation frames must use consistent dimensions, character positioning, and attachment points.

### 7.1 Initial animation library

- **Movement:** idle; walking; running; turning.
- **Combat:** weapon draw; light attack; heavy attack; combo attacks; blocking; dodging; hit reaction; stagger; death.
- **Other:** casting; interacting; gathering resources; opening containers; using consumables.

### 7.2 Initial animation frame targets

Starting targets, to be adjusted through testing.

| Animation | Initial frame target |
|---|---|
| Idle | 6 to 8 |
| Walk | 8 |
| Run | 8 to 10 |
| Light attack | 6 to 8 |
| Heavy attack | 8 to 12 |
| Block | 4 to 6 |
| Dodge | 6 to 8 |
| Hit reaction | 4 to 6 |
| Death | 8 to 12 |

Animation quality and readable movement take priority over maximizing frame counts.

## 8. Environment art

The world should be built from reusable environmental assets and tilesets. It must support a wide variety of locations without losing visual consistency.

- **8.1 Wilderness:** grass; dirt; mud; forest floors; trees; bushes; flowers; ferns; rocks; cliffs; rivers; waterfalls; lakes; fallen trees; logs; fences; wildlife; scattered debris. Wilderness should feel natural, varied, and explorable.
- **8.2 Settlements:** houses; inns; shops; blacksmiths; taverns; markets; stalls; roads; wells; fences; gates; town walls; lanterns; signs; banners; furniture. Settlements should have their own architecture, cultural identity, and environmental personality.
- **8.3 Castles and fortifications:** stone walls; towers; battlements; gates; bridges; courtyards; guard posts; barracks; throne rooms; great halls; ruined fortifications.
- **8.4 Dungeons and caves:** stone corridors; underground chambers; cave walls; stalagmites; stalactites; underground pools; torches; skeletons; bones; crypts; burial chambers; ancient mechanisms; prison cells; treasure chambers. These environments can be considerably darker than the rest of the world.
- **8.5 Ancient ruins:** broken pillars; fallen walls; ancient statues; stone circles; forgotten temples; overgrown architecture; ancient inscriptions; magical structures; ruined monuments. Ruins should communicate the history of civilizations that existed before the player's journey.

## 9. Resources and interactable objects

Resources should be visually integrated into the world. They should not simply look like identical icons placed on the ground.

- **Mining:** iron ore; copper; silver; gold; rare minerals; magical crystals.
- **Herbalism:** medicinal herbs; flowers; mushrooms; roots; rare plants; poisonous vegetation.
- **Woodcutting:** trees; fallen logs; different wood types.
- **Other resources:** animal hides; bones; feathers; animal remains; ancient relics; crafting materials.

Each resource should have: an identifiable world appearance; a collectible representation; an inventory icon; appropriate interaction feedback; variations where required. Resource nodes should have multiple visual variations to avoid repetition.

## 10. Enemies and creatures

Enemies must follow the same character-rendering rules as the player. They should have distinctive silhouettes, proportions, equipment, and animation.

- **Humanoids:** bandits; soldiers; mercenaries; cultists; undead warriors.
- **Undead:** skeletons; zombies; armoured undead; ancient guardians; necromantic creatures.
- **Animals:** wolves; bears; wild boars; other regional wildlife.
- **Fantasy creatures:** trolls; goblins; large beasts; magical creatures; boss monsters.

Each enemy family should eventually have: character concept sheet; front, side, and rear references; directional movement; attack animations; hit reactions; death animations; equipment or body variations. Bosses should receive additional visual development and distinctive attack effects.

## 11. Combat and visual effects

Combat should feel impactful and dangerous. The visual effects should reinforce the physicality of weapons and the magical elements of the world.

- **Physical combat effects:** blood splashes; weapon impact effects; dust; sparks; armour impacts; wounds; knockback; stagger effects; death animations; environmental blood decals.
- **Magic effects:** fire; ice; lightning; magical projectiles; healing; protective barriers; summoning; corruption; magical explosions.
- **Gore direction:** blood sprays; blood on weapons; blood on the ground; battle damage; skeleton remains; dismemberment where appropriate; wounded enemy reactions.

Gore should be contextual rather than applied indiscriminately to every encounter. The broader game should retain its adventurous fantasy identity.

## 12. UI and inventory art

The user interface must feel like part of the world. It should be medieval fantasy-inspired without sacrificing usability.

- **HUD:** character portrait; health bar; stamina bar; mana bar; status effects; experience indicator; quick-access equipment.
- **Inventory:** item icons; equipment slots; item descriptions; rarity indicators; weight indicators; item comparison.
- **Character interface:** character attributes; skills; equipment; character progression.
- **World interface:** map; compass; quest tracking; location indicators.
- **Menus:** main menu; pause menu; settings; character selection; loading screens.

Visual design uses: aged parchment; dark stone and metal; restrained ornamental borders; medieval-inspired typography; muted gold highlights; distinctive item icons. UI must remain readable, intuitive, and visually consistent.

## 13. Technical art specifications

Proposed starting values, not immutable requirements.

| Asset | Starting specification |
|---|---|
| Character height | 112 to 128 pixels |
| Standard ground tile | 32 by 16 pixels |
| Detailed ground tile | 64 by 32 pixels |
| Inventory icon | 64 by 64 pixels |
| Small props | 16 to 64 pixels |
| Large props | 64 to 256 pixels |
| Movement directions | 8 |
| Typical animation length | 6 to 12 frames |
| Pixel scaling | Integer scaling |
| Texture filtering | Nearest-neighbour |

### 13.1 Pixel-art quality rules

- Maintain a consistent pixel grid.
- Avoid blurry resampling.
- Avoid inconsistent pixel cluster sizes.
- Maintain readable silhouettes.
- Use deliberate colour ramps.
- Keep material textures distinct.
- Avoid excessive noise.
- Maintain consistent light direction.
- Ensure sprites are readable at actual gameplay size.

### 13.2 File and asset management

All assets should be organized into a consistent folder structure:

```
/GameAssets
    /Characters   (/Player /NPCs /Classes /Enemies)
    /Equipment    (/Weapons /Armour /Shields /Accessories)
    /Environment  (/Terrain /Vegetation /Water /Rocks)
    /Architecture (/Buildings /Castles /Ruins /Dungeons)
    /Resources    (/Mining /Herbalism /Wood)
    /Effects      (/Combat /Magic /Environmental)
    /UI           (/Icons /HUD /Menus)
    /Animations
    /Reference
    /SourceFiles
    /Exports
```

Asset naming should be descriptive and consistent, for example: `CHAR_Warden_Idle_South_01`, `CHAR_Warden_Walk_NorthEast_01`, `ARM_Chest_Leather_01`, `WPN_Sword_Iron_01`, `ENV_Forest_Grass_01`, `ENV_Ruin_Pillar_Broken_01`, `UI_Icon_Potion_Health_01`.

Source files should be retained separately from exported assets.

## 14. First playable art asset pack

The first milestone should be a small, representative forest-and-ruins environment, to test the entire visual production system before expanding into a large world.

| Category | Initial target |
|---|---|
| Playable warrior | 1 |
| Movement directions | 8 |
| Basic combat animations | 3 |
| Armour variations | 3 |
| Weapons | 5 |
| Enemy types | 5 |
| Environment tiles | 20 |
| Environmental props | 15 |
| Inventory icons | 10 |
| Basic HUD | 1 |

The prototype environment should contain: forest terrain; grass and dirt paths; trees and bushes; rocks and resource nodes; a small river or water feature; a ruined stone structure; a campfire; a chest; environmental debris; one friendly NPC; several hostile enemies. It should test character movement, combat, interaction, environmental depth, and visual readability.

## 15. Production workflow

1. **Concept:** establish the visual design, silhouette, materials, colours, and purpose.
2. **Reference sheet:** create the standardized asset reference with the required views and details.
3. **Production artwork:** create the actual individual sprites, tiles, icons, or animation frames.
4. **Technical preparation:** prepare transparent backgrounds, sprite sheets, naming, alignment, and export settings.
5. **Engine integration:** import the asset and test it in the actual gameplay environment.
6. **Quality assurance:** check pixel consistency, animation alignment, visual readability, lighting consistency, correct scale, correct layering, compatibility with other assets.
7. **Approval:** once approved, the asset becomes part of the official visual reference library.

## 16. Development priorities

| Priority | Deliverable |
|---|---|
| 1 | Finalize visual art bible |
| 2 | Ashen Warden master character |
| 3 | Character proportions and directional specifications |
| 4 | Modular armour and equipment |
| 5 | Movement and combat animation |
| 6 | Environment tileset |
| 7 | Forest-and-ruins prototype |
| 8 | Enemy asset library |
| 9 | Resources and interactable props |
| 10 | UI, HUD, and inventory |
| 11 | Additional environments and architecture |
| 12 | Expand the complete asset library |

The most important principle is to validate assets in the game before mass-producing variations.

## 17. Unresolved technical decisions

- **Game engine:** Godot, Unity, Unreal Engine, GameMaker, or another engine. (See the bible, section 5.)
- **Actual character rendering resolution:** the 112 to 128 px height is provisional and requires gameplay testing.
- **World dimensions:** map scale, tilemap structure, and environment chunk sizes.
- **Animation implementation:** individual sprites, layered sprites, or a hybrid approach.
- **Equipment layering:** exact attachment points and occlusion rules.
- **Lighting implementation:** static pixel-art lighting, dynamic lighting, or a combination.
- **World structure:** one continuous world, connected regions, or a hybrid.

These decisions should be made before finalizing the production export pipeline.

## 18. Final creative direction

The game should ultimately feel like an expansive fantasy RPG rendered through detailed, handcrafted pixel art. Players should be able to travel through beautiful landscapes, discover ancient ruins, visit settlements, fight dangerous enemies, collect resources, acquire equipment, and explore mysterious underground locations.

Characters and equipment should be visually rich and recognizable. Environments should have considerable variety and detail. Combat should feel dangerous and satisfying. The world should contrast warmth and beauty with danger and darkness.

The guiding identity: **A living world. A dangerous journey. Endless adventure.**

Master art direction: LOCKED, version 1.0. All future visual assets should follow this document unless a deliberate art-direction revision is approved.

**Recommended next milestone (from the brief):** the Ashen Warden (a reference only, not a real character) Base Character Pack: eight directional views, walking and running cycles, idle animation, modular armour, weapon attachment points, and export-ready sprite sheets.
