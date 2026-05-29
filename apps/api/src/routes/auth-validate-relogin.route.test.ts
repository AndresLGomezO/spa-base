import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import type { CustomerRecord, OrderRecord } from "@repo/shared-types";

const reloginState = vi.hoisted(() => {
  const storedUser = {
    uid: "user_relogin",
    email: "admin@example.com",
    emailVerified: true,
    displayName: "Admin",
    photoURL: null,
    phoneNumber: null,
    disabled: false,
    providers: [] as [],
    authCreatedAt: new Date().toISOString(),
    authLastSignInAt: new Date().toISOString(),
    platformRole: null as string | null,
    tenants: {} as Record<string, string[]>,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let validateCount = 0;

  return {
    storedUser,
    reset() {
      validateCount = 0;
      storedUser.platformRole = null;
      storedUser.tenants = {};
    },
    async upsertFromAuthUser() {
      validateCount += 1;
      const created = validateCount === 1;
      return {
        created,
        user: {
          ...storedUser,
          tenants: storedUser.tenants ?? {},
        },
      };
    },
    async updateAccess(
      _uid: string,
      data: {
        platformRole?: string | null;
        tenants?: Record<string, string[]>;
      },
    ) {
      if (data.platformRole !== undefined) {
        storedUser.platformRole = data.platformRole;
      }
      if (data.tenants !== undefined) {
        storedUser.tenants = data.tenants;
      }
      storedUser.updatedAt = new Date().toISOString();
      return {
        ...storedUser,
        tenants: storedUser.tenants ?? {},
      };
    },
  };
});

vi.mock("../config/env.js", () => ({
  apiEnv: {
    API_HOST: "0.0.0.0",
    API_PORT: 3000,
    API_CORS_ORIGINS: "http://localhost:5173",
    PLATFORM_BOOTSTRAP_SUPERADMIN_EMAILS: "admin@example.com",
  },
}));

vi.mock("@repo/gcp-firebase", () => ({
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
  createFirestoreAdminTenantRepository: vi.fn(() =>
    createInMemoryTenantRepository([
      {
        id: "tenant_dev_1",
        name: "Dev Tenant 1",
        status: "active",
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  ),
}));

import { buildServer } from "../server.js";

function createInMemoryRepositories() {
  return {
    customer: createInMemoryEntityRepository<CustomerRecord>(),
    order: createInMemoryEntityRepository<OrderRecord>(),
  };
}

describe("GET /auth/validate re-login", () => {
  beforeEach(() => {
    reloginState.reset();
  });

  it("bootstraps superadmin on first login and succeeds on second login", async () => {
    const server = await buildServer({
      logger: false,
      repositories: createInMemoryRepositories(),
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
        availableTenants: ["tenant_dev_1"],
        tenantOptions: [{ id: "tenant_dev_1", name: "Dev Tenant 1" }],
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
        availableTenants: ["tenant_dev_1"],
        tenantOptions: [{ id: "tenant_dev_1", name: "Dev Tenant 1" }],
      },
    });
    expect(reloginState.storedUser.tenants).toEqual({});
  });
});
