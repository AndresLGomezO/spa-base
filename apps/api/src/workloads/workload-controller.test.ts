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

function buildDeps(
  overrides?: Partial<WorkloadControllerDeps>,
): WorkloadControllerDeps {
  return {
    cloudTasks: {
      getState: vi.fn().mockResolvedValue({ status: "ready", live: {} }),
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
    },
    schedulerJobNameByResource: {
      "schedule-tick": "schedule-tick",
      "gmail-poll": "gmail-poll",
    },
    localMode: true,
    projectId: "test-project",
    region: "us-central1",
    getGmailIngestDeliveryMode: vi.fn().mockResolvedValue("poll"),
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
      const result = await controller.listWorkloads({
        kind: ["cloudTasksQueue"],
      });
      for (const w of result) {
        expect(w.kind).toBe("cloudTasksQueue");
      }
    });

    it("filters by status", async () => {
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads({ status: ["paused"] });
      for (const w of result) {
        expect(w.state.status).toBe("paused");
      }
    });

    it("excludes scheduled hooks when source filter omits hook", async () => {
      deps.scheduledHooks.list = vi.fn().mockResolvedValue([
        {
          id: "scheduled-hook:tenant-a:hook-1",
          kind: "scheduledDataHook",
          source: "hook",
          domain: "platform",
          displayName: "Nightly cleanup",
          description: "Tenant scheduled hook",
          actions: ["disable"],
          schedule: { cron: "0 6 * * *", timezone: "UTC" },
        },
      ]);
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads({ source: ["system"] });
      expect(deps.scheduledHooks.list).not.toHaveBeenCalled();
      expect(result.every((w) => w.source === "system")).toBe(true);
      expect(result.some((w) => w.kind === "scheduledDataHook")).toBe(false);
    });

    it("includes scheduled hooks when source filter includes hook", async () => {
      deps.scheduledHooks.list = vi.fn().mockResolvedValue([
        {
          id: "scheduled-hook:tenant-a:hook-1",
          kind: "scheduledDataHook",
          source: "hook",
          domain: "platform",
          displayName: "Nightly cleanup",
          description: "Tenant scheduled hook",
          actions: ["disable"],
          enabled: true,
          schedule: { cron: "0 6 * * *", timezone: "UTC" },
        },
      ]);
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads({ source: ["hook"] });
      expect(deps.scheduledHooks.list).toHaveBeenCalled();
      expect(result.every((w) => w.source === "hook")).toBe(true);
      expect(
        result.some((w) => w.id === "scheduled-hook:tenant-a:hook-1"),
      ).toBe(true);
      expect(
        result.find((w) => w.id === "scheduled-hook:tenant-a:hook-1")?.state
          .status,
      ).toBe("running");
    });

    it("marks disabled scheduled hooks as disabled, not running", async () => {
      deps.scheduledHooks.list = vi.fn().mockResolvedValue([
        {
          id: "hook:rates:one-shot",
          kind: "scheduledDataHook",
          source: "hook",
          domain: "platform",
          displayName: "One shot",
          description: "Disabled after fire",
          actions: ["enable"],
          enabled: false,
          schedule: { cron: "0 9 * * *", timezone: "UTC" },
        },
      ]);
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads({
        kind: ["scheduledDataHook"],
      });
      expect(result[0]?.state.status).toBe("disabled");
    });

    it("marks armed scheduled hooks as running (Active) and Busy when in flight", async () => {
      deps.scheduledHooks.list = vi.fn().mockResolvedValue([
        {
          id: "hook:rates:active",
          kind: "scheduledDataHook",
          source: "hook",
          domain: "ai",
          displayName: "Active hook",
          description: "Currently executing",
          actions: ["disable"],
          enabled: true,
          schedule: { cron: "0 9 * * *", timezone: "UTC" },
        },
      ]);
      deps.runs.countByWorkloadIdSince = vi.fn().mockResolvedValue({
        success: 0,
        error: 0,
        timeout: 0,
        running: 1,
        cancelled: 0,
      });
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads({
        kind: ["scheduledDataHook"],
      });
      expect(result[0]?.state.status).toBe("running");
      expect(result[0]?.state.live?.busy).toBe(true);
      expect(result[0]?.state.live?.activeRuns).toBe(1);
    });

    it("disables gmail push when delivery mode is poll", async () => {
      deps = buildDeps({
        getGmailIngestDeliveryMode: vi.fn().mockResolvedValue("poll"),
      });
      deps.pubsub.getState = vi
        .fn()
        .mockResolvedValue({ status: "running", live: { exists: true } });
      deps.scheduler.getState = vi
        .fn()
        .mockResolvedValue({ status: "running", live: { state: "ENABLED" } });
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads();
      const push = result.find((w) => w.id === "pubsub:gmail-push-api");
      const poll = result.find((w) => w.id === "scheduler:gmail-poll");
      expect(push?.state.status).toBe("disabled");
      expect(push?.state.live?.deliveryMode).toBe("poll");
      expect(push?.state.live?.productActive).toBe(false);
      expect(poll?.state.status).toBe("running");
      expect(poll?.state.live?.productActive).toBe(true);
    });

    it("disables gmail poll when delivery mode is push", async () => {
      deps = buildDeps({
        getGmailIngestDeliveryMode: vi.fn().mockResolvedValue("push"),
      });
      deps.pubsub.getState = vi
        .fn()
        .mockResolvedValue({ status: "running", live: { exists: true } });
      deps.scheduler.getState = vi
        .fn()
        .mockResolvedValue({ status: "running", live: { state: "ENABLED" } });
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads();
      const push = result.find((w) => w.id === "pubsub:gmail-push-api");
      const poll = result.find((w) => w.id === "scheduler:gmail-poll");
      expect(push?.state.status).toBe("running");
      expect(push?.state.live?.productActive).toBe(true);
      expect(poll?.state.status).toBe("disabled");
      expect(poll?.state.live?.deliveryMode).toBe("push");
      expect(poll?.state.live?.productActive).toBe(false);
    });

    it("keeps idle queues as ready, not running", async () => {
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads({
        kind: ["cloudTasksQueue"],
      });
      expect(result.length).toBeGreaterThan(0);
      for (const w of result) {
        expect(w.state.status).toBe("ready");
      }
    });

    it("promotes ready queue to running when pending tasks exist", async () => {
      deps.cloudTasks.listPendingTasks = vi
        .fn()
        .mockResolvedValue([
          { name: "projects/x/locations/y/queues/z/tasks/1" },
        ]);
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads({
        kind: ["cloudTasksQueue"],
      });
      expect(result.every((w) => w.state.status === "running")).toBe(true);
      expect(result[0]?.state.live?.busy).toBe(true);
      expect(result[0]?.state.live?.depth).toBe(1);
    });

    it("promotes gmail queue to running when a catalog handler has an active run", async () => {
      deps.runs.countByWorkloadIdSince = vi
        .fn()
        .mockImplementation(async (workloadId: string) => ({
          success: 0,
          error: 0,
          timeout: 0,
          running: workloadId === "worker:gmail-process-message" ? 1 : 0,
          cancelled: 0,
        }));
      const controller = createWorkloadController(deps);
      const result = await controller.listWorkloads({
        kind: ["cloudTasksQueue"],
      });
      const gmailQueue = result.find((w) => w.id === "queue:gmail-jobs");
      expect(gmailQueue?.state.status).toBe("running");
      expect(gmailQueue?.state.live?.busy).toBe(true);
      expect(gmailQueue?.state.live?.activeRuns).toBe(1);
      const aiQueue = result.find((w) => w.id === "queue:ai-jobs");
      expect(aiQueue?.state.status).toBe("ready");
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

    it("omits gcpConsoleUrl in local mode", async () => {
      const controller = createWorkloadController(deps);
      const result = await controller.getWorkload("queue:ai-jobs");
      expect(result?.gcpConsoleUrl).toBeUndefined();
    });

    it("includes gcpConsoleUrl for GCP queue workloads when not local", async () => {
      const controller = createWorkloadController(
        buildDeps({ localMode: false }),
      );
      const result = await controller.getWorkload("queue:ai-jobs");
      expect(result?.gcpConsoleUrl).toBe(
        "https://console.cloud.google.com/cloudtasks/queue/us-central1/ai-jobs/tasks?project=test-project",
      );
    });

    it("includes gcpConsoleUrl for scheduler and pubsub workloads", async () => {
      const controller = createWorkloadController(
        buildDeps({ localMode: false }),
      );
      const scheduler = await controller.getWorkload("scheduler:schedule-tick");
      expect(scheduler?.gcpConsoleUrl).toBe(
        "https://console.cloud.google.com/cloudscheduler/jobs/edit/us-central1/schedule-tick?project=test-project",
      );
      const pubsub = await controller.getWorkload(
        "pubsub:aggregation-events-worker",
      );
      expect(pubsub?.gcpConsoleUrl).toBe(
        "https://console.cloud.google.com/cloudpubsub/subscription/detail/aggregation-events-worker?project=test-project",
      );
    });

    it("omits gcpConsoleUrl for catalog worker routes", async () => {
      const controller = createWorkloadController(
        buildDeps({ localMode: false }),
      );
      const result = await controller.getWorkload("worker:schedule-tick");
      expect(result?.gcpConsoleUrl).toBeUndefined();
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
      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
      // Parent merges handler catalog ids (ai-jobs has several controlledBy children).
      expect(deps.runs.listByWorkloadId).toHaveBeenCalled();
    });

    it("includes catalog handler runs when listing a parent queue", async () => {
      deps.runs.listByWorkloadId = vi
        .fn()
        .mockImplementation(async (workloadId: string) => ({
          items:
            workloadId === "worker:gmail-process-message"
              ? [
                  {
                    id: "run-1",
                    workloadId,
                    triggeredBy: "cloudTasks",
                    startedAt: "2026-07-27T20:00:00.000Z",
                    status: "success",
                  },
                ]
              : [],
          nextCursor: null,
        }));
      const controller = createWorkloadController(deps);
      const result = await controller.listRuns("queue:gmail-jobs");
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.workloadId).toBe("worker:gmail-process-message");
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
