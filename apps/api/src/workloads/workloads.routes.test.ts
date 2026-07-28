import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  WorkloadActionNotAllowedError,
  WorkloadNotFoundError,
  type WorkloadController,
} from "./workload-controller.js";

vi.mock("../auth/authenticate-request.js", () => ({
  createAuthenticatePreHandler: () => async () => undefined,
}));

vi.mock("../admin/require-superadmin.js", () => ({
  createRequireSuperAdmin: () => async () => undefined,
}));

import { workloadsRoutes } from "./workloads.routes.js";

const baseWorkload = {
  id: "queue:hook-jobs",
  kind: "cloudTasksQueue" as const,
  source: "system" as const,
  displayName: "Hook Jobs",
  description: "hooks",
  actions: ["pause", "resume"] as Array<"pause" | "resume">,
  state: {
    status: "running" as const,
    live: {},
    fetchedAt: new Date().toISOString(),
  },
};

function createMockController(
  overrides: Partial<WorkloadController> = {},
): WorkloadController {
  return {
    listWorkloads: vi.fn(async () => []),
    getWorkload: vi.fn(async () => ({
      ...baseWorkload,
      runStats: {
        success: 1,
        error: 0,
        timeout: 0,
        running: 0,
        cancelled: 0,
      },
    })),
    applyAction: vi.fn(async () => undefined),
    listRuns: vi.fn(async () => ({ items: [], nextCursor: null })),
    getRun: vi.fn(async () => ({
      id: "run-1",
      workloadId: "queue:hook-jobs",
      triggeredBy: "cloudTasks",
      triggerContext: {},
      startedAt: new Date().toISOString(),
      status: "success",
      metrics: {},
      artifactRefs: [],
    })),
    getRunLogs: vi.fn(async () => ({
      run: {
        id: "run-1",
        workloadId: "queue:hook-jobs",
        triggeredBy: "cloudTasks" as const,
        triggerContext: {},
        startedAt: new Date().toISOString(),
        status: "success" as const,
        metrics: {},
        artifactRefs: [],
        logExcerpt: ["line-1"],
      },
      logEntries: [],
      logExcerpt: ["line-1"],
      cloudLoggingUrl: "https://console.cloud.google.com/logs",
    })),
    getRunTrace: vi.fn(async () => []),
    ...overrides,
  } as WorkloadController;
}

describe("workloadsRoutes", () => {
  let controller: WorkloadController;

  beforeEach(() => {
    controller = createMockController();
  });

  async function buildApp() {
    const app = Fastify();
    await app.register(workloadsRoutes, {
      firebaseAdminConfig: { projectId: "demo" },
      permissionDeps: {} as never,
      controller,
    });
    await app.ready();
    return app;
  }

  it("lists workloads", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/admin/workloads" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, workloads: [] });
    await app.close();
  });

  it("returns workload detail with stats24h", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/admin/workloads/queue%3Ahook-jobs",
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.workload.id).toBe("queue:hook-jobs");
    expect(body.stats24h.success).toBe(1);
    await app.close();
  });

  it("returns 404 for missing workload", async () => {
    controller.getWorkload = vi.fn(async () => null);
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/admin/workloads/missing",
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("returns 400 for disallowed action", async () => {
    controller.applyAction = vi.fn(async () => {
      throw new WorkloadActionNotAllowedError("queue:hook-jobs", "runNow");
    });
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/admin/workloads/queue%3Ahook-jobs/actions/runNow",
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("applies pause action and returns refreshed workload", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/admin/workloads/queue%3Ahook-jobs/actions/pause",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
    expect(response.json().workload.id).toBe("queue:hook-jobs");
    expect(controller.applyAction).toHaveBeenCalledWith(
      "queue:hook-jobs",
      "pause",
      undefined,
    );
    await app.close();
  });

  it("lists runs and returns excerpt logs when cloud logging empty", async () => {
    const app = await buildApp();
    const runs = await app.inject({
      method: "GET",
      url: "/admin/workloads/queue%3Ahook-jobs/runs",
    });
    expect(runs.statusCode).toBe(200);
    expect(runs.json()).toEqual({ ok: true, items: [], nextCursor: null });

    const logs = await app.inject({
      method: "GET",
      url: "/admin/workloads/queue%3Ahook-jobs/runs/run-1/logs?tail=50",
    });
    expect(logs.statusCode).toBe(200);
    expect(logs.json().source).toBe("excerpt");
    expect(logs.json().entries[0].message).toBe("line-1");
    await app.close();
  });

  it("returns 502 when GCP adapter fails", async () => {
    controller.listWorkloads = vi.fn(async () => {
      throw new Error("GCP unavailable");
    });
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/admin/workloads" });
    expect(response.statusCode).toBe(502);
    await app.close();
  });

  it("returns 404 from WorkloadNotFoundError on action", async () => {
    controller.applyAction = vi.fn(async () => {
      throw new WorkloadNotFoundError("missing");
    });
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/admin/workloads/missing/actions/pause",
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
