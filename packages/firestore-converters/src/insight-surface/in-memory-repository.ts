import {
  createInsightSurfaceInputSchema,
  insightSurfaceRecordSchema,
  patchInsightSurfaceInputSchema,
  type CreateInsightSurfaceInput,
  type InsightSurfaceDefinition,
  type PatchInsightSurfaceInput,
} from "@repo/ai-context";

import type { InsightSurfaceRepository } from "./repository-contract.js";

export function createInMemoryInsightSurfaceRepository(): InsightSurfaceRepository & {
  readonly store: Map<string, InsightSurfaceDefinition>;
} {
  const store = new Map<string, InsightSurfaceDefinition>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async list(tenantId) {
      return [...store.values()]
        .filter((record) => record.tenantId === tenantId)
        .sort(
          (a, b) => a.ui.tabOrder - b.ui.tabOrder || a.id.localeCompare(b.id),
        );
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async create(tenantId, input: CreateInsightSurfaceInput) {
      const parsed = createInsightSurfaceInputSchema.parse(input);
      const now = new Date().toISOString();
      const record = insightSurfaceRecordSchema.parse({
        ...parsed,
        tenantId,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async update(tenantId, id, input: PatchInsightSurfaceInput) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Insight surface not found: ${id}`);
      }
      patchInsightSurfaceInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = insightSurfaceRecordSchema.parse({
        ...current,
        ...input,
        id: current.id,
        tenantId: current.tenantId,
        version: current.version + 1,
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
