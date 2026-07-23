import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { clearDynamicEntityRegistry } from "@repo/dynamic-entities";
import { clearEntityRegistry } from "@repo/entities";
import { clearHookRegistry } from "@repo/hooks";
import { clearModuleRegistries } from "@repo/modules";
import {
  createInMemoryAuditLogRepository,
  createInMemoryDataHookExecutionRepository,
  createInMemoryHookLogMessageRepository,
  createInMemoryIndexProvisionEventRepository,
  createInMemoryRequestPerfLogRepository,
} from "@repo/firestore-converters";

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
  createFirestoreAdminDataHookExecutionRepository: vi.fn(),
  createFirestoreAdminHookLogMessageRepository: vi.fn(),
  createFirestoreAdminRequestPerfLogRepository: vi.fn(),
  createFirestoreAdminAuditLogRepository: vi.fn(),
}));

async function buildTestServer() {
  const runtime = createInMemoryCrudRuntime();
  const now = Date.now();
  const minutesAgo = (minutes: number) =>
    new Date(now - minutes * 60 * 1000).toISOString();
  const auditLogRepository = createInMemoryAuditLogRepository();
  auditLogRepository.seed({
    id: "audit_1",
    tenantId: "tenant_a",
    action: "share.grant",
    entity: "deal",
    recordId: "deal_1",
    actorId: "user_123",
    timestamp: minutesAgo(180),
  });

  const hookLogMessageRepository = createInMemoryHookLogMessageRepository();
  await hookLogMessageRepository.create("tenant_a", {
    level: "info",
    message: "Origination date missing",
    hookId: "hook_1",
    entityName: "deal",
    timestamp: minutesAgo(200),
    meta: {
      hookId: "hook_1",
      hookName: "Notify deal",
      entityName: "deal",
      event: "deal.afterCreate",
      action: "sendNotification",
    },
  });

  const requestPerfLogRepository = createInMemoryRequestPerfLogRepository();
  await requestPerfLogRepository.create("tenant_a", {
    route: "/api/deal",
    method: "GET",
    statusCode: 200,
    rbacMs: 1,
    queryMs: 2,
    hooksMs: 3,
    totalMs: 10,
    timestamp: minutesAgo(220),
  });

  const indexProvisionEventRepository =
    createInMemoryIndexProvisionEventRepository();
  await indexProvisionEventRepository.create("tenant_a", {
    timestamp: minutesAgo(240),
    event: "creating",
    collection: "deal",
    tenantId: "tenant_a",
  });

  const hookExecutionRepository = createInMemoryDataHookExecutionRepository();
  await hookExecutionRepository.create("tenant_a", {
    hookId: "hook_running_sync",
    hookName: "Inline Hook",
    entityName: "deal",
    event: "deal.afterCreate",
    phase: "after",
    operation: "create",
    executionMode: "sync",
    status: "running",
    triggeredBy: { uid: "user_123" },
    startedAt: minutesAgo(5),
  });
  await hookExecutionRepository.create("tenant_a", {
    hookId: "hook_running_deferred",
    hookName: "Deferred Hook",
    entityName: "deal",
    event: "deal.afterCreate",
    phase: "after",
    operation: "create",
    executionMode: "deferred",
    status: "running",
    triggeredBy: { uid: "user_123" },
    startedAt: minutesAgo(10),
  });
  await hookExecutionRepository.create("tenant_a", {
    hookId: "hook_running_cloud",
    hookName: "Cloud Running Hook",
    entityName: "deal",
    event: "deal.afterCreate",
    phase: "after",
    operation: "create",
    executionMode: "queued",
    status: "running",
    triggeredBy: { uid: "user_123" },
    startedAt: minutesAgo(15),
  });
  await hookExecutionRepository.create("tenant_a", {
    hookId: "hook_pending",
    hookName: "Queued Hook",
    entityName: "deal",
    event: "deal.afterCreate",
    phase: "after",
    operation: "create",
    executionMode: "queued",
    status: "pending",
    triggeredBy: { uid: "user_123" },
    startedAt: minutesAgo(20),
  });
  await hookExecutionRepository.create("tenant_a", {
    hookId: "hook_done",
    hookName: "Completed Hook",
    entityName: "deal",
    event: "deal.afterCreate",
    phase: "after",
    operation: "create",
    executionMode: "sync",
    status: "success",
    triggeredBy: { uid: "user_123" },
    startedAt: minutesAgo(60),
    finishedAt: minutesAgo(59),
    durationMs: 1000,
    writesCreated: 24,
  });
  await hookExecutionRepository.create("tenant_a", {
    hookId: "hook_heavy",
    hookName: "Heavy Hook",
    entityName: "deal",
    event: "deal.afterCreate",
    phase: "after",
    operation: "create",
    executionMode: "sync",
    status: "success",
    triggeredBy: { uid: "user_123" },
    startedAt: minutesAgo(90),
    finishedAt: minutesAgo(88),
    durationMs: 2000,
    writesCreated: 50,
  });

  return {
    server: await buildServer({
      logger: false,
      repositories: runtime.repositories,
      queryExecutors: runtime.queryExecutors,
      joinRepository: createInMemoryJoinCollectionRepository(),
      auditLogRepository,
      hookLogMessageRepository,
      requestPerfLogRepository,
      indexProvisionEventRepository,
      hookExecutionRepository,
      getRoleCatalog: async () => buildRoleCatalog([]),
      getUserAccessProfile: async () => ({
        platformRole: null,
        tenants: { tenant_a: ["admin"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    }),
    auditLogRepository,
    hookLogMessageRepository,
    requestPerfLogRepository,
    hookExecutionRepository,
  };
}

describe("debug events integration", () => {
  beforeEach(() => {
    clearModuleRegistries();
    clearEntityRegistry();
    clearDynamicEntityRegistry();
    clearHookRegistry();
    authState.tenantId = "tenant_a";
  });

  it("returns merged debug events for admin users", async () => {
    const { server } = await buildTestServer();

    const response = await server.inject({
      method: "GET",
      url: "/api/debug/events?limit=20",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { items: Array<{ source: string; id: string }> };
    };
    const sources = new Set(body.data.items.map((item) => item.source));
    expect(sources.has("audit")).toBe(true);
    expect(sources.has("hookLog")).toBe(true);
    expect(sources.has("requestPerf")).toBe(true);
    expect(sources.has("indexProvision")).toBe(true);
  });

  it("returns hook execution live counts and active items first", async () => {
    const { server } = await buildTestServer();

    const response = await server.inject({
      method: "GET",
      url: "/api/debug/events?sources=hooks&limit=20",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: {
        items: Array<{ source: string; id: string; status?: string }>;
        hookExecutionLive?: {
          pending: number;
          running: number;
          queuedPending: number;
          inlineRunning: number;
          deferredRunning: number;
          cloudRunning: number;
        };
      };
    };
    expect(body.data.hookExecutionLive).toEqual({
      pending: 1,
      running: 3,
      queuedPending: 1,
      inlineRunning: 1,
      deferredRunning: 1,
      cloudRunning: 1,
    });
    expect(body.data.items[0]?.status).toBe("running");
    expect(body.data.items.some((item) => item.status === "pending")).toBe(
      true,
    );
    expect(body.data.items.some((item) => item.status === "success")).toBe(
      true,
    );
  });

  it("returns hook execution pagination cursor for hooks source", async () => {
    const { server } = await buildTestServer();

    const firstPage = await server.inject({
      method: "GET",
      url: "/api/debug/events?sources=hooks&limit=2",
      headers: authHeaders,
    });

    expect(firstPage.statusCode).toBe(200);
    const firstBody = firstPage.json() as {
      data: {
        items: Array<{ source: string; id: string; status?: string }>;
        nextCursor?: string | null;
      };
    };
    expect(firstBody.data.items).toHaveLength(2);
    expect(firstBody.data.nextCursor).toBeTruthy();

    const secondPage = await server.inject({
      method: "GET",
      url: `/api/debug/events?sources=hooks&limit=2&cursor=${encodeURIComponent(firstBody.data.nextCursor ?? "")}`,
      headers: authHeaders,
    });

    expect(secondPage.statusCode).toBe(200);
    const secondBody = secondPage.json() as {
      data: {
        items: Array<{ source: string; id: string; status?: string }>;
      };
    };
    expect(secondBody.data.items.length).toBeGreaterThan(0);

    const activeIdsOnFirstPage = firstBody.data.items
      .filter(
        (item) =>
          item.source === "hookExecution" &&
          (item.status === "running" || item.status === "pending"),
      )
      .map((item) => item.id);
    const secondPageIds = secondBody.data.items
      .filter((item) => item.source === "hookExecution")
      .map((item) => item.id);
    for (const id of activeIdsOnFirstPage) {
      expect(secondPageIds).not.toContain(id);
    }
  });

  it("filters hook executions by entityName and recordId", async () => {
    const { server, hookExecutionRepository } = await buildTestServer();
    const now = Date.now();
    const minutesAgo = (minutes: number) =>
      new Date(now - minutes * 60 * 1000).toISOString();

    await hookExecutionRepository.create(
      "tenant_a",
      {
        hookId: "hook_deal_a",
        hookName: "Deal A Hook",
        entityName: "deal",
        recordId: "deal_a",
        event: "deal.afterUpdate",
        phase: "after",
        operation: "update",
        executionMode: "sync",
        status: "success",
        triggeredBy: { uid: "user_123" },
        startedAt: minutesAgo(2),
        finishedAt: minutesAgo(1),
        durationMs: 50,
      },
      { id: "hookexec_deal_a" },
    );
    await hookExecutionRepository.create(
      "tenant_a",
      {
        hookId: "hook_deal_b",
        hookName: "Deal B Hook",
        entityName: "deal",
        recordId: "deal_b",
        event: "deal.afterUpdate",
        phase: "after",
        operation: "update",
        executionMode: "sync",
        status: "success",
        triggeredBy: { uid: "user_123" },
        startedAt: minutesAgo(3),
        finishedAt: minutesAgo(2),
        durationMs: 40,
      },
      { id: "hookexec_deal_b" },
    );

    const response = await server.inject({
      method: "GET",
      url: "/api/debug/events?sources=hooks&limit=50&entityName=deal&recordId=deal_a",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: {
        items: Array<{
          source: string;
          id: string;
          summary?: { recordId?: string; entityName?: string };
        }>;
      };
    };
    const hookItems = body.data.items.filter(
      (item) => item.source === "hookExecution",
    );
    expect(hookItems.some((item) => item.id === "hookexec_deal_a")).toBe(true);
    expect(hookItems.some((item) => item.id === "hookexec_deal_b")).toBe(false);
    expect(
      hookItems.every(
        (item) =>
          item.summary?.entityName === "deal" &&
          item.summary?.recordId === "deal_a",
      ),
    ).toBe(true);
  });

  it("rejects entityName without recordId", async () => {
    const { server } = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/debug/events?sources=hooks&entityName=deal",
      headers: authHeaders,
    });
    expect(response.statusCode).toBe(400);
  });

  it("filters hook executions by emailLedgerId", async () => {
    const { server, hookExecutionRepository } = await buildTestServer();
    const now = Date.now();
    const minutesAgo = (minutes: number) =>
      new Date(now - minutes * 60 * 1000).toISOString();

    await hookExecutionRepository.create(
      "tenant_a",
      {
        hookId: "hook_email_a",
        hookName: "Email A Hook",
        entityName: "financialItem",
        recordId: "fi_1",
        emailLedgerId: "email_ledger_a",
        event: "financialItem.afterEmail",
        phase: "after",
        operation: "email",
        executionMode: "sync",
        status: "success",
        triggeredBy: { uid: "user_123" },
        startedAt: minutesAgo(2),
        finishedAt: minutesAgo(1),
        durationMs: 50,
      },
      { id: "hookexec_email_a" },
    );
    await hookExecutionRepository.create(
      "tenant_a",
      {
        hookId: "hook_email_b",
        hookName: "Email B Hook",
        entityName: "financialItem",
        recordId: "fi_1",
        emailLedgerId: "email_ledger_b",
        event: "financialItem.afterEmail",
        phase: "after",
        operation: "email",
        executionMode: "sync",
        status: "success",
        triggeredBy: { uid: "user_123" },
        startedAt: minutesAgo(3),
        finishedAt: minutesAgo(2),
        durationMs: 40,
      },
      { id: "hookexec_email_b" },
    );

    const response = await server.inject({
      method: "GET",
      url: "/api/debug/events?sources=hooks&limit=50&emailLedgerId=email_ledger_a",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: {
        items: Array<{
          source: string;
          id: string;
          summary?: { emailLedgerId?: string };
        }>;
      };
    };
    const hookItems = body.data.items.filter(
      (item) => item.source === "hookExecution",
    );
    expect(hookItems.some((item) => item.id === "hookexec_email_a")).toBe(true);
    expect(hookItems.some((item) => item.id === "hookexec_email_b")).toBe(
      false,
    );
    expect(
      hookItems.every(
        (item) => item.summary?.emailLedgerId === "email_ledger_a",
      ),
    ).toBe(true);
  });

  it("returns hook execution summary aggregates", async () => {
    const { server } = await buildTestServer();

    const response = await server.inject({
      method: "GET",
      url: "/api/debug/hook-executions/summary",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: {
        hooks: Array<{
          hookId: string;
          executionCount: number;
          totalWritesCreated: number;
        }>;
      };
    };
    const heavy = body.data.hooks.find((item) => item.hookId === "hook_heavy");
    expect(heavy).toEqual(
      expect.objectContaining({
        executionCount: 1,
        totalWritesCreated: 50,
      }),
    );
  });

  it("returns index provision events when requested", async () => {
    const { server } = await buildTestServer();

    const response = await server.inject({
      method: "GET",
      url: "/api/debug/events?sources=indexProvision&limit=20",
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { items: Array<{ source: string; title: string }> };
    };
    expect(
      body.data.items.some((item) => item.source === "indexProvision"),
    ).toBe(true);
  });

  it("filters debug events by since/until time range", async () => {
    const { server } = await buildTestServer();
    const until = new Date().toISOString();
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const response = await server.inject({
      method: "GET",
      url: `/api/debug/events?sources=audit&limit=20&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`,
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { items: Array<{ source: string; id: string }> };
    };
    // Seeded audit is 180 minutes old, so it should be outside the 5m window.
    expect(body.data.items.some((item) => item.id === "audit_1")).toBe(false);

    const wideResponse = await server.inject({
      method: "GET",
      url: `/api/debug/events?sources=audit&limit=20&since=${encodeURIComponent(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())}&until=${encodeURIComponent(until)}`,
      headers: authHeaders,
    });
    expect(wideResponse.statusCode).toBe(200);
    const wideBody = wideResponse.json() as {
      data: { items: Array<{ source: string; id: string }> };
    };
    expect(wideBody.data.items.some((item) => item.id === "audit_1")).toBe(
      true,
    );
  });

  it("rejects invalid since/until query params", async () => {
    const { server } = await buildTestServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/debug/events?since=not-a-date",
      headers: authHeaders,
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns window summary for the selected source", async () => {
    const { server } = await buildTestServer();
    const until = new Date().toISOString();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const response = await server.inject({
      method: "GET",
      url: `/api/debug/events/summary?sources=audit&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`,
      headers: authHeaders,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: {
        source: string;
        total: number;
        scannedCount: number;
        truncated: boolean;
        statusCounts: Record<string, number>;
      };
    };
    expect(body.data.source).toBe("audit");
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(body.data.scannedCount).toBeGreaterThanOrEqual(1);
    expect(body.data.truncated).toBe(false);
  });
});
