# Vice Route — GTA 6 Platinum Planner

[![gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/hurulsufi12-art/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/hurulsufi12-art/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

**Vice Route** is an offline guide and tracker for all 55 GTA 6 trophies on
PlayStation 5 — built for the
[make.fun bounty gta6-trophy-guide-01](https://make.fun/bounty/gta6-trophy-guide-01).

## Why a route, not a checklist

Most trophy guides sort by kind. Vice Route is a **route**: 7 legs in the
order you should earn them, from the story to the platinum.

| Leg | Name | Trophies |
|-----|------|----------|
| L1 | Story: The Road to the Finale | 12 — every story mission, all missable |
| L2 | Strangers & Freaks | 7 — stranger strands + Bret's hunt |
| L3 | Leonida on Wheels & Wings | 8 — races, stunts, drones, fishing, arcade, bowling |
| L4 | Vice City Playground | 14 — wanted levels, robberies, money, vehicles |
| L5 | The Collector | 7 — 52 areas, garages, cards, spots, range |
| L6 | The Long Grind | 6 — 100%, 50 challenges, the vague ones |
| L7 | Platinum | 1 — Vice Got a Price! |

- **Route view** — 7 legs with a progress bar each, the "Don't miss" strip
  (missable story trophies still open), and the Tonight planner.
- **Leg view** — trophies in earn order with their guide open, plus a
  warning to finish the leg before its phase ends.
- **Checklist** — all 55 trophies with filters by leg, grade and kind,
  missable-only, search, and hide-earned. The official list holds no online
  trophy, so the online filter honestly shows an empty state.
- **Tonight** — a session view: the next 3 trophies from the earliest
  unfinished leg, each with a reason why tonight.
- **Settings** — spoiler guard (story trophy names and descriptions stay
  hidden until earned), export/import of progress as JSON, reset.
- **Tracker** — progress saves in localStorage; counters per grade and leg.

## Honest sources

All 55 names, descriptions and grades are the official PlayStation list as
Exophase and PSNProfiles publish it. Every guide is written fresh for this
entry from the official descriptions and cites its source beside it. GTA VI
is brand new, so where a location or step is not certain the guide says so
("our advice from the official description, not yet checked in the game")
instead of inventing one. No Rockstar logo or artwork; no network requests —
the whole guide runs offline from its own files.

## Run it

```bash
node serve.ts   # http://localhost:8080
```

## Hand it in

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` checks the gate first (55 official trophies with guides, 3–4
screenshots within size, app/ within its caps, no network references), then
copies `app/` and `screenshots/` and writes `dossier.json` with the vendored
make.fun library. Run it twice: both runs write identical bytes.

## Files

- `main.ts` — hand-in program (Node 22 stdlib only, gate checks first)
- `serve.ts` — local static server for `app/` and `screenshots/`
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged
- `app/index.html`, `app/style.css` — page + "Vice Nights" dark neon theme
- `app/app.js` — boot, progress store, export/import, spoiler, routing
- `app/route.js` — the 7 legs, the Tonight planner, the seed progress
- `app/views.js` — the Route / Leg / Checklist / Tonight / Settings views
- `app/data/trophies.json` — the 55 official trophies with fresh cited guides
- `screenshots/` — 4 real renders of the app (see `shots.json`)
