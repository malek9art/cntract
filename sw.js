/**
 * Abu Hudhayfah Exchange & Transfers - Service Worker (Offline-First Cache)
 */

const CACHE_NAME = 'abuhudhayfah-cntract-v1.0.2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './404.html',
  './manifest.json',
  './env.js',
  './assets/css/main.css',
  './assets/css/components.css',
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

self.addEventListener('fetch', (event) => {
  // Try network first, fall back to cache; or cache first for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update in background if online
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {
          // Silent catch in offline mode
        });
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback for HTML documents in case of network disconnect
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
