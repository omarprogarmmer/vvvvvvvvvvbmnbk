// غيّر الرقم عند كل تحديث لملفاتك ليعرف المتصفح أن هناك نسخة جديدة
const CACHE_NAME = 'my-app-v2';

// ضع هنا كل الملفات التي تريد تحميلها مسبقاً
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',      // إذا عندك ملف CSS منفصل
  './script.js',      // إذا عندك ملف JS منفصل
  './icon-192.png',   // إذا عندك أيقونات
  './icon-512.png'
];

// 1) التثبيت: حمّل كل الملفات مرة واحدة
self.addEventListener('install', event => {
  console.log('[SW] تثبيت وتحميل الملفات...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // نستخدم addAll لتحميل كل الملفات دفعة واحدة
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] تم تحميل كل الملفات بنجاح ✅');
        // تفعيل النسخة الجديدة فوراً بدل انتظار إغلاق كل التبويبات
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] فشل تحميل بعض الملفات:', err);
      })
  );
});

// 2) التفعيل: احذف أي كاش قديم
self.addEventListener('activate', event => {
  console.log('[SW] تفعيل النسخة الجديدة...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] حذف الكاش القديم:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 3) الجلب: cache-first (لا تحمّل من الشبكة إذا الملف محفوظ)
self.addEventListener('fetch', event => {
  // تجاهل الطلبات غير GET (مثل POST)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // ✅ موجود في الكاش → أرجعه فوراً بدون شبكة
      if (cachedResponse) {
        return cachedResponse;
      }

      // ❌ غير موجود → حمّله من الشبكة واحفظه للاستخدام لاحقاً
      return fetch(event.request).then(networkResponse => {
        // تحقق أن الاستجابة صالحة قبل تخزينها
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return networkResponse;
      }).catch(() => {
        // إذا فشل الاتصال وطلب HTML → أرجع صفحة index.html
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
