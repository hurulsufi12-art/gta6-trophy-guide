// Leonida Platinum — a gta6-trophy-guide-01 entry (Node 22, standard library only).
// The guide itself is plain static files in app/ (index.html, style.css, app.js,
// roadmap.js and data/trophies.json), offline: it loads nothing over the network.
// This program hands it in: it copies app/ and screenshots/ from beside this file
// to /output and writes /output/dossier.json with the vendored make.fun library,
// exactly as the kit's starter does. Leave vendor/makefun-frontend.ts unchanged:
// the scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Before copying, it validates the guide against the gate's own caps, so a bad
// entry fails here with a readable message instead of failing on the server:
// trophies.json must parse and name all 55 trophies with a non-empty guide each,
// screenshots must be 3–4 files of at most 256 KiB, and app/ must stay within
// its file and byte caps. The output is deterministic: the same input files
// always produce the same /output bytes, so the grader's two runs agree.
//
// Serve the guide locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 262144;
const MAX_APP_FILES = 993;
const MAX_APP_BYTES = 50331648;

function fail(message) {
  throw new Error(`Leonida Platinum: ${message}`);
}

function countAppFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      const sub = countAppFiles(path);
      files += sub.files + 1;
      bytes += sub.bytes;
    } else if (name.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    } else {
      fail(`app/ holds a non-file entry: ${path}`);
    }
  }
  return { files, bytes };
}

// Pre-flight: refuse to hand in an entry the scorer would refuse.
const data = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
const trophies = data.trophies;
if (!Array.isArray(trophies) || trophies.length !== 55) {
  fail(`trophies.json must list exactly 55 trophies, found ${Array.isArray(trophies) ? trophies.length : 'no array'}`);
}
const seenNames = new Set();
for (const t of trophies) {
  if (!t.name || seenNames.has(t.name)) fail(`trophies.json has a missing or duplicate trophy name: ${JSON.stringify(t.name)}`);
  seenNames.add(t.name);
  if (typeof t.guide !== 'string' || t.guide.trim() === '') fail(`trophy ${JSON.stringify(t.name)} has an empty guide`);
}
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((n) => statSync(join(shotsDir, n)).isFile()) : [];
if (shots.length < 3 || shots.length > MAX_SCREENSHOTS) {
  fail(`screenshots/ must hold 3–4 images, found ${shots.length}`);
}
for (const name of shots) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > MAX_SCREENSHOT_BYTES) fail(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
}
const appTotals = countAppFiles(join(here, 'app'));
if (appTotals.files > MAX_APP_FILES) fail(`app/ has ${appTotals.files} files and directories, over the 993 cap`);
if (appTotals.bytes > MAX_APP_BYTES) fail(`app/ is ${appTotals.bytes} bytes, over the 48 MiB cap`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of app files:
// app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

console.log(
  `Leonida Platinum: handed in ${trophies.length} trophies, ${shots.length} screenshots, ` +
  `app/ ${appTotals.files} entries / ${appTotals.bytes} bytes -> ${out}`,
);
