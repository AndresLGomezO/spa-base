import {
  createDataHookInputSchema,
  dataHookDefinitionSchema,
  patchDataHookInputSchema,
  type DataHookDefinition,
} from "@repo/hooks";
import { nanoid } from "nanoid";

import type { DataHookRepository } from "./repository-contract.js";

export function createInMemoryDataHookRepository(): DataHookRepository & {
  readonly store: Map<string, DataHookDefinition>;
} {
  const store = new Map<string, DataHookDefinition>();

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
      const parsed = createDataHookInputSchema.parse(input);
      const now = new Date().toISOString();
      const record = dataHookDefinitionSchema.parse({
        id: `hook_${nanoid(12)}`,
        tenantId,
        name: parsed.name,
        ...(parsed.description ? { description: parsed.description } : {}),
        entity: parsed.entity,
        phase: parsed.phase ?? "after",
        trigger: parsed.trigger,
        condition: parsed.condition ?? null,
        actions: parsed.actions,
        enabled: parsed.enabled ?? true,
        order: parsed.order ?? 0,
        ...(parsed.chainHooks !== undefined
          ? { chainHooks: parsed.chainHooks }
          : {}),
        ...(parsed.execution !== undefined
          ? { execution: parsed.execution }
          : {}),
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async update(tenantId, id, input) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Data hook not found: ${id}`);
      }

      patchDataHookInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = dataHookDefinitionSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description ?? undefined }
          : {}),
        ...(input.phase ? { phase: input.phase } : {}),
        ...(input.trigger ? { trigger: input.trigger } : {}),
        ...(input.condition !== undefined
          ? { condition: input.condition ?? null }
          : {}),
        ...(input.actions ? { actions: input.actions } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        ...(input.chainHooks !== undefined
          ? { chainHooks: input.chainHooks }
          : {}),
        ...(input.execution !== undefined
          ? { execution: input.execution }
          : {}),
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
