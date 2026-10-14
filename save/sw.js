// ============================================
// Service Worker - my-app-v4
// ============================================

const CACHE_NAME = 'my-app-v4'; // ← غيّر الرقم عند كل تحديث

const PRECACHE_ASSETS = [
  // ===== ملفات CSS =====
  './losson.css',
  './style_test.css',

  // ===== ملفات JavaScript =====
  './losson.js',
  './script_test.js',

  // ===== ملفات HTML =====
  './index.html',
  './about.html',
  './profile.html',
  './stages.html',
  './loading.html',
  './g1_level1.html',
  './g1_t1.html',
  './g1_t2.html',
  './drag3.html',
  './drag4.html',
  './drag5.html',
  './drag6.html',
  './drag7.html',
  './drag8.html',
  './drag9.html',
  './drag10.html',
  './drag11.html',
  './drag12.html',
  './drag13.html',
  './drag14.html',
  './drag15.html',
  './drag16.html',
  './drag17.html',
  './drag18.html',
  './drag19.html',

  // ===== ملفات الإعداد =====
  './manifest.json',

  // ===== الصور =====
  'photo/Built in Silence.jpg',
  'photo/d.png',
  'photo/d1.png',
  'photo/f1_1.png',
  'photo/SnapBG.ai_1788007924138.png',
  'photo/SnapBG.ai_1788007926352.png',
];

// ============================================
// 1) التثبيت: حمّل كل الملفات مرة واحدة
// ============================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        console.log('📦 بدء تحميل جميع الملفات...');

        let loaded = 0;
        const total = PRECACHE_ASSETS.length;

        // ✅ تحميل كل ملف على حدة + إرسال التقدم للصفحات
        await Promise.allSettled(
          PRECACHE_ASSETS.map(url =>
            cache.add(url)
              .then(() => {
                loaded++;
                broadcastProgress(loaded, total);
                console.log(`✅ (${loaded}/${total}) تم تحميل:`, url);
              })
              .catch(err => {
                loaded++;
                broadcastProgress(loaded, total);
                console.warn('⚠️ فشل تحميل:', url, err);
              })
          )
        );

        console.log('🎉 انتهى تحميل جميع الملفات');
        broadcastDone();
        return self.skipWaiting();
      })
  );
});

// ============================================
// 📣 إرسال التقدم إلى كل الصفحات المفتوحة
// ============================================
function broadcastProgress(loaded, total) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PRECACHE_PROGRESS',
        loaded,
        total,
      });
    });
  });
}

function broadcastDone() {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'PRECACHE_DONE' });
    });
  });
}

// ============================================
// 2) التفعيل: احذف كل الكاش القديم
// ============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('🗑️ حذف الكاش القديم:', key);
              return caches.delete(key);
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

  const url = new URL(event.request.url);

  // 🔁 إذا كان الطلب HTML ونحن في أول تثبيت → أظهر loading.html
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        // إذا كان الملف غير موجود في الكاش (زيارة أولى)
        return caches.match('./loading.html').then(loading => {
          if (loading) return loading;
          return fetch(event.request);
        });
      })
    );
    return;
  }

  // باقي الملفات: cache-first عادي
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
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ============================================
// 4) رسائل من الصفحة
// ============================================
self.addEventListener('message', event => {
  const data = event.data;

  // 🗑️ حذف الكاش
  if (data === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => {
          console.log('✅ تم حذف كل الكاش');
          return self.registration.unregister();
        })
        .then(() => self.clients.matchAll())
        .then(clients => clients.forEach(c => c.navigate(c.url)))
    );
  }

  // 💚 KEEP_ALIVE
  if (data && data.type === 'KEEP_ALIVE') {
    console.log('💚 KEEP_ALIVE مستلم');
  }

  // 🕐 صفحة الانتظار جاهزة → أعد إرسال آخر تقدم
  if (data && data.type === 'PAGE_READY') {
    // إذا كانت كل الملفات محمّلة → أبلغ الصفحة بالانتهاء فورًا
    caches.open(CACHE_NAME).then(cache => {
      cache.keys().then(keys => {
        if (keys.length >= PRECACHE_ASSETS.length - 1) {
          event.source?.postMessage({ type: 'PRECACHE_DONE' });
        } else {
          event.source?.postMessage({
            type: 'PRECACHE_PROGRESS',
            loaded: keys.length,
            total: PRECACHE_ASSETS.length,
          });
        }
      });
    });
  }
});