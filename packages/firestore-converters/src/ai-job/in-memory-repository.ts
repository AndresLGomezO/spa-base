import { nanoid } from "nanoid";

import {
  aiJobRecordSchema,
  type AiJobRecord,
  type AiJobStepTraceEntry,
} from "@repo/ai-engine/schemas";
import { sanitizeStepTraceForPersistence } from "@repo/ai-engine/sanitize-ai-job-persistence";

import { isIsoWithinTimeRange } from "../list-recent-time-range.js";
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
        status: input.status ?? "pending",
        input: input.input,
        output: null,
        error: input.error ?? null,
        progress: null,
        draft: null,
        requestedBy: input.requestedBy,
        permission: input.permission,
        createdAt: now,
        updatedAt: now,
        ...(input.operation ? { operation: input.operation } : {}),
        ...(input.parentJobId ? { parentJobId: input.parentJobId } : {}),
        ...(input.contextRef ? { contextRef: input.contextRef } : {}),
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
    async appendStepTrace(tenantId, id, entry: AiJobStepTraceEntry) {
      const current = records.get(key(tenantId, id));
      if (!current) {
        throw new Error(`AI job not found: ${id}`);
      }
      const nextTrace = sanitizeStepTraceForPersistence([
        ...(current.stepTrace ?? []),
        entry,
      ]);
      const next = aiJobRecordSchema.parse({
        ...current,
        stepTrace: nextTrace,
        updatedAt: new Date().toISOString(),
      });
      records.set(key(tenantId, id), next);
      return next;
    },
    async listRecent(tenantId, options) {
      const limit = Math.min(Math.max(options?.limit ?? 20, 1), 1000);
      const feature = options?.feature;
      const parentJobId = options?.parentJobId;
      return [...records.values()]
        .filter((record) => record.tenantId === tenantId)
        .filter((record) => (feature ? record.feature === feature : true))
        .filter((record) =>
          parentJobId ? record.parentJobId === parentJobId : true,
        )
        .filter((record) => isIsoWithinTimeRange(record.updatedAt, options))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, limit);
    },
  };
}
