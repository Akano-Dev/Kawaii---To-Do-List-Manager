/**
 * PixiDo Service Worker
 * Caches all static assets for full offline support.
 * BUMP THIS VERSION to force cache refresh on all clients.
 */

const CACHE_NAME    = 'pixido-v3';
const OFFLINE_URL   = '/offline.html';

// Everything to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/pages/login.html',
  '/pages/signup.html',
  '/pages/dashboard.html',
  '/pages/settings.html',
  '/pages/profile.html',
  '/styles/base.css',
  '/styles/landing.css',
  '/styles/auth.css',
  '/styles/dashboard.css',
  '/styles/settings.css',
  '/styles/profile.css',
  '/components/db.js',
  '/components/router.js',
  '/components/ui.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
];

// Google Fonts — cache on first use
const FONT_CACHE = 'pixido-fonts-v1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// ============================================================
//  INSTALL — pre-cache all static assets
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ============================================================
//  ACTIVATE — clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================
//  FETCH — network-first for HTML, cache-first for assets
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // ---- Google Fonts: cache-first ----
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          cache.put(request, response.clone());
          return response;
        } catch {
          return cached || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    const isHTML = request.headers.get('accept')?.includes('text/html') ||
                   url.pathname.endsWith('.html') || url.pathname === '/';
    const isAsset = url.pathname.match(/\.(css|js|png|jpg|svg|ico|woff2?)$/);

    if (isHTML) {
      // ---- HTML pages: NETWORK-FIRST so updates always show ----
      event.respondWith(
        fetch(request)
          .then(response => {
            // Cache the fresh response
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(c => c.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline: serve cached version or offline page
            return caches.match(request)
              .then(cached => cached || caches.match(OFFLINE_URL));
          })
      );
    } else if (isAsset) {
      // ---- Static assets (CSS/JS/images): cache-first, update in background ----
      event.respondWith(
        caches.match(request).then(cached => {
          const fetchPromise = fetch(request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(c => c.put(request, response.clone()));
            }
            return response;
          });
          return cached || fetchPromise;
        })
      );
    }
    // All other requests: let browser handle normally
  }
});

// ============================================================
//  MESSAGE — handle skip-waiting from install prompt
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
