import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearHookRegistry } from "@repo/hooks";
import { clearModuleRegistries } from "@repo/modules";

import { createInMemoryJoinCollectionRepository } from "../repositories/in-memory-join-collection-repository.js";
import { createInMemoryCrudRuntime } from "../test/in-memory-entity-runtime.js";
import { mockCreateFirestoreEntityQueryExecutor } from "../test/mock-firestore-query-executor.js";
import {
  buildInMemoryListSnapshotInvalidationPrefix,
  mockCreateInMemoryListSnapshotCache,
} from "../test/mock-in-memory-list-snapshot-cache.js";
import { buildServer } from "../server.js";

const authState = {
  uid: "user_123",
  tenantId: "tenant_a",
};

const authHeaders = {
  authorization: "Bearer fake-token",
  "x-firebase-appcheck": "fake-appcheck",
};

vi.mock("@repo/gcp-firebase", () => ({
  configureIndexProvisioningQueue: vi.fn(),
  verifyFirebaseIdToken: vi.fn(async () => ({
    uid: authState.uid,
    tenantId: authState.tenantId,
    email: "demo@example.com",
  })),
  verifyFirebaseAppCheckToken: vi.fn(async () => ({ appId: "demo-app-id" })),
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
    providerData: user.providerData,
    metadata: user.metadata,
  })),
  createFirestoreAdminRegisteredUserRepository: vi.fn(),
  createFirestoreAdminPlatformRoleRepository: vi.fn(),
  createFirestoreAdminTenantRepository: vi.fn(),
  createFirestoreAdminGmailConnectionRepository: vi.fn(() => ({})),
  createFirestoreAdminEmailMatchBindingRepository: vi.fn(() => ({})),
  createFirestoreAdminEmailIngestJobRepository: vi.fn(() => ({
    listRecent: vi.fn(async () => []),
    get: vi.fn(async () => null),
    create: vi.fn(),
    appendStep: vi.fn(),
    complete: vi.fn(),
  })),
  createFirestoreAdminJoinCollectionRepository: vi.fn(),
  createFirestoreAdminEntityRepository: vi.fn(),
  createFirestoreEntityQueryExecutor: mockCreateFirestoreEntityQueryExecutor,
  buildInMemoryListSnapshotInvalidationPrefix,
  createInMemoryListSnapshotCache: mockCreateInMemoryListSnapshotCache,
  createFirestoreAdminEntityDefinitionRepository: vi.fn(),
  createFirestoreAdminDataHookRepository: vi.fn(),
}));

async function buildTestServer() {
  const runtime = createInMemoryCrudRuntime();
  return buildServer({
    logger: false,
    repositories: runtime.repositories,
    queryExecutors: runtime.queryExecutors,
    joinRepository: createInMemoryJoinCollectionRepository(),
    getRoleCatalog: async () => buildRoleCatalog([]),
    getUserAccessProfile: async () => ({
      platformRole: null,
      tenants: { tenant_a: ["admin"] },
    }),
    skipPlatformRoleSeed: true,
    skipPlatformTenantSeed: true,
  });
}

async function defineEntity(
  server: Awaited<ReturnType<typeof buildTestServer>>,
  name: string,
) {
  const response = await server.inject({
    method: "POST",
    url: "/api/entity-definitions",
    headers: authHeaders,
    payload: {
      name,
      label: name,
      fields: [{ name: "status", type: "string", required: false }],
    },
  });
  expect(response.statusCode).toBe(201);
}

async function createHook(
  server: Awaited<ReturnType<typeof buildTestServer>>,
  payload: Record<string, unknown>,
) {
  const response = await server.inject({
    method: "POST",
    url: "/api/data-hooks",
    headers: authHeaders,
    payload,
  });
  expect(response.statusCode).toBe(201);
  return response.json().data;
}

