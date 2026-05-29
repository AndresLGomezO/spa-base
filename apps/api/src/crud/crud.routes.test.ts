import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = {
  uid: "user_123",
  tenantId: "tenant_a",
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
    upsertFromAuthUser: vi.fn(async (authUser) => ({
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  })),
}));

import { buildServer } from "../server.js";

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

describe("CRUD API", () => {
  beforeEach(() => {
    authState.uid = "user_123";
    authState.tenantId = "tenant_a";
  });

  describe("Customer", () => {
    it("creates a valid record", async () => {
      const server = await buildServer({ logger: false });
      const response = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "Jane Doe", email: "jane@example.com" },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.error).toBeNull();
      expect(body.data).toMatchObject({
        name: "Jane Doe",
        email: "jane@example.com",
        tenantId: "tenant_a",
        isActive: true,
      });
      expect(body.data.id).toBeTruthy();
      expect(body.data.createdAt).toBeTruthy();
      expect(body.data.updatedAt).toBeTruthy();
    });

    it("rejects invalid create payloads", async () => {
      const server = await buildServer({ logger: false });
      const response = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { email: "missing-name@example.com" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        data: null,
        error: { code: "VALIDATION_ERROR" },
      });
    });

    it("rejects client-provided tenantId on create", async () => {
      const server = await buildServer({ logger: false });
      const response = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: {
          name: "Jane Doe",
          tenantId: "tenant_evil",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("lists, gets, updates, and deletes a record", async () => {
      const server = await buildServer({ logger: false });

      const createResponse = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "List Me" },
      });
      const created = createResponse.json().data;

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/customer?limit=10",
        headers: authHeaders,
      });
      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json().data.items).toHaveLength(1);

      const getResponse = await server.inject({
        method: "GET",
        url: `/api/customer/${created.id}`,
        headers: authHeaders,
      });
      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.json().data.id).toBe(created.id);

      const updateResponse = await server.inject({
        method: "PUT",
        url: `/api/customer/${created.id}`,
        headers: authHeaders,
        payload: { email: "updated@example.com" },
      });
      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.json().data.email).toBe("updated@example.com");
      expect(updateResponse.json().data.updatedAt).not.toBe(created.updatedAt);

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/api/customer/${created.id}`,
        headers: authHeaders,
      });
      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.json().data).toEqual({ deleted: true });

      const missingResponse = await server.inject({
        method: "GET",
        url: `/api/customer/${created.id}`,
        headers: authHeaders,
      });
      expect(missingResponse.statusCode).toBe(404);
    });

    it("returns 404 for cross-tenant access", async () => {
      const server = await buildServer({ logger: false });

      const createResponse = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "Tenant A Only" },
      });
      const created = createResponse.json().data;

      authState.tenantId = "tenant_b";
      const crossTenantResponse = await server.inject({
        method: "GET",
        url: `/api/customer/${created.id}`,
        headers: authHeaders,
      });

      expect(crossTenantResponse.statusCode).toBe(404);
      expect(crossTenantResponse.json().error.code).toBe("NOT_FOUND");
    });
  });

  describe("Order", () => {
    it("creates and validates order records", async () => {
      const server = await buildServer({ logger: false });
      const response = await server.inject({
        method: "POST",
        url: "/api/order",
        headers: authHeaders,
        payload: {
          orderNumber: "ORD-1001",
          total: 42.5,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().data).toMatchObject({
        orderNumber: "ORD-1001",
        total: 42.5,
        tenantId: "tenant_a",
        isFulfilled: false,
      });
    });

    it("rejects invalid order payloads", async () => {
      const server = await buildServer({ logger: false });
      const response = await server.inject({
        method: "POST",
        url: "/api/order",
        headers: authHeaders,
        payload: { orderNumber: "ORD-1002" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Auth", () => {
    it("returns 401 without auth headers on CRUD routes", async () => {
      const server = await buildServer({ logger: false });
      const response = await server.inject({
        method: "GET",
        url: "/api/customer",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when tenantId claim is missing", async () => {
      authState.tenantId = "";
      const server = await buildServer({ logger: false });
      const response = await server.inject({
        method: "GET",
        url: "/api/customer",
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe("TENANT_NOT_RESOLVED");
    });
  });
});
