import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTenantRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearHookRegistry } from "@repo/hooks";
import { clearModuleRegistries } from "@repo/modules";

import { resetPlatformBootstrapForTests } from "@app/platform/bootstrap.js";

import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";
import { registerCrudTestEntities } from "../test/crud-test-entities.js";
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

const userProfile = {
  platformRole: null as string | null,
  tenants: { tenant_a: ["admin"] } as Record<string, string[]>,
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
  createFirestoreAdminHookRepository: vi.fn(),
  createFirestoreAdminTenantRoleRepository: vi.fn(),
}));

function buildViewerCatalogWithHiddenEmail() {
  return buildTenantRoleCatalog([
    {
      id: "viewer",
      tenantId: "tenant_a",
      name: "viewer",
      grants: ["widget.read"],
      fieldRules: [
        {
          resource: "widget",
          fields: [{ field: "email", access: "none" }],
        },
      ],
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    },
  ]);
}

async function buildTestServer(roleCatalog = buildTenantRoleCatalog([])) {
  const runtime = createInMemoryCrudRuntime({ withTestEntities: true });
  return buildServer({
    logger: false,
    repositories: runtime.repositories,
    queryExecutors: runtime.queryExecutors,
    joinRepository: createInMemoryJoinCollectionRepository(),
    getRoleCatalog: async () => roleCatalog,
    getUserAccessProfile: async () => userProfile,
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
  });
}

describe("roles integration", () => {
  beforeEach(() => {
    resetPlatformBootstrapForTests();
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    registerCrudTestEntities();
    authState.tenantId = "tenant_a";
    userProfile.platformRole = null;
    userProfile.tenants = { tenant_a: ["admin"] };
  });

  it("lists and creates tenant roles", async () => {
    const server = await buildTestServer();

    const listResponse = await server.inject({
      method: "GET",
      url: "/api/roles",
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
    });

    expect(listResponse.statusCode).toBe(200);

    const createResponse = await server.inject({
      method: "POST",
      url: "/api/roles",
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
      payload: {
        name: "finance",
        grants: ["widget.read", "widget.update"],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().data.name).toBe("finance");
  });

  it("strips forbidden fields from widget GET responses", async () => {
    const server = await buildTestServer(buildViewerCatalogWithHiddenEmail());

    const createRecord = await server.inject({
      method: "POST",
      url: "/api/widget",
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
      payload: {
        name: "Acme",
        email: "secret@example.com",
      },
    });
    expect(createRecord.statusCode).toBe(201);
    const recordId = createRecord.json().data.id as string;

    userProfile.tenants = { tenant_a: ["viewer"] };
    const getRecord = await server.inject({
      method: "GET",
      url: `/api/widget/${recordId}`,
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
    });

    expect(getRecord.statusCode).toBe(200);
    expect(getRecord.json().data.name).toBe("Acme");
    expect(getRecord.json().data.email).toBeUndefined();
  });

  it("rejects PATCH when a read-only field is submitted", async () => {
    const server = await buildTestServer(
      buildTenantRoleCatalog([
        {
          id: "editor",
          tenantId: "tenant_a",
          name: "editor",
          grants: ["widget.read", "widget.update"],
          fieldRules: [
            {
              resource: "widget",
              fields: [{ field: "name", access: "read" }],
            },
          ],
          createdAt: "2020-01-01T00:00:00.000Z",
          updatedAt: "2020-01-01T00:00:00.000Z",
        },
      ]),
    );

    userProfile.tenants = { tenant_a: ["admin"] };
    const createRecord = await server.inject({
      method: "POST",
      url: "/api/widget",
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
      payload: { name: "Acme" },
    });
    expect(createRecord.statusCode).toBe(201);
    const recordId = createRecord.json().data.id as string;

    userProfile.tenants = { tenant_a: ["editor"] };
    const patchResponse = await server.inject({
      method: "PUT",
      url: `/api/widget/${recordId}`,
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
      payload: { name: "Updated" },
    });

    expect(patchResponse.statusCode).toBe(400);
    expect(patchResponse.json().error.message).toContain("not writable");
  });
});
