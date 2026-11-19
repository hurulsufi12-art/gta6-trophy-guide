// The roadmap to the platinum, built from the official trophy descriptions:
// story first (the only missable trophies), then strangers, activities,
// collectibles, open-world cleanup, and 100% + platinum last. Stage numbers
// are the order to play in; every trophy carries its stage in data/trophies.json.
export const STAGE_META = [
  {
    stage: 1,
    title: 'Play the story',
    blurb:
      'Chapters 1–4, the opening mission and the final mission, plus the six named story ' +
      'missions. These 12 trophies are the missable ones: finish each mission while it is ' +
      'offered, and replay it from mission select if you miss it.',
  },
  {
    stage: 2,
    title: 'Strangers & side missions',
    blurb:
      'Finish the mission strands for Andy, Kenton, Billy, Randy and Tyrone, plus three more ' +
      'stranger strands to reach 8 — and hunt Bret’s unique animal. Side content stays ' +
      'available after the story, so there is no rush here.',
  },
  {
    stage: 3,
    title: 'Activities',
    blurb:
      'Shooting Range golds (42 challenges), drone races (14 locations), races, fishing vs Cal, ' +
      'arcade, bowling, meditation (18 spots) and the melee drive-by. Sample all 9 activity ' +
      'types for Master of None along the way.',
  },
  {
    stage: 4,
    title: 'Collectibles & exploration',
    blurb:
      'Card sets (3), WAiNK It at 100 locations, 100 vehicles discovered, all 52 areas of ' +
      'Leonida, 8 garage properties and 10 Scooter Bros registrations. Nothing here is missable.',
  },
  {
    stage: 5,
    title: 'Open-world cleanup',
    blurb:
      'Wanted-level escapes, shop and bank robberies, gang operations (9 gangs), money goals ' +
      '($250,000 laundered, $100,000 spent), 50 challenges and the cryptic ones — choices ' +
      '(500), second chances and strange sights.',
  },
  {
    stage: 6,
    title: '100% & the platinum',
    blurb:
      'Attain 100% Completion and the platinum pops with it. Check the in-game stats page for ' +
      'whatever is still missing, then work this guide backwards from the end.',
  },
];

// How far each roadmap stage is: { stage, total, done } per stage, in stage order.
// Kept here so the tracker and any other view count stages exactly the same way.
export function stageCounts(trophies, earned) {
  return STAGE_META.map((meta) => {
    const stageTrophies = trophies.filter((t) => t.stage === meta.stage);
    return {
      stage: meta.stage,
      total: stageTrophies.length,
      done: stageTrophies.filter((t) => earned.has(t.name)).length,
    };
  });
}

// Pick the next trophies to chase: earliest roadmap stage first, missable story
// trophies before anything else in their stage, then by trophy order. Returns
// at most `count` unearned trophies, each with a short reason why it is next.
export function pickNextUp(trophies, earned, count = 3) {
  const open = trophies.filter((t) => !earned.has(t.name));
  open.sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage;
    if (a.missable !== b.missable) return a.missable ? -1 : 1;
    return a.id - b.id;
  });
  return open.slice(0, count).map((t) => {
    let why;
    if (t.missable) {
      why = `Stage ${t.stage} · story mission — missable, do it while it is offered.`;
    } else if (t.stage === 6) {
      why = 'Stage 6 · the last step: finish everything else first.';
    } else {
      why = `Stage ${t.stage} · ${STAGE_META[t.stage - 1].title.toLowerCase()} — earliest open stage.`;
    }
    return { trophy: t, why };
  });
}
