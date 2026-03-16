self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const settingsClient = clients.find((client) => "focus" in client);
      if (settingsClient && "focus" in settingsClient) {
        return settingsClient.focus();
      }

      return self.clients.openWindow("/settings");
    })
  );
});
