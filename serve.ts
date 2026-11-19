// A tiny static server for the Leonida Platinum guide (Node 22, standard library
// only), so it can be tried locally without a build step: `node serve.ts` serves
// app/ on http://localhost:8080 (`--port <n>` for another port). It also serves
// screenshots/ under /screenshots/, so the screenshots in shots.json can be
// re-taken against the app as it currently stands. It sends the MIME types a
// browser needs, refuses any path outside app/ or screenshots/, logs each
// request to the console, and otherwise does nothing clever: a development
// convenience, not a web server for the internet.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(join(base, 'app'));
const shotsRoot = resolve(join(base, 'screenshots'));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

// Resolve a request path to a file under one of the two served roots, or null.
function resolveFile(pathname) {
  const roots = pathname.startsWith('/screenshots/')
    ? [[shotsRoot, pathname.slice('/screenshots/'.length)]]
    : [[appRoot, pathname]];
  for (const [root, rel] of roots) {
    const file = resolve(join(root, normalize(rel)));
    if (file === root || file.startsWith(root + sep)) return file;
  }
  return null;
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolveFile(pathname);
  if (file === null) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  console.log(`${request.method} ${url.pathname} -> ${size} bytes`);
  response.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`app/ is on http://localhost:${port}`);
});
