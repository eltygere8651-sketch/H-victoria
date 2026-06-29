self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // A simple pass-through fetch handler is enough to trigger PWA installability in Chrome
  // For actual offline support, you would cache files here.
});
