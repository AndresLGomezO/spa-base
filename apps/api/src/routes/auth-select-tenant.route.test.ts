import { beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import type { CustomerRecord, OrderRecord } from "@repo/shared-types";

const { setFirebaseUserCustomClaims } = vi.hoisted(() => ({
  setFirebaseUserCustomClaims: vi.fn(async () => undefined),
}));

const tenantRepository = createInMemoryTenantRepository();

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
  setFirebaseUserCustomClaims,
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
        tenants: { tenant_a: ["viewer"], tenant_b: ["admin"] },
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

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

describe("POST /auth/select-tenant", () => {
  beforeEach(async () => {
    await tenantRepository.update("tenant_b", { status: "active" });
  });

  it("returns 401 when headers are missing", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "POST",
      url: "/auth/select-tenant",
      payload: { tenantId: "tenant_a" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().ok).toBe(false);
  });

  it("returns 400 when tenantId is missing from body", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "POST",
      url: "/auth/select-tenant",
      headers: authHeaders,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().ok).toBe(false);
  });

  it("returns 403 when tenant is not assigned to user", async () => {
    const server = await buildTestServer();
    const response = await server.inject({
      method: "POST",
      url: "/auth/select-tenant",
      headers: authHeaders,
      payload: { tenantId: "tenant_unknown" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
  });

  it("sets custom claims and returns permissions for authorized tenant", async () => {
    setFirebaseUserCustomClaims.mockClear();
    const server = await buildTestServer();
    const response = await server.inject({
      method: "POST",
      url: "/auth/select-tenant",
      headers: authHeaders,
      payload: { tenantId: "tenant_b" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      tenantId: "tenant_b",
      availableTenants: ["tenant_a", "tenant_b"],
      tenantOptions: [
        { id: "tenant_a", name: "Tenant A" },
        { id: "tenant_b", name: "Tenant B" },
      ],
      isSuperAdmin: false,
    });
    expect(setFirebaseUserCustomClaims).toHaveBeenCalledWith(
      "user_123",
      { tenantId: "tenant_b" },
      expect.any(Object),
    );
    expect(response.json().permissions).toEqual(
      expect.arrayContaining(["customer.read", "customer.create"]),
    );
  });

  it("returns 403 when tenant is suspended", async () => {
    await tenantRepository.update("tenant_b", { status: "suspended" });

    const server = await buildTestServer();
    const response = await server.inject({
      method: "POST",
      url: "/auth/select-tenant",
      headers: authHeaders,
      payload: { tenantId: "tenant_b" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
  });
});
