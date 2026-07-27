import { describe, expect, it } from "vitest";

import { platformRuntimeSettingsSchema } from "./platform-runtime-settings.js";

describe("platformRuntimeSettingsSchema", () => {
  it("defaults missing observability flags to null for older Firestore docs", () => {
    const parsed = platformRuntimeSettingsSchema.parse({
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: "admin",
    });

    expect(parsed).toMatchObject({
      aiEnabled: null,
      aiTraceEnabled: null,
      aiStepTraceEnabled: null,
      requestPerfTraceEnabled: null,
      seedHookObservabilityEnabled: null,
      dataHookAiCacheEnabled: null,
      gmailIngestDeliveryMode: null,
    });
  });

  it("accepts an explicit null seedHookObservabilityEnabled", () => {
    const parsed = platformRuntimeSettingsSchema.parse({
      seedHookObservabilityEnabled: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: "admin",
    });

    expect(parsed.seedHookObservabilityEnabled).toBeNull();
  });
});
