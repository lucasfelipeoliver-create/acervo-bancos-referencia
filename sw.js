/* Service worker do BUSCADOR DE BANCOS V5 — gerado por publicar_pages.py.
   Cache versionado pelo build: publicar build novo troca este arquivo inteiro. */
'use strict';
const CACHE = 'buscador-v5-777f252c';
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
  // mesmo origin: cache-first; navegacao DA APP sai do index cacheado
  if (url.origin === location.origin) {
    /* ACHADO 03/09/2026 — `mode === 'navigate'` NAO e' so' a rota da app: o
       CLIQUE num link de documento (o caderno em PDF, a planilha da fonte)
       tambem e' navegacao. Com a regra antiga, clicar em ABRIR NA P.N devolvia
       o `index.html` cacheado em vez do arquivo — o usuario clicava e o
       documento nunca abria. Medido no site em 03/09; a verificacao anterior
       passou porque usava `fetch(HEAD)`, que NAO e' navegacao: provou que o
       arquivo existe, nao que o clique abre.
       Regra: navegacao para CAMINHO COM EXTENSAO (que nao seja .htm/.html) vai
       para a rede, sem interceptacao. */
    var ehArquivo = /\.[a-z0-9]{2,5}$/i.test(url.pathname) &&
                    !/\.html?$/i.test(url.pathname);
    if (e.request.mode === 'navigate' && ehArquivo) { return; }
    /* ACHADO 17/09/2026 — /app/ (pagina de instalacao do APK) e /vitrine/ sao PAGINAS PROPRIAS dentro do escopo:
       a regra "toda navegacao sai do index cacheado" devolvia o buscador no lugar delas (medido: ele abriu /app/
       no celular e caiu no site; reproduzido em Chromium com o SW ativo). Navegacao para SUBPASTA do escopo
       vai para a rede, sem interceptacao; so a raiz do escopo e' a app. */
    var raiz = new URL(self.registration.scope).pathname;
    var ehSubpasta = url.pathname.length > raiz.length && url.pathname.indexOf(raiz) === 0 &&
                     url.pathname.slice(raiz.length).indexOf('/') >= 0;
    if (e.request.mode === 'navigate' && ehSubpasta) { return; }
    e.respondWith(caches.open(CACHE).then(function (c) {
      const alvo = (e.request.mode === 'navigate') ? './index.html' : e.request;
      return c.match(alvo, { ignoreSearch: true }).then(function (hit) {
        if (hit) { return hit; }
        /* casca leve (16/09/2026): fatia de preco externa (_precos/*.js) entra no cache do build na
           1a carga — fora do PRECACHE (nao infla o install), disponivel offline depois. */
        var ehFatia = url.pathname.indexOf('/_precos/') >= 0;
        return fetch(e.request).then(function (resp) {
          if (ehFatia && resp && resp.ok) { c.put(e.request, resp.clone()); }
          return resp;
        });
      });
    }));
  }
  // outros origins (Drive etc.): nao intercepta
});
