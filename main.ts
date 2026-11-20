// Vice Route — the hand-in program for gta6-trophy-guide-01 (Node 22, standard
// library only). It checks the gate first — 55 official trophies with
// non-empty guides, 3–4 screenshots within size, app/ within its file and
// byte caps, no network references — then copies app/ and screenshots/ beside
// this file to /output (or MAKEFUN_OUTPUT_DIR) and writes /output/dossier.json
// with the vendored make.fun library, byte for byte what the scorer rebuilds.
// Run it twice: both runs must write identical bytes.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');

function abort(message) {
  throw new Error(`gate check failed: ${message}`);
}

function listFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, acc);
    else if (entry.isFile()) acc.push(full);
    else abort(`app/ holds a non-file entry: ${full}`);
  }
  return acc;
}

function countEntries(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += 1;
    if (entry.isDirectory()) n += countEntries(join(dir, entry.name));
  }
  return n;
}

// The 55 official PlayStation names, as the kit's starter lists them
// (Exophase and PSNProfiles agree on every name). Embedded here so the
// check runs from the repository alone, with no kit beside it.
const OFFICIAL_NAMES = [
  'Vice Got a Price!', 'Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money',
  'Vice City, Baby!', 'Top Of The World, Ma', 'You Gotta Know When to Get Off',
  'Trust', 'Break the Bank', 'Family Matters', 'DWNFALL', 'Hi-Jacked', 'Snow Storm',
  'A Long Road', 'Cunning Stunts', 'Master of None', 'The Shootist', 'Top Fun',
  'Earn Cash, Not Kudos', 'Baited My Tackle', 'Stick Fiddler', 'Road to Rehabilitation',
  'This Was No Boat Accident', 'The Lone Rider', 'Strangers & Freaks', 'Supply & Demand',
  'Spin On This!', 'Positive Mental Attitude', 'Fair Game', "Don't Touch My Deck",
  'You WAiNKer!', 'One Last Thing', 'Hot Together', 'Retail Therapy', 'Whip It Good',
  'Gunslinger', 'Catch Me If You Can', 'Challenging Tank', 'Sneakthief',
  'Maximum Withdrawal', 'A Classic Blitz Play', 'The Goodtime State', 'Pest Control',
  'In The Beginning…', 'Capital Offense', 'Let’s Go Bowling', 'Personal Best',
  'Actions Speak Louder', 'Bad Luck, I Guess', 'The Truth Is Out There', 'Ten Pin',
  'Dime on the Dollar', 'Treat Yo Self', 'Little Boxes', 'On the Spot',
];

function foldName(s) {
  return s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014-]/g, '-').replace(/\u2026/g, '...').replace(/\s+/g, ' ').trim();
}

function checkTrophies() {
  const path = join(appDir, 'data', 'trophies.json');
  if (!existsSync(path)) abort('app/data/trophies.json is missing');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const trophies = Array.isArray(data) ? data : data.trophies;
  if (!Array.isArray(trophies)) abort('trophies.json holds no trophy array');
  if (trophies.length !== 55) abort(`trophies.json holds ${trophies.length} trophies, expected 55`);
  const mine = new Set(trophies.map((t) => foldName(t.name)));
  for (const name of OFFICIAL_NAMES) {
    if (!mine.has(foldName(name))) abort(`official trophy missing from trophies.json: ${name}`);
  }
  for (const t of trophies) {
    if (typeof t.guide !== 'string' || !t.guide.trim()) abort(`trophy without a guide: ${t.name}`);
    if (typeof t.description !== 'string' || !t.description.trim()) abort(`trophy without a description: ${t.name}`);
    if (!['platinum', 'gold', 'silver', 'bronze'].includes(t.grade)) abort(`trophy with a bad grade: ${t.name}`);
  }
  // Leg totals must add up to the whole list: 12 + 7 + 8 + 14 + 7 + 6 + 1.
  const perLeg = {};
  for (const t of trophies) perLeg[t.leg] = (perLeg[t.leg] || 0) + 1;
  const expected = { L1: 12, L2: 7, L3: 8, L4: 14, L5: 7, L6: 6, L7: 1 };
  for (const [leg, n] of Object.entries(expected)) {
    if (perLeg[leg] !== n) abort(`leg ${leg} holds ${perLeg[leg] ?? 0} trophies, expected ${n}`);
  }
}

function checkScreenshots() {
  if (!existsSync(shotsDir)) abort('screenshots/ is missing');
  const files = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (files.length < 3 || files.length > 4) abort(`screenshots/ holds ${files.length} images, expected 3–4`);
  for (const name of files) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(name) || name.startsWith('-')) abort(`bad screenshot name: ${name}`);
    if (!/\.(png|jpe?g)$/i.test(name)) abort(`screenshot is not a PNG or JPEG: ${name}`);
    const full = join(shotsDir, name);
    const size = statSync(full).size;
    if (size > 262144) abort(`screenshot over 256 KiB: ${name} (${size} bytes)`);
    const dims = imageSize(full);
    if (!dims) abort(`screenshot is not a readable PNG or JPEG: ${name}`);
    if (Math.max(dims.width, dims.height) > 1280) abort(`screenshot long side over 1280 px: ${name} (${dims.width}x${dims.height})`);
    if (Math.min(dims.width, dims.height) < 480) abort(`screenshot short side under 480 px: ${name} (${dims.width}x${dims.height})`);
  }
}

// Pixel dimensions of a PNG or JPEG, read from the file header alone.
function imageSize(full) {
  const buf = readFileSync(full);
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) return null;
      const marker = buf[off + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
      }
      const len = buf.readUInt16BE(off + 2);
      if (len < 2) return null;
      off += 2 + len;
    }
  }
  return null;
}

function checkApp() {
  const files = listFiles(appDir);
  const entries = countEntries(appDir);
  if (entries > 993) abort(`app/ holds ${entries} files and directories, over 993`);
  let bytes = 0;
  for (const file of files) bytes += statSync(file).size;
  if (bytes > 50331648) abort(`app/ is ${bytes} bytes, over 48 MiB`);
  if (statSync(join(appDir, 'index.html')).size > 1048576) abort('app/index.html is over 1 MiB');
}

function checkNoNetwork() {
  const suspect = /(https?:)?\/\/[A-Za-z0-9]/i;
  for (const file of listFiles(appDir)) {
    if (!/\.(html|js|mjs|css|json)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    if (suspect.test(text)) abort(`possible network reference in ${file}`);
    if (/https?:/.test(text)) abort(`http(s) reference in ${file}`);
  }
}

checkTrophies();
checkScreenshots();
checkApp();
checkNoNetwork();

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

console.log('Vice Route handed in: app/ + screenshots/ copied, dossier.json written.');
