import {
  parseTenantDashboardLayoutRecord,
  putTenantDashboardLayoutInputSchema,
  type PutTenantDashboardLayoutInput,
  type TenantDashboardLayoutRecord,
} from "@repo/entities";

import type { TenantDashboardLayoutRepository } from "./repository-contract.js";

export function createInMemoryTenantDashboardLayoutRepository(): TenantDashboardLayoutRepository & {
  readonly clear: () => void;
} {
  const store = new Map<string, TenantDashboardLayoutRecord>();

  return {
    async get(tenantId) {
      return store.get(tenantId) ?? null;
    },
    async put(tenantId, input: PutTenantDashboardLayoutInput) {
      const parsed = putTenantDashboardLayoutInputSchema.parse(input);
      const record = parseTenantDashboardLayoutRecord(tenantId, parsed);
      store.set(tenantId, record);
      return record;
    },
    clear() {
      store.clear();
    },
  };
}
