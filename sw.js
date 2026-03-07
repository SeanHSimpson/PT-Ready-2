const VERSION = 'pt-ready-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          const copy = response.clone();
          if (request.url.startsWith(self.location.origin)) {
            caches.open(VERSION).then(cache => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
