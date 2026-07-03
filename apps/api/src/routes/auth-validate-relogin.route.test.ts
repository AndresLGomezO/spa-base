import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import {
  buildInMemoryListSnapshotInvalidationPrefix,
  mockCreateInMemoryListSnapshotCache,
} from "../test/mock-in-memory-list-snapshot-cache.js";
import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";

const reloginState = vi.hoisted(() => {
  const storedUser = {
    uid: "user_relogin",
    email: "admin@example.com",
    emailVerified: true,
    displayName: "Admin" as string | null,
    photoURL: null as string | null,
    phoneNumber: null as string | null,
    disabled: false,
    providers: [] as [],
    authCreatedAt: new Date().toISOString(),
    authLastSignInAt: new Date().toISOString(),
    platformRole: null as string | null,
    tenants: {} as Record<string, string[]>,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let isNewUser = true;

  const upsertFromAuthUser = vi.fn(
    async (authUser: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
      displayName: string | null;
      photoURL: string | null;
      phoneNumber: string | null;
      disabled: boolean;
      providers: [];
      authCreatedAt: string | null;
      authLastSignInAt: string | null;
    }) => {
      storedUser.uid = authUser.uid;
      storedUser.email = authUser.email ?? storedUser.email;
      storedUser.emailVerified = authUser.emailVerified;
      storedUser.displayName = authUser.displayName;
      storedUser.photoURL = authUser.photoURL;
      storedUser.phoneNumber = authUser.phoneNumber;
      storedUser.disabled = authUser.disabled;
      storedUser.providers = authUser.providers;
      storedUser.authCreatedAt =
        authUser.authCreatedAt ?? storedUser.authCreatedAt;
      storedUser.authLastSignInAt =
        authUser.authLastSignInAt ?? storedUser.authLastSignInAt;

      const created = isNewUser;
      isNewUser = false;

      return {
        created,
        user: {
          ...storedUser,
          tenants: { ...storedUser.tenants },
        },
      };
    },
  );

  const updateAccess = vi.fn(
    async (
      _uid: string,
      patch: {
        platformRole?: string | null;
        tenants?: Record<string, string[]>;
      },
    ) => {
      if (patch.platformRole !== undefined) {
        storedUser.platformRole = patch.platformRole;
      }
      if (patch.tenants !== undefined) {
        storedUser.tenants = patch.tenants;
      }
      storedUser.updatedAt = new Date().toISOString();
      return {
        ...storedUser,
        tenants: { ...storedUser.tenants },
      };
    },
  );

  return {
    storedUser,
    reset() {
      isNewUser = true;
      storedUser.platformRole = null;
      storedUser.tenants = {};
    },
    upsertFromAuthUser,
    updateAccess,
  };
});

vi.mock("../config/env.js", () => ({
  apiEnv: {
    API_HOST: "0.0.0.0",
    API_PORT: 3000,
    API_CORS_ORIGINS: "http://localhost:5173",
    PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS: "admin@example.com",
    TENANT_DELETION_PROTECTED_IDS: "rates",
  },
}));

vi.mock("@repo/gcp-firebase", () => ({
  configureIndexProvisioningQueue: vi.fn(),
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: "user_relogin",
    email: "admin@example.com",
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({
    appId: "demo-app-id",
  })),
  getFirebaseUserRecord: vi.fn(async () => ({
    uid: "user_relogin",
    email: "admin@example.com",
    emailVerified: true,
    displayName: "Admin",
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
    upsertFromAuthUser: reloginState.upsertFromAuthUser,
    getByUid: vi.fn(async () => ({
      ...reloginState.storedUser,
      tenants: reloginState.storedUser.tenants ?? {},
    })),
    list: vi.fn(async () => ({ items: [], nextCursor: null })),
    updateAccess: reloginState.updateAccess,
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
  createFirestoreAdminTenantRepository: vi.fn(() =>
    createInMemoryTenantRepository([
      {
        id: "rates",
        name: "Rates",
        status: "active",
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  ),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache: mockCreateInMemoryListSnapshotCache,
}));

import { buildServer } from "../server.js";

function createInMemoryRuntime() {
  return createInMemoryCrudRuntime();
}

describe("GET /auth/validate re-login", () => {
  beforeEach(() => {
    reloginState.reset();
  });

  it("bootstraps superadmin on first login and succeeds on second login", async () => {
    const runtime = createInMemoryRuntime();
    const server = await buildServer({
      logger: false,
      repositories: runtime.repositories,
      queryExecutors: runtime.queryExecutors,
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });

    const headers = {
      authorization: "Bearer fake-token",
      "x-firebase-appcheck": "fake-appcheck",
    };

    const first = await server.inject({
      method: "GET",
      url: "/auth/validate",
      headers,
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      ok: true,
      user: {
        isSuperAdmin: true,
        availableTenants: ["rates"],
        tenantOptions: [{ id: "rates", name: "Rates" }],
      },
    });
    expect(reloginState.storedUser.tenants).toEqual({});
    expect(reloginState.storedUser.platformRole).toBe("platform.superadmin");

    const second = await server.inject({
      method: "GET",
      url: "/auth/validate",
      headers,
    });

    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({
      ok: true,
      user: {
        isSuperAdmin: true,
        availableTenants: ["rates"],
        tenantOptions: [{ id: "rates", name: "Rates" }],
      },
    });
    expect(reloginState.storedUser.tenants).toEqual({});
  });
});
