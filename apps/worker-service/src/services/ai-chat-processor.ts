import type { AiController } from "@repo/ai-engine/controller";
import type { AiJobRepository } from "@repo/worker-firestore";
import { AI_FEATURE_RUN_PERMISSION } from "@repo/ai-engine/permissions";
import { processAiChatTaskPayloadSchema } from "@repo/ai-engine/schemas";
import {
  resolveAndAssembleUserContextSections,
  type GroundedChatDataPorts,
} from "@repo/ai-engine/grounded-chat";
import type {
  AiChatSessionRepository,
  AiContextSectionRepository,
  AiRecordSummaryRepository,
  MetricDefinitionRepository,
  EntityQueryDefinitionRepository,
  TenantAiContextRepository,
  UserAiMemoryRepository,
} from "@repo/firestore-converters";

import { processAiChat, type VertexAiConfig } from "../process-ai-chat.js";
import type { WorkerHookEntityRuntime } from "../hooks/worker-hook-entity-runtime.js";
import { createUserContextSectionDataPorts } from "../ai/create-user-context-section-data-ports.js";
import {
  emitAiChatMetrics,
  emitAiErrorMetric,
} from "@repo/ai-engine/observability";

export interface AiChatProcessorDeps {
  readonly aiJobRepository: AiJobRepository;
  readonly vertexAiConfig: VertexAiConfig;
  readonly aiController: AiController;
  readonly tenantAiContextRepository: TenantAiContextRepository;
  readonly userAiMemoryRepository: UserAiMemoryRepository;
  readonly aiChatSessionRepository: AiChatSessionRepository;
  readonly groundedChatDataPorts: GroundedChatDataPorts;
  readonly entityRuntime?: WorkerHookEntityRuntime;
  readonly metricDefinitionRepository?: MetricDefinitionRepository;
  readonly entityQueryDefinitionRepository?: EntityQueryDefinitionRepository;
  readonly aiContextSectionRepository?: AiContextSectionRepository;
  readonly aiRecordSummaryRepository?: AiRecordSummaryRepository;
  readonly isAiTraceEnabled?: () => boolean | Promise<boolean>;
}

