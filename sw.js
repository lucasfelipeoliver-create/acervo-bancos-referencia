/* Service worker do BUSCADOR DE BANCOS V5 — gerado por publicar_pages.py.
   Atualização imediata com skipWaiting() instantâneo e network-first na navegação. */
'use strict';
const CACHE = 'buscador-v5-4c8da092';
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
    // 22/09/2026 (achado ao vivo, aba "Planejamento de controle de acesso" 852dc696 + confirmado por
    // execução real): com o porteiro de acesso ligado, a raiz nunca mais responde 200 pra quem não tem
    // sessão -- SEMPRE 302. fetch() dentro do SW numa navegação usa redirect:'manual', então a resposta
    // chega como opaqueredirect (status 0, ok=false), NUNCA cai no primeiro `if`. Isso jogava pro cache
    // de ./index.html, que nunca tinha sido preenchido (só enche em navegação `ok`, que com o porteiro
    // não acontece mais) -- c.match() vinha undefined e respondWith(undefined) é erro de rede duro:
    // Chrome mostrava ERR_FAILED pra qualquer aparelho que já tivesse o SW antigo instalado. Um
    // redirecionamento (opaqueredirect) é resposta LEGÍTIMA: devolver direto deixa o navegador seguir
    // o Location de verdade (é o jeito padrão de um SW ser transparente a redirect). Só cai no cache
    // quando a rede FALHA de verdade -- e mesmo aí, cache vazio agora cai num fetch() simples em vez de
    // undefined.
    if (e.request.mode === 'navigate') {
      e.respondWith(
        fetch(e.request, { cache: 'no-store' }).then(function (resp) {
          if (resp && resp.ok) {
            var clone = resp.clone();
            caches.open(CACHE).then(function (c) { c.put('./index.html', clone); });
            return resp;
          }
          if (resp && (resp.type === 'opaqueredirect' || resp.redirected)) { return resp; }
          return caches.open(CACHE).then(function (c) {
            return c.match('./index.html').then(function (hit) { return hit || fetch(e.request); });
          });
        }).catch(function () {
          return caches.open(CACHE).then(function (c) {
            return c.match('./index.html').then(function (hit) { return hit || fetch(e.request); });
          });
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
