const CACHE_NAME = 'my-app-v4';

const PRECACHE_ASSETS = [
  
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Promise.allSettled بدلاً من addAll — حتى لو فشل ملف، البقية تُحفظ
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('⚠️ فشل تحميل:', url))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        const accept = event.request.headers.get('accept') || '';
        if (accept.includes('text/html')) {
          return caches.match(event.request).then(c => c || caches.match('./index.html'));
        }
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    console.log('💚 Service Worker نشط');
  }
});