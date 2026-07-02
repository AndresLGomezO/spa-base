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

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

describe("entity relation routes integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    authState.tenantId = "tenant_a";
  });

  it("syncs many-to-many relations and ignores join fields on document CRUD", async () => {
    const server = await buildTestServer();

    for (const payload of [
      {
        name: "otherModel",
        label: "Other Models",
        fields: [{ name: "name", type: "string", required: true }],
      },
      {
        name: "source",
        label: "Sources",
        fields: [
          { name: "name", type: "string", required: true },
          {
            name: "otherModels",
            type: "relation",
            relation: { target: "otherModel", type: "many-to-many" },
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

    const targetCreate = await server.inject({
      method: "POST",
      url: "/api/otherModel",
      headers: authHeaders,
      payload: { name: "Related A" },
    });
    expect(targetCreate.statusCode).toBe(201);
    const targetId = targetCreate.json().data.id as string;

    const sourceCreate = await server.inject({
      method: "POST",
      url: "/api/source",
      headers: authHeaders,
      payload: {
        name: "Source A",
        otherModels: [targetId],
      },
    });
    expect(sourceCreate.statusCode).toBe(201);
    const sourceId = sourceCreate.json().data.id as string;

    const sync = await server.inject({
      method: "PUT",
      url: `/api/source/${sourceId}/relations/otherModels`,
      headers: authHeaders,
      payload: { targetIds: [targetId] },
    });
    expect(sync.statusCode).toBe(200);
    expect(sync.json().data.targetIds).toEqual([targetId]);

    const getRelations = await server.inject({
      method: "GET",
      url: `/api/source/${sourceId}/relations/otherModels`,
      headers: authHeaders,
    });
    expect(getRelations.statusCode).toBe(200);
    expect(getRelations.json().data.targetIds).toEqual([targetId]);
  });
});
