import { z } from "zod";
import {
  resolveAndAssembleUserContextSections,
  refreshUserAiMemory,
} from "@repo/ai-engine/grounded-chat";
import type {
  AiContextSectionRepository,
  AiJobRepository,
  AiRecordSummaryRepository,
  EntityQueryDefinitionRepository,
  MetricDefinitionRepository,
  UserAiMemoryRepository,
} from "@repo/firestore-converters";

import { createUserContextSectionDataPorts } from "../ai/create-user-context-section-data-ports.js";
import type { WorkerHookEntityRuntime } from "../hooks/worker-hook-entity-runtime.js";
import type { GroundedChatDataPorts } from "@repo/ai-engine/grounded-chat";

export const refreshUserAiMemoryTaskPayloadSchema = z.object({
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  jobId: z.string().trim().min(1).optional(),
});

export type RefreshUserAiMemoryTaskPayload = z.infer<
  typeof refreshUserAiMemoryTaskPayloadSchema
>;

export const nightlyUserAiMemoryTaskPayloadSchema = z.object({
  tenantId: z.string().trim().min(1),
  /** ISO timestamp; memories updated since this are refreshed. Default: 30d ago. */
  sinceIso: z.string().trim().min(1).optional(),
});

export type NightlyUserAiMemoryTaskPayload = z.infer<
  typeof nightlyUserAiMemoryTaskPayloadSchema
>;

export interface UserAiMemoryRefreshProcessorDeps {
  readonly userAiMemoryRepository: UserAiMemoryRepository;
  readonly aiContextSectionRepository?: AiContextSectionRepository;
  readonly aiRecordSummaryRepository?: AiRecordSummaryRepository;
  readonly entityRuntime?: WorkerHookEntityRuntime;
  readonly metricDefinitionRepository?: MetricDefinitionRepository;
  readonly entityQueryDefinitionRepository?: EntityQueryDefinitionRepository;
  readonly groundedChatDataPorts?: GroundedChatDataPorts;
  readonly aiJobRepository?: AiJobRepository;
  readonly enqueueUserRefresh?: (input: {
    readonly tenantId: string;
    readonly userId: string;
  }) => Promise<void>;
}

export async function processUserAiMemoryRefresh(
  deps: UserAiMemoryRefreshProcessorDeps,
  tenantId: string,
  userId: string,
): Promise<void> {
  if (deps.entityRuntime) {
    await deps.entityRuntime.ensureTenantEntitiesLoaded(tenantId);
  }

  const [metrics, queries, sections, entities] = await Promise.all([
    deps.metricDefinitionRepository?.listActive(tenantId) ??
      Promise.resolve([]),
    deps.entityQueryDefinitionRepository?.listActive(tenantId) ??
      Promise.resolve([]),
    deps.aiContextSectionRepository?.listEnabled(tenantId) ??
      Promise.resolve([]),
    deps.groundedChatDataPorts?.listEntities(tenantId, userId) ??
      Promise.resolve([]),
  ]);

  let assembledSectionsText: string | undefined;
  if (sections.length > 0 && deps.entityRuntime) {
    const sectionPorts = createUserContextSectionDataPorts({
      tenantId,
      userId,
      getRepository: (tid, entityName) =>
        deps.entityRuntime!.getRepository(tid, entityName),
      isTenantWideRead: (tid, entityName) =>
        deps.entityRuntime!.resolveEntity(entityName, tid)?.metadata
          .tenantWideRead === true,
      ...(deps.aiRecordSummaryRepository
        ? { aiRecordSummaryRepository: deps.aiRecordSummaryRepository }
        : {}),
    });
    const assembled = await resolveAndAssembleUserContextSections({
      sections,
      ports: sectionPorts,
      userId,
      userPermissions: [],
    });
    assembledSectionsText = assembled.text;
  }

  await refreshUserAiMemory(
    { repository: deps.userAiMemoryRepository },
    tenantId,
    userId,
    {
      entitySummaries: entities.map((e) => ({
        name: e.name,
        ...(e.label ? { label: e.label } : {}),
      })),
      metricSummaries: metrics.map((m) => ({ id: m.id, name: m.name })),
      querySummaries: queries.map((q) => ({
        id: q.id,
        name: q.name,
        ...(q.sourceEntity ? { entityName: q.sourceEntity } : {}),
      })),
      ...(assembledSectionsText ? { assembledSectionsText } : {}),
    },
  );
}

export async function processNightlyUserAiMemoryRefresh(
  deps: UserAiMemoryRefreshProcessorDeps,
  tenantId: string,
  sinceIso?: string,
): Promise<{ readonly enqueued: number }> {
  const since =
    sinceIso ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const memories = await deps.userAiMemoryRepository.listUpdatedSince(
    tenantId,
    since,
  );
  let enqueued = 0;
  for (const memory of memories) {
    if (deps.enqueueUserRefresh) {
      await deps.enqueueUserRefresh({
        tenantId,
        userId: memory.userId,
      });
      enqueued += 1;
    } else {
      await processUserAiMemoryRefresh(deps, tenantId, memory.userId);
      enqueued += 1;
    }
  }
  return { enqueued };
}
