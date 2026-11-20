// Vice Route — view renderers. Pure functions: each takes the app state and
// returns an HTML string. app.js owns events, storage and navigation.
import { LEGS, legProgress, currentLeg, tonightPicks, dontMiss } from "./route.js";

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function gradeChip(grade) {
  return `<span class="chip grade-${grade}">${esc(grade)}</span>`;
}

export function progressBar(done, total) {
  const pct = total ? Math.round((100 * done) / total) : 0;
  return `<div class="bar" role="progressbar" aria-valuenow="${done}" aria-valuemax="${total}" aria-label="${done} of ${total} earned"><span style="width:${pct}%"></span></div><span class="bar-num">${done}/${total} · ${pct}%</span>`;
}

// A trophy's visible name/description under the spoiler setting.
export function visibleTrophy(trophy, earned, spoiler) {
  const isEarned = earned.has(trophy.id);
  const hidden = spoiler && trophy.kind === "story" && !isEarned;
  return {
    isEarned,
    hidden,
    name: hidden ? "??? — story trophy" : trophy.name,
    description: hidden ? "Hidden until earned — turn the spoiler setting off to peek, or earn it in the game." : trophy.description,
  };
}

// Split a guide into its labelled parts for display. Guides are written as
// "Do: … Where & how: … Missable? … Source: …" in one string; split on the
// labels themselves so the parts render under their own headings.
export function guideParts(guide) {
  const text = String(guide);
  const cut = (from, to) => {
    const start = text.indexOf(from);
    if (start === -1) return "";
    const body = start + from.length;
    const end = to ? text.indexOf(to, body) : text.length;
    return text.slice(body, end === -1 ? text.length : end).trim().replace(/\.$/, "");
  };
  const parts = {
    do: cut("Do: ", "Where & how: "),
    where: cut("Where & how: ", "Missable? "),
    missable: cut("Missable? ", "Source: "),
    source: cut("Source: ", null),
  };
  if (!parts.do && !parts.where) { parts.do = text; }
  return parts;
}

export function trophyCard(trophy, state, opts = {}) {
  const v = visibleTrophy(trophy, state.earned, state.spoiler);
  const open = state.openId === trophy.id || opts.forceOpen;
  const parts = guideParts(trophy.guide);
  const leg = LEGS.find((l) => l.id === trophy.leg);
  return `<article class="card${v.isEarned ? " earned" : ""}" data-id="${trophy.id}">
    <div class="card-top">
      <label class="check"><input type="checkbox" data-earn="${trophy.id}" ${v.isEarned ? "checked" : ""} aria-label="Mark ${esc(v.name)} earned"> <span class="box" aria-hidden="true">${v.isEarned ? "✓" : ""}</span></label>
      <div class="card-main">
        <h3>${esc(v.name)}</h3>
        <p class="desc">${esc(v.description)}</p>
        <p class="meta">${gradeChip(trophy.grade)} <span class="leg-tag">${esc(leg ? leg.id + " · " + leg.title : trophy.leg)}</span> <span class="kind-tag">${esc(trophy.kind)}</span>${trophy.missable ? ' <span class="miss-tag">⚠ MISSABLE</span>' : ""}</p>
      </div>
      <button class="guide-btn" data-guide="${trophy.id}" aria-expanded="${open}">${open ? "Hide guide ▲" : "Guide ▼"}</button>
    </div>
    ${open ? (v.hidden
      ? `<div class="guide"><p class="guide-hidden">Guide hidden — this is a story trophy. Earn it in the game (or turn the spoiler setting off) to reveal its guide.</p></div>`
      : `<div class="guide">
        <p><strong>Do:</strong> ${esc(parts.do)}</p>
        <p><strong>Where &amp; how:</strong> ${esc(parts.where)}</p>
        <p><strong>Missable?</strong> ${esc(parts.missable)}</p>
        <p class="source"><strong>Source:</strong> ${esc(parts.source)}</p>
      </div>`) : ""}
  </article>`;
}

export function headerNav(state) {
  const tabs = [
    ["route", "Route"],
    ["checklist", "Checklist"],
    ["session", "Tonight"],
    ["settings", "Settings"],
  ];
  return `<header class="mast">
    <div class="mast-in">
      <div class="brand"><span class="brand-mark">VR</span><div><h1>VICE ROUTE</h1><p>GTA 6 Platinum Planner · 55 trophies · offline</p></div></div>
      <nav class="tabs" aria-label="Views">${tabs.map(([v, label]) => `<a class="tab${state.view === v || (v === "route" && state.view === "leg") ? " active" : ""}" href="?view=${v}${state.seed != null ? "&amp;seed=" + state.seed : ""}">${label}</a>`).join("")}</nav>
    </div>
  </header>`;
}

