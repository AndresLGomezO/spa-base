import type { DebugEvent } from "../../lib/api-client";

import { buildDebugRecordKey } from "./dismissed-debug-records";

const SEED_PREFIX = "debugger:deep-link-seed:";
/** Seeds must survive `window.open(..., "noopener")` (new tab = empty sessionStorage). */
const SEED_TTL_MS = 5 * 60 * 1000;

type SeedEnvelope = {
  readonly savedAt: number;
  readonly event: DebugEvent;
};

function seedStorageKey(recordKey: string): string {
  return `${SEED_PREFIX}${recordKey}`;
}

function isDebugEventShape(value: unknown): value is DebugEvent {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as DebugEvent).id === "string" &&
    typeof (value as DebugEvent).source === "string" &&
    typeof (value as DebugEvent).timestamp === "string" &&
    typeof (value as DebugEvent).title === "string"
  );
}

export function seedDebuggerDeepLinkEvent(event: DebugEvent): string {
  const recordKey = buildDebugRecordKey(event.source, event.id);
  if (typeof window === "undefined") {
    return recordKey;
  }
  const envelope: SeedEnvelope = { savedAt: Date.now(), event };
  try {
    window.localStorage.setItem(
      seedStorageKey(recordKey),
      JSON.stringify(envelope),
    );
  } catch {
    // Ignore quota / private-mode failures; deep link still relies on list fetch.
  }
  return recordKey;
}

export function readDebuggerDeepLinkSeed(
  recordKey: string | null,
): DebugEvent | null {
  if (!recordKey || typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(seedStorageKey(recordKey));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    // Legacy: bare DebugEvent without envelope.
    if (isDebugEventShape(parsed)) {
      return parsed;
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as SeedEnvelope).savedAt !== "number" ||
      !isDebugEventShape((parsed as SeedEnvelope).event)
    ) {
      window.localStorage.removeItem(seedStorageKey(recordKey));
      return null;
    }
    const envelope = parsed as SeedEnvelope;
    if (Date.now() - envelope.savedAt > SEED_TTL_MS) {
      window.localStorage.removeItem(seedStorageKey(recordKey));
      return null;
    }
    return envelope.event;
  } catch {
    return null;
  }
}

export function clearDebuggerDeepLinkSeed(recordKey: string | null): void {
  if (!recordKey || typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(seedStorageKey(recordKey));
  } catch {
    // ignore
  }
}
