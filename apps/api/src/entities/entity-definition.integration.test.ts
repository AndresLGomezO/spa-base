import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
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

  it("replaces the entity definitions catalog", async () => {
    const server = await buildTestServer();
    const headers = {
      authorization: "Bearer fake-token",
      "x-firebase-appcheck": "fake-appcheck",
    };

    const createLoan = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers,
      payload: {
        name: "loan",
        label: "Loans",
        fields: [{ name: "amount", type: "number", required: true }],
      },
    });
    expect(createLoan.statusCode).toBe(201);

    const createCustomer = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers,
      payload: {
        name: "customer",
        label: "Customers",
        fields: [{ name: "name", type: "string", required: true }],
      },
    });
    expect(createCustomer.statusCode).toBe(201);

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/entity-definitions/catalog",
      headers,
      payload: {
        kind: "entity-definitions-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        entityCategories: [],
        entityDefinitions: [
          {
            name: "loan",
            label: "Loans v2",
            fields: [{ name: "amount", type: "number", required: true }],
          },
          {
            name: "payment",
            label: "Payments",
            fields: [{ name: "total", type: "number", required: true }],
          },
        ],
      },
    });
    expect(replaceCatalog.statusCode).toBe(200);
    expect(replaceCatalog.json().data.counts).toEqual({
      created: 1,
      updated: 1,
      deleted: 1,
    });

    const list = await server.inject({
      method: "GET",
      url: "/api/entity-definitions",
      headers,
    });
    const names = list
      .json()
      .data.items.map((item: { name: string }) => item.name);
    expect(names).toEqual(expect.arrayContaining(["loan", "payment"]));
    expect(names).not.toContain("customer");
  });

  it("blocks catalog replace when a survivor references a deleted entity", async () => {
    const server = await buildTestServer();
    const headers = {
      authorization: "Bearer fake-token",
      "x-firebase-appcheck": "fake-appcheck",
    };

    await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers,
      payload: {
        name: "customer",
        label: "Customers",
        fields: [{ name: "name", type: "string", required: true }],
      },
    });

    await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers,
      payload: {
        name: "order",
        label: "Orders",
        fields: [
          {
            name: "customerId",
            type: "relation",
            relation: { target: "customer", type: "many-to-one" },
          },
        ],
      },
    });

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/entity-definitions/catalog",
      headers,
      payload: {
        kind: "entity-definitions-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        entityCategories: [],
        entityDefinitions: [
          {
            name: "order",
            label: "Orders",
            fields: [
              {
                name: "customerId",
                type: "relation",
                relation: { target: "customer", type: "many-to-one" },
              },
            ],
          },
        ],
      },
    });
    expect(replaceCatalog.statusCode).toBe(400);
    const errorBody = replaceCatalog.json().error;
    expect(
      errorBody.message.includes("customer") ||
        JSON.stringify(errorBody.details ?? "").includes("customer"),
    ).toBe(true);
  });

  it("replaces entity categories when entityCategories is included", async () => {
    const server = await buildTestServer();
    const headers = {
      authorization: "Bearer fake-token",
      "x-firebase-appcheck": "fake-appcheck",
    };

    await server.inject({
      method: "POST",
      url: "/api/entity-categories",
      headers,
      payload: {
        name: "Legacy",
        icon: "Folder",
        order: 0,
      },
    });

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/entity-definitions/catalog",
      headers,
      payload: {
        kind: "entity-definitions-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        entityCategories: [
          {
            id: "cat_finance",
            name: "Finance",
            icon: "Wallet",
            order: 0,
          },
        ],
        entityDefinitions: [
          {
            name: "loan",
            label: "Loans",
            navCategoryId: "cat_finance",
            fields: [{ name: "amount", type: "number", required: true }],
          },
        ],
      },
    });
    expect(replaceCatalog.statusCode).toBe(200);
    expect(replaceCatalog.json().data.categoryCounts).toEqual({
      created: 1,
      updated: 0,
      deleted: 1,
    });

    const categories = await server.inject({
      method: "GET",
      url: "/api/entity-categories",
      headers,
    });
    expect(categories.json().data.items).toEqual([
      expect.objectContaining({
        id: "cat_finance",
        name: "Finance",
      }),
    ]);
  });

  it("searches in-memory list entities using source fields without token mirrors", async () => {
    const server = await buildTestServer();
    const headers = {
      authorization: "Bearer fake-token",
      "x-firebase-appcheck": "fake-appcheck",
    };

    const createDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers,
      payload: {
        name: "tag",
        label: "Tags",
        inMemoryListQueries: true,
        fields: [
          { name: "code", type: "string", required: true },
          { name: "label", type: "string", required: true },
        ],
      },
    });
    expect(createDefinition.statusCode).toBe(201);

    const createRecord = await server.inject({
      method: "POST",
      url: "/api/tag",
      headers,
      payload: { code: "VIP", label: "Bancolombia VIP" },
    });
    expect(createRecord.statusCode).toBe(201);
    const created = createRecord.json().data;

    const searchResponse = await server.inject({
      method: "GET",
      url: "/api/tag?search=lombia&limit=10",
      headers,
    });

    expect(searchResponse.statusCode).toBe(200);
    expect(searchResponse.json().data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.id, label: "Bancolombia VIP" }),
      ]),
    );
  });

  it("invalidates in-memory list snapshot cache after record create and delete", async () => {
    mockCreateInMemoryListSnapshotCache.mockClear();
    const server = await buildTestServer();
    const cache =
      mockCreateInMemoryListSnapshotCache.mock.results.at(-1)?.value;
    const invalidateSpy = vi.spyOn(cache, "invalidateByPrefix");

    const headers = {
      authorization: "Bearer fake-token",
      "x-firebase-appcheck": "fake-appcheck",
    };

    const createDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers,
      payload: {
        name: "memTag",
        label: "Memory Tags",
        inMemoryListQueries: true,
        fields: [
          { name: "code", type: "string", required: true },
          { name: "label", type: "string", required: true },
        ],
      },
    });
    expect(createDefinition.statusCode).toBe(201);
    invalidateSpy.mockClear();

    const createRecord = await server.inject({
      method: "POST",
      url: "/api/memTag",
      headers,
      payload: { code: "VIP", label: "Bancolombia VIP" },
    });
    expect(createRecord.statusCode).toBe(201);
    expect(invalidateSpy).toHaveBeenCalledWith("tenant_a:memTags:");

    const createdId = createRecord.json().data.id as string;
    invalidateSpy.mockClear();

    const deleteRecord = await server.inject({
      method: "DELETE",
      url: `/api/memTag/${createdId}`,
      headers,
    });
    expect(deleteRecord.statusCode).toBe(200);
    expect(invalidateSpy).toHaveBeenCalledWith("tenant_a:memTags:");

    const listAfterDelete = await server.inject({
      method: "GET",
      url: "/api/memTag?limit=10",
      headers,
    });
    expect(listAfterDelete.statusCode).toBe(200);
    expect(listAfterDelete.json().data.items).toEqual([]);
  });
});
