// Vice Route — GTA 6 Platinum Planner, gta6-trophy-guide-01 (Node 22, standard library only).
// The guide is this directory's app/ folder: plain static files a browser opens at
// app/index.html (ES modules, CSS, no build step), fully offline — it loads nothing
// over the network, and its trophy list and guides are app/data/trophies.json.
// This program hands it in: it copies app/ and screenshots/ from beside this file
// to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored
// make.fun library. Leave vendor/makefun-frontend.ts as it is: the scorer requires
// dossier.json to be byte for byte what its own copy writes.
//
// The gate, first (RULES.txt, The gate): 55 official trophies with a guide each in
// app/data/trophies.json; 3 or 4 screenshots within size; app/ within its caps;
// no network references. This program checks those gates before it copies, so a
// broken entry fails loudly here instead of silently at the scorer. The check runs
// the same way every time, and the copy is deterministic: run this program twice
// and /output is byte-identical.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  throw new Error('Vice Route gate check failed: ' + message);
}

// Gate 1: the trophy file names all 55 official trophies, each with a guide.
const trophiesPath = join(here, 'app', 'data', 'trophies.json');
const trophies = JSON.parse(readFileSync(trophiesPath, 'utf8'));
const list = Array.isArray(trophies) ? trophies : trophies.trophies;
if (!Array.isArray(list) || list.length !== 55) fail('expected 55 trophies, found ' + (Array.isArray(list) ? list.length : 'none'));
for (const trophy of list) {
  if (typeof trophy.name !== 'string' || !trophy.name.trim()) fail('a trophy has no name');
  if (typeof trophy.guide !== 'string' || !trophy.guide.trim()) fail('trophy "' + trophy.name + '" has no guide');
}
const grades = {};
for (const trophy of list) grades[trophy.grade] = (grades[trophy.grade] || 0) + 1;
if (grades.platinum !== 1 || grades.gold !== 2 || grades.silver !== 6 || grades.bronze !== 46) {
  fail('grade counts are wrong: ' + JSON.stringify(grades));
}

// Gate 2: 3 or 4 screenshots, each at most 256 KiB, PNG or JPEG, long side at
// most 1280 and short side at least 480 pixels (RULES.txt, screenshots).
function imageSize(file) {
  const buf = readFileSync(file);
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) fail('screenshot "' + file + '" is not a whole JPEG');
      const marker = buf[offset + 1];
      const length = buf.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
    fail('screenshot "' + file + '" has no JPEG frame header');
  }
  fail('screenshot "' + file + '" is not a whole PNG or JPEG');
}
const shotsDir = join(here, 'screenshots');
const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.')).sort();
if (shots.length < 3 || shots.length > 4) fail('expected 3 or 4 screenshots, found ' + shots.length);
for (const name of shots) {
  const file = join(shotsDir, name);
  if (!statSync(file).isFile()) fail('screenshot "' + name + '" is not a file');
  if (!/\.(png|jpe?g)$/i.test(name)) fail('screenshot "' + name + '" is not a PNG or JPEG');
  if (statSync(file).size > 262144) fail('screenshot "' + name + '" is over 256 KiB');
  const size = imageSize(file);
  const longSide = Math.max(size.width, size.height);
  const shortSide = Math.min(size.width, size.height);
  if (longSide > 1280) fail('screenshot "' + name + '" is ' + size.width + 'x' + size.height + ' — long side over 1280');
  if (shortSide < 480) fail('screenshot "' + name + '" is ' + size.width + 'x' + size.height + ' — short side under 480');
}

// Gate 3: app/ is plain files only, within its caps, and index.html exists.
const indexPath = join(here, 'app', 'index.html');
if (!existsSync(indexPath) || !statSync(indexPath).isFile()) fail('app/index.html is missing');
if (statSync(indexPath).size > 1048576) fail('app/index.html is over 1 MiB');
let appBytes = 0;
let appEntries = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    const stats = statSync(file);
    appEntries += 1;
    if (!stats.isFile() && !stats.isDirectory()) fail('app/ holds a non-file, non-directory entry: ' + name);
    if (stats.isFile()) appBytes += stats.size;
    if (stats.isDirectory()) walk(file);
  }
})(join(here, 'app'));
if (appEntries > 993) fail('app/ holds more than 993 files and directories');
if (appBytes > 50331648) fail('app/ is over 48 MiB');

// Gate 4: no network references in the app's own source — the app is fully offline.
const networkPattern = /https?:\/\/|protocol-relative:|\/\/[a-z0-9-]+\.[a-z]{2,}/i;
function scanText(dir) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) { scanText(file); continue; }
    if (/\.(html|js|css|json)$/.test(name)) {
      const text = readFileSync(file, 'utf8');
      if (networkPattern.test(text)) fail('network reference in ' + file);
    }
  }
}
scanText(join(here, 'app'));

// Hand in: copy app/ and screenshots/, then write the dossier.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

console.log('Vice Route handed in: 55 trophies, ' + shots.length + ' screenshots, dossier written to ' + out);
