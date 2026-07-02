import { describe, expect, it } from "vitest";

import type { DebugEvent } from "../../lib/api-client";

import {
  avgNumericSummary,
  computeDebuggerSourceStats,
  computeTimelineBuckets,
  countByStatus,
  pickAttentionEvents,
  topBySummaryField,
} from "./compute-debugger-source-stats";

function hookExecutionEvent(
  overrides: Partial<DebugEvent> & Pick<DebugEvent, "id" | "status">,
): DebugEvent {
  return {
    source: "hookExecution",
    timestamp: "2026-01-01T12:00:00.000Z",
    title: "LD-01",
    subtitle: "loanDetails · afterCreate",
    summary: {
      hookId: "LD-01",
      entityName: "loanDetails",
      durationMs: 100,
    },
    ...overrides,
  };
}

function requestPerfEvent(
  overrides: Partial<DebugEvent> & Pick<DebugEvent, "id">,
): DebugEvent {
  return {
    source: "requestPerf",
    timestamp: "2026-01-01T12:00:00.000Z",
    title: "GET /api/items",
    subtitle: "200 · 50ms",
    status: "success",
    summary: {
      totalMs: 50,
      hooksMs: 10,
      queryMs: 20,
      statusCode: 200,
    },
    ...overrides,
  };
}

describe("countByStatus", () => {
  it("counts events by status", () => {
    expect(
      countByStatus([
        hookExecutionEvent({ id: "1", status: "success" }),
        hookExecutionEvent({ id: "2", status: "error" }),
        hookExecutionEvent({ id: "3", status: "success" }),
      ]),
    ).toEqual({ success: 2, error: 1 });
  });
});

describe("topBySummaryField", () => {
  it("groups hook executions by entity and tracks errors", () => {
    const groups = topBySummaryField(
      [
        hookExecutionEvent({
          id: "1",
          status: "success",
          summary: { entityName: "loanDetails", hookId: "LD-01" },
        }),
        hookExecutionEvent({
          id: "2",
          status: "error",
          summary: { entityName: "loanDetails", hookId: "LD-02" },
        }),
        hookExecutionEvent({
          id: "3",
          status: "success",
          summary: { entityName: "paymentSchedule", hookId: "LD-01" },
        }),
      ],
      "entityName",
      5,
      { trackErrors: true },
    );

    expect(groups).toEqual([
      { key: "loanDetails", label: "loanDetails", count: 2, errorCount: 1 },
      {
        key: "paymentSchedule",
        label: "paymentSchedule",
        count: 1,
        errorCount: 0,
      },
    ]);
  });
});

describe("avgNumericSummary", () => {
  it("averages numeric summary fields", () => {
    expect(
      avgNumericSummary(
        [
          requestPerfEvent({ id: "1", summary: { totalMs: 100 } }),
          requestPerfEvent({ id: "2", summary: { totalMs: 200 } }),
        ],
        "totalMs",
      ),
    ).toBe(150);
  });
});

describe("computeDebuggerSourceStats", () => {
  it("computes hook execution stats", () => {
    const stats = computeDebuggerSourceStats(
      [
        hookExecutionEvent({
          id: "1",
          status: "success",
          summary: {
            durationMs: 100,
            entityName: "loanDetails",
            hookId: "LD-01",
          },
        }),
        hookExecutionEvent({
          id: "2",
          status: "error",
          summary: {
            durationMs: 300,
            entityName: "loanDetails",
            hookId: "LD-02",
          },
        }),
        hookExecutionEvent({
          id: "3",
          status: "skipped",
          summary: {
            durationMs: 50,
            entityName: "paymentSchedule",
            hookId: "LD-01",
          },
        }),
      ],
      "hookExecution",
    );

    expect(stats.total).toBe(3);
    expect(stats.errorRate).toBe(33);
    expect(stats.avgDurationMs).toBe(150);
    expect(stats.statusCounts).toEqual({ success: 1, error: 1, skipped: 1 });
    expect(stats.barCharts[0]?.groups[0]?.label).toBe("loanDetails");
    expect(stats.attentionItems).toHaveLength(1);
    expect(stats.attentionItems[0]?.id).toBe("2");
  });

  it("computes request performance stats", () => {
    const stats = computeDebuggerSourceStats(
      [
        requestPerfEvent({
          id: "1",
          status: "success",
          summary: { totalMs: 50, hooksMs: 5, queryMs: 10, statusCode: 200 },
        }),
        requestPerfEvent({
          id: "2",
          status: "error",
          summary: { totalMs: 500, hooksMs: 50, queryMs: 100, statusCode: 500 },
        }),
      ],
      "requestPerf",
    );

    expect(stats.errorRate).toBe(50);
    expect(stats.avgTotalMs).toBe(275);
    expect(stats.avgHooksMs).toBe(28);
    expect(stats.avgQueryMs).toBe(55);
    expect(stats.barCharts[0]?.groups[0]?.count).toBe(500);
    expect(stats.attentionItems[0]?.id).toBe("2");
  });
});

describe("computeTimelineBuckets", () => {
  it("groups events into buckets with error counts", () => {
    const buckets = computeTimelineBuckets(
      [
        hookExecutionEvent({
          id: "1",
          status: "success",
          timestamp: "2026-01-01T12:00:00.000Z",
        }),
        hookExecutionEvent({
          id: "2",
          status: "error",
          timestamp: "2026-01-01T12:30:00.000Z",
        }),
      ],
      4,
    );

    expect(buckets).toHaveLength(4);
    expect(buckets.reduce((sum, bucket) => sum + bucket.total, 0)).toBe(2);
    expect(buckets.reduce((sum, bucket) => sum + bucket.errors, 0)).toBe(1);
    expect(buckets[0]?.startMs).toBeLessThan(buckets[0]?.endMs ?? 0);
    expect(buckets[0]?.label).not.toBe("1");
  });
});

describe("pickAttentionEvents", () => {
  it("prioritizes failed and in-progress AI jobs", () => {
    const items = pickAttentionEvents(
      [
        {
          id: "1",
          source: "ai",
          timestamp: "2026-01-01T13:00:00.000Z",
          title: "completed",
          status: "completed",
        },
        {
          id: "2",
          source: "ai",
          timestamp: "2026-01-01T12:00:00.000Z",
          title: "failed",
          status: "failed",
        },
        {
          id: "3",
          source: "ai",
          timestamp: "2026-01-01T11:00:00.000Z",
          title: "running",
          status: "running",
        },
      ],
      "ai",
      5,
    );

    expect(items.map((item) => item.id)).toEqual(["2", "3"]);
  });
});
