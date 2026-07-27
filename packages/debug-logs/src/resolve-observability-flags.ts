import type {
  EffectiveObservabilityFlags,
  GmailIngestDeliveryMode,
  ObservabilityEnvDefaults,
  PlatformRuntimeSettings,
} from "./platform-runtime-settings.js";
import { gmailIngestDeliveryModeSchema } from "./platform-runtime-settings.js";

function parseBooleanEnvFlag(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return undefined;
}

export function resolveEnvAiEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const explicit = parseBooleanEnvFlag(env.AI_ENABLED);
  if (explicit !== undefined) {
    return explicit;
  }
  return true;
}

export function resolveEnvAiTraceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const explicit =
    parseBooleanEnvFlag(env.AI_TRACE_ENABLED) ??
    parseBooleanEnvFlag(env.AI_STEP_TRACE_ENABLED);
  if (explicit !== undefined) {
    return explicit;
  }
  return env.NODE_ENV !== "production";
}

/** @deprecated use resolveEnvAiTraceEnabled */
export function resolveEnvAiStepTraceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolveEnvAiTraceEnabled(env);
}

export function resolveEnvRequestPerfTraceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const explicit = parseBooleanEnvFlag(env.ENABLE_PERF_LOGS);
  if (explicit !== undefined) {
    return explicit;
  }
  return env.NODE_ENV !== "production";
}

export function resolveEnvSeedHookObservabilityEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const explicit = parseBooleanEnvFlag(env.SEED_HOOK_OBSERVABILITY_ENABLED);
  if (explicit !== undefined) {
    return explicit;
  }
  return env.NODE_ENV !== "production";
}

export function resolveEnvDataHookAiCacheEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const explicit = parseBooleanEnvFlag(env.DATA_HOOK_AI_CACHE_ENABLED);
  if (explicit !== undefined) {
    return explicit;
  }
  // Off in test by default; on in prod/dev so classify catalogs cache.
  return env.NODE_ENV !== "test";
}

export function resolveEnvGmailIngestDeliveryMode(
  env: NodeJS.ProcessEnv = process.env,
): GmailIngestDeliveryMode {
  const parsed = gmailIngestDeliveryModeSchema.safeParse(
    (env.GMAIL_INGEST_DELIVERY_MODE ?? "poll").trim().toLowerCase(),
  );
  return parsed.success ? parsed.data : "poll";
}

export function getObservabilityEnvDefaults(
  env: NodeJS.ProcessEnv = process.env,
): ObservabilityEnvDefaults {
  const aiTraceEnabled = resolveEnvAiTraceEnabled(env);
  return {
    aiEnabled: resolveEnvAiEnabled(env),
    aiTraceEnabled,
    aiStepTraceEnabled: aiTraceEnabled,
    requestPerfTraceEnabled: resolveEnvRequestPerfTraceEnabled(env),
    seedHookObservabilityEnabled: resolveEnvSeedHookObservabilityEnabled(env),
    dataHookAiCacheEnabled: resolveEnvDataHookAiCacheEnabled(env),
    gmailIngestDeliveryMode: resolveEnvGmailIngestDeliveryMode(env),
  };
}

export function resolveAiEnabled(
  settings: PlatformRuntimeSettings | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (settings?.aiEnabled !== null && settings?.aiEnabled !== undefined) {
    return settings.aiEnabled;
  }
  return resolveEnvAiEnabled(env);
}

export function resolveAiTraceEnabled(
  settings: PlatformRuntimeSettings | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    settings?.aiTraceEnabled !== null &&
    settings?.aiTraceEnabled !== undefined
  ) {
    return settings.aiTraceEnabled;
  }
  // Back-compat: legacy platform key
  if (
    settings?.aiStepTraceEnabled !== null &&
    settings?.aiStepTraceEnabled !== undefined
  ) {
    return settings.aiStepTraceEnabled;
  }
  return resolveEnvAiTraceEnabled(env);
}

/** @deprecated use resolveAiTraceEnabled */
export function resolveAiStepTraceEnabled(
  settings: PlatformRuntimeSettings | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolveAiTraceEnabled(settings, env);
}

export function resolveRequestPerfTraceEnabled(
  settings: PlatformRuntimeSettings | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    settings?.requestPerfTraceEnabled !== null &&
    settings?.requestPerfTraceEnabled !== undefined
  ) {
    return settings.requestPerfTraceEnabled;
  }
  return resolveEnvRequestPerfTraceEnabled(env);
}

export function resolveSeedHookObservabilityEnabled(
  settings: PlatformRuntimeSettings | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    settings?.seedHookObservabilityEnabled !== null &&
    settings?.seedHookObservabilityEnabled !== undefined
  ) {
    return settings.seedHookObservabilityEnabled;
  }
  return resolveEnvSeedHookObservabilityEnabled(env);
}

export function resolveDataHookAiCacheEnabled(
  settings: PlatformRuntimeSettings | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    settings?.dataHookAiCacheEnabled !== null &&
    settings?.dataHookAiCacheEnabled !== undefined
  ) {
    return settings.dataHookAiCacheEnabled;
  }
  return resolveEnvDataHookAiCacheEnabled(env);
}

export function resolveGmailIngestDeliveryMode(
  settings: PlatformRuntimeSettings | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): GmailIngestDeliveryMode {
  if (
    settings?.gmailIngestDeliveryMode !== null &&
    settings?.gmailIngestDeliveryMode !== undefined
  ) {
    return settings.gmailIngestDeliveryMode;
  }
  return resolveEnvGmailIngestDeliveryMode(env);
}

export function resolveEffectiveObservabilityFlags(
  settings: PlatformRuntimeSettings | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): EffectiveObservabilityFlags {
  const aiTraceEnabled = resolveAiTraceEnabled(settings, env);
  return {
    aiEnabled: resolveAiEnabled(settings, env),
    aiTraceEnabled,
    aiStepTraceEnabled: aiTraceEnabled,
    requestPerfTraceEnabled: resolveRequestPerfTraceEnabled(settings, env),
    seedHookObservabilityEnabled: resolveSeedHookObservabilityEnabled(
      settings,
      env,
    ),
    dataHookAiCacheEnabled: resolveDataHookAiCacheEnabled(settings, env),
    gmailIngestDeliveryMode: resolveGmailIngestDeliveryMode(settings, env),
  };
}
