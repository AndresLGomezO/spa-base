import { beforeEach, describe, expect, it, vi } from "vitest";

import { defineEntity } from "@repo/entities";
import { buildRoleCatalog, type UserAccessProfile } from "@repo/rbac";
import {
  clearModuleRegistries,
  defineApp,
  defineModule,
  loadApp,
} from "@repo/modules";

import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import {
  buildInMemoryListSnapshotInvalidationPrefix,
  mockCreateInMemoryListSnapshotCache,
} from "../test/mock-in-memory-list-snapshot-cache.js";
import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import {
  resetPlatformBootstrapForTests,
  markPlatformBootstrappedForTests,
} from "@app/platform/bootstrap.js";

const SampleEntity = defineEntity({
  name: "sample",
  fields: {
    name: { type: "string", required: true },
  },
});

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

function bootstrapTestModuleApp() {
  resetPlatformBootstrapForTests();
  clearModuleRegistries();
  const demoModule = defineModule({
    name: "demo",
    version: "1.0.0",
    entities: [SampleEntity],
    routes: [
      {
        method: "GET",
        path: "/api/modules/demo/summary",
        handler: async () => ({ module: "demo" }),
      },
    ],
    ui: {
      extend: {
        sample: {
          views: [
            {
              type: "table",
              name: "demo-context",
              fields: ["name"],
            },
          ],
        },
      },
    },
  });
  loadApp(defineApp({ modules: [demoModule] }), { force: true });
  markPlatformBootstrappedForTests();
}

async function buildTestServer(
  options: {
    readonly accessProfile?: UserAccessProfile;
  } = {},
) {
  const profile = options.accessProfile ?? accessProfileState;
  const runtime = createInMemoryCrudRuntime({ skipBootstrap: true });
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

describe("module system integration", () => {
  beforeEach(() => {
    bootstrapTestModuleApp();
    authState.uid = "user_123";
    authState.tenantId = "tenant_a";
    accessProfileState.platformRole = null;
    accessProfileState.tenants = {
      tenant_a: ["admin"],
    };
  });

  it("registers module entity in GET /api/entities", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/entities",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const names = response
      .json()
      .data.items.map((item: { name: string }) => item.name);
    expect(names).toContain("sample");
  });

  it("merges module UI extensions into sample catalog entry", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/entities",
      headers: authHeaders,
    });

    const sample = response
      .json()
      .data.items.find((item: { name: string }) => item.name === "sample");
    expect(
      sample.ui.views.some(
        (view: { name: string }) => view.name === "demo-context",
      ),
    ).toBe(true);
  });

  it("serves module custom route", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/modules/demo/summary",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.module).toBe("demo");
  });

  it("creates sample records via generic CRUD", async () => {
    const server = await buildTestServer();
    const createResponse = await server.inject({
      method: "POST",
      url: "/api/sample",
      headers: authHeaders,
      payload: { name: "Widget" },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().data.name).toBe("Widget");
  });
});
