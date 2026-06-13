import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRoleCatalog } from "@repo/rbac";
import { createInMemoryAiJobRepository } from "@repo/firestore-converters";

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

  beforeEach(() => {
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
      getRoleCatalog: async () => buildRoleCatalog([]),
      getUserAccessProfile: async () => ({
        platformRole: "superadmin" as const,
        tenants: { tenant_a: ["admin"] },
      }),
      skipPlatformRoleSeed: true,
      skipPlatformTenantSeed: true,
    });
  }

  it("creates a chat job and returns the job id", async () => {
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
    const body = response.json() as { data: { jobId: string } };
    expect(body.data.jobId).toMatch(/^aijob_/);

    const job = await aiJobRepository.getById("tenant_a", body.data.jobId);
    expect(job?.status).toBe("completed");
    expect(job?.output).toEqual({ answer: "mock answer" });

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
});
