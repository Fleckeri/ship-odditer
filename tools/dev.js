// Local dev server: serves docs/ at http://localhost:8017/ (PORT to change), rebuilds it when app/ or
// tools/build_pwa.py changes, and reloads every open tab after each rebuild.
//
//   npm run dev
//
// The real service worker would keep serving its cached copy (that's what makes a deployed PWA need
// several refreshes), so here /sw.js is a stand-in that clears the caches and unregisters itself, and
// every response is no-store. Running it again while one is already up replaces the old server.
const http = require('http'), fs = require('fs'), path = require('path'), { exec } = require('child_process');
const ROOT = path.join(__dirname, '..'), DOCS = path.join(ROOT, 'docs'), PORT = +process.env.PORT || 8017;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2', '.xml': 'text/xml', '.txt': 'text/plain' };
const KILL_SW = `// Dev server stand-in: drop the caches and step aside, so every load comes straight from the server
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
})()));
`;
// Reloads when the build id changes: after a rebuild, and after this server restarts (the EventSource reconnects)
const RELOAD_JS = `(() => {
  let seen = null;
  const es = new EventSource('/__dev/events');
  es.addEventListener('build', e => { if (seen !== null && e.data !== seen) location.reload(); seen = e.data; });
  es.addEventListener('failed', e => console.error('[dev] build failed\\n' + JSON.parse(e.data)));
})();
`;

let buildId = `${Date.now()}`, builds = 0, building = false, again = false;
const clients = new Set();
const send = (event, data) => { for (const c of clients) c.write(`event: ${event}\ndata: ${data}\n\n`); };
function build(why){
  if (building) { again = true; return; }
  building = true; const t0 = Date.now();
  // Through a shell: Node's own PATH search stops with EPERM at a directory it can't read (as in Claude Code's sandbox)
  exec('python3 tools/build_pwa.py', { cwd: ROOT }, (err, _out, errOut) => {
    building = false;
    if (err) {
      console.error(`build failed (${why}):\n${errOut || err.message}`);
      send('failed', JSON.stringify(errOut || err.message));
    } else {
      buildId = `${Date.now()}-${++builds}`;
      console.log(`rebuilt in ${Date.now() - t0} ms (${why}); reloading ${clients.size} tab${clients.size === 1 ? '' : 's'}`);
      send('build', buildId);
    }
    if (again) { again = false; build('more changes'); }
  });
}

const server = http.createServer((req, rsp) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/__dev/events') {
    rsp.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    rsp.write(`retry: 500\nevent: build\ndata: ${buildId}\n\n`);
    clients.add(rsp); req.on('close', () => clients.delete(rsp));
    return;
  }
  if (p === '/__dev/stop') { rsp.end('stopping'); console.log('replaced by a new dev server'); process.exit(0); }
  const headers = { 'Cache-Control': 'no-store' };
  if (p === '/__dev/reload.js') { rsp.writeHead(200, { ...headers, 'Content-Type': TYPES['.js'] }); return rsp.end(RELOAD_JS); }
  if (p === '/sw.js') { rsp.writeHead(200, { ...headers, 'Content-Type': TYPES['.js'] }); return rsp.end(KILL_SW); }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DOCS, p);
  if (!f.startsWith(DOCS + path.sep) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404, headers); return rsp.end('not found'); }
  rsp.writeHead(200, { ...headers, 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  if (p === '/index.html') return rsp.end(fs.readFileSync(f, 'utf8').replace('\n</body>', '\n<script src="/__dev/reload.js"></script>\n</body>'));
  fs.createReadStream(f).pipe(rsp);
});

// If the port is taken, ask the server there to stop (only ours answers /__dev/stop), then try again
function listen(tries = 0){
  server.once('error', e => {
    if (e.code !== 'EADDRINUSE' || tries > 20) { console.error(e.message); process.exit(1); }
    if (tries === 0) http.get(`http://127.0.0.1:${PORT}/__dev/stop`, r => r.resume()).on('error', () => {});
    setTimeout(() => listen(tries + 1), 150);
  });
  server.listen(PORT, '127.0.0.1');
}
server.once('listening', () => {
  server.removeAllListeners('error');
  console.log(`dev server: http://localhost:${PORT}/ (rebuilds and reloads on save)`);
});

// The files that feed the build, polled: works for in-place and atomic (rename) saves alike, and needs no
// FSEvents (a recursive fs.watch of app/ falls back to one handle per file and runs out where that's blocked).
// Icons and fonts change only with tools/update_data.sh, which rebuilds docs/ itself; restart to pick them up.
let timer = 0;
const changed = why => { clearTimeout(timer); timer = setTimeout(() => build(why), 120); };
for (const f of ['app/ship-odditer.html', 'app/data.json', 'tools/build_pwa.py'])
  fs.watchFile(path.join(ROOT, f), { interval: 250 }, (now, before) => { if (now.mtimeMs !== before.mtimeMs) changed(f); });

listen();
build('start');