describe("data hooks catalog integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    authState.tenantId = "tenant_a";
  });

  it("replaces the tenant hook catalog by entity+name", async () => {
    const server = await buildTestServer();
    await defineEntity(server, "loan");
    await defineEntity(server, "payment");

    await createHook(server, {
      name: "Set pending",
      entity: "loan",
      phase: "before",
      trigger: { operation: "create" },
      actions: [
        {
          type: "setField",
          field: "status",
          value: { kind: "literal", value: "Pending" },
        },
      ],
    });
    await createHook(server, {
      name: "Notify",
      entity: "loan",
      phase: "after",
      trigger: { operation: "create" },
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "created" },
        },
      ],
    });
    await createHook(server, {
      name: "Set pending",
      entity: "payment",
      phase: "before",
      trigger: { operation: "create" },
      actions: [
        {
          type: "setField",
          field: "status",
          value: { kind: "literal", value: "Pending" },
        },
      ],
    });

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/data-hooks/catalog",
      headers: authHeaders,
      payload: {
        kind: "data-hooks-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        dataHooks: [
          {
            name: "Set pending",
            entity: "loan",
            phase: "before",
            trigger: { operation: "create" },
            actions: [
              {
                type: "setField",
                field: "status",
                value: { kind: "literal", value: "Approved" },
              },
            ],
            enabled: true,
            order: 0,
          },
          {
            name: "New loan hook",
            entity: "loan",
            phase: "after",
            trigger: { operation: "update" },
            actions: [
              {
                type: "sendNotification",
                message: { kind: "literal", value: "updated" },
              },
            ],
            enabled: true,
            order: 1,
          },
        ],
      },
    });

    expect(replaceCatalog.statusCode).toBe(200);
    expect(replaceCatalog.json().data.counts).toEqual({
      created: 1,
      updated: 1,
      deleted: 2,
    });

    const list = await server.inject({
      method: "GET",
      url: "/api/data-hooks",
      headers: authHeaders,
    });
    const hooks = list.json().data.items as Array<{
      name: string;
      entity: string;
    }>;
    expect(hooks).toHaveLength(2);
    expect(
      hooks.some(
        (hook) => hook.entity === "loan" && hook.name === "New loan hook",
      ),
    ).toBe(true);
    expect(
      hooks.some(
        (hook) => hook.entity === "loan" && hook.name === "Set pending",
      ),
    ).toBe(true);
    expect(hooks.some((hook) => hook.entity === "payment")).toBe(false);
    expect(hooks.some((hook) => hook.name === "Notify")).toBe(false);
  });

  it("replaces only hooks for a scoped entity", async () => {
    const server = await buildTestServer();
    await defineEntity(server, "loan");
    await defineEntity(server, "payment");

    await createHook(server, {
      name: "Loan hook",
      entity: "loan",
      phase: "after",
      trigger: { operation: "create" },
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "loan" },
        },
      ],
    });
    await createHook(server, {
      name: "Payment hook",
      entity: "payment",
      phase: "after",
      trigger: { operation: "create" },
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "payment" },
        },
      ],
    });

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/data-hooks/catalog?entity=loan",
      headers: authHeaders,
      payload: {
        kind: "data-hooks-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        dataHooks: [
          {
            name: "Loan hook v2",
            entity: "loan",
            phase: "after",
            trigger: { operation: "create" },
            actions: [
              {
                type: "sendNotification",
                message: { kind: "literal", value: "loan v2" },
              },
            ],
            enabled: true,
            order: 0,
          },
        ],
      },
    });

    expect(replaceCatalog.statusCode).toBe(200);
    expect(replaceCatalog.json().data.counts).toEqual({
      created: 1,
      updated: 0,
      deleted: 1,
    });

    const list = await server.inject({
      method: "GET",
      url: "/api/data-hooks",
      headers: authHeaders,
    });
    const hooks = list.json().data.items as Array<{
      name: string;
      entity: string;
    }>;
    expect(hooks).toHaveLength(2);
    expect(
      hooks.some(
        (hook) => hook.entity === "loan" && hook.name === "Loan hook v2",
      ),
    ).toBe(true);
    expect(
      hooks.some(
        (hook) => hook.entity === "payment" && hook.name === "Payment hook",
      ),
    ).toBe(true);
  });

  it("rejects catalog hooks for unknown entities", async () => {
    const server = await buildTestServer();
    await defineEntity(server, "loan");

    const replaceCatalog = await server.inject({
      method: "PUT",
      url: "/api/data-hooks/catalog",
      headers: authHeaders,
      payload: {
        kind: "data-hooks-catalog",
        version: 1,
        exportedAt: new Date().toISOString(),
        dataHooks: [
          {
            name: "Bad hook",
            entity: "missing",
            phase: "after",
            trigger: { operation: "create" },
            actions: [
              {
                type: "sendNotification",
                message: { kind: "literal", value: "x" },
              },
            ],
            enabled: true,
            order: 0,
          },
        ],
      },
    });

    expect(replaceCatalog.statusCode).toBe(400);
    expect(replaceCatalog.json().error.message).toContain("missing");
  });
});
