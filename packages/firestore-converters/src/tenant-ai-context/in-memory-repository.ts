import {
  tenantAiContextRecordSchema,
  type TenantAiContextRecord,
  type TenantAiContextRepository,
} from "./repository-contract.js";

export function createInMemoryTenantAiContextRepository(): TenantAiContextRepository {
  const store = new Map<string, TenantAiContextRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}::${id}`;
  }

  return {
    async get(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async upsert(record) {
      const parsed = tenantAiContextRecordSchema.parse(record);
      store.set(key(parsed.tenantId, parsed.id), parsed);
      return parsed;
    },
    async delete(tenantId, id) {
      store.delete(key(tenantId, id));
    },
  };
}
