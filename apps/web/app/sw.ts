/// <reference lib="webworker" />

import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { clientsClaim } from "workbox-core";
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

// Register notificationclick before FCM so custom behavior is preserved.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    typeof event.notification.data === "object" &&
    event.notification.data !== null &&
    "url" in event.notification.data &&
    typeof (event.notification.data as { url?: unknown }).url === "string"
      ? (event.notification.data as { url: string }).url
      : "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && targetUrl) {
            await (client as WindowClient).navigate(targetUrl);
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Dev: Vite/React Router do not serve a fetchable /index.html for Workbox
// install (404 → SW becomes redundant). Skip precache/navigate fallback;
// FCM only needs an active worker. Production uses the real build manifest.
if (import.meta.env.DEV) {
  precacheAndRoute([]);
} else {
  precacheAndRoute(self.__WB_MANIFEST);
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL("/index.html"), {
      denylist: [/^\/api\//],
    }),
  );
}

// Static imports only — dynamic import() is disallowed on ServiceWorkerGlobalScope.
try {
  const firebaseApp = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "fake-api-key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "localhost",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "demo-project-base",
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ??
      "demo-project-base.appspot.com",
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "123456789",
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:123456789:web:abcdef",
  });

  const messaging = getMessaging(firebaseApp);

  onBackgroundMessage(messaging, (payload) => {
    // Notification payloads are displayed by the browser; only render data-only.
    if (payload.notification) {
      return;
    }
    const title =
      (typeof payload.data?.title === "string" ? payload.data.title : null) ??
      "Notification";
    const body =
      typeof payload.data?.body === "string" ? payload.data.body : undefined;
    const url =
      typeof payload.data?.url === "string"
        ? payload.data.url
        : "/notifications";

    // Return the promise so the SW stays alive until the OS toast is shown.
    return self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      data: { url },
    });
  });
} catch (error) {
  console.warn("[sw] Firebase messaging init failed:", error);
}
