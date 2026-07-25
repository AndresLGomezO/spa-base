import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import {
  createInMemoryAiChatSessionRepository,
  createInMemoryAiJobRepository,
  createInMemoryAiSpendRepository,
} from "@repo/firestore-converters";

import { createInMemoryTenantRepository } from "../test/mock-tenant-repository.js";
import { buildServer } from "../server.js";

vi.hoisted(() => {
  process.env.WORKER_SERVICE_URL = "http://127.0.0.1:3999";
  process.env.AI_TASKS_LOCAL_DISPATCH = "true";
});

const WORKER_URL = "http://127.0.0.1:3999";

vi.mock("@repo/gcp-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/gcp-firebase")>();
  return {
    ...actual,
    verifyFirebaseIdToken: vi.fn(async () => ({
      uid: authState.uid,
      tenantId: authState.tenantId,
      email: "demo@example.com",
    })),
    verifyFirebaseAppCheckToken: vi.fn(async () => ({ appId: "demo-app-id" })),
  };
});

const authState = {
  uid: "user_123",
  tenantId: "tenant_a",
};

describe("AI chat routes", () => {
  const aiJobRepository = createInMemoryAiJobRepository();
  const aiChatSessionRepository = createInMemoryAiChatSessionRepository();
  const aiSpendRepository = createInMemoryAiSpendRepository();
  const tenantRepository = createInMemoryTenantRepository();

  beforeEach(() => {
    aiSpendRepository.clear();
    void tenantRepository.update("tenant_a", { aiLimits: null });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith(WORKER_URL)) {
          const body = JSON.parse(String(init?.body ?? "{}")) as {
            jobId: string;
            tenantId: string;
          };
          await aiJobRepository.update(body.tenantId, body.jobId, {
            status: "completed",
            output: { answer: "mock answer" },
            error: null,
          });
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );
  });

  async function buildTestServer() {
    return buildServer({
      logger: false,
      repositories: {},
      aiJobRepository,
      aiChatSessionRepository,
      aiSpendRepository,
      tenantRepository,
      getRoleCatalog: async () => buildRoleCatalog([]),
      getUserAccessProfile: async () => ({
        platformRole: "superadmin" as const,
        tenants: { tenant_a: ["admin"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });
  }

  it("creates a chat job and returns the job id and session id", async () => {
    const server = await buildTestServer();
    await server.ready();

    const response = await server.inject({
      method: "POST",
      url: "/api/ai/chat",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
      payload: { question: "What is ESP?" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { jobId: string; sessionId: string };
    };
    expect(body.data.jobId).toMatch(/^aijob_/);
    expect(body.data.sessionId).toMatch(/^aisess_/);

    const job = await aiJobRepository.getById("tenant_a", body.data.jobId);
    expect(job?.status).toBe("completed");
    expect(job?.output).toEqual({ answer: "mock answer" });
    expect(job?.input).toMatchObject({
      question: "What is ESP?",
      sessionId: body.data.sessionId,
    });

    await server.close();
  });

  it("returns job status for polling", async () => {
    const server = await buildTestServer();
    await server.ready();

    const created = await aiJobRepository.create("tenant_a", {
      feature: "chat",
      input: { question: "hello" },
      requestedBy: authState.uid,
      permission: "ai.chat.run",
    });
    await aiJobRepository.update("tenant_a", created.id, {
      status: "completed",
      output: { answer: "hi" },
      error: null,
    });

    const response = await server.inject({
      method: "GET",
      url: `/api/ai/jobs/${created.id}`,
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { status: string; output: { answer: string } | null };
    };
    expect(body.data.status).toBe("completed");
    expect(body.data.output?.answer).toBe("hi");

    await server.close();
  });

  it("returns progress and draft for ui builder job polling", async () => {
    const server = await buildTestServer();
    await server.ready();

    const created = await aiJobRepository.create("tenant_a", {
      feature: "uiBuilder",
      input: {
        question: "Design a card list",
        entityName: "contract",
        surface: "list",
      },
      requestedBy: authState.uid,
      permission: "ai.uiBuilder.run",
    });
    await aiJobRepository.update("tenant_a", created.id, {
      status: "running",
      progress: {
        stepIndex: 2,
        totalSteps: 5,
        stepId: "list.layoutSkeleton:listItem",
        stepLabel: "Designing layout skeleton (listItem)",
        phase: "layout",
      },
      draft: {
        surface: "list",
        listViewType: "card",
        completedStepIds: ["list.selectViewType"],
        layoutTargets: {},
      },
    });

    const response = await server.inject({
      method: "GET",
      url: `/api/ai/jobs/${created.id}`,
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: {
        status: string;
        progress: { stepId: string; stepLabel: string } | null;
        draft: { listViewType: string; completedStepIds: string[] } | null;
      };
    };
    expect(body.data.status).toBe("running");
    expect(body.data.progress?.stepId).toBe("list.layoutSkeleton:listItem");
    expect(body.data.draft?.listViewType).toBe("card");
    expect(body.data.draft?.completedStepIds).toEqual(["list.selectViewType"]);

    await server.close();
  });

  it("rejects chat enqueue when tenant AI spend limit is reached", async () => {
    await tenantRepository.update("tenant_a", {
      aiLimits: { monthlyInputTokens: 10 },
    });
    const period = new Date().toISOString().slice(0, 7);
    await aiSpendRepository.incrementTenantPeriod("tenant_a", period, {
      inputTokens: 10,
      outputTokens: 0,
      estimatedCostUsd: 0,
    });

    const server = await buildTestServer();
    await server.ready();

    const response = await server.inject({
      method: "POST",
      url: "/api/ai/chat",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
      payload: { question: "What is ESP?" },
    });

    expect(response.statusCode).toBe(403);
    const body = response.json() as {
      error: { code: string; details?: { meter?: string } };
    };
    expect(body.error.code).toBe("ai.spend_limit");
    expect(body.error.details?.meter).toBe("monthlyInputTokens");

    await server.close();
  });

  it("returns spend status for the current period", async () => {
    const server = await buildTestServer();
    await server.ready();

    const response = await server.inject({
      method: "GET",
      url: "/api/ai/spend-status",
      headers: {
        authorization: "Bearer test-token",
        "x-firebase-appcheck": "test-app-check",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { period: string; blocked: boolean };
    };
    expect(body.data.period).toMatch(/^\d{4}-\d{2}$/);
    expect(body.data.blocked).toBe(false);

    await server.close();
  });
});
