// Vice Route — route logic: pure functions over the trophy list, no DOM.
// Route order is leg order, then the official id order inside a leg.

export const TOTAL_TROPHIES = 55;
export const STORE_KEY = 'vice-route-earned-v1';
export const SETTINGS_KEY = 'vice-route-settings-v1';
export const HIDDEN_NAME = 'Hidden story trophy';
export const HIDDEN_DESC = 'Hidden until earned — the spoiler guard is on. Earn this trophy to reveal its name and description.';

export function routeOrder(trophies) {
  return [...trophies].sort((a, b) => (a.leg - b.leg) || (a.id - b.id));
}

export function legProgress(trophies, earned) {
  const legs = {};
  for (const t of trophies) {
    const leg = legs[t.leg] || (legs[t.leg] = { leg: t.leg, total: 0, earned: 0 });
    leg.total += 1;
    if (earned.has(t.id)) leg.earned += 1;
  }
  return Object.values(legs).sort((a, b) => a.leg - b.leg);
}

export function gradeCounts(trophies, earned) {
  const out = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    if (!out[t.grade]) out[t.grade] = [0, 0];
    out[t.grade][1] += 1;
    if (earned.has(t.id)) out[t.grade][0] += 1;
  }
  return out;
}

export function missableOpen(trophies, earned) {
  return trophies.filter((t) => t.missable && !earned.has(t.id)).sort((a, b) => (a.leg - b.leg) || (a.id - b.id));
}

export function nextTonight(trophies, earned) {
  const ordered = routeOrder(trophies);
  const picks = [];
  for (const t of ordered) {
    if (picks.length >= 3) break;
    if (!earned.has(t.id)) picks.push(t);
  }
  return picks;
}

export function tonightReason(trophy, legs) {
  const leg = legs.find((l) => l.id === trophy.leg);
  if (trophy.leg === 1) return 'Story first: this mission trophy can be missed, and the story will not wait.';
  if (trophy.missable) return 'Missable — earn it now, before its moment passes.';
  if (leg) return 'Earliest unfinished leg (' + leg.name + '): the route says do this one next.';
  return 'Next on the route.';
}

export function isStoryKind(trophy) {
  return trophy.kind === 'story';
}

export function displayName(trophy, earned, spoilerOn) {
  if (spoilerOn && isStoryKind(trophy) && !earned.has(trophy.id)) return HIDDEN_NAME;
  return trophy.name;
}

export function displayDescription(trophy, earned, spoilerOn) {
  if (spoilerOn && isStoryKind(trophy) && !earned.has(trophy.id)) return HIDDEN_DESC;
  return trophy.description;
}

// Filter kinds the checklist offers. "online" honestly matches nothing:
// the official list holds no online trophy.
export function filterTrophies(trophies, earned, opts) {
  const q = (opts.search || '').trim().toLowerCase();
  return trophies.filter((t) => {
    if (opts.leg && t.leg !== opts.leg) return false;
    if (opts.grade && t.grade !== opts.grade) return false;
    if (opts.kind === 'story' && t.kind !== 'story') return false;
    if (opts.kind === 'missable' && !t.missable) return false;
    if (opts.kind === 'collectibles' && t.kind !== 'collectibles') return false;
    if (opts.kind === 'activities' && !['activities', 'playground', 'grind'].includes(t.kind)) return false;
    if (opts.kind === 'online' && t.kind !== 'online') return false;
    if (opts.missableOnly && !t.missable) return false;
    if (opts.hideEarned && earned.has(t.id)) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (a.leg - b.leg) || (a.id - b.id));
}

export function earnedFromSeed(trophies, count) {
  const set = new Set();
  for (const t of routeOrder(trophies).slice(0, count)) set.add(t.id);
  return set;
}

export function validateImport(payload, trophies) {
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'Not a JSON object.' };
  const ids = payload.earned || payload.trophies || payload.ids;
  if (!Array.isArray(ids)) return { ok: false, error: 'No earned list found (expected an "earned" array of trophy ids).' };
  const known = new Set(trophies.map((t) => t.id));
  const earned = new Set();
  for (const raw of ids) {
    const id = Number(raw);
    if (Number.isInteger(id) && known.has(id)) earned.add(id);
  }
  return { ok: true, earned };
}
