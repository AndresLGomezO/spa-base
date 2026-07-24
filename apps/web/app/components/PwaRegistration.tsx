import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";

let ensureRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;

function waitForWorkerActivation(
  worker: ServiceWorker,
  timeoutMs: number,
): Promise<void> {
  if (worker.state === "activated") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Service worker activation timed out."));
    }, timeoutMs);

    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") {
        window.clearTimeout(timer);
        resolve();
        return;
      }
      if (worker.state === "redundant") {
        window.clearTimeout(timer);
        reject(new Error("Service worker became redundant during install."));
      }
    });
  });
}

/**
 * Explicitly register the Vite PWA service worker and wait until it is active.
 * Prefer this over workbox-window alone — registerSW() is fire-and-forget and
 * navigator.serviceWorker.ready can hang when no worker is installed yet.
 */
export function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  if (!ensureRegistrationPromise) {
    ensureRegistrationPromise = (async () => {
      try {
        // Still call for update prompts / autoUpdate wiring.
        try {
          registerSW({ immediate: true });
        } catch {
          // Ignore virtual module failures; we register explicitly below.
        }

        const swUrl = import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js";
        const registration = await navigator.serviceWorker.register(swUrl, {
          scope: "/",
          ...(import.meta.env.DEV ? { type: "module" as const } : {}),
        });

        const worker =
          registration.active ??
          registration.installing ??
          registration.waiting;
        if (worker && worker.state !== "activated") {
          await waitForWorkerActivation(worker, 15_000);
        }

        // Prefer controller-ready registration when available.
        if (registration.active) {
          return registration;
        }

        return await navigator.serviceWorker.ready;
      } catch (error) {
        console.warn("[pwa] Service worker registration failed:", error);
        // Allow a later retry after a failed attempt (e.g. transient Vite error).
        ensureRegistrationPromise = null;
        return null;
      }
    })();
  }

  return ensureRegistrationPromise;
}

export function PwaRegistration() {
  useEffect(() => {
    void ensureServiceWorkerRegistration();
  }, []);

  return null;
}
