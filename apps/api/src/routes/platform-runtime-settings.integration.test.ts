import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearHookRegistry } from "@repo/hooks";
import { clearModuleRegistries } from "@repo/modules";
import {
  createInMemoryPlatformRuntimeSettingsRepository,
  createInMemoryRequestPerfLogRepository,
} from "@repo/firestore-converters";

import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import {
  buildInMemoryListSnapshotInvalidationPrefix,
  mockCreateInMemoryListSnapshotCache,
} from "../test/mock-in-memory-list-snapshot-cache.js";
import { buildServer } from "../server.js";

const authState = {
  uid: "superadmin_user",
  tenantId: "tenant_a",
};

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

const originalEnablePerfLogs = process.env.ENABLE_PERF_LOGS;
const originalAiStepTrace = process.env.AI_STEP_TRACE_ENABLED;
const originalSeedHookObservability =
  process.env.SEED_HOOK_OBSERVABILITY_ENABLED;

vi.mock("@repo/gcp-firebase", () => ({
  configureIndexProvisioningQueue: vi.fn(),
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: authState.uid,
    tenantId: authState.tenantId,
    email: "super@example.com",
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({ appId: "demo-app-id" })),
  getFirebaseUserRecord: vi.fn(async () => ({
    uid: authState.uid,
    email: "super@example.com",
    emailVerified: true,
    displayName: "Super Admin",
    photoURL: null,
    phoneNumber: null,
    disabled: false,
    providerData: [],
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
  })),
  mapFirebaseUserRecordToAuthUserProjection: vi.fn((user) => ({
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    disabled: user.disabled,
    providerData: user.providerData,
    metadata: user.metadata,
  })),
  createFirestoreAdminRegisteredUserRepository: vi.fn(),
  createFirestoreAdminPlatformRoleRepository: vi.fn(),
  createFirestoreAdminTenantRepository: vi.fn(),
  createFirestoreAdminGmailConnectionRepository: vi.fn(() => ({})),
  createFirestoreAdminEmailMatchBindingRepository: vi.fn(() => ({})),
  createFirestoreAdminEmailIngestJobRepository: vi.fn(() => ({
    listRecent: vi.fn(async () => []),
    get: vi.fn(async () => null),
    create: vi.fn(),
    appendStep: vi.fn(),
    complete: vi.fn(),
  })),
  createFirestoreAdminJoinCollectionRepository: vi.fn(),
  createFirestoreAdminEntityRepository: vi.fn(),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache: mockCreateInMemoryListSnapshotCache,
  createFirestoreAdminEntityDefinitionRepository: vi.fn(),
  createFirestoreAdminPlatformRuntimeSettingsRepository: vi.fn(),
}));

async function buildTestServer() {
  const runtime = createInMemoryCrudRuntime();
  const requestPerfLogRepository = createInMemoryRequestPerfLogRepository();
  const platformRuntimeSettingsRepository =
    createInMemoryPlatformRuntimeSettingsRepository();

  const server = await buildServer({
    logger: false,
    repositories: runtime.repositories,
    queryExecutors: runtime.queryExecutors,
    joinRepository: createInMemoryJoinCollectionRepository(),
    requestPerfLogRepository,
    platformRuntimeSettingsRepository,
    getRoleCatalog: async () => buildRoleCatalog([]),
    getUserAccessProfile: async () => ({
      platformRole: "superadmin",
      tenants: { tenant_a: ["admin"] },
    }),
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
  });

  return {
    server,
    requestPerfLogRepository,
    platformRuntimeSettingsRepository,
  };
}

describe("platform runtime settings integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    authState.tenantId = "tenant_a";
    process.env.ENABLE_PERF_LOGS = "false";
    process.env.AI_STEP_TRACE_ENABLED = "false";
    process.env.SEED_HOOK_OBSERVABILITY_ENABLED = "false";
  });

  afterEach(() => {
    if (originalEnablePerfLogs === undefined) {
      delete process.env.ENABLE_PERF_LOGS;
    } else {
      process.env.ENABLE_PERF_LOGS = originalEnablePerfLogs;
    }
    if (originalAiStepTrace === undefined) {
      delete process.env.AI_STEP_TRACE_ENABLED;
    } else {
      process.env.AI_STEP_TRACE_ENABLED = originalAiStepTrace;
    }
    if (originalSeedHookObservability === undefined) {
      delete process.env.SEED_HOOK_OBSERVABILITY_ENABLED;
    } else {
      process.env.SEED_HOOK_OBSERVABILITY_ENABLED =
        originalSeedHookObservability;
    }
  });

  it("returns env defaults before any runtime override exists", async () => {
    const { server } = await buildTestServer();

    const response = await server.inject({
      method: "GET",
      url: "/admin/platform/runtime-settings",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      settings: null;
      effective: {
        requestPerfTraceEnabled: boolean;
        seedHookObservabilityEnabled: boolean;
      };
      envDefaults: {
        requestPerfTraceEnabled: boolean;
        seedHookObservabilityEnabled: boolean;
      };
    };
    expect(body.settings).toBeNull();
    expect(body.envDefaults.requestPerfTraceEnabled).toBe(false);
    expect(body.effective.requestPerfTraceEnabled).toBe(false);
    expect(body.envDefaults.seedHookObservabilityEnabled).toBe(false);
    expect(body.effective.seedHookObservabilityEnabled).toBe(false);
  });

  it("persists seed hook observability runtime toggle", async () => {
    const { server } = await buildTestServer();

    const patchResponse = await server.inject({
      method: "PATCH",
      url: "/admin/platform/runtime-settings",
      headers: authHeaders,
      payload: {
        seedHookObservabilityEnabled: true,
      },
    });

    expect(patchResponse.statusCode).toBe(200);
    const body = patchResponse.json() as {
      settings: { seedHookObservabilityEnabled: boolean | null };
      effective: { seedHookObservabilityEnabled: boolean };
    };
    expect(body.settings.seedHookObservabilityEnabled).toBe(true);
    expect(body.effective.seedHookObservabilityEnabled).toBe(true);
  });

  it("persists request perf logs after runtime toggle is enabled", async () => {
    const { server, requestPerfLogRepository } = await buildTestServer();

    await server.inject({
      method: "GET",
      url: "/api/debug/events?limit=5",
      headers: authHeaders,
    });
    expect(requestPerfLogRepository.store.size).toBe(0);

    await server.inject({
      method: "PATCH",
      url: "/admin/platform/runtime-settings",
      headers: authHeaders,
      payload: {
        requestPerfTraceEnabled: true,
      },
    });

    const beforeEnabledRequest = requestPerfLogRepository.store.size;

    await server.inject({
      method: "GET",
      url: "/api/debug/events?limit=5",
      headers: authHeaders,
    });

    expect(requestPerfLogRepository.store.size).toBe(beforeEnabledRequest + 1);
  });
});
