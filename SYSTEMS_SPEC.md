# Systems Spec v0.1 (decisions filled in)

Status: PROPOSED defaults, written so Claude Code can build without waiting. Broden told me to fill gaps with my best judgement. Anything marked (CHANGE?) is a call he may want to look at.

## 1. Magic policy (LOCKED)
- **The player cannot use magic.** No spells, staves, scrolls, enchanting, soul gems, or magical racial powers that mimic spells. No Magicka attribute.
- **NPCs can.** Thalmor, necromancers, conjurers, Lamia sorcerers and hedge-wizards use Skyrim's spell numbers (see `data/skyrim/bestiary.md`).
- **Magic items** in the world work for NPCs only. Loot from them drops as non-magical equivalents (an enchanted sword drops with its base stats and a "its spell is gone" description).
- **Defence against magic:** armour only reduces physical damage (Skyrim rule), so the counters are Block's Elemental Protection, Resist potions, race resistances, cover, and killing casters fast.
- Magic can be added for the player later. The attribute and skill lists stay extensible.

## 2. Skyrim numbers rule (LOCKED)
Every stat, skill, perk, weapon, armour, material and enemy uses Skyrim's own numbers. See `data/skyrim/`. Where Skyrim has no number (dodge, parry, finishers, Rage, wounds), use the values in this file and section 11 of the bible, built from Skyrim inputs (Stamina, weapon damage, armour). When a Skyrim number is unknown, mark it [X], pick the Skyrim-adjacent value, and record it in `data/skyrim/TODO.md` so it can be replaced after extraction.

## 3. Smithing: two perks replaced
Skyrim's **Arcane Blacksmith** (improves enchanted gear) and **Dragon Armor** (needs dragons) are removed. Replacements (NEW, tune in testing):
- **Redguard Steel** (Smithing 60, after Orcish Smithing): curved blades (scimitars and the Redguard sword line) improve 25 percent more at the grindstone.
- **Master Armorer** (Smithing 100, after Ebony and Daedric Smithing): improving any armour piece gives one extra tempering step beyond the usual cap.
Unique perk count stays 10.

## 4. Combat numbers we add (starting values, tune in testing)
| Item | Value |
|---|---|
| Dodge roll cost | 20 Stamina (heavy armour +50 percent, light armour unchanged) |
| Roll distance | about 3 tiles, invulnerable for the first 0.25 s |
| Perfect dodge window | last 0.15 s before impact. Time slows to 30 percent for 0.8 s. Counter does 2x damage and staggers. |
| Parry window | 0.2 s before impact with Block held or tapped. Staggers the attacker for 1 s. |
| Block drain | Skyrim Block numbers [X]. Blocked damage reduces Stamina as well as Health |
| Quick attack chain | 3 hits, each costing a small Stamina amount (Skyrim light attack cost [X]) |
| Power attack | Skyrim power attack Stamina cost [X], Fighting Stance and Barbarian-line perks reduce it as in Skyrim |
| Finisher | needs a staggered target or a target below 25 percent Health. Takes 1 to 2 s. The player is vulnerable. |
| Dismemberment | heavy and power killing blows only. Base chance 25 percent. Two-handed +15. Axes +10. Heavy armour on target -10. Savage Strike or Devastating Blow adds the Skyrim decapitation chance on top. Always on a finisher. |
| Bleeding | Skyrim has bleeding from the Hack and Slash perk. Our wound bleed is 1 Health per second for 10 s, stopped by a bandage (made by Alchemy) |
| Limp | a serious leg wound (a hit of more than 30 percent of Health to the legs, or a critical) cuts movement by 25 percent until treated or a game day passes |
| Scars | cosmetic and permanent, added on survived hits above 30 percent of max Health |
| Morale | at 25 percent Health or after allies fall, a non-boss enemy rolls to flee or surrender. Chance depends on faction and the player's Infamy |

