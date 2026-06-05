import {
  createUiBuilderPresetInputSchema,
  safeFromPersistedUiBuilderPreset,
  toPersistedUiBuilderPreset,
  UI_BUILDER_PRESETS_COLLECTION,
  updateUiBuilderPresetInputSchema,
  uiBuilderPresetRecordSchema,
  type CreateUiBuilderPresetInput,
  type UpdateUiBuilderPresetInput,
} from "@repo/entities";
import { nanoid } from "nanoid";

import type { UiBuilderPresetRepository } from "@repo/firestore-converters";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

export function createFirestoreAdminUiBuilderPresetRepository(
  config: FirebaseAdminConfig,
): UiBuilderPresetRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      UI_BUILDER_PRESETS_COLLECTION,
    );
  }

  return {
    async list(tenantId) {
      const snapshot = await collection(tenantId).get();
      return snapshot.docs.flatMap((doc) => {
        const record = safeFromPersistedUiBuilderPreset(doc.id, doc.data());
        return record ? [record] : [];
      });
    },
    async get(tenantId, presetId) {
      const snapshot = await collection(tenantId).doc(presetId).get();
      if (!snapshot.exists) {
        return null;
      }
      return safeFromPersistedUiBuilderPreset(snapshot.id, snapshot.data());
    },
    async create(tenantId, input: CreateUiBuilderPresetInput) {
      const parsed = createUiBuilderPresetInputSchema.parse(input);
      const id = `preset_${nanoid(12)}`;
      const record = uiBuilderPresetRecordSchema.parse({
        id,
        ...parsed,
        updatedAt: new Date().toISOString(),
      });
      await collection(tenantId)
        .doc(id)
        .set(toPersistedUiBuilderPreset(record));
      return record;
    },
    async update(tenantId, presetId, input: UpdateUiBuilderPresetInput) {
      const snapshot = await collection(tenantId).doc(presetId).get();
      if (!snapshot.exists) {
        throw new Error("Preset not found.");
      }
      const existing = safeFromPersistedUiBuilderPreset(
        presetId,
        snapshot.data(),
      );
      if (!existing) {
        throw new Error("Preset not found.");
      }
      const parsed = updateUiBuilderPresetInputSchema.parse(input);
      const record = uiBuilderPresetRecordSchema.parse({
        ...existing,
        ...parsed,
        id: presetId,
        updatedAt: new Date().toISOString(),
      });
      await collection(tenantId)
        .doc(presetId)
        .set(toPersistedUiBuilderPreset(record));
      return record;
    },
    async delete(tenantId, presetId) {
      await collection(tenantId).doc(presetId).delete();
    },
  };
}
