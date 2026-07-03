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
  }),
);
