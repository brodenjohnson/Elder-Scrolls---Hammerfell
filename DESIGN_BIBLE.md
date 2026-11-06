# Design Bible v0.3

Working title: TBD (placeholder: "The Salt Ledger"). The earlier name "The Ashen Warden" was only an example character and is not the game or the protagonist.

Status: in production (0.5.0 released). This document is the source of truth for design decisions.

**v0.3 changes: the scope reset (Broden, 2026-11-06).** A smaller game done well beats a bigger one done badly. Story and combat come first; graphics serve them.
- **Melee only.** Seven skills: One-handed, Two-handed, Block, Light Armor, Heavy Armor, Smithing and Speech. Sneak, Lockpicking, Pickpocket, Alchemy and Archery are cut with their perks. No standing stones. Enemies still use bows.
- **One race: Redguard.** Character creation is a name.
- **A short gear list:** about 24 weapons (eight classes in iron, steel and Orcish, the scimitar, a few one-offs) and seven armour sets (hide, fur, leather, Alik'r garb, iron, steel, Orcish). Every piece shows on the character.
- **Healing:** bandages, food and potions, bought or found. No brewing.
- **One region, full.** The Sentinel Coast only, about 3 by 3 slices, packed with places, people and encounters (section 3). Other regions come later, one per release, the same way.
- **Combat must be fast and fun.** Finishers and signature moves stay; responsiveness comes first (section 11).
- **Art direction reopened:** the 3D-to-sprite pipeline is too slow and animates stiffly. A simpler code-drawn pixel style, between this project and Wasteland Settlement, is to be chosen from a side-by-side sample (section 4).

**v0.2 changes (Broden's latest decisions):**
- **NPCs can use magic. The player cannot.** Enemy mages, Thalmor wizards, necromancers and Lamia sorcerers use Skyrim spell numbers.
- **Everything uses Skyrim's own numbers:** stats, skills, perks, gear, armour, weapons, enemies. A Skyrim reference data pack is in `data/skyrim/`.
- **Tavi is a girl, age 10.** Names are approved defaults.
- **The Quiet Hand can go dark.** Written in `GUILDS.md`.
- All earlier open items were filled with best-judgement defaults: `SYSTEMS_SPEC.md`.

**Document set:** `DESIGN_BIBLE.md` (this file), `MAIN_QUEST.md`, `GUILDS.md`, `SYSTEMS_SPEC.md`, `WORLD_MAP.md` with `reference/master-map-v0.png`, `data/skyrim/` (reference data), `data/world/` (map data), `CLAUDE.md` (project guide).

## 0. How to use this document (for Claude Code)

- **LOCKED** means Broden decided it. Do not reopen it without a strong reason, and say why if you do.
- **PROPOSED** means a starting value or default. Refine it by testing, and record what you changed and why.
- **OPEN** means undecided. Ask Broden before building anything that depends on it. Section 16 lists the open items.
- Keep this document current. When a decision changes, edit it here and note it in the decisions log (section 15).
- Do not start building until Broden approves Phase 0 (section 14).
- Working style: Australian English, plain and a little dry, no emojis, no em dashes. Never use the words "genuinely" or "honestly". Challenge scope creep and overextension. If a request would spread the project too thin, say so and propose an order. Tell Broden plainly what you did and did not do.

---

## 1. Vision

A mature, 2D, isometric, open-world RPG in the mould of Skyrim, set in **Hammerfell** about **4E 201**, with our own story. It uses Skyrim's systems (skills, perks, factions, crafting, crime) and the Elder Scrolls world's gear types, enemies, lore and places, but it is not Skyrim's map, it has no dragons or dragon shouts, and **the player has no magic** (LOCKED). NPCs do: Thalmor wizards, necromancers, conjurers and Lamia sorcerers use Skyrim's spell numbers.

**Pillars** (v0.3: in this order)
1. A personal story about loss and rage inside a political conspiracy.
2. Fast, brutal, fun melee. Short, committed, lethal fights with finishers.
3. A small world that is full: people, places and trouble every few steps.
4. Consequences you can feel: Infamy, Standing and Collateral.
5. Skyrim's systems where they serve the first four, cut where they do not.

**Audience and tone (LOCKED):** adults, 18 and over. R-rated: swearing, blood, gore, ruthlessness. Characters kill out of rage, and so do many NPCs where it makes sense. A mature content warning and a gore setting (off, some, full) are required.

**Protagonist voice (LOCKED):** modelled on the Punisher. A man with one purpose. Terse, flat, dryly dark, quiet until he is not. No speeches. His sentences get shorter as his rage builds.

**Content guardrails (PROPOSED, please confirm):** harm to the child is never depicted. The massacre is off-screen and implied. No sexual violence. Violence is brutal and consequential, not celebratory for its own sake. Gore is contextual, concentrated in combat where the player has agency.

**Personal use (LOCKED):** this is for personal use. It borrows Elder Scrolls names, lore and gameplay. If it is ever shared publicly, rename trademarked terms and replace borrowed lore with our own before release.

---

## 2. Setting and era

**Hammerfell, about 4E 201 (LOCKED).** A western province bordering Skyrim, Cyrodiil and High Rock. It is dominated by the Alik'r desert, home to the Redguards (who fled the destruction of Yokuda), mostly urban and maritime, with fertile grassland on the coasts. Diverse terrain: beaches, jungles, grasslands, mountains and desert.

**Politics.**
- The Redguards are split into two traditional factions, the **Crown** and the **Forebears**. They have at times left each other to their fate during foreign invasions.
- The Great War began in 4E 171 when the Aldmeri Dominion (Thalmor) moved on the Empire. In 4E 173 a Forebear army from Sentinel broke the siege of the Crown city of **Hegathe**, which reconciled the factions.
- In 4E 175 the Empire and the Dominion signed the White-Gold Concordat. The Redguards rejected its terms and stood alone.
- By 4E 201 the peace is a generation old, and it rests on the story of Hegathe. **In our story that story is a lie** (section 6).

**Regions named in the lore:** the Alik'r Desert (capital city Sentinel; other cities include Lainlyn, Bergama, Kozanset, Satakalaam and the port Tava's Blessing), southern Bangkorai (rocky desert, "Fallen Wastes"), Craglorn (north-east, borders Skyrim and Cyrodiil), Khefrem, and the island of Stros M'Kai. Banthan-style jungles and coastal grassland give green areas.

**Ruins in three ages, three dungeon looks:** Yokudan (temples and necropolises, for example Tu'whacca's Throne, the Motalion Necropolis), Dwemer (for example Santaki) and Ayleid (for example Salas En).

**Caveat:** many place names above come from ESO-era (2E 582) data. Check what holds for 4E 201 on the UESP wiki before using a name. Anything we invent is marked NEW in the content lists.

---

## 3. World and map

**v0.3 (LOCKED, supersedes 3.1 and 3.4):** the game is built **one region at a time, and only the first exists for now**: the Sentinel Coast, about 3 by 3 slices (384 by 384 tiles), around the farm. The rest of the map is not walkable until its region is built. The master map stays as the plan for where later regions go.

**Density target for a region (PROPOSED):** something worth stopping for every 20 to 30 seconds of walking.
- **Settled places:** a village with people on daily schedules (work, meals, home, sleep), farms, a market, an inn, the road.
- **Life on the roads:** travellers, merchants, patrols, hunters, a caravan; wildlife, some of it dangerous.
- **Random encounters** on the roads and in the wilds, from a table per region: ambushes, a fight already under way, a lost traveller, a dying man with a note, a wagon broken down, bandits shaking down a farmer.
- **Places to explore:** two or three bandit camps, two or three caves or ruins, each with a hook (a named item, a note, a person, a secret).
- **Small finds:** shrines, bodies, stashes, viewpoints, signposts.
- Model: the town in Wasteland Settlement (people, schedules, vendors, job board) and its place registry (discovery, danger pips).

### 3.1 Size (SUPERSEDED by v0.3 above; kept for the long-term plan)
The playable world matches Skyrim's **playable map size**, not its lore size. Skyrim's playable map is 119 by 94 exterior cells (about 4.3 by 3.4 miles, 14.8 square miles).

| Parameter | Value |
|---|---|
| Tiles per Skyrim cell | **12** (LOCKED) |
| World size in tiles | about **1,428 by 1,128** |
| Slice size | 128 by 128 tiles (LOCKED: generates in under 10 ms, under 60 ms on a slow CPU) |
| Slices | about 98 of land equivalent, a 12 by 9 bounding grid of 108 with sea and border slices |
| East-west crossing | about 5 minutes at 5 tiles a second (PROPOSED run speed, tune in testing) |
| Islands (Stros M'Kai etc.) | separate small maps by boat, outside the main footprint, later |

Hammerfell and Skyrim are roughly the same size on the official Tamriel map, with Hammerfell arguably slightly larger once islands are counted. Using Skyrim's footprint is therefore a sensible match.

### 3.2 Structure (LOCKED)
- The overworld is a **seamless** grid of slices. You walk from one to the next with no loading screen. The game streams neighbouring slices in as you approach.
- **Towns are separate areas.** Entering a town is a loading transition, like Skyrim.
- **Every building is a separate area** behind a loading transition.
- Each slice declares an **edge contract**: terrain type and the exact positions where roads and rivers cross each border. Neighbours must match.
- Because of this, we design a **master map of Hammerfell first** (regions, rivers, roads, towns, landmarks), then author slices one at a time against it.

### 3.3 First slice (LOCKED)
The **Sentinel coast**: the family farm and its neighbours, the nearest village, coastal grassland, ruins on one side and the desert edge on the other, and Sentinel itself as a separate city area. It matches the green, ruin-and-river look of the art brief on one side and tests a desert palette on the other.

### 3.4 Content plan (PROPOSED)
Three tiers, so a world this big is achievable:
1. **Hand-built hubs:** cities, key towns, story sites.
2. **Template-generated places:** dungeons, ruins, bandit camps, shrines and caves from layout generators, each with one unique hook (a named item, a log, a person, a secret).
3. **Sparse generated terrain** between them.

Every region is walkable and seamless from the start. We then fill it in region by region. Every place has a danger tier and a loot profile that fits what it is.

### 3.4a Master map v0 (PROPOSED)
See `WORLD_MAP.md` and `reference/master-map-v0.png`: a 12 by 9 slice grid with 88 land slices, eight regions with level bands, roads, a seasonal river, and every story location placed. Schematic and not canon-accurate. Verify against UESP and ESO maps in Phase 0.

### 3.5 Travel (PROPOSED: yes)
Fast travel only between discovered places, costing game time. A horse (acquired in Act One) speeds overland travel. Carriages between major cities.

### 3.6 Time and weather (PROPOSED)
Day and night cycle with lighting changes (required by the art brief). Desert heat, sandstorms, highland cold and coastal weather, with a light exposure system and no hunger meter (`SYSTEMS_SPEC.md` section 9).

---

## 4. Camera, perspective and art direction

### 4.1 Camera (LOCKED)
Fully 2D, **true isometric (diamond grid)**, matching the concept images. Ground tile **64 by 32 pixels** (the brief's "detailed" tile). Integer scaling and nearest-neighbour filtering only. Characters about **112 to 128 pixels** tall (PROPOSED, validate in the spike). Keyboard and mouse only.

### 4.2 Style (from the art brief, LOCKED unless noted)
High-detail, handcrafted-feeling pixel art. Strong silhouettes. No blurry scaling. Consistent top-left light. Distinct materials: steel, leather, cloth, wood, stone, bone, blood. "A beautiful world with dangerous places": bright coasts and forests, ancient ruins, dark dungeons, visceral combat.

**Palette families:** steel (cool grey), leather (browns), cloth (teal, navy, burgundy, earth), wood, stone (slate, sandstone), nature (emerald, olive), blood (deep crimson), gold (aged gold, bronze). **Gap:** the brief has no desert palette. Hammerfell needs one (sand, ochre, terracotta, sun-bleached stone, deep sky blue). Add it in the art spike.

**Lighting by place:** warm sun and blue skies outdoors, dappled forest light, torchlit dungeons, cold stone, restricted visibility underground.

### 4.3 Concept images
The nine supplied images are **concept art, not sprites**. They show the target feel. The walk-cycle image is a different character (hooded, blue). The "Ashen Warden" sheet was an example only. Use them as reference for style, not as assets.

### 4.4 Modular equipment (LOCKED)
Characters are built from layers so equipment is swappable and dismemberment is possible: head, hair and facial features, torso, upper arms, forearms and hands, legs, feet, plus equipment layers (helmet, body armour, shoulders, gloves, boots, cloak or back item, main hand, off-hand). Weapons share animation sets by class and are layered on top. Body parts must be separable layers so a killing blow can detach one and spawn it as a physical piece.

### 4.5 Animation (PROPOSED)
Eight directions. Shared animation sets per weapon class. Starting frame targets, to be tuned: idle 6 to 8, walk 8, run 8 to 10, light attack 6 to 8, heavy attack 8 to 12, block 4 to 6, dodge 6 to 8, hit reaction 4 to 6, death 8 to 12. Quality of movement beats frame count.

### 4.0 v0.3: art direction reopened (OPEN, Broden to choose)
The code-drawn 3D pipeline (shapes raymarched into large sprites, 8 directions) is too slow to render (about 5 s a frame) and animates stiffly. Its direction-count and size decisions (9, 31, 33 in the log) are reopened. The replacement is chosen from a side-by-side sample in the browser:
- **Smaller characters** (about 48 to 64 px), drawn directly as pixel art in code, with palette ramps, outlines and dithering, like the Wasteland Settlement art lab.
- **Layered at runtime** (body, clothes, armour, weapon), so gear and dismemberment cost one small set of frames each.
- **More animation frames where they matter** (attacks, hits, finishers), with timing and anticipation, fewer elsewhere.
- **Camera:** isometric kept, or top-down three-quarter like Wasteland. Decided by the sample.

### 4.6 Art production approach (superseded by 4.0)
Broden believes the art can be produced here. The commitment is an **art spike before anything else**: one character in eight directions with swappable layers, a small isometric tileset including a desert set, and a sample scene, all at target resolution, compared side by side with the concept images. The sprite pipeline must be separate from game code so better art (generated, commissioned or licensed) can be swapped in later with no code changes. Expected outcome: recognisably in the same family as the concept art, simpler in detail. If the spike falls short, decide early whether to change the target fidelity or the source of art.

### 4.7 Asset conventions
Folder structure and naming from the brief: `/GameAssets/{Characters,Equipment,Environment,Architecture,Resources,Effects,UI,Animations,Reference,SourceFiles,Exports}`. Names like `CHAR_Hero_Idle_South_01`, `ARM_Chest_Leather_01`, `WPN_Sword_Iron_01`, `ENV_Ruin_Pillar_Broken_01`. Keep source files separate from exports.

---

## 5. Technical direction

**Platform (LOCKED):** browser game, built with Claude in VS Code, tested and released from a repo. Players on desktop browsers. Hosting via GitHub Pages, as in the earlier project.

**Stack (LOCKED after the Phase 0 tech spike):** TypeScript with **PixiJS 8** as the renderer, and our own world, streaming, depth sorting and game logic on top. PixiJS gave the steadiest frame times and used about a tenth of Phaser's memory; Canvas2D fell behind with crowds on a slow CPU. Evidence in `docs/TECH_SPIKE_REPORT.md`.

**Principles (PROPOSED, carried over from the earlier Wasteland project):**
- Everything content-like is **data**: items, perks, skills, quests, dialogue, enemies, places, factions. Code reads data.
- **Testability first.** Expose a debug handle (for example `window.__game`) so Playwright tests can drive and inspect the game. Run a regression list before every release.
- **Save compatibility is non-negotiable.** Versioned save schema with explicit migrations. Never break an old save without saying so first. Never rename an item without a migration.
- **Seamless streaming:** only load the 3 by 3 slices around the player. Per-slice saved state.
- **Separation of concerns:** engine (rendering, input, streaming, saves), game systems (combat, skills, perks, reputation), content (data), and art pipeline.
- **Dialogue:** a small scripting language for branching dialogue with skill and reputation checks, conditions and effects. The earlier project's design is a good model.
- **Release flow:** `VERSION` file, `CHANGELOG.md`, a release script, GitHub Pages, and an in-game "newer version available" notice.
- **Player magic deferred, not blocked:** keep the attribute list, skill list and equipment slots extensible so player magic could be added later without rewrites. NPC magic is in from the start, using Skyrim spell data.
- **Skyrim numbers are data:** load them from `data/skyrim/json/` (built in Phase 0), never hard-code them.


---

## 6. Story

Working title: **The Salt Ledger** (placeholder, LOCKED as "name TBD").

**Logline.** A farmer on the Sentinel coast loses his family to a warlord's example-making, survives by accident, and hunts the people responsible across Hammerfell. He learns they were killed to cover up the lie that holds the whole province together.

### 6.1 Structure (LOCKED)
Follows the classic Elder Scrolls arc (an outsider, singled out, helped by a mentor, a rising threat, collecting across the province, a midpoint reveal, a showdown), adapted for a revenge story. The main quest is a hunt down a list. Each region slice holds one story beat, so the story unlocks as the world does.

| Act | Region and level (PROVISIONAL) | What happens |
|---|---|---|
| **Prologue: Home** | Coast farm, level 1 | Quiet days. Meet the family and do small jobs that teach the controls and build rapport (section 6.3). A tax rider visits, neighbours have gone missing. Kerrash eats at the table. That night his men come. The player cannot win. |
| **Act One: Waking** | Coast, levels 1 to 10 | Zeyna, an old apothecary, finds and heals him. First vengeance on the local men. A brand left on his body and a name lead to the question that drives the story: why us? |
| **Act Two: The Hunt** | Desert, jungle, highlands, levels 10 to 28 | He hunts the lieutenants one by one across the regions. Politics pull him in: Crown, Forebear and the Thalmor all want something. At about 60% the reveal lands, and he learns the child is alive. |
| **Act Three: The Reckoning** | Hegathe and Kerrash's stronghold, levels 28+ | The final push and the choice about how it ends. |

### 6.2 The Hegathe lie (LOCKED)
In 4E 173 the "heroic Forebear relief" of besieged Crown-held Hegathe was staged. **Azhar Kerrash**, then a Forebear officer, sold out a column of Crown refugees to the Thalmor in exchange for gold and a safe road, and had the survivors silenced. The reconciliation that followed, the foundation of Hammerfell's peace, rests on that cover story.

- The player's **wife** was one of the survivors, a child at the time, raised under a Forebear name. She kept the proof, a ledger. Kerrash has hunted the last witnesses for years. His salt trade is the pipeline that has paid for the silence.
- The player was a **conscript in the relief force** and saw something he never understood.
- Exposing the truth would shatter the peace. Killing Kerrash is easy. What Hammerfell does next depends on how.
- The family was not chosen at random. The player's grief becomes complicated when he learns his wife lied about who she was, and that the lie was an act of love.
- Midpoint twist (about 60%): **the child was taken, not killed.** The hunt becomes a rescue as well as a revenge.

### 6.3 The prologue (LOCKED concept, PROPOSED details)
The tutorial is emotional, not mechanical. The player wakes as an ordinary farmer with a wife, a child and a dog.
- Teach controls through small, warm jobs: feed the animals, mend a fence, take goods to the village market, a short hunt with the dog, fetch an item for the wife, play with the child.
- Conversations with each family member build rapport and make the loss land.
- Early signs something is wrong: neighbours missing, a tax rider, a rumour.
- **Kerrash visits and accepts hospitality.** He compliments the cooking, ruffles the child's hair, asks the dog's name. The player likes him a little.
- That night the attack comes. The player fights and is overwhelmed. This is a scripted loss.
- **Cutscenes** carry the prologue. The massacre is **off-screen and implied**: silhouettes, sound, a locked door, the camera on the player's face. The player is led to believe the child died. The dog dies defending the family.
- He is left for dead and is found by Zeyna.

### 6.4 Endings (LOCKED shape, written in `MAIN_QUEST.md` section 6)
Multiple endings. "Kill him" is the obvious path the character will take. "Let him be judged" is the harder, costlier path.
1. **Kill him.** The easy, satisfying end. The lie survives and the peace holds on false ground. The player becomes something close to what he hunted.
2. **Expose him and let Hammerfell judge him.** The truth comes out in public. It risks civil war between Crown and Forebear and requires restraint from a man made of rage.
3. **Desert Law:** the Alik'r judge him by their own law. A fourth ending, **The Quiet Bargain**, exists after the dark bargain at Valaneth.
Ending availability depends on **Collateral**, **Standing** and choices made on the hunt.

### 6.5 Tone rules for writing
- Short lines, dry, dark. The protagonist never explains his feelings.
- Swearing is allowed and should be used like the rest of the dialogue: sparingly, and meant.
- The villain is hated through small, petty, specific behaviour, not through speeches.
- Calibration lines. Kerrash: "I did try to be pleasant. People always make me do it the hard way." Player (flat, quiet): "You ate at my table."

### 6.6 Updates from the full main quest pass (see `MAIN_QUEST.md`) (PROPOSED, pending approval)
- **The List is a page of initials** from the Hegathe payment ledger, found in a tin under the farm's well stone (T.H., B.K., I.Q., S.D., F.A., V., A.K.). Each kill crosses a name off.
- **The ledger was split into three folios** hidden with three trusted people: Zeyna (coast), Mother Anwar of the Alik'r (desert), Advocate Leyla Rasul (Sentinel). All three are needed for the "Judged" ending.
- **The third cairn** at the farm holds the raider the player killed at the door, burned past recognition. Zeyna assumed it was the child's. Nothing about the child's body is ever shown.
- **Midpoint (about 60%):** a carved wooden gull arrives with its crooked wing mended, a child's scratched note underneath and a note from Kerrash. The child is alive. Kerrash offers a trade: the folios for the child, at Hegathe, within a month of game time.
- **Hegathe is celebrating Relief Day** when the player arrives, the festival of the lie.
- **Endings (three):** "Salt" (kill him, the lie survives), "The Ledger" (a public trial in Sentinel), "Desert Law" (the Alik'r judge him by their own law). The gull and the child close every ending.
- **The player's early choices pay off:** family bond flags change how the child and others speak in Act Three.

### 6.7 Voiced dialogue (LOCKED; pipeline decided in `SYSTEMS_SPEC.md` section 13)
Player and NPCs are **voiced**, with **written dialogue options** in some conversations. The recommended approach is a short on-screen option with a longer voiced line (a paraphrase system), tiered voicing (main quest, family, mentor, villain and the seven targets fully voiced), and one protagonist voice per race group. The pipeline: licensed AI voices first, with recorded actors for key characters later, and explicit care for the child's voice.

---

## 7. Characters

| Character | Role | Status |
|---|---|---|
| **The protagonist** | A Hammerfell farmer and former conscript in the Hegathe relief force. Male. Race, appearance and name chosen by the player. | LOCKED |
| **His wife** | Matches the player's race. Secret survivor of the Hegathe convoy, raised under a Forebear name. Default name Nadira. | LOCKED role |
| **The child** | Tavi, a girl, age 10. Taken in the attack, alive. | LOCKED |
| **The dog** | Dune. Dies in the prologue. A stray is adopted later. | LOCKED |
| **A horse** | Acquired during Act One. | LOCKED |
| **Zeyna** | Old apothecary who heals him. Wants the ledger too. Her price for saving him: he hears the truth only after he has drawn blood. | LOCKED role |
| **Azhar Kerrash, "the Saltmaker"** | The villain. Veteran of the Great War. Controls the salt trade and sells "protection" as the "Patriot's Share". | LOCKED |
| **Khadija "the Unbent"** | Sword-singer exile and mentor | PROPOSED, approved default |
| A smuggler | Hears everything. | PROPOSED |
| A Forebear magistrate | Can make evidence matter. | PROPOSED |

### 7.1 The villain (LOCKED)
- Petty. He never pays. He makes others pick up the tab and thanks them for the honour.
- A hypocrite. He gives speeches about Redguard pride and independence while taking Thalmor money.
- He enjoys it. He smiles when he hurts people, and humiliates before he kills.
- Charming first. In the prologue you almost like him.
- He puts a pinch of salt on the table before every threat.
- He leaves one survivor each time to carry the message. That is why the player is left alive.

### 7.2 The list (PROPOSED)

| Target | Region | What they are | The cost |
|---|---|---|---|
| The tax collector | Coast | A petty bully who started it | Easy and satisfying |
| The enforcer | Coast ruins | Led the raid on the farm | Personal and brutal |
| The slaver | Jungle | Sells the poor as labour | Frees people who then ask for help |
| The informant | Desert caravans | Betrayed families for coin | He has a family of his own |
| The magistrate | Sentinel | Launders the money | Killing him breaks a court |
| The Thalmor handler | Highlands | The hand behind the money | The Thalmor retaliate |
| Kerrash | Hegathe (PROPOSED stronghold) | The Saltmaker | The final choice |

Each name crossed off unlocks one Fury power (section 10).

---

## 8. Factions

There is no mages' guild, because the player has no magic. Each guild runs a questline of about 12 quests, in parallel with the main story, written in `GUILDS.md`. Each finale echoes the theme (rage and its cost).

| Faction | Skyrim analogue | Basis | Arc | Gives |
|---|---|---|---|---|
| **Sword-singers' Circle** | Companions | Canon (Redguard warrior tradition) | Honour and discipline against rage. The mentor comes from here. | Weapon perks, first Fury power, unique blades |
| **The Wreckers** | Thieves Guild | NEW, built on piracy and sea trade | Coastal smugglers who also feed the hunt | Ships, fences, stealth perks |
| **The Quiet Hand** | Dark Brotherhood | NEW | Dark by design: contracts that may be lies, a well to poison, a loyalty test on an ally. See `GUILDS.md`. | Poison and assassination perks |
| **The Alik'r** | Desert tribes | Canon (nomads and mercenaries of the desert) | Trust earned slowly. The informant hides among them. | Desert travel, mounts, caravan routes |
| **Crown and Forebear** | The civil war | Canon | After the Hegathe reveal, hardliners on both sides move toward war | Territory, endings |
| **The Thalmor** | The enemy hand | Canon | They fund Kerrash. The hunt makes the player their problem. | Hostile, with a possible grim bargain |

OPEN: whether to add a crafting or merchant guild.

---

## 9. Progression (Skyrim numbers, player magic removed)

### 9.1 Model (LOCKED)
- Two layers. **Skill levels** go up by use. Each skill level gained gives character XP equal to the new skill level (Skyrim's rule).
- Each **character level** gives **one perk point** and **+10 to one attribute**. Unspent perk points can be saved.
- Skills cap at 100. Perk trees reward specialisation. A **Legendary** reset (skill returns to 15, perks refunded) allows continued levelling.
- Trainers can raise skills for gold.
- No dragon souls, no shouts. **Rage and Fury** replace them (section 10).

### 9.2 Attributes (LOCKED)
**Health** and **Stamina** only, starting at 100 each (Skyrim). Each level gives +10 to one of them. Magicka is removed for the player. NPC mages still have Magicka internally.

### 9.3 Skills (LOCKED v0.3: 7 skills, Skyrim's own numbers)

| Kind | Skills |
|---|---|
| Fighting | One-handed, Two-handed, Block |
| Armour | Light Armor, Heavy Armor |
| Other | Smithing, Speech |

Cut: the magic schools and Enchanting (v0.1), then Archery, Sneak, Lockpicking, Pickpocket and Alchemy (v0.3). Healing comes from bandages, food, bought or found potions, and rest. **Speech** includes an Intimidate option that scales with Infamy. Saves from 0.5.x drop the cut skills and refund their perks.

### 9.4 Perks and level cap (computed from Skyrim's rules; v0.3: 98 perk ranks in the 7 trees, so the numbers below are out of date)
The 12 retained trees have **107 unique perks, 165 counting every rank** (Skyrim's own perk data, verified against UESP). A full-mastery character reaches **level 66 with 65 perk points** (Skyrim's formula: 75 + 25 x level XP per level, and skill levels give character XP). That is about 39 percent of all ranks, compared with about 32 percent in Skyrim, so choices still matter. Legendary resets raise the ceiling as in Skyrim. Perks that mention spells, Magicka or enchanting are rewritten or replaced: see `data/skyrim/perks.md` and `SYSTEMS_SPEC.md` section 3.

### 9.5 Races (LOCKED v0.3: Redguard only. The text below is the old plan.)
Each race keeps its Skyrim skill bonuses and non-magical abilities. Bonuses in removed skills are reassigned to thematic non-magic skills, and magical racial powers are replaced. Full tables in `data/skyrim/races.md`. Redguards are the majority in Hammerfell. The player's wife and child match the chosen race.

### 9.6 Birthsigns / standing stones (CUT in v0.3)
Keep the non-magical Skyrim stones: Warrior, Thief, Lady, Steed, Lord, Lover, Shadow, Tower, Serpent. Drop Mage, Apprentice, Atronach and Ritual (magic). Numbers from Skyrim (verify in Phase 0). The guardian stones (Warrior and Thief) speed up combat and stealth skills by about 20 percent in Skyrim.

### 9.7 Difficulty and scaling (LOCKED)
A **combination**: Skyrim-style scaling within region bands, plus **fixed, deadly zones** where enemies are far above a low-level player. Some places warn you with skull pikes, bodies and signs.

---

## 10. Rage, Fury and reputation

### 10.1 Rage (LOCKED)
A meter from 0 to 100 that replaces dragon shouts.
- **Fills** from damage taken, damage dealt, kills, finishers and witnessing atrocities.
- **Decays** slowly out of combat.
- **Spends** on **Fury powers**.
- **Costs:** while Rage burns the player cannot block cleanly or sneak. Afterwards he is exhausted. It is a decision, not a free buff.

### 10.2 Fury powers (PROPOSED)
One unlocks per name crossed off the list, seven in all:
1. Pain-ignoring burst
2. Cleaving sweep (area attack)
3. Scent-track on a marked target
4. Terrifying roar (weak enemies break and run)
5. Execution (a brutal instant finisher)
6. Short berserk
7. A story-specific power from the final kill

A **separate small Fury perk tree**, paid for with its own points earned from the list, so rage does not compete with the 12 skills for perk points.

### 10.3 Reputation (LOCKED: three systems, separate from Rage)
1. **Infamy:** how feared the player is across Hammerfell. It changes dialogue, intimidation, prices, how guards react and how enemy morale breaks.
2. **Standing:** per faction, as in Skyrim.
3. **Collateral:** a **quiet count** of innocents (non-combatants and forced conscripts) who died because of the player. No flashy meter. It shapes how Zeyna treats him, what some characters say, and which endings stay open.


---

## 11. Combat

**v0.3 (LOCKED): fast and fun first.** Broden's verdict on 0.5.0: slow and janky. Before more systems, combat gets a feel pass: instant response to input, attacks pressed early still go through (input buffer), a short freeze on every hit (hit-stop), knockback and screen shake, quicker recovery, clear enemy wind-ups, and combos that flow. Finishers and Fury moves stay and should look spectacular. No sneak attacks and no player bows.

**Principle (LOCKED):** heavy, short, decisive, brutal. Keep Skyrim's structure (power attacks, blocking, stamina) but make each blow weigh something. A fight is won by a few good decisions, not by trading hits for two minutes. A farmer in leather dies in three or four hits. Enemies are as dangerous as he is.

### 11.1 Controls (LOCKED)

| Input | Action |
|---|---|
| WASD | Move, eight directions |
| Mouse | 360 degree aim for bows and thrown weapons. Melee faces the cursor. |
| Left click | Quick attack, a three-hit chain |
| Hold left click | Power attack, slower, more stamina |
| Right click | Block. A well-timed block parries. |
| Space | Dodge roll |
| Shift | Sprint |
| F | Finisher, on a vulnerable target |
| Q | Fury, when the Rage meter allows |

### 11.2 Mechanics (LOCKED rules, PROPOSED numbers, tune in testing)
- **Stamina is the economy.** Attacks, blocks, dodges and sprinting all cost stamina. Heavy armour makes dodges shorter and costlier.
- **Dodge:** a roll with a brief invulnerability window (about 0.25 s). Dodge in the last instant before impact for a **perfect dodge** (about a 0.15 s window): time slows for roughly a second, the attacker is off balance, and the counter does double damage and staggers.
- **Block and parry:** holding block is safe but drains stamina per hit. A tap just before impact (about a 0.2 s window) is a **parry**: the attacker staggers and their guard breaks, opening a finisher. Shields parry more easily. Two-handers parry harder but slower.
- **Weapon classes feel different:** one-handers are fast with a short arc, two-handers are slow, wide and guard-breaking, daggers are very fast with backstab and throat-cut finishers, dual-wield is a flurry that is weak against armour, bows have a real draw time.
- **Wounds (LOCKED):** bleeding (stopped by a bandage or time), scars that persist visibly, and a **limp from serious leg wounds** (movement penalty until treated). Blood decals persist.
- **Morale (PROPOSED):** enemies at low health, or whose allies fall, can flee, beg or surrender. How often depends on faction and on the player's Infamy. Killing the fleeing or surrendering adds Infamy, and Collateral if they were non-combatants or conscripts.
- **Enemy AI (PROPOSED):** Skyrim's alert states (idle, suspicious, searching, combat) with flanking for groups of three or more, ranged units that keep distance, casters that prioritise line of sight, and group morale as above. Detail in Phase 3.

### 11.3 Gore and finishers (LOCKED)
Layered, so cost grows with what is built:
1. **Every hit:** blood spray, visible wounds on sprites, bloody weapons, persistent decals. (Done once before in the earlier project.)
2. **Dismemberment on killing blows:** **heavy and power attacks only**, so it feels earned. Heads and limbs detach as layered body parts and tumble away. Chance depends on weapon class (two-handed and axes highest), the swing, and the target's armour. Starting values to tune: base about 25 percent, two-handed +15, axes +10, heavy armour -10. Always on finishers.
3. **Finishers (manual, press F):** contextual executions on staggered or low-health targets. A blade takes a head, a hammer crushes a skull, a spear pins, a dagger cuts a throat. About six per weapon class to start, phased in over several releases. Each costs a second or two of vulnerability, so using one mid-crowd is a gamble. They feed Rage.
4. **Brutal both ways:** enemies can wound you the same way. Early on a farmer dies fast.

**Settings:** gore (off, some, full) and a shorter-finisher option, plus a mature content warning on first launch.

### 11.4 Cost notes
Animation count is the big cost (eight directions times weapon classes times attacks, blocks, reactions, deaths). Share animation sets by weapon class and layer the weapon on top. Modular bodies make dismemberment cheap. Finishers are the most expensive single item, so phase them in.

---

## 12. Equipment, crafting, economy and systems

### 12.1 Gear (LOCKED: Skyrim's gear and numbers)
- **v0.3 list (LOCKED):** about 24 weapons and seven armour sets, chosen in `game/scripts/data.mjs` (`WEAPONS`, `ARMOUR`). Bows are for enemies only.
- **Weapons:** swords, war axes, maces, daggers, greatswords, battleaxes, warhammers. Skyrim's damage, weight, value, speed and stagger numbers are in `data/skyrim/weapons.md`. The Scimitar is the Redguard and Alik'r blade.
- **Armour:** light and heavy sets with Skyrim's ratings: `data/skyrim/armour.md`. Armour reduces physical damage only, up to an 80 percent cap.
- **Materials ladder (v0.3):** iron, steel and Orcish for the first region. Later materials come with later regions.
- **Hammerfell flavour** is a reskin of Skyrim rows, so balance is already known (Alik'r Warrior gear, desert veils, scimitars, Yokudan blades). Any new item must name a donor row.
- **Rarity** shown through design, materials and ornamentation, as in the art brief.

### 12.2 Crafting (LOCKED)
**Smithing** (forge, tempering, improving) only. **v0.3:** Alchemy, Lockpicking and Pickpocket are cut, and Enchanting was never in. Locked doors and chests open with keys or by force. Two Smithing perks are replaced: see `SYSTEMS_SPEC.md` section 3.

### 12.3 Economy (PROPOSED)
Skyrim item values, Speech-based barter, merchant gold pools and restocking, Infamy and Standing affecting prices. Details in `SYSTEMS_SPEC.md` section 7.

### 12.4 Crime and justice (PROPOSED)
Skyrim's bounty system by jurisdiction (Sentinel, Hegathe, Seven Wells), with Crown, Forebear and Alik'r law differences. `SYSTEMS_SPEC.md` section 8.

### 12.5 Followers, mounts and housing (PROPOSED)
One follower at a time (Khadija, Kami, the stray dog), a horse from Act One, desert mounts, Skyrim-priced houses, and the farm that can be rebuilt after the story. `SYSTEMS_SPEC.md` section 11.

### 12.6 Dialogue (PROPOSED)
Skyrim-style conversations with skill and reputation checks (Speech persuade, Speech intimidate scaled by Infamy), branching, consequences logged. Cutscenes for major story beats.

---

## 13. UI and UX (PROPOSED, to design)
- **HUD:** health, stamina, Rage, status effects, compass, quick-access items.
- **Inventory, equipment, map, journal, perk screen** in our own style. The Skyrim constellation presentation is replaced by something that fits our art. Aged parchment, dark stone and metal, muted gold highlights, readable type.
- **Perk screen** must show exactly what each perk does now and what the next rank does.
- **Menus:** main menu, pause, settings (including gore and content warnings), character creation, save slots (multiple characters), loading screens (towns and buildings).
- **Accessibility (PROPOSED):** text size, colour options, remappable keys, a flashing-effect toggle and gore toggles (`SYSTEMS_SPEC.md` section 15).

---

## 14. Production plan

**Rule:** validate in the actual game before mass-producing anything. One vertical slice, then expand. Every release stands alone.

| Phase | Deliverable | Done when |
|---|---|---|
| **0. Spikes** | Tech and art spikes (below). Update this document with findings. | Broden approves the stack and the art direction |
| **1. Engine core** | Isometric renderer with depth sorting, movement, collision, slice streaming, save system with versioning, debug hooks, test harness, release flow | A seamless two-slice walk works and saves and loads |
| **2. Systems core** | Data schemas, skills and perks engine, inventory, equipment layers, reputation, dialogue engine | The 12 skills level by use and perks apply |
| **3. Combat slice** | Attacks, dodge, block and parry, stamina, Rage, three enemy types, wounds, gore, dismemberment, three finishers | A fight in a test arena feels right |
| **4. Prologue** | The farm, family, tutorial jobs, Kerrash's visit, the attack, cutscenes, Zeyna | Playable from character creation to waking |
| **4a. Reset (v0.3)** | Scope cut, combat feel pass, art style chosen from a sample and swapped in | Broden says combat is fun and picks the art |
| **5. Sentinel coast slice** | First region, full: the village with schedules, roads with travellers and random encounters, camps, caves and ruins, the first list targets | The first region is a complete, fun slice |
| **6+. Regions** | One region per release, in story order, each with its own palette, props, enemies and loot | Each release is playable on its own |

**Phase 0 spikes.**
- *Tech:* an isometric renderer with a layered character on a streamed two-slice map, measuring frame rate, memory and slice-load time. Include headless test hooks.
- *Art:* one character in eight directions with swappable equipment layers, a coastal and a desert tileset, one town building, a sample scene, compared with the concept images.
- *Combat feel:* a bare arena with attack, dodge and block. The feel must be right early.
- *Data:* extract the Skyrim reference data (`data/skyrim/README.md`), import it into JSON, and run the ten-row spot check.

**Quality gates.** Tests for every feature. A regression list run before each release. Version bumped, changelog updated, saves still load.

---

## 15. Decisions log (all LOCKED unless marked)

1. Browser game, built with Claude in VS Code. Keyboard and mouse.
2. Set in Hammerfell, about 4E 201. Our own story.
3. No dragon shouts. **No magic and no mages' guild in v1.** No Enchanting for v1 (confirm).
4. Skyrim's level, skill and perk model, with 12 skills and Health and Stamina only.
5. All ten races with adapted abilities. Non-magical birthsigns. Housing, followers, crime and crafting from Skyrim.
6. World equals Skyrim's playable map size, at 12 tiles per cell (about 1,428 by 1,128 tiles).
7. Seamless overworld slices. Towns and every building as separate loading areas.
8. First slice: the Sentinel coast.
9. True isometric, 64 by 32 tiles, characters about 112 to 128 px, eight directions.
10. Adult tone, gore, swearing. Gore setting and content warning. Massacre off-screen.
11. Protagonist: a husband and farmer, custom race, look and name, voiced like the Punisher.
12. Villain: Azhar Kerrash, the Saltmaker. The Hegathe lie. The wife is a hidden survivor. The child is taken, not killed.
13. Seven-name hunt list, with a Fury power unlocked per name.
14. Rage meter and Fury powers replace shouts. Three reputation systems: Infamy, Standing, Collateral.
15. Combat: dodge roll with perfect dodge, timed parry, manual finishers, dismemberment on heavy and power killing blows only, bleeding, scars and limps, morale. Combined difficulty scaling.
16. Dog dies in the prologue, a stray follows later. A horse is acquired.
17. Multiple endings, with "kill him" as the obvious one and "judged" as the costly alternative.
18. Personal use only.
19. **Voiced characters:** player and NPCs voiced, with written dialogue options in some conversations. Paraphrase system recommended. Pipeline undecided.
20. The main quest is written in `MAIN_QUEST.md` (beat sheet, cast with voice direction, scripted key scenes, three endings). Names marked (P) are placeholders.
21. The alive-world layer is a requirement: NPC schedules, overheard conversations, a gossip engine, reactive dialogue and callbacks to the family bond flags.
22. **NPCs may use magic; the player may not.** NPC spells use Skyrim's numbers.
23. **All stats, skills, perks, gear, armour, weapons and enemies use Skyrim's own numbers** (`data/skyrim/`). Hammerfell natives inherit a Skyrim donor row.
24. The player has 12 skills, 107 unique perks (165 ranks), level 66 and 65 perk points at full mastery.
25. Tavi is a girl, age 10. Default names are approved.
26. The Quiet Hand questline can go dark (`GUILDS.md`).
27. Master map v0 and all four guild questlines are written (`WORLD_MAP.md`, `GUILDS.md`).
28. Voice pipeline decided: licensed AI voices first, recorded actors for key characters later, with explicit care around the child's voice (`SYSTEMS_SPEC.md` section 13).
29. A fourth ending, "The Quiet Bargain", exists after the dark bargain at Valaneth.
30. The calendar clock is a pressure system, never a fail state.
31. **Camera split (art spike):** ground, buildings and props use the true 30 degree isometric camera. Characters and creatures are drawn at a shallower 12 degree pitch so faces and chests read, as in concept-05. Tested in the sample scene, where the two sit together without looking wrong.
32. **World scale kept at 12 tiles per Skyrim cell.** At character scale a tile is about 0.69 m, so the world (about 1,428 by 1,128 tiles) is about 1 km by 0.8 km of walkable space: Skyrim's layout, compressed about seven times. Chosen for performance (smaller slices to stream and draw) and so the world can actually be filled with hand-placed content. Towns and dungeons are built at character scale inside it.
33. **Eight directions are all drawn, none mirrored.** Mirroring moved the light and the asymmetric details (brand, pouch, parting); 79% of pixels differed.
34. **Renderer: PixiJS 8** with our own world and game logic (tech spike). Slice size 128 by 128 tiles confirmed.
35. **Lethality multiplier 3 (PROPOSED, tune in play):** Skyrim's damage, armour, block and stamina numbers are used unchanged, then multiplied by Skyrim's own Legendary value (`fDiffMultHPToPCL` = 3) on both sides. This gives "a farmer in leather dies in three or four hits" (combat spike).
36. **Phase 0 approved by Broden (2026-11-05):** PixiJS 8 stack and the code-drawn art direction. Phase 1 (engine core) released as 0.1.0: `game/`.
37. **Phase 2 systems core released as 0.2.0.** Skills level on Skyrim's curves from the export; perks apply through Skyrim's entry points (highest owned rank only). Armour rating per piece is base x (1 + 0.4 x (skill + 15) / 100), PROPOSED until checked in game.
39. **0.5.0 (PROPOSED, for Broden to confirm):** a new game wakes at the farm (slice 3,7 counting from 0, "Farm valley") outside the house at 07:00; the house interior and waking indoors come later. The player's default name is Kasim (P). Character creation lists all ten races but only those with drawn sprites can be picked (Redguard first). Gore defaults to full after the warning; the player chooses. Hidden family bond is stored 0 to 5 per family member, as MAIN_QUEST 0.1 says. Morale: a badly hurt enemy checks once; flee chances per style (bandit 35, Alik'r 15, marauder 5 percent), raised by Infamy.
40. **v0.3 scope reset (Broden, 2026-11-06):** melee only (7 skills), Redguard only, about 24 weapons and seven armour sets, no brewing, one full region before any other, combat feel before new systems, art direction reopened. Supersedes 4, 5, 6, 24 and the race list in 39, and reopens 9, 31 and 33.
41. **Combat feel numbers (0.6.0, PROPOSED, tune in play):** `FEEL` in `game/src/combat/combat.ts`. Player swings 1.3 times the frame rate; enemy wind-ups 0.3 s (quick) and 0.5 s (power), divided by weapon speed; presses kept 0.35 s; recovery cancellable 0.06 s after the blow lands; third combo hit x1.25; hit-stop 0.04 to 0.22 s; knockback 0.25 to 0.9 tiles; aim assist within 3 tiles and 67.5 degrees, lunge up to 0.7 tiles. Finisher 1.1 s of game time.
42. **Art style A chosen (Broden, 2026-11-06), to be refined:** top-down three-quarter camera (about 40 degrees), chunky figures about 50 px tall with big heads, four directions, drawn by code at runtime from one posed skeleton with layered gear. Replaces the raymarched 8-direction sprites (decisions 9, 31, 33). The second sample (`game/public/art-sample/`) has every armour set and weapon class, a bandit camp at dusk, dismemberment and a finisher per weapon class (blades behead, axes cleave, blunt crushes, daggers cut the throat).
43. **Rage as a skill with its own tree (Broden agreed 2026-11-06 that each name crossed off the list gives one free Rage perk point; the tree's numbers stay PROPOSED until played; replaces the Fury perk tree in 10.2):** Rage levels by use like the Skyrim skills (roaring, and blows, kills and finishers during Fury). Base Fury: 8 s, blows x1.25, damage taken x0.75, no flinching, a roar that staggers everyone near. Twelve perks bought with ordinary perk points: Bloodlust (3 ranks, +3 s each), Savage (3, +15% damage), Pain Is Nothing (3, -15% damage taken), Second Wind (unlimited stamina), Seething, War Cry, Red Mist, Butcher, Smouldering, Unstoppable, Untouchable, Deathless. Proposal for the story: each name crossed off the list gives one free Rage perk point, instead of a fixed Fury power. Enemy health +25 percent over round five.
44. **Voice barks (PROPOSED):** enemies have names and voiced barks by situation (spotting, attacking, hurt, scared, taunting, reacting to an ally's death by how he died, Fury, victory, idle talk); Kasim has short, flat lines. Lines are data. The sample speaks them with the browser's text-to-speech; the game is to play AI-generated recordings made from the same data (decision 28), service to be chosen by Broden.
38. **Phase 3 second part released as 0.4.0 (PROPOSED numbers, tune in play):** a serious wound is a hit of 30 percent of max Health or more; it bleeds (SYSTEMS_SPEC numbers), and a quarter of serious wounds land on the legs and lame. Dismemberment takes the head half the time, an arm 30 percent, a leg 20 percent. Finishers pick by situation: a broken guard takes the sword arm, a turned back is hamstrung then beheaded, otherwise the head. The first Fury power (Pain-ignoring burst) is open from the start until the hunt list is in the game. Enemy fighting styles (tank, berserker, duelist) are ours, as Skyrim's combat style records are not exported yet. Attack speed follows the weapon's Skyrim speed.

---

## 16. STATUS OF OPEN ITEMS (v0.2)

**Resolved in v0.2 (see the named file):** title placeholder kept, names and the child (`MAIN_QUEST.md`), master map (`WORLD_MAP.md`), guild questlines including the dark Quiet Hand (`GUILDS.md`), Fury powers and Fury perk tree, race adaptation, birthsigns, economy, crime and justice, desert exposure, radiant quests, travel, followers, housing, audio, UI, accessibility, cutscene format, calendar, New Game Plus, voice pipeline (`SYSTEMS_SPEC.md`), Skyrim reference data and the Hammerfell bestiary (`data/skyrim/`).

**Still to cover**
1. ~~Skyrim data completion~~ **Done in Phase 0:** exported from Broden's `Skyrim.esm` (with `Update.esm`) to `data/skyrim/json/`, 15 of 15 spot checks match. Still to derive in Phase 2: computed values (an NPC's final health, perk effects as numbers, per-skill XP multipliers).
2. ~~Technology choice~~ **Done:** PixiJS 8 (`docs/TECH_SPIKE_REPORT.md`). Awaiting Broden's approval.
3. ~~Art spike results~~ **Done:** code-drawn pipeline, all six gates (`docs/ART_SPIKE_REPORT.md`). Fidelity is simpler than the concept; plan is painted detail over the generated frames later. Awaiting Broden's approval.
4. **Canon check of the master map** against UESP and ESO maps, and slice-by-slice level design for all 88 land slices.
5. **Full line-by-line scripts** for every scene, and the side quests per region.
6. **Named-fight design** for the seven targets and the final duel, including Valaneth as a caster boss.
7. **Voice licensing review** and the plan for the child's voice. A launch blocker.
8. **Playtest the Collateral thresholds** and the Quiet Hand's darkest quest.
9. **Combat feel tuning:** the arena exists (`docs/COMBAT_SPIKE_REPORT.md`); needs Broden playing it. Finishers and dismemberment chance not tuned yet.
10. **Cutscene art** for the massacre night, and the painted stills.
11. **Legal note** if the game is ever shared: rename trademarked terms and replace borrowed lore before release.

**Deferred on purpose:** player magic and Enchanting, dragons and dragon content, crossbows (maybe), the islands (Stros M'Kai), further provinces, a crafting or merchant guild.

---

## Sources and references

- UESP wiki (CC BY-SA), Skyrim skills, perks, leveling, weapons, armour and races, and Hammerfell lore (Alik'r, Duneripper, Hammerfell). Extracted values are in `data/skyrim/`. Skyrim skills, perks and leveling pages: https://en.uesp.net/wiki/Skyrim:Skills , https://en.uesp.net/wiki/Skyrim:Perk , https://en.uesp.net/wiki/Skyrim:Leveling (18 skills, 180 unique perks, 251 with ranks, one perk point per level, XP per skill rank, Legendary reset).
- UESP lore, Hammerfell and regions: https://en.uesp.net/wiki/Lore:Hammerfell , https://en.uesp.net/wiki/Lore:Alik%27r , https://en.uesp.net/wiki/Lore:Sentinel , https://en.uesp.net/wiki/Online:Alik%27r (ESO-era place names to verify for 4E 201).
- Skyrim playable map size (119 by 94 cells, about 14.8 square miles) and relative size of Hammerfell and Skyrim: community measurements and discussion. Treat figures as approximate.
- The art brief ("Game Art Direction and Asset Production Brief v1.0") and nine concept images supplied by Broden.
