import { describe, expect, it } from "vitest";

import {
  HookWriteMetricsCollector,
  buildExecutionMetricsSnapshot,
} from "./hook-execution-metrics.js";

describe("HookWriteMetricsCollector", () => {
  it("tracks creates, updates, and deletes by entity", () => {
    const metrics = new HookWriteMetricsCollector();
    metrics.recordCreate("paymentSchedule");
    metrics.recordCreate("paymentSchedule");
    metrics.recordUpdate("financialItem");
    metrics.recordDelete("paymentSchedule");

    expect(metrics.snapshot()).toEqual({
      writesCreated: 2,
      writesUpdated: 1,
      writesDeleted: 1,
      writesByEntity: {
        paymentSchedule: { created: 2, updated: 0, deleted: 1 },
        financialItem: { created: 0, updated: 1, deleted: 0 },
      },
    });
  });
});

describe("buildExecutionMetricsSnapshot", () => {
  it("includes chain depth and action trace", () => {
    const writeMetrics = new HookWriteMetricsCollector();
    writeMetrics.recordCreate("paymentSchedule");

    expect(
      buildExecutionMetricsSnapshot({
        chainDepth: 1,
        writeMetrics,
        actionTrace: [
          {
            type: "createRecords",
            entity: "paymentSchedule",
            count: 12,
            durationMs: 40,
          },
        ],
      }),
    ).toEqual({
      chainDepth: 1,
      writesCreated: 1,
      writesByEntity: {
        paymentSchedule: { created: 1, updated: 0, deleted: 0 },
      },
      actionTrace: [
        {
          type: "createRecords",
          entity: "paymentSchedule",
          count: 12,
          durationMs: 40,
        },
      ],
    });
  });
});
