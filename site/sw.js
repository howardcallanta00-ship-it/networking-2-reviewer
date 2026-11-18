/* Offline support: the app shell and question bank are cached after the first visit.
   Bump VERSION whenever app.js / styles.css / questions.json change. */
var VERSION = 'v3';
var CACHE = 'ccna2r-' + VERSION;
var SHELL = ['./', 'index.html', 'styles.css?' + VERSION, 'app.js?' + VERSION, 'data/questions.json', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('ccna2r-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; // fonts etc. go straight to the network

  // Pages and the question bank: network first, so updates show up; cache when offline.
  if (req.mode === 'navigate' || url.pathname.endsWith('/questions.json')) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req.mode === 'navigate' ? 'index.html' : req, copy); });
      return res;
    }).catch(function () { return caches.match(req.mode === 'navigate' ? 'index.html' : req); }));
    return;
  }
  // Everything else (versioned JS/CSS, images): cache first, then fill the cache.
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
