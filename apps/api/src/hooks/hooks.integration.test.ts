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

async function defineLoanEntity(
  server: Awaited<ReturnType<typeof buildTestServer>>,
) {
  const response = await server.inject({
    method: "POST",
    url: "/api/entity-definitions",
    headers: authHeaders,
    payload: {
      name: "loan",
      label: "Loans",
      fields: [
        { name: "amount", type: "number", required: true },
        { name: "commitmentAmount", type: "number", required: false },
        { name: "status", type: "string", required: false },
      ],
    },
  });
  expect(response.statusCode).toBe(201);
}

describe("data hooks integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    authState.tenantId = "tenant_a";
  });

  it("runs a dynamic beforeCreate hook that mutates the record", async () => {
    const server = await buildTestServer();
    await defineLoanEntity(server);

    const createHook = await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Set pending status",
        entity: "loan",
        phase: "before",
        trigger: { operation: "create" },
        actions: [
          {
            type: "setField",
            field: "status",
            value: { kind: "literal", value: "Pending" },
          },
        ],
      },
    });
    expect(createHook.statusCode).toBe(201);

    const createRecord = await server.inject({
      method: "POST",
      url: "/api/loan",
      headers: authHeaders,
      payload: { amount: 500 },
    });

    expect(createRecord.statusCode).toBe(201);
    expect(createRecord.json().data.status).toBe("Pending");
  });

  it("evaluates a conditional expression-driven hook", async () => {
    const server = await buildTestServer();
    await defineLoanEntity(server);

    const createHook = await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Complete when funded",
        entity: "loan",
        phase: "before",
        trigger: { operation: "create" },
        condition: {
          field: "amount",
          operator: ">=",
          value: { kind: "field", source: "current", path: "commitmentAmount" },
        },
        actions: [
          {
            type: "setField",
            field: "status",
            value: { kind: "literal", value: "COMPLETE" },
          },
        ],
      },
    });
    expect(createHook.statusCode).toBe(201);

    const funded = await server.inject({
      method: "POST",
      url: "/api/loan",
      headers: authHeaders,
      payload: { amount: 100, commitmentAmount: 100 },
    });
    expect(funded.statusCode).toBe(201);
    expect(funded.json().data.status).toBe("COMPLETE");

    const underfunded = await server.inject({
      method: "POST",
      url: "/api/loan",
      headers: authHeaders,
      payload: { amount: 50, commitmentAmount: 100 },
    });
    expect(underfunded.statusCode).toBe(201);
    expect(underfunded.json().data.status).toBeUndefined();
  });

  it("lists and deletes data hooks", async () => {
    const server = await buildTestServer();
    await defineLoanEntity(server);

    const createHook = await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Temp hook",
        entity: "loan",
        phase: "after",
        trigger: { operation: "update" },
        actions: [
          {
            type: "sendNotification",
            message: { kind: "literal", value: "changed" },
          },
        ],
      },
    });
    expect(createHook.statusCode).toBe(201);
    const hookId = createHook.json().data.id as string;

    const listed = await server.inject({
      method: "GET",
      url: "/api/data-hooks?entity=loan",
      headers: authHeaders,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data.items).toHaveLength(1);

    const deleted = await server.inject({
      method: "DELETE",
      url: `/api/data-hooks/${hookId}`,
      headers: authHeaders,
    });
    expect(deleted.statusCode).toBe(200);

    const listedAfter = await server.inject({
      method: "GET",
      url: "/api/data-hooks?entity=loan",
      headers: authHeaders,
    });
    expect(listedAfter.json().data.items).toHaveLength(0);
  });
});
