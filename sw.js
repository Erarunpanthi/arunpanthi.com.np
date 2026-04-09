// sw.js — Dynamic Auto-Caching
// arunpanthi.com.np

const CACHE_NAME = 'arunpanthi-cache-v1';

const CORE_FILES = [
  '/',
  '/index.html',
  '/js/sw-register.js'
];

// Install — Cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

// Activate — Clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Auto-detect and cache HTML, CSS, JS
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== location.origin) return;

  // Detect file type by extension or Accept header
  const isHTML = request.headers.get('Accept')?.includes('text/html') || url.pathname.endsWith('.html');
  const isCSS  = url.pathname.endsWith('.css');
  const isJS   = url.pathname.endsWith('.js');

  if (isHTML) {
    // Network First for HTML
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
          return networkResponse;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  if (isCSS || isJS) {
    // Cache First for CSS/JS
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default strategy for other assets (images, fonts, etc.)
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
