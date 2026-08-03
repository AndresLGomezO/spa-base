import {
  statementExtractionRecordSchema,
  type StatementExtractionListOptions,
  type StatementExtractionPatch,
  type StatementExtractionRecord,
  type StatementExtractionRepository,
} from "./repository-contract.js";

export function createInMemoryStatementExtractionRepository(): StatementExtractionRepository {
  const store = new Map<string, StatementExtractionRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}::${id}`;
  }

  return {
    async get(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async list(tenantId, options?: StatementExtractionListOptions) {
      const limit = Math.min(Math.max(options?.limit ?? 50, 1), 1000);
      return [...store.values()]
        .filter((record) => record.tenantId === tenantId)
        .filter((record) =>
          options?.status ? record.status === options.status : true,
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, limit);
    },
    async create(record) {
      const parsed = statementExtractionRecordSchema.parse(record);
      store.set(key(parsed.tenantId, parsed.id), parsed);
      return parsed;
    },
    async update(tenantId, id, patch: StatementExtractionPatch) {
      const existing = store.get(key(tenantId, id));
      if (!existing) {
        throw new Error(`Statement extraction not found: ${id}`);
      }
      const updated = statementExtractionRecordSchema.parse({
        ...existing,
        ...patch,
        id: existing.id,
        tenantId: existing.tenantId,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      });
      store.set(key(tenantId, id), updated);
      return updated;
    },
  };
}
