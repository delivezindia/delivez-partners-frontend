/* Delivez push service worker (Step 12). Firebase delivers data-only messages; we draw them here so
   we control the click target, grouping (tag) and whether the alert stays until tapped (new orders). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { data: { title: 'Delivez', body: event.data ? event.data.text() : '' } };
  }
  // FCM wraps our fields in `data`; tolerate a bare object too.
  const d = payload.data || payload;
  const urgent = d.urgent === '1';
  event.waitUntil(
    self.registration.showNotification(d.title || 'Delivez', {
      body: d.body || '',
      tag: d.tag || undefined,
      renotify: !!d.tag && urgent,
      requireInteraction: urgent,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: urgent ? [300, 120, 300, 120, 300] : undefined,
      data: { url: d.url || '/', notificationId: d.notificationId },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const same = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (same) {
        await same.focus();
        // Let the app route in-place (keeps state); fall back to a full navigation.
        same.postMessage({ type: 'dz-open', url: event.notification.data?.url || '/', notificationId: event.notification.data?.notificationId });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
