import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearHookRegistry } from "@repo/hooks";
import { clearModuleRegistries } from "@repo/modules";

import { HOOK_TASK_ROUTES } from "./hook-task-routes.js";
import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import {
  buildInMemoryListSnapshotInvalidationPrefix,
  mockCreateInMemoryListSnapshotCache,
} from "../test/mock-in-memory-list-snapshot-cache.js";
import { buildServer } from "../server.js";

vi.hoisted(() => {
  process.env.WORKER_SERVICE_URL = "http://127.0.0.1:3998";
  process.env.HOOK_TASKS_LOCAL_DISPATCH = "true";
});

const WORKER_URL = "http://127.0.0.1:3998";

const authState = {
  uid: "user_123",
  tenantId: "tenant_a",
};

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

vi.mock("@repo/gcp-firebase", () => ({
  createFirestoreAdminPushTokenRepository: vi.fn(),
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
}));

async function buildTestServer() {
  const runtime = createInMemoryCrudRuntime();
  return buildServer({
    logger: false,
    repositories: runtime.repositories,
    queryExecutors: runtime.queryExecutors,
    joinRepository: createInMemoryJoinCollectionRepository(),
    getRoleCatalog: async () => buildRoleCatalog([]),
    getUserAccessProfile: async () => ({
      platformRole: null,
      tenants: { tenant_a: ["admin"] },
    }),
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
  });
}

describe("queued data hook tasks", () => {
  const enqueuedPayloads: unknown[] = [];

  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    authState.tenantId = "tenant_a";
    enqueuedPayloads.length = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === `${WORKER_URL}${HOOK_TASK_ROUTES.PROCESS_DATA_HOOK}`) {
          enqueuedPayloads.push(JSON.parse(String(init?.body ?? "{}")));
          return new Response(
            JSON.stringify({ success: true, accepted: true }),
            {
              status: 202,
            },
          );
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );
  });

  it("enqueues an after-hook with execution queued via local dispatch", async () => {
    const server = await buildTestServer();

    const defineEntity = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload: {
        name: "note",
        label: "Notes",
        fields: [{ name: "body", type: "string", required: false }],
      },
    });
    expect(defineEntity.statusCode).toBe(201);

    const createHook = await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Notify on create",
        entity: "note",
        phase: "after",
        trigger: { operation: "create" },
        execution: "queued",
        actions: [
          {
            type: "sendNotification",
            message: { kind: "literal", value: "Note created" },
          },
        ],
      },
    });
    expect(createHook.statusCode).toBe(201);
    const hookId = createHook.json().data.id as string;

    const createRecord = await server.inject({
      method: "POST",
      url: "/api/note",
      headers: authHeaders,
      payload: { body: "hello" },
    });
    expect(createRecord.statusCode).toBe(201);
    const recordId = createRecord.json().data.id as string;

    expect(enqueuedPayloads).toHaveLength(1);
    expect(enqueuedPayloads[0]).toMatchObject({
      hookId,
      tenantId: "tenant_a",
      entityName: "note",
      phase: "after",
      operation: "create",
      current: expect.objectContaining({ id: recordId, body: "hello" }),
      user: { uid: authState.uid },
      depth: 0,
      visitedHookIds: [],
    });

    await server.close();
  });
});
