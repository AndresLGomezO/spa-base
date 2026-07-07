import {
  createEntityQueryDefinitionInputSchema,
  patchEntityQueryDefinitionInputSchema,
  buildEntityQueryDefinitionRecord,
  mergeEntityQueryDefinitionPatch,
  type EntityQueryDefinitionRecord,
} from "@repo/entity-queries";
import { nanoid } from "nanoid";

import type { EntityQueryDefinitionRepository } from "./repository-contract.js";

function slugQueryId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function createInMemoryEntityQueryDefinitionRepository(): EntityQueryDefinitionRepository & {
  readonly store: Map<string, EntityQueryDefinitionRecord>;
} {
  const store = new Map<string, EntityQueryDefinitionRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    store,
    async list(tenantId) {
      return [...store.values()].filter(
        (record) => record.tenantId === tenantId,
      );
    },
    async listActive(tenantId) {
      return (await this.list(tenantId)).filter(
        (record) => record.status === "ACTIVE",
      );
    },
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async create(tenantId, input) {
      const parsed = createEntityQueryDefinitionInputSchema.parse(input);
      const now = new Date().toISOString();
      const id = `entity_query_${nanoid(12)}`;
      const record = buildEntityQueryDefinitionRecord(
        {
          id,
          tenantId,
          queryId: slugQueryId(parsed.name) || id,
          createdAt: now,
          updatedAt: now,
        },
        parsed,
      );
      store.set(key(tenantId, id), record);
      return record;
    },
    async update(tenantId, id, input) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Entity query definition not found: ${id}`);
      }

      patchEntityQueryDefinitionInputSchema.parse(input);
      const next = mergeEntityQueryDefinitionPatch(
        current,
        input,
        new Date().toISOString(),
      );
      store.set(key(tenantId, id), next);
      return next;
    },
    async delete(tenantId, id) {
      store.delete(key(tenantId, id));
    },
  };
}
