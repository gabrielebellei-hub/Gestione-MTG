// Service worker: tiene in cache la "cornice" dell'app e riceve i CSV condivisi da ManaBox.
// I dati veri passano sempre da Apps Script e non vengono mai messi in cache.
const CACHE = 'gestione-mtg-v3';
const SHARE = 'gestione-mtg-condivisi';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== SHARE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

// Condivisione Android -> "Gestione MTG": salvo il file e apro l'app con la schermata di importazione
async function riceviCondivisione(req) {
  try {
    const form = await req.formData();
    const f = form.get('file');
    let nome = 'Collezione.csv', testo = '';
    if (f && typeof f !== 'string') { nome = f.name || nome; testo = await f.text(); }
    if (!testo) testo = String(form.get('text') || '');
    if (form.get('title') && (!f || typeof f === 'string')) nome = String(form.get('title'));
    const c = await caches.open(SHARE);
    await c.put('./condiviso.json', new Response(JSON.stringify({ nome: nome, csv: testo, quando: Date.now() }), { headers: { 'Content-Type': 'application/json' } }));
  } catch (err) {}
  return Response.redirect('./?condiviso=1', 303);
}

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;           // Google/Apps Script: mai in cache
  if (e.request.method === 'POST' && url.pathname.endsWith('/condividi')) { e.respondWith(riceviCondivisione(e.request)); return; }
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(function (r) {
    const copy = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
