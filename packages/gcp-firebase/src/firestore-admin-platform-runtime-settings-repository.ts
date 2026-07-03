import {
  PLATFORM_RUNTIME_SETTINGS_COLLECTION,
  PLATFORM_RUNTIME_SETTINGS_DOC_ID,
  platformRuntimeSettingsSchema,
  updatePlatformRuntimeSettingsInputSchema,
  type PlatformRuntimeSettings,
} from "@repo/debug-logs";
import type { PlatformRuntimeSettingsRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";

function toSettings(data: unknown): PlatformRuntimeSettings {
  return platformRuntimeSettingsSchema.parse(data);
}

export function createFirestoreAdminPlatformRuntimeSettingsRepository(
  config: FirebaseAdminConfig,
): PlatformRuntimeSettingsRepository {
  function docRef() {
    return getFirestoreAdmin(config)
      .collection(PLATFORM_RUNTIME_SETTINGS_COLLECTION)
      .doc(PLATFORM_RUNTIME_SETTINGS_DOC_ID);
  }

  async function get(): Promise<PlatformRuntimeSettings | null> {
    const snapshot = await docRef().get();
    if (!snapshot.exists) {
      return null;
    }
    return toSettings(snapshot.data());
  }

  return {
    get,
    async update(input) {
      const { updatedBy, ...settingsInput } = input;
      const parsed =
        updatePlatformRuntimeSettingsInputSchema.parse(settingsInput);
      const nowIso = new Date().toISOString();
      const existing = await get();

      const next = toSettings({
        aiStepTraceEnabled:
          parsed.aiStepTraceEnabled ?? existing?.aiStepTraceEnabled ?? null,
        requestPerfTraceEnabled:
          parsed.requestPerfTraceEnabled ??
          existing?.requestPerfTraceEnabled ??
          null,
        seedHookObservabilityEnabled:
          parsed.seedHookObservabilityEnabled ??
          existing?.seedHookObservabilityEnabled ??
          null,
        updatedAt: nowIso,
        updatedBy,
      });

      await docRef().set(next, { merge: false });
      return next;
    },
  };
}
