import {
  createHookInputSchema,
  hookRecordSchema,
  patchHookInputSchema,
  type HookRecord,
} from "@repo/hooks";
import { nanoid } from "nanoid";

import type { HookRepository } from "./repository-contract.js";

export function createInMemoryHookRepository(): HookRepository & {
  readonly store: Map<string, HookRecord>;
} {
  const store = new Map<string, HookRecord>();

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
    async getById(tenantId, id) {
      return store.get(key(tenantId, id)) ?? null;
    },
    async create(tenantId, input) {
      const parsed = createHookInputSchema.parse(input);
      const now = new Date().toISOString();
      const record = hookRecordSchema.parse({
        id: `hook_${nanoid(12)}`,
        tenantId,
        name: parsed.name,
        entity: parsed.entity,
        event: parsed.event,
        type: "action",
        config: parsed.config,
        enabled: parsed.enabled ?? true,
        order: parsed.order ?? 0,
        createdAt: now,
        updatedAt: now,
      });
      store.set(key(tenantId, record.id), record);
      return record;
    },
    async update(tenantId, id, input) {
      const current = store.get(key(tenantId, id));
      if (!current) {
        throw new Error(`Hook not found: ${id}`);
      }

      patchHookInputSchema.parse(input);
      const now = new Date().toISOString();
      const next = hookRecordSchema.parse({
        ...current,
        ...(input.name ? { name: input.name } : {}),
        ...(input.config ? { config: input.config } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        updatedAt: now,
      });
      store.set(key(tenantId, id), next);
      return next;
    },
  };
}
