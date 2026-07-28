import {
  resolveAndAssembleUserContextSections,
  refreshUserAiMemory,
} from "@repo/ai-engine/grounded-chat";
import type {
  AiContextSectionRepository,
  AiRecordSummaryRepository,
  EntityQueryDefinitionRepository,
  MetricDefinitionRepository,
  UserAiMemoryRepository,
} from "@repo/firestore-converters";

import { createUserContextSectionDataPorts } from "../ai/create-user-context-section-data-ports.js";
import type { WorkerHookEntityRuntime } from "../hooks/worker-hook-entity-runtime.js";
import type { GroundedChatDataPorts } from "@repo/ai-engine/grounded-chat";

export interface UserAiMemoryRefreshProcessorDeps {
  readonly userAiMemoryRepository: UserAiMemoryRepository;
  readonly aiContextSectionRepository?: AiContextSectionRepository;
  readonly aiRecordSummaryRepository?: AiRecordSummaryRepository;
  readonly entityRuntime?: WorkerHookEntityRuntime;
  readonly metricDefinitionRepository?: MetricDefinitionRepository;
  readonly entityQueryDefinitionRepository?: EntityQueryDefinitionRepository;
  readonly groundedChatDataPorts?: GroundedChatDataPorts;
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
