// MaxOne service worker — shows an OS notification for a triggered alert, but ONLY when no
// app window is focused (a focused tab already got the in-app socket toast → no double-notify).
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (clients.some((c) => c.focused)) return; // a tab is focused → socket toast handled it
      await self.registration.showNotification(`🔔 ${data.symbol} ${data.direction} ${data.targetPrice}`, {
        body: `now ${data.price}`,
        tag: data.id,
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/alerts'));
});
