import type { DebugEvent } from "../../lib/api-client";

export const HOOK_RESOLUTION_SOURCE_KEYS = [
  "directMatch",
  "embeddingMatch",
  "llm",
  "unresolved",
] as const;

export type HookResolutionSourceKey =
  (typeof HOOK_RESOLUTION_SOURCE_KEYS)[number];

const HOOK_RESOLUTION_SOURCE_KEY_SET = new Set<string>(
  HOOK_RESOLUTION_SOURCE_KEYS,
);

export function isHookResolutionSourceKey(
  value: string,
): value is HookResolutionSourceKey {
  return HOOK_RESOLUTION_SOURCE_KEY_SET.has(value);
}

export function hookResolutionSourceLabelKey(
  key: HookResolutionSourceKey,
): `debugger.detail.resolutionSources.${HookResolutionSourceKey}` {
  return `debugger.detail.resolutionSources.${key}`;
}

export function resolutionSourceForEvent(
  event: DebugEvent,
): HookResolutionSourceKey | null {
  if (event.source !== "hookExecution") {
    return null;
  }
  const fromSummary = event.summary?.resolutionSource;
  if (typeof fromSummary === "string" && isHookResolutionSourceKey(fromSummary)) {
    return fromSummary;
  }
  if (event.payload && typeof event.payload === "object") {
    const value = (event.payload as Record<string, unknown>).resolutionSource;
    if (typeof value === "string" && isHookResolutionSourceKey(value)) {
      return value;
    }
  }
  return null;
}

export function eventMatchesHookResolutionSource(
  event: DebugEvent,
  resolutionSource: HookResolutionSourceKey,
): boolean {
  return resolutionSourceForEvent(event) === resolutionSource;
}

export function parseHookResolutionSources(
  raw: string | null,
): HookResolutionSourceKey[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(isHookResolutionSourceKey);
}
