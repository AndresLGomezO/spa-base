import { describe, expect, it } from "vitest";

import type { WorkloadRunRecord } from "../../lib/admin-client";
import {
  filterWorkloadRuns,
  paginateWorkloadRuns,
  runMatchesSearch,
  sortWorkloadRuns,
} from "./workload-runs-list-query";

function run(
  overrides: Partial<WorkloadRunRecord> &
    Pick<WorkloadRunRecord, "id" | "status" | "startedAt">,
): WorkloadRunRecord {
  return {
    workloadId: "queue:ai-jobs",
    triggeredBy: "cloudTasks",
    ...overrides,
  };
}

describe("workload-runs-list-query", () => {
  const sample = [
    run({
      id: "a",
      status: "success",
      startedAt: "2026-07-28T10:00:00.000Z",
      durationMs: 100,
      triggeredBy: "scheduler",
    }),
    run({
      id: "b",
      status: "error",
      startedAt: "2026-07-28T11:00:00.000Z",
      durationMs: 500,
      triggeredBy: "cloudTasks",
      error: "boom",
      workloadId: "worker:gmail-process-message",
    }),
    run({
      id: "c",
      status: "running",
      startedAt: "2026-07-28T12:00:00.000Z",
      triggeredBy: "http",
    }),
  ];

  it("matches search across id, workload, trigger, and error", () => {
    expect(runMatchesSearch(sample[1]!, "gmail")).toBe(true);
    expect(runMatchesSearch(sample[1]!, "boom")).toBe(true);
    expect(runMatchesSearch(sample[0]!, "scheduler")).toBe(true);
    expect(runMatchesSearch(sample[0]!, "zzz")).toBe(false);
  });

  it("filters by status and triggeredBy", () => {
    const filtered = filterWorkloadRuns(sample, {
      search: "",
      statuses: ["error", "running"],
      triggeredBy: ["cloudTasks", "http"],
    });
    expect(filtered.map((item) => item.id)).toEqual(["b", "c"]);
  });

  it("sorts by newest, status priority, and duration", () => {
    expect(sortWorkloadRuns(sample, "newest").map((item) => item.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(sortWorkloadRuns(sample, "oldest").map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(sortWorkloadRuns(sample, "status").map((item) => item.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(sortWorkloadRuns(sample, "duration").map((item) => item.id)).toEqual(
      ["b", "a", "c"],
    );
  });

  it("paginates with safe page bounds", () => {
    const page1 = paginateWorkloadRuns(sample, 1, 10);
    expect(page1.pageItems).toHaveLength(3);
    expect(page1.totalPages).toBe(1);

    const oversized = paginateWorkloadRuns(sample, 9, 10);
    expect(oversized.page).toBe(1);
    expect(oversized.pageItems).toHaveLength(3);

    const many = Array.from({ length: 25 }, (_, index) =>
      run({
        id: `r${index}`,
        status: "success",
        startedAt: `2026-07-28T${String(index).padStart(2, "0")}:00:00.000Z`,
      }),
    );
    const page2 = paginateWorkloadRuns(many, 2, 10);
    expect(page2.totalPages).toBe(3);
    expect(page2.pageItems).toHaveLength(10);
    expect(page2.pageItems[0]?.id).toBe("r10");
  });
});
