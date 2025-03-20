const CACHE_NAME = 'apptreino-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png'
];

// Instalação do service worker e cache de recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        // Em vez de addAll, que falha se qualquer recurso falhar,
        // vamos adicionar cada recurso individualmente
        const cachePromises = urlsToCache.map(url => {
          return fetch(url)
            .then(response => {
              if (!response.ok) {
                throw new Error(`Falha ao buscar ${url}, status: ${response.status}`);
              }
              return cache.put(url, response);
            })
            .catch(err => {
              console.warn(`Não foi possível adicionar ${url} ao cache: ${err.message}`);
              // Não falha completamente se apenas um recurso falhar
              return Promise.resolve();
            });
        });
        
        return Promise.all(cachePromises);
      })
  );
});

// Ativação do service worker e limpeza de caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
});

// Estratégia de cache: network first, fallback para cache
self.addEventListener('fetch', event => {
  // Pular requisições não HTTP
  if (!event.request.url.startsWith('http')) return;
  
  // Pular requisições para API que precisam de dados atualizados
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone da resposta para armazenar no cache
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then(cache => {
            // Armazenar no cache se for uma resposta válida
            if (event.request.method === 'GET' && response.status === 200) {
              cache.put(event.request, responseToCache);
            }
          })
          .catch(err => {
            console.warn(`Erro ao salvar no cache: ${err.message}`);
          });
          
        return response;
      })
      .catch(() => {
        // Se a rede falhar, tenta buscar do cache
        return caches.match(event.request)
          .catch(err => {
            console.warn(`Erro ao buscar do cache: ${err.message}`);
            return new Response('Recurso não disponível offline', { status: 503 });
          });
      })
  );
}); 