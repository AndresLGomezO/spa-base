import { nanoid } from "nanoid";

import { aiJobRecordSchema, type AiJobRecord } from "@repo/ai-engine/schemas";

import type { AiJobRepository } from "./repository-contract.js";

export function createInMemoryAiJobRepository(): AiJobRepository & {
  readonly records: Map<string, AiJobRecord>;
} {
  const records = new Map<string, AiJobRecord>();

  function key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  return {
    records,
    async create(tenantId, input) {
      const now = new Date().toISOString();
      const id = `aijob_${nanoid(12)}`;
      const record = aiJobRecordSchema.parse({
        id,
        tenantId,
        feature: input.feature,
        status: "pending",
        input: input.input,
        output: null,
        error: null,
        requestedBy: input.requestedBy,
        permission: input.permission,
        createdAt: now,
        updatedAt: now,
      });
      records.set(key(tenantId, id), record);
      return record;
    },
    async getById(tenantId, id) {
      return records.get(key(tenantId, id)) ?? null;
    },
    async update(tenantId, id, patch) {
      const current = records.get(key(tenantId, id));
      if (!current) {
        throw new Error(`AI job not found: ${id}`);
      }
      const next = aiJobRecordSchema.parse({
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      });
      records.set(key(tenantId, id), next);
      return next;
    },
  };
}
