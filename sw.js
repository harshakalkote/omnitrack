const CACHE_NAME = 'omnitrack-v11-20260814';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event - cache the current app shell and activate immediately.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate Event - clean up old caches so production users receive fixes.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cache => cache !== CACHE_NAME ? caches.delete(cache) : undefined)
    )).then(() => self.clients.claim())
  );
});

// Fetch Event
// HTML/navigation requests are network-first so production deployments are not stuck
// on an old cached index.html. Static assets remain cache-first for offline use.
// Cross-origin requests (e.g. the Gemini AI Coach API) are network-only: they must
// never be cached or replayed from cache (fresh answers, no stale/error caching).
self.addEventListener('fetch', event => {
  const request = event.request;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  const isNavigation = request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }))
  );
});
