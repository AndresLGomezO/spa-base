const STORAGE_PREFIX = "push-optin:";
const MAX_SNOOZE_COUNT = 3;

type PushOptInStoredState =
  | { readonly never: true; readonly count: number }
  | { readonly laterUntil: number; readonly count: number };

function storageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}`;
}

export function readPushOptInState(uid: string): PushOptInStoredState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    if (!raw) {
      return null;
    }
    if (raw === "never") {
      return { never: true, count: MAX_SNOOZE_COUNT };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (record.never === true) {
      return {
        never: true,
        count:
          typeof record.count === "number" ? record.count : MAX_SNOOZE_COUNT,
      };
    }
    if (typeof record.laterUntil === "number") {
      return {
        laterUntil: record.laterUntil,
        count: typeof record.count === "number" ? record.count : 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function writePushOptInState(uid: string, state: PushOptInStoredState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if ("never" in state && state.never) {
      window.localStorage.setItem(storageKey(uid), "never");
      return;
    }
    window.localStorage.setItem(storageKey(uid), JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** Returns true when the soft-ask toast may be shown for this user. */
export function shouldShowPushSoftAsk(uid: string, now = Date.now()): boolean {
  const state = readPushOptInState(uid);
  if (!state) {
    return true;
  }
  if ("never" in state && state.never) {
    return false;
  }
  if ("laterUntil" in state && now < state.laterUntil) {
    return false;
  }
  return true;
}

/**
 * Snooze the soft-ask. After {@link MAX_SNOOZE_COUNT} snoozes, store `"never"`
 * so we stop asking (Account → General remains available).
 */
export function snoozePushSoftAsk(
  uid: string,
  durationMs: number,
  now = Date.now(),
): void {
  const prev = readPushOptInState(uid);
  const count = (prev && "count" in prev ? prev.count : 0) + 1;
  if (count >= MAX_SNOOZE_COUNT) {
    writePushOptInState(uid, { never: true, count });
    return;
  }
  writePushOptInState(uid, { laterUntil: now + durationMs, count });
}

export function clearPushOptInState(uid: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(storageKey(uid));
  } catch {
    // Ignore.
  }
}

export const PUSH_SOFT_ASK_SNOOZE_NOT_NOW_MS = 7 * 24 * 60 * 60 * 1000;
export const PUSH_SOFT_ASK_SNOOZE_DISMISS_MS = 24 * 60 * 60 * 1000;
export const PUSH_SOFT_ASK_MAX_COUNT = MAX_SNOOZE_COUNT;
