// Vice Route — app boot: loads the trophy list, keeps progress in localStorage,
// routes by hash, and renders the views. No network requests: it fetches only
// data/trophies.json, a file served with the app itself.

import {
  SETTINGS_KEY,
  STORE_KEY,
  earnedFromSeed,
  filterTrophies,
  validateImport,
} from './route.js';
import {
  renderChecklist,
  renderLeg,
  renderRoute,
  renderSettings,
  renderTonight,
} from './views.js';

const view = document.getElementById('view');
const tabs = document.getElementById('tabs');

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seedCount = Number(params.get('seed') || '0');
const shotSpoiler = params.get('spoiler');

const state = {
  earned: new Set(),
  spoilerOn: true,
  openId: null,
  filter: { kind: 'all', grade: '', leg: 0, search: '', missableOnly: false, hideEarned: false },
  filtered: [],
  data: null,
};

function loadStored() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) state.earned = new Set(ids.filter((n) => Number.isInteger(n)));
    }
  } catch { /* a damaged save starts empty */ }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (typeof s.spoilerOn === 'boolean') state.spoilerOn = s.spoilerOn;
    }
  } catch { /* defaults stand */ }
}

function saveStored() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...state.earned].sort((a, b) => a - b)));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ spoilerOn: state.spoilerOn }));
  } catch { /* private mode: progress lives for this session only */ }
}

function applyShot() {
  if (!shot) return;
  if (seedCount > 0 && state.data) state.earned = earnedFromSeed(state.data.trophies, seedCount);
  if (shotSpoiler === 'on') state.spoilerOn = true;
  if (shotSpoiler === 'off') state.spoilerOn = false;
  const scroll = Number(params.get('scroll') || '0');
  if (scroll > 0) setTimeout(() => window.scrollTo(0, scroll), 60);
  if (shot === '1-cover') location.hash = '#/route';
  if (shot === '2-leg') { state.openId = 2; location.hash = '#/leg/1'; }
  if (shot === '3-missable') { state.filter.kind = 'missable'; state.filter.hideEarned = params.get('hide') === '1'; location.hash = '#/checklist'; }
  if (shot === '4-checklist') { state.openId = 40; if (params.get('search')) state.filter.search = params.get('search'); location.hash = '#/checklist'; }
}

function currentRoute() {
  const hash = location.hash || '#/route';
  const parts = hash.replace(/^#\//, '').split('/');
  if (parts[0] === 'leg') return { name: 'leg', leg: Number(parts[1]) || 1 };
  if (['route', 'checklist', 'tonight', 'settings'].includes(parts[0])) return { name: parts[0] };
  return { name: 'route' };
}

function render() {
  if (!state.data) return;
  state.filtered = filterTrophies(state.data.trophies, state.earned, state.filter);
  const route = currentRoute();
  lastRouteName = route.name;
  let html = '';
  if (route.name === 'route') html = renderRoute(state.data, state);
  else if (route.name === 'leg') html = renderLeg(state.data, state, route.leg, state.openId);
  else if (route.name === 'checklist') html = renderChecklist(state.data, state);
  else if (route.name === 'tonight') html = renderTonight(state.data, state);
  else if (route.name === 'settings') html = renderSettings(state.data, state);
  view.innerHTML = html;
  for (const a of tabs.querySelectorAll('a')) {
    a.classList.toggle('active', a.dataset.view === route.name || (route.name === 'leg' && a.dataset.view === 'route'));
  }
}

function exportProgress() {
  const payload = { app: 'vice-route', game: 'Grand Theft Auto VI', earned: [...state.earned].sort((a, b) => a - b) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vice-route-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importProgress(file, statusEl) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const result = validateImport(JSON.parse(String(reader.result)), state.data.trophies);
      if (!result.ok) {
        if (statusEl) statusEl.textContent = 'Import failed: ' + result.error;
        return;
      }
      state.earned = result.earned;
      saveStored();
      if (statusEl) statusEl.textContent = 'Imported ' + result.earned.size + ' earned trophies.';
      render();
    } catch {
      if (statusEl) statusEl.textContent = 'Import failed: that file is not valid JSON.';
    }
  };
  reader.readAsText(file);
}

view.addEventListener('click', (event) => {
  const earnBox = event.target.closest('[data-earn]');
  if (earnBox) {
    const id = Number(earnBox.dataset.earn);
    if (earnBox.checked) state.earned.add(id);
    else state.earned.delete(id);
    saveStored();
    render();
    return;
  }
  const guideBtn = event.target.closest('[data-guide]');
  if (guideBtn) {
    const id = Number(guideBtn.dataset.guide);
    state.openId = state.openId === id ? null : id;
    render();
    return;
  }
  const kindBtn = event.target.closest('[data-kind]');
  if (kindBtn) {
    state.filter.kind = kindBtn.dataset.kind;
    render();
    return;
  }
  if (event.target.closest('[data-export]')) { exportProgress(); return; }
  if (event.target.closest('[data-import-pick]')) {
    const input = view.querySelector('[data-import-file]');
    if (input) input.click();
    return;
  }
  if (event.target.closest('[data-reset]')) {
    state.earned = new Set();
    saveStored();
    render();
  }
});

view.addEventListener('change', (event) => {
  const el = event.target;
  if (el.matches('[data-spoiler]')) {
    state.spoilerOn = el.checked;
    saveStored();
    render();
    return;
  }
  if (el.matches('[data-grade]')) { state.filter.grade = el.value; render(); return; }
  if (el.matches('[data-leg]')) { state.filter.leg = Number(el.value) || 0; render(); return; }
  if (el.matches('[data-missable-only]')) { state.filter.missableOnly = el.checked; render(); return; }
  if (el.matches('[data-hide-earned]')) { state.filter.hideEarned = el.checked; render(); return; }
  if (el.matches('[data-import-file]') && el.files && el.files[0]) {
    importProgress(el.files[0], view.querySelector('[data-import-status]'));
  }
});

view.addEventListener('input', (event) => {
  const el = event.target;
  if (el.matches('[data-search]')) {
    state.filter.search = el.value;
    state.filtered = filterTrophies(state.data.trophies, state.earned, state.filter);
    render();
    const box = view.querySelector('[data-search]');
    if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
  }
});

let lastRouteName = '';
window.addEventListener('hashchange', () => {
  // A guide open in one view does not carry into another; staying in the same
  // view (a shot re-render, a leg change) keeps it.
  if (currentRoute().name !== lastRouteName) state.openId = null;
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, select, textarea')) return;
  const go = { 1: '#/route', 2: '#/checklist', 3: '#/tonight', 4: '#/settings' }[event.key];
  if (go) location.hash = go;
});

async function boot() {
  loadStored();
  const res = await fetch('data/trophies.json');
  state.data = await res.json();
  applyShot();
  render();
}

boot();
