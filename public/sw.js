// Service Worker for Web Push notifications

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "4th Quarter", body: event.data.text() || "New alert" };
  }

  const { title = "4th Quarter", body = "", tag, data: notifData } = data;

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
