import {
  getObservabilityEnvDefaults,
  resolveEffectiveObservabilityFlags,
  resolveAiEnabled,
  resolveAiTraceEnabled,
  resolveGmailIngestDeliveryMode,
  resolveRequestPerfTraceEnabled,
  resolveSeedHookObservabilityEnabled,
} from "./resolve-observability-flags.js";
import type {
  GmailIngestDeliveryMode,
  PlatformRuntimeSettings,
} from "./platform-runtime-settings.js";

export interface RuntimeSettingsReader {
  get(): Promise<PlatformRuntimeSettings | null>;
}

const DEFAULT_CACHE_TTL_MS = 5_000;

export function createRuntimeSettingsCache(
  reader: RuntimeSettingsReader,
  options?: { readonly ttlMs?: number },
) {
  const ttlMs = options?.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  let cached: PlatformRuntimeSettings | null | undefined;
  let expiresAt = 0;

  async function getSettings(): Promise<PlatformRuntimeSettings | null> {
    const now = Date.now();
    if (now < expiresAt && cached !== undefined) {
      return cached;
    }
    cached = await reader.get();
    expiresAt = now + ttlMs;
    return cached;
  }

  function invalidate(): void {
    cached = undefined;
    expiresAt = 0;
  }

  async function isAiEnabled(): Promise<boolean> {
    const settings = await getSettings();
    return resolveAiEnabled(settings);
  }

  async function isAiTraceEnabled(): Promise<boolean> {
    const settings = await getSettings();
    return resolveAiTraceEnabled(settings);
  }

  /** @deprecated use isAiTraceEnabled */
  async function isAiStepTraceEnabled(): Promise<boolean> {
    return isAiTraceEnabled();
  }

  async function isRequestPerfTraceEnabled(): Promise<boolean> {
    const settings = await getSettings();
    return resolveRequestPerfTraceEnabled(settings);
  }

  async function isSeedHookObservabilityEnabled(): Promise<boolean> {
    const settings = await getSettings();
    return resolveSeedHookObservabilityEnabled(settings);
  }

  async function getGmailIngestDeliveryMode(): Promise<GmailIngestDeliveryMode> {
    const settings = await getSettings();
    return resolveGmailIngestDeliveryMode(settings);
  }

  async function buildResponse() {
    const settings = await getSettings();
    return {
      settings,
      effective: resolveEffectiveObservabilityFlags(settings),
      envDefaults: getObservabilityEnvDefaults(),
    };
  }

  return {
    getSettings,
    invalidate,
    isAiEnabled,
    isAiTraceEnabled,
    isAiStepTraceEnabled,
    isRequestPerfTraceEnabled,
    isSeedHookObservabilityEnabled,
    getGmailIngestDeliveryMode,
    buildResponse,
  };
}

export type RuntimeSettingsCache = ReturnType<
  typeof createRuntimeSettingsCache
>;
