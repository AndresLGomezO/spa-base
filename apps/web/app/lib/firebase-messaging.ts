import {
  getMessaging,
  getToken,
  isSupported,
  deleteToken,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";

import { appConfig } from "../config/app-config";
import { ensureServiceWorkerRegistration } from "../components/PwaRegistration";
import { deletePushToken, listPushTokens, upsertPushToken } from "./api-client";
import { firebaseApp } from "./firebase";

export type PushPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

type PushRegistrationResult =
  | { readonly status: "registered"; readonly token: string }
  | { readonly status: "denied" }
  | { readonly status: "unsupported"; readonly reason: string }
  | { readonly status: "error"; readonly message: string };

export type PushRegistrationState = "on" | "off" | "unsupported" | "denied";

type ClearPushRegistrationResult =
  | { readonly status: "cleared" }
  | { readonly status: "error"; readonly message: string };

let messagingPromise: Promise<Messaging | null> | null = null;

function readBrowserPermission(): PushPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

export function getPushPermissionState(): PushPermissionState {
  return readBrowserPermission();
}

export function isPushConfigured(): boolean {
  return appConfig.firebase.vapidKey.trim().length > 0;
}

async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (messagingPromise) {
    return messagingPromise;
  }
  messagingPromise = (async () => {
    if (!(await isSupported())) {
      return null;
    }
    return getMessaging(firebaseApp);
  })();
  return messagingPromise;
}

const SERVICE_WORKER_READY_TIMEOUT_MS = 12_000;

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await Promise.race([
      ensureServiceWorkerRegistration(),
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), SERVICE_WORKER_READY_TIMEOUT_MS);
      }),
    ]);
    if (registration?.active) {
      return registration;
    }
    // Registration exists but is not active yet — last chance via ready.
    if (registration) {
      try {
        return await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => {
            window.setTimeout(() => resolve(null), 5_000);
          }),
        ]);
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Silent getToken — never prompts for permission. */
async function getCurrentPushToken(): Promise<string | null> {
  if (!isPushConfigured()) {
    return null;
  }
  if (readBrowserPermission() !== "granted") {
    return null;
  }

  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    return null;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return null;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: appConfig.firebase.vapidKey,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (error) {
    console.warn("[push] Failed to read current token:", error);
    return null;
  }
}

export async function resolvePushRegistrationState(): Promise<PushRegistrationState> {
  if (!isPushConfigured()) {
    return "unsupported";
  }

  const permission = readBrowserPermission();
  if (permission === "unsupported") {
    return "unsupported";
  }
  if (permission === "denied") {
    return "denied";
  }

  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    return "unsupported";
  }

  if (permission !== "granted") {
    return "off";
  }

  const token = await getCurrentPushToken();
  if (!token) {
    return "off";
  }

  try {
    const { items } = await listPushTokens();
    return items.some((item) => item.token === token) ? "on" : "off";
  } catch (error) {
    console.warn("[push] Failed to list registered tokens:", error);
    return "off";
  }
}

export async function requestPushPermissionAndRegisterToken(): Promise<PushRegistrationResult> {
  if (!isPushConfigured()) {
    console.warn(
      "[push] VITE_FIREBASE_VAPID_KEY is not set; browser push is unavailable.",
    );
    return {
      status: "unsupported",
      reason: "missing_vapid",
    };
  }

  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return { status: "unsupported", reason: "no_notification_api" };
  }

  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    return { status: "unsupported", reason: "messaging_unsupported" };
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return { status: "unsupported", reason: "no_service_worker" };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { status: "denied" };
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: appConfig.firebase.vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) {
      return {
        status: "unsupported",
        reason: "empty_token",
      };
    }

    await upsertPushToken({
      token,
      ...(typeof navigator !== "undefined" && navigator.userAgent
        ? { userAgent: navigator.userAgent }
        : {}),
    });

    return { status: "registered", token };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register push token.";
    console.error("[push] Failed to register token:", error);
    return { status: "error", message };
  }
}

type ForegroundPushPayload = {
  readonly title: string;
  readonly body?: string;
  readonly level: "info" | "error";
  readonly url: string;
  readonly raw: MessagePayload;
};

/**
 * Subscribe to FCM messages delivered while this tab is focused.
 * Returns an unsubscribe function. No-ops when messaging is unsupported.
 */
export async function subscribeToForegroundMessages(
  onPush: (payload: ForegroundPushPayload) => void,
): Promise<() => void> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    const title =
      (typeof payload.data?.title === "string" ? payload.data.title : null) ??
      payload.notification?.title ??
      "Notification";
    const body =
      (typeof payload.data?.body === "string" ? payload.data.body : null) ??
      payload.notification?.body ??
      undefined;
    const level =
      payload.data?.level === "error" || payload.data?.level === "info"
        ? payload.data.level
        : "info";
    const url =
      typeof payload.data?.url === "string"
        ? payload.data.url
        : "/notifications";
    onPush({ title, body, level, url, raw: payload });
  });
}

export async function clearLocalPushRegistration(): Promise<ClearPushRegistrationResult> {
  try {
    const messaging = await getMessagingIfSupported();
    const registration = await getServiceWorkerRegistration();
    let token: string | null = null;

    if (messaging && registration && isPushConfigured()) {
      try {
        token = await getToken(messaging, {
          vapidKey: appConfig.firebase.vapidKey,
          serviceWorkerRegistration: registration,
        });
      } catch {
        token = null;
      }
    }

    if (token) {
      await deletePushToken({ token });
    }

    if (messaging) {
      try {
        await deleteToken(messaging);
      } catch (error) {
        console.warn("[push] Failed to delete local FCM token:", error);
      }
    }

    return { status: "cleared" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to disable browser notifications.";
    console.error("[push] Failed to clear local registration:", error);
    return { status: "error", message };
  }
}
