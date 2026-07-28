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

describe("chart definition catalog routes", () => {
  beforeEach(() => {
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearModuleRegistries();
  });

  it("creates and replaces chart definitions via catalog API", async () => {
    const server = await buildTestServer();

    const createResponse = await server.inject({
      method: "POST",
      url: "/api/chart-definitions",
      headers,
      payload: {
        name: "Income trend chart",
        chartType: "area",
        displayMode: "overlay",
        dataSource: {
          type: "static",
          points: [{ x: "Jan", y: 1 }],
        },
        status: "ACTIVE",
      },
    });
    expect(createResponse.statusCode).toBe(201);

    const replaceResponse = await server.inject({
      method: "PUT",
      url: "/api/chart-definitions/catalog",
      headers,
      payload: {
        kind: "chart-definitions-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        chartDefinitions: [
          {
            name: "Income trend chart",
            chartType: "line",
            dataSource: {
              type: "static",
              points: [{ x: "Feb", y: 2 }],
            },
            status: "ACTIVE",
          },
          {
            name: "Expenses trend chart",
            chartType: "area",
            dataSource: {
              type: "static",
              points: [],
            },
            status: "ACTIVE",
          },
        ],
      },
    });

    expect(replaceResponse.statusCode).toBe(200);
    const body = replaceResponse.json();
    expect(body.data.counts.created).toBe(1);
    expect(body.data.counts.updated).toBe(1);
    expect(body.data.items).toHaveLength(2);
  });
});
