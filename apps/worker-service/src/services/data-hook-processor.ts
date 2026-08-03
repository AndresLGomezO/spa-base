import {
  runQueuedDataHookJob,
  dataHookJobPayloadSchema,
  type DataHookJobPayload,
  type HookLogger,
} from "@repo/hooks";
import {
  createMetricRuntimeContext,
  type AggregationEmitterDeps,
} from "@repo/aggregation-engine";
import { getAllKnownPermissions, buildTenantRoleCatalog } from "@repo/rbac";
import {
  AGGREGATION_EVENTS_TOPIC,
  createFirestoreAdminAggregationEventRepository,
  createFirestoreAdminBackfillJobRepository,
  createFirestoreAdminDataHookRepository,
  createFirestoreAdminDataHookExecutionRepository,
  createFirestoreAdminFormulaDefinitionRepository,
  createFirestoreAdminHookLogMessageRepository,
  createFirestoreAdminMetricContributionRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminMetricValueRepository,
  createFirestoreAdminUserNotificationRepository,
  createFirestoreAdminPushTokenRepository,
  createFirestoreAdminRegisteredUserRepository,
  createFirestoreAdminPlatformRoleRepository,
  createFirestoreAdminTenantRoleRepository,
  createFirestoreAdminTenantAiContextRepository,
  createFirestoreAdminAiRecordSummaryRepository,
  publishAggregationEventMessage,
} from "@repo/gcp-firebase";
import { createFirestoreAdminEntityDefinitionRepository } from "@repo/gcp-firebase";
import { createFormulaRuntimeContext } from "@repo/formula-definitions/runtime";
import { bootstrapPlatformApp } from "@app/platform/bootstrap.js";
import { platformApp } from "@app/platform/app.config.js";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import type { AiController } from "@repo/ai-engine/controller";
import type { VectorIndexService } from "@repo/ai-retrieval";
import type { VertexCachedContentClient } from "@repo/ai-engine/grounded-chat";
import type { DataHookAiCacheRepository } from "@repo/firestore-converters/data-hook-ai-cache";

import { PermanentTaskError } from "./ai-chat-processor.js";
import { callDataHookWebhook } from "../hooks/call-data-hook-webhook.js";
import { createCallDataHookAi } from "../hooks/call-data-hook-ai.js";
import { createComputeDataHookEmbedding } from "../hooks/compute-data-hook-embedding.js";
import {
  createComputeRecordAiSummary,
  createEnqueueAiRecordNarrative,
  createInvalidateAiRecordNarratives,
  createUpsertAiRecordContext,
} from "../ai/compute-record-ai-summary.js";
import { createRecordNarrativeRefreshProcessor } from "./record-narrative-refresh-processor.js";
import {
  createRecordDataHookExecution,
  createDataHookExecutionRecorderForTenant,
} from "../hooks/record-data-hook-execution.js";
import { createLoadRequestPermissionsDeps } from "../hooks/worker-permission-deps.js";
import { HookRuntimeContext } from "../hooks/worker-hook-runtime-context.js";
import { WorkerHookEntityRuntime } from "../hooks/worker-hook-entity-runtime.js";
import {
  buildHookEntityServices,
  resolveHookUserContext,
  type WorkerCrudHookDeps,
} from "../hooks/worker-hook-entity-services.js";
import { createSendUserNotificationWithPush } from "@repo/gcp-firebase";
import { vertexAiConfig, workerEnv } from "../config/env.js";

export { dataHookJobPayloadSchema };

export class PermanentHookTaskError extends PermanentTaskError {
  constructor(code: string) {
    super(code);
    this.name = "PermanentHookTaskError";
  }
}

export type DataHookProcessorDeps = WorkerCrudHookDeps;

