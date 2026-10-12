// ============================================
// Service Worker - my-app-v4
// ============================================

const CACHE_NAME = 'my-app-v4'; // ← غيّر الرقم عند كل تحديث

const PRECACHE_ASSETS = [
  './losson.css',
  './style_test.css',
  './losson.js',
  'photo/Built in Silence.jpg',
  'photo/d.png',
  'photo/d1.png',
  'photo/f1_1.png',
  'photo/SnapBG.ai_1788007924138.png',
  'photo/SnapBG.ai_1788007926352.png',

  './index.html',
  './about.html',
  './manifest.json',
  './g1_level1.html',
  './g1_t1.html',
  './g1_t2.html',
  './profile.html',
  './stages.html',
  './script_test.js',
];

// ============================================
// 1) التثبيت: حمّل كل الملفات مرة واحدة
// ============================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ============================================
// 2) التفعيل: احذف كل الكاش القديم
// ============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)   // احتفظ بالكاش الحالي فقط
            .map(key => {
              console.log('🗑️ حذف الكاش القديم:', key);
              return caches.delete(key);         // ← حذف الكاش
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ============================================
// 3) الجلب: cache-first مع تحديث تلقائي
// ============================================
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }

          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // إذا فشل الاتصال وطلب HTML → أرجع index.html
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ============================================
// 4) رسالة من الصفحة → احذف الكاش فوراً
// ============================================
self.addEventListener('message', event => {
  if (event.data === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => {
          console.log('✅ تم حذف كل الكاش');
          return self.registration.unregister(); // اختياري: إلغاء SW
        })
        .then(() => self.clients.matchAll())
        .then(clients => clients.forEach(c => c.navigate(c.url)))
    );
  }
});