import {
  createEntityCategoryInputSchema,
  entityCategoryRecordSchema,
  patchEntityCategoryInputSchema,
  type EntityCategoryRecord,
} from "@repo/entity-categories";
import { nanoid } from "nanoid";

import type { EntityCategoryRepository } from "./repository-contract.js";

export function createInMemoryEntityCategoryRepository(): EntityCategoryRepository & {
  readonly store: Map<string, EntityCategoryRecord>;
} {
  const store = new Map<string, EntityCategoryRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async list(tenantId) {
      return [...store.values()]
        .filter((record) => record.tenantId === tenantId)
        .sort((left, right) => left.order - right.order);
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async create(tenantId, input) {
      const parsed = createEntityCategoryInputSchema.parse(input);
      const now = new Date().toISOString();
      const record = entityCategoryRecordSchema.parse({
        id: `cat_${nanoid(12)}`,
        tenantId,
        name: parsed.name,
        icon: parsed.icon,
        order: parsed.order,
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async update(tenantId, id, input) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Entity category not found: ${id}`);
      }

      patchEntityCategoryInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = entityCategoryRecordSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.icon ? { icon: input.icon } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        updatedAt: now,
      });
      store.set(key(tenantId, id), next);
      return next;
    },
    async delete(tenantId, id) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Entity category not found: ${id}`);
      }
      store.delete(key(tenantId, id));
    },
  };
}
