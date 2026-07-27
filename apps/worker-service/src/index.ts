import {
  createFirestoreAdminAiJobRepository,
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminTenantAiContextRepository,
  createFirestoreAdminUiBuilderAiSuggestionRepository,
  initializeFirebaseAdmin,
} from "@repo/worker-firestore";
import { createRuntimeSettingsCache } from "@repo/debug-logs";
import {
  createInMemoryVectorIndexClient,
  createRestVertexVectorIndexClient,
  VectorIndexService,
} from "@repo/ai-retrieval";
import {
  createFirestoreAdminAiChatSessionRepository,
  createFirestoreAdminAiContextSectionRepository,
  createFirestoreAdminAiSpendRepository,
  createFirestoreAdminDataHookAiCacheRepository,
  createFirestoreAdminEntityDefinitionRepository as createFullEntityDefinitionRepository,
  createFirestoreAdminEntityQueryDefinitionRepository,
  createFirestoreAdminInsightSurfaceRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminPlatformRoleRepository,
  createFirestoreAdminPlatformRuntimeSettingsRepository,
  createFirestoreAdminRegisteredUserRepository,
  createFirestoreAdminTenantRepository,
  createFirestoreAdminTenantRoleRepository,
  createFirestoreAdminUserAiMemoryRepository,
} from "@repo/gcp-firebase";
import { createRestVertexCachedContentClient } from "@repo/ai-engine/grounded-chat";
import { buildTenantRoleCatalog } from "@repo/rbac";

import { createWorkerAiController } from "./ai/create-worker-ai-controller.js";
import { createGroundedChatDataPorts } from "./ai/create-grounded-chat-data-ports.js";
import { createDebouncedUserAiMemoryRefreshScheduler } from "./ai/debounced-user-ai-memory-refresh.js";
import { vertexAiConfig, vertexVectorConfig, workerEnv } from "./config/env.js";
import { createDataHookProcessorDeps } from "./services/data-hook-processor.js";
import { createGmailIngestProcessorDeps } from "./services/gmail-ingest-processor.js";
import { startLocalGmailPollScheduler } from "./services/local-gmail-poll-scheduler.js";
import { createWorkerGmailTaskEnqueuer } from "./services/worker-gmail-task-enqueuer.js";
import { processUserAiMemoryRefresh } from "./services/user-ai-memory-refresh-processor.js";
import { buildWorkerServer } from "./server.js";

const firebaseAdminConfig = {
  projectId: workerEnv.GCP_PROJECT_ID,
  authEmulatorHost: workerEnv.FIREBASE_AUTH_EMULATOR_HOST,
  firestoreEmulatorHost: workerEnv.FIRESTORE_EMULATOR_HOST,
  storageEmulatorHost: workerEnv.FIREBASE_STORAGE_EMULATOR_HOST,
  storageEmulatorPublicHost: workerEnv.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
  storageBucket: workerEnv.GCP_STORAGE_BUCKET,
};

initializeFirebaseAdmin(firebaseAdminConfig);

const aiJobRepository =
  createFirestoreAdminAiJobRepository(firebaseAdminConfig);
const tenantAiContextRepository =
  createFirestoreAdminTenantAiContextRepository(firebaseAdminConfig);
const userAiMemoryRepository =
  createFirestoreAdminUserAiMemoryRepository(firebaseAdminConfig);
const aiChatSessionRepository =
  createFirestoreAdminAiChatSessionRepository(firebaseAdminConfig);
const aiContextSectionRepository =
  createFirestoreAdminAiContextSectionRepository(firebaseAdminConfig);
const uiBuilderAiSuggestionRepository =
  createFirestoreAdminUiBuilderAiSuggestionRepository(firebaseAdminConfig);
const entityDefinitionRepository =
  createFirestoreAdminEntityDefinitionRepository(firebaseAdminConfig);
const fullEntityDefinitionRepository =
  createFullEntityDefinitionRepository(firebaseAdminConfig);
const metricDefinitionRepository =
  createFirestoreAdminMetricDefinitionRepository(firebaseAdminConfig);
const entityQueryDefinitionRepository =
  createFirestoreAdminEntityQueryDefinitionRepository(firebaseAdminConfig);
const insightSurfaceRepository =
  createFirestoreAdminInsightSurfaceRepository(firebaseAdminConfig);
