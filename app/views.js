// Vice Route — views: HTML strings for each screen, no DOM writes here.
// Every trophy's guide is shown with its sources beside it.

import {
  displayDescription,
  displayName,
  gradeCounts,
  legProgress,
  missableOpen,
  nextTonight,
  tonightReason,
} from './route.js';

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function gradeDot(grade) {
  return '<span class="dot ' + escapeHtml(grade) + '"></span>' + escapeHtml(grade);
}

export function progressBar(done, total) {
  const pct = total ? Math.round((100 * done) / total) : 0;
  return '<div class="bar"><span style="width:' + pct + '%"></span></div><p class="note">' + done + ' of ' + total + ' earned (' + pct + '%)</p>';
}

export function countsBlock(trophies, earned) {
  const counts = gradeCounts(trophies, earned);
  const order = ['platinum', 'gold', 'silver', 'bronze'];
  const cells = order.map((g) => '<span>' + gradeDot(g) + ' <b>' + counts[g][0] + '/' + counts[g][1] + '</b></span>').join('');
  return '<div class="counts">' + cells + '<span>Total <b>' + earned.size + '/55</b></span></div>';
}

export function guideBlock(trophy, earned, spoilerOn) {
  const hidden = spoilerOn && trophy.kind === 'story' && !earned.has(trophy.id);
  if (hidden) {
    return '<div class="guide"><p>Guide hidden — the spoiler guard hides story trophies until they are earned.</p><p class="src">Sources: ' + escapeHtml(trophy.sources.join('; ')) + '</p></div>';
  }
  const srcs = (trophy.sources || []).map((s) => escapeHtml(s)).join('; ');
  return '<div class="guide"><p>' + escapeHtml(trophy.guide) + '</p><p class="src">Sources: ' + srcs + '</p></div>';
}

export function trophyRow(trophy, earned, spoilerOn, openId) {
  const done = earned.has(trophy.id);
  const miss = trophy.missable ? ' <span class="pill miss">Missable</span>' : '';
  const check = '<input type="checkbox" data-earn="' + trophy.id + '"' + (done ? ' checked' : '') + ' aria-label="Earned: ' + escapeHtml(displayName(trophy, earned, spoilerOn)) + '">';
  const name = escapeHtml(displayName(trophy, earned, spoilerOn));
  const desc = escapeHtml(displayDescription(trophy, earned, spoilerOn));
  const guide = openId === trophy.id ? guideBlock(trophy, earned, spoilerOn) : '';
  const toggle = '<button data-guide="' + trophy.id + '">' + (openId === trophy.id ? 'Hide guide' : 'Guide') + '</button>';
  return '<tr class="' + (done ? 'earned' : '') + '"><td>' + check + '</td><td class="name">' + name + miss + '<br><span style="font-weight:400;color:var(--muted);font-size:13.5px">' + desc + '</span>' + guide + '</td><td>' + gradeDot(trophy.grade) + '</td><td>' + toggle + '</td></tr>';
}

