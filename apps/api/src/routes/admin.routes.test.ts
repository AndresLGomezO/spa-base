import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog, type UserAccessProfile } from "@repo/rbac";

import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import type { CustomerRecord, OrderRecord } from "@repo/shared-types";

const authState = {
  uid: "superadmin_user",
  tenantId: "tenant_a",
};

const usersState = {
  items: [
    {
      uid: "user_target",
      email: "target@example.com",
      emailVerified: true,
      displayName: "Target User",
      photoURL: null,
      phoneNumber: null,
      disabled: false,
      providers: [],
      authCreatedAt: new Date().toISOString(),
      authLastSignInAt: new Date().toISOString(),
      platformRole: null,
      tenants: { tenant_a: ["viewer"] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

vi.mock("@repo/gcp-firebase", () => ({
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: authState.uid,
    tenantId: authState.tenantId,
    email: "super@example.com",
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({
    appId: "demo-app-id",
  })),
  getFirebaseUserRecord: vi.fn(async () => ({
    uid: authState.uid,
    email: "super@example.com",
    emailVerified: true,
    displayName: "Super Admin",
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
        platformRole: "platform.superadmin",
        tenants: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })),
    list: vi.fn(async () => ({
      items: usersState.items,
      nextCursor: null,
    })),
    updateAccess: vi.fn(async (uid, data) => {
      const user = usersState.items.find((item) => item.uid === uid);
      if (!user) return null;
      const updated = {
        ...user,
        tenants: data.tenants ?? user.tenants,
        updatedAt: new Date().toISOString(),
      };
      usersState.items = [updated];
      return updated;
    }),
  })),
  createFirestoreAdminPlatformRoleRepository: vi.fn(() => ({
    listGlobal: vi.fn(async () => [
      {
        name: "viewer",
        grants: ["*.read"],
        tenantId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
    getByName: vi.fn(async () => null),
    ensureGlobalRole: vi.fn(async () => undefined),
  })),
  createFirestoreAdminEntityRepository: vi.fn(() =>
    createInMemoryEntityRepository(),
  ),
  getFirestoreAdmin: vi.fn(() => ({
    collection: vi.fn(() => ({
      select: vi.fn(() => ({
        get: vi.fn(async () => ({
          docs: [{ id: "tenant_a" }, { id: "tenant_b" }],
        })),
      })),
    })),
  })),
}));

import { buildServer } from "../server.js";

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

async function buildTestServer(accessProfile?: UserAccessProfile) {
  return buildServer({
    logger: false,
    repositories: {
      customer: createInMemoryEntityRepository<CustomerRecord>(),
      order: createInMemoryEntityRepository<OrderRecord>(),
    },
    getUserAccessProfile: async () =>
      accessProfile ?? {
        platformRole: "platform.superadmin",
        tenants: {},
      },
    getRoleCatalog: async () => buildRoleCatalog([]),
    skipPlatformRoleSeed: true,
  });
}

describe("Admin routes", () => {
  beforeEach(() => {
    authState.uid = "superadmin_user";
    authState.tenantId = "tenant_a";
  });

  it("returns 403 for non-superadmin users", async () => {
    const server = await buildTestServer({
      platformRole: null,
      tenants: { tenant_a: ["admin"] },
    });

    const response = await server.inject({
      method: "GET",
      url: "/admin/users",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(403);
  });

  it("lists users for superadmin", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/admin/users",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      items: [
        expect.objectContaining({
          uid: "user_target",
          email: "target@example.com",
        }),
      ],
    });
  });

  it("updates tenant roles for a user", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "PATCH",
      url: "/admin/users/user_target",
      headers: authHeaders,
      payload: {
        tenants: {
          tenant_a: ["editor"],
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      user: {
        uid: "user_target",
        tenants: { tenant_a: ["editor"] },
      },
    });
  });
});
