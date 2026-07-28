import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearHookRegistry } from "@repo/hooks";
import { clearModuleRegistries } from "@repo/modules";
import { createInMemoryPushTokenRepository } from "@repo/firestore-converters";

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

const otherUserAuthState = {
  uid: "user_other",
  tenantId: "tenant_a",
};

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

vi.mock("@repo/gcp-firebase", () => ({
  createSendUserNotificationWithPush: vi.fn(() => vi.fn(async () => undefined)),
  configureIndexProvisioningQueue: vi.fn(),
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
  createFirestoreAdminGmailConnectionRepository: vi.fn(() => ({})),
  createFirestoreAdminEmailMatchBindingRepository: vi.fn(() => ({})),
  createFirestoreAdminEmailIngestJobRepository: vi.fn(() => ({
    listRecent: vi.fn(async () => []),
    get: vi.fn(async () => null),
    create: vi.fn(),
    appendStep: vi.fn(),
    complete: vi.fn(),
  })),
  createFirestoreAdminWorkloadRunRepository: vi.fn(() => ({
    getById: vi.fn(async () => null),
    upsert: vi.fn(),
    update: vi.fn(),
    listByWorkloadId: vi.fn(async () => ({ items: [], nextCursor: null })),
    listByRootRunId: vi.fn(async () => []),
    countByWorkloadIdSince: vi.fn(async () => ({
      success: 0,
      error: 0,
      timeout: 0,
      running: 0,
      cancelled: 0,
    })),
  })),
  createFirestoreAdminJoinCollectionRepository: vi.fn(),
  createFirestoreAdminEntityRepository: vi.fn(),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache: mockCreateInMemoryListSnapshotCache,
  createFirestoreAdminEntityDefinitionRepository: vi.fn(),
  createFirestoreAdminDataHookRepository: vi.fn(),
  createFirestoreAdminDataHookExecutionRepository: vi.fn(),
  createFirestoreAdminHookLogMessageRepository: vi.fn(),
  createFirestoreAdminUserNotificationRepository: vi.fn(),
  createFirestoreAdminPushTokenRepository: vi.fn(),
  createFirestoreAdminRequestPerfLogRepository: vi.fn(),
  createFirestoreAdminAuditLogRepository: vi.fn(),
}));

async function buildTestServer() {
  const runtime = createInMemoryCrudRuntime();
  const pushTokenRepository = createInMemoryPushTokenRepository();

  const server = await buildServer({
    logger: false,
    repositories: runtime.repositories,
    joinRepository: createInMemoryJoinCollectionRepository(),
    queryExecutors: runtime.queryExecutors,
    pushTokenRepository,
    getRoleCatalog: async () => buildRoleCatalog([]),
    getUserAccessProfile: async () => ({
      platformRole: null,
      tenants: { tenant_a: ["admin"] },
    }),
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
  });

  return { server, pushTokenRepository };
}

describe("push token routes", () => {
  beforeEach(() => {
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    clearModuleRegistries();
    authState.uid = "user_123";
    authState.tenantId = "tenant_a";
  });

  it("lists push tokens scoped to the authenticated user", async () => {
    const { server, pushTokenRepository } = await buildTestServer();

    await pushTokenRepository.upsert("tenant_a", {
      userId: authState.uid,
      token: "fcm-token-mine",
    });
    await pushTokenRepository.upsert("tenant_a", {
      userId: otherUserAuthState.uid,
      token: "fcm-token-other",
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/push-tokens",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]?.token).toBe("fcm-token-mine");
  });

  it("upserts a push token for the authenticated user", async () => {
    const { server, pushTokenRepository } = await buildTestServer();

    const response = await server.inject({
      method: "PUT",
      url: "/api/push-tokens",
      headers: authHeaders,
      payload: {
        token: "fcm-token-abc",
        userAgent: "TestBrowser/1.0",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.token).toBe("fcm-token-abc");
    expect(body.data.userId).toBe(authState.uid);
    expect(body.data.userAgent).toBe("TestBrowser/1.0");

    const tokens = await pushTokenRepository.listForUser(
      "tenant_a",
      authState.uid,
    );
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.token).toBe("fcm-token-abc");
  });

  it("updates an existing token without changing createdAt", async () => {
    const { server, pushTokenRepository } = await buildTestServer();

    await pushTokenRepository.upsert("tenant_a", {
      userId: authState.uid,
      token: "fcm-token-abc",
      userAgent: "OldAgent",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    const response = await server.inject({
      method: "PUT",
      url: "/api/push-tokens",
      headers: authHeaders,
      payload: {
        token: "fcm-token-abc",
        userAgent: "NewAgent",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(body.data.userAgent).toBe("NewAgent");
    expect(body.data.updatedAt).not.toBe("2024-01-01T00:00:00.000Z");
  });

  it("deletes a push token owned by the authenticated user", async () => {
    const { server, pushTokenRepository } = await buildTestServer();

    await pushTokenRepository.upsert("tenant_a", {
      userId: authState.uid,
      token: "fcm-token-abc",
    });

    const response = await server.inject({
      method: "DELETE",
      url: "/api/push-tokens",
      headers: authHeaders,
      payload: { token: "fcm-token-abc" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.deleted).toBe(true);

    const tokens = await pushTokenRepository.listForUser(
      "tenant_a",
      authState.uid,
    );
    expect(tokens).toHaveLength(0);
  });

  it("does not delete another user's push token", async () => {
    const { server, pushTokenRepository } = await buildTestServer();

    await pushTokenRepository.upsert("tenant_a", {
      userId: otherUserAuthState.uid,
      token: "fcm-token-other",
    });

    const response = await server.inject({
      method: "DELETE",
      url: "/api/push-tokens",
      headers: authHeaders,
      payload: { token: "fcm-token-other" },
    });

    expect(response.statusCode).toBe(404);

    const tokens = await pushTokenRepository.listForUser(
      "tenant_a",
      otherUserAuthState.uid,
    );
    expect(tokens).toHaveLength(1);
  });

  it("rejects invalid payloads", async () => {
    const { server } = await buildTestServer();

    const response = await server.inject({
      method: "PUT",
      url: "/api/push-tokens",
      headers: authHeaders,
      payload: { token: "" },
    });

    expect(response.statusCode).toBe(400);
  });
});
