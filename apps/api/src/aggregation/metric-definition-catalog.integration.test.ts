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

async function seedLoanEntity(
  server: Awaited<ReturnType<typeof buildTestServer>>,
) {
  const createDefinition = await server.inject({
    method: "POST",
    url: "/api/entity-definitions",
    headers,
    payload: {
      name: "loan",
      label: "Loans",
      fields: [{ name: "amount", type: "number", required: true }],
    },
  });
  expect(createDefinition.statusCode).toBe(201);
}

describe("metric definitions catalog integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    authState.tenantId = "tenant_a";
  });

  it("replaces the tenant metric catalog by name", async () => {
    const server = await buildTestServer();
    await seedLoanEntity(server);

    const createMetric = await server.inject({
      method: "POST",
      url: "/api/metric-definitions",
      headers,
      payload: {
        name: "Loan total",
        sourceModel: "loan",
        aggregations: [{ operation: "SUM", field: "amount" }],
        fieldsDependency: ["amount"],
        schemaVersionDependency: 0,
      },
    });
    expect(createMetric.statusCode).toBe(201);

    const createOther = await server.inject({
      method: "POST",
      url: "/api/metric-definitions",
      headers,
      payload: {
        name: "Loan count",
        sourceModel: "loan",
        aggregations: [{ operation: "COUNT" }],
        fieldsDependency: [],
        schemaVersionDependency: 0,
      },
    });
    expect(createOther.statusCode).toBe(201);

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/metric-definitions/catalog",
      headers,
      payload: {
        kind: "metric-definitions-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        metricDefinitions: [
          {
            name: "Loan total",
            sourceModel: "loan",
            aggregations: [{ operation: "SUM", field: "amount" }],
            fieldsDependency: ["amount"],
            version: 1,
            schemaVersionDependency: 0,
            status: "ACTIVE",
          },
          {
            name: "Average amount",
            sourceModel: "loan",
            aggregations: [{ operation: "AVG", field: "amount" }],
            fieldsDependency: ["amount"],
            version: 1,
            schemaVersionDependency: 0,
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
      url: "/api/metric-definitions",
      headers,
    });
    const names = list
      .json()
      .data.items.map((item: { name: string }) => item.name);
    expect(names).toEqual(
      expect.arrayContaining(["Loan total", "Average amount"]),
    );
    expect(names).not.toContain("Loan count");
  });

  it("rejects catalog replace when sourceModel is unknown", async () => {
    const server = await buildTestServer();

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/metric-definitions/catalog",
      headers,
      payload: {
        kind: "metric-definitions-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        metricDefinitions: [
          {
            name: "Missing model metric",
            sourceModel: "missing",
            aggregations: [{ operation: "COUNT" }],
            fieldsDependency: [],
            version: 1,
            schemaVersionDependency: 0,
            status: "ACTIVE",
          },
        ],
      },
    });
    expect(replaceCatalog.statusCode).toBe(400);
    expect(replaceCatalog.json().error.message).toContain("missing");
  });
});
