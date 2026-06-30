/* EX-CAP — kill-switch service worker.
   Unregisters itself and clears every cache so the browser fetches fresh files. */
   self.addEventListener("install", e => self.skipWaiting());
   self.addEventListener("activate", e => {
     e.waitUntil((async () => {
       try {
         const keys = await caches.keys();
         await Promise.all(keys.map(k => caches.delete(k)));
         const regs = await self.registration.unregister();
         const clients = await self.clients.matchAll({ type: "window" });
         clients.forEach(c => c.navigate(c.url));
       } catch (e) {}
     })());
   });