import {
  createUiBuilderPresetInputSchema,
  toPersistedUiBuilderPreset,
  type CreateUiBuilderPresetInput,
  type UiBuilderPresetRecord,
  type UpdateUiBuilderPresetInput,
  updateUiBuilderPresetInputSchema,
  uiBuilderPresetRecordSchema,
} from "@repo/entities";
import { nanoid } from "nanoid";

import type { UiBuilderPresetRepository } from "./repository-contract.js";

export function createInMemoryUiBuilderPresetRepository(): UiBuilderPresetRepository & {
  clear(): void;
} {
  const store = new Map<string, UiBuilderPresetRecord>();

  function key(tenantId: string, presetId: string): string {
    return `${tenantId}:${presetId}`;
  }

  return {
    async list(tenantId) {
      return [...store.values()]
        .filter((record) => store.has(key(tenantId, record.id)))
        .sort((left, right) => left.name.localeCompare(right.name));
    },
    async get(tenantId, presetId) {
      return store.get(key(tenantId, presetId)) ?? null;
    },
    async create(tenantId, input: CreateUiBuilderPresetInput) {
      const parsed = createUiBuilderPresetInputSchema.parse(input);
      const id = `preset_${nanoid(12)}`;
      const record = uiBuilderPresetRecordSchema.parse({
        id,
        ...parsed,
        updatedAt: new Date().toISOString(),
      });
      toPersistedUiBuilderPreset(record);
      store.set(key(tenantId, id), record);
      return record;
    },
    async update(tenantId, presetId, input: UpdateUiBuilderPresetInput) {
      const existing = store.get(key(tenantId, presetId));
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
      toPersistedUiBuilderPreset(record);
      store.set(key(tenantId, presetId), record);
      return record;
    },
    async delete(tenantId, presetId) {
      store.delete(key(tenantId, presetId));
    },
    clear() {
      store.clear();
    },
  };
}
