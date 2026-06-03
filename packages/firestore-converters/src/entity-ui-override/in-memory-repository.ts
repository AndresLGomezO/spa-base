import {
  entityUiOverrideRecordSchema,
  type EntityUiOverrideRecord,
  type PutEntityUiOverrideInput,
} from "@repo/entities";

import type { EntityUiOverrideRepository } from "./repository-contract.js";

export function createInMemoryEntityUiOverrideRepository(): EntityUiOverrideRepository & {
  clear(): void;
} {
  const store = new Map<string, EntityUiOverrideRecord>();

  function key(tenantId: string, entityName: string): string {
    return `${tenantId}:${entityName}`;
  }

  return {
    async get(tenantId, entityName) {
      return store.get(key(tenantId, entityName)) ?? null;
    },
    async put(tenantId, entityName, input: PutEntityUiOverrideInput) {
      const record = entityUiOverrideRecordSchema.parse({
        entityName,
        views: input.views,
        ...(input.listViewType ? { listViewType: input.listViewType } : {}),
        ...(input.listItem ? { listItem: input.listItem } : {}),
        ...(input.detail ? { detail: input.detail } : {}),
        ...(input.forms ? { forms: input.forms } : {}),
        updatedAt: new Date().toISOString(),
      }) as EntityUiOverrideRecord;
      store.set(key(tenantId, entityName), record);
      return record;
    },
    async list(tenantId) {
      return [...store.values()].filter((record) =>
        store.has(key(tenantId, record.entityName)),
      );
    },
    clear() {
      store.clear();
    },
  };
}
