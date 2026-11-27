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
| **Mix‑and‑match boxes** | Replayability from combinations | Killer, location and heroine packs are independent data; 100 killer × location pairings |
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
- **5–6** success, **3–4** partial, **1–2** nothing. **One** partial per roll can be bought up to a success by discarding 2 cards (buying up every partial made 4 of 6 faces successes: 89% best band and 1% fail at 4 dice).
- Two or more successes → the card's **great** band; exactly one → **good**; none → **fail**. Bands are effect lists (move, search, damage, heal, horror, nerve, block, hide, rally…).

| Horror | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| Matinee | 4 | 4 | 3 | 3 | 2 | 2 | 2 |
| Midnight Show | 3 | 3 | 3 | 2 | 2 | 2 | 2 |
| Nightmare | 3 | 3 | 2 | 2 | 2 | 2 | 1 |

One die fewer than v1.0.8 at every level, but never below 2 (Nightmare's horror 6 excepted), so a card's best band is always reachable; a 1‑die floor let failed rolls spiral horror into bloodlust.

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
| Camp Tamarack | Nurse Opal Haines | **medic**: heals her 1 every Upkeep she is with her | heal 1, +1 nerve | horror +2 |
| Starlite Galleria | Gus Wexler, the Mall Santa | **brave**: when an enemy attacks where he stands, he hits it for 1 first | +2 nerve | horror +2 |
| Paloma Motor Court | Earl Tibbs, the Trucker | walks 1 toward the nearest exit every Upkeep (he'll catch the bus) | +1 nerve, draw 1 item | horror +2 |
| Rollerdrome Skateland | Disco Dan, the DJ | loud: the killer's next target is his noise | horror −2 | horror +1, bloodlust +1 more |
| Harrow Farm | Old Jessup, the Hired Man | wanders to a neighbor every Upkeep | draw 1 item, horror −1 | horror +1, bloodlust +1 more |

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
| The Trapper | Trap Hounds (*Let the Dogs Loose*) | 1 health, move 2, attack 1, max 2 | whoever is closest | before him |
| The Window Dresser | Mannequins (*New Stock*) | 2 health, move 2, attack 1, max 2; **frozen while watched** (in her location or next to it) | whoever is closest | before him |
| The Night Manager | Housekeepers (*Turndown Service*) | 1 health, move 1, attack 1, max 2 | closest survivor | after her |
| The Mirrorball | Rink Rats (*Rink Rats*) | 1 health, move 2, attack 1, max 2 | her | before him |
| The Harvestman | Scarecrows (*Off Their Poles*) | 2 health, move 1, attack 1, max 2 | closest survivor | after him |

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
| Holloway Drive‑In | Intermission | Every 5th turn, in Upkeep: horror −1 |
| Gullhaven Tide Cabins | The Tide | Turns every 4 turns; at high tide, entering a shore location costs +1 nerve |
| Saint Agatha's | Rolling Blackouts | Turns 3–4, 7–8, 11–12: search −1 die, hide +1 die, he moves +1 |
| Kettle Peak Lodge | Whiteout | End a turn outdoors: cold +1 (lose 1 health at 3); by a fire: thaw; at 2+ cold: −1 nerve per turn |
| KXRL Hilltop | Request Line | A phone rings each turn; answer it (1 nerve, horror +1) or a survivor appears there and he takes 2 steps toward it |
| Camp Tamarack | The Campfire | The Fire Circle is a **haven** while it burns: no killer or minion can step in (they route around it and can't target anyone inside). Fuel 3, −1 every Upkeep; stoke it there for +2 (3 at most; 1 nerve, once a turn). The Finale's rain puts it out for good |
| Starlite Galleria | Security Shutters | Two sets of gated passages (red, blue). One set is down at a time and they swap every Upkeep; a down shutter blocks her, her followers, calls and panicking survivors, never him. Override at the Security Office (1 nerve, once a turn). Either set leaves the map connected (a test checks) |
| Paloma Motor Court | The Last Bus | The Bus Shelter is an exit only on turns 3, 6, 9…; when the bus leaves at the end of her Action phase, everyone waiting there is rescued, with or without her. The Highway Shoulder (next to her lair) is always open |
| Rollerdrome Skateland | The DJ's Set | Three songs in turn, one per turn: **Fast** (her first move each turn +1; he moves +1), **Couples Skate** (hide +1 die, search −1 die), **Strobe** (dazzled: her reactions −1 die; he hits +1). Strobe is the one to skip. Skip the song at the DJ Booth (1 nerve, once a turn) |
| Harrow Farm | The Corn | In a corn location more than 1 step from her, he is **hidden**: the map shows where she last saw him, the log stops naming where he goes, and *next* reads "?". Look out from the Grain Silo (free, once a turn) to see him until the turn ends. Hide rolls +1 die in the corn |

### Killer mechanics (Season 2)
Every Season 2 killer has one signature mechanic (`KillerPack.gimmick`). Like everything else in a killer pack, it never names a location's nodes, so it works in all ten locations.

| Killer | Mechanic | Effect |
|---|---|---|
| The Trapper | Trapline | Each time he moves, a steel trap is left where he was (3 at most; the oldest is pulled up). Stepping in costs 1 health and ends the move. Some Terror cards and bloodlust 5 set a trap next to her |
| The Window Dresser | The Display | His behavior is two steps: strike at the mannequin posed last turn (he appears there wherever he was, then attacks; with nobody there he hunts the closest at full move: since v1.1.1, so simply stepping off his mark no longer makes him whiff), then pose a new one where the closest people are. A barricade on the posed location keeps him out; a lure or teleport knocks the mannequin over. With no mannequin out he hunts normally |
| The Night Manager | Room 13 | Her attacks on survivors take one to her lair alive (bloodlust +1, at most 3 held; beyond that they die). A captive dies at the end of the second turn after (horror +1; v1.1.1 dropped the second bloodlust, which snowballed her in playtests). Reaching the lair frees them all as ordinary survivors at the lair. Minions still kill |
| The Mirrorball | Reflections | Her horror 5+: he moves +1. Horror 6: he hits +1 and heals 1 every Upkeep. His power adds horror +1 each Upkeep she spends next to him |
| The Harvestman | Only When You Move | His move is the number of steps she walked this turn (at least 1, at most 4), replacing his bloodlust move; Finale, power, Events and the location still add |

### Heroine traits (Season 2)
| Heroine | Trait | Engine key |
|---|---|---|
| Nora Whitcomb, the Camp Counselor | Traps never hurt or stop her; calls bring 1 more | `trapSense`, `rallyBonus` |
| Bea Calloway, the Security Trainee | Shutters never stop her or her followers; barricades +1; Lockdown barricades every neighbor | `gateKeys`, `barricadeStrength`, `barricade at: 'around'` |
| Lou Ann Pickett, the Night-Shift Waitress | Three hand slots | `handSlots` |
| Roxy Delgado, the Jammer | Light attacks +1 damage; move cards +1 die; Jam = move 2 | `lightBonus`, `moveDice` |
| Mae Dunleavy, the Farm Girl (Hard) | The corn never hides him; attack cards +1 die; Hayloft hides her even with him there | `cornSight`, `attackDice` |

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

**Tuning pass (v1.1.1).** Balance is now measured with independent seeds per (location, killer, heroine, run): the old script built seeds from id lengths, so heroines and killers shared them and per-killer numbers swung by ±10 between reports. `SCRIPTS=1 N=5 npx vitest run tune` prints a compact table (`SEED=` picks another seed set). Bot, Midnight Show, three 6,000-game runs:

| | Before (v1.1.0) | After (v1.1.1) |
|---|---|---|
| Overall | 25–26% | **26%** |
| Killers | 18–35% (Mirrorball 18, Snowblind 35) | **23–28%** |
| Locations | 21–35% (Holloway 35, Rollerdrome 33) | **23–32%** (Holloway, the starter, highest) |
| Normal heroines | 16–44% (Dee 16, June 44) | **21–28%** |
| Easy heroines (Rosa, Tess, Lou) | 21–43% | **27–36%** |
| Hard heroine (Mae) | 17–19% | **19%** |
| Matinee / Nightmare | 74% / 5% | 74% / 5% |

What moved: killer health (Snowblind 11 with a 5-point power, Caller 11, Mirrorball, Trapper and Anesthetist 9); Intermission every 5th turn and horror only; one Tire Iron at the Holloway; an unanswered KXRL phone draws him 2 steps; stoking the campfire adds 2; the DJ's fast song boosts only her first move, couples skate no longer slows him, strobe dazzles her reactions; a third one-hand weapon at Saint Agatha, Kettle Peak, Harrow Farm and the Paloma. **Resolve (+1 attack die) is the strongest heroine lever** (one Resolve slot moved Ivy from 21% to 39%), so rescue tracks were reordered: later for Rosa and June, earlier or twice for Dee, Nora, Bea and Tess. June's Head Count gives nerve only with survivors there. Health: Rosa and June 5, Tess and Dee 8, Nora and Bea 9, Mae 7. The tutorial moved to seed 7 so its scripted night survives the new Holloway item pool.

**Season 2 (v1.1)**, all 100 pairings × 12 heroines, 4 seeds each (4,800 games, Midnight Show): **26%** overall, against **27%** for Season 1 content alone with the same seeds (unchanged from v1.0.18). By killer: Projectionist 30%, Tidewife 20%, Anesthetist 21%, Snowblind 42%, Caller 18%, **Trapper 26%, Window Dresser 28%, Night Manager 32%, Mirrorball 21%, Harvestman 23%**. By location: Holloway 43%, Gullhaven 24%, Saint Agatha 18%, Kettle Peak 26%, KXRL 16%, **Camp Tamarack 31%, Starlite Galleria 26%, Paloma 21%, Rollerdrome 30%, Harrow Farm 25%**. New heroines: Nora 22%, Bea 19%, Lou 28%, Roxy 29%, Mae 17% (Hard). Tuning on the way: the Night Manager started at 54% (captures now feed her), the Window Dresser at 48% (an empty scene now sends him hunting), the Mirrorball at 18% (thresholds raised to 5 and 6). The bot now routes with a weighted search around him, traps and posed mannequins instead of refusing any step past him (that refusal let one Season 2 pairing stall forever).

v1.0 numbers by killer: Projectionist 39%, Snowblind 35%, Caller 33%, Anesthetist 31%, Tidewife 29%. Matinee: 79% · Nightmare: 8%. The bot is deliberately weaker than a focused human: playtests found combat easy at a 46% bot rate, so the target is now about a third. `STYLE=rush` runs a bot that ignores survivors and goes straight for him: it wins 26%, so rushing is not the dominant line. Her ability unlocks in 93% of games (turn 3.8 on average), and 4–6 survivors are on the board until about turn 8. Tension report (`SCRIPTS=1 npx vitest run tension`): 71% of games reach 1 health or death, average peak horror 5.1 of 6, about 2 reactions and 7–8 rescues per game.

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
    coach.ts   the current goal and the reason behind each hint (goal bar, Show me)
    tutorial.ts staged first night: search, rescue, a dodged attack, a first hit
    migrate.ts converts v0.9 saves into v1.0 games
    rng.ts     seeded RNG (state stored in the save → exact replays)
  content/     data packs — the only thing an expansion touches
    actions.ts      the action-card tableau (starters + piles)
    drive-in/ … dead-air/, camp-tamarack/ … harrow-farm/   LocationPacks
    projectionist/ … caller/, trapper/ … harvestman/         KillerPacks
    heroines/       12 heroines: traits, rescue tracks, abilities
    registry.ts     Features (killer × location pairs)
  art/ audio/ ui/  procedural art, WebAudio, grain/particles
  ui/tutorial.ts   the core tutorial (STEPS) and one-time lessons (LESSONS)
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
2. `src/content/<killer>/killer.ts` exports a `KillerPack`: health, starting horror, the 8‑level `bloodlust` track, `behavior`, `power`, `finale` (with its own behavior), `revive`, optional `minions`, optional `gimmick` (Season 2: traps, pose, captives, fear, stalk), `terror` cards, lore items and quotes.
3. Register both in `src/content/registry.ts` and add a `Feature`.
4. Optionally add heroines (`HeroineDef`: traits, rescue slots, ability).
5. Art: set `art` keys, add prompts for every new backdrop, portrait, icon, still and item in `scripts/flux/prompts.mjs` (a test lists anything missing), render with `scripts/flux/render.mjs`, and add a procedural fallback in `src/art/` (Season 2's are in `src/art/season2.ts`).
6. Run `npm test`.

## 5. Atmosphere & audio

- **Visual:** a 24 fps film‑grain canvas with scratch lines, a vignette that reddens and pulses with horror, a projector beam flicker, drifting fog (`feTurbulence`), a screen shake on hits, a red or white flash, and the backdrop turning blood‑red in the Finale.
- **Location themes:** Drive‑In = A (crickets, projector), Coast = G (waves, foghorn), Hospital = B♭ (fluorescent hum, elevator dings), Snow = E (howling gusts), Radio = C (rain, static, thunder).
- **Audio (all synthesized):** an A‑minor drone whose filter opens with horror and drops to E in the Finale; wind; crickets that thin out as fear rises; 24 fps projector clatter; a heartbeat whose BPM follows horror and killer proximity; an original music‑box motif with tape delay that drops a semitone in the Finale; and stingers for the killer appearing, wounds, hits, kills, saves, items, dice, cards and the Finale.

## 6. Roadmap

| Phase | Scope |
|---|---|
| v0.1 | Feature One: 1 killer, 1 location (11 nodes), 5 heroines, 22 events, 16 items, 15 instincts; full UI, audio, saves |
| **v0.2** | Difficulty modes (Matinee / Midnight Show / Nightmare); undo for deterministic actions; Box Office stats screen; **terror deck** (a killer‑specific escalation card each time bloodlust crosses a multiple of 4); **multi‑phase Finales**; **Feature Two** (*The Tide Cabins*, *The Tidewife*); mix‑and‑match Custom Double Bill picker; per‑killer and per‑location art keys; extra Feature One events and items |
| **v0.3** | **Feature Three** (*Saint Agatha After Hours*, *The Anesthetist*): 3×3 = 9 killer/location pairings. **Double Bill builder**: shelf of curated posters, killer and location cards, a live poster preview, and a random "Spin the Reel" button. Generic `nearKiller` spawn target, plus a test that keeps killer packs free of location‑specific node references. **Art overhaul**: layered heroine portraits that show injuries and fear, an Anesthetist portrait, a hospital cutaway backdrop, film‑still illustrations on every event and terror card, item icons, VHS feature posters, and ambient particles on the board |
| **v0.4: Season 1 complete** | **Feature Four: Whiteout** (*Kettle Peak Lodge*, *The Snowblind*) and **Feature Five: Dead Air** (*KXRL Hilltop Studio*, *The Caller*), giving 5×5 = 25 pairings. Two new heroines: Sunny (cold‑immune) and Dee (phone specialist). **Each location now has one signature rule**: Intermission, The Tide, Rolling Blackouts, Whiteout cold, and Request Line phones. Node tags (`outdoor`, `warm`, `shore`, `phone`), `env` state, an `answer` action, the `warm` effect, and new heroine traits support the rules |
| **v0.5: Polish & balance** | Rule‑aware bot (`engine/bot.ts`) powers the balance sim and an in‑game **💡 Hint** (H). Hide‑search roll, Finale +1 speed, Saint Agatha and KXRL retuned. **Per‑location audio themes**: drone key, wind, fluorescent hum, rain and periodic ambience (waves and foghorn, elevator dings, howling gusts, static and thunder), plus stingers for the tide, blackout and phone ring. CI fuzz trimmed to about 20 s |
| **v0.6: First night & readability** | **Guided tutorial**: 14 coach‑mark steps on a scripted Drive‑In opening; offered to new players, replayable. **Clear tokens**: name‑tagged standee pins, a "you are here" pulse, a killer danger ring, and a red threat line when he's adjacent. **One‑screen layout**: the board scales to fit and panels scroll internally, with a stacked layout on phones. **Tabletop materials**: cardstock character sheet with polaroid, case‑file killer dossier, typed script‑page log, ticket‑stub actions, marquee‑bulb top bar, and SVG glyphs in place of emoji |
| **v0.7: Tension economy** | **Banked nerve** (+3 per round, cap 8; carries over). **Noise**: every 5 nerve spent in a round draws the killer a step closer. **Action deck**: a hand of 5 ticket cards drawn each round instead of fixed buttons (Search/Ransack, Lead, Fight/Desperate Swing, Hide/Hold Your Breath, Barricade, Catch Your Breath, Sprint). **Bleeding** junk cards per hit and **Panic** junk cards at horror 5 and 6 clog your hand. **Survivor panic clock**: survivors left alone for 4 rounds may bolt, sometimes into the killer. Escorting 3 or more costs +1 per move |
| **v0.8: Draft & readability** | **Lineup draft**: 6 face‑up action cards each round, take up to 3 for free (hand max 5), pay nerve to play. Every lineup is guaranteed a Lead card and a Hide or Fight card. Bleeding and Panic go straight into the hand. Noise every 6 nerve. **Readable map**: labeled badges with icons (searches left, panic n/4, barricade), a **Map key**, and a hover **location card** |
| v0.9: Hunt him down | **The only win is killing him**; dawn means he escapes, which is a loss. **Resolve**: each rescue gives +1 fight die (max 3) plus an item. **Nerve resets each round** again (5/4/4/3); banking and noise removed. **Movement comes from cards**: Walk, Run and Slip Away, with 2 Walk cards to start and a move card guaranteed in every lineup. **Hands + backpack**: 3 active hand slots and an unlimited backpack; readying an item costs 1 nerve, or is free at the moment you find it. Killers −2 health, dawn at round 14, "he gets back up" at 4 health |
| **v1.0: The five‑phase night** | Core loop rebuilt to a generic solo‑survival spec: **Action → Planning → Killer → Panic → Upkeep**. **Nerve 6** and an open **tableau** you buy from (used cards locked until Planning ends; discard for +1 nerve; nerve debt ends your turn). **Horror Rolls** with partials you buy up with cards, and 2+ / 1 / fail outcome bands on every card. **10‑card Terror deck** as the clock; **Finale** when it runs out (dawn removed). **Bloodlust track** sets his move and attack, with level effects and a **power** revealed at level 4. **Hidden final‑health tokens** for both sides. Survivors follow (2) and shield you; **exit rescues** fill slots and unlock an **ability**. **Reactions**. Elimination‑triggered **directional panic**. **Two hand slots** and per‑location **item piles**. Tie‑break policy setting. New tutorial, rule tests and balance pass |
| v1.0.3: Tighter nights, clearer numbers | **Economy**: nerve 5 (Matinee 6, Nightmare 4) and at most 4 buys per Planning (5/3), free cards included; Adrenaline costs 1; Steady Hands only rerolls. **Light attacks**: Shove and Swing take no weapon, lore or focus bonus, so heavy attacks are worth their cost; Full Swing's miss costs horror instead of health. Killers 10–12 health, a gentler attack curve, heroines +2 health; Margo's weapons never wear out. **Visibility**: his health bar on his map token and a big segmented health meter in his file; a Horror / dice / nerve block beside your hand that flashes when horror moves; an ascending horror track; every die explained on cards and in the dice tray; buys left shown in Planning |
| **v1.0.14: Symbols, not words** | Horror, dice, nerve and health are shown as symbols (a staring eye, a bone die, a gold lightning token, a heart) wherever they sit beside a number: the status box, heroine vitals and horror track, card costs and dice, card outcomes (*👁+1*, *+2⚡*), shop meter and pills, End and Shop buttons, peek banner, phone summaries and the tutorial. Every symbol keeps a text label for tooltips and screen readers. They are vector placeholders (`src/ui/symbols.ts`); painted versions are queued in the art pipeline as class *symbol* (`scripts/flux/prompts.mjs`, 4 assets, ~104 neurons) and replace the placeholders in the larger spots once rendered, while tiny inline uses stay vector. |
| **v1.0.15: Learn by playing** | Feedback: *“graphics and UI are really nice, but it's complicated; the tutorial isn't enough, I still don't know what to do.”* The tutorial opened with six screens and 277 words before the first click, taught the screen rather than the plan, and ended before any fight. **A 10‑second pitch** (Rescue → Power up → Kill him), then **do‑first bubbles** of 20 words or fewer that appear the moment their idea matters (dice on the first roll, the shop at the first Planning, Duck when he first swings), with chapter pips instead of a step count and the panels not yet taught dimmed. **A staged first fight**: he waits in the shed by the exit, steps in and attacks after the rescue, she Ducks it, and on turn 2 her Full Swing with the Tire Iron takes him from 7 to 3 (fixed seed; a test guards the script). **Goal bar** under the map (a slim row in the phone hand bar) that always says what she's after: get them out, rescue a survivor, find a weapon, hunt him, fight, get away, Finale (`src/engine/coach.ts`, read from the same plan the bot plays), with a **GOAL** flag on the target location. **Show me** / Hint (H) now rings the exact card, location or button and says *why* in a callout (*“Play Walk. Rescue a survivor: head for Parking Rows A.”*); the shop says what the hand is missing for next turn. On phones, tutorial bubbles dock to a screen edge instead of covering full‑screen panels, targets under the hand bar are scrolled into the clear, and the items sheet no longer pops over the hand mid‑tutorial. **Newcomer playtest** (an agent playing someone who skims and clicks whatever glows) won its first game in 5 turns on Show me alone, but caught the goal bar, Show me and the shop Hint disagreeing: all three now come from one decision (0 contradictions across ~8.5k bot states), a killer at 3 health or less becomes a **Finish him** goal the bot also plays (balance unchanged, 30%), the shop's *still need* list is the Hint's own and drops gaps the shop can't fill, End Action no longer nags when Show me said to end, a buy‑up isn't offered when the current row already blocks the whole hit, *Keep it* is always the main dice button, his turn opens with one plain line (*“You're safe this turn.”*), and the move picker reads *Survivors coming with you*. |
| **v1.1.1 (this build): Tuning, and every mechanic taught** | **Lessons**: one just-in-time lesson for each location rule (all ten maps) and each Season 2 killer mechanic, plus nudges at the campfire, the shutter override and a waiting bus; veterans who skip the basics still get these once. **Map key** lists the marks the current map and killer use. **Balance**: see the tuning table above. **Newcomer playtest** of Season 2 (an agent playing someone who skims, from screenshots only, about 20 turns over three features) found, and this release fixes: a doubled **E** could skip the whole Shop (E is now ignored for 0.8 s after the Shop opens, and leaving with nerve the coach would spend asks once); **Space on a search kept nothing** (the coach's pick is now pre-selected); on phones the **move banner and Map key covered exits** (the banner lets taps through, the key moves to the top-left corner); toasts named the location's rule for **killer events** ("The Last Bus: Taken"): they now name the real source, read as a sentence, and wait for her turn; **rule chips** say what the state does (*Fast Song: you both move +1*, *HIDDEN · last seen at…*); the **bus** lesson comes as the bus arrives and a bus stop with no bus loses its green ring; the shutters lesson speaks to **Bea**, whose keys cancel them; the heroine screen shows health as played (*7 health + 2nd chance*); **Over Here!** needs a survivor next door. Feel: the Window Dresser was too easy for a human who just steps off his mark (an empty scene now sends him hunting at full move); the Night Manager snowballed (a captive's death no longer adds bloodlust). |
| **v1.1.0: Season 2** | Five new features, all original: **Lights Out at Camp Tamarack** (*The Trapper*, 1982 summer camp), **Closing Time** (*The Window Dresser*, a 1986 mall on Christmas Eve), **No Vacancy** (*The Night Manager*, a 1979 desert motor court), **Skate Night** (*The Mirrorball*, a 1980 roller disco), **Harvest Moon** (*The Harvestman*, a 1988 corn maze). Design research: slasher settings the first season hadn't used (camp, mall after hours, roadside motel, roller rink, cornfield), and solo/hidden-movement horror board games for mechanics that change *how you plan*, not just the numbers: line of sight and last-known position, telegraphed threats, shifting maps, safe zones on a clock, timed rescues. **Each location adds one rule kind and each killer one gimmick** (tables above), 10 new engine mechanics in all, each a no-op where it isn't in play, so all 100 pairings mix freely. New effect ops (`fuel`, `gates`, `bus`, `song`, `reveal`, `trap`, `pose`, `strikePose`, `barricade around`), a `ruleAct` action for the location's own button (Stoke / Override / Skip song / Look out, key **A**), node tags (`fire`, `switch`, `bus`, `booth`, `corn`, `lookout`), two named-survivor traits (`medic`, `brave`), frozen-while-watched minions, and six heroine traits. **UI**: rule chip states, map badges (fuel, traps, the posed mannequin, captives and their clock, bus, corn, look-out), shutter pins on the passages, a ghosted "last seen" killer token with a ? in the corn, a killer-panel section for each gimmick, both rules on the intro crawl, Rules screen and Map key, a dimmed board for couples skate and a strobe for strobe songs, new particles and ambience per location. **Art**: 251 new painted assets queued (backdrops, finales, 10 portraits, map icons, card stills, items) on Cloudflare Workers AI Flux, with procedural fallbacks for anything not yet painted; a test now fails if any content lacks an art prompt. **Bot & coach** understand every new rule (stoke a dying fire, flip shutters that shorten the way, time the bus, raid Room 13, look out over the corn) and the coach never reveals a hidden killer. **Tests**: 21 Season 2 rule tests; the pairing fuzz samples 3 heroines per pairing to stay fast |
| v1.0.18: One thing at a time | Playtest feedback: the tutorial came all at once, and the screen was busy with no clear place to look. **Tutorial**: the core is 7 bubbles on turn 1 (pitch; search, roll, keep; walk the survivor out; your goal and Show me). Everything else is a **lesson** (`LESSONS` in `ui/tutorial.ts`): a one-time spotlight bubble that opens the first time its moment comes, in the tutorial night or any other: dice, search picks, his attack, his turn, the Shop, the fight, survivors following, rescues, ending the turn, his health, the Terror clock, horror, the Finale. One at a time; after a "Got it" the next waits for the player's next move. Seen lessons are remembered (`lastlight.lessons.v1`; players with 3+ nights start with them all seen; Replay Tutorial and Reset tips clear them). The bigger tips became lessons; the small print stays as tips. **Simple view** (Settings → Screen, or the link under each side panel; default until 5 nights are on record): her panel keeps health, rescues and hands; his keeps health, move/attack, his next move, minions and named survivors; the log folds to one line (click to open). **Focus**: on her turn his panel, the log and the phase bar step back (hover brings them back); while moving, places she can't reach, the hand and the panels dim. **Cards** (Simple view): the best result as one big line (*2+ Move 2*), the other outcomes small beneath. **Map** (Simple view): place names only where she can go, her goal and where she stands (hover or tap for the rest); smaller badges. **From the newcomer test**: the Shop lesson follows the coach buy by buy (the tutorial night scripts Full Swing first), and every buy hint names the gap it fills in the header's words (*you still need 2 Move cards*), so lesson, Hint and header agree and nobody leaves the shop without a way to move; bubbles keep off the whole panel around their target (dice tray, search, his attack, his turn), and dock at the edge that covers less of it; the clock lesson waits until mid‑turn instead of landing on the Terror card; a tip closes when its phase ends and whenever a lesson opens; the goal holds steady during a roll; the stat box is labelled (*horror, dice, nerve*) and a lesson explains the eye; a lesson announces the ability when it unlocks (its text stays visible in Simple view); Simple view shows only the current phase, drops the duplicate Hint button and the minion stat chips, and keeps *Show all details* pinned in view; the location card closes when she moves. |
| **v1.0.17: Who follows you** | Playtest feedback: nothing showed that survivors follow her, or how many (3 on her square, only 2 can come). **Token tag**: under her token, *2 follow* (green) or *2 of 3 follow* (gold, someone stays) from `followPlan`. **Map**: at her location the survivors who will follow glow green and the rest dim; while moving, every reachable location gets a *+N* badge (✕ on his location: they won't walk into him). **Words**: the bring picker adds *of 3 (you can lead 2)*; the escort goal reads *Walk 2 of the 3 survivors to the exit: X. Come back for the rest.*; the location card says *2 of 3 follow you*; a one‑time tip after a step names who stayed behind. |
| **v1.0.16: Plain words** | Follow‑ups from the newcomer playtest. **Words**: a 3–4 is *almost* (not *partial*); the hidden final‑health token is a *second chance* (*+? 2nd chance*); the phase bar reads *Action → Shop → His turn → Panic → Turn end* (formal names in its tooltips and in the rules, which give both); *Stow* is *To backpack*, *1H/2H* is *1 hand/2 hands*, the log is *What happened*, and the bloodlust track says what it does (*every kill feeds it: he moves farther and hits harder*). **Rolls say what they did**: a short line after every roll, including the ones that resolve on the spot with no tray (*✗ Hurry: no hits → horror +1 · you don't move*), and the same line in the dice tray; a miss never looks like nothing happened. **Tips don't block**: tips are a small note clicks pass through, top right (top centre on phones, lower left in the shop), fading on their own with a × instead of OK; toasts let clicks through everywhere but their button and keep off the shop's buttons. |
| v1.0.13: Your pockets, on a phone | On phones the heroine panel folds away, which hid her items and ability. A **backpack button** in the bottom bar (beside Undo and Hint) shows how many items she carries and glows when an item or her ability can be used right now; it opens an **Items & ability sheet** from the bottom with her ability (and its Use button), both hands, the backpack, and the selected item's actions. The sheet opens by itself when she finds something. Desktop is unchanged. |
| v1.0.12: Picks you can see | On the feature picker, choosing a feature or Spin the Reel glides the killer and location lists to the new picks (down on desktop, sideways on phones); picking a killer or location that makes up a feature glides the reel to it. Nothing moves if the pick is already in view. |
| v1.0.11: A killer worth the fight | v1.0.9 had cut killer health by 2 to offset the fewer dice, but heavy hits stack (Full Swing 3 + weapon + lore + Psych Up): the bot's biggest single hit took 52% of his health and token, and a human's stacked hit nearly one‑shot him. **Killer health is back to v1.0.8.** The fewer dice had made horror max out often, and every spill‑over raised his bloodlust, snowballing the night; now **horror past the top feeds his bloodlust at most once a turn** (+1). Heroines keep their +1 health. Bot sim, Midnight (875 games): biggest hit 43% of his health (v1.0.8: 43%), 4.4 hits to kill (4.0), wins in 1–2 hits 13% (22%); win 29% (was 35%: deliberately harder), Matinee 74%, Nightmare 3%. |
| v1.0.10: Should I spend cards? | The dice tray shows the card's three rows with where you stand (*now*) and, when a buy‑up would move you up a row, that row outlined in gold (*buy up*); a gold button spells out the trade (*Spend 2 cards: move 1 instead of horror +1*) beside *Keep it: horror +1*. Each die is labelled (hit / buy up / partial / miss), buyable partials glow, and the result is a coloured tag (best / middle / fail row). When spending can't help (already the best row, buy‑up used, too few cards, no 3–4) the tray says so and the dice stay inert. Choosing a buy‑up pre‑picks the two least useful cards (changeable); dice tumble once per roll, not on every re‑render. |
| v1.0.9: Fewer dice, real risk | Rolls were too easy: Midnight averaged 3.7 dice (Matinee 4.3, up to 7), and buying up every 3–4 turned 4 of 6 faces into successes. Now the Horror track is one die lower at every level (floor 2), and only **one partial per roll** can be bought up. To keep the night's overall difficulty, killers have 2 less health on every mode and heroines 1 more. Bot sim (875 Midnight games): 2.95 dice a roll (was 3.74), best band 37% of rolls (was 50%), fail 22% (was 17%); win 35% (unchanged), Matinee 83%, Nightmare 8%. A human who always buys up gets 59% best band and 4% fail at 3 dice (was 89% and 1% at 4). |
| v1.0.8: Links you can see | Map links are drawn road‑map style: a dark casing under a light dashed core (gold and solid when you can step along it), so they read on bright art (Kettle Peak's snow, Saint Agatha's lit walls) and dark art alike, and on any backdrop a future location brings. Strokes keep their pixel width at any board size or shape (`vector-effect: non-scaling-stroke`), including the taller phone map. |
| v1.0.7: Show your work, her pronouns, a phone that plays | **Damage breakdown**: every heavy hit logs and pops a tally beside his health (*7 damage = Full Swing 3 + Tire Iron 1 + lore item 1 + Psych Up 2*); light attacks say why nothing was added; waiting bonuses (*next hit +2*, *reroll misses*, extra dice) show as chips under your horror. **Killer pronouns**: text about the killer carries `{he}`/`{him}`/`{his}` placeholders (engine logs, shared location and card text, UI copy) that the page fills for the killer on screen, so the Tidewife is *she/her* at any location; text about anyone else keeps plain words (`engine/pronoun.ts`). **Phone layout** (≤700px): compact header, the map first and taller, heroine and killer folded into one‑line summaries you tap open, and a bar fixed to the bottom with status, Undo/Hint (icons), End, and one sideways row of cards; tapping a location reads it (no hover on touch), and every location stays tappable. |
| v1.0.6: A shop you can read, a night a newcomer can follow | **Planning shop**: cards grouped on shelves (Free, Move, Fight, Search, Defend, Recover, Tricks); big *Nerve to spend* and *Cards in hand* meters; each card says *N left*, *need N nerve*, *in your hand* or *back after Planning*; a warning (and a glowing free Walk) when you'd end Planning with no way to move. **Peek at the board** (B) shows a banner with a *Back to the shop* button. **From a novice playtest** (a fresh agent playing only from the UI): a full hand scrolls with *N more* arrows and the mouse wheel; the dice result and toasts can no longer pass a click to the map or a card; Undo survives a finished Walk; greyed hand cards say why (*out of reach*, *his turn*…); health shows *4/4 + ? backup* instead of folding the hidden token into the number; *Down at 0* note on the killer; the reaction prompt names a minion when a minion attacks; the end screen says *You win* / *You died*, lists the last blows and a tip on a loss, and keeps its buttons in view; Intermission counts down (*in 3 turns*); difficulty chips say easy/normal/hard; How to Play uses your difficulty's numbers. |
| v1.0.5: Harder fights, fuller nights, easier picking | **She's frailer**: heroines −2 health (Margo and Dee −1), killers +1 (Tidewife 8, others 10), so a straight brawl no longer wins easily. **A survivor wanders in every Upkeep** (at least 2 steps from him) until the supply of 16 runs out, so there's someone to save most of the night. **Pick screens fit the window**: the action bar (Back, difficulty, Roll Film) is pinned and never scrolls away; heroines are a roster grid plus one big file for your pick; features sit on a sideways reel grouped by season, killer and location lists scroll inside their columns; it all keeps working with many more heroines and seasons. Balance sim gains a `STYLE=rush` bot |
| v1.0.4: Fewer freebies, more people | **No buy cap**: buy as many cards as leftover nerve pays for. **Only three free cards** (Walk, Look Around, Duck), the spec's always‑available safety net; Hurry, Shove, Steady Yourself and Scream cost 1, Run and Deep Breath cost 2, and Shove became a break‑away (hit and move 1). **More survivors**: setup cards put 2 on each spot (6 at the start, supply 16), so the rescue track and her ability come online early (unlocked in 81% of games, up from 49%). Killers −3 health (Tidewife 7, others 9) to keep the Midnight win rate at 46% |
| v1.0.2: Readable night | **UI overhaul**: one type system (Oswald for labels and numbers, the typewriter face for sentences, Creepster for names) with fonts bundled locally instead of loaded from Google; rebuilt side panels (three big stat blocks, an ascending horror track with the dice it leaves you, a rescue track, item tiles with a detail strip instead of cramped rows); a big **Stop here** button and click‑yourself‑to‑stop while moving; card names no longer truncated; a capped, scrolling end‑of‑turn summary with repeats collapsed and a damage/kill/bloodlust summary strip; visible minion markers. **Choices**: tell a named survivor to stay put; divide damage between minions yourself. **Minions for every killer** |
| v1.0.1: The rest of the spec | All four tie‑break policies, named survivors (one per location), minions for the Tidewife and the Anesthetist with the him‑or‑them attack choice, written panic tables for every location, and v0.9 saves converted on Continue |
| v1.2 | Heroine scars and campaign mode |
| v0.4 | Achievements, daily seeded challenge, more heroines |
| v0.5 | PWA/offline, controller support, localization, optional commissioned art and music swapped into the art/audio slots |
| Later | Campaign mode (heroines carry scars and items between features), daily seeded challenge with a shared leaderboard (needs a backend) |
