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

const headers = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

async function seedTransactionEntityAndQuery(
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

  const createQuery = await server.inject({
    method: "POST",
    url: "/api/entity-query-definitions",
    headers,
    payload: {
      name: "Upcoming payments",
      sourceEntity: "transaction",
      filter: { type: "group", combinator: "and", children: [] },
      sort: [],
      limitMode: "topN",
      limit: 20,
      status: "ACTIVE",
    },
  });
  expect(createQuery.statusCode).toBe(201);

  return createQuery.json().data.id as string;
}

describe("custom views catalog integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    authState.tenantId = "tenant_a";
  });

  it("replaces the tenant custom views catalog by viewId", async () => {
    const server = await buildTestServer();
    const queryDefinitionId = await seedTransactionEntityAndQuery(server);

    const createView = await server.inject({
      method: "POST",
      url: "/api/custom-views",
      headers,
      payload: {
        name: "Upcoming payments",
        viewId: "upcoming-payments",
        entityQueryDefinitionId: queryDefinitionId,
        nav: { label: "Payments" },
        status: "ACTIVE",
      },
    });
    expect(createView.statusCode).toBe(201);

    const createOther = await server.inject({
      method: "POST",
      url: "/api/custom-views",
      headers,
      payload: {
        name: "All transactions",
        viewId: "all-transactions",
        entityQueryDefinitionId: queryDefinitionId,
        nav: { label: "All" },
        status: "ACTIVE",
      },
    });
    expect(createOther.statusCode).toBe(201);

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/custom-views/catalog",
      headers,
      payload: {
        kind: "custom-views-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        customViews: [
          {
            name: "Upcoming payments",
            viewId: "upcoming-payments",
            entityQueryDefinitionName: "Upcoming payments",
            nav: { label: "Payments updated" },
            status: "ACTIVE",
          },
          {
            name: "Income only",
            viewId: "income-only",
            entityQueryDefinitionName: "Upcoming payments",
            nav: { label: "Income" },
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
      url: "/api/custom-views",
      headers,
    });
    const viewIds = list
      .json()
      .data.items.map((item: { viewId: string }) => item.viewId);
    expect(viewIds).toEqual(
      expect.arrayContaining(["upcoming-payments", "income-only"]),
    );
    expect(viewIds).not.toContain("all-transactions");
  });

  it("rejects catalog replace when entityQueryDefinitionName is unknown", async () => {
    const server = await buildTestServer();

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/custom-views/catalog",
      headers,
      payload: {
        kind: "custom-views-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        customViews: [
          {
            name: "Missing query view",
            viewId: "missing-query",
            entityQueryDefinitionName: "missing",
            nav: { label: "Missing" },
            status: "ACTIVE",
          },
        ],
      },
    });
    expect(replaceCatalog.statusCode).toBe(400);
    expect(replaceCatalog.json().error.message).toContain("missing");
  });
});
