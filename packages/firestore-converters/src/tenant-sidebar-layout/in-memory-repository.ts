import {
  parseTenantSidebarLayoutRecord,
  putTenantSidebarLayoutInputSchema,
  type PutTenantSidebarLayoutInput,
  type TenantSidebarLayoutRecord,
} from "@repo/entities";

import type { TenantSidebarLayoutRepository } from "./repository-contract.js";

export function createInMemoryTenantSidebarLayoutRepository(): TenantSidebarLayoutRepository & {
  readonly clear: () => void;
} {
  const store = new Map<string, TenantSidebarLayoutRecord>();

  return {
    async get(tenantId) {
      return store.get(tenantId) ?? null;
    },
    async put(tenantId, input: PutTenantSidebarLayoutInput) {
      const parsed = putTenantSidebarLayoutInputSchema.parse(input);
      const record = parseTenantSidebarLayoutRecord(tenantId, parsed);
      store.set(tenantId, record);
      return record;
    },
    async delete(tenantId) {
      return store.delete(tenantId);
    },
    clear() {
      store.clear();
    },
  };
}