export function createDataHookProcessorDeps(
  firebaseAdminConfig: FirebaseAdminConfig,
  options: {
    readonly aiController: AiController;
    readonly vectorIndexService: VectorIndexService;
    readonly cacheClient?: VertexCachedContentClient;
    readonly cacheRepository?: DataHookAiCacheRepository;
    readonly isDataHookAiCacheEnabled?: () => boolean | Promise<boolean>;
    readonly onRecordSummaryUpdated?: (input: {
      readonly tenantId: string;
      readonly entityName: string;
      readonly recordId: string;
      readonly ownerId?: string;
      readonly accessUserIds: readonly string[];
    }) => void;
  },
): DataHookProcessorDeps {
  bootstrapPlatformApp(platformApp);

  const hookRepository =
    createFirestoreAdminDataHookRepository(firebaseAdminConfig);
  const hookExecutionRepository =
    createFirestoreAdminDataHookExecutionRepository(firebaseAdminConfig);
  const hookLogMessageRepository =
    createFirestoreAdminHookLogMessageRepository(firebaseAdminConfig);
  const userNotificationRepository =
    createFirestoreAdminUserNotificationRepository(firebaseAdminConfig);
  const pushTokenRepository =
    createFirestoreAdminPushTokenRepository(firebaseAdminConfig);
  const registeredUserRepository =
    createFirestoreAdminRegisteredUserRepository(firebaseAdminConfig);
  const tenantRoleRepository =
    createFirestoreAdminTenantRoleRepository(firebaseAdminConfig);
  const platformRoleRepository =
    createFirestoreAdminPlatformRoleRepository(firebaseAdminConfig);
  const entityDefinitionRepository =
    createFirestoreAdminEntityDefinitionRepository(firebaseAdminConfig);
  const tenantAiContextRepository =
    createFirestoreAdminTenantAiContextRepository(firebaseAdminConfig);
  const aiRecordSummaryRepository =
    createFirestoreAdminAiRecordSummaryRepository(firebaseAdminConfig);
  const refreshNarrative = createRecordNarrativeRefreshProcessor({
    aiRecordSummaryRepository,
    aiController: options.aiController,
    reasoningModelId: vertexAiConfig.reasoningModelId ?? vertexAiConfig.modelId,
  });
  const computeRecordAiSummaryDeps = {
    tenantAiContextRepository,
    aiRecordSummaryRepository,
    aiController: options.aiController,
    vectorIndexService: options.vectorIndexService,
    refreshNarrative,
    ...(options.onRecordSummaryUpdated
      ? { onRecordSummaryUpdated: options.onRecordSummaryUpdated }
      : {}),
  };

  const permissionDeps = createLoadRequestPermissionsDeps(
    registeredUserRepository,
    async (tenantId) => {
      const [globalTemplates, tenantRoles] = await Promise.all([
        platformRoleRepository.listGlobal(),
        tenantRoleRepository.list(tenantId),
      ]);
      return buildTenantRoleCatalog(tenantRoles, globalTemplates);
    },
  );

  const metricRuntime = createMetricRuntimeContext({
    metricDefinitionRepository:
      createFirestoreAdminMetricDefinitionRepository(firebaseAdminConfig),
    aggregationEventRepository:
      createFirestoreAdminAggregationEventRepository(firebaseAdminConfig),
    metricValueRepository:
      createFirestoreAdminMetricValueRepository(firebaseAdminConfig),
    backfillJobRepository:
      createFirestoreAdminBackfillJobRepository(firebaseAdminConfig),
    metricContributionRepository:
      createFirestoreAdminMetricContributionRepository(firebaseAdminConfig),
  });

  const aggregation: AggregationEmitterDeps = {
    metricRuntime,
    // Email ingest / data hooks must update KPI metrics in-process.
    // Publishing to Pub/Sub is optional and must never be the only path —
    // the local emulator subscription is unreliable and drops events.
    publishToPubSub: false,
    aggregationTopic:
      workerEnv.AGGREGATION_EVENTS_TOPIC || AGGREGATION_EVENTS_TOPIC,
    projectId: workerEnv.GCP_PROJECT_ID,
    getSchemaVersion: () => 1,
    publishAggregationEvent: publishAggregationEventMessage,
    log: (message, meta) => {
      console.log(JSON.stringify({ message, ...meta }));
    },
  };

  const entityRuntime = new WorkerHookEntityRuntime(
    firebaseAdminConfig,
    entityDefinitionRepository,
    workerEnv.TENANT_ENCRYPTION_MASTER_KEY?.trim() || undefined,
  );

  return {
    hookRuntime: new HookRuntimeContext(hookRepository),
    formulaRuntime: createFormulaRuntimeContext(
      createFirestoreAdminFormulaDefinitionRepository(firebaseAdminConfig),
    ),
    entityRuntime,
    permissionDeps,
    hookExecutionRepository,
    hookLogMessageRepository,
    userNotificationRepository,
    pushTokenRepository,
    firebaseAdminConfig,
    callWebhook: callDataHookWebhook,
    callAi: createCallDataHookAi({
      vertexAiConfig,
      aiController: options.aiController,
      getRepository: (tenantId, entityName) =>
        entityRuntime.getRepository(tenantId, entityName),
      ...(options.cacheClient ? { cacheClient: options.cacheClient } : {}),
      ...(options.cacheRepository
        ? { cacheRepository: options.cacheRepository }
        : {}),
      ...(options.isDataHookAiCacheEnabled
        ? { isDataHookAiCacheEnabled: options.isDataHookAiCacheEnabled }
        : {}),
    }),
    computeEmbedding: createComputeDataHookEmbedding({
      vertexAiConfig,
      aiController: options.aiController,
    }),
    computeRecordAiSummary: createComputeRecordAiSummary(
      computeRecordAiSummaryDeps,
    ),
    upsertAiRecordContext: createUpsertAiRecordContext(
      computeRecordAiSummaryDeps,
    ),
    enqueueAiRecordNarrative: createEnqueueAiRecordNarrative(
      computeRecordAiSummaryDeps,
    ),
    invalidateAiRecordNarratives: createInvalidateAiRecordNarratives(
      computeRecordAiSummaryDeps,
    ),
    refreshNarrative,
    aiRecordSummaryRepository,
    aiController: options.aiController,
    aggregation,
    ...(options.cacheClient ||
    options.cacheRepository ||
    options.isDataHookAiCacheEnabled
      ? {
          callAiCache: {
            ...(options.cacheClient
              ? { cacheClient: options.cacheClient }
              : {}),
            ...(options.cacheRepository
              ? { cacheRepository: options.cacheRepository }
              : {}),
            ...(options.isDataHookAiCacheEnabled
              ? {
                  isDataHookAiCacheEnabled: options.isDataHookAiCacheEnabled,
                }
              : {}),
          },
        }
      : {}),
  };
}

