// Vice Route — view renderers. Pure functions: each takes the app state and
// returns an HTML string. app.js owns events, storage and navigation.
import { LEGS, legStats, nextLeg, planTonight, stillMissable } from "./route.js";

export function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function gradeBadge(grade) {
  return `<span class="badge grade-${grade}">${escHtml(grade)}</span>`;
}

export function bar(done, total) {
  const pct = total ? Math.round((100 * done) / total) : 0;
  return `<div class="meter" role="progressbar" aria-valuenow="${done}" aria-valuemax="${total}" aria-label="${done} of ${total} earned"><span style="width:${pct}%"></span></div><span class="meter-num">${done}/${total} · ${pct}%</span>`;
}

// What a trophy shows under the spoiler setting: story trophies stay
// masked until they are earned.
export function trophyVisibility(trophy, earned, spoiler) {
  const isEarned = earned.has(trophy.id);
  const masked = spoiler && trophy.kind === "story" && !isEarned;
  return {
    isEarned,
    masked,
    name: masked ? "??? — story trophy" : trophy.name,
    description: masked ? "Hidden until earned — turn the spoiler setting off to peek, or earn it in the game." : trophy.description,
  };
}

// Split a guide into its labelled parts for display. Guides are written as
// "Goal: … Approach: … Missable: … Sources: …" in one string; split on the
// labels themselves so each part renders under its own heading.
export function splitGuide(guide) {
  const text = String(guide);
  const slice = (from, to) => {
    const start = text.indexOf(from);
    if (start === -1) return "";
    const body = start + from.length;
    const end = to ? text.indexOf(to, body) : text.length;
    return text.slice(body, end === -1 ? text.length : end).trim().replace(/\.$/, "");
  };
  const parts = {
    goal: slice("Goal: ", "Approach: "),
    approach: slice("Approach: ", "Missable: "),
    missable: slice("Missable: ", "Sources: "),
    sources: slice("Sources: ", null),
  };
  if (!parts.goal && !parts.approach) parts.goal = text;
  return parts;
}

export function trophyCard(trophy, state, opts = {}) {
  const v = trophyVisibility(trophy, state.earned, state.spoiler);
  const open = state.openId === trophy.id || opts.forceOpen;
  const parts = splitGuide(trophy.guide);
  const leg = LEGS.find((l) => l.id === trophy.leg);
  return `<article class="trophy${v.isEarned ? " earned" : ""}" data-id="${trophy.id}">
    <div class="trophy-top">
      <label class="tick"><input type="checkbox" data-earn="${trophy.id}" ${v.isEarned ? "checked" : ""} aria-label="Mark ${escHtml(v.name)} earned"> <span class="tick-box" aria-hidden="true">${v.isEarned ? "✓" : ""}</span></label>
      <div class="trophy-main">
        <h3>${escHtml(v.name)}</h3>
        <p class="trophy-desc">${escHtml(v.description)}</p>
        <p class="trophy-meta">${gradeBadge(trophy.grade)} <span class="leg-pill">${escHtml(leg ? leg.id + " · " + leg.title : trophy.leg)}</span> <span class="kind-pill">${escHtml(trophy.kind)}</span>${trophy.missable ? ' <span class="miss-pill">⚠ MISSABLE</span>' : ""}</p>
      </div>
      <button class="guide-toggle" data-guide="${trophy.id}" aria-expanded="${open}">${open ? "Hide guide ▲" : "Guide ▼"}</button>
    </div>
    ${open ? (v.masked
      ? `<div class="guide-body"><p class="guide-masked">Guide hidden — this is a story trophy. Earn it in the game (or turn the spoiler setting off) to reveal its guide.</p></div>`
      : `<div class="guide-body">
        <p><strong>Goal:</strong> ${escHtml(parts.goal)}</p>
        <p><strong>Approach:</strong> ${escHtml(parts.approach)}</p>
        <p><strong>Missable:</strong> ${escHtml(parts.missable)}</p>
        <p class="guide-src"><strong>Sources:</strong> ${escHtml(parts.sources)}</p>
      </div>`) : ""}
  </article>`;
}

