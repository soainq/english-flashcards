const CACHE = 'fluent-uiux-v15';
const CORE_ASSETS = [
  './',
  'index.html',
  'styles.css',
  'content.js',
  'app.js',
  'manifest.webmanifest',
  'icon-192.svg',
  'icon-512.svg',
  'simple/',
  'simple/index.html',
  'simple/styles.css',
  'simple/styles.css?v=9',
  'simple/curriculum.js',
  'simple/curriculum.js?v=2',
  'simple/content.js',
  'simple/content.js?v=2',
  'simple/open-vocabulary.js',
  'simple/open-vocabulary.js?v=3',
  'simple/app.js',
  'simple/app.js?v=11'
].map((path) => new URL(path, self.registration.scope).href);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  if (request.destination === 'audio' || url.pathname.endsWith('.mp3')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok && url.origin === self.location.origin) {
        caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || caches.match(new URL('simple/index.html', self.registration.scope).href)))
  );
});
