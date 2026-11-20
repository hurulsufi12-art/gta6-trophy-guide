// A tiny static server for the Vice Route guide (Node 22, standard library
// only), so it can be tried locally without a build step: `node serve.ts`
// serves app/ on http://localhost:8080 and screenshots/ under /screenshots/
// (`--port <n>` for another port). It sends the MIME types a browser needs,
// refuses any path outside app/ or screenshots/, and logs each request with
// its status: a development convenience, not a web server for the internet.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const appRoot = resolve(join(here, 'app'));
const shotsRoot = resolve(join(here, 'screenshots'));
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

function inside(root, file) {
  return file === root || file.startsWith(root + sep);
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    console.log(`${request.method} ${request.url} -> 400`);
    return;
  }
  const root = pathname.startsWith('/screenshots/') ? shotsRoot : appRoot;
  const rel = pathname.startsWith('/screenshots/') ? pathname.slice('/screenshots/'.length) : pathname.replace(/^\//, '');
  const target = rel === '' ? 'index.html' : rel;
  const file = resolve(join(root, normalize(target)));
  if (!inside(root, file)) {
    response.writeHead(403).end('forbidden');
    console.log(`${request.method} ${request.url} -> 403`);
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    console.log(`${request.method} ${request.url} -> 404`);
    return;
  }
  response.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
  console.log(`${request.method} ${request.url} -> 200 (${size} bytes)`);
}).listen(port, '127.0.0.1', () => {
  console.log(`app/ is on http://localhost:${port} (screenshots/ under /screenshots/)`);
});
