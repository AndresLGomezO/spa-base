import { describe, expect, it, vi } from "vitest";

import {
  createWorkloadRunRecorder,
  type WorkloadRunRepository,
  type WorkloadRunRecord,
  type CreateWorkloadRunInput,
  type UpdateWorkloadRunPatch,
} from "@repo/workload-runs";

import { withWorkloadRun } from "./with-workload-run.js";

function createInMemoryRepository(): WorkloadRunRepository & {
  records: Map<string, WorkloadRunRecord>;
} {
  const records = new Map<string, WorkloadRunRecord>();

  return {
    records,
    async getById(id) {
      return records.get(id) ?? null;
    },
    async upsert(input: CreateWorkloadRunInput) {
      const record: WorkloadRunRecord = { ...input };
      records.set(input.id, record);
      return record;
    },
    async update(id: string, patch: UpdateWorkloadRunPatch) {
      const existing = records.get(id);
      if (!existing) throw new Error(`Record ${id} not found`);
      const updated = { ...existing, ...patch } as WorkloadRunRecord;
      records.set(id, updated);
      return updated;
    },
    async listByWorkloadId() {
      return { items: [], nextCursor: null };
    },
    async listByRootRunId() {
      return [];
    },
    async countByWorkloadIdSince() {
      return { success: 0, error: 0, timeout: 0, running: 0, cancelled: 0 };
    },
  };
}

describe("withWorkloadRun", () => {
  it("records success when fn completes", async () => {
    const repository = createInMemoryRepository();
    const recorder = createWorkloadRunRecorder({ repository });
    const logger = {
      child: vi.fn(() => logger),
      info: vi.fn(),
      error: vi.fn(),
    };

    const result = await withWorkloadRun(
      recorder,
      {
        workloadId: "test:workload",
        triggeredBy: "scheduler",
        id: "run-1",
      },
      logger,
      async (handle, runLogger) => {
        expect(handle.id).toBe("run-1");
        expect(runLogger).toBe(logger);
        return "done";
      },
    );

    expect(result).toBe("done");
    const record = repository.records.get("run-1")!;
    expect(record.status).toBe("success");
    expect(record.completedAt).toBeDefined();
    expect(logger.child).toHaveBeenCalledWith(
      expect.objectContaining({
        workloadRunId: "run-1",
        workloadId: "test:workload",
      }),
    );
  });

  it("records error and re-throws when fn throws", async () => {
    const repository = createInMemoryRepository();
    const recorder = createWorkloadRunRecorder({ repository });
    const logger = {
      child: vi.fn(() => logger),
      info: vi.fn(),
      error: vi.fn(),
    };

    await expect(
      withWorkloadRun(
        recorder,
        {
          workloadId: "test:workload",
          triggeredBy: "manual",
          id: "run-2",
        },
        logger,
        async () => {
          throw new Error("boom");
        },
      ),
    ).rejects.toThrow("boom");

    const record = repository.records.get("run-2")!;
    expect(record.status).toBe("error");
    expect(record.error).toEqual(expect.objectContaining({ message: "boom" }));
  });

  it("works without logger.child (fallback to same logger)", async () => {
    const repository = createInMemoryRepository();
    const recorder = createWorkloadRunRecorder({ repository });
    const logger = { info: vi.fn(), error: vi.fn() };

    const result = await withWorkloadRun(
      recorder,
      {
        workloadId: "test:no-child",
        triggeredBy: "http",
        id: "run-3",
      },
      logger,
      async (_handle, runLogger) => {
        expect(runLogger).toBe(logger);
        return 42;
      },
    );

    expect(result).toBe(42);
    expect(repository.records.get("run-3")!.status).toBe("success");
  });
});
