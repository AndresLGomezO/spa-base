import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearHookRegistry } from "@repo/hooks";
import { clearModuleRegistries } from "@repo/modules";
import {
  createInMemoryPushTokenRepository,
  createInMemoryUserNotificationRepository,
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

const otherUserAuthState = {
  uid: "user_other",
  tenantId: "tenant_a",
};

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

const { deliverPushMock } = vi.hoisted(() => ({
  deliverPushMock: vi.fn(async () => ({
    successCount: 1,
    failureCount: 0,
    errors: [] as string[],
  })),
}));

vi.mock("@repo/gcp-firebase", () => ({
  createFirestoreAdminPushTokenRepository: vi.fn(),
  createSendUserNotificationWithPush: vi.fn(() => vi.fn(async () => undefined)),
  createDeliverWebPushNotification: vi.fn(() => deliverPushMock),
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
  createFirestoreAdminRequestPerfLogRepository: vi.fn(),
  createFirestoreAdminAuditLogRepository: vi.fn(),
}));

async function buildTestServer() {
  const runtime = createInMemoryCrudRuntime();
  const userNotificationRepository = createInMemoryUserNotificationRepository();
  const pushTokenRepository = createInMemoryPushTokenRepository();

  await userNotificationRepository.create("tenant_a", {
    userId: authState.uid,
    message: "Loan plan generated",
    level: "info",
    hookId: "hook_1",
    hookName: "Generate loan payment plan",
    entityName: "loanDetails",
    recordId: "loan_1",
    createdAt: new Date().toISOString(),
  });

  await userNotificationRepository.create("tenant_a", {
    userId: otherUserAuthState.uid,
    message: "Other user notification",
    level: "info",
    createdAt: new Date().toISOString(),
  });

  const server = await buildServer({
    logger: false,
    repositories: runtime.repositories,
    joinRepository: createInMemoryJoinCollectionRepository(),
    queryExecutors: runtime.queryExecutors,
    userNotificationRepository,
    pushTokenRepository,
    getRoleCatalog: async () => buildRoleCatalog([]),
    getUserAccessProfile: async () => ({
      platformRole: null,
      tenants: { tenant_a: ["admin"] },
    }),
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
  });

  return { server, userNotificationRepository, pushTokenRepository };
}

describe("notification routes", () => {
  beforeEach(() => {
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    clearModuleRegistries();
    authState.uid = "user_123";
    authState.tenantId = "tenant_a";
    deliverPushMock.mockClear();
  });

  it("lists notifications scoped to the authenticated user", async () => {
    const { server } = await buildTestServer();

    const response = await server.inject({
      method: "GET",
      url: "/api/notifications",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]?.message).toBe("Loan plan generated");
    expect(body.data.items[0]?.userId).toBe(authState.uid);
  });

  it("returns unread count for the authenticated user", async () => {
    const { server } = await buildTestServer();

    const response = await server.inject({
      method: "GET",
      url: "/api/notifications/unread-count",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.unreadCount).toBe(1);
  });

  it("marks a notification as read for the owning user only", async () => {
    const { server, userNotificationRepository } = await buildTestServer();
    const page = await userNotificationRepository.listForUser(
      "tenant_a",
      authState.uid,
      { limit: 1 },
    );
    const notification = page.items[0];

    const response = await server.inject({
      method: "PATCH",
      url: `/api/notifications/${notification!.id}/read`,
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.read).toBe(true);

    const unread = await userNotificationRepository.countUnread(
      "tenant_a",
      authState.uid,
    );
    expect(unread).toBe(0);
  });

  it("returns 404 when marking another user's notification", async () => {
    const { server, userNotificationRepository } = await buildTestServer();
    const otherPage = await userNotificationRepository.listForUser(
      "tenant_a",
      otherUserAuthState.uid,
      { limit: 1 },
    );
    const otherNotification = otherPage.items[0];

    const response = await server.inject({
      method: "PATCH",
      url: `/api/notifications/${otherNotification!.id}/read`,
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(404);
  });

  it("creates an in-app test notification for the authenticated user only", async () => {
    const { server, userNotificationRepository } = await buildTestServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/notifications/test",
      headers: {
        ...authHeaders,
        "content-type": "application/json",
      },
      payload: { channel: "inApp" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      channel: "inApp",
      delivered: true,
    });
    expect(deliverPushMock).not.toHaveBeenCalled();

    const page = await userNotificationRepository.listForUser(
      "tenant_a",
      authState.uid,
      { limit: 10 },
    );
    expect(
      page.items.some((item) => item.message === "Test in-app notification"),
    ).toBe(true);

    const otherPage = await userNotificationRepository.listForUser(
      "tenant_a",
      otherUserAuthState.uid,
      { limit: 10 },
    );
    expect(
      otherPage.items.some(
        (item) => item.message === "Test in-app notification",
      ),
    ).toBe(false);
  });

  it("returns 400 when testing push without a registered token", async () => {
    const { server } = await buildTestServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/notifications/test",
      headers: {
        ...authHeaders,
        "content-type": "application/json",
      },
      payload: { channel: "push" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toBe("no_push_token");
    expect(deliverPushMock).not.toHaveBeenCalled();
  });

  it("delivers a push test when the user has a registered token", async () => {
    const { server, pushTokenRepository, userNotificationRepository } =
      await buildTestServer();
    await pushTokenRepository.upsert("tenant_a", {
      userId: authState.uid,
      token: "fcm-token-test",
    });

    const beforeCount = await userNotificationRepository.countUnread(
      "tenant_a",
      authState.uid,
    );

    const response = await server.inject({
      method: "POST",
      url: "/api/notifications/test",
      headers: {
        ...authHeaders,
        "content-type": "application/json",
      },
      payload: { channel: "push" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      channel: "push",
      delivered: true,
    });
    expect(deliverPushMock).toHaveBeenCalledOnce();
    expect(deliverPushMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: authState.uid,
        message: "Test push notification",
        level: "info",
      }),
    );

    const afterCount = await userNotificationRepository.countUnread(
      "tenant_a",
      authState.uid,
    );
    expect(afterCount).toBe(beforeCount);
  });

  it("returns 502 when FCM rejects every token", async () => {
    deliverPushMock.mockResolvedValueOnce({
      successCount: 0,
      failureCount: 1,
      errors: ["messaging/mismatched-credential: SenderId mismatch"],
    });
    const { server, pushTokenRepository } = await buildTestServer();
    await pushTokenRepository.upsert("tenant_a", {
      userId: authState.uid,
      token: "fcm-token-test",
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/notifications/test",
      headers: {
        ...authHeaders,
        "content-type": "application/json",
      },
      payload: { channel: "push" },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().error.message).toContain(
      "messaging/mismatched-credential",
    );
  });
});