const platformRuntimeSettingsRepository =
  createFirestoreAdminPlatformRuntimeSettingsRepository(firebaseAdminConfig);
const runtimeSettingsCache = createRuntimeSettingsCache(
  platformRuntimeSettingsRepository,
);

const aiSpendRepository =
  createFirestoreAdminAiSpendRepository(firebaseAdminConfig);
const tenantRepository =
  createFirestoreAdminTenantRepository(firebaseAdminConfig);
const registeredUserRepository =
  createFirestoreAdminRegisteredUserRepository(firebaseAdminConfig);
const platformRoleRepository =
  createFirestoreAdminPlatformRoleRepository(firebaseAdminConfig);
const tenantRoleRepository =
  createFirestoreAdminTenantRoleRepository(firebaseAdminConfig);

async function loadRoleCatalog(tenantId: string) {
  const [tenantRoles, globalTemplates] = await Promise.all([
    tenantRoleRepository.list(tenantId),
    platformRoleRepository.listGlobal(),
  ]);
  return buildTenantRoleCatalog(tenantRoles, globalTemplates);
}

const aiController = createWorkerAiController({
  aiJobRepository,
  vertexAiConfig,
  isAiEnabled: () => runtimeSettingsCache.isAiEnabled(),
  isAiTraceEnabled: () => runtimeSettingsCache.isAiTraceEnabled(),
  aiSpendRepository,
  tenantRepository,
  getRoleCatalog: loadRoleCatalog,
  registeredUserRepository,
});

const vectorIndexClient = vertexVectorConfig.useInMemory
  ? createInMemoryVectorIndexClient({
      dimensions: vertexVectorConfig.dimensions,
    })
  : createRestVertexVectorIndexClient({
      projectId: vertexVectorConfig.projectId,
      region: vertexVectorConfig.region,
      indexId: vertexVectorConfig.indexId!,
      indexEndpointId: vertexVectorConfig.indexEndpointId!,
      ...(vertexVectorConfig.deployedIndexId
        ? { deployedIndexId: vertexVectorConfig.deployedIndexId }
        : {}),
      ...(vertexVectorConfig.publicEndpointDomain
        ? { publicEndpointDomain: vertexVectorConfig.publicEndpointDomain }
        : {}),
    });
const vectorIndexService = new VectorIndexService(vectorIndexClient, {
  dimensions: vertexVectorConfig.dimensions,
});

const memoryRefreshScheduler = createDebouncedUserAiMemoryRefreshScheduler({
  enqueue: async ({ tenantId, userId }) => {
    // Local/dev: process in-process. Production Cloud Scheduler/Tasks can
    // hit AI_TASK_ROUTES.REFRESH_USER_AI_MEMORY with the same payload.
    await processUserAiMemoryRefresh(
      {
        userAiMemoryRepository,
        aiContextSectionRepository,
        entityRuntime: dataHookProcessorDeps.entityRuntime,
        metricDefinitionRepository,
        entityQueryDefinitionRepository,
        groundedChatDataPorts,
        ...(dataHookProcessorDeps.aiRecordSummaryRepository
          ? {
              aiRecordSummaryRepository:
                dataHookProcessorDeps.aiRecordSummaryRepository,
            }
          : {}),
      },
      tenantId,
      userId,
    );
  },
});

const dataHookProcessorDeps = createDataHookProcessorDeps(firebaseAdminConfig, {
  aiController,
  vectorIndexService,
  cacheClient: createRestVertexCachedContentClient(),
  cacheRepository: createFirestoreAdminDataHookAiCacheRepository(
    firebaseAdminConfig,
  ),
  isDataHookAiCacheEnabled: () =>
    runtimeSettingsCache.isDataHookAiCacheEnabled(),
  onRecordSummaryUpdated: (input) => {
    const userIds = new Set<string>(input.accessUserIds);
    if (input.ownerId) {
      userIds.add(input.ownerId);
    }
    for (const userId of userIds) {
      memoryRefreshScheduler.schedule({
        tenantId: input.tenantId,
        userId,
      });
    }
  },
});