export function masthead(state) {
  const tabs = [
    ["route", "Route"],
    ["checklist", "Checklist"],
    ["session", "Tonight"],
    ["settings", "Settings"],
  ];
  const seedQ = state.seed != null ? `&amp;seed=${state.seed}` : "";
  return `<header class="mast">
    <div class="mast-in">
      <div class="brand"><span class="brand-mark">VR</span><div><h1>VICE ROUTE</h1><p>GTA 6 Platinum Planner · 55 trophies · offline</p></div></div>
      <nav class="tabs" aria-label="Views">${tabs.map(([v, label]) => `<a class="tab${state.view === v || (v === "route" && state.view === "leg") ? " active" : ""}" href="?view=${v}${seedQ}">${label}</a>`).join("")}</nav>
    </div>
  </header>`;
}

export function summaryPanel(state) {
  const total = state.trophies.length;
  const done = state.earned.size;
  const byGrade = {};
  for (const t of state.trophies) {
    byGrade[t.grade] = byGrade[t.grade] || { done: 0, total: 0 };
    byGrade[t.grade].total += 1;
    if (state.earned.has(t.id)) byGrade[t.grade].done += 1;
  }
  return `<section class="summary">
    <div class="summary-big"><span class="summary-num">${done}<small>/${total}</small></span><span class="summary-label">trophies earned</span>${bar(done, total)}</div>
    <div class="summary-grades">${["platinum", "gold", "silver", "bronze"].map((g) => `<span class="grade-count">${gradeBadge(g)} <b>${byGrade[g] ? byGrade[g].done : 0}/${byGrade[g] ? byGrade[g].total : 0}</b></span>`).join("")}</div>
    <p class="summary-note">Progress saves in this browser (localStorage). Export it from Settings — never lose a night's work.</p>
  </section>`;
}

export function tonightPanel(state) {
  const picks = planTonight(state.byId, state.earned);
  if (!picks.length) return `<section class="tonight"><h2>★ Tonight — platinum earned</h2><p>Every trophy is ticked. Vice Got a Price! is yours.</p></section>`;
  const seedQ = state.seed != null ? `&amp;seed=${state.seed}` : "";
  return `<section class="tonight"><h2>★ Tonight — your next 3</h2>
    <p class="tonight-sub">From the earliest unfinished leg, in earn order.</p>
    <ol class="tonight-list">${picks.map(({ trophy, reason }, i) => {
      const v = trophyVisibility(trophy, state.earned, state.spoiler);
      return `<li><span class="tonight-n">${i + 1}</span><div><strong>${escHtml(v.name)}</strong> ${gradeBadge(trophy.grade)}<p>${escHtml(reason)}</p></div><a class="mini-link" href="?view=leg&amp;leg=${trophy.leg}${seedQ}&amp;open=${trophy.id}">Open guide →</a></li>`;
    }).join("")}</ol>
    <p><a class="mini-link" href="?view=session${seedQ}">Full Tonight session →</a></p>
  </section>`;
}

export function missStrip(state) {
  const list = stillMissable(state.byId, state.earned);
  if (!list.length) return `<section class="dontmiss all-clear"><h2>⚠ Don't miss — all clear</h2><p>Every missable story trophy is earned.</p></section>`;
  return `<section class="dontmiss"><h2>⚠ Don't miss — ${list.length} story trophies still open</h2>
    <p>Story missions are one pass. Earn these before their phase ends — replay from mission select if the game offers one.</p>
    <ul>${list.map((t) => `<li>${escHtml(t.name)} <span class="miss-pill">MISSABLE</span></li>`).join("")}</ul>
  </section>`;
}