export async function processAiChatJob(
  deps: AiChatProcessorDeps,
  tenantId: string,
  jobId: string,
): Promise<void> {
  const job = await deps.aiJobRepository.getById(tenantId, jobId);
  if (!job) {
    throw new PermanentTaskError("JOB_NOT_FOUND");
  }

  if (job.feature !== "chat") {
    throw new PermanentTaskError("INVALID_FEATURE");
  }

  if (job.permission !== AI_FEATURE_RUN_PERMISSION.chat) {
    throw new PermanentTaskError("INVALID_PERMISSION");
  }

  if (job.status === "completed" || job.status === "failed") {
    return;
  }

  await deps.aiJobRepository.update(tenantId, jobId, { status: "running" });

  try {
    if (!("question" in job.input) || typeof job.input.question !== "string") {
      throw new PermanentTaskError("INVALID_INPUT");
    }
    const question = job.input.question;
    const sessionId =
      "sessionId" in job.input && typeof job.input.sessionId === "string"
        ? job.input.sessionId
        : undefined;
    const userPermissions =
      "userPermissions" in job.input && Array.isArray(job.input.userPermissions)
        ? job.input.userPermissions.filter(
            (p): p is string => typeof p === "string",
          )
        : [];

    if (deps.entityRuntime) {
      await deps.entityRuntime.ensureTenantEntitiesLoaded(tenantId);
    }

    const [metrics, queries, sections] = await Promise.all([
      deps.metricDefinitionRepository?.listActive(tenantId) ??
        Promise.resolve([]),
      deps.entityQueryDefinitionRepository?.listActive(tenantId) ??
        Promise.resolve([]),
      deps.aiContextSectionRepository?.listEnabled(tenantId) ??
        Promise.resolve([]),
    ]);

    const entities = await deps.groundedChatDataPorts.listEntities(
      tenantId,
      job.requestedBy,
    );

    let assembledSectionsText: string | undefined;
    if (sections.length > 0 && deps.entityRuntime) {
      const sectionPorts = createUserContextSectionDataPorts({
        tenantId,
        userId: job.requestedBy,
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
        userId: job.requestedBy,
        userPermissions,
      });
      assembledSectionsText = assembled.text;
    }

    const memoryRefreshSource = {
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
    };

    const output = await processAiChat(
      deps.vertexAiConfig,
      { question, ...(sessionId ? { sessionId } : {}) },
      {
        aiController: deps.aiController,
        tenantId,
        parentJobId: jobId,
        requestedBy: job.requestedBy,
        tenantAiContextRepository: deps.tenantAiContextRepository,
        userAiMemoryRepository: deps.userAiMemoryRepository,
        aiChatSessionRepository: deps.aiChatSessionRepository,
        dataPorts: deps.groundedChatDataPorts,
        ...(sessionId ? { sessionId } : {}),
        ...(deps.isAiTraceEnabled
          ? { isAiTraceEnabled: deps.isAiTraceEnabled }
          : {}),
        memoryRefreshSource,
        callbacks: {
          onProgress: async (progress) => {
            await deps.aiJobRepository.update(tenantId, jobId, { progress });
          },
          onPartialAnswer: async (partialAnswer) => {
            await deps.aiJobRepository.update(tenantId, jobId, {
              draft: {
                partialAnswer,
                streaming: true,
              },
            });
          },
        },
      },
    );

    const childJobs = await deps.aiJobRepository.listRecent(tenantId, {
      parentJobId: jobId,
      limit: 50,
    });
    let promptTokens = 0;
    let candidatesTokens = 0;
    let cachedContentTokens = 0;
    let totalTokens = 0;
    let estimatedCostUsd = 0;
    for (const child of childJobs) {
      const usage = child.modelUsage;
      if (!usage) continue;
      promptTokens += usage.promptTokens ?? 0;
      candidatesTokens += usage.candidatesTokens ?? 0;
      cachedContentTokens += usage.cachedContentTokens ?? 0;
      totalTokens += usage.totalTokens ?? 0;
      estimatedCostUsd += usage.estimatedCostUsd ?? 0;
    }

    const cacheHitRatio =
      promptTokens > 0
        ? Math.min(1, cachedContentTokens / promptTokens)
        : output.metrics.cacheHit
          ? 1
          : 0;

    const { metrics: orchestratorMetrics, ...chatOutput } = output;

    await deps.aiJobRepository.update(tenantId, jobId, {
      status: "completed",
      output: chatOutput,
      error: null,
      progress: null,
      draft: {
        partialAnswer: chatOutput.answer,
        streaming: false,
      },
      metrics: {
        stepCount: orchestratorMetrics.stepCount,
        toolCallCount: orchestratorMetrics.toolCallCount,
        cacheHitRatio,
        parseRetryCount: orchestratorMetrics.parseRetryCount,
        promptTokens,
        candidatesTokens,
        cachedContentTokens,
        totalTokens,
        estimatedCostUsd,
        ...(orchestratorMetrics.retrievalTop1Score != null
          ? { retrievalTop1Score: orchestratorMetrics.retrievalTop1Score }
          : {}),
        ...(orchestratorMetrics.confidence != null
          ? { confidence: orchestratorMetrics.confidence }
          : {}),
      },
    });
    emitAiChatMetrics({
      tenantId,
      stepCount: orchestratorMetrics.stepCount,
      toolCallCount: orchestratorMetrics.toolCallCount,
      cacheHitRatio,
      totalTokens,
      ...(orchestratorMetrics.retrievalTop1Score != null
        ? { retrievalTop1Score: orchestratorMetrics.retrievalTop1Score }
        : {}),
      ...(orchestratorMetrics.confidence != null
        ? { confidence: orchestratorMetrics.confidence }
        : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI chat processing failed.";
    await deps.aiJobRepository.update(tenantId, jobId, {
      status: "failed",
      output: null,
      error: message,
      progress: null,
      draft: {
        streaming: false,
      },
    });
    emitAiErrorMetric({ tenantId, feature: "chat" });
    throw new PermanentTaskError("PROCESSING_FAILED");
  }
}

export class PermanentTaskError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "PermanentTaskError";
  }
}

export { processAiChatTaskPayloadSchema };
