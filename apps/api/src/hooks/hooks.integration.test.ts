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
  createFirestoreAdminPushTokenRepository: vi.fn(),
  createSendUserNotificationWithPush: vi.fn(() => vi.fn(async () => undefined)),
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
  createFirestoreAdminWorkloadRunRepository: vi.fn(() => ({
    getById: vi.fn(async () => null),
    upsert: vi.fn(),
    update: vi.fn(),
    listByWorkloadId: vi.fn(async () => ({ items: [], nextCursor: null })),
    listByRootRunId: vi.fn(async () => []),
    countByWorkloadIdSince: vi.fn(async () => ({
      success: 0,
      error: 0,
      timeout: 0,
      running: 0,
      cancelled: 0,
    })),
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

async function defineLoanEntity(
  server: Awaited<ReturnType<typeof buildTestServer>>,
) {
  const response = await server.inject({
    method: "POST",
    url: "/api/entity-definitions",
    headers: authHeaders,
    payload: {
      name: "loan",
      label: "Loans",
      fields: [
        { name: "amount", type: "number", required: true },
        { name: "commitmentAmount", type: "number", required: false },
        { name: "status", type: "string", required: false },
      ],
    },
  });
  expect(response.statusCode).toBe(201);
}

describe("data hooks integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    authState.tenantId = "tenant_a";
  });

  it("runs a dynamic beforeCreate hook that mutates the record", async () => {
    const server = await buildTestServer();
    await defineLoanEntity(server);

    const createHook = await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Set pending status",
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
      },
    });
    expect(createHook.statusCode).toBe(201);

    const createRecord = await server.inject({
      method: "POST",
      url: "/api/loan",
      headers: authHeaders,
      payload: { amount: 500 },
    });

    expect(createRecord.statusCode).toBe(201);
    expect(createRecord.json().data.status).toBe("Pending");
  });

  it("evaluates a conditional expression-driven hook", async () => {
    const server = await buildTestServer();
    await defineLoanEntity(server);

    const createHook = await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Complete when funded",
        entity: "loan",
        phase: "before",
        trigger: { operation: "create" },
        condition: {
          field: "amount",
          operator: ">=",
          value: { kind: "field", source: "current", path: "commitmentAmount" },
        },
        actions: [
          {
            type: "setField",
            field: "status",
            value: { kind: "literal", value: "COMPLETE" },
          },
        ],
      },
    });
    expect(createHook.statusCode).toBe(201);

    const funded = await server.inject({
      method: "POST",
      url: "/api/loan",
      headers: authHeaders,
      payload: { amount: 100, commitmentAmount: 100 },
    });
    expect(funded.statusCode).toBe(201);
    expect(funded.json().data.status).toBe("COMPLETE");

    const underfunded = await server.inject({
      method: "POST",
      url: "/api/loan",
      headers: authHeaders,
      payload: { amount: 50, commitmentAmount: 100 },
    });
    expect(underfunded.statusCode).toBe(201);
    expect(underfunded.json().data.status).toBeUndefined();
  });

  it("lists and deletes data hooks", async () => {
    const server = await buildTestServer();
    await defineLoanEntity(server);

    const createHook = await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Temp hook",
        entity: "loan",
        phase: "after",
        trigger: { operation: "update" },
        actions: [
          {
            type: "sendNotification",
            message: { kind: "literal", value: "changed" },
          },
        ],
      },
    });
    expect(createHook.statusCode).toBe(201);
    const hookId = createHook.json().data.id as string;

    const listed = await server.inject({
      method: "GET",
      url: "/api/data-hooks?entity=loan",
      headers: authHeaders,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data.items).toHaveLength(1);

    const deleted = await server.inject({
      method: "DELETE",
      url: `/api/data-hooks/${hookId}`,
      headers: authHeaders,
    });
    expect(deleted.statusCode).toBe(200);

    const listedAfter = await server.inject({
      method: "GET",
      url: "/api/data-hooks?entity=loan",
      headers: authHeaders,
    });
    expect(listedAfter.json().data.items).toHaveLength(0);
  });

  it("runs payment before hooks on direct create", async () => {
    const server = await buildTestServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/entity-definitions",
      headers: authHeaders,
      payload: {
        name: "payment",
        label: "Payments",
        fields: [
          { name: "loanId", type: "string", required: false },
          { name: "note", type: "string", required: false },
        ],
      },
    });
    expect(response.statusCode).toBe(201);

    await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Tag payment",
        entity: "payment",
        phase: "before",
        trigger: { operation: "create" },
        actions: [
          {
            type: "setField",
            field: "note",
            value: { kind: "literal", value: "from payment hook" },
          },
        ],
      },
    });

    const created = await server.inject({
      method: "POST",
      url: "/api/payment",
      headers: authHeaders,
      payload: { loanId: "loan_1" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().data.note).toBe("from payment hook");
  });

  it("chains hooks when chainHooks is enabled on the source hook", async () => {
    const server = await buildTestServer();

    const defineEntity = async (
      name: string,
      fields: Array<{ name: string; type: string; required?: boolean }>,
    ) => {
      const response = await server.inject({
        method: "POST",
        url: "/api/entity-definitions",
        headers: authHeaders,
        payload: { name, label: name, fields },
      });
      expect(response.statusCode).toBe(201);
    };

    await defineEntity("loan", [
      { name: "amount", type: "number", required: true },
    ]);
    await defineEntity("payment", [
      { name: "loanId", type: "string", required: false },
      { name: "note", type: "string", required: false },
    ]);

    await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Tag payment",
        entity: "payment",
        phase: "before",
        trigger: { operation: "create" },
        actions: [
          {
            type: "setField",
            field: "note",
            value: { kind: "literal", value: "from payment hook" },
          },
        ],
      },
    });

    await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Create payment",
        entity: "loan",
        phase: "after",
        trigger: { operation: "create" },
        chainHooks: true,
        actions: [
          {
            type: "createRecord",
            entity: "payment",
            data: {
              loanId: { kind: "field", source: "current", path: "id" },
            },
          },
        ],
      },
    });

    const listedLoanHooks = await server.inject({
      method: "GET",
      url: "/api/data-hooks?entity=loan",
      headers: authHeaders,
    });
    const loanHook = listedLoanHooks
      .json()
      .data.items.find(
        (item: { name?: string }) => item.name === "Create payment",
      );
    expect(loanHook?.chainHooks).toBe(true);
    expect(loanHook?.execution).toBeUndefined();

    const createLoan = await server.inject({
      method: "POST",
      url: "/api/loan",
      headers: authHeaders,
      payload: { amount: 100 },
    });
    expect(createLoan.statusCode).toBe(201);
    const loanId = createLoan.json().data.id as string;

    const payments = await server.inject({
      method: "GET",
      url: "/api/payment?limit=10",
      headers: authHeaders,
    });
    expect(payments.statusCode).toBe(200);
    expect(payments.json().data.items.length).toBeGreaterThan(0);
    const payment = payments
      .json()
      .data.items.find((item: { loanId?: string }) => item.loanId === loanId);
    expect(payment?.loanId).toBe(loanId);
    expect(payment?.note).toBe("from payment hook");
  });

  it("does not chain hooks when chainHooks is disabled", async () => {
    const server = await buildTestServer();

    const defineEntity = async (
      name: string,
      fields: Array<{ name: string; type: string; required?: boolean }>,
    ) => {
      const response = await server.inject({
        method: "POST",
        url: "/api/entity-definitions",
        headers: authHeaders,
        payload: { name, label: name, fields },
      });
      expect(response.statusCode).toBe(201);
    };

    await defineEntity("loan", [
      { name: "amount", type: "number", required: true },
    ]);
    await defineEntity("payment", [
      { name: "loanId", type: "string", required: false },
      { name: "note", type: "string", required: false },
    ]);

    await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Tag payment",
        entity: "payment",
        phase: "before",
        trigger: { operation: "create" },
        actions: [
          {
            type: "setField",
            field: "note",
            value: { kind: "literal", value: "from payment hook" },
          },
        ],
      },
    });

    await server.inject({
      method: "POST",
      url: "/api/data-hooks",
      headers: authHeaders,
      payload: {
        name: "Create payment",
        entity: "loan",
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "createRecord",
            entity: "payment",
            data: {
              loanId: { kind: "field", source: "current", path: "id" },
            },
          },
        ],
      },
    });

    const createLoan = await server.inject({
      method: "POST",
      url: "/api/loan",
      headers: authHeaders,
      payload: { amount: 100 },
    });
    expect(createLoan.statusCode).toBe(201);
    const loanId = createLoan.json().data.id as string;

    const payments = await server.inject({
      method: "GET",
      url: "/api/payment?limit=10",
      headers: authHeaders,
    });
    expect(payments.statusCode).toBe(200);
    expect(payments.json().data.items.length).toBeGreaterThan(0);
    const payment = payments
      .json()
      .data.items.find((item: { loanId?: string }) => item.loanId === loanId);
    expect(payment?.loanId).toBe(loanId);
    expect(payment?.note).toBeUndefined();
  });
});
