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
  uid: "superadmin_user",
  tenantId: "tenant_a",
};

vi.mock("@repo/gcp-firebase", () => ({
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
      platformRole: "superadmin",
      tenants: { tenant_a: ["admin"] },
    }),
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
  });
}

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

async function seedCatalog(
  server: Awaited<ReturnType<typeof buildTestServer>>,
) {
  for (const payload of [
    {
      name: "category",
      label: "Categories",
      fields: [{ name: "name", type: "string", required: true }],
    },
    {
      name: "product",
      label: "Products",
      fields: [
        { name: "name", type: "string", required: true },
        {
          name: "status",
          type: "enum",
          enumValues: ["draft", "published"],
          required: true,
        },
        {
          name: "categoryId",
          type: "relation",
          required: true,
          relation: { target: "category", type: "many-to-one" },
        },
      ],
    },
  ]) {
    const response = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload,
    });
    expect(response.statusCode).toBe(201);
  }
}

describe("entity records import/export routes integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    authState.tenantId = "tenant_a";
  });

  it("returns 403 for non-superadmin users", async () => {
    const runtime = createInMemoryCrudRuntime();
    const server = await buildServer({
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

    const response = await server.inject({
      method: "GET",
      url: "/api/product/export-json",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(403);
  });

  it("imports creates and updates records with schema and relation validation", async () => {
    const server = await buildTestServer();
    await seedCatalog(server);

    const categoryCreate = await server.inject({
      method: "POST",
      url: "/api/category",
      headers: authHeaders,
      payload: { name: "Electronics" },
    });
    expect(categoryCreate.statusCode).toBe(201);
    const categoryId = categoryCreate.json().data.id as string;

    const importCreate = await server.inject({
      method: "POST",
      url: "/api/product/import-json",
      headers: authHeaders,
      payload: {
        name: "Phone",
        status: "draft",
        categoryId,
      },
    });
    expect(importCreate.statusCode).toBe(200);
    expect(importCreate.json().data.created).toBe(1);
    const productId = importCreate.json().data.items[0].id as string;

    const invalidEnum = await server.inject({
      method: "POST",
      url: "/api/product/import-json",
      headers: authHeaders,
      payload: [
        {
          name: "Bad Product",
          status: "invalid",
          categoryId,
        },
      ],
    });
    expect(invalidEnum.statusCode).toBe(400);

    const invalidRelation = await server.inject({
      method: "POST",
      url: "/api/product/import-json",
      headers: authHeaders,
      payload: {
        name: "Missing Category",
        status: "draft",
        categoryId: "missing-category-id",
      },
    });
    expect(invalidRelation.statusCode).toBe(400);

    const importUpdate = await server.inject({
      method: "POST",
      url: "/api/product/import-json",
      headers: authHeaders,
      payload: {
        id: productId,
        name: "Phone Pro",
        status: "published",
        categoryId,
      },
    });
    expect(importUpdate.statusCode).toBe(200);
    expect(importUpdate.json().data.updated).toBe(1);

    const exportResponse = await server.inject({
      method: "GET",
      url: "/api/product/export-json",
      headers: authHeaders,
    });
    expect(exportResponse.statusCode).toBe(200);
    const exported = exportResponse.json().data;
    expect(exported.entityName).toBe("product");
    expect(exported.records).toHaveLength(1);
    expect(exported.records[0]).toMatchObject({
      id: productId,
      name: "Phone Pro",
      status: "published",
      categoryId,
    });
  });

  it("invalidates in-memory list snapshot cache after JSON import", async () => {
    mockCreateInMemoryListSnapshotCache.mockClear();
    const server = await buildTestServer();
    const cache =
      mockCreateInMemoryListSnapshotCache.mock.results.at(-1)?.value;
    const invalidateSpy = vi.spyOn(cache, "invalidateByPrefix");

    const createDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
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

    const importResponse = await server.inject({
      method: "POST",
      url: "/api/memTag/import-json",
      headers: authHeaders,
      payload: [{ code: "VIP", label: "Imported tag" }],
    });
    expect(importResponse.statusCode).toBe(200);
    expect(importResponse.json().data.created).toBe(1);
    expect(invalidateSpy).toHaveBeenCalledWith("tenant_a:memTags:");

    const listResponse = await server.inject({
      method: "GET",
      url: "/api/memTag?limit=10",
      headers: authHeaders,
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().data.items).toEqual([
      expect.objectContaining({ code: "VIP", label: "Imported tag" }),
    ]);
  });

  it("creates records with stable ids when those ids do not exist yet", async () => {
    const server = await buildTestServer();

    const createDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload: {
        name: "actor",
        label: "Actors",
        fields: [
          { name: "name", type: "string", required: true },
          {
            name: "type",
            type: "enum",
            enumValues: ["BANK", "PERSON", "OTHER"],
            required: true,
          },
        ],
      },
    });
    expect(createDefinition.statusCode).toBe(201);

    const stableId = "48e8ddfb-4184-49fd-955d-f50768ba91ca";
    const importResponse = await server.inject({
      method: "POST",
      url: "/api/actor/import-json",
      headers: authHeaders,
      payload: [
        {
          id: stableId,
          name: "Banco de Bogotá",
          type: "BANK",
        },
      ],
    });
    expect(importResponse.statusCode).toBe(200);
    expect(importResponse.json().data).toEqual({
      created: 1,
      updated: 0,
      items: [{ id: stableId, operation: "created" }],
    });

    const getResponse = await server.inject({
      method: "GET",
      url: `/api/actor/${stableId}`,
      headers: authHeaders,
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().data).toMatchObject({
      id: stableId,
      name: "Banco de Bogotá",
      type: "BANK",
    });

    const reimportResponse = await server.inject({
      method: "POST",
      url: "/api/actor/import-json",
      headers: authHeaders,
      payload: [
        {
          id: stableId,
          name: "Banco de Bogotá Updated",
          type: "BANK",
        },
      ],
    });
    expect(reimportResponse.statusCode).toBe(200);
    expect(reimportResponse.json().data).toEqual({
      created: 0,
      updated: 1,
      items: [{ id: stableId, operation: "updated" }],
    });
  });

  it("imports hierarchical records that reference parents in the same batch", async () => {
    const server = await buildTestServer();

    const createDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload: {
        name: "nestedCategory",
        label: "Nested Categories",
        fields: [
          { name: "name", type: "string", required: true },
          {
            name: "kind",
            type: "enum",
            enumValues: ["INCOME", "EXPENSE", "TRANSFER", "INVESTMENT"],
            required: true,
          },
        ],
      },
    });
    expect(createDefinition.statusCode).toBe(201);
    const definitionId = createDefinition.json().data.id as string;

    const patchDefinition = await server.inject({
      method: "PATCH",
      url: `/api/entity-definitions/${definitionId}`,
      headers: authHeaders,
      payload: {
        fields: [
          { name: "name", type: "string", required: true },
          {
            name: "kind",
            type: "enum",
            enumValues: ["INCOME", "EXPENSE", "TRANSFER", "INVESTMENT"],
            required: true,
          },
          {
            name: "parentId",
            type: "relation",
            relation: { target: "nestedCategory", type: "many-to-one" },
          },
        ],
      },
    });
    expect(patchDefinition.statusCode).toBe(200);

    const rootId = "de24aa6a-acd0-442c-9ccb-bdab8fa6a728";
    const childId = "22a9bd68-d3cd-481d-81df-424b387dac21";

    const importResponse = await server.inject({
      method: "POST",
      url: "/api/nestedCategory/import-json",
      headers: authHeaders,
      payload: [
        { id: childId, name: "Salary", kind: "INCOME", parentId: rootId },
        { id: rootId, name: "Income", kind: "INCOME" },
      ],
    });
    expect(importResponse.statusCode).toBe(200);
    expect(importResponse.json().data.created).toBe(2);

    const childResponse = await server.inject({
      method: "GET",
      url: `/api/nestedCategory/${childId}`,
      headers: authHeaders,
    });
    expect(childResponse.statusCode).toBe(200);
    expect(childResponse.json().data).toMatchObject({
      id: childId,
      name: "Salary",
      parentId: rootId,
    });
  });

  it("exports only records accessible to the current user", async () => {
    const server = await buildTestServer();

    const createDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload: {
        name: "account",
        label: "Accounts",
        fields: [
          { name: "name", type: "string", required: true },
          {
            name: "accountType",
            type: "enum",
            enumValues: ["BANK", "SAVINGS"],
            required: true,
          },
        ],
      },
    });
    expect(createDefinition.statusCode).toBe(201);

    authState.uid = "owner_andres";
    const andresImport = await server.inject({
      method: "POST",
      url: "/api/account/import-json",
      headers: authHeaders,
      payload: [
        {
          id: "acct_andres",
          name: "Andres Checking",
          accountType: "BANK",
        },
      ],
    });
    expect(andresImport.statusCode).toBe(200);

    authState.uid = "owner_testuser";
    const demoImport = await server.inject({
      method: "POST",
      url: "/api/account/import-json",
      headers: authHeaders,
      payload: [
        {
          id: "rd_acct_checking",
          name: "Primary Checking",
          accountType: "BANK",
        },
      ],
    });
    expect(demoImport.statusCode).toBe(200);

    authState.uid = "owner_andres";
    const exportResponse = await server.inject({
      method: "GET",
      url: "/api/account/export-json",
      headers: authHeaders,
    });
    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.json().data.records).toEqual([
      expect.objectContaining({
        id: "acct_andres",
        name: "Andres Checking",
      }),
    ]);

    authState.uid = "superadmin_user";
  });

  it("rejects batch imports when any record is invalid", async () => {
    const server = await buildTestServer();
    await seedCatalog(server);

    const categoryCreate = await server.inject({
      method: "POST",
      url: "/api/category",
      headers: authHeaders,
      payload: { name: "Books" },
    });
    const categoryId = categoryCreate.json().data.id as string;

    const response = await server.inject({
      method: "POST",
      url: "/api/product/import-json",
      headers: authHeaders,
      payload: [
        {
          name: "Valid Product",
          status: "draft",
          categoryId,
        },
        {
          name: "Invalid Product",
          status: "invalid",
          categoryId,
        },
      ],
    });

    expect(response.statusCode).toBe(400);

    const exportResponse = await server.inject({
      method: "GET",
      url: "/api/product/export-json",
      headers: authHeaders,
    });
    expect(exportResponse.json().data.records).toHaveLength(0);
  });
});
