import { describe, expect, it } from "vitest";

import {
  HookWriteMetricsCollector,
  buildExecutionMetricsSnapshot,
  deriveResolutionSource,
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

describe("deriveResolutionSource", () => {
  it("returns undefined when no resolution actions ran", () => {
    expect(
      deriveResolutionSource([
        { type: "setField", durationMs: 1 },
        { type: "createRecords", entity: "commitment", count: 2, durationMs: 3 },
      ]),
    ).toBeUndefined();
  });

  it("prefers direct match over later embedding or llm", () => {
    expect(
      deriveResolutionSource([
        {
          type: "matchRelatedRecord",
          outcome: "ran",
          matched: true,
          durationMs: 5,
        },
        {
          type: "matchSimilarRecord",
          outcome: "skipped",
          matched: false,
          durationMs: 1,
        },
        {
          type: "callAi",
          outcome: "skipped",
          matched: false,
          durationMs: 1,
        },
      ]),
    ).toBe("directMatch");
  });

  it("uses embedding when direct miss and similar hit", () => {
    expect(
      deriveResolutionSource([
        {
          type: "matchRelatedRecord",
          outcome: "empty",
          matched: false,
          durationMs: 5,
        },
        {
          type: "matchSimilarRecord",
          outcome: "ran",
          matched: true,
          score: 0.91,
          durationMs: 40,
        },
        {
          type: "callAi",
          outcome: "skipped",
          matched: false,
          durationMs: 1,
        },
      ]),
    ).toBe("embeddingMatch");
  });

  it("uses llm when earlier matches miss", () => {
    expect(
      deriveResolutionSource([
        {
          type: "matchRelatedRecord",
          outcome: "empty",
          matched: false,
          durationMs: 5,
        },
        {
          type: "matchSimilarRecord",
          outcome: "empty",
          matched: false,
          durationMs: 40,
        },
        {
          type: "callAi",
          outcome: "ran",
          matched: true,
          durationMs: 200,
        },
      ]),
    ).toBe("llm");
  });

  it("returns unresolved when resolution actions miss", () => {
    expect(
      deriveResolutionSource([
        {
          type: "matchRelatedRecord",
          outcome: "empty",
          matched: false,
          durationMs: 5,
        },
        {
          type: "callAi",
          outcome: "skipped",
          matched: false,
          durationMs: 1,
        },
      ]),
    ).toBe("unresolved");
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

  it("derives resolutionSource from actionTrace", () => {
    expect(
      buildExecutionMetricsSnapshot({
        actionTrace: [
          {
            type: "matchRelatedRecord",
            outcome: "empty",
            matched: false,
            durationMs: 2,
          },
          {
            type: "callAi",
            outcome: "ran",
            matched: true,
            as: "llmMatch",
            durationMs: 100,
          },
        ],
      }),
    ).toMatchObject({
      resolutionSource: "llm",
    });
  });
});
