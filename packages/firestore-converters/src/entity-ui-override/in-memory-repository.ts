import {
  parseEntityUiOverrideRecord,
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
      const record = parseEntityUiOverrideRecord(entityName, {
        views: input.views,
        ...(input.listViewType ? { listViewType: input.listViewType } : {}),
        ...(input.listItem ? { listItem: input.listItem } : {}),
        ...(input.mainPage ? { mainPage: input.mainPage } : {}),
        ...(input.recordDetail ? { recordDetail: input.recordDetail } : {}),
        ...(input.forms ? { forms: input.forms } : {}),
        updatedAt: new Date().toISOString(),
      });
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
