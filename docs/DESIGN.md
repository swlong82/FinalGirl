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
| **One meaningful scarce resource** | Every turn is a squeeze: you can't do everything | **Nerve**: 3–5 points per round, set by your Horror tier |
| **Fear as a mechanical spiral** | Panic makes you worse, which makes things scarier | **Horror** 0–6: lowers nerve and raises the dice target; above 6 it turns into wounds |
| **Push‑your‑luck dice** | Tension at every roll | d6 pools, success on 4+/5+, rerolls via Instinct cards |
| **The killer as an AI, not a player** | Readable but relentless | Deterministic priority: attack → kill a survivor → hunt the nearest prey (lured/hidden aware) |
| **Victims as a moral clock** | Saving people competes with saving yourself | Survivors spawn by event; each death feeds **Bloodlust** (Frenzy at 6, Finale at 12) |
| **Act structure / Finale** | A movie‑shaped arc with a climax | Rounds 1–9 = hunt; **Finale** triggers by bloodlust, by clock (last 3 rounds), or when you "kill" him early (*he gets back up*) |
| **Mix‑and‑match boxes** | Replayability from combinations | Killer packs and Location packs are independent data; any killer can stalk any location |
| **Lore‑as‑mechanic** | Discovery is rewarding | Lore items reveal the killer's backstory **and** strip his armor |

UX lessons from digital board‑game ports (good ones and bad ones):

- Show what's possible **before** the player clicks: reachable nodes glow, edges animate, buttons show cost, dice and target.
- Never hide the killer's reasoning: the killer turn is a readable summary card, and the log is called the "Script".
- Dice must feel physical: a tumble animation, colored hits, one‑click (or auto) dismiss.
- Escalate the atmosphere through feedback, not walls of text: vignette, heartbeat, grain and drone all follow Horror.
- Teach in context: one‑time tips fire when a situation first comes up (survivors present, killer here, escorting).
- Respect the player: autosave every action, keyboard shortcuts, reduced‑motion support, mobile layout.

## 2. Core loop (one round)

1. **Event**: flip an event card (location deck + killer deck shuffled together).
2. **Actions**: spend nerve.

| Action | Cost | Effect |
|---|---|---|
| Move | 1 (2 to flee the killer) | Go to an adjacent node; escorted survivors follow |
| Search | 1 | Roll 2d (+bonuses); 1 success = 1 item, 2+ = 2 items; uses a node's search token |
| Lead | 1 | Pick up survivors here (escort cap 3) |
| Fight | 2 | Roll 3d + best weapon; damage = successes − armor |
| Hide | 1 | Roll 2d; any success → he skips attacking you this round |
| Barricade | 2 | The killer spends a move breaking it |
| Rest | 2 | Roll 2d; each success heals 1 or calms 1 horror |

Items and Instinct cards cost nothing to use.
3. **Killer**: if stunned, skip. If with the heroine and she isn't hidden → attack. Otherwise, if survivors are here → kill one (two in Frenzy) and gain 2 bloodlust each. Otherwise move `speed` steps toward the nearest prey, with ties going to the heroine.
4. **End of round**: modifiers reset, draw 1 Instinct, the clock advances, and a quiet board may spawn a survivor.

**Win:** kill him during the Finale (★ high score), or survive to **dawn** (round 13).
**Lose:** health reaches 0.
**Score:** win bonus + 15 per survivor saved − 5 per survivor slain + 5 per remaining health.

### Horror tiers
| Horror | Tier | Nerve | Success on |
|---|---|---|---|
| 0–1 | Steady | 5 | 4+ |
| 2–3 | Uneasy | 4 | 4+ |
| 4–5 | Terrified | 4 | 5+ |
| 6 | Breaking | 3 | 5+ |

### Terror & Finale phases
- `KillerPack.terror` is shuffled into its own deck. Each time bloodlust crosses a multiple of `terrorEvery` (4), one card is revealed and resolved. Terror cards are permanent escalations: heal, armor, teleport to the heroine, wounds.
- `finale.phases[]`: when the killer drops to 0 in the Finale, the next phase begins with fresh health and its own effects. You only win when the last phase ends.

### Location rules (one per location)
| Location | Rule | Effect |
|---|---|---|
| Holloway Drive‑In | Intermission | Every 4th round: +1 nerve, horror −1 |
| Gullhaven Tide Cabins | The Tide | Turns every 3 rounds; at high tide, entering a shore node costs +1 nerve |
| Saint Agatha's | Rolling Blackouts | Rounds 3–4, 7–8, 11–12: search target +1, hide +1 die, the board goes dark |
| Kettle Peak Lodge | Whiteout | End a round outdoors: cold +1 (a wound at 3); by a fire: thaw; at 2+ cold: −1 nerve per round |
| KXRL Hilltop | Request Line | A phone rings each round; answer it (1 nerve: +1 horror, draw 2 Instincts) or a survivor appears there and the killer is lured to it |

Rules are owned by the location, so they apply whichever killer you choose.

### Difficulty
| Mode | Killer health | Killer attack | Dawn |
|---|---|---|---|
| Matinee | −3 | — | 1 round earlier |
| Midnight Show | — | — | round 13 |
| Nightmare | +3 | +1 die | round 13 |

### Balance
`npm test` runs a heuristic bot through 150 seeded games per heroine (750 total) and prints the outcomes.
The bot plays naively (it fights whenever it can), so humans should do better. Current target band:
the bot kills the killer in ~50–60% of games and dies in ~20–35%.

## 3. Architecture

