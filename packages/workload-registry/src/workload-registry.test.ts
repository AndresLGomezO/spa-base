import { describe, expect, it } from "vitest";

import {
  getWorkloadById,
  listWorkloads,
  WORKLOAD_REGISTRY,
} from "./workload-registry.js";
import { workloadRecordSchema } from "./workload.js";

describe("WORKLOAD_REGISTRY", () => {
  it("contains unique ids", () => {
    const ids = WORKLOAD_REGISTRY.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every entry against the schema", () => {
    for (const entry of WORKLOAD_REGISTRY) {
      expect(() => workloadRecordSchema.parse(entry)).not.toThrow();
    }
  });

  it("lists cloud tasks queues", () => {
    const queues = listWorkloads({ kind: ["cloudTasksQueue"] });
    expect(queues.map((q) => q.id)).toEqual(
      expect.arrayContaining([
        "queue:ai-jobs",
        "queue:document-extraction",
        "queue:hook-jobs",
        "queue:gmail-jobs",
      ]),
    );
    expect(queues.map((q) => q.id)).not.toContain("queue:ai-embed");
  });

  it("filters by source and query", () => {
    const integration = listWorkloads({
      source: ["integration"],
      q: "gmail",
    });
    expect(integration.length).toBeGreaterThan(0);
    expect(integration.every((w) => w.source === "integration")).toBe(true);
  });

  it("looks up by id", () => {
    expect(getWorkloadById("scheduler:schedule-tick")?.displayName).toBe(
      "Schedule Tick",
    );
    expect(getWorkloadById("missing")).toBeUndefined();
  });

  it("requires domain on every entry", () => {
    for (const entry of WORKLOAD_REGISTRY) {
      expect(entry.domain).toBeTruthy();
    }
  });

  it("sets cron on cloud scheduler jobs", () => {
    expect(getWorkloadById("scheduler:schedule-tick")?.schedule?.cron).toBe(
      "* * * * *",
    );
    expect(getWorkloadById("scheduler:gmail-poll")?.schedule?.cron).toBe(
      "*/5 * * * *",
    );
  });
});