const groundedChatDataPorts = createGroundedChatDataPorts({
  getRepository: (tenantId, entityName) =>
    dataHookProcessorDeps.entityRuntime.getRepository(tenantId, entityName),
  listEntityNames: async (tenantId) => {
    await dataHookProcessorDeps.entityRuntime.ensureTenantEntitiesLoaded(
      tenantId,
    );
    const defs = await fullEntityDefinitionRepository.list(tenantId);
    return defs.map((d) => d.name);
  },
  isTenantWideRead: (tenantId, entityName) => {
    const entity = dataHookProcessorDeps.entityRuntime.resolveEntity(
      entityName,
      tenantId,
    );
    return entity?.metadata.tenantWideRead === true;
  },
  metricDefinitionRepository,
  ...(dataHookProcessorDeps.aggregation?.metricRuntime.metricValueRepository
    ? {
        metricValueRepository:
          dataHookProcessorDeps.aggregation.metricRuntime.metricValueRepository,
      }
    : {}),
  entityQueryDefinitionRepository,
  userAiMemoryRepository,
  ...(dataHookProcessorDeps.aiRecordSummaryRepository
    ? {
        aiRecordSummaryRepository:
          dataHookProcessorDeps.aiRecordSummaryRepository,
      }
    : {}),
  insightSurfaceRepository,
  vectorIndexService,
  aiController,
});

const gmailTaskEnqueuer = createWorkerGmailTaskEnqueuer({
  projectId: workerEnv.GCP_PROJECT_ID,
  region: workerEnv.GCP_REGION,
  queueName: workerEnv.GMAIL_TASKS_QUEUE_NAME,
  workerBaseUrl: workerEnv.WORKER_SERVICE_URL,
  ...(workerEnv.TASKS_SA_EMAIL
    ? { serviceAccountEmail: workerEnv.TASKS_SA_EMAIL }
    : {}),
  localDispatch: workerEnv.GMAIL_TASKS_LOCAL_DISPATCH,
});

const gmailIngest =
  workerEnv.TENANT_ENCRYPTION_MASTER_KEY &&
  workerEnv.GMAIL_OAUTH_CLIENT_ID &&
  workerEnv.GMAIL_OAUTH_CLIENT_SECRET
    ? createGmailIngestProcessorDeps(
        firebaseAdminConfig,
        dataHookProcessorDeps,
        {
          encryptionMasterKey: workerEnv.TENANT_ENCRYPTION_MASTER_KEY,
          gmailOAuthClientId: workerEnv.GMAIL_OAUTH_CLIENT_ID,
          gmailOAuthClientSecret: workerEnv.GMAIL_OAUTH_CLIENT_SECRET,
          getDeliveryMode: () =>
            runtimeSettingsCache.getGmailIngestDeliveryMode(),
          ...(workerEnv.GMAIL_PUBSUB_TOPIC
            ? { gmailPubsubTopic: workerEnv.GMAIL_PUBSUB_TOPIC }
            : {}),
          vertexAiConfig,
          aiController,
          enqueueProcessMessage: gmailTaskEnqueuer.enqueueProcessMessage,
          enqueueWindowSync: gmailTaskEnqueuer.enqueueWindowSync,
          scheduleWatchRenew: gmailTaskEnqueuer.scheduleWatchRenew,
        },
      )
    : undefined;

const server = await buildWorkerServer({
  ...dataHookProcessorDeps,
  aiJobRepository,
  tenantAiContextRepository,
  userAiMemoryRepository,
  aiChatSessionRepository,
  aiContextSectionRepository,
  groundedChatDataPorts,
  metricDefinitionRepository,
  entityQueryDefinitionRepository,
  uiBuilderAiSuggestionRepository,
  entityDefinitionRepository,
  vertexAiConfig,
  aiController,
  firebaseAdminConfig,
  indexProjectId: workerEnv.GCP_PROJECT_ID,
  isAiStepTraceEnabled: () => runtimeSettingsCache.isAiTraceEnabled(),
  isAiTraceEnabled: () => runtimeSettingsCache.isAiTraceEnabled(),
  ...(gmailIngest ? { gmailIngest } : {}),
});

await server.listen({
  port: workerEnv.PORT,
  host: workerEnv.HOST,
});

if (workerEnv.IS_LOCAL && gmailIngest) {
  startLocalGmailPollScheduler({
    workerBaseUrl: workerEnv.WORKER_SERVICE_URL,
    getDeliveryMode: () => runtimeSettingsCache.getGmailIngestDeliveryMode(),
  });
}

console.log(
  JSON.stringify({
    message: "worker-service started",
    port: workerEnv.PORT,
    host: workerEnv.HOST,
  }),
);
