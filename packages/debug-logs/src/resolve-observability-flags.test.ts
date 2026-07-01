import { describe, expect, it } from "vitest";

import {
  getObservabilityEnvDefaults,
  resolveAiStepTraceEnabled,
  resolveEffectiveObservabilityFlags,
  resolveRequestPerfTraceEnabled,
} from "./resolve-observability-flags.js";
import type { PlatformRuntimeSettings } from "./platform-runtime-settings.js";

const baseSettings: PlatformRuntimeSettings = {
  aiStepTraceEnabled: null,
  requestPerfTraceEnabled: null,
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
      aiStepTraceEnabled: true,
      requestPerfTraceEnabled: true,
    });
  });

  it("prefers explicit env flags over NODE_ENV heuristic", () => {
    expect(
      resolveAiStepTraceEnabled(null, {
        NODE_ENV: "production",
        AI_STEP_TRACE_ENABLED: "true",
      }),
    ).toBe(true);
    expect(
      resolveRequestPerfTraceEnabled(null, {
        NODE_ENV: "development",
        ENABLE_PERF_LOGS: "false",
      }),
    ).toBe(false);
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
      aiStepTraceEnabled: true,
      requestPerfTraceEnabled: true,
    });
  });

  it("allows runtime overrides to disable tracing", () => {
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
      aiStepTraceEnabled: false,
      requestPerfTraceEnabled: false,
    });
  });
});
