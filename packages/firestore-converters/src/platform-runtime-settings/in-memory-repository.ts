import {
  platformRuntimeSettingsSchema,
  updatePlatformRuntimeSettingsInputSchema,
  type PlatformRuntimeSettings,
} from "@repo/debug-logs";

import type { PlatformRuntimeSettingsRepository } from "./repository-contract.js";

export function createInMemoryPlatformRuntimeSettingsRepository(): PlatformRuntimeSettingsRepository & {
  readonly store: { current: PlatformRuntimeSettings | null };
} {
  const store: { current: PlatformRuntimeSettings | null } = { current: null };

  return {
    store,
    async get() {
      return store.current;
    },
    async update(input) {
      const { updatedBy, ...settingsInput } = input;
      const parsed =
        updatePlatformRuntimeSettingsInputSchema.parse(settingsInput);
      const nowIso = new Date().toISOString();
      const next = platformRuntimeSettingsSchema.parse({
        aiStepTraceEnabled:
          parsed.aiStepTraceEnabled ??
          store.current?.aiStepTraceEnabled ??
          null,
        requestPerfTraceEnabled:
          parsed.requestPerfTraceEnabled ??
          store.current?.requestPerfTraceEnabled ??
          null,
        seedHookObservabilityEnabled:
          parsed.seedHookObservabilityEnabled ??
          store.current?.seedHookObservabilityEnabled ??
          null,
        gmailIngestDeliveryMode:
          parsed.gmailIngestDeliveryMode !== undefined
            ? parsed.gmailIngestDeliveryMode
            : (store.current?.gmailIngestDeliveryMode ?? null),
        updatedAt: nowIso,
        updatedBy,
      });
      store.current = next;
      return next;
    },
  };
}
