// Offline cache. Bump VERSION on every release so phones pick up changes.
const VERSION = 'wt-v4';
const ASSETS = [
  './', 'index.html', 'css/app.css', 'js/app.js', 'js/core.js', 'js/calc/threads.js',
  'js/views/taps.js', 'js/views/convert.js', 'js/views/welding.js', 'js/views/auto.js',
  'data/threads/threads.json', 'data/threads/drills.json', 'data/threads/common.json',
  'data/welding/razor205.json', 'data/welding/tig_unimig.json', 'data/welding/troubleshooting.json', 'data/auto/cable.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network-first for same-origin requests (fresh when online), cache fallback offline.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    // no-cache = revalidate with the server, so new releases show up straight away
    fetch(new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
