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

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
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
  createFirestoreAdminHookRepository: vi.fn(),
  createFirestoreAdminEntityCategoryRepository: vi.fn(),
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

describe("entity categories integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    authState.tenantId = "tenant_a";
  });

  it("creates, lists, updates, and deletes categories", async () => {
    const server = await buildTestServer();

    const createResponse = await server.inject({
      method: "POST",
      url: "/api/entity-categories",
      headers: authHeaders,
      payload: {
        name: "Operations",
        icon: "Folder",
        order: 10,
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json().data;
    expect(created.name).toBe("Operations");

    const listResponse = await server.inject({
      method: "GET",
      url: "/api/entity-categories",
      headers: authHeaders,
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().data.items).toHaveLength(1);

    const patchResponse = await server.inject({
      method: "PATCH",
      url: `/api/entity-categories/${created.id}`,
      headers: authHeaders,
      payload: { name: "Ops" },
    });
    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().data.name).toBe("Ops");

    const deleteResponse = await server.inject({
      method: "DELETE",
      url: `/api/entity-categories/${created.id}`,
      headers: authHeaders,
    });
    expect(deleteResponse.statusCode).toBe(204);
  });

  it("rejects delete when entity definitions reference the category", async () => {
    const server = await buildTestServer();

    const createCategory = await server.inject({
      method: "POST",
      url: "/api/entity-categories",
      headers: authHeaders,
      payload: {
        name: "Sales",
        icon: "Tags",
        order: 0,
      },
    });
    const categoryId = createCategory.json().data.id as string;

    const createDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload: {
        name: "deal",
        label: "Deals",
        navCategoryId: categoryId,
        fields: [{ name: "title", type: "string", required: true }],
      },
    });
    expect(createDefinition.statusCode).toBe(201);

    const deleteResponse = await server.inject({
      method: "DELETE",
      url: `/api/entity-categories/${categoryId}`,
      headers: authHeaders,
    });
    expect(deleteResponse.statusCode).toBe(400);
    expect(deleteResponse.json().error.message).toContain(
      "Cannot delete category",
    );
  });

  it("rejects entity definitions with unknown navCategoryId", async () => {
    const server = await buildTestServer();

    const createDefinition = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload: {
        name: "deal",
        label: "Deals",
        navCategoryId: "cat_missing",
        fields: [{ name: "title", type: "string", required: true }],
      },
    });
    expect(createDefinition.statusCode).toBe(400);
    expect(createDefinition.json().error.message).toContain("does not exist");
  });
});
