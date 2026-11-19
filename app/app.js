// Leonida Platinum — tracker + guide for the 55 GTA VI trophies.
// State lives in localStorage; the trophy data is fetched from data/trophies.json
// (a file of this app, never the network). Query params drive deep links and the
// screenshot seed: ?seed=13 earns a sample set, ?kind=missable filters,
// ?spoiler=off reveals story trophies, ?open=<id> scrolls to one trophy.
// Every kind a trophy carries has a filter button, so no trophy is reachable
// only through "All kinds": story, strangers, collectibles, activities and
// open-world, plus the missable cross-cut and the (empty, honest) online filter.
import { STAGE_META, pickNextUp, stageCounts } from './roadmap.js';

const STORE_KEY = 'leonida-platinum-v1';
const THEME_KEY = 'leonida-platinum-theme';
const KIND_LABELS = {
  all: 'All kinds',
  story: 'Story',
  missable: 'Missable',
  strangers: 'Strangers',
  collectibles: 'Collectibles',
  activities: 'Activities',
  'open-world': 'Open world',
  online: 'Online',
};
const KIND_ORDER = ['all', 'story', 'missable', 'strangers', 'collectibles', 'activities', 'open-world', 'online'];

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const SOURCES_LINE = doc.sources.join(' · ');

// A demo seed for screenshots: the first story run plus a spread of activities,
// so the tracker visibly works (13 of 55 earned).
const SEED_IDS = [2, 3, 4, 5, 8, 15, 16, 19, 21, 44, 46, 51, 53];

let earned = new Set();
try {
  earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'));
} catch {
  earned = new Set();
}
if (params.has('seed')) {
  const n = Number(params.get('seed'));
  const ids = Number.isFinite(n) ? SEED_IDS.slice(0, n) : SEED_IDS;
  earned = new Set(ids.map((id) => trophies.find((t) => t.id === id)?.name).filter(Boolean));
}
if (params.get('earned')) {
  earned = new Set(
    params
      .get('earned')
      .split(',')
      .map((s) => Number(s))
      .map((id) => trophies.find((t) => t.id === id)?.name)
      .filter(Boolean),
  );
}

const state = {
  kind: KIND_ORDER.includes(params.get('kind')) ? params.get('kind') : 'all',
  grade: 'all',
  search: '',
  hideEarned: false,
  spoiler: params.get('spoiler') !== 'off',
};

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
}

function gradeWord(g) {
  return g === 'platinum' ? 'Platinum' : g[0].toUpperCase() + g.slice(1);
}

// How many trophies a kind filter shows, so the buttons carry honest counts:
// missable counts the flagged story trophies, online is always 0 (the official
// list has no online trophies), and the platinum + 100% trophies are singletons
// that only the "All kinds" filter lists.
function kindCount(kind) {
  if (kind === 'all') return trophies.length;
  if (kind === 'missable') return trophies.filter((t) => t.missable).length;
  if (kind === 'online') return 0;
  return trophies.filter((t) => t.kind === kind).length;
}

function matches(t) {
  if (state.kind === 'missable' && !t.missable) return false;
  if (state.kind === 'online') return false; // the official list has no online trophies
  if (state.kind !== 'all' && state.kind !== 'missable' && t.kind !== state.kind) return false;
  if (state.grade !== 'all' && t.grade !== state.grade) return false;
  if (state.hideEarned && earned.has(t.name)) return false;
  if (state.search) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(state.search)) return false;
  }
  return true;
}

