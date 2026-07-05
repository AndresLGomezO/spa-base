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

const headers = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

async function seedTransactionEntity(
  server: Awaited<ReturnType<typeof buildTestServer>>,
) {
  const createDefinition = await server.inject({
    method: "POST",
    url: "/api/entity-definitions",
    headers,
    payload: {
      name: "transaction",
      label: "Transactions",
      fields: [
        { name: "type", type: "string", required: true },
        { name: "date", type: "date", required: true },
      ],
    },
  });
  expect(createDefinition.statusCode).toBe(201);
}

describe("entity query definitions catalog integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    authState.tenantId = "tenant_a";
  });

  it("replaces the tenant query catalog by name", async () => {
    const server = await buildTestServer();
    await seedTransactionEntity(server);

    const createQuery = await server.inject({
      method: "POST",
      url: "/api/entity-query-definitions",
      headers,
      payload: {
        name: "Upcoming payments",
        sourceEntity: "transaction",
        filter: {
          type: "group",
          combinator: "and",
          children: [
            {
              type: "condition",
              field: "type",
              operator: "==",
              value: { type: "static", value: "EXPENSE" },
            },
          ],
        },
        sort: [{ field: "date", direction: "desc" }],
        limitMode: "topN",
        limit: 20,
        status: "ACTIVE",
      },
    });
    expect(createQuery.statusCode).toBe(201);

    const createOther = await server.inject({
      method: "POST",
      url: "/api/entity-query-definitions",
      headers,
      payload: {
        name: "All transactions",
        sourceEntity: "transaction",
        filter: { type: "group", combinator: "and", children: [] },
        sort: [],
        limitMode: "all",
        status: "ACTIVE",
      },
    });
    expect(createOther.statusCode).toBe(201);

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/entity-query-definitions/catalog",
      headers,
      payload: {
        kind: "entity-query-definitions-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        entityQueryDefinitions: [
          {
            name: "Upcoming payments",
            sourceEntity: "transaction",
            filter: {
              type: "group",
              combinator: "and",
              children: [
                {
                  type: "condition",
                  field: "type",
                  operator: "==",
                  value: { type: "static", value: "EXPENSE" },
                },
              ],
            },
            sort: [{ field: "date", direction: "desc" }],
            limitMode: "topN",
            limit: 50,
            status: "ACTIVE",
          },
          {
            name: "Income only",
            sourceEntity: "transaction",
            filter: {
              type: "group",
              combinator: "and",
              children: [
                {
                  type: "condition",
                  field: "type",
                  operator: "==",
                  value: { type: "static", value: "INCOME" },
                },
              ],
            },
            sort: [],
            limitMode: "all",
            status: "ACTIVE",
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
      url: "/api/entity-query-definitions",
      headers,
    });
    const names = list
      .json()
      .data.items.map((item: { name: string }) => item.name);
    expect(names).toEqual(
      expect.arrayContaining(["Upcoming payments", "Income only"]),
    );
    expect(names).not.toContain("All transactions");
  });

  it("rejects catalog replace when sourceEntity is unknown", async () => {
    const server = await buildTestServer();

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/entity-query-definitions/catalog",
      headers,
      payload: {
        kind: "entity-query-definitions-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        entityQueryDefinitions: [
          {
            name: "Missing entity query",
            sourceEntity: "missing",
            filter: { type: "group", combinator: "and", children: [] },
            sort: [],
            limitMode: "all",
            status: "ACTIVE",
          },
        ],
      },
    });
    expect(replaceCatalog.statusCode).toBe(400);
    expect(replaceCatalog.json().error.message).toContain("missing");
  });

  it("rejects delete when a metric references the query", async () => {
    const server = await buildTestServer();
    await seedTransactionEntity(server);

    const createQuery = await server.inject({
      method: "POST",
      url: "/api/entity-query-definitions",
      headers,
      payload: {
        name: "All transactions",
        sourceEntity: "transaction",
        filter: { type: "group", combinator: "and", children: [] },
        sort: [],
        limitMode: "all",
        status: "ACTIVE",
      },
    });
    expect(createQuery.statusCode).toBe(201);
    const queryId = createQuery.json().data.id as string;

    const createMetric = await server.inject({
      method: "POST",
      url: "/api/metric-definitions",
      headers,
      payload: {
        name: "Transaction count",
        sourceModel: "transaction",
        sourceQueryDefinitionId: queryId,
        aggregations: [{ operation: "COUNT" }],
        fieldsDependency: [],
        schemaVersionDependency: 0,
      },
    });
    expect(createMetric.statusCode).toBe(201);

    const deleteQuery = await server.inject({
      method: "DELETE",
      url: `/api/entity-query-definitions/${queryId}`,
      headers,
    });
    expect(deleteQuery.statusCode).toBe(400);
    expect(deleteQuery.json().error.message).toContain(
      "Cannot delete query while",
    );
  });

  it("rejects catalog replace that would delete a query referenced by a metric", async () => {
    const server = await buildTestServer();
    await seedTransactionEntity(server);

    const createQuery = await server.inject({
      method: "POST",
      url: "/api/entity-query-definitions",
      headers,
      payload: {
        name: "All transactions",
        sourceEntity: "transaction",
        filter: { type: "group", combinator: "and", children: [] },
        sort: [],
        limitMode: "all",
        status: "ACTIVE",
      },
    });
    expect(createQuery.statusCode).toBe(201);
    const queryId = createQuery.json().data.id as string;

    const createMetric = await server.inject({
      method: "POST",
      url: "/api/metric-definitions",
      headers,
      payload: {
        name: "Transaction count",
        sourceModel: "transaction",
        sourceQueryDefinitionId: queryId,
        aggregations: [{ operation: "COUNT" }],
        fieldsDependency: [],
        schemaVersionDependency: 0,
      },
    });
    expect(createMetric.statusCode).toBe(201);

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/entity-query-definitions/catalog",
      headers,
      payload: {
        kind: "entity-query-definitions-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        entityQueryDefinitions: [
          {
            name: "Income only",
            sourceEntity: "transaction",
            filter: {
              type: "group",
              combinator: "and",
              children: [
                {
                  type: "condition",
                  field: "type",
                  operator: "==",
                  value: { type: "static", value: "INCOME" },
                },
              ],
            },
            sort: [],
            limitMode: "all",
            status: "ACTIVE",
          },
        ],
      },
    });
    expect(replaceCatalog.statusCode).toBe(400);
    expect(replaceCatalog.json().error.message).toContain(
      "Cannot delete queries referenced by metrics",
    );
  });
});