export function routePage(state) {
  const cur = nextLeg(state.earned);
  const seedQ = state.seed != null ? `&amp;seed=${state.seed}` : "";
  return `<main class="page route-page">
    ${summaryPanel(state)}
    ${tonightPanel(state)}
    ${missStrip(state)}
    <section class="legs"><h2>The route — 7 legs to the platinum</h2>
    ${LEGS.map((leg) => {
      const p = legStats(leg, state.earned);
      const isCur = cur && cur.id === leg.id;
      return `<a class="leg-card${isCur ? " current" : ""}${p.done === p.total ? " finished" : ""}" href="?view=leg&amp;leg=${leg.id}${seedQ}">
        <span class="leg-no">LEG ${leg.n}${isCur ? " · YOU ARE HERE" : ""}${p.done === p.total ? " · DONE" : ""}</span>
        <h3>${escHtml(leg.title)}</h3><p>${escHtml(leg.tag)}</p>
        ${bar(p.done, p.total)}
      </a>`;
    }).join("")}
    </section>
    <p class="foot">Sources: Exophase / PSNProfiles — official trophy list. Guides are written fresh for this entry from the official descriptions; where a step is not certain we say so in the guide.</p>
  </main>`;
}

export function legPage(state) {
  const leg = LEGS.find((l) => l.id === state.leg) || LEGS[0];
  const p = legStats(leg, state.earned);
  const trophies = leg.ids.map((id) => state.byId.get(id)).filter(Boolean);
  const seedQ = state.seed != null ? `&amp;seed=${state.seed}` : "";
  return `<main class="page leg-page">
    <p class="crumb"><a href="?view=route${seedQ}">← Route</a> · Leg ${leg.n} of 7</p>
    <section class="leg-head"><h2>LEG ${leg.n} — ${escHtml(leg.title)}</h2><p>${escHtml(leg.tag)}</p>${bar(p.done, p.total)}
    <p class="warn">⚠ ${escHtml(leg.warn)}</p></section>
    <section class="leg-list"><h3>Trophies in earn order — ${p.done}/${p.total} earned</h3>
    ${trophies.map((t) => trophyCard(t, state)).join("")}
    </section>
  </main>`;
}

export function checklistPage(state) {
  const f = state.filters;
  const q = (f.q || "").toLowerCase();
  const list = state.trophies.filter((t) => {
    if (f.leg !== "all" && t.leg !== f.leg) return false;
    if (f.grade !== "all" && t.grade !== f.grade) return false;
    if (f.kind === "online") return false;
    if (f.kind !== "all" && t.kind !== f.kind) return false;
    if (f.missableOnly && !t.missable) return false;
    if (f.hideEarned && state.earned.has(t.id)) return false;
    if (q) {
      const v = trophyVisibility(t, state.earned, state.spoiler);
      if (!(`${v.name} ${t.description} ${t.guide}`.toLowerCase().includes(q))) return false;
    }
    return true;
  });
  const shownEarned = list.filter((t) => state.earned.has(t.id)).length;
  const chip = (label, active, attrs) => `<button class="fchip${active ? " on" : ""}" ${attrs}>${label}</button>`;
  const kindCounts = {};
  for (const t of state.trophies) kindCounts[t.kind] = (kindCounts[t.kind] || 0) + 1;
  const kindLabel = (k) => k === "all" ? "All kinds" : k === "missable" ? "Missable" : `${k} (${kindCounts[k] || 0})`;
  return `<main class="page checklist-page">
    <section class="filters">
      <h2>Checklist — ${list.length} shown · ${shownEarned} earned</h2>
      <input id="search" type="search" placeholder="Search a trophy or guide…" value="${escHtml(f.q || "")}" aria-label="Search trophies">
      <div class="frow"><span class="flabel">Leg</span>${["all", ...LEGS.map((l) => l.id)].map((id) => chip(id === "all" ? "All legs" : id, f.leg === id, `data-f-leg="${id}"`)).join("")}</div>
      <div class="frow"><span class="flabel">Grade</span>${["all", "platinum", "gold", "silver", "bronze"].map((g) => chip(g === "all" ? "All grades" : g, f.grade === g, `data-f-grade="${g}"`)).join("")}</div>
      <div class="frow"><span class="flabel">Kind</span>${["all", "story", "missable", "strangers", "activities", "collectibles", "open-world", "grind", "online"].map((k) => chip(kindLabel(k), k === "missable" ? f.missableOnly : f.kind === k, `data-f-kind="${k}"`)).join("")}</div>
      <div class="frow"><label class="switch"><input type="checkbox" id="hide-earned" ${f.hideEarned ? "checked" : ""}> Hide earned</label>
      <label class="switch"><input type="checkbox" id="spoiler-toggle" ${state.spoiler ? "checked" : ""}> Spoiler: hide story trophies until earned</label></div>
    </section>
    <section class="check-list">
      ${list.length ? list.map((t) => trophyCard(t, state)).join("") : `<p class="empty">${f.kind === "online" ? "No online trophies: the official list of 55 holds no online trophy, so this filter is honestly empty." : "No trophies match these filters. Try clearing the search or a filter."}</p>`}
    </section>
  </main>`;
}

