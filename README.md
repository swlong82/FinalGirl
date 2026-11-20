# LAST LIGHT

An original, solo slasher survival game for the browser.

### ▶ [Play now: swlong82.github.io/FinalGirl](https://swlong82.github.io/FinalGirl/)

[![Deploy to GitHub Pages](https://github.com/swlong82/FinalGirl/actions/workflows/pages.yml/badge.svg)](https://github.com/swlong82/FinalGirl/actions/workflows/pages.yml)

Runs in any modern browser on desktop or mobile, with no install. Headphones recommended. First time? Pick **First Night — Guided Tutorial** on the title screen.

> Route 9, autumn 1984. Tonight is the Holloway Drive‑In's farewell double feature, and three minutes into the first reel, the film skips.

- **Feature One: Last Show at the Holloway**. Killer: *The Projectionist*. Location: *The Holloway Drive‑In*.
- **Feature Two: The Tide Cabins**. Killer: *The Tidewife*. Location: *The Gullhaven Tide Cabins*.
- **Feature Three: Saint Agatha After Hours**. Killer: *The Anesthetist*. Location: *Saint Agatha's West Wing*.
- **Feature Four: Whiteout**. Killer: *The Snowblind*. Location: *Kettle Peak Lodge*.
- **Feature Five: Dead Air**. Killer: *The Caller*. Location: *KXRL Hilltop Studio*.
- **Season 1 is complete**: 5 features, 7 heroines, and a signature rule for every location (tide, blackouts, cold, ringing phones, intermission).
- **Double Bill builder**: put any killer in any location (25 pairings), with live VHS‑poster previews and a random pick. Three difficulty modes, terror cards, multi‑phase finales, and a stats screen.
- 5 playable heroines, each with her own passive and signature card.
- Procedural art (SVG) and a procedural soundtrack (WebAudio). There are no external assets.
- Autosave, keyboard shortcuts, mobile layout, and in‑context tutorial tips.

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

`npm test` fuzzes every killer × location × heroine combination with a rule‑aware bot. For the full balance report, run `SCRIPTS=1 N=30 npx vitest run balance`.

## Deploy (GitHub Pages)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`. `.github/workflows/pages.yml` tests, builds and deploys `dist/` to https://swlong82.github.io/FinalGirl/.

The build uses a relative base path, so `dist/` also works on any static host.

## Docs

See [`docs/DESIGN.md`](docs/DESIGN.md) for genre research, rules, architecture, how to add expansions, and the roadmap.

## Controls

`1`–`7` actions · `H` hint · click glowing locations to move · `Z` undo · `E` end turn · `Space` continue · `R` rules
