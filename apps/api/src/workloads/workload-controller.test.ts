import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  createWorkloadController,
  WorkloadNotFoundError,
  WorkloadActionNotAllowedError,
} from "./workload-controller.js";
import type { WorkloadControllerDeps } from "./workload-controller.js";
import type { WorkloadRunRepository } from "@repo/workload-runs";

function mockRunRepository(): WorkloadRunRepository {
  return {
    getById: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({ id: "r1" }),
    update: vi.fn().mockResolvedValue({ id: "r1" }),
    listByWorkloadId: vi
      .fn()
      .mockResolvedValue({ items: [], nextCursor: null }),
    listByRootRunId: vi.fn().mockResolvedValue([]),
    countByWorkloadIdSince: vi.fn().mockResolvedValue({
      success: 5,
      error: 1,
      timeout: 0,
      running: 0,
      cancelled: 0,
    }),
  };
}

function buildDeps(overrides?: Partial<WorkloadControllerDeps>): WorkloadControllerDeps {
  return {
    cloudTasks: {
      getState: vi.fn().mockResolvedValue({ status: "running", live: {} }),
      pause: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined),
      listPendingTasks: vi.fn().mockResolvedValue([]),
    },
    scheduler: {
      getState: vi.fn().mockResolvedValue({ status: "running", live: {} }),
      pause: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined),
      runNow: vi.fn().mockResolvedValue(undefined),
    },
    pubsub: {
      getState: vi.fn().mockResolvedValue({ status: "running", live: {} }),
      pause: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn().mockResolvedValue(undefined),
    },
    scheduledHooks: {
      list: vi.fn().mockResolvedValue([]),
      setEnabled: vi.fn().mockResolvedValue(undefined),
    },
    workerRoutes: {
      list: vi.fn().mockReturnValue([]),
    },
    inProcess: {
      list: vi.fn().mockReturnValue([]),
    },
    cloudLogging: {
      listEntries: vi.fn().mockResolvedValue([]),
      buildLogUrl: vi.fn().mockReturnValue("https://example.com/logs"),
    },
    runs: mockRunRepository(),
    queueNameByEnvKey: {
      CLOUD_TASKS_QUEUE_NAME: "ai-jobs",
      HOOK_TASKS_QUEUE_NAME: "hook-jobs",
      GMAIL_TASKS_QUEUE_NAME: "gmail-jobs",
      AI_EMBED_TASKS_QUEUE_NAME: "ai-embed",
    },
    schedulerJobNameByResource: {
      "schedule-tick": "schedule-tick",
      "gmail-poll": "gmail-poll",
    },
    localMode: true,
    projectId: "test-project",
    ...overrides,
  };
}

describe("workloadController", () => {
  let deps: WorkloadControllerDeps;

  beforeEach(() => {
    deps = buildDeps();
  });

  describe("listWorkloads", () => {
    it("returns static registry workloads with state", async () => {
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads();
      expect(result.length).toBeGreaterThan(0);
      for (const w of result) {
        expect(w.state).toBeDefined();
        expect(w.state.fetchedAt).toBeDefined();
      }
    });

    it("filters by kind", async () => {
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads({ kind: ["cloudTasksQueue"] });
      for (const w of result) {
        expect(w.kind).toBe("cloudTasksQueue");
      }
    });

    it("filters by status", async () => {
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads({ status: "paused" });
      for (const w of result) {
        expect(w.state.status).toBe("paused");
      }
    });
  });

  describe("getWorkload", () => {
    it("returns null for unknown id", async () => {
      const controller = createWorkloadController(deps);
      const result = await controller.getWorkload("unknown:xyz");
      expect(result).toBeNull();
    });

    it("returns a static workload with run stats", async () => {
      const controller = createWorkloadController(deps);
      const result = await controller.getWorkload("queue:ai-jobs");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("queue:ai-jobs");
      expect(result?.runStats).toBeDefined();
    });
  });

  describe("applyAction", () => {
    it("throws WorkloadNotFoundError for unknown id", async () => {
      const controller = createWorkloadController(deps);
      await expect(
        controller.applyAction("unknown:xyz", "pause"),
      ).rejects.toThrow(WorkloadNotFoundError);
    });

    it("throws WorkloadActionNotAllowedError for invalid action", async () => {
      const controller = createWorkloadController(deps);
      await expect(
        controller.applyAction("queue:ai-jobs", "runNow"),
      ).rejects.toThrow(WorkloadActionNotAllowedError);
    });

    it("calls cloudTasks.pause for queue pause action", async () => {
      const controller = createWorkloadController(deps);
      await controller.applyAction("queue:ai-jobs", "pause");
      expect(deps.cloudTasks.pause).toHaveBeenCalledWith("ai-jobs");
    });

    it("calls cloudTasks.resume for queue resume action", async () => {
      const controller = createWorkloadController(deps);
      await controller.applyAction("queue:ai-jobs", "resume");
      expect(deps.cloudTasks.resume).toHaveBeenCalledWith("ai-jobs");
    });

    it("calls scheduler.pause for scheduler pause action", async () => {
      const controller = createWorkloadController(deps);
      await controller.applyAction("scheduler:schedule-tick", "pause");
      expect(deps.scheduler.pause).toHaveBeenCalledWith("schedule-tick");
    });

    it("calls scheduler.runNow for scheduler runNow action", async () => {
      const controller = createWorkloadController(deps);
      await controller.applyAction("scheduler:schedule-tick", "runNow");
      expect(deps.scheduler.runNow).toHaveBeenCalledWith("schedule-tick");
    });
  });

  describe("listRuns", () => {
    it("delegates to runs repository", async () => {
      const controller = createWorkloadController(deps);
      const result = await controller.listRuns("queue:ai-jobs");
      expect(result).toEqual({ items: [], nextCursor: null });
      expect(deps.runs.listByWorkloadId).toHaveBeenCalledWith(
        "queue:ai-jobs",
        expect.any(Object),
      );
    });
  });

  describe("getRunTrace", () => {
    it("delegates to runs repository", async () => {
      const controller = createWorkloadController(deps);
      await controller.getRunTrace("root-123");
      expect(deps.runs.listByRootRunId).toHaveBeenCalledWith("root-123");
    });
  });
});
