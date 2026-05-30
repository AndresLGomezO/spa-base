import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearModuleRegistries } from "@repo/modules";

import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import { buildServer } from "../server.js";

const authState = {
  uid: "user_123",
  tenantId: "tenant_a",
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
  createFirestoreAdminEntityDefinitionRepository: vi.fn(),
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

describe("entity definitions integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    authState.tenantId = "tenant_a";
  });

  it("creates a dynamic entity and uses it immediately via catalog and CRUD", async () => {
    const server = await buildTestServer();

    const createDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
      payload: {
        name: "loan",
        label: "Loans",
        fields: [
          { name: "amount", type: "number", required: true },
          {
            name: "status",
            type: "enum",
            enumValues: ["Pending", "Approved"],
            required: true,
          },
        ],
      },
    });

    expect(createDefinition.statusCode).toBe(201);

    const catalog = await server.inject({
      method: "GET",
      url: "/api/entities",
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
    });

    expect(catalog.statusCode).toBe(200);
    const catalogNames = catalog
      .json()
      .data.items.map((item: { name: string }) => item.name);
    expect(catalogNames).toContain("loan");

    const createRecord = await server.inject({
      method: "POST",
      url: "/api/loan",
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
      payload: {
        amount: 1000,
        status: "Pending",
      },
    });

    expect(createRecord.statusCode).toBe(201);
    expect(createRecord.json().data.amount).toBe(1000);
  });

  it("persists a relation field added after PATCHing the entity definition", async () => {
    const server = await buildTestServer();
    const headers = {
      authorization: "Bearer fake-token",
      "x-firebase-appcheck": "fake-appcheck",
    };

    const createBatchDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers,
      payload: {
        name: "batch",
        label: "Batches",
        fields: [{ name: "name", type: "string", required: true }],
      },
    });
    expect(createBatchDefinition.statusCode).toBe(201);

    const createWorkItemDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers,
      payload: {
        name: "workItem",
        label: "Work Items",
        fields: [{ name: "title", type: "string", required: true }],
      },
    });
    expect(createWorkItemDefinition.statusCode).toBe(201);
    const workItemDefinitionId = createWorkItemDefinition.json().data.id;

    const createWorkItem = await server.inject({
      method: "POST",
      url: "/api/workItem",
      headers,
      payload: { title: "First item" },
    });
    expect(createWorkItem.statusCode).toBe(201);
    const workItemId = createWorkItem.json().data.id;

    const patchDefinition = await server.inject({
      method: "PATCH",
      url: `/api/entity-definitions/${workItemDefinitionId}`,
      headers,
      payload: {
        fields: [
          { name: "title", type: "string", required: true },
          {
            name: "batchId",
            type: "relation",
            relation: { target: "batch", type: "many-to-one" },
          },
        ],
      },
    });
    expect(patchDefinition.statusCode).toBe(200);
    expect(patchDefinition.json().data.version).toBe(2);

    const createBatch = await server.inject({
      method: "POST",
      url: "/api/batch",
      headers,
      payload: { name: "Batch A" },
    });
    expect(createBatch.statusCode).toBe(201);
    const batchId = createBatch.json().data.id;

    const updateWorkItem = await server.inject({
      method: "PUT",
      url: `/api/workItem/${workItemId}`,
      headers,
      payload: { title: "First item", batchId },
    });
    expect(updateWorkItem.statusCode).toBe(200);
    expect(updateWorkItem.json().data.batchId).toBe(batchId);

    const getWorkItem = await server.inject({
      method: "GET",
      url: `/api/workItem/${workItemId}`,
      headers,
    });
    expect(getWorkItem.statusCode).toBe(200);
    expect(getWorkItem.json().data.batchId).toBe(batchId);
  });
});
