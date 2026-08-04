/* global self, clients */

/*
 * HyperBee / Commerce AI — push notification service worker.
 *
 * Runs in the background even when the app is closed. Receives push messages
 * from the browser's push service and shows native OS notifications.
 *
 * The notification payload is built by the server (src/lib/server/push/send.ts)
 * and contains: title, body, icon, badge, image, vibrate, tag, renotify,
 * requireInteraction, actions and a data.url deep link.
 */

const CACHE_NAME = "hyperbee-v1";
const PRECACHE_URLS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/badge-96.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------- push event
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // fall back to a plain message when the payload isn't JSON
    const text = event.data ? event.data.text() : "";
    payload = { title: "HyperBee", body: text };
  }

  const title = payload.title || "Nuevo pedido recibido";
  const options = {
    body: payload.body || "Un cliente realizó un pedido.",
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/badge-96.png",
    image: payload.image,
    vibrate: payload.vibrate || [200, 100, 200],
    tag: payload.tag || `push-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    actions: payload.actions || [{ action: "view", title: "Ver pedido" }],
    data: {
      url: payload.url || "/app/orders",
      orderId: payload.orderId,
      businessId: payload.businessId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ------------------------------------------------------- notification clicks
async function openOrder(url) {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const appUrl = url || "/app/orders";

  for (const client of all) {
    if ("focus" in client) {
      client.focus();
      if ("navigate" in client && client.url && client.url !== appUrl) {
        client.navigate(appUrl);
      }
      return;
    }
  }
  await self.clients.openWindow(appUrl);
}

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  notification.close();

  if (event.action === "close") return;

  const url = (notification.data && notification.data.url) || "/app/orders";
  event.waitUntil(openOrder(url));
});

// ------------------------------------------------------- push subscription
self.addEventListener("pushsubscriptionchange", (event) => {
  // The subscription rotated (browser-side). Notify open app windows so the
  // app can re-register the new subscription with the backend automatically.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" });
      });
    }),
  );
});

// ------------------------------------------------------------------ messages
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
