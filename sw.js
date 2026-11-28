// Hors ligne : cache de l'appli. Change VERSION à chaque mise à jour des fichiers.
const VERSION = 'muscu-18';
const FILES = ['./', 'index.html', 'app.js', 'logic.js', 'programme-defaut.js', 'catalogue.js', 'body-data.js', 'body.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'fonts/barlow-400.woff2', 'fonts/barlow-500.woff2', 'fonts/barlow-600.woff2', 'fonts/barlowcond-600.woff2', 'fonts/barlowcond-700.woff2'];

self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Réseau d'abord, en vérifiant auprès du serveur (sinon le navigateur peut mélanger anciens et nouveaux fichiers), cache si hors ligne
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request.url, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const copy = r.clone(); e.waitUntil(caches.open(VERSION).then(c => c.put(e.request.url, copy))); }
    return r;
  }).catch(() => caches.match(e.request.url)));
});
