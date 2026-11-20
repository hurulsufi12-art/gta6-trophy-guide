// Vice Route — the seven legs to the platinum, in earn order. A leg lists
// its trophy ids in the order a player should earn them. The order follows
// the legs' phases; no chapter or mission mapping is invented here, and
// every story trophy's guide names the mission or chapter it belongs to.
export const LEGS = [
  { id: "L1", n: 1, title: "Story: The Road to the Finale", tag: "Play the story through — every mission trophy lives here, and all 12 are missable.",
    warn: "Finish every trophy in this leg before its phase ends — story missions are one pass; replay from mission select if the game offers one.",
    ids: [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 7] },
  { id: "L2", n: 2, title: "Strangers & Freaks", tag: "Seven strangers, eight strands — clear them before the finale.",
    warn: "Stranger strands stay open, but do them now: after the finale there is no story left to unlock them with.",
    ids: [22, 23, 24, 26, 27, 29, 25] },
  { id: "L3", n: 3, title: "Leonida on Wheels & Wings", tag: "Races, stunts, drones, fishing, arcade and bowling — the fun leg.",
    warn: "No missables here — race and stunt at your own pace.",
    ids: [18, 19, 15, 20, 21, 46, 51, 16] },
  { id: "L4", n: 4, title: "Vice City Playground", tag: "Wanted levels, robberies, money and vehicles in the open world.",
    warn: "No missables here — but keep your wanted level alive on purpose for Retail Therapy.",
    ids: [33, 34, 35, 55, 39, 41, 43, 45, 36, 37, 38, 44, 52, 53] },
  { id: "L5", n: 5, title: "The Collector", tag: "52 areas, garages, card sets, photo spots, meditation and the range.",
    warn: "No missables here — slow, steady collecting; tick areas off as you travel.",
    ids: [42, 31, 30, 28, 54, 40, 17] },
  { id: "L6", n: 6, title: "The Long Grind", tag: "100%, 50 challenges and the three vague-description trophies.",
    warn: "The vague ones (Personal Best, Actions Speak Louder, Bad Luck I Guess, The Truth Is Out There) name no trigger in the official list — leave them for last and check them once everything else is done.",
    ids: [32, 48, 49, 47, 50, 14] },
  { id: "L7", n: 7, title: "Platinum", tag: "Vice Got a Price! — the finish line.",
    warn: "Nothing to do here but finish L1–L6.",
    ids: [1] },
];

// The 13 trophies earned in the seeded demo state (13/55): most of Leg 1
// plus a few scattered wins, so the progress bars and the legs look alive.
export const SEED_EARNED = [2, 3, 4, 8, 9, 22, 18, 21, 33, 35, 44, 31, 49];

// Every trophy id, leg by leg, in earn order.
export function earnOrder() {
  return LEGS.flatMap((leg) => leg.ids);
}

// The leg a trophy belongs to, by id.
export function legFor(id) {
  for (const leg of LEGS) {
    if (leg.ids.includes(id)) return leg;
  }
  return null;
}

// Earned count and percentage for one leg.
export function legStats(leg, earned) {
  const done = leg.ids.filter((id) => earned.has(id)).length;
  const total = leg.ids.length;
  return { done, total, pct: total ? Math.round((100 * done) / total) : 0 };
}

// The first leg that is not finished yet (null when every leg is done).
export function nextLeg(earned) {
  for (const leg of LEGS) {
    if (leg.ids.some((id) => !earned.has(id))) return leg;
  }
  return null;
}

// One line on why a trophy is tonight's pick.
export function tonightWhy(trophy) {
  if (trophy.missable) return "Missable story beat — do it before this phase ends.";
  if (trophy.leg === "L2") return "Stranger strand — finish it before the finale.";
  if (trophy.leg === "L3") return "Quick activity win — a race, a stunt or a game away.";
  if (trophy.leg === "L4") return "Open-world job — money, heat or wheels while you roam.";
  if (trophy.leg === "L5") return "Collector tick — one more area, card or spot off the list.";
  if (trophy.leg === "L6") return "Long grind — chip away at the count tonight.";
  return "The finish line — earn everything else first.";
}

// Tonight's session: the next 3 unearned trophies from the earliest
// unfinished leg, each with its reason. Falls through to later legs so the
// list is always full until the platinum is earned.
export function planTonight(trophiesById, earned) {
  const picks = [];
  for (const id of earnOrder()) {
    if (picks.length >= 3) break;
    if (earned.has(id)) continue;
    const trophy = trophiesById.get(id);
    if (!trophy) continue;
    picks.push({ trophy, reason: tonightWhy(trophy) });
  }
  return picks;
}

// Missable trophies not earned yet, in route order — the Don't-miss strip.
export function stillMissable(trophiesById, earned) {
  return earnOrder()
    .map((id) => trophiesById.get(id))
    .filter((t) => t && t.missable && !earned.has(t.id));
}
