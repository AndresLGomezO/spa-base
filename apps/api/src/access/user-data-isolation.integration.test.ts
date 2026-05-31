import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildTenantRoleCatalog,
  type RoleCatalog,
  type UserAccessProfile,
} from "@repo/rbac";
import { createInMemoryEntityDefinitionRepository } from "@repo/firestore-converters";
import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";

const currentUserState = { uid: "user_owner" as string };

const tenantMembers = new Map<string, UserAccessProfile>([
  [
    "user_owner",
    {
      platformRole: null,
      tenants: { tenant_a: ["widgetEditor"] },
    },
  ],
  [
    "user_other",
    {
      platformRole: null,
      tenants: { tenant_a: ["widgetEditor"] },
    },
  ],
]);

let roleCatalog: RoleCatalog = buildTenantRoleCatalog([]);

const entityDefinitionRepository = createInMemoryEntityDefinitionRepository();
const tenantRepository = createInMemoryTenantRepository();

vi.mock("@repo/gcp-firebase", () => ({
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: currentUserState.uid,
    tenantId: "tenant_a",
    email: `${currentUserState.uid}@example.com`,
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({
    appId: "demo-app-id",
  })),
  getFirebaseUserRecord: vi.fn(async () => ({
    uid: currentUserState.uid,
    email: `${currentUserState.uid}@example.com`,
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
    providers: [],
    authCreatedAt: user.metadata.creationTime,
    authLastSignInAt: user.metadata.lastSignInTime,
  })),
  setFirebaseUserCustomClaims: vi.fn(async () => undefined),
  createFirestoreAdminRegisteredUserRepository: vi.fn(() => ({
    upsertFromAuthUser: vi.fn(async (authUser) => ({
      created: false,
      user: {
        uid: authUser.uid,
        email: authUser.email,
        emailVerified: authUser.emailVerified,
        displayName: authUser.displayName,
        photoURL: authUser.photoURL,
        phoneNumber: authUser.phoneNumber,
        disabled: authUser.disabled,
        providers: authUser.providers,
        authCreatedAt: authUser.authCreatedAt,
        authLastSignInAt: authUser.authLastSignInAt,
        platformRole: tenantMembers.get(authUser.uid)?.platformRole ?? null,
        tenants: tenantMembers.get(authUser.uid)?.tenants ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })),
    list: vi.fn(async () => ({
      items: [...tenantMembers.entries()].map(([uid, profile]) => ({
        uid,
        email: `${uid}@example.com`,
        emailVerified: true,
        displayName: uid,
        photoURL: null,
        phoneNumber: null,
        disabled: false,
        providers: [],
        authCreatedAt: new Date().toISOString(),
        authLastSignInAt: new Date().toISOString(),
        platformRole: profile.platformRole,
        tenants: profile.tenants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      nextCursor: null,
    })),
    updateAccess: vi.fn(async () => null),
  })),
  createFirestoreAdminPlatformRoleRepository: vi.fn(() => ({
    listGlobal: vi.fn(async () => []),
    getByName: vi.fn(async () => null),
    ensureGlobalRole: vi.fn(async () => undefined),
  })),
  createFirestoreAdminEntityRepository: vi.fn(() =>
    createInMemoryEntityRepository(),
  ),
  createFirestoreAdminJoinCollectionRepository: vi.fn(() =>
    createInMemoryJoinCollectionRepository(),
  ),
  createFirestoreAdminTenantRepository: vi.fn(() => tenantRepository),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
}));

import { buildServer } from "../server.js";

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

async function buildTestServer() {
  const runtime = createInMemoryCrudRuntime({ withTestEntities: true });
  return buildServer({
    logger: false,
    repositories: runtime.repositories,
    queryExecutors: runtime.queryExecutors,
    entityDefinitionRepository,
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
    getUserAccessProfile: async (uid) => tenantMembers.get(uid) ?? null,
    getRoleCatalog: async () => roleCatalog,
  });
}

describe("user data isolation", () => {
  beforeEach(() => {
    entityDefinitionRepository.store.clear();
    currentUserState.uid = "user_owner";
    roleCatalog = {
      ...buildTenantRoleCatalog([]),
      widgetEditor: {
        grants: [
          "widget.read",
          "widget.create",
          "widget.update",
          "widget.delete",
        ],
      },
      widgetReader: {
        grants: ["widget.read"],
      },
    };
  });

  it("isolates records between users in the same tenant", async () => {
    const server = await buildTestServer();

    const createResponse = await server.inject({
      method: "POST",
      url: "/api/widget",
      headers: authHeaders,
      payload: { name: "Owner widget" },
    });
    expect(createResponse.statusCode).toBe(201);
    const createdId = createResponse.json().data.id as string;

    currentUserState.uid = "user_other";
    const listResponse = await server.inject({
      method: "GET",
      url: "/api/widget?limit=20",
      headers: authHeaders,
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().data.items).toHaveLength(0);

    const getResponse = await server.inject({
      method: "GET",
      url: `/api/widget/${createdId}`,
      headers: authHeaders,
    });
    expect(getResponse.statusCode).toBe(404);
  });

  it("shares read access and revokes it", async () => {
    const server = await buildTestServer();

    const createResponse = await server.inject({
      method: "POST",
      url: "/api/widget",
      headers: authHeaders,
      payload: { name: "Shared widget" },
    });
    const createdId = createResponse.json().data.id as string;

    const shareResponse = await server.inject({
      method: "POST",
      url: `/api/widget/${createdId}/share`,
      headers: authHeaders,
      payload: { userId: "user_other", permission: "read" },
    });
    expect(shareResponse.statusCode).toBe(200);
    expect(shareResponse.json().data.shares).toEqual([
      { userId: "user_other", permission: "read" },
    ]);

    currentUserState.uid = "user_other";
    const listResponse = await server.inject({
      method: "GET",
      url: "/api/widget?limit=20",
      headers: authHeaders,
    });
    expect(listResponse.json().data.items).toHaveLength(1);

    currentUserState.uid = "user_owner";
    const revokeResponse = await server.inject({
      method: "DELETE",
      url: `/api/widget/${createdId}/share/user_other`,
      headers: authHeaders,
    });
    expect(revokeResponse.statusCode).toBe(200);

    currentUserState.uid = "user_other";
    const hiddenListResponse = await server.inject({
      method: "GET",
      url: "/api/widget?limit=20",
      headers: authHeaders,
    });
    expect(hiddenListResponse.json().data.items).toHaveLength(0);
  });

  it("allows write share but not delete", async () => {
    const server = await buildTestServer();

    const createResponse = await server.inject({
      method: "POST",
      url: "/api/widget",
      headers: authHeaders,
      payload: { name: "Collaborative widget" },
    });
    const createdId = createResponse.json().data.id as string;

    await server.inject({
      method: "POST",
      url: `/api/widget/${createdId}/share`,
      headers: authHeaders,
      payload: { userId: "user_other", permission: "write" },
    });

    currentUserState.uid = "user_other";
    const updateResponse = await server.inject({
      method: "PUT",
      url: `/api/widget/${createdId}`,
      headers: authHeaders,
      payload: { name: "Updated by collaborator" },
    });
    expect(updateResponse.statusCode).toBe(200);

    const deleteResponse = await server.inject({
      method: "DELETE",
      url: `/api/widget/${createdId}`,
      headers: authHeaders,
    });
    expect(deleteResponse.statusCode).toBe(404);
  });

  it("allows read_all users to see all records", async () => {
    tenantMembers.set("user_auditor", {
      platformRole: null,
      tenants: { tenant_a: ["widgetAuditor"] },
    });
    roleCatalog = {
      ...roleCatalog,
      widgetAuditor: { grants: ["widget.read_all"] },
    };

    const server = await buildTestServer();

    await server.inject({
      method: "POST",
      url: "/api/widget",
      headers: authHeaders,
      payload: { name: "Owner-only widget" },
    });

    currentUserState.uid = "user_auditor";
    const listResponse = await server.inject({
      method: "GET",
      url: "/api/widget?limit=20",
      headers: authHeaders,
    });
    expect(listResponse.json().data.items).toHaveLength(1);
  });
});
