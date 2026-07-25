import {
  createFirestoreAdminAiJobRepository,
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminTenantAiContextRepository,
  createFirestoreAdminUiBuilderAiSuggestionRepository,
  initializeFirebaseAdmin,
} from "@repo/worker-firestore";
import { createRuntimeSettingsCache } from "@repo/debug-logs";
import { createFirestoreAdminPlatformRuntimeSettingsRepository } from "@repo/gcp-firebase";

import { createWorkerAiController } from "./ai/create-worker-ai-controller.js";
import { vertexAiConfig, workerEnv } from "./config/env.js";
import { createDataHookProcessorDeps } from "./services/data-hook-processor.js";
import { createGmailIngestProcessorDeps } from "./services/gmail-ingest-processor.js";
import { startLocalGmailPollScheduler } from "./services/local-gmail-poll-scheduler.js";
import { createWorkerGmailTaskEnqueuer } from "./services/worker-gmail-task-enqueuer.js";
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
const uiBuilderAiSuggestionRepository =
  createFirestoreAdminUiBuilderAiSuggestionRepository(firebaseAdminConfig);
const entityDefinitionRepository =
  createFirestoreAdminEntityDefinitionRepository(firebaseAdminConfig);
const platformRuntimeSettingsRepository =
  createFirestoreAdminPlatformRuntimeSettingsRepository(firebaseAdminConfig);
const runtimeSettingsCache = createRuntimeSettingsCache(
  platformRuntimeSettingsRepository,
);

const aiController = createWorkerAiController({
  aiJobRepository,
  vertexAiConfig,
  isAiEnabled: () => runtimeSettingsCache.isAiEnabled(),
  isAiTraceEnabled: () => runtimeSettingsCache.isAiTraceEnabled(),
});

const dataHookProcessorDeps = createDataHookProcessorDeps(firebaseAdminConfig, {
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
  aiJobRepository,
  tenantAiContextRepository,
  uiBuilderAiSuggestionRepository,
  entityDefinitionRepository,
  vertexAiConfig,
  aiController,
  firebaseAdminConfig,
  indexProjectId: workerEnv.GCP_PROJECT_ID,
  isAiStepTraceEnabled: () => runtimeSettingsCache.isAiTraceEnabled(),
  ...dataHookProcessorDeps,
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
    isLocal: workerEnv.IS_LOCAL,
    useRealVertex: workerEnv.USE_REAL_VERTEX,
    gcpProjectId: workerEnv.GCP_PROJECT_ID,
    vertexProjectId: vertexAiConfig.projectId,
    vertexModelId: vertexAiConfig.modelId,
    vertexReasoningModelId: vertexAiConfig.reasoningModelId,
    vertexMock: vertexAiConfig.mockEnabled,
    gmailIngestEnabled: Boolean(gmailIngest),
    localGmailPollScheduler: workerEnv.IS_LOCAL && Boolean(gmailIngest),
  }),
);
