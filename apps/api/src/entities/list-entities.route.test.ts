import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog, type UserAccessProfile } from "@repo/rbac";

import { createInMemoryEntityDefinitionRepository } from "@repo/firestore-converters";

import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import {
  buildInMemoryListSnapshotInvalidationPrefix,
  mockCreateInMemoryListSnapshotCache,
} from "../test/mock-in-memory-list-snapshot-cache.js";
import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";

const authState = {
  uid: "user_123",
  tenantId: "tenant_a",
};

const accessProfileState = {
  platformRole: null as string | null,
  tenants: {
    tenant_a: ["admin"],
  } as Record<string, string[]>,
};

vi.mock("@repo/gcp-firebase", () => ({
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: authState.uid,
    tenantId: authState.tenantId,
    email: "demo@example.com",
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({
    appId: "demo-app-id",
  })),
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
    providers: [],
    authCreatedAt: user.metadata.creationTime,
    authLastSignInAt: user.metadata.lastSignInTime,
  })),
  createFirestoreAdminRegisteredUserRepository: vi.fn(() => ({
    getByUid: vi.fn(async () => null),
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
        platformRole: accessProfileState.platformRole,
        tenants: accessProfileState.tenants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })),
    list: vi.fn(async () => ({ items: [], nextCursor: null })),
    updateAccess: vi.fn(async () => null),
  })),
  createFirestoreAdminPlatformRoleRepository: vi.fn(() => ({
    listGlobal: vi.fn(async () => []),
    getByName: vi.fn(async () => null),
    ensureGlobalRole: vi.fn(async () => undefined),
  })),
  createFirestoreAdminEntityRepository: vi.fn(),
  createFirestoreAdminJoinCollectionRepository: vi.fn(() =>
    createInMemoryJoinCollectionRepository(),
  ),
  createFirestoreAdminTenantRepository: vi.fn(() =>
    createInMemoryTenantRepository(),
  ),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache: mockCreateInMemoryListSnapshotCache,
}));

import { buildServer } from "../server.js";

async function buildTestServer(
  options: {
    readonly accessProfile?: UserAccessProfile;
  } = {},
) {
  const profile = options.accessProfile ?? accessProfileState;
  const runtime = createInMemoryCrudRuntime({ withTestEntities: true });
  return buildServer({
    logger: false,
    repositories: runtime.repositories,
    queryExecutors: runtime.queryExecutors,
    joinRepository: createInMemoryJoinCollectionRepository(),
    getUserAccessProfile: async () => profile,
    getRoleCatalog: async () => buildRoleCatalog([]),
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
  });
}

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

describe("GET /api/entities", () => {
  beforeEach(() => {
    authState.uid = "user_123";
    authState.tenantId = "tenant_a";
    accessProfileState.platformRole = null;
    accessProfileState.tenants = {
      tenant_a: ["admin"],
    };
  });

  it("returns 401 without auth headers", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/entities",
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns serialized entity definitions for authorized users", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/entities",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.error).toBeNull();
    expect(body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "widget",
          collection: "widgets",
          ui: expect.objectContaining({
            nav: expect.objectContaining({ label: "Widgets" }),
          }),
        }),
        expect.objectContaining({
          name: "testItem",
          collection: "testItems",
        }),
      ]),
    );
  });

  it("filters catalog entries by entity read permission", async () => {
    const server = await buildTestServer({
      accessProfile: {
        platformRole: null,
        tenants: { tenant_a: ["viewer"] },
      },
    });

    accessProfileState.tenants = { tenant_a: ["viewer"] };

    const response = await server.inject({
      method: "GET",
      url: "/api/entities",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const names = response
      .json()
      .data.items.map((item: { name: string }) => item.name);
    expect(names).toEqual(expect.arrayContaining(["widget", "testItem"]));
  });

  it("returns only readable entities for partial viewers", async () => {
    const runtime = createInMemoryCrudRuntime({ withTestEntities: true });
    const server = await buildServer({
      logger: false,
      repositories: runtime.repositories,
      queryExecutors: runtime.queryExecutors,
      joinRepository: createInMemoryJoinCollectionRepository(),
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: { tenant_a: ["widget_viewer"] },
      }),
      getRoleCatalog: async () => ({
        widget_viewer: { grants: ["widget.read"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/entities",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const names = response
      .json()
      .data.items.map((item: { name: string }) => item.name);
    expect(names).toEqual(["widget"]);
  });

  it("returns 403 when user has no read permissions", async () => {
    const runtime = createInMemoryCrudRuntime({ withTestEntities: true });
    const server = await buildServer({
      logger: false,
      repositories: runtime.repositories,
      queryExecutors: runtime.queryExecutors,
      joinRepository: createInMemoryJoinCollectionRepository(),
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: { tenant_a: ["no_access"] },
      }),
      getRoleCatalog: async () => ({
        no_access: { grants: ["widget.create"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/entities",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(403);
  });

  it("excludes hidden-from-nav entities unless the viewer can browse internal entities", async () => {
    const entityDefinitionRepository =
      createInMemoryEntityDefinitionRepository();
    await entityDefinitionRepository.create("tenant_a", {
      name: "statusType",
      label: "Status Type",
      tenantWideRead: true,
      hiddenFromNav: true,
      fields: [{ name: "name", type: "string", required: true }],
    });

    const runtime = createInMemoryCrudRuntime({ withTestEntities: true });
    const server = await buildServer({
      logger: false,
      repositories: runtime.repositories,
      queryExecutors: runtime.queryExecutors,
      joinRepository: createInMemoryJoinCollectionRepository(),
      entityDefinitionRepository,
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: { tenant_a: ["lookup_viewer"] },
      }),
      getRoleCatalog: async () => ({
        lookup_viewer: { grants: ["statusType.read", "widget.read"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });

    const hiddenResponse = await server.inject({
      method: "GET",
      url: "/api/entities",
      headers: authHeaders,
    });

    expect(hiddenResponse.statusCode).toBe(200);
    expect(
      hiddenResponse
        .json()
        .data.items.map((item: { name: string }) => item.name),
    ).not.toContain("statusType");

    const internalServer = await buildServer({
      logger: false,
      repositories: runtime.repositories,
      queryExecutors: runtime.queryExecutors,
      joinRepository: createInMemoryJoinCollectionRepository(),
      entityDefinitionRepository,
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: { tenant_a: ["internal_viewer"] },
      }),
      getRoleCatalog: async () => ({
        internal_viewer: {
          grants: ["statusType.read", "internalEntity.read"],
        },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });

    const internalResponse = await internalServer.inject({
      method: "GET",
      url: "/api/entities",
      headers: authHeaders,
    });

    expect(internalResponse.statusCode).toBe(200);
    expect(
      internalResponse
        .json()
        .data.items.map((item: { name: string }) => item.name),
    ).toContain("statusType");
  });
});
