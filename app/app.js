// Vice Route — boot, progress store, export/import, spoiler setting, routing.
// The app fetches only its own data/trophies.json at run time and makes no
// other request: it works with the network off.
import { SEED_EARNED } from "./route.js";
import { masthead, routePage, legPage, checklistPage, tonightPage, settingsPage } from "./views.js";

const PROGRESS_KEY = "vice-route-v3-progress";
const SPOILER_KEY = "vice-route-v3-spoiler";

const query = new URLSearchParams(location.search);
const seedRaw = query.get("seed");
const seed = seedRaw === null ? null : (Number(seedRaw) || 0);

function readEarned() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return null;
    return new Set(ids.filter((n) => Number.isInteger(n)));
  } catch {
    return null;
  }
}

function writeEarned(earned) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  } catch { /* storage full or blocked: progress just does not persist */ }
}

function readSpoiler() {
  const q = query.get("spoiler");
  if (q === "on") return true;
  if (q === "off") return false;
  try {
    const raw = localStorage.getItem(SPOILER_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
}

function writeSpoiler(on) {
  try { localStorage.setItem(SPOILER_KEY, on ? "1" : "0"); } catch { /* ignore */ }
}

export function serializeProgress(earned) {
  return JSON.stringify({ app: "vice-route-v3", version: 1, earned: [...earned].sort((a, b) => a - b) }, null, 2);
}

export function parseProgress(text, knownIds) {
  const data = JSON.parse(text);
  const ids = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(ids)) throw new Error("not a Vice Route export");
  const out = new Set();
  for (const n of ids) {
    if (Number.isInteger(n) && knownIds.has(n)) out.add(n);
  }
  return out;
}

const state = {
  trophies: [],
  byId: new Map(),
  earned: new Set(),
  spoiler: readSpoiler(),
  view: query.get("view") || "route",
  leg: query.get("leg") || "L1",
  openId: query.get("open") ? Number(query.get("open")) : null,
  seed,
  filters: {
    q: query.get("q") || "",
    leg: query.get("fleg") || "all",
    grade: query.get("fgrade") || "all",
    kind: query.get("fkind") || "all",
    missableOnly: query.get("missable") === "1",
    hideEarned: query.get("hide") === "1",
  },
};

function render() {
  const root = document.getElementById("app");
  const head = masthead(state);
  let body = "";
  if (state.view === "leg") body = legPage(state);
  else if (state.view === "checklist") body = checklistPage(state);
  else if (state.view === "session") body = tonightPage(state);
  else if (state.view === "settings") body = settingsPage(state);
  else body = routePage(state);
  root.innerHTML = head + body;
  document.title = "Vice Route — GTA 6 Platinum Planner";
}

// Exposed for headless checks: read-only view of the live state.
window.__vice = {
  state,
  exportProgress: () => serializeProgress(state.earned),
  importProgress: (text) => parseProgress(text, state.byId),
  setEarned: (id, on) => {
    if (on) state.earned.add(id); else state.earned.delete(id);
    writeEarned(state.earned);
    render();
  },
};

async function boot() {
  const res = await fetch("data/trophies.json");
  if (!res.ok) throw new Error("trophies.json failed to load");
  const data = await res.json();
  state.trophies = data.trophies;
  state.byId = new Map(data.trophies.map((t) => [t.id, t]));
  const saved = readEarned();
  if (saved) {
    state.earned = saved;
  } else if (seed !== null) {
    // A fresh browser with ?seed=N starts from the seeded demo progress.
    state.earned = new Set(SEED_EARNED.filter((id) => state.byId.has(id)));
    writeEarned(state.earned);
  }
  if (query.get("spoiler") !== null) writeSpoiler(state.spoiler);
  render();

  document.addEventListener("click", (event) => {
    const earnBox = event.target.closest("[data-earn]");
    if (earnBox) {
      const id = Number(earnBox.dataset.earn);
      if (earnBox.checked) state.earned.add(id); else state.earned.delete(id);
      writeEarned(state.earned);
      render();
      return;
    }
    const guideBtn = event.target.closest("[data-guide]");
    if (guideBtn) {
      const id = Number(guideBtn.dataset.guide);
      state.openId = state.openId === id ? null : id;
      render();
      return;
    }
    const fLeg = event.target.closest("[data-f-leg]");
    if (fLeg) { state.filters.leg = fLeg.dataset.fLeg; render(); return; }
    const fGrade = event.target.closest("[data-f-grade]");
    if (fGrade) { state.filters.grade = fGrade.dataset.fGrade; render(); return; }
    const fKind = event.target.closest("[data-f-kind]");
    if (fKind) {
      const k = fKind.dataset.fKind;
      if (k === "missable") { state.filters.missableOnly = !state.filters.missableOnly; state.filters.kind = "all"; }
      else { state.filters.kind = k; state.filters.missableOnly = false; }
      render();
      return;
    }
    if (event.target.id === "export-btn") {
      const blob = new Blob([serializeProgress(state.earned)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "vice-route-progress.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    if (event.target.id === "reset-btn") {
      if (window.confirm("Reset all progress? This clears every earned trophy.")) {
        state.earned = new Set();
        writeEarned(state.earned);
        render();
      }
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "search") {
      state.filters.q = event.target.value;
      const list = document.querySelector(".check-list");
      if (list) {
        render();
        const box = document.getElementById("search");
        if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
      }
      return;
    }
    if (event.target.id === "hide-earned") {
      state.filters.hideEarned = event.target.checked;
      render();
      return;
    }
    if (event.target.id === "spoiler-toggle") {
      state.spoiler = event.target.checked;
      writeSpoiler(state.spoiler);
      render();
    }
  });

  document.addEventListener("change", async (event) => {
    if (event.target.id !== "import-file") return;
    const file = event.target.files && event.target.files[0];
    const msg = document.getElementById("import-msg");
    if (!file) return;
    const text = await file.text();
    try {
      const imported = parseProgress(text, state.byId);
      state.earned = imported;
      writeEarned(state.earned);
      render();
      const after = document.getElementById("import-msg");
      if (after) after.textContent = `Imported ${imported.size} earned trophies.`;
    } catch (err) {
      if (msg) msg.textContent = `Import failed: ${err.message}`;
    }
  });
}

boot().catch((err) => {
  document.getElementById("app").innerHTML = `<p class="load-error">Vice Route could not load its trophy data: ${err.message}</p>`;
});
