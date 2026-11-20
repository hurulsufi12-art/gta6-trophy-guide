# Vice Route — GTA 6 Platinum Planner

[![gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/hurulsufi12-art/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/hurulsufi12-art/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI — a **route**, not a checklist. Seven legs in the order you should earn them, from the first story mission to the platinum.

## The route

| Leg | Name | Trophies | What it is |
|-----|------|----------|------------|
| 1 | Story: The Road to the Finale | 12 | Every story mission. All missable — finish each before its phase ends. |
| 2 | Strangers & Freaks | 7 | Stranger strands, plus Bret's hunt. |
| 3 | Leonida on Wheels & Wings | 8 | Races, stunts, drones, fishing, arcade, bowling. |
| 4 | Vice City Playground | 14 | Wanted levels, robberies, money, vehicles. |
| 5 | The Collector | 7 | 52 areas, garages, cards, spots, the range. |
| 6 | The Long Grind | 6 | 100%, 50 challenges, the vague ones. |
| 7 | Platinum | 1 | Vice Got a Price! |

## What the app does

- **Route view** — seven legs with a progress bar each, a "Don't miss" strip of the missable story trophies still open, and the Tonight planner.
- **Leg view** — trophies in earn order with their guide open, plus a warning to finish the leg before its phase ends.
- **Checklist** — all 55 trophies with filters by leg, grade and kind, missable-only, search, and hide-earned. The official list holds no online trophy, so the online filter honestly shows an empty state.
- **Tonight** — a session view: the next 3 trophies from the earliest unfinished leg, each with a reason why tonight.
- **Settings** — spoiler guard (story trophy names and descriptions stay hidden until earned), export/import of progress as JSON, reset.
- **Tracker** — progress saves in localStorage; counters per grade and leg.

## Honest sources

All 55 names, descriptions and grades are the official PlayStation list as Exophase and PSNProfiles publish it. Every guide is written fresh for this entry from the official descriptions and cites its sources beside it. Where a location or step is not certain, the guide says so ("our advice from the official description, not yet checked in the game") instead of inventing one. No Rockstar logo or artwork is used.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Fully offline: the app is static files under `app/` and makes no network requests at runtime.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) checks the gates first — 55 trophies with guides, 3–4 screenshots within size, `app/` within its caps, no network references — then copies `app/` and `screenshots/` and writes `dossier.json` with the vendored library. Run it twice: the output is byte-identical.

## Files

- `app/index.html`, `app/style.css`, `app/app.js` — shell, "Vice Nights" theme, boot and routing
- `app/route.js` — route logic: legs, progress, Tonight picks, filters, spoiler rule, import validation
- `app/views.js` — the Route, Leg, Checklist, Tonight and Settings screens
- `app/data/trophies.json` — the official 55, each with a fresh guide, sources, leg, kind and missable flag
- `main.ts`, `serve.ts`, `shots.json` — entrypoint, dev server, screenshot scenes
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged
- `screenshots/` — real renders of the app's own `?shot=` scenes

## License

MIT — see `LICENSE`.
