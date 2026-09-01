/**
 * Abu Hudhayfah Exchange & Transfers - Service Worker (Offline-First Cache)
 */

const CACHE_NAME = 'abuhudhayfah-cntract-v1.1.0';

const STATIC_ASSETS = [
  './',
  './index.html',
  './404.html',
  './manifest.json',
  './env.js',
  './assets/css/main.css',
  './assets/css/components.css',
  './assets/css/auth.css',
  './assets/css/print.css',
  './assets/images/logo.svg',
  './assets/images/stamp.svg',
  './assets/js/app.js',
  './assets/js/core/db.js',
  './assets/js/core/store.js',
  './assets/js/core/audit.js',
  './assets/js/data/constants.js',
  './assets/js/data/initial-data.js',
  './assets/js/services/pdf-service.js',
  './assets/js/services/supabase-service.js',
  './assets/js/services/backup-service.js',
  './assets/js/services/template-service.js',
  './assets/js/services/vehicle-service.js',
  './assets/js/modules/dashboard.js',
  './assets/js/modules/employees.js',
  './assets/js/modules/contracts.js',
  './assets/js/modules/templates.js',
  './assets/js/modules/clauses.js',
  './assets/js/modules/custodies.js',
  './assets/js/modules/vouchers.js',
  './assets/js/modules/vehicles.js',
  './assets/js/modules/salaries.js',
  './assets/js/modules/documents.js',
  './assets/js/modules/reports.js',
  './assets/js/modules/audit-log.js',
  './assets/js/modules/settings.js',
  './assets/js/ui/modal.js',
  './assets/js/ui/toast.js',
  './assets/js/utils/formatters.js',
  './assets/js/utils/validators.js',
  './assets/js/utils/helpers.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets for 100% offline operation');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Caching warning (some non-critical assets might be skipped):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/**
 * Requests that must NEVER be served from cache:
 *  - env.js  : يحتوي مفاتيح الاتصال المحقونة عند النشر (نسخة قديمة = فشل تسجيل الدخول)
 *  - التنقل  : لضمان الحصول على أحدث index.html بعد كل نشر
 *  - Supabase / أي مصادقة : يجب أن تمر مباشرة إلى الشبكة
 */
function isEnvRequest(url) {
  return url.pathname.endsWith('/env.js') || url.pathname === '/env.js';
}

function isCloudApi(url) {
  return url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // تجاهل كل ما ليس GET (تسجيل الدخول، الرفع، المزامنة...)
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // نداءات Supabase تمر دائماً إلى الشبكة مباشرة بدون أي تخزين
  if (isCloudApi(url)) return;

  // Network-first: env.js + صفحات التنقل
  if (isEnvRequest(url) || request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        })
    );
    return;
  }

  // Stale-while-revalidate لبقية الأصول الثابتة
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
