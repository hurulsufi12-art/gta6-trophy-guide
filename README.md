# Leonida Platinum — GTA VI Trophy Guide & Tracker

![make.fun bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)
![Rank](https://make.fun/badge/gta6-trophy-guide-01/hurulsufi12-art/gta6-trophy-guide/rank.svg)
![Reward](https://make.fun/badge/gta6-trophy-guide-01/hurulsufi12-art/gta6-trophy-guide/reward.svg)

An offline, open-source trophy guide and tracker for **Grand Theft Auto VI**
(PlayStation 5) — a [make.fun](https://make.fun) bounty entry
(`gta6-trophy-guide-01`). All 55 official trophies with their names,
descriptions and grades, a guide for each trophy in our own words that cites
its sources, a roadmap to the platinum, missable flags, and a checklist that
saves in your browser.

## What it does

- **Tracker** — tick trophies off as you earn them; progress is saved in
  `localStorage` and can be exported to / imported from a JSON file.
- **Filters** — by kind (story, strangers, collectibles, activities, open
  world, missable, online) and by grade, plus search and a "hide earned"
  toggle. The official list has no online trophies, so that filter is
  honestly empty.
- **Spoiler-safe** — story trophies stay hidden until you earn them.
- **Roadmap to the platinum** — 6 stages (story → strangers → activities →
  collectibles → open-world cleanup → 100%), with per-stage progress, and a
  **Next up** planner that points at the next trophies to chase (missable
  story trophies first).
- **Guides with sources** — every trophy's guide names its sources
  (Exophase / PSNProfiles, the official PlayStation listing). GTA VI launched
  19 November 2026: where a location or step is not named in the official
  description, the guide says so instead of inventing one.
- **Offline** — plain static files, no network requests, no Rockstar artwork.
  Two themes (paper / night).

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

or open `app/index.html` from a static server. The entry program hands the
guide in for judging:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) validates the guide against the
gate caps first — 55 trophies with a non-empty guide each, 3–4 screenshots
of at most 256 KiB — then copies `app/` and `screenshots/` to the output
directory and writes `dossier.json` with the vendored make.fun library.

## Layout

- `app/index.html`, `app/style.css` — the page and its two themes
- `app/app.js`, `app/roadmap.js` — tracker, filters, planner, roadmap stages
- `app/data/trophies.json` — the 55 official trophies, guides and sources
- `screenshots/` — 4 screenshots of the guide (see `shots.json` for the views)
- `main.ts` — the entry program; `serve.ts` — a tiny local static server

## License

MIT — see [LICENSE](LICENSE).
