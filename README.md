# LAST LIGHT

An original, solo slasher survival game for the browser.

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

`npm test` fuzzes the engine with a bot (750 seeded games) and prints the win/loss balance.

## Deploy (GitHub Pages)

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`. `.github/workflows/pages.yml` tests, builds and deploys `dist/`.

The build uses a relative base path, so `dist/` also works on any static host.

## Docs

See [`docs/DESIGN.md`](docs/DESIGN.md) for genre research, rules, architecture, how to add expansions, and the roadmap.

## Controls

`1`–`7` actions · click glowing locations to move · `Z` undo · `E` end turn · `Space` continue · `R` rules
