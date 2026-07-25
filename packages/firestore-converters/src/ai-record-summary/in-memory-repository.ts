import {
  aiRecordSummaryRecordSchema,
  buildAiRecordSummaryDocId,
  type AiRecordSummaryRecord,
  type AiRecordSummaryRepository,
} from "./repository-contract.js";

export function createInMemoryAiRecordSummaryRepository(): AiRecordSummaryRepository {
  const store = new Map<string, AiRecordSummaryRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}::${id}`;
  }

  return {
    async get(tenantId, entityName, recordId) {
      return (
        store.get(
          key(tenantId, buildAiRecordSummaryDocId(entityName, recordId)),
        ) ?? null
      );
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async getMany(tenantId, refs) {
      const items: AiRecordSummaryRecord[] = [];
      for (const ref of refs) {
        const record = await this.get(tenantId, ref.entityName, ref.recordId);
        if (record) items.push(record);
      }
      return items;
    },
    async upsert(record) {
      const parsed = aiRecordSummaryRecordSchema.parse(record);
      store.set(key(parsed.tenantId, parsed.id), parsed);
      return parsed;
    },
    async delete(tenantId, entityName, recordId) {
      const id = buildAiRecordSummaryDocId(entityName, recordId);
      return store.delete(key(tenantId, id));
    },
  };
}
