import {
  createDocumentExtractionTemplateInputSchema,
  documentExtractionTemplateRecordSchema,
  patchDocumentExtractionTemplateInputSchema,
  type CreateDocumentExtractionTemplateInput,
  type DocumentExtractionTemplateRecord,
  type DocumentExtractionTemplateRepository,
  type PatchDocumentExtractionTemplateInput,
} from "@repo/ai-context";

export function createInMemoryDocumentExtractionTemplateRepository(): DocumentExtractionTemplateRepository & {
  readonly store: Map<string, DocumentExtractionTemplateRecord>;
} {
  const store = new Map<string, DocumentExtractionTemplateRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async list(tenantId) {
      return [...store.values()]
        .filter((record) => record.tenantId === tenantId)
        .sort((a, b) => a.id.localeCompare(b.id));
    },
    async get(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async create(tenantId, input: CreateDocumentExtractionTemplateInput) {
      const parsed = createDocumentExtractionTemplateInputSchema.parse(input);
      const now = new Date().toISOString();
      const record = documentExtractionTemplateRecordSchema.parse({
        ...parsed,
        tenantId,
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async update(tenantId, id, input: PatchDocumentExtractionTemplateInput) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Document extraction template not found: ${id}`);
      }
      patchDocumentExtractionTemplateInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = documentExtractionTemplateRecordSchema.parse({
        ...current,
        ...input,
        id: current.id,
        tenantId: current.tenantId,
        createdAt: current.createdAt,
        updatedAt: now,
      });
      store.set(key(tenantId, id), next);
      return next;
    },
    async delete(tenantId, id) {
      store.delete(key(tenantId, id));
    },
  };
}
