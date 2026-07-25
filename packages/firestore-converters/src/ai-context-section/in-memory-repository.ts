import { nanoid } from "nanoid";

import {
  aiContextSectionRecordSchema,
  createAiContextSectionInputSchema,
  patchAiContextSectionInputSchema,
  type AiContextSectionRecord,
  type AiContextSectionRepository,
  type CreateAiContextSectionInput,
  type PatchAiContextSectionInput,
} from "./repository-contract.js";

export function createInMemoryAiContextSectionRepository(): AiContextSectionRepository {
  const store = new Map<string, AiContextSectionRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}::${id}`;
  }

  function listForTenant(tenantId: string): AiContextSectionRecord[] {
    return [...store.values()]
      .filter((record) => record.tenantId === tenantId)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }

  return {
    async list(tenantId) {
      return listForTenant(tenantId);
    },
    async listEnabled(tenantId) {
      return listForTenant(tenantId).filter((record) => record.enabled);
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async create(tenantId, input: CreateAiContextSectionInput) {
      const parsed = createAiContextSectionInputSchema.parse(input);
      const now = new Date().toISOString();
      const existing = listForTenant(tenantId);
      const nextOrder =
        parsed.order ??
        (existing.length === 0
          ? 0
          : Math.max(...existing.map((item) => item.order)) + 1);
      const record = aiContextSectionRecordSchema.parse({
        id: `aics_${nanoid(12)}`,
        tenantId,
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        order: nextOrder,
        enabled: parsed.enabled ?? true,
        scope: parsed.scope ?? "perUser",
        visibility: parsed.visibility ?? {},
        blocks: parsed.blocks ?? [],
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async update(tenantId, id, input: PatchAiContextSectionInput) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`AI context section not found: ${id}`);
      }
      patchAiContextSectionInputSchema.parse(input);
      const next = aiContextSectionRecordSchema.parse({
        ...current,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? input.description === null
            ? { description: undefined }
            : { description: input.description }
          : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.scope !== undefined ? { scope: input.scope } : {}),
        ...(input.visibility !== undefined
          ? { visibility: input.visibility }
          : {}),
        ...(input.blocks !== undefined ? { blocks: input.blocks } : {}),
        updatedAt: new Date().toISOString(),
      });
      store.set(key(tenantId, id), next);
      return next;
    },
    async delete(tenantId, id) {
      store.delete(key(tenantId, id));
    },
    async replaceAll(tenantId, items) {
      for (const [k, record] of store) {
        if (record.tenantId === tenantId) {
          store.delete(k);
        }
      }
      const saved: AiContextSectionRecord[] = [];
      for (const item of items) {
        const parsed = aiContextSectionRecordSchema.parse({
          ...item,
          tenantId,
        });
        store.set(key(tenantId, parsed.id), parsed);
        saved.push(parsed);
      }
      return saved.sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name),
      );
    },
  };
}
