# LAST LIGHT — Design Document

An original solo slasher‑survival board game built for the browser. It belongs to the same
genre as tabletop "final girl" games: one heroine, one killer, one location, survivors to
rescue, and a doomed night to get through. **All names, characters, rules text, art and audio
are original.** No third‑party game content, art or trademarks are used.

---

## 1. Research: what makes solo slasher board games work

What the genre does well, and what LAST LIGHT takes from it:

| Pillar | Why it works on the table | How LAST LIGHT implements it |
|---|---|---|
| **Cards are actions *and* currency** | Every card in hand is a choice: play it, burn it for nerve, or burn two to save a roll | **Nerve** (5 a turn) pays for cards; discard any card for +1; discard 2 to buy a partial die up |
| **A deck you build, not one you draw** | Planning ahead beats luck of the draw | Open **tableau** of card piles; buy as many as leftover nerve allows (only three basics are free); cards used this turn are locked until Planning ends |
| **Fear as a mechanical spiral** | Panic makes you worse, which makes things scarier | **Horror Level** sets your dice (Midnight Show 4/4/4/3/3/2/2); past the top it feeds his bloodlust |
| **Push‑your‑luck dice with soft failure** | Tension at every roll, but the player always has an out | 5–6 hit, 3–4 partial, 1–2 miss; every card has 2+ / 1 / fail outcomes, and failures can hurt |
| **The killer as an AI, not a player** | Readable but relentless | Data‑driven **behavior** (target → move → attack) per killer; a different Finale behavior |
| **Victims as a moral clock *and* his power source** | Saving people competes with saving yourself | Each kill = +1 **bloodlust**, which sets his move and attack; survivors are attacked **before** you |
| **A finite night with a climax** | A movie‑shaped arc | 10 **Terror** cards, one per turn; when they run out the **Finale** begins |
| **Nobody stays dead the first time** | "He gets back up" is the genre | Both sides carry a hidden **final‑health token**: a number revives (and ends the phase), blank kills |
| **Rescue pays you back** | Heroics should make you stronger | **Rescue slots** with rewards; fill them all to unlock the heroine's ability |
| **Mix‑and‑match boxes** | Replayability from combinations | Killer, location and heroine packs are independent data; 25 killer × location pairings |
| **Lore‑as‑mechanic** | Discovery is rewarding | Lore items tell his story and add +1 damage to every hit that lands |

UX lessons from digital board‑game ports (good ones and bad ones):

- Show what's possible **before** the player clicks: every card shows its cost, its dice and all three outcomes; reachable locations glow while a move resolves.
- Never hide the killer's reasoning: his behavior line, his next target and his move/attack are always on screen, and his turn ends in a readable summary.
- Dice must feel physical and give agency: a tumble animation, partials glow gold, and clicking a partial offers the 2‑card buy‑up.
- Teach in context: a 16‑step guided first night, plus one‑time tips when partials, reactions or Planning first come up.
- Respect the player: autosave every action, undo for anything that didn't roll dice, keyboard shortcuts, mobile layout.

## 2. Core loop (one turn)

Every turn has five phases, always in this order:

