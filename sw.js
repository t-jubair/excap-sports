/* minimal service worker — enables PWA install; network pass-through (no stale cache) */
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => self.clients.claim());
self.addEventListener("fetch", e => { /* pass-through */ });
