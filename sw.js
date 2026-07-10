/*
  STOK · Dolap Paneli — çevrimdışı önbellek (sw.js)
  Strateji:
  - index.html: AĞ ÖNCELİKLİ → internet varken hep en güncel sürüm gelir,
    internet yokken önbellekteki son sürüm açılır.
  - Fontlar ve diğer dosyalar: ÖNBELLEK ÖNCELİKLİ → bir kez indi mi hep hazır.
*/
"use strict";
var ONBELLEK = "stok-onbellek-1";

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(ONBELLEK).then(function (c) {
      return c.addAll(["./", "./index.html"]).catch(function () {});
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (anahtarlar) {
      return Promise.all(
        anahtarlar
          .filter(function (k) { return k !== ONBELLEK; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  var uygulamaSayfasi =
    e.request.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/");

  if (uygulamaSayfasi) {
    /* ağ öncelikli: güncellemeler anında gelsin, çevrimdışında önbellek devreye girsin */
    e.respondWith(
      fetch(e.request).then(function (yanit) {
        var kopya = yanit.clone();
        caches.open(ONBELLEK).then(function (c) {
          c.put("./index.html", kopya);
        });
        return yanit;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  /* fontlar ve diğerleri: önbellek öncelikli, arkada tazele */
  e.respondWith(
    caches.match(e.request).then(function (eldeki) {
      if (eldeki) return eldeki;
      return fetch(e.request).then(function (yanit) {
        if (yanit && (yanit.ok || yanit.type === "opaque")) {
          var kopya = yanit.clone();
          caches.open(ONBELLEK).then(function (c) {
            c.put(e.request, kopya);
          });
        }
        return yanit;
      });
    })
  );
});
