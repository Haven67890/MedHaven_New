const CACHE_NAME = 'medhaven-cache-v1';

// Pre-cache key assets for the offline app shell
const PRE_CACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching App Shell');
      return cache.addAll(PRE_CACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // We only handle GET requests and ignore internal API / Supabase / Auth calls to prevent interference
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip browser extensions and Next.js HMR/Webpack hot reload requests
  if (
    url.pathname.startsWith('/_next/webpack') ||
    url.pathname.startsWith('/_next/image') ||
    request.url.startsWith('chrome-extension://')
  ) {
    return;
  }

  // Network-First with Fallback to Cache strategy
  // Highly suitable for dynamic applications like MedHaven
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // If valid response, clone and cache it
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable
        console.log('[Service Worker] Serving from Cache fallback:', url.pathname);
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If a page/route is requested but not cached, fallback to root App Shell if it's a navigation request
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