export function progressSummary(state) {
  const total = state.trophies.length;
  const done = state.earned.size;
  const byGrade = {};
  for (const t of state.trophies) {
    byGrade[t.grade] = byGrade[t.grade] || { done: 0, total: 0 };
    byGrade[t.grade].total += 1;
    if (state.earned.has(t.id)) byGrade[t.grade].done += 1;
  }
  return `<section class="summary">
    <div class="sum-big"><span class="sum-num">${done}<small>/${total}</small></span><span class="sum-label">trophies earned</span>${progressBar(done, total)}</div>
    <div class="sum-grades">${["platinum", "gold", "silver", "bronze"].map((g) => `<span class="gcount">${gradeChip(g)} <b>${byGrade[g] ? byGrade[g].done : 0}/${byGrade[g] ? byGrade[g].total : 0}</b></span>`).join("")}</div>
    <p class="sum-note">Progress saves in this browser (localStorage). Export it from Settings — never lose a night's work.</p>
  </section>`;
}

export function tonightBlock(state) {
  const picks = tonightPicks(state.byId, state.earned);
  if (!picks.length) return `<section class="tonight"><h2>★ Tonight — platinum earned</h2><p>Every trophy is ticked. Vice Got a Price! is yours.</p></section>`;
  return `<section class="tonight"><h2>★ Tonight — your next 3</h2>
    <p class="tonight-sub">From the earliest unfinished leg, in earn order.</p>
    <ol class="tonight-list">${picks.map(({ trophy, reason }, i) => {
      const v = visibleTrophy(trophy, state.earned, state.spoiler);
      return `<li><span class="tonight-n">${i + 1}</span><div><strong>${esc(v.name)}</strong> ${gradeChip(trophy.grade)}<p>${esc(reason)}</p></div><a class="mini-btn" href="?view=leg&amp;leg=${trophy.leg}${state.seed != null ? "&amp;seed=" + state.seed : ""}&amp;open=${trophy.id}">Open guide →</a></li>`;
    }).join("")}</ol>
    <p><a class="mini-btn" href="?view=session${state.seed != null ? "&amp;seed=" + state.seed : ""}">Full Tonight session →</a></p>
  </section>`;
}

export function dontMissStrip(state) {
  const list = dontMiss(state.byId, state.earned);
  if (!list.length) return `<section class="dontmiss done"><h2>⚠ Don't miss — all clear</h2><p>Every missable story trophy is earned.</p></section>`;
  return `<section class="dontmiss"><h2>⚠ Don't miss — ${list.length} story trophies still open</h2>
    <p>Story missions are one pass. Earn these before their phase ends — replay from mission select if the game offers one.</p>
    <ul>${list.map((t) => `<li>${esc(t.name)} <span class="miss-tag">MISSABLE</span></li>`).join("")}</ul>
  </section>`;
}

export function routeView(state) {
  const cur = currentLeg(state.earned);
  return `<main class="view route">
    ${progressSummary(state)}
    ${tonightBlock(state)}
    ${dontMissStrip(state)}
    <section class="legs"><h2>The route — 7 legs to the platinum</h2>
    ${LEGS.map((leg) => {
      const p = legProgress(leg, state.earned);
      const isCur = cur && cur.id === leg.id;
      return `<a class="leg${isCur ? " current" : ""}${p.done === p.total ? " done" : ""}" href="?view=leg&amp;leg=${leg.id}${state.seed != null ? "&amp;seed=" + state.seed : ""}">
        <span class="leg-n">LEG ${leg.n}${isCur ? " · YOU ARE HERE" : ""}${p.done === p.total ? " · DONE" : ""}</span>
        <h3>${esc(leg.title)}</h3><p>${esc(leg.tag)}</p>
        ${progressBar(p.done, p.total)}
      </a>`;
    }).join("")}
    </section>
    <p class="foot">Sources: Exophase / PSNProfiles — official trophy list. Guides are written fresh for this entry from the official descriptions; where a step is not certain we say so in the guide.</p>
  </main>`;
}

export function legView(state) {
  const leg = LEGS.find((l) => l.id === state.leg) || LEGS[0];
  const p = legProgress(leg, state.earned);
  const trophies = leg.ids.map((id) => state.byId.get(id)).filter(Boolean);
  return `<main class="view legview">
    <p class="crumb"><a href="?view=route${state.seed != null ? "&amp;seed=" + state.seed : ""}">← Route</a> · Leg ${leg.n} of 7</p>
    <section class="leg-head"><h2>LEG ${leg.n} — ${esc(leg.title)}</h2><p>${esc(leg.tag)}</p>${progressBar(p.done, p.total)}
    <p class="warn">⚠ ${esc(leg.warn)}</p></section>
    <section class="leg-list"><h3>Trophies in earn order — ${p.done}/${p.total} earned</h3>
    ${trophies.map((t) => trophyCard(t, state)).join("")}
    </section>
  </main>`;
}

