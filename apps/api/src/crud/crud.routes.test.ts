import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog, type UserAccessProfile } from "@repo/rbac";

import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";
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
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache: mockCreateInMemoryListSnapshotCache,
}));

import { buildServer } from "../server.js";

function createInMemoryRepositories() {
  return createInMemoryCrudRuntime({ withTestEntities: true });
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

  describe("Widget", () => {
    it("creates a valid record", async () => {
      const server = await buildTestServer();
      const response = await server.inject({
        method: "POST",
        url: "/api/widget",
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
        url: "/api/widget",
        headers: authHeaders,
        payload: { email: "missing-name@example.com" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        data: null,
        error: { code: "VALIDATION_ERROR" },
      });
    });

    it("ignores client-provided tenantId on create", async () => {
      const server = await buildTestServer();
      const response = await server.inject({
        method: "POST",
        url: "/api/widget",
        headers: authHeaders,
        payload: {
          name: "Jane Doe",
          tenantId: "tenant_evil",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().data.tenantId).toBe("tenant_a");
    });

    it("finds records by search after create persists token mirrors", async () => {
      const server = await buildTestServer();

      const createResponse = await server.inject({
        method: "POST",
        url: "/api/widget",
        headers: authHeaders,
        payload: { name: "UniqueSearchNeedle", email: "needle@example.com" },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json().data;

      const searchResponse = await server.inject({
        method: "GET",
        url: "/api/widget?search=unique&limit=10",
        headers: authHeaders,
      });

      expect(searchResponse.statusCode).toBe(200);
      expect(searchResponse.json().data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: created.id,
            name: "UniqueSearchNeedle",
          }),
        ]),
      );
    });

    it("lists, gets, updates, and deletes a record", async () => {
      const server = await buildTestServer();

      const createResponse = await server.inject({
        method: "POST",
        url: "/api/widget",
        headers: authHeaders,
        payload: { name: "List Me" },
      });
      const created = createResponse.json().data;

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/widget?limit=10",
        headers: authHeaders,
      });
      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json().data.items).toHaveLength(1);

      const getResponse = await server.inject({
        method: "GET",
        url: `/api/widget/${created.id}`,
        headers: authHeaders,
      });
      expect(getResponse.statusCode).toBe(200);
      expect(getResponse.json().data.id).toBe(created.id);

      const updateResponse = await server.inject({
        method: "PUT",
        url: `/api/widget/${created.id}`,
        headers: authHeaders,
        payload: { email: "updated@example.com" },
      });
      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.json().data.email).toBe("updated@example.com");
      expect(updateResponse.json().data.updatedAt).not.toBe(created.updatedAt);

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/api/widget/${created.id}`,
        headers: authHeaders,
      });
      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.json().data).toEqual({ deleted: true });

      const missingResponse = await server.inject({
        method: "GET",
        url: `/api/widget/${created.id}`,
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
        url: "/api/widget",
        headers: authHeaders,
        payload: { name: "Tenant A Only" },
      });
      const created = createResponse.json().data;

      authState.tenantId = "tenant_b";
      const crossTenantResponse = await server.inject({
        method: "GET",
        url: `/api/widget/${created.id}`,
        headers: authHeaders,
      });

      expect(crossTenantResponse.statusCode).toBe(404);
      expect(crossTenantResponse.json().error.code).toBe("NOT_FOUND");
    });
  });

  describe("TestItem", () => {
    async function createWidget(
      server: Awaited<ReturnType<typeof buildTestServer>>,
    ) {
      const response = await server.inject({
        method: "POST",
        url: "/api/widget",
        headers: authHeaders,
        payload: { name: "TestItem Widget" },
      });
      expect(response.statusCode).toBe(201);
      return response.json().data as { id: string };
    }

    it("creates and validates testItem records", async () => {
      const server = await buildTestServer();
      const widget = await createWidget(server);
      const response = await server.inject({
        method: "POST",
        url: "/api/testItem",
        headers: authHeaders,
        payload: {
          name: "PRJ-1001",
          budget: 42.5,
          widgetId: widget.id,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().data).toMatchObject({
        name: "PRJ-1001",
        budget: 42.5,
        widgetId: widget.id,
        tenantId: "tenant_a",
        isCompleted: false,
      });
    });

    it("rejects invalid testItem payloads", async () => {
      const server = await buildTestServer();
      const response = await server.inject({
        method: "POST",
        url: "/api/testItem",
        headers: authHeaders,
        payload: { name: "PRJ-1002" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects testItems referencing missing widgets", async () => {
      const server = await buildTestServer();
      const response = await server.inject({
        method: "POST",
        url: "/api/testItem",
        headers: authHeaders,
        payload: {
          name: "PRJ-1003",
          budget: 10,
          widgetId: "missing_widget",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("RELATION_NOT_FOUND");
    });

    it("blocks deleting a widget referenced by testItems", async () => {
      const server = await buildTestServer();
      const widget = await createWidget(server);
      const testItemResponse = await server.inject({
        method: "POST",
        url: "/api/testItem",
        headers: authHeaders,
        payload: {
          name: "PRJ-1004",
          budget: 15,
          widgetId: widget.id,
        },
      });
      expect(testItemResponse.statusCode).toBe(201);

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/api/widget/${widget.id}`,
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
        url: "/api/widget?limit=10",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 when tenantId claim is missing", async () => {
      authState.tenantId = "";
      const server = await buildTestServer();
      const response = await server.inject({
        method: "GET",
        url: "/api/widget?limit=10",
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
        url: "/api/widget",
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
        url: "/api/widget?limit=10",
        headers: authHeaders,
      });
      expect(listResponse.statusCode).toBe(200);

      const createResponse = await server.inject({
        method: "POST",
        url: "/api/widget",
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
        url: "/api/widget",
        headers: authHeaders,
        payload: { name: "Editor Record" },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json().data;

      const updateResponse = await server.inject({
        method: "PUT",
        url: `/api/widget/${created.id}`,
        headers: authHeaders,
        payload: { email: "editor@example.com" },
      });
      expect(updateResponse.statusCode).toBe(200);

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/api/widget/${created.id}`,
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
        url: "/api/widget",
        headers: authHeaders,
        payload: { name: "Superadmin Record" },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe("Superadmin tenant override", () => {
    it("creates records in the query tenant for superadmin", async () => {
      const server = await buildTestServer({
        accessProfile: {
          platformRole: "superadmin",
          tenants: {},
        },
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/widget?tenantId=tenant_b",
        headers: authHeaders,
        payload: { name: "Tenant B Organization" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().data.tenantId).toBe("tenant_b");
    });

    it("ignores query tenant override for non-superadmin users", async () => {
      const server = await buildTestServer();

      const response = await server.inject({
        method: "POST",
        url: "/api/widget?tenantId=tenant_b",
        headers: authHeaders,
        payload: { name: "Still Tenant A" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().data.tenantId).toBe("tenant_a");
    });
  });

  describe("Tenant isolation", () => {
    it("returns only records for the authenticated tenant", async () => {
      const server = await buildTestServer();
      const createResponse = await server.inject({
        method: "POST",
        url: "/api/widget",
        headers: authHeaders,
        payload: { name: "Tenant A Organization" },
      });
      expect(createResponse.statusCode).toBe(201);

      authState.tenantId = "tenant_b";
      accessProfileState.tenants = { tenant_b: ["admin"] };

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/widget?limit=10",
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
        url: "/api/widget",
        headers: authHeaders,
        payload: { name: "Created in tenant A" },
      });
      expect(createInTenantA.statusCode).toBe(201);

      authState.tenantId = "tenant_b";

      const createInTenantB = await server.inject({
        method: "POST",
        url: "/api/widget",
        headers: authHeaders,
        payload: { name: "Blocked in tenant B" },
      });
      expect(createInTenantB.statusCode).toBe(403);
      expect(createInTenantB.json().error.code).toBe("FORBIDDEN");
    });
  });

  describe("Query Engine", () => {
    async function createWidget(
      server: Awaited<ReturnType<typeof buildTestServer>>,
      name = "Query Widget",
    ) {
      const response = await server.inject({
        method: "POST",
        url: "/api/widget",
        headers: authHeaders,
        payload: { name },
      });
      expect(response.statusCode).toBe(201);
      return response.json().data as { id: string };
    }

    async function createTestItem(
      server: Awaited<ReturnType<typeof buildTestServer>>,
      widgetId: string,
      name: string,
      budget: number,
    ) {
      const response = await server.inject({
        method: "POST",
        url: "/api/testItem",
        headers: authHeaders,
        payload: { name, budget, widgetId },
      });
      expect(response.statusCode).toBe(201);
      return response.json().data as {
        id: string;
        widgetId: string;
        budget: number;
      };
    }

    it("filters testItems by widgetId via query JSON", async () => {
      const server = await buildTestServer();
      const widgetA = await createWidget(server, "Widget A");
      const widgetB = await createWidget(server, "Widget B");
      await createTestItem(server, widgetA.id, "PRJ-A1", 10);
      await createTestItem(server, widgetA.id, "PRJ-A2", 20);
      await createTestItem(server, widgetB.id, "PRJ-B1", 30);

      const query = encodeURIComponent(
        JSON.stringify({
          filter: [
            {
              field: "widgetId",
              operator: "==",
              value: widgetA.id,
            },
          ],
        }),
      );

      const response = await server.inject({
        method: "GET",
        url: `/api/testItem?query=${query}`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const items = response.json().data.items;
      expect(items).toHaveLength(2);
      expect(
        items.every(
          (item: { widgetId: string }) => item.widgetId === widgetA.id,
        ),
      ).toBe(true);
    });

    it("sorts testItems by budget descending", async () => {
      const server = await buildTestServer();
      const widget = await createWidget(server);
      await createTestItem(server, widget.id, "PRJ-LOW", 5);
      await createTestItem(server, widget.id, "PRJ-HIGH", 50);
      await createTestItem(server, widget.id, "PRJ-MID", 25);

      const query = encodeURIComponent(
        JSON.stringify({
          sort: [{ field: "budget", direction: "desc" }],
        }),
      );

      const response = await server.inject({
        method: "GET",
        url: `/api/testItem?query=${query}`,
        headers: authHeaders,
      });

      expect(response.statusCode).toBe(200);
      const budgets = response
        .json()
        .data.items.map((item: { budget: number }) => item.budget);
      expect(budgets).toEqual([50, 25, 5]);
    });

    it("paginates filtered results with legacy limit and cursor", async () => {
      const server = await buildTestServer();
      const widget = await createWidget(server);
      await createTestItem(server, widget.id, "PRJ-1", 1);
      await createTestItem(server, widget.id, "PRJ-2", 2);
      await createTestItem(server, widget.id, "PRJ-3", 3);

      const firstPage = await server.inject({
        method: "GET",
        url: "/api/testItem?limit=2",
        headers: authHeaders,
      });
      expect(firstPage.statusCode).toBe(200);
      const firstBody = firstPage.json().data;
      expect(firstBody.items).toHaveLength(2);
      expect(firstBody.nextCursor).toBeTruthy();

      const secondPage = await server.inject({
        method: "GET",
        url: `/api/testItem?limit=2&cursor=${firstBody.nextCursor}`,
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
        url: `/api/testItem?query=${encodeURIComponent('{"filter":[{"field":"tenantId","operator":"==","value":"tenant_a"}]}')}`,
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
        url: "/api/widget?limit=10",
        headers: authHeaders,
      });

      expect(listResponse.statusCode).toBe(200);
    });
  });
});
