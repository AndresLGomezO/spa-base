import { z } from "zod";

import type { HookEntityServices } from "./types.js";

export const MAX_HOOK_ACTION_TRACE_ENTRIES = 50;

export const entityWriteCountsSchema = z.object({
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  deleted: z.number().int().nonnegative(),
});
export type EntityWriteCounts = z.infer<typeof entityWriteCountsSchema>;

export const dataHookActionTraceOutcomeSchema = z.enum([
  "ran",
  "skipped",
  "empty",
]);
export type DataHookActionTraceOutcome = z.infer<
  typeof dataHookActionTraceOutcomeSchema
>;

export const dataHookResolutionSourceSchema = z.enum([
  "directMatch",
  "embeddingMatch",
  "llm",
  "unresolved",
]);
export type DataHookResolutionSource = z.infer<
  typeof dataHookResolutionSourceSchema
>;

export const dataHookActionTraceEntrySchema = z.object({
  type: z.string().trim().min(1),
  entity: z.string().trim().min(1).optional(),
  count: z.number().int().nonnegative().optional(),
  durationMs: z.number().int().nonnegative(),
  error: z.string().trim().optional(),
  as: z.string().trim().min(1).optional(),
  outcome: dataHookActionTraceOutcomeSchema.optional(),
  matched: z.boolean().optional(),
  score: z.number().optional(),
  candidateCount: z.number().int().nonnegative().optional(),
});
export type DataHookActionTraceEntry = z.infer<
  typeof dataHookActionTraceEntrySchema
>;

export const dataHookExecutionMetricsSchema = z.object({
  chainDepth: z.number().int().nonnegative().optional(),
  writesCreated: z.number().int().nonnegative().optional(),
  writesUpdated: z.number().int().nonnegative().optional(),
  writesDeleted: z.number().int().nonnegative().optional(),
  writesByEntity: z.record(z.string(), entityWriteCountsSchema).optional(),
  actionTrace: z.array(dataHookActionTraceEntrySchema).optional(),
  resolutionSource: dataHookResolutionSourceSchema.optional(),
});
export type DataHookExecutionMetrics = z.infer<
  typeof dataHookExecutionMetricsSchema
>;

const RESOLUTION_ACTION_TYPES = new Set([
  "matchRelatedRecord",
  "matchSimilarRecord",
  "callAi",
]);

/**
 * First-win resolution path: direct alias match → embedding similar → LLM.
 * Returns undefined when the trace has no resolution-relevant actions.
 */
export function deriveResolutionSource(
  actionTrace: readonly DataHookActionTraceEntry[],
): DataHookResolutionSource | undefined {
  const relevant = actionTrace.filter((entry) =>
    RESOLUTION_ACTION_TYPES.has(entry.type),
  );
  if (relevant.length === 0) {
    return undefined;
  }
  if (
    relevant.some(
      (entry) => entry.type === "matchRelatedRecord" && entry.matched === true,
    )
  ) {
    return "directMatch";
  }
  if (
    relevant.some(
      (entry) => entry.type === "matchSimilarRecord" && entry.matched === true,
    )
  ) {
    return "embeddingMatch";
  }
  if (
    relevant.some((entry) => entry.type === "callAi" && entry.matched === true)
  ) {
    return "llm";
  }
  return "unresolved";
}

export class HookWriteMetricsCollector {
  private readonly byEntity = new Map<string, EntityWriteCounts>();

  private entityCounts(entityName: string): EntityWriteCounts {
    const existing = this.byEntity.get(entityName);
    if (existing) {
      return existing;
    }
    const initial: EntityWriteCounts = {
      created: 0,
      updated: 0,
      deleted: 0,
    };
    this.byEntity.set(entityName, initial);
    return initial;
  }

  recordCreate(entityName: string): void {
    this.entityCounts(entityName).created += 1;
  }

  recordUpdate(entityName: string): void {
    this.entityCounts(entityName).updated += 1;
  }

  recordDelete(entityName: string): void {
    this.entityCounts(entityName).deleted += 1;
  }

  snapshot(): Pick<
    DataHookExecutionMetrics,
    "writesCreated" | "writesUpdated" | "writesDeleted" | "writesByEntity"
  > {
    let writesCreated = 0;
    let writesUpdated = 0;
    let writesDeleted = 0;
    const writesByEntity: Record<string, EntityWriteCounts> = {};

    for (const [entityName, counts] of this.byEntity.entries()) {
      writesCreated += counts.created;
      writesUpdated += counts.updated;
      writesDeleted += counts.deleted;
      writesByEntity[entityName] = { ...counts };
    }

    return {
      ...(writesCreated > 0 ? { writesCreated } : {}),
      ...(writesUpdated > 0 ? { writesUpdated } : {}),
      ...(writesDeleted > 0 ? { writesDeleted } : {}),
      ...(Object.keys(writesByEntity).length > 0 ? { writesByEntity } : {}),
    };
  }
}

export function wrapHookEntityServicesWithMetrics(
  services: HookEntityServices,
  metrics: HookWriteMetricsCollector,
): HookEntityServices {
  return {
    ...services,
    async create(entityName, data, options) {
      const result = await services.create(entityName, data, options);
      metrics.recordCreate(entityName);
      return result;
    },
    async createMany(entityName, records, options) {
      const result = await services.createMany(entityName, records, options);
      for (let index = 0; index < records.length; index += 1) {
        metrics.recordCreate(entityName);
      }
      return result;
    },
    async update(entityName, id, data, options) {
      const result = await services.update(entityName, id, data, options);
      metrics.recordUpdate(entityName);
      return result;
    },
    async delete(entityName, id, options) {
      const result = await services.delete(entityName, id, options);
      if (result) {
        metrics.recordDelete(entityName);
      }
      return result;
    },
  };
}

export function appendActionTraceEntry(
  trace: DataHookActionTraceEntry[],
  entry: DataHookActionTraceEntry,
): void {
  if (trace.length >= MAX_HOOK_ACTION_TRACE_ENTRIES) {
    return;
  }
  trace.push(entry);
}

export function buildExecutionMetricsSnapshot(options: {
  readonly chainDepth?: number;
  readonly writeMetrics?: HookWriteMetricsCollector;
  readonly actionTrace?: readonly DataHookActionTraceEntry[];
  readonly resolutionSource?: DataHookResolutionSource;
}): DataHookExecutionMetrics {
  const writeSnapshot = options.writeMetrics?.snapshot() ?? {};
  const actionTrace =
    options.actionTrace && options.actionTrace.length > 0
      ? [...options.actionTrace]
      : undefined;
  const resolutionSource =
    options.resolutionSource ??
    (actionTrace ? deriveResolutionSource(actionTrace) : undefined);

  return {
    ...(options.chainDepth != null && options.chainDepth > 0
      ? { chainDepth: options.chainDepth }
      : {}),
    ...writeSnapshot,
    ...(actionTrace ? { actionTrace } : {}),
    ...(resolutionSource ? { resolutionSource } : {}),
  };
}
