# LAST LIGHT

An original, solo slasher survival game for the browser.

### ▶ [Play now: swlong82.github.io/FinalGirl](https://swlong82.github.io/FinalGirl/)

[![Deploy to GitHub Pages](https://github.com/swlong82/FinalGirl/actions/workflows/pages.yml/badge.svg)](https://github.com/swlong82/FinalGirl/actions/workflows/pages.yml)

Runs in any modern browser on desktop or mobile, with no install. Headphones recommended. First time? Pick **First Night: Guided Tutorial** on the title screen.

> Route 9, autumn 1984. Tonight is the Holloway Drive‑In's farewell double feature, and three minutes into the first reel, the film skips.

- **Feature One: Last Show at the Holloway**. Killer: *The Projectionist*. Location: *The Holloway Drive‑In*.
- **Feature Two: The Tide Cabins**. Killer: *The Tidewife*. Location: *The Gullhaven Tide Cabins*.
- **Feature Three: Saint Agatha After Hours**. Killer: *The Anesthetist*. Location: *Saint Agatha's West Wing*.
- **Feature Four: Whiteout**. Killer: *The Snowblind*. Location: *Kettle Peak Lodge*.
- **Feature Five: Dead Air**. Killer: *The Caller*. Location: *KXRL Hilltop Studio*.
- **Season 1 is complete**: 5 features, 7 heroines, and a signature rule for every location (tide, blackouts, cold, ringing phones, intermission).
- **v1.0.11: a killer worth the fight.** Killer health is back to full, so a stacked heavy hit no longer nearly one-shots him; horror past the top now feeds his bloodlust at most once a turn.
- **v1.0.10: should I spend cards?** The dice tray shows where your roll lands on the card and, when buying up a 3–4 would help, exactly what 2 cards buy you; otherwise it tells you not to bother.
- **v1.0.9: fewer dice, real risk.** One die fewer on every Horror Roll (never below 2) and only one partial bought up per roll, so a roll can actually go wrong; heroines got +1 health.
- **v1.0.7: show your work.** Every hit on the killer shows how it added up (card + weapon + lore + Psych Up), waiting bonuses show as chips, the Tidewife is *she* everywhere, and phones get a real layout: map first, tap-to-open panels, and the hand in a bar fixed to the bottom.
- **v1.0.6: a shop you can read.** Planning is a shop with shelves (Free, Move, Fight, Search, Defend, Recover, Tricks), big nerve and hand counters, a warning if you'd leave with no way to move, and a Back-to-the-shop banner when you peek at the board (B). Plus a round of fixes from a first-time-player playtest: clearer health and backup tokens, reasons on greyed cards, a scrollable full hand, no more clicks falling through, and an end screen that says what happened.
- **v1.0.5: harder fights, fuller nights.** She has less health and he has more, a survivor wanders in every Upkeep, and the feature and heroine pickers fit on one screen however many seasons arrive.
- **v1.0.4: fewer freebies, more people.** No limit on buys, but only Walk, Look Around and Duck are free. Six survivors are on the board from the start, so your rescue track (and ability) fills early.
- **v1.0: the five‑phase night.** Each turn is Action → Planning → Killer → Panic → Upkeep. You spend **nerve** on action cards, buy new ones from an open tableau, and make **Horror Rolls** where 3–4 is a partial you can buy up with cards. A **10‑card Terror deck** counts down to the **Finale**. His **bloodlust** sets how far he moves and how hard he hits, and both of you carry a hidden **final‑health token**. The only way to win is to kill him.
- **Double Bill builder**: put any killer in any location (25 pairings), with live VHS‑poster previews and a random pick. Three difficulty modes and a stats screen.
- Named survivors with their own quirks in every location, minions for every killer, and four tie‑break policies (player‑adverse, most plausible, comedic, unpredictable). Nights saved under v0.9 are converted when you Continue.
- 7 playable heroines, each with a passive, a rescue‑reward track, and an ability that unlocks when every rescue slot is full.
- Painted art (portraits, backdrops, card stills, icons) rendered with Flux on Cloudflare Workers AI, with the original procedural SVG art as a fallback for anything not yet painted. Procedural soundtrack (WebAudio). Conversion status: [`docs/ASSETS.md`](docs/ASSETS.md).
- Autosave, undo, keyboard shortcuts, mobile layout, a guided first night, and in‑context tips.

## Play locally

```bash
npm install
```

```bash
npm run dev
```

## Test & build

```bash
npm test
```

```bash
npm run build
```

`npm test` runs rule tests for the core loop and fuzzes every killer × location × heroine combination with a rule‑aware bot. For the full balance report, run `SCRIPTS=1 N=10 npx vitest run balance`.

## Deploy (GitHub Pages)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`. `.github/workflows/pages.yml` tests, builds and deploys `dist/` to https://swlong82.github.io/FinalGirl/.

The build uses a relative base path, so `dist/` also works on any static host.

## Painted art (Flux)

Prompts live in `scripts/flux/prompts.mjs`; the renderer calls `@cf/black-forest-labs/flux-2-klein-4b` one asset at a time, writes WebP files to `src/art/gen/`, and updates `scripts/flux/manifest.json` and `docs/ASSETS.md` after every asset. It stops cleanly at the Workers AI free daily limit (10,000 neurons, reset 00:00 UTC); run it again the next day to continue.

```bash
CLOUDFLARE_API_TOKEN=<token with Workers AI Read+Edit> NODE_USE_ENV_PROXY=1 node scripts/flux/render.mjs
```

Options: `--max N`, `--only key1,key2` (add `--force` to redo finished ones), `--retry-flagged` (after rewording a prompt the model's filter flagged), `--dry` (show the queue and neuron estimate).

## Docs

See [`docs/DESIGN.md`](docs/DESIGN.md) for genre research, the full rules, how v1.0 maps onto the generic survival‑game spec, architecture, how to add expansions, and the roadmap.

## Controls

`1`–`0` play cards · click glowing locations to step · `S` stop moving · `A` answer · `H` hint · `Z` undo · `E` end phase · `Space` continue · `R` rules
