import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog, type UserAccessProfile } from "@repo/rbac";

import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
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
  createFirestoreAdminEntityRepository: vi.fn(() =>
    createInMemoryEntityRepository(),
  ),
  createFirestoreAdminJoinCollectionRepository: vi.fn(() =>
    createInMemoryJoinCollectionRepository(),
  ),
  createFirestoreAdminTenantRepository: vi.fn(() =>
    createInMemoryTenantRepository(),
  ),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
}));

import { buildServer } from "../server.js";

function createInMemoryRepositories() {
  return createInMemoryCrudRuntime();
}

interface BuildTestServerOptions {
  readonly accessProfile?: UserAccessProfile;
}

async function buildTestServer(options: BuildTestServerOptions = {}) {
  const profile = options.accessProfile ?? accessProfileState;
  const runtime = createInMemoryRepositories();
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

describe("CRUD API", () => {
  beforeEach(() => {
    authState.uid = "user_123";
    authState.tenantId = "tenant_a";
    accessProfileState.platformRole = null;
    accessProfileState.tenants = {
      tenant_a: ["admin"],
    };
  });

  describe("Customer", () => {
    it("creates a valid record", async () => {
      const server = await buildTestServer();
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
      const server = await buildTestServer();
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
      const server = await buildTestServer();
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
      const server = await buildTestServer();

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
      const server = await buildTestServer({
        accessProfile: {
          platformRole: null,
          tenants: {
            tenant_a: ["admin"],
            tenant_b: ["admin"],
          },
        },
      });

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
    async function createCustomer(
      server: Awaited<ReturnType<typeof buildTestServer>>,
    ) {
      const response = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "Order Customer" },
      });
      expect(response.statusCode).toBe(201);
      return response.json().data as { id: string };
    }

    it("creates and validates order records", async () => {
      const server = await buildTestServer();
      const customer = await createCustomer(server);
      const response = await server.inject({
        method: "POST",
        url: "/api/order",
        headers: authHeaders,
        payload: {
          orderNumber: "ORD-1001",
          total: 42.5,
          customerId: customer.id,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().data).toMatchObject({
        orderNumber: "ORD-1001",
        total: 42.5,
        customerId: customer.id,
        tenantId: "tenant_a",
        isFulfilled: false,
      });
    });

    it("rejects invalid order payloads", async () => {
      const server = await buildTestServer();
      const response = await server.inject({
        method: "POST",
        url: "/api/order",
        headers: authHeaders,
        payload: { orderNumber: "ORD-1002" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects orders referencing missing customers", async () => {
      const server = await buildTestServer();
      const response = await server.inject({
        method: "POST",
        url: "/api/order",
        headers: authHeaders,
        payload: {
          orderNumber: "ORD-1003",
          total: 10,
          customerId: "missing_customer",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("RELATION_NOT_FOUND");
    });

    it("blocks deleting a customer referenced by orders", async () => {
      const server = await buildTestServer();
      const customer = await createCustomer(server);
      const orderResponse = await server.inject({
        method: "POST",
        url: "/api/order",
        headers: authHeaders,
        payload: {
          orderNumber: "ORD-1004",
          total: 15,
          customerId: customer.id,
        },
      });
      expect(orderResponse.statusCode).toBe(201);

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/api/customer/${customer.id}`,
        headers: authHeaders,
      });

      expect(deleteResponse.statusCode).toBe(409);
      expect(deleteResponse.json().error.code).toBe(
        "RELATION_DELETE_RESTRICTED",
      );
    });
  });

  describe("Auth", () => {
    it("returns 401 without auth headers on CRUD routes", async () => {
      const server = await buildTestServer();
      const response = await server.inject({
        method: "GET",
        url: "/api/customer",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when tenantId claim is missing", async () => {
      authState.tenantId = "";
      const server = await buildTestServer();
      const response = await server.inject({
        method: "GET",
        url: "/api/customer",
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe("TENANT_NOT_RESOLVED");
    });
  });

  describe("RBAC", () => {
    it("returns 403 when user has no roles", async () => {
      const server = await buildTestServer({
        accessProfile: {
          platformRole: null,
          tenants: {},
        },
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "Denied User" },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe("FORBIDDEN");
    });

    it("allows viewer to read but not create", async () => {
      const server = await buildTestServer({
        accessProfile: {
          platformRole: null,
          tenants: { tenant_a: ["viewer"] },
        },
      });

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/customer",
        headers: authHeaders,
      });
      expect(listResponse.statusCode).toBe(200);

      const createResponse = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "Viewer Create Attempt" },
      });
      expect(createResponse.statusCode).toBe(403);
      expect(createResponse.json().error.code).toBe("FORBIDDEN");
    });

    it("allows editor to create and update but not delete", async () => {
      const server = await buildTestServer({
        accessProfile: {
          platformRole: null,
          tenants: { tenant_a: ["editor"] },
        },
      });

      const createResponse = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "Editor Record" },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json().data;

      const updateResponse = await server.inject({
        method: "PUT",
        url: `/api/customer/${created.id}`,
        headers: authHeaders,
        payload: { email: "editor@example.com" },
      });
      expect(updateResponse.statusCode).toBe(200);

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/api/customer/${created.id}`,
        headers: authHeaders,
      });
      expect(deleteResponse.statusCode).toBe(403);
      expect(deleteResponse.json().error.code).toBe("FORBIDDEN");
    });

    it("allows superadmin without tenant roles", async () => {
      const server = await buildTestServer({
        accessProfile: {
          platformRole: "superadmin",
          tenants: {},
        },
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "Superadmin Record" },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe("Tenant isolation", () => {
    it("returns only records for the authenticated tenant", async () => {
      const server = await buildTestServer();
      const createResponse = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "Tenant A Customer" },
      });
      expect(createResponse.statusCode).toBe(201);

      authState.tenantId = "tenant_b";
      accessProfileState.tenants = { tenant_b: ["admin"] };

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/customer",
        headers: authHeaders,
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json().data.items).toEqual([]);
    });

    it("applies different permissions per tenant selection for the same user", async () => {
      accessProfileState.tenants = {
        tenant_a: ["admin"],
        tenant_b: ["viewer"],
      };

      const server = await buildTestServer();
      authState.tenantId = "tenant_a";

      const createInTenantA = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "Created in tenant A" },
      });
      expect(createInTenantA.statusCode).toBe(201);

      authState.tenantId = "tenant_b";

      const createInTenantB = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name: "Blocked in tenant B" },
      });
      expect(createInTenantB.statusCode).toBe(403);
      expect(createInTenantB.json().error.code).toBe("FORBIDDEN");
    });
  });

  describe("Query Engine", () => {
    async function createCustomer(
      server: Awaited<ReturnType<typeof buildTestServer>>,
      name = "Query Customer",
    ) {
      const response = await server.inject({
        method: "POST",
        url: "/api/customer",
        headers: authHeaders,
        payload: { name },
      });
      expect(response.statusCode).toBe(201);
      return response.json().data as { id: string };
    }

    async function createOrder(
      server: Awaited<ReturnType<typeof buildTestServer>>,
      customerId: string,
      orderNumber: string,
      total: number,
    ) {
      const response = await server.inject({
        method: "POST",
        url: "/api/order",
        headers: authHeaders,
        payload: { orderNumber, total, customerId },
      });
      expect(response.statusCode).toBe(201);
      return response.json().data as {
        id: string;
        customerId: string;
        total: number;
      };
    }

    it("filters orders by customerId via query JSON", async () => {
      const server = await buildTestServer();
      const customerA = await createCustomer(server, "Customer A");
      const customerB = await createCustomer(server, "Customer B");
      await createOrder(server, customerA.id, "ORD-A1", 10);
      await createOrder(server, customerA.id, "ORD-A2", 20);
      await createOrder(server, customerB.id, "ORD-B1", 30);

      const query = encodeURIComponent(
        JSON.stringify({
          filter: [
            { field: "customerId", operator: "==", value: customerA.id },
          ],
        }),
      );

      const response = await server.inject({
        method: "GET",
        url: `/api/order?query=${query}`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const items = response.json().data.items;
      expect(items).toHaveLength(2);
      expect(
        items.every(
          (item: { customerId: string }) => item.customerId === customerA.id,
        ),
      ).toBe(true);
    });

    it("sorts orders by total descending", async () => {
      const server = await buildTestServer();
      const customer = await createCustomer(server);
      await createOrder(server, customer.id, "ORD-LOW", 5);
      await createOrder(server, customer.id, "ORD-HIGH", 50);
      await createOrder(server, customer.id, "ORD-MID", 25);

      const query = encodeURIComponent(
        JSON.stringify({
          sort: [{ field: "total", direction: "desc" }],
        }),
      );

      const response = await server.inject({
        method: "GET",
        url: `/api/order?query=${query}`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const totals = response
        .json()
        .data.items.map((item: { total: number }) => item.total);
      expect(totals).toEqual([50, 25, 5]);
    });

    it("paginates filtered results with legacy limit and cursor", async () => {
      const server = await buildTestServer();
      const customer = await createCustomer(server);
      await createOrder(server, customer.id, "ORD-1", 1);
      await createOrder(server, customer.id, "ORD-2", 2);
      await createOrder(server, customer.id, "ORD-3", 3);

      const firstPage = await server.inject({
        method: "GET",
        url: "/api/order?limit=2",
        headers: authHeaders,
      });
      expect(firstPage.statusCode).toBe(200);
      const firstBody = firstPage.json().data;
      expect(firstBody.items).toHaveLength(2);
      expect(firstBody.nextCursor).toBeTruthy();

      const secondPage = await server.inject({
        method: "GET",
        url: `/api/order?limit=2&cursor=${firstBody.nextCursor}`,
        headers: authHeaders,
      });
      expect(secondPage.statusCode).toBe(200);
      expect(secondPage.json().data.items).toHaveLength(1);
      expect(secondPage.json().data.nextCursor).toBeNull();
    });

    it("returns 400 for invalid query configuration", async () => {
      const server = await buildTestServer();
      const response = await server.inject({
        method: "GET",
        url: `/api/order?query=${encodeURIComponent('{"filter":[{"field":"tenantId","operator":"==","value":"tenant_a"}]}')}`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("QUERY_VALIDATION_ERROR");
    });

    it("allows viewer to list via query engine", async () => {
      const server = await buildTestServer({
        accessProfile: {
          platformRole: null,
          tenants: { tenant_a: ["viewer"] },
        },
      });

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/customer",
        headers: authHeaders,
      });

      expect(listResponse.statusCode).toBe(200);
    });
  });
});
