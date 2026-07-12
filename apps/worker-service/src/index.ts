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

async function enqueueGmailProcessMessage(payload: {
  readonly tenantId: string;
  readonly userId: string;
  readonly jobId: string;
  readonly gmailMessageId: string;
}): Promise<void> {
  const response = await fetch(
    `${workerEnv.WORKER_SERVICE_URL}/tasks/gmail-process-message`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Local-Task-Dispatcher": "true",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to enqueue Gmail process-message: ${response.status} ${body.slice(0, 300)}`,
    );
  }
}

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
          ...(workerEnv.GMAIL_PUBSUB_TOPIC
            ? { gmailPubsubTopic: workerEnv.GMAIL_PUBSUB_TOPIC }
            : {}),
          vertexAiConfig,
          enqueueProcessMessage: enqueueGmailProcessMessage,
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
