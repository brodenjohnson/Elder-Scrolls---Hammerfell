# Main Quest Beat Sheet and Dialogue Bible v0.2

Companion to `DESIGN_BIBLE.md`. Working title: **The Salt Ledger** (TBD).
Status: v0.2. Names marked (P) are approved defaults that Broden can still rename. NPCs may use magic. The player may not. All numbers follow Skyrim (`data/skyrim/`).

---

## 0. How to read this document

- **LOCKED** decisions come from `DESIGN_BIBLE.md`. Everything new in this file is **PROPOSED** until Broden approves it.
- Scenes are written as playable scripts. Voice direction is in (brackets). Lines have IDs so they can be recorded or generated and tested.
- Names in this file use tokens where the player's choices change them: **[PLAYER]** (name chosen at creation), **[WIFE]** default "Nadira" (P), **[CHILD]** default "Tavi" (a girl, age 10), **[DOG]** default "Dune" (P). Family names and look match the race the player chose.
- Section 12 lists what this file still leaves open.

### 0.1 Dialogue notation

```
SCENE ID  PRO_06_GUEST
[SPEAKER] (voice direction) "Line."                         ID: PRO06_KER_014
> PLAYER OPTIONS
  1. [Tone] "Short on-screen option"                        -> spoken: "Full voiced line."   (effects)
  2. [Check] "Option behind a skill or state check"         -> ...
```

- **Tone tags** on options: [Flat] [Warm] [Dry] [Cold] [Threat] [Lie] [Truth] [Silent].
- **Checks:** [Speech 25], [Infamy 30], [Standing: Sword-singers 20], [Memory: tin], [Scar], [Dog].
- **Effects:** (+Bond W/C/D) hidden family bond, (+Infamy), (+Collateral), (Flag: name). Bond flags drive the emotional callbacks in Acts Two and Three.

### 0.2 Voice and dialogue pipeline (decision needed, see section 12)

Broden asked for **voiced player and NPCs, with written dialogue options in some cases**. That is the biggest content cost in the project. Recommended approach:

1. **Paraphrase options.** The screen shows a short option. The protagonist speaks a fuller, voiced line. This keeps the Punisher voice consistent, keeps the option list readable, and means the player character only needs lines that were written for him.
2. **One protagonist voice per race group,** with a small shared line set (grunts, effort, pain, rage, death) per voice. Character creation picks a voice.
3. **Tiering.** Tier 1 fully voiced: main quest, faction finales, family, mentor, villain, the seven targets. Tier 2 voiced for the first meeting and key branches: faction NPCs and named townsfolk. Tier 3 text with short voiced barks: the rest.
4. **Voice source (OPEN):** recorded actors, licensed AI voices, or AI voices for prototyping with recorded lines for key characters. Check licensing for any AI voice before use. A child's voice (the daughter or son) needs special care.
5. **Every line has an ID and a voice note** so the audio can be swapped later without code changes.
6. **Estimated size of this file's content:** about 4,000 to 5,500 spoken lines for the main quest and companions, plus about 2,000 barks, if every branch is voiced. Plan the pipeline accordingly.

### 0.3 The alive-world layer (applies to every scene)

- **Schedules.** Every named NPC has a job, a home and a daily routine. They go to work, to the tavern, to bed, and talk to each other.
- **Overheard conversations.** NPC to NPC chatter near hubs: gossip, arguments, jokes, tax complaints, news of the player.
- **Gossip engine.** What the player did spreads, with exaggeration, to nearby towns within a few days. Infamy rises, and NPCs repeat distorted versions.
- **Reactive dialogue.** NPCs notice the **brand and scars**, the dog and horse, equipment, Infamy and Collateral, and whether the player has been seen in a rage.
- **Memory callbacks.** Family bond flags return as flashes, objects and lines.
- **Rumour boards, wanted posters,** salt-tax notices and, once Infamy is high, a poster of the player.
- **Every named character is worth talking to:** they want something, know something, or have a view the player can change by what he says.

---

## 1. Cast

### 1.1 The family and the household

**[PLAYER]** (voice: low, level, a little dry. A man who has stopped explaining himself. In the prologue he is warm in small ways. After the attack the warmth is gone and the dryness stays.)
- Direction by act: Prologue (easy, tired, kind). Act One (hollow, flat). Act Two (quiet, precise, occasional bitter humour). Act Three (almost gentle, which is the most frightening he gets).

**[WIFE] Nadira (P)** (warm, quick, teasing, private. A woman who has practised being ordinary for twenty years.)
- A survivor of the Hegathe refugee column, a child then, raised under a Forebear name. She kept the proof. She loves him and has lied to him since day one, which is how she kept him safe.

**[CHILD] Tavi** a girl, age 10 (bright, curious, a collector of small things, scared of the dark, not scared of the dog). Never harmed on screen. Alive and held by Kerrash.

**[DOG] Dune (P)** (a coast farm dog, brown, scarred ear, stubborn). Dies defending the family. A stray later fills the space without replacing it.

### 1.2 Allies

**Zeyna** (old apothecary, village herbalist, dry as paper, kind in ways she denies, always holds something back). She was Nadira's oldest friend and knew the secret. She heals him, and she wants the ledger too.

