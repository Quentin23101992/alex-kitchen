// ALEX APP — Service Worker (stale-while-revalidate)
// Serves cached version instantly, fetches fresh copy in background.
// On next load, user gets the updated version.
// Survives Safari's 7-day PWA purge by re-caching on every fetch.
const CACHE_NAME = 'alexapp-v22';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
          .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Only handle same-origin GET requests
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        // Always fetch fresh copy in background
        var networkFetch = fetch(e.request).then(function(response) {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(e.request, response.clone());
          }
          return response;
        }).catch(function() {
          // Network failed — return cached if available
          return cached;
        });

        // Stale-while-revalidate: serve cached immediately, update in background
        return cached || networkFetch;
      });
    })
  );
});

// Notify clients when a new version is available
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