export function trophyTable(trophies, earned, spoilerOn, openId) {
  if (!trophies.length) return '';
  const rows = trophies.map((t) => trophyRow(t, earned, spoilerOn, openId)).join('');
  return '<table class="list"><thead><tr><th>Earned</th><th>Trophy</th><th>Grade</th><th>Guide</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

export function renderRoute(data, state) {
  const { trophies, legs } = data;
  const { earned, spoilerOn } = state;
  const legsDone = legProgress(trophies, earned);
  const miss = missableOpen(trophies, earned);
  const tonight = nextTonight(trophies, earned);
  let html = '<h2>The Route to the Platinum</h2>';
  html += '<p>Seven legs in the order you should earn them. Leg 1 is all missable story trophies — finish each leg before its phase ends.</p>';
  html += '<div class="card">' + countsBlock(trophies, earned) + progressBar(earned.size, 55) + '</div>';
  if (miss.length) {
    const names = miss.slice(0, 6).map((t) => escapeHtml(displayName(t, earned, spoilerOn))).join(', ');
    html += '<div class="miss-strip"><h3>Don\'t miss — ' + miss.length + ' missable ' + (miss.length === 1 ? 'trophy' : 'trophies') + ' still open</h3><p>' + names + (miss.length > 6 ? ' and ' + (miss.length - 6) + ' more' : '') + '. See the checklist, filtered to Missable, for the full list.</p><p class="note">Spoiler guard is ' + (spoilerOn ? 'ON — story names stay hidden until earned' : 'OFF') + '.</p></div>';
  } else {
    html += '<div class="card"><h3>No missable trophies left open</h3><p>Every missable trophy is earned. The rest of the route cannot be missed.</p></div>';
  }
  html += '<div class="card"><h3>Tonight — your next session</h3>';
  if (tonight.length) {
    html += tonight.map((t, i) => '<p><span class="tonight-num">' + (i + 1) + '</span><b>' + escapeHtml(displayName(t, earned, spoilerOn)) + '</b> — ' + escapeHtml(tonightReason(t, legs)) + '</p>').join('');
    html += '<p><a href="#/tonight">Open the Tonight planner →</a></p>';
  } else {
    html += '<p>Platinum earned. Vice got its price — congratulations, Leonida Legend.</p>';
  }
  html += '</div>';
  html += '<h2>Legs</h2>';
  for (const leg of legs) {
    const prog = legsDone.find((p) => p.leg === leg.id) || { earned: 0, total: 0 };
    html += '<div class="card"><div class="legrow"><h3><a href="#/leg/' + leg.id + '">Leg ' + leg.id + ' — ' + escapeHtml(leg.name) + '</a></h3><span class="pill">' + prog.earned + '/' + prog.total + '</span></div><p class="note">' + escapeHtml(leg.note) + '</p>' + progressBar(prog.earned, prog.total) + '</div>';
  }
  return html;
}

export function renderLeg(data, state, legId, openId) {
  const { trophies, legs } = data;
  const { earned, spoilerOn } = state;
  const leg = legs.find((l) => l.id === legId);
  if (!leg) return '<p class="note">No such leg.</p><p><a href="#/route">Back to the route →</a></p>';
  const items = trophies.filter((t) => t.leg === legId).sort((a, b) => a.id - b.id);
  const done = items.filter((t) => earned.has(t.id)).length;
  let html = '<p><a href="#/route">← Back to the route</a></p>';
  html += '<h2>Leg ' + leg.id + ' — ' + escapeHtml(leg.name) + '</h2>';
  html += '<p>' + escapeHtml(leg.note) + '</p>';
  html += '<div class="card">' + progressBar(done, items.length) + '</div>';
  html += '<p class="note">Trophies in earn order. Finish this leg before its phase ends — ' + (legId === 1 ? 'every trophy here is missable.' : 'then move on to the next leg.') + '</p>';
  html += trophyTable(items, earned, spoilerOn, openId);
  return html;
}

export function renderChecklist(data, state) {
  const { trophies } = data;
  const { earned, spoilerOn, filter } = state;
  const kinds = [
    ['all', 'All'],
    ['story', 'Story'],
    ['missable', 'Missable'],
    ['collectibles', 'Collectibles'],
    ['activities', 'Activities'],
    ['online', 'Online'],
  ];
  let html = '<h2>Checklist — all 55 trophies</h2>';
  html += '<p>Official names, descriptions and grades as PlayStation publishes them (Exophase / PSNProfiles). Filters: story, missable, collectibles, activities — and online, which this list honestly has none of.</p>';
  html += '<div class="card">' + countsBlock(trophies, earned) + progressBar(earned.size, 55) + '</div>';
  html += '<div class="filters">';
  for (const [key, label] of kinds) {
    html += '<button data-kind="' + key + '" class="' + (filter.kind === key ? 'on' : '') + '">' + label + '</button>';
  }
  html += '<select data-grade aria-label="Filter by grade"><option value="">All grades</option>' +
    ['platinum', 'gold', 'silver', 'bronze'].map((g) => '<option value="' + g + '"' + (filter.grade === g ? ' selected' : '') + '>' + g + '</option>').join('') + '</select>';
  html += '<select data-leg aria-label="Filter by leg"><option value="">All legs</option>' +
    [1, 2, 3, 4, 5, 6, 7].map((n) => '<option value="' + n + '"' + (filter.leg === n ? ' selected' : '') + '>Leg ' + n + '</option>').join('') + '</select>';
  html += '<input type="search" data-search placeholder="Search name or guide…" value="' + escapeHtml(filter.search || '') + '" aria-label="Search trophies">';
  html += '<label><input type="checkbox" data-missable-only' + (filter.missableOnly ? ' checked' : '') + '> Missable only</label>';
  html += '<label><input type="checkbox" data-hide-earned' + (filter.hideEarned ? ' checked' : '') + '> Hide earned</label>';
  html += '</div>';
  const shown = state.filtered;
  if (filter.kind === 'online') {
    html += '<div class="empty"><b>No online trophies.</b><br>The official 55-trophy list holds no online trophy, so this filter is honestly empty — nothing here needs a network or another player.</div>';
  } else if (!shown.length) {
    html += '<div class="empty">No trophies match these filters. Clear the search or pick another filter.</div>';
  } else {
    html += '<p class="note">Showing ' + shown.length + ' of 55 trophies.</p>';
    html += trophyTable(shown, earned, spoilerOn, state.openId);
  }
  return html;
}

export function renderTonight(data, state) {
  const { trophies, legs } = data;
  const { earned, spoilerOn } = state;
  const picks = nextTonight(trophies, earned);
  let html = '<h2>Tonight — your next session</h2>';
  html += '<p>The next 3 trophies from the earliest unfinished leg. One session, three trophies, in route order.</p>';
  if (!picks.length) {
    html += '<div class="card"><p>Platinum earned — nothing left for tonight. Vice got its price.</p></div>';
    return html;
  }
  for (const [i, t] of picks.entries()) {
    const leg = legs.find((l) => l.id === t.leg);
    html += '<div class="card"><p><span class="tonight-num">' + (i + 1) + '</span><b>' + escapeHtml(displayName(t, earned, spoilerOn)) + '</b> ' + gradeDot(t.grade) + (t.missable ? ' <span class="pill miss">Missable</span>' : '') + '</p>';
    html += '<p class="note">Leg ' + t.leg + ' — ' + escapeHtml(leg ? leg.name : '') + '</p>';
    html += '<p><b>Why tonight:</b> ' + escapeHtml(tonightReason(t, legs)) + '</p>';
    html += guideBlock(t, earned, spoilerOn);
    html += '<p><label><input type="checkbox" data-earn="' + t.id + '"' + (earned.has(t.id) ? ' checked' : '') + '> Earned</label></p></div>';
  }
  html += '<p><a href="#/checklist">Open the full checklist →</a></p>';
  return html;
}

export function renderSettings(data, state) {
  const { trophies } = data;
  const { earned, spoilerOn } = state;
  let html = '<h2>Settings</h2>';
  html += '<div class="card"><h3>Spoiler guard</h3>';
  html += '<p><label><input type="checkbox" data-spoiler' + (spoilerOn ? ' checked' : '') + '> Hide story trophy names and descriptions until they are earned</label></p>';
  html += '<p class="note">When on, story trophies you have not earned show as “Hidden story trophy”. Earned trophies always show in full. The guard covers the ' + trophies.filter((t) => t.kind === 'story').length + ' story trophies.</p></div>';
  html += '<div class="card"><h3>Your progress — export, import, reset</h3>';
  html += '<p>' + earned.size + ' of 55 trophies earned. Progress saves in this browser (localStorage) and never leaves it unless you export it.</p>';
  html += '<p><button class="primary" data-export>Export progress as JSON</button> <button data-import-pick>Import progress…</button> <input type="file" data-import-file accept=".json,application/json" hidden> <button data-reset>Reset all progress</button></p>';
  html += '<p class="note" data-import-status></p></div>';
  html += '<div class="card"><h3>About the data</h3><p class="note">Names, descriptions and grades are the official PlayStation list as Exophase and PSNProfiles publish it. Each guide is written fresh for this entry from the official description and cites its sources beside it. Where a place or step is not pinned down by the official description, the guide says so instead of inventing one. The app makes no network requests: it loads only its own files.</p></div>';
  return html;
}