```
src/
  engine/      pure, deterministic rules (no DOM)
    types.ts   content schema + runtime state + actions
    rules.ts   newGame / check / dispatch / killer AI / effect interpreter
    rng.ts     seeded RNG (state stored in the save → exact replays)
  content/     data packs — the only thing an expansion touches
    drive-in/       LocationPack: The Holloway Drive-In
    projectionist/  KillerPack: The Projectionist
    tide-cabins/    LocationPack: The Gullhaven Tide Cabins
    tidewife/       KillerPack: The Tidewife
    saint-agatha/   LocationPack: Saint Agatha's West Wing
    anesthetist/    KillerPack: The Anesthetist
    whiteout-lodge/ LocationPack: Kettle Peak Lodge
    snowblind/      KillerPack: The Snowblind
    dead-air/       LocationPack: KXRL 1340 Hilltop Studio
    caller/         KillerPack: The Caller
    heroines/       5 heroines + the core Instinct deck
    registry.ts     Features (killer × location pairs)
  art/art.ts       dispatchers: killer portraits, backdrops, node icons, dice
  art/portraits.ts layered heroine portraits (fear & injury states)
  art/scenes.ts    Anesthetist, hospital backdrop, card film stills, item icons, posters
  art/season1.ts   Snowblind, Caller, snow & radio-hill backdrops, their node icons
  ui/particles.ts  ambient board particles per location (dust/moths, drizzle, motes, embers)
  audio/       procedural WebAudio score + SFX
  ui/          grain canvas, styles
  main.ts      screens, board, panels, overlays, input, FX
tests/         engine fuzz/balance tests
```

- **Effects are data.** Cards and items declare `Effect[]` ops (`spawn`, `horror`, `killerMove`, `mod`, `if`, …), and one interpreter resolves them all. Most new cards need no code at all.
- **Reducer pattern.** `dispatch(content, state, action) → state`. The UI only reads state and plays `state.fx` (sound and animation cues). That makes it easy to port to React/Svelte, a server‑authoritative multiplayer setup, or a native wrapper later.
- **Portable.** It's a static build with a relative `base`, so it runs on GitHub Pages, Netlify, S3, itch.io, or inside Capacitor/Tauri.

## 4. Adding a Feature (expansion)

1. Create `src/content/<location>/location.ts` that exports a `LocationPack`: nodes with map coordinates, edges, exit, lair, events and items.
   - **Mixing rule:** killer packs must never name a location's nodes. Use `heroine`, `lair`, `random`, `nearKiller` or `farFromKiller` instead. A test enforces this.
2. Create `src/content/<killer>/killer.ts` that exports a `KillerPack`: stats, Finale, events, lore items and quotes.
3. Register both in `src/content/registry.ts` and add a `Feature`.
4. Optionally add new heroines (`HeroineDef` with traits and a signature card).
5. Art: set `KillerPack.art` and `LocationPack.art`, then add a portrait or backdrop renderer for that key in `art.ts`.
6. Run `npm test`. It fuzzes every killer × location × heroine combination and validates every node reference in the packs.

## 5. Atmosphere & audio

- **Visual:** a 24 fps film‑grain canvas with scratch lines, a vignette that reddens and pulses with horror, a projector beam flicker, drifting fog (`feTurbulence`), a screen shake on hits, a red or white flash, and the backdrop turning blood‑red in the Finale.
- **Audio (all synthesized):** an A‑minor drone whose filter opens with horror and drops to E in the Finale; wind; crickets that thin out as fear rises; 24 fps projector clatter; a heartbeat whose BPM follows horror and killer proximity; an original music‑box motif with tape delay that drops a semitone in the Finale; and stingers for the killer appearing, wounds, hits, kills, saves, items, dice, cards and the Finale.

## 6. Roadmap

| Phase | Scope |
|---|---|
| v0.1 | Feature One: 1 killer, 1 location (11 nodes), 5 heroines, 22 events, 16 items, 15 instincts; full UI, audio, saves |
| **v0.2 (this build)** | Difficulty modes (Matinee / Midnight Show / Nightmare); undo for deterministic actions; Box Office stats screen; **terror deck** (a killer‑specific escalation card each time bloodlust crosses a multiple of 4); **multi‑phase Finales**; **Feature Two** (*The Tide Cabins*, *The Tidewife*); mix‑and‑match Custom Double Bill picker; per‑killer and per‑location art keys; extra Feature One events and items |
| **v0.3 (this build)** | **Feature Three** (*Saint Agatha After Hours*, *The Anesthetist*): 3×3 = 9 killer/location pairings. **Double Bill builder**: shelf of curated posters, killer and location cards, a live poster preview, and a random "Spin the Reel" button. Generic `nearKiller` spawn target, plus a test that keeps killer packs free of location‑specific node references. **Art overhaul**: layered heroine portraits that show injuries and fear, an Anesthetist portrait, a hospital cutaway backdrop, film‑still illustrations on every event and terror card, item icons, VHS feature posters, and ambient particles on the board |
| **v0.4 (this build): Season 1 complete** | **Feature Four: Whiteout** (*Kettle Peak Lodge*, *The Snowblind*) and **Feature Five: Dead Air** (*KXRL Hilltop Studio*, *The Caller*), giving 5×5 = 25 pairings. Two new heroines: Sunny (cold‑immune) and Dee (phone specialist). **Each location now has one signature rule**: Intermission, The Tide, Rolling Blackouts, Whiteout cold, and Request Line phones. Node tags (`outdoor`, `warm`, `shore`, `phone`), `env` state, an `answer` action, the `warm` effect, and new heroine traits support the rules |
| v0.5 | Season 2 kickoff; heroine scars and campaign mode |
| v0.4 | Achievements, daily seeded challenge, more heroines |
| v0.5 | PWA/offline, controller support, localization, optional commissioned art and music swapped into the art/audio slots |
| Later | Campaign mode (heroines carry scars and items between features), daily seeded challenge with a shared leaderboard (needs a backend) |
