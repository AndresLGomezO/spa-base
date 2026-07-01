import type {
  EffectiveObservabilityFlags,
  ObservabilityEnvDefaults,
  PlatformRuntimeSettings,
} from "./platform-runtime-settings.js";

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

export function resolveEnvAiStepTraceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const explicit = parseBooleanEnvFlag(env.AI_STEP_TRACE_ENABLED);
  if (explicit !== undefined) {
    return explicit;
  }
  return env.NODE_ENV !== "production";
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

export function getObservabilityEnvDefaults(
  env: NodeJS.ProcessEnv = process.env,
): ObservabilityEnvDefaults {
  return {
    aiStepTraceEnabled: resolveEnvAiStepTraceEnabled(env),
    requestPerfTraceEnabled: resolveEnvRequestPerfTraceEnabled(env),
  };
}

export function resolveAiStepTraceEnabled(
  settings: PlatformRuntimeSettings | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    settings?.aiStepTraceEnabled !== null &&
    settings?.aiStepTraceEnabled !== undefined
  ) {
    return settings.aiStepTraceEnabled;
  }
  return resolveEnvAiStepTraceEnabled(env);
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

export function resolveEffectiveObservabilityFlags(
  settings: PlatformRuntimeSettings | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): EffectiveObservabilityFlags {
  return {
    aiStepTraceEnabled: resolveAiStepTraceEnabled(settings, env),
    requestPerfTraceEnabled: resolveRequestPerfTraceEnabled(settings, env),
  };
}
