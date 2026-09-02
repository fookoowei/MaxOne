// MaxOne service worker — shows an OS notification for any pushed notification, but ONLY when no
// app window is focused (a focused tab already got the in-app socket toast → no double-notify).
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (clients.some((c) => c.focused)) return; // a tab is focused → socket toast handled it
      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag,
        data: { url: data.url },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.notification.close();
  event.waitUntil(self.clients.openWindow(url));
});
