import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearHookRegistry } from "@repo/hooks";
import { clearModuleRegistries } from "@repo/modules";
import {
  createInMemoryAuditLogRepository,
  createInMemoryHookLogMessageRepository,
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
  uid: "user_123",
  tenantId: "tenant_a",
};

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

vi.mock("@repo/gcp-firebase", () => ({
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: authState.uid,
    tenantId: authState.tenantId,
    email: "demo@example.com",
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({ appId: "demo-app-id" })),
  getFirebaseUserRecord: vi.fn(async () => ({
    uid: authState.uid,
    email: "demo@example.com",
    emailVerified: true,
    displayName: "Demo User",
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
  createFirestoreAdminJoinCollectionRepository: vi.fn(),
  createFirestoreAdminEntityRepository: vi.fn(),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache: mockCreateInMemoryListSnapshotCache,
  createFirestoreAdminEntityDefinitionRepository: vi.fn(),
  createFirestoreAdminDataHookRepository: vi.fn(),
  createFirestoreAdminDataHookExecutionRepository: vi.fn(),
  createFirestoreAdminHookLogMessageRepository: vi.fn(),
  createFirestoreAdminRequestPerfLogRepository: vi.fn(),
  createFirestoreAdminAuditLogRepository: vi.fn(),
}));

async function buildTestServer() {
  const runtime = createInMemoryCrudRuntime();
  const auditLogRepository = createInMemoryAuditLogRepository();
  auditLogRepository.seed({
    id: "audit_1",
    tenantId: "tenant_a",
    action: "share.grant",
    entity: "deal",
    recordId: "deal_1",
    actorId: "user_123",
    timestamp: "2026-01-02T10:00:00.000Z",
  });

  const hookLogMessageRepository = createInMemoryHookLogMessageRepository();
  await hookLogMessageRepository.create("tenant_a", {
    level: "info",
    message: "Data hook notification",
    hookId: "hook_1",
    entityName: "deal",
    timestamp: "2026-01-02T09:00:00.000Z",
  });

  const requestPerfLogRepository = createInMemoryRequestPerfLogRepository();
  await requestPerfLogRepository.create("tenant_a", {
    route: "/api/deal",
    method: "GET",
    statusCode: 200,
    rbacMs: 1,
    queryMs: 2,
    hooksMs: 3,
    totalMs: 10,
    timestamp: "2026-01-02T08:00:00.000Z",
  });

  return {
    server: await buildServer({
      logger: false,
      repositories: runtime.repositories,
      queryExecutors: runtime.queryExecutors,
      joinRepository: createInMemoryJoinCollectionRepository(),
      auditLogRepository,
      hookLogMessageRepository,
      requestPerfLogRepository,
      getRoleCatalog: async () => buildRoleCatalog([]),
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: { tenant_a: ["admin"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    }),
    auditLogRepository,
    hookLogMessageRepository,
    requestPerfLogRepository,
  };
}

describe("debug events integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    authState.tenantId = "tenant_a";
  });

  it("returns merged debug events for admin users", async () => {
    const { server } = await buildTestServer();

    const response = await server.inject({
      method: "GET",
      url: "/api/debug/events?limit=20",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { items: Array<{ source: string; id: string }> };
    };
    const sources = new Set(body.data.items.map((item) => item.source));
    expect(sources.has("audit")).toBe(true);
    expect(sources.has("hookLog")).toBe(true);
    expect(sources.has("requestPerf")).toBe(true);
  });
});