**Khadija "the Unbent"** (P) (old Sword-singer exile, short on patience, long on discipline, not interested in the player's grief, only in what he does with it). Mentor. Brings the Sword-singers' Circle.

**Juma Redtide** (P) (Wrecker smuggler captain, cheerful and lethal, hears everything, never runs a free ferry). Brings the Wreckers.

**Advocate Leyla Rasul** (P) (Forebear court advocate in Sentinel, careful, ambitious, terrified, brave when it counts). Holds one folio and the way to a public trial.

**Mother Anwar** (P) (Alik'r caravan elder, a voice like a closed door that eventually opens). Holds one folio.

### 1.3 Antagonists

**Azhar Kerrash, "the Saltmaker"** (voice: pleasant, warm, reasonable, amused. He never raises his voice. He eats while he threatens.)
- Habits: puts a pinch of salt on the table before every threat. Never pays. Thanks people for the privilege of being robbed.

**The seven names**

| # | Target | Role | Region |
|---|---|---|---|
| 1 | **Tarik Hasani** (P), "the Collector" | Tax rider and bully. Starts it. | Coast |
| 2 | **Bahram Kesh** (P), "the Hammer" | Enforcer. Led the raid on the farm. | Coast ruins |
| 3 | **Irsa Qadir** (P), "the Auctioneer" | Slaver | Jungle |
| 4 | **Sulayman Dar** (P), "the Factor" | Informant | Desert caravans |
| 5 | **Magistrate Farid Azmat** (P) | Launders the money | Sentinel |
| 6 | **Justiciar Valaneth** (P) | Thalmor handler | Highlands |
| 7 | **Azhar Kerrash** | The Saltmaker | Hegathe |

### 1.4 Village and town recurring cast (a sample, first village)

Saltreach (P), the village near the farm:
- **Old Amira** (baker, a gossip, knows everyone's business, on the player's side)
- **Haddad's empty house** (a neighbour family gone, table laid, door open: the first sign)
- **Brother Yusuf** (a nervous priest who keeps his head down, later keeps his word)
- **A boy named Kami** (runs errands, wants to be a Sword-singer, later joins the player's cause as a runner)
- **The stall-keeper Dalia** (sells salt, resents the tax, keeps a ledger of her own)

Each has a daily route, a view on the tax, and something to hide.

---

## 2. PROLOGUE: Home (about 45 to 60 minutes, level 1)

**Purpose:** teach the controls through small, warm jobs, build the family into the player's chest, plant every clue the story will pay off, and end on a loss that cannot be fought. Two in-game days. Cutscenes carry the emotional peaks. The final night is a scripted defeat.

**Plants for later (do not skip any):** the missing neighbours, the tax rider Tarik, the pinch of salt, Nadira's near-confession, Zeyna's odd question, the carved gull, the tin hidden under the well stone, the dog's scarred ear, the player's old conscript tattoo, and Kerrash's compliment about the cooking.

**State tracked:** Bond with wife, child and dog (hidden, 0 to 5 each). Flags: told the child the gull story, intervened in the market, mentioned the war to Nadira.

### PRO_01 Morning (tutorial: move, interact, talk)

*Dawn. A one-room farmhouse on a low coastal hill. Salt pans glitter in the distance. Goats complain. The player wakes. Control prompts appear only as small marks in the world.*

**NPCs:** [WIFE] at the hearth, [CHILD] under the table with a cracked bowl, [DOG] asleep on the player's boots.

```
[WIFE] (warm, teasing)  "He lives. Come eat before the goats do it for you."          ID: PRO01_WIF_001
> PLAYER OPTIONS
  1. [Warm] "Morning."                  -> spoken: "Morning. You've been up for hours."   (+Bond W)
  2. [Dry] "Is that bread or a brick?"  -> spoken: "Is that bread, or did you build a wall?" (+Bond W)
  3. [Flat] "Later."                    -> spoken: "Later. Water first."                   (neutral)

[WIFE] (smiling, pushes bread at him)  "Brick, wall, whatever it is. Eat it."
```

**Child beat.** [CHILD] shows a find: a gull feather, a shell, a beetle, a knucklebone.

```
[CHILD] (excited, whispering)  "Da. I found a bone. Guess what it's from."             ID: PRO01_CHD_003
> PLAYER OPTIONS
  1. [Warm] "A goat."                   -> spoken: "A goat. A disrespectful one."          (+Bond C)
  2. [Dry] "A very old fish."           -> spoken: "A fish. A very old, very stubborn one." (+Bond C)
  3. [Truth] "A man's finger."          -> spoken: "Don't tell your mother, but it's a man's finger." (+Bond C, child delighted, wife heard: dry look)
```

**Dog beat.** Prompt to pet. [DOG] rolls over. (+Bond D). A second press makes him follow.

**Tutorial:** the player is given three small tasks by the wife: water from the well, feed the goats, mend the north fence. (Shown on the quest tracker as "Morning chores".)

### PRO_02 The fence and the neighbours (tutorial: tools, crafting, light combat prompt)

The fence is down because "something dragged it". The player gathers wood and nails and mends it. [CHILD] helps by holding things and being wrong. A smell of burning drifts across the ridge from the next farm.

```
[CHILD] (worried, then brave)  "Is Mr. Haddad's chimney always that smoky?"            ID: PRO02_CHD_002
> PLAYER OPTIONS
  1. [Warm] "It's wash day."            -> spoken: "Wash day. They burn a lot of wood on wash day."  (comfort, Bond C)
  2. [Truth] "No. Stay with me."        -> spoken: "No. Stay near me." (child stays close; sets tension, Bond C)
  3. [Flat] "Hand me the nails."        -> spoken: "Nails." (moves on)
```

**Optional:** walk to the Haddad farm. The gate is open, the table is laid for dinner, nobody is home. A bowl of lentils is cold. A single salt-pan cart track leaves the yard. **This is the first clue.** The dog will not enter the house. No combat.

### PRO_03 Market in Saltreach (tutorial: loading into a town, trading, Speech, a first moral choice)

*A short walk to the village. The loading screen shows the street name. Saltreach is small, loud and a little frightened.*

**What the player does:** sell goat cheese and eggs, buy lamp oil and a bolt of cloth for [WIFE]. Learn the barter menu and a first Speech check.

**Old Amira** (baker, gossip):
```
[AMIRA] (warm, conspiratorial)  "Eleven loaves for the road, and I'm giving the twelfth to the child. Don't argue. Have you heard about the Haddads?"   ID: PRO03_AMI_001
> PLAYER OPTIONS
  1. [Dry] "Heard what?"                -> she tells: "Gone in the night. Took nothing. The soldiers say they ran from a debt."
  2. [Flat] "I don't gossip."           -> spoken: "I don't gossip." (she beams, tells him anyway)
  3. [Speech 15] "Who says they ran?"   -> spoken: "Who says they ran?" -> she lowers her voice: "The collector. Tarik. He said it before anyone knew they were gone." (Flag: Tarik_knew)
```

**The Collector arrives.** **Tarik Hasani**, mounted, with two guards, collecting the "Patriot's Share" from a salt stall (Dalia). He is cheerful, loud and cruel in a small way: he tips her cart over to "check for contraband".

```
[TARIK] (jovial, bullying)  "Three sacks for the Patriot's Share, two for the processing, one for my trouble. Smile, woman. You're helping Hammerfell."   ID: PRO03_TAR_004
> PLAYER OPTIONS (the first real choice)
  1. [Silent] Stay out of it.                              (+0; Flag: watched_collector)
  2. [Speech 20] "She's paid. Check your tally."           -> a calm word; he looks the player over, smiles, backs down. (+Standing Saltreach, Flag: tarik_remembers)
  3. [Threat] "Pick up her cart."                          -> a tense stand-off. Guards close in. Dalia whispers "Don't." (+Infamy, Flag: tarik_remembers_hard)
```
Any choice sets up the Collector. If the player intervenes, **Tarik remembers**: in Act One he says "You. Farmer. The one who was so *brave* at the market."

**Zeyna's stall.** She sells herbs and a few things that aren't herbs. She looks at the player as if she is reading a label.

```
[ZEYNA] (dry, quiet)  "The wife all right? Eating? Sleeping?"                             ID: PRO03_ZEY_001
> PLAYER OPTIONS
  1. [Dry] "She's well. Why?"           -> spoken: "She's well. You ask like a doctor." -> Zeyna: "I ask like a friend who was never thanked."
  2. [Warm] "Come to supper."           -> spoken: "Come to supper tomorrow. She'd like it." -> Zeyna: "I might. I might." (Bond W: wife is glad)
  3. [Flat] "Fine."                     -> spoken: "Fine." -> Zeyna: "Good." Then, to herself: "Good."
[ZEYNA] (low, giving him a small bundle)  "Give her this. Tell her I said the weather is changing."   (a coded message; Flag: zeyna_message)
```

### PRO_04 Evening (bonding, the gull, the near-confession)

Home. Dinner. [CHILD] gives the player a **carved wooden gull**, a cheap thing she made.

```
[CHILD] (shy, proud)  "It's a gull. Its wing is crooked because I hit it."              ID: PRO04_CHD_001
> PLAYER OPTIONS
  1. [Warm] "It's perfect."             -> spoken: "It's perfect. Crooked wings fly harder." (+Bond C, Flag: gull_kept)
  2. [Dry] "I'll keep it in my pocket." -> spoken: "I'll keep it on me. Nobody touches it." (+Bond C, Flag: gull_kept)
  3. [Flat] "Go to bed."                -> spoken: "Bed." (the child's face falls; -Bond C; Flag: gull_dismissed)
```

**Bedtime.** [CHILD] asks for the story of the gull who got lost. A short voiced story. The player may tell it plainly, fumble it, or tell it badly on purpose and be corrected.

**The wife.** After the child sleeps, [WIFE] gives the player the bundle from Zeyna. She goes quiet when she reads the note: "The weather is changing."

```
[WIFE] (carefully light)  "Can I ask you something stupid? If I had a secret, a bad one, from before you... would you hate me for it?"   ID: PRO04_WIF_011
> PLAYER OPTIONS
  1. [Warm] "No."                       -> spoken: "No. Nothing could make me." (+Bond W, big; she nearly cries)
  2. [Truth] "Depends on the secret."   -> spoken: "Depends on the secret. But I'd stay." (+Bond W; she smiles unhappily)
  3. [Dry] "Is this about the goat?"    -> spoken: "Is this about the goat? I told you, it was already dead." (light; she laughs; the moment passes)
  4. [Flat] "We've all got one."        -> spoken: "We've all got one. Come to bed." (she exhales; Flag: wife_asked)
[WIFE] (softly)  "Remember you said that."                                              ID: PRO04_WIF_014
```
**Memory plant:** she checks the well stone as she goes out to lock the gate. (Flag: tin_under_well. The player may follow her; she says it's the latch.)

### PRO_05 The hunt (Day Two morning, tutorial: sneak, bow, melee, dodge)

[DOG] leads the player to a boar that has been rooting up the barley. A guided combat tutorial: crouch, shoot, dodge the charge, finish it with the knife. The dog gets gored on the ear (that becomes the scar). The player bandages him.

```
[DOG-reaction] whine, then a tail thump.
> Optional PLAYER line (if Bond D >= 2): [Warm] "Good lad."  -> spoken: "Good lad. That one's yours." (+Bond D, Flag: dog_praised)
```
On the way back the player notices a **line of riders on the coast road**. They are not tax riders. They stop at the farm gate. One of them waves.

### PRO_06 The Guest (the key scene: Kerrash at the table)

*Midday. Three riders. A big man in a clean coat gets down first and takes his hat off.* **Azhar Kerrash.** He is friendly, tired-looking and delighted to be here.

**Scene goals:** the player likes him a little. The audience is already afraid. The wife recognises something. The pinch of salt appears.

```
[KERRASH] (warm, rueful)  "Forgive the intrusion. Hot day, long road. A man heard there was a farm on this hill with the best goat cheese on the coast."   ID: PRO06_KER_001
> PLAYER OPTIONS
  1. [Warm] "Sit. Eat."                 -> spoken: "Sit down. There's enough."                (Flag: hospitality_given)
  2. [Cold] "Who are you?"              -> spoken: "Who are you?"                                (Kerrash: "Just a neighbour. A big neighbour.")
  3. [Flat] "The cheese isn't for sale." -> spoken: "The cheese isn't for sale today."        (Kerrash laughs. "Then I'll eat it for free and call it generosity.")
```

**At the table.** Kerrash makes small talk, and each small thing is a probe:
- He compliments [WIFE]'s cooking. "Where did you learn bread like this? You don't hear a Forebear accent from those hills."
- He asks the child's name and ruffles the child's hair.
- He asks the dog's name and *scratches the scarred ear*.
- He asks the player: "Were you in the war?" The player can answer.

```
[KERRASH] (curious, pleasant)  "You've a soldier's back. Hegathe, was it? The relief column?"   ID: PRO06_KER_009
> PLAYER OPTIONS
  1. [Truth] "Conscript. Three years."  -> spoken: "Conscript. Three years. I don't talk about it." (Flag: told_kerrash_hegathe)
  2. [Lie] "Never been in a war."       -> spoken: "I farm goats. That's my war." (Kerrash's smile stays exactly where it was)
  3. [Cold] "That's not your business." -> spoken: "That's not your business." (Kerrash: "Everything on this coast is my business. Gently.")
```

**The pinch of salt.** Kerrash takes a pinch of salt from the pot and sets it on the table, in a little white mound.

```
[KERRASH] (kind, almost sad)  "Now. The Patriot's Share. I do hate this part. Twenty sacks a season, for the protection of this whole coast. Your neighbours were late. You've been so good about it."   ID: PRO06_KER_014
> PLAYER OPTIONS
  1. [Speech 25] "We have no sacks to spare."    -> spoken: "We grow goats and barley. I haven't got twenty sacks to spare." (Kerrash: "Nobody ever does. Think it over. I'll come back for the answer.")
  2. [Threat] "Get out of my house."              -> spoken: "You've eaten. Get out of my house." (Kerrash: "That's two people today who've refused me. Shame." His men shift. Flag: kerrash_refused)
  3. [Warm] "We'll find it."                      -> spoken: "We'll find it. Give us time." (Kerrash is pleased; Flag: kerrash_appeased)
  4. [Silent] Say nothing.                        -> The room is very quiet. The dog growls. Kerrash: "He's a good judge of character."
```

**The wife's tell.** When Kerrash looks at her too long she drops a spoon. When he says "You have the look of someone I knew," she answers:

```
[WIFE] (steady, too steady)  "I get that a lot. I have one of those faces."            ID: PRO06_WIF_019
[KERRASH] (smiling)  "No. It'll come to me."
```

He leaves. At the gate he turns and says to the player, softly, "I did try to be pleasant. People always make me do it the hard way." Then he rides out, leaving the little salt mound on the table.

### PRO_07 The night (the scripted defeat, then the brand)

**Beat 1, the alarm.** The dog barks. Torches on the road. The player takes the old knife from under the bed. A short, panicked fight at the door against four men (scripted: the player can win the first exchange but there are too many). A chance to kill one: the first kill is brutal and quiet. Rage flickers for the first time and the screen goes red at the edges.

**Beat 2, cutscene.** The player is hit from behind and driven to his knees. **Bahram Kesh** (the Hammer) steps in, with a face the player will remember for the rest of the game. The cutscene cuts to the family from the player's pinned point of view: [WIFE] in the doorway with the child behind her. She says one thing.

```
[WIFE] (calm, direct, to [PLAYER])  "I'm sorry. I should have told you. Find Zeyna."   ID: PRO07_WIF_030
```
(If wife_asked and Bond W high: she adds, "You said you'd stay.")

**Beat 3, implied.** The camera stays on the player's face. Sounds: a dog's last cry, a door, a child's voice saying "Da?", then a silence that is worse. A boot comes down. The camera does not move.

**Beat 4, the message.** Kerrash is present now, calm. He crouches by the player. He puts a pinch of salt in the player's mouth, and lights the heated iron brand. He speaks, and each line is cheerful.

```
[KERRASH] (gentle, almost fond)  "I'm going to let you live. Somebody ought to know what happens, and it can't be a stranger."   ID: PRO07_KER_040
[KERRASH] (to the room, amused)  "Burn it. The dog's made his point."
```
The brand is a fish-hook salt-rune on the chest (the Saltmaker's mark). A black screen.

**Beat 5, the end.** Close on a single image: the carved gull on the floor, one wing crooked. The player's hand moves toward it. Cut to black. Title card.

---

## 3. ACT ONE: Waking (Sentinel coast, levels 1 to 10)

**Purpose:** rebuild the player from a body into a weapon, give him the first two names, reveal that the killing had a reason, and end the act knowing why, though not yet what it will cost.

**Act One quests (main)**

| ID | Quest | What the player does | Outcome |
|---|---|---|---|
| A1.1 | **Ash and Salt** | Wakes at Zeyna's. Recovers. First choices about how he talks. | Learns he was found in the burned farm. |
| A1.2 | **The Hill** | Returns to the farm. Visits the grave. Finds the tin. | First clue: a page of initials. |
| A1.3 | **The Collector** | Hunts Tarik Hasani. | Name 1. First Fury power. |
| A1.4 | **The Hammer** | Hunts Bahram Kesh at the coastal ruin. | Name 2. Second Fury power. A planted line about "counting graves". |
| A1.5 | **The Unbent** | Khadija trains him. Introduces the Sword-singers. | Learns to hold rage, and the cost. |
| A1.6 | **What Zeyna Owes** | Returns to Zeyna with the tin. Learns about Hegathe and the ledger. | Act One ends. The reason for everything. |

### A1.1 Ash and Salt (the waking)

*Three days later. A low cottage that smells of sage and boiled linen. The brand on his chest is scabbed and shiny. He cannot stand without help. Zeyna is grinding something and does not look up.*

```
[ZEYNA] (dry, tired)  "You've been asking for water in your sleep. Not for her. Water."   ID: A11_ZEY_001
> PLAYER OPTIONS
  1. [Flat] "Where are they?"                   -> spoken: "Where are they?"
  2. [Cold] "Who did this to me?"               -> spoken: "Who did this?"
  3. [Silent] Stare at the ceiling.             -> she lets the silence run, then speaks first.
```
**If "Where are they":**
```
[ZEYNA] (careful, gentle)  "There was a fire. There was what the fire left. I did what I could, and I did it properly."   ID: A11_ZEY_004
[ZEYNA] (after a pause)  "I'm sorry. I'm not going to say it was quick. I don't know that it was."
> PLAYER OPTIONS
  1. [Flat] "You buried them."                  -> spoken: "You buried them."  (Zeyna: "Under the pomegranate. It was your wife's favourite tree.")
  2. [Cold] "Show me."                          -> spoken: "Show me where."
  3. [Silent] Nothing.                          -> Zeyna: "When you can walk, I'll take you."
```
*(The line is built to be read as "the family is dead". The player believes the child died. Zeyna says nothing that is false. She says only what she saw.)*

**The brand.** The player asks what the mark is.

```
[ZEYNA] (quiet)  "A fish-hook in a grain of salt. It's his. The Saltmaker's. He leaves it on one person in every place he visits. They call that person the messenger."   ID: A11_ZEY_009
> PLAYER OPTIONS
  1. [Flat] "What does the message say?"        -> spoken: "What does it say?"
  2. [Cold] "Who is he?"                        -> spoken: "Who is he?"
[ZEYNA] (flat)  "That he doesn't need a reason. Or that he has one, and you're not worth the telling."
```

**Zeyna's price.** The player thanks her or demands her help.

```
> PLAYER OPTIONS
  1. [Warm] "Thank you."                        -> spoken: "I owe you my life."  (Zeyna: "Not yet you don't. Walk first.")
  2. [Cold] "What do you want for it?"          -> spoken: "What does this cost me?"
  3. [Threat] "You knew something."             -> spoken: "My wife asked about the weather. You knew something."
[ZEYNA] (sharp, then tired)  "I knew some things. I'll tell you all of them. Not today. When you've done something with your hands that makes it worth telling."
```
**Design:** this is Zeyna's price. She wants him to come back with blood on him, because she wants to know if he is the man she needs. The player does not have to like it.

**Close.** Zeyna returns his old farm knife, cleaned. She has not touched the brand beyond what was needed.

### A1.2 The Hill (the grave, the tin)

Zeyna leads him to the farm. The house is a black stain. The goat pen is empty. The dog's bowl is still by the door. The well is intact.

**The grave.** Under the pomegranate tree, three cairns: a small one (the dog), a long one with a flat stone and a name (the wife), and a third of plain stones with no name. Zeyna does not explain the third. The player assumes it is the child.

*(Design note, LOCKED for the midpoint: the third cairn holds the raider the player killed at the door, burned past recognition. Zeyna assumed it was the child's. She told the truth as she saw it. Nothing about the child's body is ever shown.)*

```
> PLAYER OPTIONS at the graves
  1. [Silent] Kneel. Say nothing.                       (+Bond W if wife_asked; Flag: grave_silent)
  2. [Cold] "I'll kill every one of them."              -> spoken: "I'll find every one. I'll do it slowly."  (+Infamy later: Zeyna flinches)
  3. [Warm] "I'm sorry. I'll stay."                     -> spoken: "I said I'd stay. I'm staying."  (callback to PRO04: only if Flag wife_asked)
  4. [Dog] Speak to the dog's cairn.                    -> spoken: "Good lad. You earned it."  (if dog_praised)
```
**The tin.** The well stone is loose. Under it, a rusted tin wrapped in oilcloth. The player (or Zeyna, if he cannot move it) lifts it out. Inside: a **brass key stamped with a gull**, and a **single torn page** from a ledger. A column of dates from 4E 173, a column of sums, and a column of initials: **T.H., B.K., I.Q., S.D., F.A., V., A.K.** The last initials are written much larger.

```
[ZEYNA] (very quiet, reading over his shoulder)  "She kept it. Of course she kept it."   ID: A12_ZEY_001
> PLAYER OPTIONS
  1. [Cold] "What is this?"                             -> spoken: "What is this?"
  2. [Flat] "You knew about this."                      -> spoken: "You knew about this."
  3. [Flat] "I know two of these."                      -> spoken: "T.H. Tarik. B.K. The one with the hammer."
[ZEYNA] (carefully)  "You know two. There are five more. I'll tell you who they are when you've earned that too."
```
**Design:** the page *is* the list. The player starts with two obvious names, and each corpse gives another. A clear on-screen journal page fills in as the hunt progresses.

**The missing gull.** If Flag gull_kept: the player searches for the carved gull and cannot find it. *Someone took it.* (Flag: gull_missing. Pays off in the midpoint.)

### A1.3 The Collector (Name 1: Tarik Hasani)

**Setup.** Tarik runs the tax house in Saltreach and collects on horseback, usually with two guards and a clerk. He drinks on the road. He is arrogant, careful and a coward when alone.

**Approaches (all valid):**
1. **Ambush on the coast road** (Sneak, bow or knife). Quick and clean.
2. **Night in the tax house** (Lockpicking, Pickpocket for the keys). Reads the real accounts. Finds a letter signed with the salt hook.
3. **Public confrontation** in the market (Infamy goes up, village reaction).
4. **Lure him** with a forged "unpaid tax" note to Dalia's stall.

**Guards.** Two are hired soldiers. One is a conscripted teenager, afraid and holding a spear wrong. The player can kill or spare him. Killing a conscript who tries to run adds **Collateral**.

**The confrontation (any approach).** Tarik, cornered, recognises the player.

```
[TARIK] (shaking, trying jovial)  "The farmer! From the market! Brave. You were so brave. Look, it was never personal."   ID: A13_TAR_010
> PLAYER OPTIONS
  1. [Cold] "You ate at my table."                       -> spoken: "He ate at my table. You put him there."
  2. [Flat] "Who gave the order?"                        -> spoken: "Who gave the order for my farm?"
  3. [Threat] "You'll tell me everything."               -> spoken: "You're going to tell me everything. Then we'll see."
  4. [Infamy 10] "I'm the message."                      -> spoken: "I'm the message. You get to read it."   (Tarik breaks completely)
[TARIK] (babbling)  "It was Bahram! Bahram Kesh! He picks the farms! He said the woman was special, a woman from the old country, he said she had something! I didn't know what! Please!"   ID: A13_TAR_014
```
**Choices after he talks:**
- **Kill him.** Quick, or slow if the player is full of rage (a brutal finisher). First Fury power unlocks: **Pain-ignoring burst**. (+Infamy, +Rage)
- **Spare him** to carry the message. Rare. He becomes a recurring minor character who tries to flee Hammerfell and appears in Sentinel later, either a witness or a corpse.
- **Hand him to the village.** Dalia and Old Amira's people decide his fate. Standing in Saltreach goes up either way, and what happens to him depends on the player's earlier choice at the market.

**Aftermath.** Saltreach changes. The salt tax is suspended for a week. Old Amira leaves bread at the player's door. Dalia keeps a copy of Tarik's ledger. The village starts a rumour that a ghost is hunting the Saltmaker's men.

### A1.4 The Hammer (Name 2: Bahram Kesh)

**Setup.** Tarik names Bahram. He is camped at a drowned Yokudan stair on the coast (a ruin the player can read as three ages old: old Yokudan carving, a Dwemer bolt-hole, an Ayleid sealed door). Eight men, three sentries, a dog kennel.

**Gameplay:** the first real fight. The player can plan: poison their water (Alchemy), kill sentries one at a time (Sneak), set the horses loose, or walk in. The ruin has verticality and a collapsing bridge to use.

**The confrontation.** Bahram is the big man from the cutscene. He is not stupid and he is not afraid.

```
[BAHRAM] (heavy, tired, almost respectful)  "You. The farmer. Gods. I did wonder if you'd come."   ID: A14_BAH_020
> PLAYER OPTIONS
  1. [Flat] "Count them."                                 -> spoken: "Count them. How many did you kill?"
  2. [Cold] "You killed my wife."                        -> spoken: "You killed my wife in front of me."
  3. [Dry] "You said gods, so you pray?"                 -> spoken: "You said gods. Pray."
  4. [Silent] Strike first.                               -> the fight starts without a word.
```
**If the player lets him talk** (does not strike first):
```
[BAHRAM] (flat, looking at the player's chest)  "He said to leave one. Always one. He picked you. He said you had the look."   ID: A14_BAH_024
[BAHRAM] (almost a laugh)  "You counted the graves, farmer? Did you? ...No. Course you didn't. Nobody counts."   ID: A14_BAH_026
> PLAYER OPTIONS
  1. [Cold] "What does that mean?"                       -> Bahram smiles and says nothing. (Flag: heard_count_line. Pays off at the midpoint.)
  2. [Threat] "Say it again."                            -> spoken: "Say that again." -> Bahram: "No." The fight starts.
  3. [Flat] Strike.                                      -> the fight starts.
```
**The fight.** Bahram is a heavy two-hander with guard-breaking blows. This is the first fight that teaches **perfect dodge and parry**. At low health he does not run or beg. He drops his weapon and sits.

**Choices:**
- **Finisher (F).** A heavy two-hander finisher: a brutal beheading or a crushed skull. +Rage. **Second Fury power: Cleaving sweep.**
- **Sit and ask him questions** while he bleeds out. Unlocks extra dialogue and the hint line above.
- **Burn the camp** with the corpses. A small Infamy gain.

**Aftermath.** Bahram's belt carries a **salt-hook seal**. It opens a door the player will find in Sentinel. The torn page gets two more initials crossed out in blood.

### A1.5 The Unbent (Khadija and the Sword-singers' Circle)

**Setup.** The player is wounded and sits against a rock. A voice from behind him.

```
[KHADIJA] (dry, not unkind)  "You fight like a man who wants to die. It's very wasteful. I don't like waste."   ID: A15_KHA_001
> PLAYER OPTIONS
  1. [Cold] "Who are you?"                               -> spoken: "Who are you?"
  2. [Dry] "I've had worse advice."                      -> spoken: "I've had worse."
  3. [Threat] "Leave."                                   -> spoken: "Leave me alone."
[KHADIJA] (flat)  "Khadija. They used to call me Unbent. I wasn't. I was just too stubborn to break. You're going to be dead in a week unless someone teaches you to stop being angry."   ID: A15_KHA_004
```
**Her offer.** She is an exile from the Sword-singers' Circle who lives alone in a stone hut by the sea. She has a rule: the player does not touch a weapon in front of her until she says so.

```
> PLAYER OPTIONS
  1. [Cold] "I don't need teaching."                     -> spoken: "I don't need teaching."   (Khadija: "No. You need breathing. It's the same thing.")
  2. [Flat] "Teach me."                                  -> spoken: "Teach me."                 (+Standing Sword-singers)
  3. [Dry] "I'll learn faster by killing people."        -> spoken: "I learn faster killing."   (Khadija: "You learn *different*, not faster.")
```
**Training sequence (tutorial for Rage and Fury).** Three lessons in the cove:
1. **Breath:** a parry and perfect-dodge drill against a wooden dummy that hits back.
2. **Rage:** she throws him a challenge to fill the meter and then asks him to hold it. The meter burns, he cannot block, and she disarms him easily.
3. **Choice:** she asks him to fight blindfolded. He cannot. She says: "That's all rage is. A blindfold."

**Her teaching on rage (voiced, key speech):**
```
[KHADIJA] (quiet, direct)  "You've been taught that rage is a fire. It isn't. It's a debt. Every time you spend it you borrow from tomorrow. You'll pay it back with interest, and the interest is *people*."   ID: A15_KHA_020
```
**Outcome:** the player learns to **bank rage** (a small perk). Khadija joins as a **mentor and optional follower** later and anchors the Sword-singers' Circle questline. She has a personal stake: she was a Hegathe veteran.

### A1.6 What Zeyna Owes (the Act One reveal)

**Setup.** The player returns to Zeyna with the tin, two names crossed off and blood on his hands. She sees it before he speaks.

```
[ZEYNA] (very still)  "Two."                                                              ID: A16_ZEY_001
> PLAYER OPTIONS
  1. [Flat] "You said you'd tell me."                    -> spoken: "I've earned it. Tell me."
  2. [Cold] "What was my wife?"                         -> spoken: "What was she?"
  3. [Threat] "Don't make me ask twice."                -> spoken: "Don't make me ask twice."
```
**The truth, in Zeyna's voice (a long, quiet scene):**
- In 4E 173, **a column of Crown refugees** fled the siege of Hegathe. They were promised a road. They were sold. Kerrash, then a Forebear officer, delivered them to the Thalmor in exchange for gold and a safe passage, and then had the survivors silenced so that the "heroic relief of Hegathe" could be told cleanly.
- The player's wife **was a child in that column.** She lived, raised under a Forebear name by an aunt. She grew up, and she kept the proof: a ledger of the payments, signed.
- Kerrash has hunted the last witnesses for twenty years. **The salt trade is the pipeline** that has paid every mouth to stay shut.
- Nadira **split the ledger into three folios** and hid them with three people she trusted. **Zeyna holds one.** The key in the tin opens her cellar strongbox.

```
> PLAYER OPTIONS
  1. [Cold] "She lied to me."                            -> spoken: "She lied to me for twenty years."
  2. [Warm] "She was protecting us."                    -> spoken: "She was protecting us. Wasn't she."
  3. [Flat] "Where are the others?"                     -> spoken: "Where are the other folios?"
  4. [Threat] "Then Kerrash killed them for a book."    -> spoken: "My family died for a *book*."
[ZEYNA] (low, steady)  "Your family died because a man needed a story to stay true. The book is just what proves it isn't."   ID: A16_ZEY_022
```
**The first big choice.** Zeyna produces **Folio One** from the cellar and states her case: take it to the court in Sentinel and let Hammerfell decide. The player may answer:
- **"I'm going to kill him."** Zeyna sighs: "Then at least take the folios, so I know somebody has them." (She does not argue. +Collateral awareness flag.)
- **"I'll take it to the court."** Zeyna is quietly relieved. (+Judged-ending weight.)
- **"Give me names. I'll decide later."** (the neutral path.)

**The close of Act One.** Zeyna tells him the next four names (with locations) and the other two folios: one with the **Alik'r caravan elder, Mother Anwar**, one with the **Forebear advocate in Sentinel, Leyla Rasul.** The coast slice is done. A road leads inland to a ferry and a smuggler captain named Juma Redtide.

**What Act One unlocks:** Fury powers 1 and 2, the Sword-singers' Circle, Zeyna as an ally and a recurring merchant, Folio One, and the first region transition.

---

## 4. ACT TWO: The Hunt (desert, jungle, Sentinel, highlands, levels 10 to 28)

**Purpose:** a province-wide hunt through four regions. Each name is a different moral problem. Politics close in. At about 60% the story turns from revenge to rescue, and a choice about the ledger begins to matter.

**Structure.** The player chooses the order of targets 3 to 6 within limits (region level bands and story gates). Each target also reveals one piece of the conspiracy and one ledger folio location. The order changes dialogue and who helps whom.

| ID | Quest | Region | Name |
|---|---|---|---|
| A2.1 | **The Smuggler's Price** | Coast to the Greenwater | Juma Redtide recruited |
| A2.2 | **The Auction** | Jungle | Name 3: Irsa Qadir |
| A2.3 | **The Factor's Table** | Desert | Name 4: Sulayman Dar |
| A2.4 | **The Mended Gull** | Desert, any | **The midpoint twist** |
| A2.5 | **The Honourable Court** | Sentinel | Name 5: Magistrate Farid Azmat |
| A2.6 | **A Guest of the Dominion** | Highlands | Name 6: Justiciar Valaneth |
| A2.7 | **What the Dead Owe** | Everywhere | Folios and allies gathered |

Guild questlines (Sword-singers, Wreckers, Quiet Hand, Alik'r) are open from the start of Act Two and run in parallel. Their finale choices feed the endings (section 6).

### A2.1 The Smuggler's Price (Juma Redtide, the Wreckers)

**Setup.** The inland road is watched. Zeyna's contact is a smuggler captain who runs a ferry and a lot of other things.

```
[JUMA] (cheerful, bright, lethal)  "A man with that face doesn't want a ride. He wants a body. Don't worry. I've got a few spare."   ID: A21_JUM_001
> PLAYER OPTIONS
  1. [Dry] "I want a boat."                              -> spoken: "I want a boat. Not conversation."
  2. [Cold] "Zeyna sent me."                            -> spoken: "Zeyna sent me."   (Juma's smile drops a notch; he becomes useful)
  3. [Threat] "Take me or I take it."                   -> spoken: "I'll take the boat, with or without you."   (Juma laughs; -Standing Wreckers, +Infamy)
[JUMA] (sunny)  "Fine. Passage is free. *Information* is not."
```
**What Juma wants.** A favour: a **Wrecker shipment is being held by the Collector's old guards**. The player clears it, or negotiates, or takes the cargo himself. This is an easy first guild mission and introduces ships, fences and the Wrecker hub (a floating market on the coast).

**Juma's value.** He hears everything: he tells the player where Irsa Qadir holds her auctions, and who her buyers are.

### A2.2 The Auction (Name 3: Irsa Qadir, the Auctioneer)

**Region and mood.** The Greenwater: humid jungle, river forts, drums at night. Beautiful, lush and the first hard difficulty step. The player enters a **slave auction in a river fort.**

**Beats**
1. **Infiltrate.** Disguise as a buyer (Speech and money), sneak in through the river gate, fight in, or use Juma's boat to hit the pens from the water.
2. **Learn.** A mother among the captives asks the player to find her son. A scarred guard, himself a slave, watches the player and says nothing. The auction book lists a **batch of coastal children marked with a salt-hook seal.** (A false lead and a real one.)
3. **Irsa.** She is elegant, generous with her captives in public, and merciless in private. She runs her auction like a charity gala.

```
[IRSA] (warm, auctioneer's patter)  "Lot nine, a fine young man with a clean back and a good attitude. Do I hear forty? Forty? Oh, you're all so generous."   ID: A22_IRS_004
> PLAYER OPTIONS (when he reaches her)
  1. [Dry] "Lot ten is me. Bid."                         -> spoken: "Lot ten. Me. Bid."
  2. [Cold] "Where are the children?"                    -> spoken: "The coastal children. Where?"
  3. [Speech 35] "You'll sell them to me."               -> spoken: "I'm buying the whole batch. Name your price."   (a tense negotiation: she smiles, names a monstrous price)
[IRSA] (silky)  "Oh, darling. They aren't for sale. They were *reserved*."   ID: A22_IRS_011
```
She does not know where the children are. She **was** told to hold them, and was **paid** to forget who by. She names a middleman: **Sulayman Dar**, the factor with the Alik'r caravans.

**The choices at her end:**
- **Kill her** in front of the buyers (Infamy up, buyers scatter and slaves riot). Third Fury power: **Scent-track**.
- **Free the slaves and escort them** through the jungle to a safe village (a long, dangerous, rewarding escort). Collateral risk if they die.
- **Take her prisoner** as a witness. She is dangerous cargo, and she bargains with what she knows. This path matters for the Judged ending.

**The scarred guard.** If spared, he reveals he saw **the Saltmaker himself** at a past auction, buying nothing and watching everything. It is the first time anyone has described Kerrash as *frightened of something.*

**Aftermath.** The Greenwater remembers. A freed woman names her baby after the player (a quiet, bleak beat) and a drum song about "the farmer who burned the fort" spreads. Infamy rises across the jungle villages.

### A2.3 The Factor's Table (Name 4: Sulayman Dar)

**Region and mood.** The Alik'r Desert: hot, golden, huge. Caravans, wells, ruined shrines. The player must earn the Alik'r's trust, and Sulayman is the best-loved man on the road.

**Who he is.** Sulayman pays for an orphans' school, remembers every driver's birthday and has a wife who cooks for the whole caravan. He is also the informant who sold the **names of the surviving Hegathe refugees** to Kerrash, for coin, for years. He considers himself a patriot in a hard world.

**Beats**
1. **Earn the road.** Meet the Alik'r caravan elder, **Mother Anwar**, and prove worth: water for a dry well, a raid broken, a lost child found. This is a mission chain in miniature.
2. **Dine with him.** Sulayman invites the player to his table. This is a mirror of the Kerrash dinner scene, and the player may notice.

```
[SULAYMAN] (genial, expansive)  "Sit, sit. You look like a man who hasn't eaten a hot meal in a month. My wife has made too much. She always does."   ID: A23_SUL_001
> PLAYER OPTIONS
  1. [Flat] "I'm not here to eat."                       -> spoken: "I'm not here to eat."   (Sulayman: "Nobody is. And yet.")
  2. [Cold] "You sold the Hegathe names."                -> spoken: "You sold the Hegathe names."   (the table goes silent)
  3. [Warm] "Thank her for me."                          -> spoken: "Tell your wife it smells good."   (+Collateral awareness: the player knows what he is about to do to this family)
  4. [Dry] "Do you pour salt on your food?"              -> spoken: "Do you salt your food?"   (Sulayman pauses just a beat too long)
```
3. **The truth.** Sulayman confesses with no shame and a great deal of reason.

```
[SULAYMAN] (calm, pleading)  "Twenty years ago I was a young man in a hungry country. A man came with gold and told me exactly what would happen if I refused. I did the sums. I'm not proud, I'm alive. And my children are alive. Do the sums, farmer."   ID: A23_SUL_030
> PLAYER OPTIONS
  1. [Cold] "I did the sums."                            -> spoken: "I did the sums. They come out to you."
  2. [Flat] "Where is the child?"                        -> spoken: "Where did the coast children go?"   (leads to the midpoint)
  3. [Warm] "Tell me who the others are."                -> spoken: "Give me the names and you live."   (a deal Sulayman cannot refuse)
```
**The choice.** Sulayman has a family. The player can:
- **Kill him** in front of them. Brutal. Infamy and Collateral go up (the family is not guilty). The orphans' school loses its patron. Fourth Fury power: **Terrifying roar**.
- **Kill him quietly** away from the table. Lower Infamy, but Mother Anwar notices and her trust cools.
- **Take him to Mother Anwar** for Alik'r judgement. She will pass sentence by desert law (a trial by thirst: the player may choose to stand beside him). **This is how he gets Folio Two.** She hands it over as payment for justice.

**Mother Anwar.** She is the player's most important Alik'r voice, tough and dry and not at all impressed.
```
[ANWAR] (flat, old, absolute)  "I don't care about your grief. Everyone here has grief. I care that you didn't spill blood at a well."   ID: A23_ANW_010
```

### A2.4 The Mended Gull (the midpoint twist, about 60%)

**Trigger.** After the player has dealt with Sulayman (alive or dead), a boy on a camel arrives with a small cloth bundle. Inside: **the carved gull.** The crooked wing has been **repaired**. The carving is clean and the new glue still smells.

*(If gull_missing: the player has been looking for it since the farm. If gull_kept: the player recognises the exact notch he held in his hand every night.)*

**Cutscene.** The player turns the gull over. On the underside, a **neat scratched line, in a child's careful letters:** "DA. HE LETS ME CARVE. I AM BEING BRAVE." Below it, in a calm adult hand: **"A gift. We should talk. A.K."**

```
[PLAYER] (barely audible, flat)  "...Tavi."                                              ID: A24_PLR_001
> The camera stays on his face.
[PLAYER] (very quiet)  "She's alive."                                                    ID: A24_PLR_003
```
**The shift.**
- The player realises **the third cairn was wrong**, and replays the Bahram line: "*You counted the graves, farmer?*" (Flag heard_count_line makes the flashback cut explicitly to Bahram's face. Otherwise it is Zeyna's words.)
- **Zeyna** arrives in person (or sends a runner) and tells the truth about the cairn: "I counted what I could. I thought the fire had made it smaller. I was wrong, and I did not want to be right."
- **Kerrash's offer (voiced letter, delivered by the camel boy, read by the player):**

```
[KERRASH] (letter, warm, courteous)  "Dear friend. You have something of mine and I have something of yours. I believe in trade. Bring me the ledger, all three folios, to Hegathe within the month, and I shall return what is yours, with an apology and a pension. Do not be tiresome about it. A.K."   ID: A24_KER_100
```
**What this changes**
- The hunt is no longer only revenge. The player cannot simply kill his way to Kerrash.
- **A clock begins** (a long one: a month of game time and a visible calendar). Quests can still be done, but the world moves.
- The player now has **two reasons to be careful** and one reason to be reckless.
- **The three folios become a bargaining chip, a weapon and a liability.** Kerrash wants them. So do the Thalmor.

### A2.5 The Honourable Court (Name 5: Magistrate Farid Azmat, Sentinel)

**Region and mood.** Sentinel, a vast, loud, white-and-gold port city with a harbour, a market and a courthouse the size of a fortress. Politics lives here.

**The city as a puzzle.** Crown and Forebear quarters. A magistrate who sits on the bench with a clean record and launders the salt money through "port fees" and "charity".

**The player's tools**
- **Advocate Leyla Rasul** (Forebear court advocate): holds Folio Three, wants a public trial, is terrified.
- **The Quiet Hand** (assassins) offer to take the magistrate for him.
- **The Wreckers** can steal his private books from his barge.

**Beats**
1. **Survey.** Discover his daily routine, his guards and his private vice.
2. **Decide the method.** The player picks from:
   - **Public exposure in court.** Needs Leyla, Folio Three and a believable witness. High risk and long. Best for the Judged ending.
   - **Quiet assassination.** Sneak into his villa or poison the wine (Alchemy). Fast and easy. Closes the court path and sparks a minor political crisis.
   - **Blackmail** him into testifying later. A middle path with a cost.
3. **The scene.** If the player goes to court, a **set-piece trial**: Leyla argues, the magistrate counters, and the player can stand and speak.

```
[LEYLA] (nervous, then firm)  "If I put this in front of the bench, I'll never practise law in Sentinel again. If I don't, nobody will. You'll have to stand with me."   ID: A25_LEY_020
> PLAYER OPTIONS
  1. [Flat] "I'm not good at courts."                    -> spoken: "I'm not good with courts."   (Leyla: "You don't have to be good. You have to be there.")
  2. [Cold] "Why would they believe me?"                 -> spoken: "Why would anyone believe me?"
  3. [Warm] "I'll stand."                                -> spoken: "I'll stand beside you."   (+Standing Forebear, +Judged weight)
```
**Outcomes.** The magistrate is exposed and arrested (a powerful public moment, +Standing Sentinel), assassinated (a corpse in a bath, a rumour about a "ghost", Infamy up, Sentinel guards harden), or turned (a living witness who will testify in Act Three).

**Fifth Fury power: Execution.** (Unlocked however he dies, but the player decides if he does it in front of an audience.)

### A2.6 A Guest of the Dominion (Name 6: Justiciar Valaneth, highlands)

**Region and mood.** The northern highlands: cold wind, jagged mountains, and a Dwemer ruin the Thalmor have turned into an outpost. The player is far from the sea and warm food.

**Who she is.** A polite, patient Altmer handler who has been feeding Kerrash gold for twenty years to keep Hammerfell unstable and bleeding from the inside. She does not shout.

**Beats**
1. **Approach.** A long infiltration through a mountain pass, past Thalmor patrols and a collapsed Dwemer gallery. Mechanical traps, steam, bronze gears and ancient automata, plus Thalmor soldiers and wizards (NPCs use magic with Skyrim spell numbers; the player cannot).
2. **Her office.** She is waiting. She has been waiting a long time.

```
[VALANETH] (courteous, patient, faintly bored)  "You must be the farmer. I hoped you would come in person. Letters are so imprecise."   ID: A26_VAL_001
> PLAYER OPTIONS
  1. [Cold] "You paid him."                              -> spoken: "You paid him. All of it."
  2. [Flat] "Where is my child?"                         -> spoken: "Where's my child?"
  3. [Threat] "Say her name."                            -> spoken: "Say her name. Go on."
[VALANETH] (calm)  "In good health. I am told the Saltmaker is quite sentimental. We have no interest in her. We want the book."   ID: A26_VAL_006
```
**The bargain.** She offers a deal: hand over the ledger and the Dominion will see to it that the child is returned unharmed, and Hammerfell will never hear of this.

```
> PLAYER OPTIONS
  1. [Speech 40] Detect the lie.                         -> she is bluffing: the Dominion does not hold the child.
  2. [Cold] "No."                                        -> spoken: "No."
  3. [Dark] "How much do you want it?"                   -> spoken: "What is it worth to you?"   (opens a grim bargain; the Thalmor side of the ending tree)
```
**Choices.**
- **Kill her.** The Thalmor retaliate: patrols across the highlands, bounty on the player, a diplomatic incident Sentinel must answer. **Sixth Fury power: Berserk.**
- **Take her alive** as a witness against Kerrash and the Dominion. A strong card in Act Three and the Judged ending.
- **Accept the dark bargain** (a hidden path with bad consequences).

### A2.7 What the Dead Owe (the folios and the allies)

By the end of Act Two the player must hold or have seen all three folios:
- **Folio One** (Zeyna, coast)
- **Folio Two** (Mother Anwar, desert, earned through Sulayman's judgement)
- **Folio Three** (Advocate Leyla, Sentinel, earned through the court)

If a folio is lost (a missed choice, a dead ally, a burned vault), **the Judged ending is closed.** The player is told when it happens.

**The council of the wronged.** At the end of Act Two, the player is asked to sit across a table from the people who are with him: Zeyna, Khadija, Juma, Anwar and Leyla. This is a short, tense, funny, heartbreaking scene in which each tells what they want from the end.

```
[KHADIJA] (flat)  "I want him dead. I want it quick. Rage is a luxury for people with time."
[JUMA] (grinning)  "I want his ship. I want his *salt*. Do you know how much that's worth?"
[ANWAR] (old, dry)  "I want the desert to remember it was lied to. Kill him if you like. But let them *know*."
[LEYLA] (careful)  "I want a trial. If we kill him in the dark, we've told everyone the lie is the better story."
[ZEYNA] (very quiet)  "I want the child back. I don't care about the rest."
```
**The player's response.** He can side with any, say nothing, or push back. The scene is the pivot of the whole game. It sets who stands beside him in Act Three, and what tone the ending can take.

---

## 5. ACT THREE: The Reckoning (Hegathe and Kerrash's stronghold, levels 28+)

**Purpose:** pay off the family, the lie and the choices. Everything the player did in Acts One and Two arrives at the gate.

| ID | Quest | What happens |
|---|---|---|
| A3.1 | **The Calendar** | The month runs down. Final preparation and recruiting allies. |
| A3.2 | **Relief Day** | Travel to Hegathe. The city is celebrating the lie. |
| A3.3 | **The Long Night** | The assault, shaped by who stands with the player. |
| A3.4 | **The Exchange** | The meeting with Kerrash. The child. |
| A3.5 | **The Saltmaker** | The confrontation and the choice. |
| A3.6 | **Salt and Sand** | The ending and the epilogue. |

### A3.1 The Calendar

A visible month on the map. The player can spend it on:
- **Allies.** Each ally who stands with him has a short mission that shapes the Hegathe assault (Khadija's challenge duel at the Circle's gate, Juma's raid on Kerrash's salt barges, Anwar's riders breaking a Forebear patrol, Leyla's petition to delay the garrison).
- **Guild finales.** Each faction questline ends with a **choice that echoes the theme.** These choices change the final assault and the endings.
- **Rest and loss.** The player can visit the grave, the farm, Zeyna and the stray dog. A **stray dog** follows him if he has been kind to dogs. He can name it. The horse will not be left behind.

If the month runs out, **Kerrash moves**: he sends a second message and the situation worsens (the child is moved, an ally is hurt). The clock matters, but it is long enough that exploring is safe.

### A3.2 Relief Day (Hegathe)

**Mood.** Hegathe is the heart of the lie. It is **Relief Day**: the festival that celebrates the breaking of the siege, held every year for twenty-eight years. Bunting, a parade, children wearing paper helmets. A statue of the Forebear commander (a younger, handsomer Kerrash) stands in the square.

**The scene.** The player walks into the parade. People thank him for being a soldier. A veteran cries on his shoulder. This is a gut-punch beat and the player cannot fight anyone.

```
[HEGATHE VETERAN] (old, moved, a little drunk)  "You were there, weren't you? I can tell. Thank you. Every year I come and say thank you to the ones who came."   ID: A32_VET_003
> PLAYER OPTIONS
  1. [Flat] "I was there."                               -> spoken: "I was there."   (the old man hugs him; the player stands very still)
  2. [Cold] "It wasn't what you think."                 -> spoken: "It wasn't what they told you."   (the old man is confused, then hurt)
  3. [Silent] Walk on.                                   -> the crowd closes behind him.
```
**Gameplay.** Scout the stronghold (an old fortified keep beneath the city, formerly the siege command post). Find the secret way (a Dwemer drain, an Ayleid vault door, the old refugee road). Choose the approach.

### A3.3 The Long Night (the assault)

**Structure.** A multi-stage set-piece whose shape depends on what the player built:
- **Khadija** duels Kerrash's champion at the keep gate so the player can pass.
- **Juma's** boats burn the salt barges, drawing the garrison.
- **Anwar's** riders hit the road to stop reinforcements.
- **Leyla** files an emergency petition that stalls the Forebear garrison for three hours.
- **Zeyna** has a quiet task: to keep the child's room unlocked.
- If an ally is dead or has left, their part fails and the assault is harder.

**Player's own path.** Infiltration, stealth kills, a brutal fighting retreat, and a descent through the old siege halls. This is the climax of combat: a level where Rage, finishers and every tool the player has built are on show.

**Moments.** The player passes through **the staged ruin**: a set built to look like a bombed refugee camp, props and bones arranged for the festival tour. It is the farce of the whole lie in one room.

### A3.4 The Exchange

**Setting.** The siege command hall. A long table set for a meal. Kerrash is already seated. A **small figure** sits at the other end of the table, **unharmed, calm, wearing clean clothes**, with a plate in front of her and a carved wooden gull.

```
[KERRASH] (pleased, rising slightly)  "There he is. Sit, please. I've been keeping this warm. I always keep it warm."   ID: A34_KER_001
> PLAYER OPTIONS
  1. [Flat] "Let [CHILD] go."                           -> spoken: "Let her go. Now."
  2. [Cold] "You ate at my table."                       -> spoken: "I fed you at my table."   (Kerrash: "And I've kept [CHILD] fed in return. Fair is fair.")
  3. [Silent] Look at the child.                         -> the child's eyes go to the player. The hall is very quiet.
  4. [Threat] "You have one second."                     -> spoken: "I'm counting."
```

**The child.** Voiced carefully. She is frightened and trying not to be. She speaks.

```
[CHILD] (small, steady, trying)  "Da. I knew you'd come. He said you wouldn't. I said you would."   ID: A34_CHD_004
> PLAYER OPTIONS (if Bond C is 3 or more)
  1. [Warm] "I'm here."                                  -> spoken: "I'm here. I'm here."   (+Bond C; the child's composure breaks: she runs to him)
  2. [Warm] "You were right."                            -> spoken: "You were right. Always are."
  3. [Dry] "Of course you did."                          -> spoken: "Of course you did. Your mother taught you."
```
*(If Bond C is low or the gull was dismissed in the prologue, the lines are quieter. The child is **more guarded**, and Kerrash notices and uses it. This is how the player's early choices pay off.)*

**Kerrash's offer.** He wants the ledger. He is courteous to the end.

```
[KERRASH] (gentle, reasonable)  "The three folios, please, and [CHILD] walks out of here with you. I'll even forgive the fort in the Greenwater. It was a lovely fort."   ID: A34_KER_012
> PLAYER OPTIONS
  1. [Cold] "No."                                        -> spoken: "No."
  2. [Flat] "Release [CHILD] first."                     -> spoken: "The child first. Then we talk."
  3. [Lie] "I've brought them."                          -> spoken: "I've got them." (bluff; the player lays out fake pages; Speech check; a tense moment)
  4. [Truth] "They're not mine to give."                 -> spoken: "They aren't mine. They're everyone's."
```
**Kerrash explains himself.** He does not apologise. He gives a small, almost-persuasive speech about peace and necessity, and about what a province is willing to forget in exchange for being whole.

```
[KERRASH] (earnest)  "Do you know what keeps a country together? Not the truth. Not even the lie. It's the *agreement* not to look. I gave Hammerfell twenty-eight years of agreement. What did you give anyone, farmer? A cheese."   ID: A34_KER_024
> PLAYER OPTIONS
  1. [Cold] "A cheese fed my family."                    -> spoken: "A cheese fed my family. Yours ate at somebody else's expense."
  2. [Flat] "You sold children."                         -> spoken: "You sold a column of children."
  3. [Dry] "You talk too much."                          -> spoken: "You talk like a man who's never been hit."
```
**The break.** Kerrash gives a signal, the hall doors slam, and the fight begins (or the player ends the talking with a swing).

### A3.5 The Saltmaker (the confrontation)

**Combat.** Kerrash is a skilled veteran in expensive armour, with a heavy sabre and a pot of salt on his belt. He fights like he talks: easily, with flair, and always a half-second ahead of an angry man. He has two phases:
1. **Duelling phase.** Fast, precise, tests parry and perfect dodge. He mocks.
2. **Desperate phase.** At 30% health he drops the charm and fights like a cornered animal.

At around 15% health the fight stops. He is on his knees. The room goes quiet. The choice arrives.

**The choice (the Rage test).** The player's Rage meter is full. Everything in him wants the finisher. The game offers it **on F** as always. It also offers a quieter option, and the dialogue is shaped by Collateral, Infamy and the friends he has with him.

```
[KERRASH] (bloody, still almost amused)  "Go on. Do it. And then tell me who you are when it's done. I'm curious."   ID: A35_KER_050
> PLAYER OPTIONS
  1. [F: Finisher] Kill him.                              -> the obvious path.
  2. [Dry] "Not yet."                                     -> spoken: "Not yet."   (the Judged path opens if all three folios are held)
  3. [Cold] "I'll let the desert decide."                -> spoken: "The Alik'r have a law for liars."   (requires Standing Alik'r 40)
  4. [Silent] Look at [CHILD].                            -> the child shakes her head. (only if Bond C high; this can change the player's mind)
```
**If Collateral is high (more than the player realises).** Zeyna's voice, in the hall:
```
[ZEYNA] (very quiet, from the doorway)  "How many have you killed to be standing there? I'm not judging. I'm counting. Somebody should."   ID: A35_ZEY_060
```
This line is only spoken if Collateral exceeds a threshold. It never mentions the number. The player simply feels counted.

---

## 6. ENDINGS

The three endings are tied to how the player finishes Kerrash, whether the folios are held, and who stands beside him. Each ends with an **epilogue** shaped by the family bond flags, the dog, the horse, Infamy and Collateral.

### 6.1 Ending A: "Salt" (kill him)
**Conditions.** Always available. The player takes the finisher.
**What happens.** A brutal, close-up execution. The body is left at the long table. The lie survives, because nobody else knows. The ledger can be burned or kept. Hammerfell stays at peace on false ground.
**Final dialogue.**
```
[PLAYER] (flat, standing over the body)  "You ate at my table."                          ID: END_A_PLR_001
[CHILD] (small, from the doorway)  "Da? Can we go home?"                                ID: END_A_CHD_002
[PLAYER] (beat, then quietly)  "We don't have one."                                      ID: END_A_PLR_003
```
**Epilogue.** The farm is rebuilt or abandoned depending on a late choice. The player is **feared**. Rumours say a man killed the Saltmaker with his bare hands. The child grows up knowing what the player did. A last image: the stray dog sleeping in the doorway of a house that isn't theirs yet.
**Theme.** The player becomes the thing that frightens people. The lie goes on. The game does not call it wrong. It lets the player feel what it cost.

### 6.2 Ending B: "The Ledger" (let him be judged)
**Conditions.** Hold all three folios. Collateral below the threshold. At least two allies alive. Standing with Forebear or Crown above 30.
**What happens.** The player says "Not yet." Kerrash is taken alive to Sentinel. A public trial, the biggest set-piece scene in the game. The player, Leyla, Zeyna, the Greenwater guard, Mother Anwar and others speak. Kerrash gives a speech and is condemned. The Hegathe lie is exposed. Crown and Forebear factions turn on each other and then, narrowly, do not.
**Final dialogue.**
```
[LEYLA] (to the court, shaking, firm)  "The honourable court will note that the accused ate, laughed and thanked every witness for coming."   ID: END_B_LEY_020
[KERRASH] (to the player, smiling, in the dock)  "You could have had the peace. You chose the truth. I do hope you like what you get."   ID: END_B_KER_030
[PLAYER] (quiet, level)  "I'll live with it."                                            ID: END_B_PLR_031
```
**Epilogue.** The province is shaken but real. The player is a quiet figure at the edge of a crowd on the day of the sentence. The child holds his hand. The dog is a stray named by the child. **Cost:** a season of unrest, a political scar and a rift with some factions. **Gain:** the child grows up in a country that knows what it did.
**Theme.** Restraint is harder than rage. The game rewards the player for it with something earned, not easy.

### 6.3 Ending C: "Desert Law" (the third path)
**Conditions.** Standing with the Alik'r above 40. Mother Anwar alive.
**What happens.** Kerrash is handed to the Alik'r. The desert judges him by its own law, with a trial by thirst at an old well. The player may walk beside him or not. The ledger is read aloud, once, before the sand, to the people it harmed. Hammerfell's politics are spared a public spectacle. The truth lives in the desert's memory, not in the courts.
**Final dialogue.**
```
[ANWAR] (old, absolute, at the well)  "Not a court. Not a knife. Sand. Let him have time to think about what he sold."   ID: END_C_ANW_010
[PLAYER] (flat, at the edge of the well)  "Time. That's all I wanted to give him."        ID: END_C_PLR_012
```
**Epilogue.** The player returns to the farm and plants a pomegranate. The child asks what happened and the player tells a short, edited version. The dog is a stray. The story of the Saltmaker's death becomes a desert song nobody can quite agree on.
**Theme.** Justice that belongs to the people it was done to. Messy, local, human.

### 6.4 Endings: what is common
- **The child and the dog.** All three have a quiet closing beat with the child, shaped by bond flags, and with a dog.
- **The gull.** The carved gull appears in every ending, in the player's pocket, on a shelf, on a grave, in the child's hand.
- **Credits.** A slow scroll over a map of Hammerfell showing who is alive and what each region became.
- **New Game+ (OPEN).** Carry perks, scars and the stray dog into a second run.

---

## 7. Reactivity: how the world answers the player

### 7.1 What NPCs react to
| Trigger | Typical reaction |
|---|---|
| **Brand on his chest** (if seen) | Villagers go quiet. Kerrash's men flinch. Alik'r and Wreckers read it as a vow. |
| **Scars** (face, limbs) | Children stare. Soldiers nod. Merchants lower the price or raise it, depending on their nerve. |
| **Infamy** | Low: ignored. Mid: whispers, nervous service. High: doors close, guards watch, some NPCs bow and some run, wanted posters appear. |
| **Collateral** (quiet) | Zeyna, Khadija and Leyla comment indirectly. Some NPCs change a line at the very end. Never a number. |
| **Standing** | Faction prices, access, shared secrets, and who helps in Act Three. |
| **Dog and horse** | NPCs greet the dog by name if the player named it. Children want to pet it. A bandit pauses before killing a man with a dog. |
| **Rage** | Seen in a rage, NPCs remember. Some are afraid, some are drawn to him. |
| **Time of day and weather** | Different vendors, different gossip, different guards. |

### 7.2 Gossip engine (how news spreads)
- After a notable act (a killing in public, a rescue, a theft), nearby NPCs mention it within one in-game day.
- A town two days away hears a **distorted** version with each retelling: bigger numbers, a nickname, a wrong detail.
- NPCs repeat the nickname back to the player's face: "the Farmer", "the Salt Ghost", "the Hook".
- This is the main way Infamy feels like a story and not a number.

### 7.3 Bark library (sample, voiced short lines)
**Saltreach (coast village)**
- Amira (friendly): "Eat something. You look like a ghost. No offence."
- Amira (after Tarik): "Dalia's selling at full price again. Whatever you did, thank you."
- Dalia: "Don't stand there. Buy salt or buy nothing, but don't stand there."
- Kami (boy): "Is it true you killed ten men with a spoon?"
- Brother Yusuf: "I haven't seen you. I haven't seen anyone. It's a policy."

**Sentinel (city)**
- Guard: "Keep your hands where I can see them. It's not personal. It's Tuesday."
- Fishmonger: "Eels! Fresh eels! Good for the blood, good for the soul, terrible for the neighbours!"
- Gossip (overheard): "She says the magistrate keeps a second set of books. I say everyone does."
- Beggar: "A coin for a man who remembers the siege? Or a coin for a man who says he does?"

**Alik'r camps**
- Driver: "Water is life. Spill it and you'll find out how much."
- Child: "Are you going to kill somebody? Can I watch?"
- Elder: "If you cannot make peace at a well, you cannot make it anywhere."

**Thalmor patrol**
- Soldier: "Papers. Smile. We value your cooperation."
- Overheard: "She says the Redguards will bleed themselves dry. I say they are very good at it."

**Wreckers**
- Deckhand: "I don't ask. I never ask. Is it going to be a *large* amount of trouble?"
- Juma: "Business is business. And business is also great fun."

**Random combat barks (R-rated, used sparingly)**
- Bandit: "Oh, you motherfucker."
- Soldier (hurt): "Not like this. Gods, not like this."
- Kerrash's man (afraid): "That's him! That's the farmer! I'm not paid enough for this."
- Player (flat, on a killing blow): "Next."
- Player (Rage): *a low, wordless sound.*

### 7.4 NPC-to-NPC conversations (overheard, 30 seconds each)
Each hub town has at least **eight** short scripted exchanges between two characters, run on a rotating schedule. Examples:
1. *Two fishwives:* arguing about whose catch is fresher while quietly passing a rumour about the collector.
2. *A guard and a baker:* the guard owes her for a month of bread and trades nervous favours.
3. *Two children:* playing at "Saltmaker and farmer", one being the villain and refusing to be anything else.
4. *A priest and a drunk:* a half-comic confession in the middle of the street.
5. *A merchant and a Thalmor clerk:* polite and terrified.
Each one hints at a world with a past and a future that goes on without the player.

---

## 8. Worth talking to: recurring characters by region

Every hub has **at least six named NPCs** with a want, a secret and a line that changes after story events. These are the seeds. They are not all needed for v1.

**Saltreach (coast village)**
| NPC | Job | Wants | Secret | Changes after |
|---|---|---|---|---|
| Old Amira | Baker | Her son back from the army | She feeds Kerrash's men to keep her shop | The Collector |
| Dalia | Salt seller | To stop paying | Keeps a private ledger of every extortion | The Collector |
| Brother Yusuf | Priest | To be left alone | Hid the Haddads for a night | The Hammer |
| Kami | Errand boy | To be a Sword-singer | Stole Tarik's seal | Khadija |
| Hakim | Fisherman | His boat repaired | Sells his catch to the Wreckers | Juma |
| Mira | Midwife | A quiet life | Delivered Nadira's child | Zeyna |

**Sentinel (city)**
| NPC | Job | Wants | Secret |
|---|---|---|---|
| Leyla Rasul | Advocate | A just court | Her own career depends on cowardice |
| Magistrate Farid Azmat | Judge | Comfort | He is terrified of the Saltmaker |
| Captain Idris | Guard | A clean beat | He knows and looks away |
| Nasreen | Fishwife | The price of eels to rise | Her husband is one of the Haddads' missing |
| A Quiet Hand contact | Barber | A good customer | Everyone he shaves dies in a month |
| A child beggar | Thief | Bread | Works for Juma |

**The Alik'r camp**
| NPC | Job | Wants | Secret |
|---|---|---|---|
| Mother Anwar | Elder | A good ending | Holds Folio Two, has read it, and has told nobody |
| Sulayman's wife | Cook | Her husband's safety | She knows what he did |
| A young driver | Caravaneer | A name | Wants to join the Wreckers |
| The orphan teacher | Teacher | A patron | Sulayman paid for the school |

**The Greenwater (jungle)**
| NPC | Job | Wants | Secret |
|---|---|---|---|
| The scarred guard | Guard (slave) | Freedom | Saw Kerrash at a past auction |
| A freed mother | Captive | Her son | Her son is in the salt-hook batch |
| A drum-keeper | Village elder | To sing the story | Knows the river route |

**Hegathe (the lie)**
| NPC | Job | Wants | Secret |
|---|---|---|---|
| The old veteran | Pensioner | To say thanks | Doesn't remember what he did |
| A festival child | Child | Sweets | Her grandmother was in the column |
| The monument carver | Artist | Pay | Knows the faces on the statue are wrong |

---

## 9. How the guild questlines feed the main story

Each guild runs about 10 to 12 quests in parallel, opens at the start of Act Two (the Sword-singers open in Act One), and ends with a **finale choice** that echoes the theme.

| Guild | Opens | Echo | Finale choice | Effect on endings |
|---|---|---|---|---|
| **Sword-singers' Circle** | Act One | Rage and discipline | Duel a corrupted champion: kill or yield | Yield gives +Judged weight. Kill gives +Kill weight. |
| **The Wreckers** | Act Two | Loyalty and profit | Sell the salt barges or burn them | Burn them: Kerrash's money dries up faster. |
| **The Quiet Hand** | Act Two | The price of a life | Take a contract on an innocent | Refusing closes some options and opens others. |
| **The Alik'r** | Act Two | Water and law | Judge a thief by desert law | Gives the Desert Law ending. |

---

## 10. Production notes for this document

### 10.1 Estimated size
| Content | Approx. spoken lines |
|---|---|
| Prologue | 350 |
| Act One | 700 |
| Act Two (4 targets, midpoint, council) | 1,800 |
| Act Three and endings | 700 |
| Family, allies and recurring cast (ambient) | 700 |
| Barks and NPC-to-NPC chatter | 2,000 |
| **Total** | **about 6,000** |

Every branch voiced would be higher. The tiering in section 0.2 cuts the first release.

### 10.2 Voice direction summary
| Character | Voice |
|---|---|
| [PLAYER] | Low, level, dry. Short sentences. No shouting except in the one rage scream. |
| Nadira | Warm, quick, private. A smile you can hear. |
| Tavi (child) | Clear and steady. Not cute. Scared but trying. |
| Zeyna | Dry as paper. Gentle underneath. |
| Khadija | Flat, blunt, with sudden warmth. |
| Juma | Bright, quick, sunny, never trustworthy. |
| Leyla | Careful, formal, with cracks. |
| Anwar | Old, absolute, patient. |
| Kerrash | Pleasant, warm, humane. Smiles while he threatens. |
| Tarik | Loud, jovial bully, coward when alone. |
| Bahram | Heavy, tired, plain. |
| Irsa | Silky, theatrical, a performer. |
| Sulayman | Genial, expansive, reasonable. |
| Valaneth | Polite, patient, faintly bored. |

### 10.3 Testing
- Every scene has an ID and a flag list so tests can drive it.
- Branch coverage tests check that every option leads somewhere and every flag is set where it should be.
- A "dialogue dump" tool prints each scene as a script for review and for recording sessions.

---

## 11. Writing style guide (for anyone writing more lines)

1. **Short.** If a line can lose a word, lose it.
2. **Flat protagonist.** He does not explain his feelings. He states facts. His kindness is in what he does.
3. **Petty villain.** Kerrash is dangerous because he is polite, specific and smiling.
4. **Everybody wants something.** Every NPC has a want, a secret and a view the player can change.
5. **Swearing is seasoning.** Use it where a real person would, and not as noise.
6. **Humour is dry.** Gallows humour, understatement, the odd absurd detail.
7. **No exposition dumps.** Break information across scenes, objects and overheard talk.
8. **Names do work.** Titles, nicknames and mispronunciations tell the player who has power.
9. **Callbacks.** If the player was warm in the prologue, the epilogue should know.
10. **Never show harm to the child.** Imply, cut away, or leave it out.

---

## 12. Status of open items (v0.2)

**Resolved in v0.2**
1. **Names:** all (P) names are approved as defaults. Per-race family name lists are in `SYSTEMS_SPEC.md` section 18. The player can rename the family at character creation.
2. **The child:** Tavi, a girl, age 10.
3. **The brand:** a fish-hook within a grain of salt, scarred on the chest.
4. **Voice pipeline:** decided in `SYSTEMS_SPEC.md` section 13 (licensed AI voices first, recorded actors for key characters later, child voice handled with explicit care).
5. **The Quiet Hand:** written, dark, in `GUILDS.md`.
6. **The farm after the story:** rebuild, sell or abandon. Rebuilding is the quiet ending beat.
7. **Kerrash's salt economy:** marked barrels, shortages and prices tied to his power.
8. **The calendar:** a pressure system, three steps, never a fail state.
9. **The gull note:** "DA. HE LETS ME CARVE. I AM BEING BRAVE." with Kerrash's note beneath.
10. **Thalmor at Hegathe:** an observer attends Relief Day, and a detachment is in the keep only if the player took the dark bargain.
11. **Third and fourth endings:** Desert Law is the third. The Quiet Bargain (after the dark bargain at Valaneth) is the fourth.
12. **Cutscene format:** in-engine, letterboxed, with a few painted stills for the massacre night.
13. **New Game Plus:** carries perks, scars and the stray dog.

**Still open**
1. **Side quest and radiant content** per region. Templates are in `SYSTEMS_SPEC.md` section 10, and NPC seeds are in section 8 above.
2. **Detailed combat encounters** for the seven named fights and the final duel, to be designed once the combat spike is tuned.
3. **A full line-by-line script** for each scene. This file is the beat sheet plus key scenes.
4. **Licence review** of the chosen voice service, and a plan for the child's voice.
5. **Valaneth as a boss:** a Thalmor Justiciar with Skyrim spell numbers and a duel that teaches the player to fight a caster. Design in Phase 3.
