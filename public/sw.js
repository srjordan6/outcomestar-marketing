/* ===========================================================================
 * outcomestar service worker - v312 (2026-07-21)
 *
 * DESIGN RULE, non-negotiable: this worker MUST NEVER serve a stale portal.js
 * or a stale portal.html. The portal ships behind a ?v=N cache-buster that is
 * bumped on every release; a service worker that caches app code would defeat
 * that discipline and strand parents on an old build with no way to recover
 * short of clearing site data. So:
 *
 *   - portal.js, portal.html, and every navigation  -> NETWORK ONLY (+ offline
 *     fallback page when the network is genuinely gone)
 *   - the API (focms-api.onrender.com)              -> NETWORK ONLY, never cached
 *   - icons / manifest / favicon                    -> cache-first (immutable)
 *
 * The only thing precached is the app shell's static furniture. That is enough
 * for install-to-home-screen and a civil offline message; it is NOT an offline
 * data-entry mode. Offline capture (queue writes in IndexedDB, replay on
 * reconnect) is a separate, much larger piece of work - see NOT DONE below.
 *
 * NOT DONE (deliberately):
 *   - offline record capture / background sync
 *   - push notifications
 *   - caching of media (files are large and quota-sensitive)
 * ======================================================================== */

const CACHE = 'outcomestar-static-v312a';

// NOTE: the host strips .html (that is why the portal lives at /portal, not
// /portal.html). Requesting /offline.html returns a 307 to /offline, and a
// redirect is not a usable navigation fallback - so the extensionless path is
// the canonical one here.
const PRECACHE = [
  '/offline',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(PRECACHE); })
      // One missing file must not abort the whole install.
      .catch(function () { return null; })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Let the page tell a waiting worker to take over immediately.
self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

function isStaticAsset(url) {
  return /\.(png|svg|ico|webmanifest|woff2?)$/i.test(url.pathname);
}

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;                       // never touch writes

  const url = new URL(req.url);

  // The API is the system of record - it is never cached, not even briefly.
  if (url.hostname.indexOf('focms-api') === 0 ||
      url.hostname === 'focms-api.onrender.com') return;

  // App code: always from the network. No cache, no fallback, no exceptions.
  if (url.origin === self.location.origin &&
      /^\/portal\.js$|^\/portal(\.html)?$/.test(url.pathname)) return;

  // Navigations: network first, offline page only when the network fails.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match('/offline').then(function (r) {
          return r || new Response('Offline', {
            status: 503, headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
    );
    return;
  }

  // Static furniture: cache-first, refreshed in the background.
  if (url.origin === self.location.origin && isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        const net = fetch(req).then(function (res) {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      })
    );
  }
});
