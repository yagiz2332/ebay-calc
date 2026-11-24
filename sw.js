/* eBay Fee Calculator - service worker: çevrimdışı çalışma */
var V = "v1";
var SHELL = "shell-" + V, RUNTIME = "runtime-" + V;
var FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== SHELL && k !== RUNTIME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  /* Sayfa: önce ağ (güncellemeler hemen gelsin), olmazsa önbellek */
  if (req.mode === "navigate" || (url.origin === location.origin && (url.pathname.endsWith("/") || url.pathname.endsWith("index.html")))) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(SHELL).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () { return caches.match("./index.html"); })
    );
    return;
  }

  /* Fontshare CSS ve yazı tipi dosyaları: önbellekten ver, arkada yenile */
  if (url.hostname === "api.fontshare.com" || url.hostname === "cdn.fontshare.com") {
    e.respondWith(
      caches.open(RUNTIME).then(function (c) {
        return c.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  /* Kendi dosyalarım (simgeler, manifest): önbellek öncelikli */
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
  }
});