export function checklistView(state) {
  const f = state.filters;
  const q = (f.q || "").toLowerCase();
  let list = state.trophies.filter((t) => {
    if (f.leg !== "all" && t.leg !== f.leg) return false;
    if (f.grade !== "all" && t.grade !== f.grade) return false;
    if (f.kind !== "all" && t.kind !== f.kind) return false;
    if (f.missableOnly && !t.missable) return false;
    if (f.hideEarned && state.earned.has(t.id)) return false;
    if (q) {
      const v = visibleTrophy(t, state.earned, state.spoiler);
      if (!(`${v.name} ${t.description} ${t.guide}`.toLowerCase().includes(q))) return false;
    }
    return true;
  });
  const shown = list.filter((t) => state.earned.has(t.id)).length;
  const chip = (label, active, attrs) => `<button class="fchip${active ? " on" : ""}" ${attrs}>${label}</button>`;
  return `<main class="view checklist">
    <section class="filters">
      <h2>Checklist — ${list.length} shown · ${shown} earned</h2>
      <input id="search" type="search" placeholder="Search a trophy or guide…" value="${esc(f.q || "")}" aria-label="Search trophies">
      <div class="frow"><span class="flabel">Leg</span>${["all", ...LEGS.map((l) => l.id)].map((id) => chip(id === "all" ? "All legs" : id, f.leg === id, `data-f-leg="${id}"`)).join("")}</div>
      <div class="frow"><span class="flabel">Grade</span>${["all", "platinum", "gold", "silver", "bronze"].map((g) => chip(g === "all" ? "All grades" : g, f.grade === g, `data-f-grade="${g}"`)).join("")}</div>
      <div class="frow"><span class="flabel">Kind</span>${["all", "story", "missable", "strangers", "activities", "collectibles", "open-world", "grind"].map((k) => chip(k === "all" ? "All kinds" : k === "missable" ? "Missable" : k, (k === "missable" ? f.missableOnly : f.kind === k) && !(k === "missable" && f.kind !== "all"), `data-f-kind="${k}"`)).join("")}</div>
      <div class="frow"><label class="toggle"><input type="checkbox" id="hide-earned" ${f.hideEarned ? "checked" : ""}> Hide earned</label>
      <label class="toggle"><input type="checkbox" id="spoiler-toggle" ${state.spoiler ? "checked" : ""}> Spoiler: hide story trophies until earned</label></div>
    </section>
    <section class="check-list">
      ${list.length ? list.map((t) => trophyCard(t, state)).join("") : `<p class="empty">No trophies match these filters. Try clearing the search or a filter.</p>`}
    </section>
  </main>`;
}

export function sessionView(state) {
  const picks = tonightPicks(state.byId, state.earned);
  const cur = currentLeg(state.earned);
  return `<main class="view session">
    <section class="session-head"><h2>★ Tonight's session</h2>
    <p>${cur ? `You are on <strong>Leg ${cur.n} — ${esc(cur.title)}</strong>. These are the next 3 trophies on the route, in earn order.` : "Every leg is done — the platinum is yours."}</p></section>
    ${picks.length ? picks.map(({ trophy, reason }, i) => {
      const v = visibleTrophy(trophy, state.earned, state.spoiler);
      const parts = guideParts(trophy.guide);
      const leg = LEGS.find((l) => l.id === trophy.leg);
      return `<article class="session-card">
        <span class="tonight-n big">${i + 1}</span>
        <div><h3>${esc(v.name)}</h3>
        <p class="meta">${gradeChip(trophy.grade)} <span class="leg-tag">${esc(leg ? "Leg " + leg.n + " · " + leg.title : trophy.leg)}</span>${trophy.missable ? ' <span class="miss-tag">⚠ MISSABLE</span>' : ""}</p>
        <p class="desc">${esc(v.description)}</p>
        <p><strong>Why tonight:</strong> ${esc(reason)}</p>
        ${v.hidden ? `<p class="guide-hidden">Guide hidden until earned (spoiler setting is on).</p>` : `<div class="guide"><p><strong>Do:</strong> ${esc(parts.do)}</p><p><strong>Where &amp; how:</strong> ${esc(parts.where)}</p><p><strong>Missable?</strong> ${esc(parts.missable)}</p><p class="source"><strong>Source:</strong> ${esc(parts.source)}</p></div>`}
        <label class="check big-check"><input type="checkbox" data-earn="${trophy.id}" ${state.earned.has(trophy.id) ? "checked" : ""}> Mark earned</label></div>
      </article>`;
    }).join("") : `<p class="empty">Nothing left — platinum earned.</p>`}
    <p><a class="mini-btn" href="?view=route${state.seed != null ? "&amp;seed=" + state.seed : ""}">← Back to the route</a></p>
  </main>`;
}

export function settingsView(state) {
  return `<main class="view settings">
    <section class="set-card"><h2>Settings</h2>
      <label class="toggle big"><input type="checkbox" id="spoiler-toggle" ${state.spoiler ? "checked" : ""}> <span><strong>Spoiler guard</strong><br>Hide the names and descriptions of story trophies until you earn them.</span></label>
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
