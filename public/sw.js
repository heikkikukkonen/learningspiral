self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    event.notification &&
    event.notification.data &&
    typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/settings";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find(
        (client) => "focus" in client && "url" in client && String(client.url).includes(targetUrl)
      );
      if (matchingClient && "focus" in matchingClient) {
        return matchingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Noema";
  const body = payload.body || "Sinulle on uusi muistutus.";
  const url = payload.url || "/settings";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      badge: "/pwa-icon-192.png",
      icon: "/pwa-icon-192.png",
      data: {
        url
      }
    })
  );
});
