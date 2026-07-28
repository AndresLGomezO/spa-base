import { describe, expect, it, vi } from "vitest";

import type { WorkloadRunRecord } from "./workload-run.js";
import {
  buildDeterministicCloudTaskRunId,
  buildDeterministicSchedulerRunId,
  createWorkloadRunRecorder,
  type WorkloadRunRepository,
} from "./create-workload-run-recorder.js";

function createInMemoryRepo(): WorkloadRunRepository & {
  readonly store: Map<string, WorkloadRunRecord>;
} {
  const store = new Map<string, WorkloadRunRecord>();
  return {
    store,
    async getById(id) {
      return store.get(id) ?? null;
    },
    async upsert(input) {
      const existing = store.get(input.id);
      const next: WorkloadRunRecord = {
        ...(existing ?? {}),
        ...input,
        metrics: { ...(existing?.metrics ?? {}), ...(input.metrics ?? {}) },
        artifactRefs: input.artifactRefs ?? existing?.artifactRefs ?? [],
      };
      store.set(input.id, next);
      return next;
    },
    async update(id, patch) {
      const existing = store.get(id);
      if (!existing) throw new Error(`missing ${id}`);
      const next: WorkloadRunRecord = {
        ...existing,
        ...patch,
        metrics: patch.metrics
          ? { ...existing.metrics, ...patch.metrics }
          : existing.metrics,
        artifactRefs: patch.artifactRefs ?? existing.artifactRefs,
      };
      store.set(id, next);
      return next;
    },
    async listByWorkloadId() {
      return { items: [], nextCursor: null };
    },
    async listByRootRunId() {
      return [];
    },
    async countByWorkloadIdSince() {
      return {
        success: 0,
        error: 0,
        timeout: 0,
        running: 0,
        cancelled: 0,
      };
    },
  };
}

describe("createWorkloadRunRecorder", () => {
  it("begins a run and finalizes success with metrics and artifacts", async () => {
    const repo = createInMemoryRepo();
    const now = vi.fn(() => new Date("2026-01-01T00:00:00.000Z"));
    const recorder = createWorkloadRunRecorder({
      repository: repo,
      now,
      generateId: () => "run-fixed",
    });

    const handle = await recorder.beginRun({
      workloadId: "scheduler:schedule-tick",
      triggeredBy: "scheduler",
      triggerContext: { schedulerJob: "schedule-tick" },
    });

    expect(handle.id).toBe("run-fixed");
    expect(handle.rootRunId).toBe("run-fixed");
    expect(repo.store.get("run-fixed")?.status).toBe("running");

    await handle.addArtifact({
      kind: "hookExecution",
      id: "hex-1",
      tenantId: "t1",
    });
    await handle.patchMetrics({ tenantsProcessed: 2 });

    now.mockReturnValueOnce(new Date("2026-01-01T00:00:05.000Z"));
    await handle.succeed({ metrics: { hooksFired: 3 } });

    const final = repo.store.get("run-fixed")!;
    expect(final.status).toBe("success");
    expect(final.durationMs).toBe(5000);
    expect(final.metrics).toEqual({
      tenantsProcessed: 2,
      hooksFired: 3,
    });
    expect(final.artifactRefs).toEqual([
      { kind: "hookExecution", id: "hex-1", tenantId: "t1" },
    ]);
  });

  it("is idempotent on begin with same id (merge)", async () => {
    const repo = createInMemoryRepo();
    const recorder = createWorkloadRunRecorder({ repository: repo });
    const id = buildDeterministicSchedulerRunId(
      "schedule-tick",
      "2026-01-01T00:00:00.000Z",
    );

    await recorder.beginRun({
      id,
      workloadId: "scheduler:schedule-tick",
      triggeredBy: "scheduler",
    });
    await recorder.beginRun({
      id,
      workloadId: "scheduler:schedule-tick",
      triggeredBy: "scheduler",
      metrics: { retried: true },
    });

    expect(repo.store.size).toBe(1);
    expect(repo.store.get(id)?.metrics).toMatchObject({ retried: true });
  });

  it("propagates parent/root lineage", async () => {
    const repo = createInMemoryRepo();
    const recorder = createWorkloadRunRecorder({
      repository: repo,
      generateId: () => "child-1",
    });

    const handle = await recorder.beginRun({
      workloadId: "worker:process-data-hook",
      triggeredBy: "cloudTasks",
      parentRunId: "parent-1",
      rootRunId: "root-1",
    });

    expect(handle.parentRunId).toBe("parent-1");
    expect(handle.rootRunId).toBe("root-1");
    expect(repo.store.get("child-1")?.rootRunId).toBe("root-1");
  });

  it("fails and cancels", async () => {
    const repo = createInMemoryRepo();
    const recorder = createWorkloadRunRecorder({
      repository: repo,
      generateId: () => "fail-1",
    });
    const handle = await recorder.beginRun({
      workloadId: "queue:hook-jobs",
      triggeredBy: "cloudTasks",
    });
    await handle.fail({ message: "boom", code: "ERR", retryable: true });
    expect(repo.store.get("fail-1")?.status).toBe("error");
    expect(repo.store.get("fail-1")?.error?.message).toBe("boom");

    const handle2 = await recorder.beginRun({
      id: "cancel-1",
      workloadId: "queue:hook-jobs",
      triggeredBy: "cloudTasks",
    });
    await handle2.cancel("operator cancelled");
    expect(repo.store.get("cancel-1")?.status).toBe("cancelled");
  });

  it("builds deterministic cloud task ids", () => {
    expect(
      buildDeterministicCloudTaskRunId(
        "hook-jobs",
        "projects/p/locations/l/queues/q/tasks/abc",
        2,
      ),
    ).toBe("hook-jobs:abc:2");
  });
});
