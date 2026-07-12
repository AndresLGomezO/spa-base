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
import {
  buildInMemoryListSnapshotInvalidationPrefix,
  mockCreateInMemoryListSnapshotCache,
} from "../test/mock-in-memory-list-snapshot-cache.js";
import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";

const accessProfileState: { profile: UserAccessProfile } = {
  profile: {
    platformRole: null,
    tenants: { tenant_a: ["widgetWildcard"] },
  },
};

let roleCatalog: RoleCatalog = buildTenantRoleCatalog([]);

const entityDefinitionRepository = createInMemoryEntityDefinitionRepository();
const tenantRepository = createInMemoryTenantRepository();

vi.mock("@repo/gcp-firebase", () => ({
  configureIndexProvisioningQueue: vi.fn(),
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: "user_123",
    tenantId: "tenant_a",
    email: "demo@example.com",
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({
    appId: "demo-app-id",
  })),
  getFirebaseUserRecord: vi.fn(async () => ({
    uid: "user_123",
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
        platformRole: accessProfileState.profile.platformRole,
        tenants: accessProfileState.profile.tenants,
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
  createFirestoreAdminEntityRepository: vi.fn(() =>
    createInMemoryEntityRepository(),
  ),
  createFirestoreAdminJoinCollectionRepository: vi.fn(() =>
    createInMemoryJoinCollectionRepository(),
  ),
  createFirestoreAdminTenantRepository: vi.fn(() => tenantRepository),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache: mockCreateInMemoryListSnapshotCache,
  createFirestoreAdminGmailConnectionRepository: vi.fn(() => ({})),
  createFirestoreAdminEmailMatchBindingRepository: vi.fn(() => ({})),
  createFirestoreAdminEmailIngestJobRepository: vi.fn(() => ({
    listRecent: vi.fn(async () => []),
    get: vi.fn(async () => null),
    create: vi.fn(),
    appendStep: vi.fn(),
    complete: vi.fn(),
  })),
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
    getUserAccessProfile: async () => accessProfileState.profile,
    getRoleCatalog: async () => roleCatalog,
  });
}

describe("wildcard RBAC grants", () => {
  beforeEach(() => {
    entityDefinitionRepository.store.clear();
    roleCatalog = {
      ...buildTenantRoleCatalog([]),
      widgetWildcard: { grants: ["widget.*"] },
    };
    accessProfileState.profile = {
      platformRole: null,
      tenants: { tenant_a: ["widgetWildcard"] },
    };
  });

  it("expands widget.* on GET /auth/validate", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/auth/validate",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.permissions).toEqual(
      expect.arrayContaining([
        "widget.read",
        "widget.create",
        "widget.update",
        "widget.delete",
      ]),
    );
  });

  it("allows widget CRUD when role has only widget.*", async () => {
    const server = await buildTestServer();
    const createResponse = await server.inject({
      method: "POST",
      url: "/api/widget",
      headers: authHeaders,
      payload: { name: "Wildcard Widget" },
    });

    expect(createResponse.statusCode).toBe(201);
  });

  it("expands dynamic lead.* on GET /auth/validate", async () => {
    await entityDefinitionRepository.create("tenant_a", {
      name: "lead",
      label: "Lead",
      fields: [{ name: "title", type: "string", required: true }],
    });

    roleCatalog = {
      ...buildTenantRoleCatalog([]),
      leadWildcard: { grants: ["lead.*"] },
    };
    accessProfileState.profile = {
      platformRole: null,
      tenants: { tenant_a: ["leadWildcard"] },
    };

    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/auth/validate",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.permissions).toEqual(
      expect.arrayContaining([
        "lead.read",
        "lead.create",
        "lead.update",
        "lead.delete",
      ]),
    );
  });

  it("expands editor *.read to include dynamic entity read permissions", async () => {
    await entityDefinitionRepository.create("tenant_a", {
      name: "lead",
      label: "Lead",
      fields: [{ name: "title", type: "string", required: true }],
    });

    accessProfileState.profile = {
      platformRole: null,
      tenants: { tenant_a: ["editor"] },
    };

    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/auth/validate",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.permissions).toEqual(
      expect.arrayContaining(["lead.read", "widget.read"]),
    );
  });
});
