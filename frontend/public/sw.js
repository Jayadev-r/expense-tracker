const CACHE_NAME = 'trackrr-v4';

const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.svg',
];

// Install: precache essential offline assets and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate: purge all outdated caches from previous builds
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// 1. API calls: Network-only with offline JSON fallback
// 2. HTML navigation: Network-first with offline cache fallback (PREVENTS 404 on new deploys)
// 3. Static assets: Stale-while-revalidate / Cache-first with network fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-HTTP(S) requests (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // 1. API Requests: Network-first
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'You are currently offline. Please check your internet connection.' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 2. HTML Navigation (user opening the app or navigating pages): Network-First!
  // This guarantees user always receives the latest HTML referencing new asset chunk hashes.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return caches.match('/');
        })
    );
    return;
  }

  // 3. Static Assets (scripts, styles, icons, fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Only cache valid GET responses
        if (response && response.status === 200 && request.method === 'GET') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });
        }
        return response;
      }).catch(() => {
        // If network fails and not in cache, return empty or offline response
        return cachedResponse;
      });
    })
  );
});
