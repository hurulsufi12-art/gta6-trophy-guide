// Vice Route — boot, progress store, export/import, spoiler setting, routing.
// The app fetches only its own data/trophies.json at run time and makes no
// other request: it works with the network off.
import { SEED_EARNED } from "./route.js";
import { headerNav, routeView, legView, checklistView, sessionView, settingsView } from "./views.js";

const STORE_KEY = "vice-route-v2-progress";
const SPOILER_KEY = "vice-route-v2-spoiler";

const params = new URLSearchParams(location.search);
const seedParam = params.get("seed");
const seed = seedParam === null ? null : (Number(seedParam) || 0);

function loadEarned() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return null;
    return new Set(ids.filter((n) => Number.isInteger(n)));
  } catch {
    return null;
  }
}

function saveEarned(earned) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  } catch { /* storage full or blocked: progress just does not persist */ }
}

function loadSpoiler() {
  const q = params.get("spoiler");
  if (q === "on") return true;
  if (q === "off") return false;
  try {
    const raw = localStorage.getItem(SPOILER_KEY);
    return raw === null ? true : raw === "1";
  } catch {
    return true;
  }
}

function saveSpoiler(on) {
  try { localStorage.setItem(SPOILER_KEY, on ? "1" : "0"); } catch { /* ignore */ }
}

export function exportProgress(earned) {
  return JSON.stringify({ app: "vice-route-v2", version: 1, earned: [...earned].sort((a, b) => a - b) }, null, 2);
}

export function importProgress(text, knownIds) {
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
  spoiler: loadSpoiler(),
  view: params.get("view") || "route",
  leg: params.get("leg") || "L1",
  openId: params.get("open") ? Number(params.get("open")) : null,
  seed,
  filters: {
    q: params.get("q") || "",
    leg: params.get("fleg") || "all",
    grade: params.get("fgrade") || "all",
    kind: params.get("fkind") || "all",
    missableOnly: params.get("missable") === "1",
    hideEarned: params.get("hide") === "1",
  },
};

function render() {
  const root = document.getElementById("app");
  const head = headerNav(state);
  let body = "";
  if (state.view === "leg") body = legView(state);
  else if (state.view === "checklist") body = checklistView(state);
  else if (state.view === "session") body = sessionView(state);
  else if (state.view === "settings") body = settingsView(state);
  else body = routeView(state);
  root.innerHTML = head + body;
  document.title = "Vice Route — GTA 6 Platinum Planner";
}

// Exposed for headless checks: read-only view of the live state.
window.__vice = {
  state,
  exportProgress: () => exportProgress(state.earned),
  importProgress: (text) => importProgress(text, state.byId),
  setEarned: (id, on) => {
    if (on) state.earned.add(id); else state.earned.delete(id);
    saveEarned(state.earned);
    render();
  },
};

async function boot() {
  const res = await fetch("data/trophies.json");
  if (!res.ok) throw new Error("trophies.json failed to load");
  const data = await res.json();
  state.trophies = data.trophies;
  state.byId = new Map(data.trophies.map((t) => [t.id, t]));
  const saved = loadEarned();
  if (saved) {
    state.earned = saved;
  } else if (seed !== null) {
    // A fresh browser with ?seed=N starts from the seeded demo progress.
    state.earned = new Set(SEED_EARNED.filter((id) => state.byId.has(id)));
    saveEarned(state.earned);
  }
  if (params.get("spoiler") !== null) saveSpoiler(state.spoiler);
  render();

  document.addEventListener("click", (event) => {
    const earnBox = event.target.closest("[data-earn]");
    if (earnBox) {
      const id = Number(earnBox.dataset.earn);
      if (earnBox.checked) state.earned.add(id); else state.earned.delete(id);
      saveEarned(state.earned);
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
      const blob = new Blob([exportProgress(state.earned)], { type: "application/json" });
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
        saveEarned(state.earned);
        render();
      }
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "search") {
      state.filters.q = event.target.value;
      const list = document.querySelector(".check-list");
      if (list) {
        const keep = state.view;
        state.view = "checklist";
        render();
        state.view = keep;
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
      saveSpoiler(state.spoiler);
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
      const imported = importProgress(text, state.byId);
      state.earned = imported;
      saveEarned(state.earned);
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
