/* Service worker do BUSCADOR DE BANCOS V5 — gerado por publicar_pages.py.
   Cache versionado pelo build: publicar build novo troca este arquivo inteiro. */
'use strict';
const CACHE = 'buscador-v5-4e183f10';
const CACHE_FONTES = 'buscador-fontes-v1';
/* index UMA vez so no PRECACHE ('./' fora): com './' e './index.html' o addAll
   baixava e guardava os 37 MB em DOBRO (medido 01/09/2026); toda navegacao e
   servida do './index.html' pelo handler de fetch. */
const PRECACHE = ['./index.html', './manifest.webmanifest',
                  './icone-192.png', './icone-512.png', './icone-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.filter(function (n) { return n !== CACHE && n !== CACHE_FONTES; })
      .map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  // fontes do Google: cache-first persistente entre builds (fontes nao mudam)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE_FONTES).then(function (c) {
      return c.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (resp) {
          c.put(e.request, resp.clone());
          return resp;
        });
      });
    }));
    return;
  }
  // mesmo origin: cache-first; NAVEGACAO sempre sai do index cacheado
  if (url.origin === location.origin) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      const alvo = (e.request.mode === 'navigate') ? './index.html' : e.request;
      return c.match(alvo, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(e.request);
      });
    }));
  }
  // outros origins (Drive etc.): nao intercepta
});
