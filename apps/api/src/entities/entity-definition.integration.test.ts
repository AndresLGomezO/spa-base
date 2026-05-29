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
});