export function tonightPage(state) {
  const picks = planTonight(state.byId, state.earned);
  const cur = nextLeg(state.earned);
  const seedQ = state.seed != null ? `&amp;seed=${state.seed}` : "";
  return `<main class="page tonight-page">
    <section class="tonight-head"><h2>★ Tonight's session</h2>
    <p>${cur ? `You are on <strong>Leg ${cur.n} — ${escHtml(cur.title)}</strong>. These are the next 3 trophies on the route, in earn order.` : "Every leg is done — the platinum is yours."}</p></section>
    ${picks.length ? picks.map(({ trophy, reason }, i) => {
      const v = trophyVisibility(trophy, state.earned, state.spoiler);
      const parts = splitGuide(trophy.guide);
      const leg = LEGS.find((l) => l.id === trophy.leg);
      return `<article class="tonight-card">
        <span class="tonight-n big">${i + 1}</span>
        <div><h3>${escHtml(v.name)}</h3>
        <p class="trophy-meta">${gradeBadge(trophy.grade)} <span class="leg-pill">${escHtml(leg ? "Leg " + leg.n + " · " + leg.title : trophy.leg)}</span>${trophy.missable ? ' <span class="miss-pill">⚠ MISSABLE</span>' : ""}</p>
        <p class="trophy-desc">${escHtml(v.description)}</p>
        <p><strong>Why tonight:</strong> ${escHtml(reason)}</p>
        ${v.masked ? `<p class="guide-masked">Guide hidden until earned (spoiler setting is on).</p>` : `<div class="guide-body"><p><strong>Goal:</strong> ${escHtml(parts.goal)}</p><p><strong>Approach:</strong> ${escHtml(parts.approach)}</p><p><strong>Missable:</strong> ${escHtml(parts.missable)}</p><p class="guide-src"><strong>Sources:</strong> ${escHtml(parts.sources)}</p></div>`}
        <label class="tick big-tick"><input type="checkbox" data-earn="${trophy.id}" ${state.earned.has(trophy.id) ? "checked" : ""}> Mark earned</label></div>
      </article>`;
    }).join("") : `<p class="empty">Nothing left — platinum earned.</p>`}
    <p><a class="mini-link" href="?view=route${seedQ}">← Back to the route</a></p>
  </main>`;
}

export function settingsPage(state) {
  return `<main class="page settings-page">
    <section class="set-card"><h2>Settings</h2>
      <label class="switch big"><input type="checkbox" id="spoiler-toggle" ${state.spoiler ? "checked" : ""}> <span><strong>Spoiler guard</strong><br>Hide the names and descriptions of story trophies until you earn them.</span></label>
      <p class="set-note">Current progress: <strong>${state.earned.size} / ${state.trophies.length}</strong> trophies earned. Saved in this browser (localStorage) — nothing leaves your device.</p>
      <div class="set-btns">
        <button class="btn" id="export-btn">Export progress (JSON)</button>
        <label class="btn file-btn">Import progress<input type="file" id="import-file" accept="application/json,.json" hidden></label>
        <button class="btn danger" id="reset-btn">Reset progress</button>
      </div>
      <p id="import-msg" class="set-note" aria-live="polite"></p>
      <h3>About this guide</h3>
      <p>Vice Route is a route planner, not a checklist by kind: 7 legs in earn order, from the story to the platinum. All 55 trophy names, descriptions and grades are the official PlayStation list as Exophase and PSNProfiles publish it. Every guide is written fresh for this entry from the official descriptions and cites its source; where a location or step is not certain, the guide says so instead of inventing one. No Rockstar logo or artwork, no network requests — the whole guide runs offline from its own files.</p>
    </section>
  </main>`;
}