function renderProgress() {
  const n = earned.size;
  const total = trophies.length;
  $('earnedCount').textContent = String(n);
  $('toolbarProgress').textContent = `${n} / ${total} earned`;
  $('barFill').style.width = `${Math.round((n / total) * 100)}%`;
  $('barWrap').setAttribute('aria-valuenow', String(n));
  const byGrade = {};
  for (const t of trophies) {
    const got = earned.has(t.name) ? 1 : 0;
    byGrade[t.grade] = byGrade[t.grade] || [0, 0];
    byGrade[t.grade][0] += got;
    byGrade[t.grade][1] += 1;
  }
  $('gradeCounts').textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${gradeWord(g)} ${byGrade[g][0]}/${byGrade[g][1]}`)
    .join(' · ');
  $('platinumNote').textContent =
    n === total
      ? 'Platinum earned — you are a Leonida Legend.'
      : `${total - n} to go until the platinum.`;
}

function renderNextUp() {
  const list = $('nextList');
  list.replaceChildren();
  const picks = pickNextUp(trophies, earned, 3);
  if (picks.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Every trophy is earned — the platinum is yours.';
    list.append(li);
    return;
  }
  for (const { trophy: t, why } of picks) {
    const li = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = `${t.name} `;
    const grade = document.createElement('span');
    grade.className = `grade ${t.grade}`;
    grade.textContent = t.grade;
    const p = document.createElement('p');
    p.className = 'why';
    p.textContent = why;
    const go = document.createElement('button');
    go.type = 'button';
    go.textContent = 'Jump to it';
    go.addEventListener('click', () => {
      state.kind = 'all';
      state.search = '';
      $('search').value = '';
      renderAll();
      document.getElementById(`trophy-${t.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    li.append(name, grade, p, go);
    list.append(li);
  }
}

function renderRoadmap() {
  const wrap = $('stages');
  wrap.replaceChildren();
  const counts = stageCounts(trophies, earned);
  for (const meta of STAGE_META) {
    const stageTrophies = trophies.filter((t) => t.stage === meta.stage);
    const done = counts.find((c) => c.stage === meta.stage)?.done ?? 0;
    const div = document.createElement('div');
    div.className = 'stage';
    const h = document.createElement('h3');
    const num = document.createElement('span');
    num.className = 'n';
    num.textContent = `Stage ${meta.stage} — `;
    h.append(num, document.createTextNode(`${meta.title} (${done}/${stageTrophies.length})`));
    const p = document.createElement('p');
    p.textContent = meta.blurb;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const t of stageTrophies) {
      const chip = document.createElement('span');
      chip.className = 'chip' + (earned.has(t.name) ? ' done' : '') + (t.missable ? ' miss' : '');
      chip.textContent = (t.missable ? '⚠ ' : '') + t.name;
      chips.append(chip);
    }
    div.append(h, p, chips);
    wrap.append(div);
  }
}

function spoilerHidden(t) {
  return state.spoiler && t.kind === 'story' && !earned.has(t.name);
}

