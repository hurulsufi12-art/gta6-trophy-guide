// Vice Route — the hand-in program for gta6-trophy-guide-01 (Node 22, standard
// library only). It validates the gate first — 55 official trophies with
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

function fail(message) {
  throw new Error(`gate validation failed: ${message}`);
}

function walkFiles(dir, base = dir) {
  const outFiles = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) outFiles.push(...walkFiles(full, base));
    else if (entry.isFile()) outFiles.push(full);
    else fail(`app/ holds a non-file entry: ${full}`);
  }
  return outFiles;
}

function validateTrophies() {
  const path = join(appDir, 'data', 'trophies.json');
  if (!existsSync(path)) fail('app/data/trophies.json is missing');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const trophies = Array.isArray(data) ? data : data.trophies;
  if (!Array.isArray(trophies) || trophies.length !== 55) {
    fail(`trophies.json holds ${Array.isArray(trophies) ? trophies.length : 'no array'}, expected 55`);
  }
  // The 55 official PlayStation names, as the kit's starter lists them
  // (Exophase and PSNProfiles agree on every name). Embedded here so the
  // check runs from the repository alone, with no kit beside it.
  const official = [
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
  const fold = (s) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014-]/g, '-').replace(/\u2026/g, '...').replace(/\s+/g, ' ').trim();
  const mine = new Set(trophies.map((t) => fold(t.name)));
  for (const name of official) {
    if (!mine.has(fold(name))) fail(`official trophy missing from trophies.json: ${name}`);
  }
  for (const t of trophies) {
    if (typeof t.guide !== 'string' || !t.guide.trim()) fail(`trophy without a guide: ${t.name}`);
  }
}

function validateScreenshots() {
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const files = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (files.length < 3 || files.length > 4) fail(`screenshots/ holds ${files.length} images, expected 3–4`);
  for (const name of files) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(name) || name.startsWith('-')) fail(`bad screenshot name: ${name}`);
    const size = statSync(join(shotsDir, name)).size;
    if (size > 262144) fail(`screenshot over 256 KiB: ${name} (${size} bytes)`);
  }
}

function validateApp() {
  const files = walkFiles(appDir);
  let entries = 0;
  let bytes = 0;
  const countEntries = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      entries += 1;
      if (entry.isDirectory()) countEntries(join(dir, entry.name));
    }
  };
  countEntries(appDir);
  for (const file of files) bytes += statSync(file).size;
  if (entries > 993) fail(`app/ holds ${entries} files and directories, over 993`);
  if (bytes > 50331648) fail(`app/ is ${bytes} bytes, over 48 MiB`);
  const index = join(appDir, 'index.html');
  if (statSync(index).size > 1048576) fail('app/index.html is over 1 MiB');
}

function validateNoNetwork() {
  const bad = /(https?:)?\/\/[A-Za-z0-9]|\bdata:text\/|\bdata:application\/javascript/i;
  for (const file of walkFiles(appDir)) {
    if (!/\.(html|js|mjs|css|json)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    if (bad.test(text)) fail(`possible network reference in ${file}`);
    if (/https?:/.test(text)) fail(`http(s) reference in ${file}`);
  }
}

validateTrophies();
validateScreenshots();
validateApp();
validateNoNetwork();

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
