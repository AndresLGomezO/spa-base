import {
  createFirestoreAdminAiJobRepository,
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminTenantAiContextRepository,
  createFirestoreAdminUiBuilderAiSuggestionRepository,
  initializeFirebaseAdmin,
} from "@repo/worker-firestore";
import { createRuntimeSettingsCache } from "@repo/debug-logs";
import { createFirestoreAdminPlatformRuntimeSettingsRepository } from "@repo/gcp-firebase";

import { vertexAiConfig, workerEnv } from "./config/env.js";
import { createDataHookProcessorDeps } from "./services/data-hook-processor.js";
import { createGmailIngestProcessorDeps } from "./services/gmail-ingest-processor.js";
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
const dataHookProcessorDeps = createDataHookProcessorDeps(firebaseAdminConfig);

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
          deliveryMode: workerEnv.GMAIL_INGEST_DELIVERY_MODE,
          ...(workerEnv.GMAIL_PUBSUB_TOPIC
            ? { gmailPubsubTopic: workerEnv.GMAIL_PUBSUB_TOPIC }
            : {}),
          vertexAiConfig,
          enqueueProcessMessage: gmailTaskEnqueuer.enqueueProcessMessage,
          enqueueHistorySync: gmailTaskEnqueuer.enqueueHistorySync,
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
  firebaseAdminConfig,
  indexProjectId: workerEnv.GCP_PROJECT_ID,
  isAiStepTraceEnabled: () => runtimeSettingsCache.isAiStepTraceEnabled(),
  ...dataHookProcessorDeps,
  ...(gmailIngest ? { gmailIngest } : {}),
});

await server.listen({
  port: workerEnv.PORT,
  host: workerEnv.HOST,
});

console.log(
  JSON.stringify({
    message: "worker-service started",
    port: workerEnv.PORT,
    isLocal: workerEnv.IS_LOCAL,
    useRealVertex: workerEnv.USE_REAL_VERTEX,
    gcpProjectId: workerEnv.GCP_PROJECT_ID,
    vertexProjectId: vertexAiConfig.projectId,
    vertexMock: vertexAiConfig.mockEnabled,
    gmailIngestEnabled: Boolean(gmailIngest),
  }),
);