function renderList() {
  const list = $('list');
  list.replaceChildren();
  const shown = trophies.filter(matches);
  const earnedShown = shown.filter((t) => earned.has(t.name)).length;
  $('listMeta').textContent =
    state.kind === 'online'
      ? 'Online — the official 55-trophy list has no online trophies, so there is nothing here. If a future update adds one, it will appear in this filter.'
      : `Showing ${shown.length} of ${trophies.length} trophies (${earnedShown} earned in this view)`;
  $('emptyState').hidden = shown.length !== 0 || state.kind === 'online';
  if (shown.length === 0 && state.kind !== 'online') {
    $('emptyState').textContent = 'No trophies match these filters — clear the search or pick another kind.';
  }
  for (const t of shown) {
    const card = document.createElement('article');
    card.className = 'card' + (earned.has(t.name) ? ' earned' : '') + (t.missable ? ' missable' : '');
    card.id = `trophy-${t.id}`;
    const head = document.createElement('div');
    head.className = 'card-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Earned: ${t.name}`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      save();
      renderAll();
    });
    const h = document.createElement('h3');
    const grade = document.createElement('span');
    grade.className = `grade ${t.grade}`;
    grade.textContent = t.grade;
    if (spoilerHidden(t)) {
      h.textContent = 'Hidden story trophy — earn it to reveal';
      const flag = document.createElement('span');
      flag.className = 'flag';
      flag.textContent = 'spoiler hidden';
      h.append(flag);
      const note = document.createElement('p');
      note.className = 'spoiled';
      note.textContent =
        'Its name, description and guide stay hidden until you earn it (spoiler-safe is on). Tick the box once you have earned it in-game to reveal it.';
      head.append(box, h);
      card.append(head, note);
    } else {
      h.append(document.createTextNode(t.name), grade);
      if (t.missable) {
        const flag = document.createElement('span');
        flag.className = 'flag';
        flag.textContent = '⚠ missable';
        h.append(flag);
      }
      const official = document.createElement('p');
      official.className = 'official';
      const lbl = document.createElement('span');
      lbl.className = 'lbl';
      lbl.textContent = 'Official description — PlayStation · ';
      official.append(lbl, document.createTextNode(`“${t.description}”`));
      const guide = document.createElement('p');
      guide.className = 'guide';
      guide.textContent = t.guide;
      const sources = document.createElement('p');
      sources.className = 'sources';
      const b = document.createElement('b');
      b.textContent = 'Sources: ';
      sources.append(b, document.createTextNode(SOURCES_LINE));
      const meta = document.createElement('div');
      meta.className = 'meta';
      const chips = [
        `Kind: ${t.kind}`,
        `Roadmap stage ${t.stage}`,
        t.count ? `Target: ${t.count.toLocaleString('en-US')}` : null,
        t.missable ? 'Missable — story mission' : null,
      ].filter(Boolean);
      for (const c of chips) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = c;
        meta.append(chip);
      }
      head.append(box, h);
      card.append(head, official, guide, sources, meta);
    }
    list.append(card);
  }
}

function renderKindFilters() {
  const wrap = $('kindFilters');
  wrap.replaceChildren();
  for (const kind of KIND_ORDER) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${KIND_LABELS[kind]} (${kindCount(kind)})`;
    if (state.kind === kind) b.classList.add('active');
    b.addEventListener('click', () => {
      state.kind = kind;
      renderAll();
    });
    wrap.append(b);
  }
}

function renderAll() {
  renderProgress();
  renderNextUp();
  renderRoadmap();
  renderList();
  renderKindFilters();
}

function applyTheme() {
  const theme = localStorage.getItem(THEME_KEY) ?? 'paper';
  document.documentElement.setAttribute('data-theme', theme);
  $('theme').textContent = theme === 'paper' ? 'Night theme' : 'Paper theme';
}

$('theme').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'paper' ? 'night' : 'paper';
  localStorage.setItem(THEME_KEY, next);
  applyTheme();
});
$('search').addEventListener('input', (e) => {
  state.search = e.target.value.trim().toLowerCase();
  renderList();
});
$('grade').addEventListener('change', (e) => {
  state.grade = e.target.value;
  renderList();
});
$('hideEarned').addEventListener('change', (e) => {
  state.hideEarned = e.target.checked;
  renderList();
});
$('spoiler').checked = state.spoiler;
$('spoiler').addEventListener('change', (e) => {
  state.spoiler = e.target.checked;
  renderList();
});
$('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort() }, null, 2)], {
      type: 'application/json',
    }),
  );
  a.download = 'gta6-trophy-progress.json';
  a.click();
});
$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => known.has(n)));
    save();
    renderAll();
  } catch {
    alert('That file is not a trophy progress export from this guide.');
  }
  e.target.value = '';
});

applyTheme();
renderAll();

// Deep link: ?open=<id> scrolls to one trophy (used by the planner and screenshots).
if (params.get('open')) {
  const el = document.getElementById(`trophy-${Number(params.get('open'))}`);
  el?.scrollIntoView({ block: 'center' });
}
if (params.get('view') === 'roadmap') {
  $('roadmap').scrollIntoView();
}
// A kind filter in the URL (missable, story, …) jumps straight to the trophy list.
if (params.get('kind') && !params.get('view') && !params.get('open')) {
  document.querySelector('main').scrollIntoView();
}