| Phase | What happens |
|---|---|
| **1 · Action** | Play action cards from your hand (pay nerve, make a Horror Roll, resolve the band). Use items and your ability. Discard any card for +1 nerve. If nerve goes below zero, the current card finishes and the phase ends (and nerve can't climb back above zero this turn). |
| **2 · Planning** | Buy cards from the tableau (the in‑game **shop**, grouped on shelves by job) with leftover nerve, as many as you can afford (hand limit 10). Only the three basics (Walk, Look Around, Duck) cost 0 and can be taken even in nerve debt. Nerve resets to 5. Cards played or discarded this turn go back to their piles, not your hand. |
| **3 · Killer** | He resolves his behavior instruction, then a Terror card is drawn (none once the Finale is in play). Reactions can be played against attacks on you. |
| **4 · Panic** | If anyone died this turn, survivors in his location each roll a d6 on that location's panic table. |
| **5 · Upkeep** | Reveal the Finale if the Terror deck is empty; one survivor wanders in at least 2 steps from him (until the supply of 16 runs out); the location rule, ongoing Events, his power and the Finale resolve their upkeep; you may rearrange items. |

**Win:** he dies. **Lose:** you die. **Both in the same resolution:** you win. There is no dawn.
**Score:** win bonus + 15 per survivor saved − 5 per survivor slain + 5 per remaining health + 5 per Terror card left.

### Horror Rolls
- Dice = the Horror track for your difficulty, plus card, heroine, item, Event and Resolve bonuses (minimum 1).
- **5–6** success, **3–4** partial, **1–2** nothing. Each partial can be bought up to a success by discarding 2 cards.
- Two or more successes → the card's **great** band; exactly one → **good**; none → **fail**. Bands are effect lists (move, search, damage, heal, horror, nerve, block, hide, rally…).

| Horror | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| Matinee | 5 | 5 | 4 | 4 | 3 | 3 | 2 |
| Midnight Show | 4 | 4 | 4 | 3 | 3 | 2 | 2 |
| Nightmare | 4 | 4 | 3 | 3 | 2 | 2 | 1 |

Horror pushed past 6 adds that much bloodlust; horror pushed below 0 gives that much nerve.

### Action cards
**Light vs heavy attacks.** Shove and Swing are *light*: weapons, lore and focus don't add to them (the spec lets a weapon restrict which cards it modifies). Full Swing, Desperate Strike and Counter are where gear pays off. Every card shows its dice, and hovering the number (or looking at the dice tray) shows where each die comes from: "5 dice: horror 2 gives 4, Resolve +1".

Six starters begin in your hand, but only three are free: **Walk** (move), **Look Around** (search) and **Duck** (the one defense, since only reactions stop a hit). That is the spec's zero‑cost safety net: whatever happens, she can always rebuy a way to move, search and duck. **Hurry**, **Shove** and **Steady Yourself** start in hand but cost 1 nerve to play and to rebuy, so playing a card is never free twice. Shove is a break‑away (great: 1 damage and move 1; good: move 1), so it no longer competes with Swing. Run (2), Deep Breath (2) and Scream (1) were repriced to sit above their starter versions. Everything else is a face‑up pile in the tableau: Run, Sprint, Slip Away, Search, Ransack, Swing, Full Swing, Desperate Strike, Psych Up, Steady Hands, Hide, Barricade, Catch Your Breath, Deep Breath, Adrenaline, Over Here!, Scream, and the reactions Brace, Dodge and Counter. (The old free Instinct deck and the Bleeding/Panic junk cards were folded into this one economy.)

### Survivors, rescue and panic
- When you leave a location, up to 2 survivors there follow you (Tess: 3). They never follow you into his location.
- Standing on an **exit** at any point of your Action phase (passing through counts) rescues every survivor with you. Each rescue fills your next **rescue slot** and pays its reward (heal, nerve, calm, an item, or Resolve: +1 attack die for the night). With every slot full your **ability** unlocks (once per turn); further rescues pay the repeat reward.
- His attacks hit survivors in his location before you, one per attack. Each kill: +1 bloodlust, and survivors left in any enemy's location panic at the end of the turn.
- **Panic tables** are written into every location (all 58): face 1 freezes (faces 1–2 in a couple of rooms per map where people hide), and the other faces lean toward neighbors that are closer to an exit. They can be hand-tuned per location in the pack.

### Named survivors (special NPCs)
Each location has one named survivor, brought in by one of its Terror cards. They follow every survivor rule (follow you, count toward the limit of 2, panic, get rescued, get killed) except one printed exception:

| Location | Named survivor | Exception | Rescued | Killed |
|---|---|---|---|---|
| Holloway Drive‑In | Mr. Pruitt, the Night Usher | walks 1 toward the nearest exit every Upkeep | +2 nerve, horror −1 | horror +2 |
| Gullhaven Tide Cabins | Old Man Gilley | heavy: counts as 2 when following | heal 1, +1 nerve | bloodlust +1 more |
| Saint Agatha's | Father Ruiz | never panics | horror −2 | horror +2 |
| Kettle Peak Lodge | Marty, the Bartender | loud: the killer's next target is his noise | heal 2 | horror +1 |
| KXRL Hilltop | Old Herb, the Engineer | wanders to a neighbor every Upkeep | the killer is stunned, +1 nerve | horror +1, bloodlust +1 more |

A rescued named survivor fills a rescue slot *and* pays their own reward. Named survivors follow you before the crowd does, unless you tell one to stay put (the toggle next to their name while you move).

### Minions (subordinate enemies)
Every killer brings help. Minions have their own health, move, attack and target rule, a token limit (extra spawns are ignored), and act before or after the killer in the Killer phase. When an effect makes "the enemies" act and says nothing else, minions go first.

| Killer | Minions | Stats | Targets | Order |
|---|---|---|---|---|
| The Projectionist | Charred Patrons (*Reserved Seating*) | 2 health, move 1, attack 1, max 2 | whoever is closest | after him |
| The Tidewife | The Drowned (bloodlust 3, *Out of the Shallows*) | 1 health, move 1, attack 1, max 2 | closest survivor | before her |
| The Anesthetist | Sleepwalkers (bloodlust 3, *Sleepwalking*) | 1 health, move 1, attack 1, max 2 | whoever is closest | after him |
| The Snowblind | Buried Skiers (*They Dig Themselves Out*) | 2 health, move 1, attack 1, max 2 | her | before him |
| The Caller | Listeners (*Call-In Winners*) | 1 health, move 2, attack 1, max 2 | closest survivor | after him |

- With the killer **and** minions in reach, an attack must choose: him, or the minions. Never both.
- Against minions, the damage (plus a weapon, not lore) is divided between the minions in your location: you assign it with +/− per minion (a sensible split is pre-filled); unassigned or overkill damage is lost. You're only asked when the split matters.
- Survivors will follow you into a location with minions, just not one with the killer. Minion kills feed bloodlust and trigger panic like his.
- Minion attacks on you can be answered with reactions; Counter hits whoever is attacking.

### The killer
- **Behavior** (data): `target` (closest survivor, you, or whoever is closest), `hunt` (move his Movement Value along a shortest path; stops on arrival), `attack` (n separate attacks). Ties go to the group with the most survivors, then to the tie‑break policy.
- **Bloodlust track** (8 levels): each level sets move/attack and may trigger an effect. At level 4 his **power** is revealed (temporary health that soaks damage first, plus an ability); past the top, each increase triggers the track's maximum effect.
- **Finale** (when the 10 Terror cards are gone): an immediate effect, a new behavior, +1 attack, his power revealed if still hidden, and +1 bloodlust every Upkeep after.
- **Final‑health token:** drawn at setup. A number means he gets back up with that much health (his "revive" moment) and the current phase ends; blank means he's dead.

### Items
Two hand slots; two‑handed items fill both. The backpack holds anything, but items that need hands don't work from it. Rearranging is allowed only when you gain an item and during Upkeep. Each search location has its own face‑up item pile (4 cards; his lore is always dealt in); searching draws and keeps per the card, and the rest go back on top face up. Weapons add damage to an attack that deals at least 1; ranged weapons let attack cards reach him 1 location away.

### Tie‑break policy
When the rules leave a genuine tie (equally close targets with as many survivors, equally short routes, or a named survivor standing with the crowd when he attacks), the policy chosen in Settings decides and the Script logs it:

| Policy | Target tie | Route tie | Who dies first |
|---|---|---|---|
| **Player‑adverse** (default) | her, else the group nearest her | the step nearest her | the named survivor |
| **Most plausible** | whoever he was already chasing, else the one nearest his lair | the step nearest his lair | the crowd |
| **Comedic** | the group farthest from her (he wanders off) | the step farthest from her | the named survivor, obviously |
| **Unpredictable** | seeded coin flip | seeded coin flip | seeded coin flip |

Comedic ties also log a pratfall ("He walks face‑first into a hanging sign, recovers, and pretends that was the plan.").

### Location rules (one per location)
| Location | Rule | Effect |
|---|---|---|
| Holloway Drive‑In | Intermission | Every 4th turn, in Upkeep: +1 nerve, horror −1 |
| Gullhaven Tide Cabins | The Tide | Turns every 4 turns; at high tide, entering a shore location costs +1 nerve |
| Saint Agatha's | Rolling Blackouts | Turns 3–4, 7–8, 11–12: search −1 die, hide +1 die, he moves +1 |
| Kettle Peak Lodge | Whiteout | End a turn outdoors: cold +1 (lose 1 health at 3); by a fire: thaw; at 2+ cold: −1 nerve per turn |
| KXRL Hilltop | Request Line | A phone rings each turn; answer it (1 nerve, horror +1) or a survivor appears there and he takes a step toward it |

Each location also has three ongoing **Event** cards (one revealed at setup), two **setup cards** (each puts 2 survivors on three spots, so 6 are on the board at the start; 16 in the supply, and one more arrives every Upkeep), two exits and four search locations.

### Difficulty
| Mode | Nerve | Horror track | Her token | His token | His health |
|---|---|---|---|---|---|
| Matinee | 6 | gentle | 1–3 | 0, 0, 2, 3 | −2 |
| Midnight Show | 5 | standard | 0–3 | 0, 2, 3, 4 | printed |
| Nightmare | 4 | harsh | 0, 1, 1, 2 | 2, 2, 3, 4 | +1 |

### Balance
`src/engine/bot.ts` is a rule‑aware heuristic player: it buys a balanced hand in Planning, buys partials up on important rolls, reacts to attacks, shuttles survivors to exits, searches, and hunts him once armed. `npm test` fuzzes all 25 killer × location pairings with every heroine. For the full report:

```
SCRIPTS=1 N=10 npx vitest run balance
```

Bot results on Midnight Show (a careful human should beat these):

| Location | Killed him | Turns | Reached Finale |
|---|---|---|---|
| Holloway Drive‑In | 50% | 10.5 | 55% |
| Gullhaven Tide Cabins | 34% | 10.9 | 57% |
| Saint Agatha's | 22% | 11.6 | 69% |
| Kettle Peak Lodge | 30% | 11.1 | 57% |
| KXRL Hilltop | 31% | 12.0 | 43% |
| **All** | **33%** | **11.2** | **56%** |

By killer: Projectionist 39%, Snowblind 35%, Caller 33%, Anesthetist 31%, Tidewife 29%. Matinee: 79% · Nightmare: 8%. The bot is deliberately weaker than a focused human: playtests found combat easy at a 46% bot rate, so the target is now about a third. `STYLE=rush` runs a bot that ignores survivors and goes straight for him: it wins 26%, so rushing is not the dominant line. Her ability unlocks in 93% of games (turn 3.8 on average), and 4–6 survivors are on the board until about turn 8. Tension report (`SCRIPTS=1 npx vitest run tension`): 71% of games reach 1 health or death, average peak horror 5.1 of 6, about 2 reactions and 7–8 rescues per game.

### Spec alignment (v1.0)
v1.0 rebuilt the core loop around a generic solo‑survival rules spec. What changed, and what we kept on purpose:

| Spec rule | LAST LIGHT v1.0 |
|---|---|
| Action → Planning → Hunter → Panic → Upkeep | Implemented as phases, with an ordered effect queue and explicit player decisions (`pending`) |
| Time 6, buy from tableau, used cards locked until Planning ends, discard for Time, below‑zero ends phase | Same, under our own name: **Nerve** |
| Horror Roll: 5–6 / 3–4 partial (2 cards) / 1–2; 2+ / 1 / fail bands | Same |
| Terror deck of 10 → Finale; no dawn | Same |
| Bloodlust track sets move/attack, level effects, power reveal, max effect | Same; our old terror escalations became level effects and powers |
| Hidden final‑health tokens; revival ends the phase; both die → win | Same, for heroine and killer |
| NPCs follow (2), not into the Hunter; exit rescue → slots → ability | Same |
| NPCs attacked first; reactions per attack | Same |
| Elimination‑triggered directional panic | Same; every location has a written d6 panic table |
| Special NPCs | One named survivor per location, each with one exception, a rescue reward and a death cost |
| Minions; choose Hunter or minions when attacking; damage split among minions; minions act before the Hunter by default | Same, for the Tidewife and the Anesthetist |
| 2 hand slots, two‑handed items, backpack, rearrange on gain/Upkeep | Same |
| Per‑space item piles, top card face up | Same (4 piles of 4) |
| Tie‑break policy, logged | Player‑adverse, Most plausible, Comedic, plus Unpredictable (seeded) |
| Kept from LAST LIGHT | Original names and art, location signature rules, lore as +1 damage, barricades, hiding, ranged weapons, Event cards as ongoing modifiers |

## 3. Architecture

```
src/
  engine/      pure, deterministic rules (no DOM)
    types.ts   content schema, runtime state, effects, pending decisions, actions
    rules.ts   newGame / check / dispatch / effect queue / killer behavior / phases
    bot.ts     heuristic player (balance sim + in-game hint)
    tutorial.ts scripted first-night setup
    migrate.ts converts v0.9 saves into v1.0 games
    rng.ts     seeded RNG (state stored in the save → exact replays)
  content/     data packs — the only thing an expansion touches
    actions.ts      the action-card tableau (starters + piles)
    drive-in/ … dead-air/   LocationPacks
    projectionist/ … caller/  KillerPacks
    heroines/       7 heroines: traits, rescue tracks, abilities
    registry.ts     Features (killer × location pairs)
  art/ audio/ ui/  procedural art, WebAudio, grain/particles/tutorial
  main.ts      screens, board, panels, overlays, input, FX
tests/         engine rule tests + fuzzing
scripts/       balance and tension reports (SCRIPTS=1)
```

- **Effects are data.** Cards, items, Terror and Event cards, bloodlust levels, behaviors, powers, Finales and rescue rewards are all `Effect[]`. One interpreter runs them through an ordered queue; new effects are pushed to the front, so triggered effects (a bloodlust level, a revival) resolve before the rest of the sequence continues.
- **Decisions pause the queue.** A move route, a dice buy‑up, a search pick or a reaction sets `state.pending`; the matching player action resolves it and the queue drains on. Revival or "end the phase" drops everything up to the next phase marker.
- **Reducer pattern.** `dispatch(content, state, action) → state`; illegal actions return the same object. The UI only reads state and plays `state.fx`.
- **Portable.** Static build with a relative `base`: GitHub Pages, Netlify, S3, itch.io, Capacitor/Tauri.

## 4. Adding a Feature (expansion)

1. `src/content/<location>/location.ts` exports a `LocationPack`: nodes (with `search` / `exit` flags and a d6 `panic` table each), edges, lair, two or more `setups`, `terror` cards, ongoing `events`, named `specials`, items, and one signature `rule`.
   - **Mixing rule:** killer packs must never name a location's nodes. Use `heroine`, `lair`, `random`, `nearKiller` or `farFromKiller`. A test enforces this.
2. `src/content/<killer>/killer.ts` exports a `KillerPack`: health, starting horror, the 8‑level `bloodlust` track, `behavior`, `power`, `finale` (with its own behavior), `revive`, optional `minions`, `terror` cards, lore items and quotes.
3. Register both in `src/content/registry.ts` and add a `Feature`.
4. Optionally add heroines (`HeroineDef`: traits, rescue slots, ability).
5. Art: set `art` keys and add renderers in `src/art/`.
6. Run `npm test`.

## 5. Atmosphere & audio

- **Visual:** a 24 fps film‑grain canvas with scratch lines, a vignette that reddens and pulses with horror, a projector beam flicker, drifting fog (`feTurbulence`), a screen shake on hits, a red or white flash, and the backdrop turning blood‑red in the Finale.
- **Location themes:** Drive‑In = A (crickets, projector), Coast = G (waves, foghorn), Hospital = B♭ (fluorescent hum, elevator dings), Snow = E (howling gusts), Radio = C (rain, static, thunder).
- **Audio (all synthesized):** an A‑minor drone whose filter opens with horror and drops to E in the Finale; wind; crickets that thin out as fear rises; 24 fps projector clatter; a heartbeat whose BPM follows horror and killer proximity; an original music‑box motif with tape delay that drops a semitone in the Finale; and stingers for the killer appearing, wounds, hits, kills, saves, items, dice, cards and the Finale.

## 6. Roadmap

| Phase | Scope |
|---|---|
| v0.1 | Feature One: 1 killer, 1 location (11 nodes), 5 heroines, 22 events, 16 items, 15 instincts; full UI, audio, saves |
| **v0.2 (this build)** | Difficulty modes (Matinee / Midnight Show / Nightmare); undo for deterministic actions; Box Office stats screen; **terror deck** (a killer‑specific escalation card each time bloodlust crosses a multiple of 4); **multi‑phase Finales**; **Feature Two** (*The Tide Cabins*, *The Tidewife*); mix‑and‑match Custom Double Bill picker; per‑killer and per‑location art keys; extra Feature One events and items |
| **v0.3 (this build)** | **Feature Three** (*Saint Agatha After Hours*, *The Anesthetist*): 3×3 = 9 killer/location pairings. **Double Bill builder**: shelf of curated posters, killer and location cards, a live poster preview, and a random "Spin the Reel" button. Generic `nearKiller` spawn target, plus a test that keeps killer packs free of location‑specific node references. **Art overhaul**: layered heroine portraits that show injuries and fear, an Anesthetist portrait, a hospital cutaway backdrop, film‑still illustrations on every event and terror card, item icons, VHS feature posters, and ambient particles on the board |
| **v0.4 (this build): Season 1 complete** | **Feature Four: Whiteout** (*Kettle Peak Lodge*, *The Snowblind*) and **Feature Five: Dead Air** (*KXRL Hilltop Studio*, *The Caller*), giving 5×5 = 25 pairings. Two new heroines: Sunny (cold‑immune) and Dee (phone specialist). **Each location now has one signature rule**: Intermission, The Tide, Rolling Blackouts, Whiteout cold, and Request Line phones. Node tags (`outdoor`, `warm`, `shore`, `phone`), `env` state, an `answer` action, the `warm` effect, and new heroine traits support the rules |
| **v0.5 (this build): Polish & balance** | Rule‑aware bot (`engine/bot.ts`) powers the balance sim and an in‑game **💡 Hint** (H). Hide‑search roll, Finale +1 speed, Saint Agatha and KXRL retuned. **Per‑location audio themes**: drone key, wind, fluorescent hum, rain and periodic ambience (waves and foghorn, elevator dings, howling gusts, static and thunder), plus stingers for the tide, blackout and phone ring. CI fuzz trimmed to about 20 s |
| **v0.6 (this build): First night & readability** | **Guided tutorial**: 14 coach‑mark steps on a scripted Drive‑In opening; offered to new players, replayable. **Clear tokens**: name‑tagged standee pins, a "you are here" pulse, a killer danger ring, and a red threat line when he's adjacent. **One‑screen layout**: the board scales to fit and panels scroll internally, with a stacked layout on phones. **Tabletop materials**: cardstock character sheet with polaroid, case‑file killer dossier, typed script‑page log, ticket‑stub actions, marquee‑bulb top bar, and SVG glyphs in place of emoji |
| **v0.7 (this build): Tension economy** | **Banked nerve** (+3 per round, cap 8; carries over). **Noise**: every 5 nerve spent in a round draws the killer a step closer. **Action deck**: a hand of 5 ticket cards drawn each round instead of fixed buttons (Search/Ransack, Lead, Fight/Desperate Swing, Hide/Hold Your Breath, Barricade, Catch Your Breath, Sprint). **Bleeding** junk cards per hit and **Panic** junk cards at horror 5 and 6 clog your hand. **Survivor panic clock**: survivors left alone for 4 rounds may bolt, sometimes into the killer. Escorting 3 or more costs +1 per move |
| **v0.8 (this build): Draft & readability** | **Lineup draft**: 6 face‑up action cards each round, take up to 3 for free (hand max 5), pay nerve to play. Every lineup is guaranteed a Lead card and a Hide or Fight card. Bleeding and Panic go straight into the hand. Noise every 6 nerve. **Readable map**: labeled badges with icons (searches left, panic n/4, barricade), a **Map key**, and a hover **location card** |
| v0.9: Hunt him down | **The only win is killing him**; dawn means he escapes, which is a loss. **Resolve**: each rescue gives +1 fight die (max 3) plus an item. **Nerve resets each round** again (5/4/4/3); banking and noise removed. **Movement comes from cards**: Walk, Run and Slip Away, with 2 Walk cards to start and a move card guaranteed in every lineup. **Hands + backpack**: 3 active hand slots and an unlimited backpack; readying an item costs 1 nerve, or is free at the moment you find it. Killers −2 health, dawn at round 14, "he gets back up" at 4 health |
| **v1.0 (this build): The five‑phase night** | Core loop rebuilt to a generic solo‑survival spec: **Action → Planning → Killer → Panic → Upkeep**. **Nerve 6** and an open **tableau** you buy from (used cards locked until Planning ends; discard for +1 nerve; nerve debt ends your turn). **Horror Rolls** with partials you buy up with cards, and 2+ / 1 / fail outcome bands on every card. **10‑card Terror deck** as the clock; **Finale** when it runs out (dawn removed). **Bloodlust track** sets his move and attack, with level effects and a **power** revealed at level 4. **Hidden final‑health tokens** for both sides. Survivors follow (2) and shield you; **exit rescues** fill slots and unlock an **ability**. **Reactions**. Elimination‑triggered **directional panic**. **Two hand slots** and per‑location **item piles**. Tie‑break policy setting. New tutorial, rule tests and balance pass |
| v1.0.3: Tighter nights, clearer numbers | **Economy**: nerve 5 (Matinee 6, Nightmare 4) and at most 4 buys per Planning (5/3), free cards included; Adrenaline costs 1; Steady Hands only rerolls. **Light attacks**: Shove and Swing take no weapon, lore or focus bonus, so heavy attacks are worth their cost; Full Swing's miss costs horror instead of health. Killers 10–12 health, a gentler attack curve, heroines +2 health; Margo's weapons never wear out. **Visibility**: his health bar on his map token and a big segmented health meter in his file; a Horror / dice / nerve block beside your hand that flashes when horror moves; an ascending horror track; every die explained on cards and in the dice tray; buys left shown in Planning |
| **v1.0.6 (this build): A shop you can read, a night a newcomer can follow** | **Planning shop**: cards grouped on shelves (Free, Move, Fight, Search, Defend, Recover, Tricks); big *Nerve to spend* and *Cards in hand* meters; each card says *N left*, *need N nerve*, *in your hand* or *back after Planning*; a warning (and a glowing free Walk) when you'd end Planning with no way to move. **Peek at the board** (B) shows a banner with a *Back to the shop* button. **From a novice playtest** (a fresh agent playing only from the UI): a full hand scrolls with *N more* arrows and the mouse wheel; the dice result and toasts can no longer pass a click to the map or a card; Undo survives a finished Walk; greyed hand cards say why (*out of reach*, *his turn*…); health shows *4/4 + ? backup* instead of folding the hidden token into the number; *Down at 0* note on the killer; the reaction prompt names a minion when a minion attacks; the end screen says *You win* / *You died*, lists the last blows and a tip on a loss, and keeps its buttons in view; Intermission counts down (*in 3 turns*); difficulty chips say easy/normal/hard; How to Play uses your difficulty's numbers. |
| v1.0.5: Harder fights, fuller nights, easier picking | **She's frailer**: heroines −2 health (Margo and Dee −1), killers +1 (Tidewife 8, others 10), so a straight brawl no longer wins easily. **A survivor wanders in every Upkeep** (at least 2 steps from him) until the supply of 16 runs out, so there's someone to save most of the night. **Pick screens fit the window**: the action bar (Back, difficulty, Roll Film) is pinned and never scrolls away; heroines are a roster grid plus one big file for your pick; features sit on a sideways reel grouped by season, killer and location lists scroll inside their columns; it all keeps working with many more heroines and seasons. Balance sim gains a `STYLE=rush` bot |
| v1.0.4: Fewer freebies, more people | **No buy cap**: buy as many cards as leftover nerve pays for. **Only three free cards** (Walk, Look Around, Duck), the spec's always‑available safety net; Hurry, Shove, Steady Yourself and Scream cost 1, Run and Deep Breath cost 2, and Shove became a break‑away (hit and move 1). **More survivors**: setup cards put 2 on each spot (6 at the start, supply 16), so the rescue track and her ability come online early (unlocked in 81% of games, up from 49%). Killers −3 health (Tidewife 7, others 9) to keep the Midnight win rate at 46% |
| v1.0.2: Readable night | **UI overhaul**: one type system (Oswald for labels and numbers, the typewriter face for sentences, Creepster for names) with fonts bundled locally instead of loaded from Google; rebuilt side panels (three big stat blocks, an ascending horror track with the dice it leaves you, a rescue track, item tiles with a detail strip instead of cramped rows); a big **Stop here** button and click‑yourself‑to‑stop while moving; card names no longer truncated; a capped, scrolling end‑of‑turn summary with repeats collapsed and a damage/kill/bloodlust summary strip; visible minion markers. **Choices**: tell a named survivor to stay put; divide damage between minions yourself. **Minions for every killer** |
| v1.0.1: The rest of the spec | All four tie‑break policies, named survivors (one per location), minions for the Tidewife and the Anesthetist with the him‑or‑them attack choice, written panic tables for every location, and v0.9 saves converted on Continue |
| v1.1 | Season 2 kickoff; heroine scars and campaign mode |
| v0.4 | Achievements, daily seeded challenge, more heroines |
| v0.5 | PWA/offline, controller support, localization, optional commissioned art and music swapped into the art/audio slots |
| Later | Campaign mode (heroines carry scars and items between features), daily seeded challenge with a shared leaderboard (needs a backend) |
