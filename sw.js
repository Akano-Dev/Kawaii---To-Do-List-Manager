/**
 * PixiDo Service Worker
 * Caches all static assets for full offline support.
 */

const CACHE_NAME    = 'pixido-v1';
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
//  FETCH — serve from cache, fall back to network
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

  // ---- App shell: cache-first, network fallback ----
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;

        try {
          const response = await fetch(request);
          // Cache successful responses for HTML/CSS/JS/images
          if (response.ok) {
            const ct = response.headers.get('content-type') || '';
            if (
              ct.includes('text/html') ||
              ct.includes('text/css') ||
              ct.includes('javascript') ||
              ct.includes('image/') ||
              ct.includes('font/')
            ) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(request, response.clone());
            }
          }
          return response;
        } catch {
          // Offline fallback
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503 });
        }
      })
    );
    return;
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
