import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearHookRegistry } from "@repo/hooks";
import { clearModuleRegistries } from "@repo/modules";

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
  createFirestoreAdminJoinCollectionRepository: vi.fn(),
  createFirestoreAdminEntityRepository: vi.fn(),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache: mockCreateInMemoryListSnapshotCache,
  createFirestoreAdminEntityDefinitionRepository: vi.fn(),
  createFirestoreAdminDataHookRepository: vi.fn(),
  createFirestoreAdminDataHookExecutionRepository: vi.fn(),
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

describe("data hook executions integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    authState.tenantId = "tenant_a";
  });

  it("records success and lists executions for callWebhook hooks", async () => {
    const server = await buildTestServer();
    const webhookCalls: unknown[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        webhookCalls.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }),
    );

    const defineEntity = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload: {
        name: "alert",
        label: "Alerts",
        fields: [{ name: "body", type: "string", required: false }],
      },
    });
    expect(defineEntity.statusCode).toBe(201);

    const createHook = await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Notify webhook",
        entity: "alert",
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "callWebhook",
            url: { kind: "literal", value: "https://example.com/hook" },
          },
        ],
      },
    });
    expect(createHook.statusCode).toBe(201);
    const hookId = createHook.json().data.id as string;

    const createRecord = await server.inject({
      method: "POST",
      url: "/api/alert",
      headers: authHeaders,
      payload: { body: "hello" },
    });
    expect(createRecord.statusCode).toBe(201);
    expect(webhookCalls).toHaveLength(1);

    const listed = await server.inject({
      method: "GET",
      url: `/api/data-hooks/${hookId}/executions`,
      headers: authHeaders,
    });
    expect(listed.statusCode).toBe(200);
    const listedBody = listed.json().data as {
      items: Array<{ status: string }>;
      nextCursor?: string | null;
    };
    expect(listedBody.items.length).toBeGreaterThan(0);
    expect(listedBody.items[0]?.status).toBe("success");
    expect(listedBody.nextCursor).toBeNull();

    await server.close();
  });

  it("records error when callWebhook fails", async () => {
    const server = await buildTestServer();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("fail", { status: 500 })),
    );

    await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload: {
        name: "note",
        label: "Notes",
        fields: [{ name: "body", type: "string", required: false }],
      },
    });

    const createHook = await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Fail webhook",
        entity: "note",
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "callWebhook",
            url: { kind: "literal", value: "https://example.com/hook" },
          },
        ],
      },
    });
    const hookId = createHook.json().data.id as string;

    const createRecord = await server.inject({
      method: "POST",
      url: "/api/note",
      headers: authHeaders,
      payload: { body: "hello" },
    });
    expect(createRecord.statusCode).toBe(201);

    const listed = await server.inject({
      method: "GET",
      url: `/api/data-hooks/${hookId}/executions`,
      headers: authHeaders,
    });
    const items = listed.json().data.items as Array<{
      status: string;
      error?: string;
    }>;
    expect(items[0]?.status).toBe("error");
    expect(items[0]?.error).toContain("500");

    await server.close();
  });
});
