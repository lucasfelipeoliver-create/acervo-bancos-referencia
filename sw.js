/* Service worker do BUSCADOR DE BANCOS V5 — gerado por publicar_pages.py.
   Atualização imediata com skipWaiting() instantâneo e network-first na navegação. */
'use strict';
// Versão exclusiva da correção do login móvel: obriga clientes TWA/PWA a
// descartar o HTML anterior e assumir a nova tela na próxima abertura.
const CACHE = 'buscador-v5-mobile-gate-40962f2';
const CACHE_FONTES = 'buscador-fontes-v1';
const PRECACHE = ['./manifest.webmanifest', './icone-192.png', './icone-512.png', './icone-maskable-512.png'];

self.addEventListener('install', function (e) {
  // Padrão do GitHub/Chrome: ativa IMEDIATAMENTE sem esperar download de arquivos pesados
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(PRECACHE);
  }));
});

self.addEventListener('activate', function (e) {
  // Apaga todos os caches antigos imediatamente e assume o controle dos clientes
  e.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.filter(function (n) { return n !== CACHE && n !== CACHE_FONTES; })
      .map(function (n) { return caches.delete(n); }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  // Fontes do Google: cache-first persistente
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

  // Origem local:
  if (url.origin === location.origin) {
    var ehArquivo = /\.[a-z0-9]{2,5}$/i.test(url.pathname) && !/\.html?$/i.test(url.pathname);
    if (e.request.mode === 'navigate' && ehArquivo) { return; }

    var raiz = new URL(self.registration.scope).pathname;
    var ehSubpasta = url.pathname.length > raiz.length && url.pathname.indexOf(raiz) === 0 &&
                     url.pathname.slice(raiz.length).indexOf('/') >= 0;
    if (e.request.mode === 'navigate' && ehSubpasta) { return; }

    // NAVEGAÇÃO DA APLICAÇÃO: NETWORK-FIRST COM FALLBACK PARA CACHE OFFLINE
    if (e.request.mode === 'navigate') {
      e.respondWith(
        fetch(e.request, { cache: 'no-store' }).then(function (resp) {
          if (resp && resp.ok) {
            var clone = resp.clone();
            caches.open(CACHE).then(function (c) { c.put('./index.html', clone); });
            return resp;
          }
          return caches.open(CACHE).then(function (c) { return c.match('./index.html'); });
        }).catch(function () {
          return caches.open(CACHE).then(function (c) { return c.match('./index.html'); });
        })
      );
      return;
    }

    // Demais recursos: cache-first
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
        if (hit) { return hit; }
        var ehFatia = url.pathname.indexOf('/_precos/') >= 0;
        return fetch(e.request).then(function (resp) {
          if (ehFatia && resp && resp.ok) { c.put(e.request, resp.clone()); }
          return resp;
        });
      });
    }));
  }
});
