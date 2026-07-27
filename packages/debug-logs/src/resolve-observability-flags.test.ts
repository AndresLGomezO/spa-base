import { describe, expect, it } from "vitest";

import {
  getObservabilityEnvDefaults,
  resolveAiStepTraceEnabled,
  resolveDataHookAiCacheEnabled,
  resolveEffectiveObservabilityFlags,
  resolveRequestPerfTraceEnabled,
  resolveSeedHookObservabilityEnabled,
} from "./resolve-observability-flags.js";
import type { PlatformRuntimeSettings } from "./platform-runtime-settings.js";

const baseSettings: PlatformRuntimeSettings = {
  aiEnabled: null,
  aiTraceEnabled: null,
  aiStepTraceEnabled: null,
  requestPerfTraceEnabled: null,
  seedHookObservabilityEnabled: null,
  dataHookAiCacheEnabled: null,
  gmailIngestDeliveryMode: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedBy: "admin",
};

describe("resolveObservabilityFlags", () => {
  it("uses env defaults when runtime settings are null", () => {
    expect(
      resolveAiStepTraceEnabled(null, {
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      resolveRequestPerfTraceEnabled(null, {
        NODE_ENV: "production",
        ENABLE_PERF_LOGS: "false",
      }),
    ).toBe(false);
  });

  it("uses non-production env heuristic when env flags are unset", () => {
    expect(
      getObservabilityEnvDefaults({
        NODE_ENV: "development",
      }),
    ).toEqual({
      aiEnabled: true,
      aiTraceEnabled: true,
      aiStepTraceEnabled: true,
      requestPerfTraceEnabled: true,
      seedHookObservabilityEnabled: true,
      dataHookAiCacheEnabled: true,
      gmailIngestDeliveryMode: "poll",
    });
  });

  it("defaults dataHookAiCacheEnabled off in test", () => {
    expect(
      resolveDataHookAiCacheEnabled(null, {
        NODE_ENV: "test",
      }),
    ).toBe(false);
  });

  it("prefers explicit env flags over NODE_ENV heuristic", () => {
    expect(
      resolveAiStepTraceEnabled(null, {
        NODE_ENV: "production",
        AI_STEP_TRACE_ENABLED: "true",
      }),
    ).toBe(true);
    expect(
      resolveAiStepTraceEnabled(null, {
        NODE_ENV: "production",
        AI_TRACE_ENABLED: "true",
      }),
    ).toBe(true);
    expect(
      resolveRequestPerfTraceEnabled(null, {
        NODE_ENV: "development",
        ENABLE_PERF_LOGS: "false",
      }),
    ).toBe(false);
    expect(
      resolveDataHookAiCacheEnabled(null, {
        NODE_ENV: "test",
        DATA_HOOK_AI_CACHE_ENABLED: "true",
      }),
    ).toBe(true);
  });

  it("prefers runtime overrides over env defaults", () => {
    const env = {
      NODE_ENV: "production",
      AI_STEP_TRACE_ENABLED: "false",
      ENABLE_PERF_LOGS: "false",
    };

    expect(
      resolveEffectiveObservabilityFlags(
        {
          ...baseSettings,
          aiStepTraceEnabled: true,
          requestPerfTraceEnabled: true,
        },
        env,
      ),
    ).toEqual({
      aiEnabled: true,
      aiTraceEnabled: true,
      aiStepTraceEnabled: true,
      requestPerfTraceEnabled: true,
      seedHookObservabilityEnabled: false,
      dataHookAiCacheEnabled: true,
      gmailIngestDeliveryMode: "poll",
    });
  });

  it("prefers runtime overrides to disable tracing", () => {
    expect(
      resolveEffectiveObservabilityFlags(
        {
          ...baseSettings,
          aiStepTraceEnabled: false,
          requestPerfTraceEnabled: false,
        },
        { NODE_ENV: "development" },
      ),
    ).toEqual({
      aiEnabled: true,
      aiTraceEnabled: false,
      aiStepTraceEnabled: false,
      requestPerfTraceEnabled: false,
      seedHookObservabilityEnabled: true,
      dataHookAiCacheEnabled: true,
      gmailIngestDeliveryMode: "poll",
    });
  });

  it("prefers aiTraceEnabled over legacy aiStepTraceEnabled", () => {
    expect(
      resolveEffectiveObservabilityFlags(
        {
          ...baseSettings,
          aiTraceEnabled: true,
          aiStepTraceEnabled: false,
        },
        { NODE_ENV: "production" },
      ).aiTraceEnabled,
    ).toBe(true);
  });

  it("honors aiEnabled kill-switch override", () => {
    expect(
      resolveEffectiveObservabilityFlags(
        {
          ...baseSettings,
          aiEnabled: false,
        },
        { NODE_ENV: "development" },
      ).aiEnabled,
    ).toBe(false);
  });

  it("resolves seed hook observability from env and runtime overrides", () => {
    expect(
      resolveSeedHookObservabilityEnabled(null, {
        NODE_ENV: "production",
        SEED_HOOK_OBSERVABILITY_ENABLED: "true",
      }),
    ).toBe(true);
    expect(
      resolveSeedHookObservabilityEnabled(
        {
          ...baseSettings,
          seedHookObservabilityEnabled: false,
        },
        { NODE_ENV: "development" },
      ),
    ).toBe(false);
  });

  it("resolves dataHookAiCacheEnabled from runtime override", () => {
    expect(
      resolveDataHookAiCacheEnabled(
        {
          ...baseSettings,
          dataHookAiCacheEnabled: false,
        },
        { NODE_ENV: "production" },
      ),
    ).toBe(false);
  });

  it("resolves gmail ingest delivery mode from env and runtime overrides", () => {
    expect(
      resolveEffectiveObservabilityFlags(null, {
        GMAIL_INGEST_DELIVERY_MODE: "push",
      }).gmailIngestDeliveryMode,
    ).toBe("push");
    expect(
      resolveEffectiveObservabilityFlags(
        {
          ...baseSettings,
          gmailIngestDeliveryMode: "poll",
        },
        { GMAIL_INGEST_DELIVERY_MODE: "push" },
      ).gmailIngestDeliveryMode,
    ).toBe("poll");
  });
});