function createInProcessHookTaskDispatcher(
  deps: DataHookProcessorDeps,
  logger: HookLogger,
): (payload: DataHookJobPayload) => Promise<void> {
  return async (payload) => {
    void processDataHookJob(deps, payload, logger).catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Nested data hook job failed.";
      logger.error("Nested data hook job failed", {
        hookId: payload.hookId,
        tenantId: payload.tenantId,
        entityName: payload.entityName,
        error: message,
      });
    });
  };
}

async function resolveHookDefinition(
  deps: DataHookProcessorDeps,
  tenantId: string,
  hookId: string,
) {
  let definition = await deps.hookRuntime.repository.getById(tenantId, hookId);
  if (!definition) {
    await deps.hookRuntime.reloadTenantHooks(tenantId);
    definition = await deps.hookRuntime.repository.getById(tenantId, hookId);
  }
  return definition;
}

async function finishHookNotFoundExecution(
  deps: DataHookProcessorDeps,
  payload: DataHookJobPayload,
): Promise<void> {
  if (!payload.executionId || !deps.hookExecutionRepository) {
    return;
  }

  const recorder = createDataHookExecutionRecorderForTenant(
    deps.hookExecutionRepository,
    payload.tenantId,
  );
  const finishedAt = new Date().toISOString();
  await recorder.finish({
    id: payload.executionId,
    status: "error",
    error: "Hook not found.",
    durationMs: 0,
    finishedAt,
  });
}

export async function processDataHookJob(
  deps: DataHookProcessorDeps,
  payload: DataHookJobPayload,
  logger: HookLogger,
): Promise<void> {
  await deps.entityRuntime.ensureTenantEntitiesLoaded(payload.tenantId);
  await deps.hookRuntime.ensureTenantHooksLoaded(payload.tenantId);

  const definition = await resolveHookDefinition(
    deps,
    payload.tenantId,
    payload.hookId,
  );
  if (!definition) {
    await finishHookNotFoundExecution(deps, payload);
    throw new PermanentHookTaskError("HOOK_NOT_FOUND");
  }
  if (!definition.enabled) {
    return;
  }

  const user = await resolveHookUserContext(
    payload.tenantId,
    payload.user.uid,
    deps.permissionDeps,
    {
      getKnownPermissions: (tenantId) => getAllKnownPermissions(tenantId),
    },
  );

  const formulaResolver = await deps.formulaRuntime.getFormulaResolver(
    payload.tenantId,
  );

  const entities = buildHookEntityServices({
    user,
    deps,
    logger,
    formulaResolver,
    enqueueDataHookJob: createInProcessHookTaskDispatcher(deps, logger),
  });

  await runQueuedDataHookJob(definition, payload, {
    entities,
    logger,
    formulaResolver,
    ...(deps.hookExecutionRepository
      ? {
          recordDataHookExecution: createRecordDataHookExecution(
            deps.hookExecutionRepository,
            payload.tenantId,
          ),
          dataHookExecutionRecorder: createDataHookExecutionRecorderForTenant(
            deps.hookExecutionRepository,
            payload.tenantId,
          ),
        }
      : {}),
    ...(deps.callWebhook ? { callWebhook: deps.callWebhook } : {}),
    ...(deps.callAi ? { callAi: deps.callAi } : {}),
    ...(deps.computeEmbedding
      ? { computeEmbedding: deps.computeEmbedding }
      : {}),
    ...(deps.computeRecordAiSummary
      ? { computeRecordAiSummary: deps.computeRecordAiSummary }
      : {}),
    ...(deps.upsertAiRecordContext
      ? { upsertAiRecordContext: deps.upsertAiRecordContext }
      : {}),
    ...(deps.enqueueAiRecordNarrative
      ? { enqueueAiRecordNarrative: deps.enqueueAiRecordNarrative }
      : {}),
    ...(deps.invalidateAiRecordNarratives
      ? { invalidateAiRecordNarratives: deps.invalidateAiRecordNarratives }
      : {}),
    ...(deps.userNotificationRepository
      ? {
          sendUserNotification: createSendUserNotificationWithPush({
            userNotificationRepository: deps.userNotificationRepository,
            tenantId: payload.tenantId,
            ...(deps.pushTokenRepository
              ? { pushTokenRepository: deps.pushTokenRepository }
              : {}),
            ...(deps.firebaseAdminConfig
              ? { firebaseAdminConfig: deps.firebaseAdminConfig }
              : {}),
            onPushError: (error) => {
              logger.error("Failed to deliver web push notification", {
                err: error,
                tenantId: payload.tenantId,
                userId: payload.user.uid,
              });
            },
          }),
        }
      : {}),
  });
}
