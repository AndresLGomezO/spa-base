import { describe, expect, it, vi } from "vitest";

import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import type { CustomerRecord, OrderRecord } from "@repo/shared-types";

vi.mock("@repo/gcp-firebase", () => ({
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
        platformRole: null,
        tenants: { tenant_a: ["viewer"] },
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
  createFirestoreAdminTenantRepository: vi.fn(() =>
    createInMemoryTenantRepository(),
  ),
}));

import { buildServer } from "../server.js";

function createInMemoryRepositories() {
  return {
    customer: createInMemoryEntityRepository<CustomerRecord>(),
    order: createInMemoryEntityRepository<OrderRecord>(),
  };
}

async function buildTestServer() {
  return buildServer({
    logger: false,
    repositories: createInMemoryRepositories(),
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
  });
}

describe("GET /auth/validate", () => {
  it("returns 401 when headers are missing", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/auth/validate",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().ok).toBe(false);
  });

  it("returns success when headers are present", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/auth/validate",
      headers: {
        authorization: "Bearer fake-token",
        "x-firebase-appcheck": "fake-appcheck",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      user: {
        uid: "user_123",
        email: "demo@example.com",
        isSuperAdmin: false,
        permissions: ["customer.read", "order.read"],
        tenantId: "tenant_a",
        availableTenants: ["tenant_a"],
        tenantOptions: [{ id: "tenant_a", name: "Tenant A" }],
      },
      appCheck: { appId: "demo-app-id" },
    });
  });
});
