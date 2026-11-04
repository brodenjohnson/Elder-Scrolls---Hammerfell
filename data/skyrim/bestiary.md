# Bestiary (Skyrim creatures reused, Hammerfell natives added)

**Rule:** enemies use Skyrim stat blocks (health, damage, armour, resistances, level range, leveled lists). Hammerfell natives get a **donor row**: a Skyrim creature whose numbers they inherit, with a short list of changes. NPCs (bandits, soldiers, Thalmor, mages) use Skyrim NPC templates and Skyrim spell numbers. **NPCs may use magic. The player may not.**

## Creature level bands [V]
Skyrim sizes soul strength by creature level: Petty 1 to 3, Lesser 4 to 15, Common 16 to 27, Greater 28 to 37, Grand 38 and above or NPC. Use the same bands as our danger tiers.

## Skyrim creature roster kept [V names]
- **Animals:** bear (and cave bear, snow bear as variant stat lines), chicken, cow, deer, dog, fox, goat, horker, horse, mammoth, mudcrab, rabbit, sabre cat, skeever, slaughterfish, wolf.
- **Monsters:** chaurus, falmer (only if a Dwemer deep ruin needs them), frostbite spider, gargoyle (skip), giant, hagraven, ice wraith (skip, cold), netch (skip), riekling (skip), spriggan, troll, werewolf (optional dark-fantasy set piece), wisp.
- **Undead:** draugr (all ranks) and skeletons.
- **Dwemer automatons:** Dwarven Spider, Sphere and Centurion, each with Guardian and Master variants.
- **Daedra and atronachs:** appear only as NPC-summoned creatures or deep story set pieces. The player never summons them.
- **Excluded:** dragons, dragon priests, dragon-linked content.

## Verified sample stat lines [V]
Frostbite spiders (Skyrim:Monsters): Frostbite Spider level 1, Giant Frostbite Spider level 14 with 380 health and Frostbite Venom, Giant Frostbite Spider (Snow) level 17 with 510 health. Giant (Skyrim) around level 32 with 591 health. Use these four rows as the test rows for the importer.
Everything else: [X] extract.

## Hammerfell natives (donor rows)
| Creature | Lore basis | Donor row | Changes |
|---|---|---|---|
| **Duneripper** | Burrowing carnivore with scaled back, called a sand crocodile, hides for days [V UESP Lore] | Cave Bear | Burrows and ambushes from below, strong against slow targets, weak to being kept in motion |
| **Giant Scorpion** | Aggressive hunters that migrated from Dak'fron into the Alik'r, avoid settlements, kill lone travellers [V UESP Lore] | Giant Frostbite Spider | Poison sting does Health and Stamina damage like Frostbite Venom, resists slashing, weak to bashing |
| **Spikeworm** | Burrowing creature mentioned in the Alik'r, little else known [V, secondary] | Chaurus Hunter | Burrower. Keep the design vague and let the player discover it |
| **Desert Lamia** | Beastfolk along the Alik'r coast, a hostile desert subspecies exists [V UESP Lore] | Hagraven (a magic-using NPC creature) | A magic user. Uses Skyrim spell numbers (see below) |
| **Alik'r Warrior** | Redguard desert warriors, scimitars and common Hammerfell garb [V, Skyrim NPC exists] | Skyrim Alik'r Warrior and Bandit templates | Scimitar, light armour |
| **Jackal / hyena pack** | NEW desert scavengers | Wolf | Reskin only |
| **Desert sabre cat** | Sabre cats are generic Tamriel fauna | Sabre Cat | Reskin, sandy coat |
| **Yokudan Charger** (mount) | Horse breed from Aswala Stables in the Alik'r [V UESP Lore] | Horse | Desert speed, unaffected by sand |
| **Camel** (mount, pack animal) | NEW | Horse | Slower, large carry bonus |
| **Ancient Dead** (Yokudan undead) | NEW, fits Yokudan necropolises | Draugr line | Yokudan carvings, curved blades |
| **Giants** | Giants held strongholds in the region (Daghoth, Groleten, Nhorchen) [V UESP Lore] | Giant | Reskin, desert camps, mammoth herds replaced by guar or camels |
| **Dwemer automatons** | Dwemer ruins dot the desert (the Rourken Clan) [V UESP Lore] | Dwarven Spider, Sphere, Centurion | Unchanged |

## NPC magic users (allowed)
| Archetype | Donor | Where | Notes |
|---|---|---|---|
| Thalmor Soldier | Skyrim Thalmor Soldier | Thalmor outposts, patrols | Melee with elven gear |
| Thalmor Wizard | Skyrim Thalmor Wizard | Outposts | Flame, frost and shock spells |
| Justiciar | Skyrim Thalmor Justiciar | Highland outpost | Valaneth uses a boss version |
| Necromancer | Skyrim Necromancer | Ruins, Ayleid sites | Raise Zombie, Reanimate |
| Conjurer / Warlock | Skyrim Conjurer / Warlock | Bandit chiefs, cultists | Summons (flame atronach, skeleton) |
| Lamia sorcerer | Hagraven | Coast, tide caves | Spells plus melee |
| Wizard-for-hire | Skyrim Mage | Optional merchant guards | Wards, shock, fire |
Spell damage, cost and cast times: use Skyrim's numbers [X extract]. Names to capture: Flames, Frostbite, Sparks, Firebolt, Ice Spike, Lightning Bolt, Fireball, Ice Storm, Chain Lightning, Raise Zombie, Reanimate, Flame Atronach, Frost Atronach, Healing, Oakflesh, Stoneflesh.

## How the player counters magic (no player magic)
- **Armour reduces physical damage only** [V], so heavy armour does little against spells. This is by design. The counters: the **Block** perk Elemental Protection (shield blocking reduces elemental damage), **Resist Fire, Frost and Shock potions** from Alchemy, the **Breton** racial ability, Dunmer fire resistance and Nord frost resistance, cover and line of sight, and **killing the caster first** (casters have low health and armour).
- Wards and magical armour on enemies make them resistant to physical damage until the effect expires. Show the effect visually.

## Level scaling in the world
Use Skyrim's leveled lists (LVLN for NPCs, LVLC for creatures, LVLI for loot) so enemies scale with the player inside each region's band. Fixed-level deadly zones keep their level regardless: giants' camps, a Duneripper nest, high ruins, the Thalmor outpost.
