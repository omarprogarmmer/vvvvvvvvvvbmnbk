// ============================================
// Service Worker - my-app-v4
// ============================================

const CACHE_NAME = 'my-app-v2'; // ← لا تغيّره، الآلية تعتمد على فحص الكاش

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
  './g2_level1.html',
  './g2_t1.html',
  './g2_t2.html',
  './g2_t3.html',
  './g3_level1.html',
  './g3_t2.html',
  './g3_t3.html',
  './g4_level1.html',
  './g4_t3.html',
  './g4_t2.html',

  // ===== ملفات الإعداد =====
  './manifest.json',

  // ===== الصور =====
  './photo/3_e.jpg',
  './photo/3_j.jpg',
  './photo/4_dde.jpg',
  './photo/4_ddt.jpg',
  './photo/4_dt.jpg',
  './photo/d.png',
  './photo/d1.png',
  './photo/f1_1.png',
  './photo/gg1.png',
  './photo/gg2.jpg',
  './photo/gg3.png',
];

// ============================================
// ✅ دالة مساعدة: أضف الملف فقط إذا لم يكن موجوداً
// ============================================
async function addIfMissing(cache, url) {
  const existing = await cache.match(url);
  if (existing) {
    return { url, status: 'skipped' };
  }
  try {
    await cache.add(url);
    return { url, status: 'downloaded' };
  } catch (err) {
    return { url, status: 'failed', error: err };
  }
}

// ============================================
// 1) التثبيت: حمّل فقط الملفات الناقصة
// ============================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        console.log('📦 بدء التحقق من الملفات...');

        const total = PRECACHE_ASSETS.length;
        let processed = 0;   // كل ما تم فحصه
        let downloaded = 0;  // الملفات الجديدة فقط
        let skipped = 0;     // الملفات الموجودة مسبقاً
        let failed = 0;      // الملفات الفاشلة

        await Promise.allSettled(
          PRECACHE_ASSETS.map(async url => {
            const result = await addIfMissing(cache, url);

            processed++;
            if (result.status === 'downloaded') downloaded++;
            else if (result.status === 'skipped') skipped++;
            else failed++;

            // 📣 أرسل التقدم للصفحات
            broadcastProgress({
              processed,
              downloaded,
              skipped,
              failed,
              total,
            });

            if (result.status === 'downloaded') {
              console.log(`⬇️ (${processed}/${total}) تم تنزيل جديد:`, url);
            } else if (result.status === 'skipped') {
              console.log(`⏭️ (${processed}/${total}) موجود مسبقاً:`, url);
            } else {
              console.warn(`⚠️ (${processed}/${total}) فشل:`, url, result.error);
            }

            return result;
          })
        );

        console.log(`🎉 انتهى الفحص: جديد=${downloaded} | موجود=${skipped} | فشل=${failed}`);
        broadcastDone({ downloaded, skipped, failed, total });
        return self.skipWaiting();
      })
  );
});

// ============================================
// 📣 إرسال التقدم إلى كل الصفحات المفتوحة
// ============================================
function broadcastProgress(payload) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PRECACHE_PROGRESS',
        ...payload,
      });
    });
  });
}

function broadcastDone(payload) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PRECACHE_DONE',
        ...payload,
      });
    });
  });
}

// ============================================
// 2) التفعيل: احذف فقط الكاش القديم جداً
// ============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME && key.startsWith('my-app-'))
            .map(key => {
              console.log('🗑️ حذف كاش قديم:', key);
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

  // 🔁 إذا كان الطلب HTML
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        // إذا لم يكن في الكاش → اعرض صفحة الانتظار
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
    caches.open(CACHE_NAME).then(async cache => {
      let found = 0;
      for (const url of PRECACHE_ASSETS) {
        const match = await cache.match(url);
        if (match) found++;
      }

      if (found >= PRECACHE_ASSETS.length) {
        event.source?.postMessage({ type: 'PRECACHE_DONE' });
      } else {
        event.source?.postMessage({
          type: 'PRECACHE_PROGRESS',
          processed: found,
          total: PRECACHE_ASSETS.length,
          downloaded: 0,
          skipped: found,
          failed: 0,
        });
      }
    });
  }
});