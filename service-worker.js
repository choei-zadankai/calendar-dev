self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('calendar-cache').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './script.js',
        './events.json',
        './icons/icon.png',
        './icons/icon-small.png'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});