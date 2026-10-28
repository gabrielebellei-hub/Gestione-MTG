// Service worker minimo: tiene in cache la "cornice" dell'app così si apre anche con rete lenta.
// I dati veri passano sempre da Apps Script e non vengono mai messi in cache.
const CACHE = 'gestione-mtg-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;           // Google/Apps Script: mai in cache
  e.respondWith(fetch(e.request).then(function (r) {
    const copy = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () { return caches.match(e.request); }));
});