## 5. Rage and Fury
**Rage meter:** 0 to 100. Fills from damage taken (1 per 1 percent of max Health lost), damage dealt (1 per 5 percent of an enemy's Health dealt), kills (3), finishers (10), witnessing atrocities (2 to 10, scripted). Decays 1 per second out of combat after 10 s.
**Burning Rage:** at 100 (or a Fury power spend), the player enters **Fury** for the power's duration: cannot block cleanly (block works at 50 percent), cannot sneak, and takes **Exhaustion** afterwards (Stamina regeneration halved for 30 s).
**Seven Fury powers**, one per name crossed off the list:
| # | Power | Unlocks after | Cost | Duration | Effect |
|---|---|---|---|---|---|
| 1 | Pain-ignoring burst | Tarik | 30 | 8 s | Ignores flinch, +15 percent damage resistance |
| 2 | Cleaving sweep | Bahram | 40 | instant | A 270 degree sweep, power-attack damage x1.5 to all in reach |
| 3 | Scent-track | Irsa | 20 | 60 s | Marks a target and shows their trail and position |
| 4 | Terrifying roar | Sulayman | 35 | instant | Weak enemies (level below the player's) flee for 20 s. Bosses ignore it. |
| 5 | Execution | Farid | 50 | instant | A guaranteed finisher on one target in reach, ignoring stagger |
| 6 | Berserk | Valaneth | 60 | 12 s | Double weapon damage, take half damage, then Exhaustion doubled |
| 7 | The Last Name | Kerrash | 100 | 15 s | Story power. Resolves the final fight and is unavailable afterwards |
**Fury perk tree (12 perks, 1 Fury point per name crossed off and 1 per guild finale, so 11 total):**
Banked Rage (decay is slower), Steady Breath (Exhaustion shortened), Red Mist (fill rate up), Open Wound (bleed on power attacks), Hold the Line (block stays at 75 percent during Fury), Second Wind (finishers restore 10 Stamina), Last Man Standing (below 20 percent Health, Rage fills faster), Terror (Infamy makes roar longer), Quiet Fury (Fury allowed while sneaking, with sneak penalties halved), Iron Calm (the guild-finale perk), Fury Linked (chain two Fury powers without cooldown once a day), and Debt Paid (Exhaustion lasts half as long while Collateral is under 10, a mechanical echo of Khadija's lesson).

## 6. Reputation (LOCKED shape, numbers PROPOSED)
- **Infamy 0 to 100.** Raised by public kills (+2), atrocities (+5 to +10), fleeing kills (+3), Fury in public (+1 per use). Falls 1 per game week with no crimes. Thresholds: 20 whispers, 40 nervous service and +10 percent prices, 60 guards watch and bounty hunters appear, 80 posters and fleeing crowds.
- **Standing** per faction, -100 to +100. Skyrim-style quest rewards.
- **Collateral** (hidden): +1 per non-combatant or forced conscript killed. Zeyna's line at 15, Leyla at 25, Khadija at 35. The Ledger ending needs fewer than 25. Never displayed as a number.

## 7. Economy
Item values are Skyrim's. Barter uses Skyrim's Speech-based price curve [X extract]. Merchants carry gold pools and restock every few game days [M, Skyrim default]. Infamy raises prices as above, and Standing lowers them. Gold sinks: training (Skyrim: cost grows with skill level), housing, tempering materials, bribes.

## 8. Crime and justice
Skyrim's system with Hammerfell colouring.
- Each city is its own **jurisdiction**: Sentinel (Forebear law), Hegathe (Crown law), Seven Wells (Alik'r law), plus the Greenwater and the Anchorage with no guards. Bounties are per jurisdiction.
- Bounty values (Skyrim [M], confirm): trespass 5, pickpocket 25, assault 40, murder 1,000, theft scales with item value.
- Consequences: pay the fine, serve time in the jail (Skyrim loses skill levels unless a perk or a bribe is used), or resist arrest. Resisting is fatal for low levels.
- Hammerfell colour: Crown guards are lenient to Crown citizens, Forebear guards to Forebears. Alik'r law uses ordeal and water debts instead of jail. Bribes work in the Greenwater.

## 9. Survival: desert exposure (CHANGE?)
Light version only, to keep the Skyrim feel.
- **Heat** applies in the Alik'r, Fallen Wastes and Rustwater Coast between mid-morning and late afternoon: Stamina regeneration -25 percent in the open, 0 in shade or at night, reduced by Alik'r garb, a full waterskin, and the Redguard race. Water is found at wells and in potions.
- **Cold** in the Highlands at night: Stamina regeneration -15 percent, reduced by Nord resistance and warm gear.
- **Sandstorms:** reduce visibility and mask scent. Enemies lose tracking. The player does too.
- No hunger meter in v1. Food heals as in Skyrim.

## 10. Quests beyond the main line
- **Faction quests:** see `GUILDS.md`.
- **Radiant quests:** yes, eight Skyrim-style templates generated at hub job boards: bounty hunt, fetch, escort, clear a camp, deliver, recover stolen goods, find a missing person, defend a well. Each pays Skyrim-style gold and skill XP.
- **Side quests:** about 10 hand-written per region, each tied to a named NPC from `MAIN_QUEST.md` section 8.
- **Misc:** notes, lore books, ruin puzzles, and the Hammerfell "wanted" board.

## 11. Followers, mounts, housing
- **Followers (Skyrim rules):** one follower at a time, commands, carry weight, level scaling. **Khadija** and **Kami** are recruitable. **Dune's stray successor** is a dog follower. A **horse** is acquired in Act One.
- **Mounts:** horses are faster, better on roads, and are lost if they die. The **Yokudan Charger** and **camel** are desert mounts (see bestiary).
- **Housing:** Skyrim-priced houses in Sentinel, Hegathe and Seven Wells. **The farm can be rebuilt** after the main quest (a Hearthfire-style build) and is the ending beat for the Salt and Ledger paths. [M] Skyrim prices: 5,000 to 25,000 gold.

## 12. The calendar (pressure, never a fail state)
After the midpoint a 45-day clock runs. Three steps: Day 15, Day 30, Day 40. Each step raises enemy levels in Hegathe Reach by +5 and removes one optional ally mission, and Kerrash sends a colder message. **Nothing removes the possibility of reaching the child.** At Day 45 the Desert Law ending closes unless Mother Anwar was already in on the plan.

## 13. Voice pipeline (decision made)
- **Recommended path:** use a **licensed AI voice service** for every line at first, with a distinct voice per character. Review the licence terms for the service before use. Replace the key characters (the player, Nadira, Tavi, Kerrash, Zeyna, Khadija) with recorded actors later if budget allows. The pipeline must swap files without code changes.
- **Size estimate:** about 6,000 lines of 3 to 5 seconds at 24 kbps Opus is about 70 MB. Stream per scene, not up front.
- **The player's voice:** one voice per race group (four groups: human, elven, orc, beast). The player's lines are written once and voiced per group.
- **Child voice:** requires explicit care. A child voice must be an age-appropriate synthetic voice or a recording with proper guardian consent. Do not clone any real child's voice. Treat as a launch blocker.
- **Subtitles** always on by default, with speaker names.

## 14. Audio and music
- Music: Redguard-flavoured strings, oud, hand drums, low brass for danger, sparse during the prologue, silence for the attack.
- Ambient: sea and wind on the coast, insects and drums in the Greenwater, wind and sand in the desert, bells in Hegathe.
- Combat sound: heavy impact, wet hits, clear dismemberment cues. Fury has its own low heartbeat bed.
- All audio is also governed by the gore and mature-content settings.

## 15. UI and UX
- **HUD:** Health (red), Stamina (green), Rage (a thin amber bar that glows when usable), compass, active effects, quick-use items. No Magicka bar.
- **Inventory and equipment:** Skyrim-style with weight and value, filters, a compare panel.
- **Perk screen:** a branching tree per skill in our own art style (aged parchment and stone), with the Fury tree as a separate tab. Shows current and next rank text and the points left.
- **Map:** slice grid with fog of war and discovered locations, a calendar tab after the midpoint.
- **Journal:** main quest, faction quests, radiant, a "names" page with the seven names crossed off in blood.
- **Dialogue:** a paraphrase wheel (short option, longer voiced line), skill and reputation tags shown on options, subtitle line under the camera.
- **Menus:** settings (gore, finishers, difficulty, subtitles, text size, colour options), saves (multiple characters), loading screens (towns and buildings).
- **Accessibility:** remappable keys, text scale, high-contrast outline option, flashing-effect toggle, colour-blind palettes, gore and finisher toggles.

## 16. Cutscenes
In-engine, letterboxed, with camera moves and held shots, plus a few painted stills for the massacre night (silhouettes, a door, the player's face). Skippable on replay. Always voiced.

## 17. Other resolved items
- **Child:** Tavi (P), a girl, age 10. Default names per race are in section 18.
- **The brand:** a fish-hook within a grain of salt, scarred on the chest. It shows in the character model and affects some NPC reactions.
- **Farm after the story:** rebuild, sell or abandon. Rebuilding is the quiet ending beat.
- **Kerrash's salt economy:** salt prices and shortages track his power. Marked barrels with the hook seal appear in every region and can be destroyed for Standing with the Wreckers.
- **Thalmor at Hegathe:** a Thalmor observer attends Relief Day. If the player took Valaneth's dark bargain, a Thalmor detachment is in the keep. Otherwise only an observer.
- **Fourth ending ("The Quiet Bargain"):** available only after the dark bargain at Valaneth. The player hands the Thalmor the ledger and gets the child back with Hammerfell's secrets in Dominion hands. A bleak ending with its own epilogue.
- **New Game Plus:** carry over perks (not skill levels), scars and the stray dog. Raises enemy levels. Unlocks the hardest finishers.
- **Hammerfell natives, names and the master map:** see `data/skyrim/bestiary.md` and `WORLD_MAP.md`.

## 18. Default family names per race
| Race | Wife | Child (girl, 10) | Dog |
|---|---|---|---|
| Redguard (default) | Nadira | Tavi | Dune |
| Nord | Hilde | Tove | Fenn |
| Imperial | Livia | Lucia | Rufus |
| Breton | Elaine | Mirabel | Pip |
| Altmer | Irelith | Elenwe | Sunny |
| Bosmer | Ayla | Nilla | Brindle |
| Dunmer | Dreyla | Savil | Ash |
| Orc | Gharza | Umbra | Brute |
| Khajiit | Ri'sha | Tazi | Dust |
| Argonian | Keeva-Sha | Teeba | Mudge |
The player may rename all three at character creation.

## 19. Open items that remain
1. **Skyrim data completion** (Phase 0 extraction). [X] rows in `data/skyrim/`.
2. **Full line-by-line scripts** for every scene.
3. **Slice-by-slice level design** for every land slice.
4. **Named-fight design** (arenas, phases, tells).
5. **Final art direction** from the art spike.
6. **Licence review** of the chosen AI voice service.
7. **A second look at the Quiet Hand and the Collateral thresholds** in play.
