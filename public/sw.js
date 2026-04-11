// Service Worker for Web Push notifications

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, tag, data: notifData } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag, // prevents duplicate notifications with same tag
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200],
      data: notifData,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/dashboard"));
});
