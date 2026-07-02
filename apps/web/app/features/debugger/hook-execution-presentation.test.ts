import { describe, expect, it } from "vitest";

import type { DebugEvent } from "../../lib/api-client";

import {
  aggregateHookExecutionWrites,
  aggregateHookExecutionWritesByEntity,
  resolveHookExecutionWriteFields,
  totalHookExecutionWritesFromEvent,
} from "./hook-execution-presentation";

function hookEvent(
  overrides: Partial<DebugEvent> & Pick<DebugEvent, "id">,
): DebugEvent {
  return {
    source: "hookExecution",
    timestamp: "2026-07-02T22:00:00.000Z",
    title: "Hook",
    status: "success",
    summary: {},
    ...overrides,
  };
}

describe("resolveHookExecutionWriteFields", () => {
  it("reads top-level write counts from summary", () => {
    expect(
      resolveHookExecutionWriteFields(
        hookEvent({
          id: "exec_1",
          summary: { writesCreated: 12, writesUpdated: 1, writesDeleted: 0 },
        }),
      ),
    ).toEqual({ created: 12, updated: 1, deleted: 0 });
  });

  it("falls back to writesByEntity when top-level counts are missing", () => {
    expect(
      resolveHookExecutionWriteFields(
        hookEvent({
          id: "exec_2",
          summary: {
            writesByEntity: {
              paymentSchedule: { created: 12, updated: 0, deleted: 0 },
            },
          },
        }),
      ),
    ).toEqual({ created: 12, updated: 0, deleted: 0 });
  });

  it("falls back to createRecords action trace count", () => {
    expect(
      resolveHookExecutionWriteFields(
        hookEvent({
          id: "exec_3",
          summary: {
            actionTrace: [
              {
                type: "createRecords",
                entity: "paymentSchedule",
                count: 12,
                durationMs: 90,
              },
            ],
          },
        }),
      ),
    ).toEqual({ created: 12, updated: 0, deleted: 0 });
  });

  it("reads metrics from payload when summary is empty", () => {
    expect(
      resolveHookExecutionWriteFields(
        hookEvent({
          id: "exec_4",
          summary: {},
          payload: { writesCreated: 8, writesUpdated: 0, writesDeleted: 2 },
        }),
      ),
    ).toEqual({ created: 8, updated: 0, deleted: 2 });
  });
});

describe("aggregateHookExecutionWrites", () => {
  it("sums created, updated, and deleted across hook executions", () => {
    const totals = aggregateHookExecutionWrites([
      hookEvent({ id: "exec_1", summary: { writesCreated: 12 } }),
      hookEvent({
        id: "exec_2",
        summary: { writesCreated: 5, writesUpdated: 2, writesDeleted: 1 },
      }),
    ]);

    expect(totals).toEqual({
      created: 17,
      updated: 2,
      deleted: 1,
      total: 20,
      executionCount: 2,
    });
    expect(totals.total).toBe(totals.created + totals.updated + totals.deleted);
  });
});

describe("aggregateHookExecutionWritesByEntity", () => {
  it("aggregates per-entity write totals across executions", () => {
    const totals = aggregateHookExecutionWritesByEntity([
      hookEvent({
        id: "exec_1",
        summary: {
          writesByEntity: {
            paymentSchedule: { created: 12, updated: 0, deleted: 0 },
          },
        },
      }),
      hookEvent({
        id: "exec_2",
        summary: {
          writesByEntity: {
            paymentSchedule: { created: 12, updated: 1, deleted: 2 },
            financialItem: { created: 0, updated: 1, deleted: 0 },
          },
        },
      }),
    ]);

    expect(totals).toEqual([
      {
        entityName: "paymentSchedule",
        created: 24,
        updated: 1,
        deleted: 2,
        total: 27,
      },
      {
        entityName: "financialItem",
        created: 0,
        updated: 1,
        deleted: 0,
        total: 1,
      },
    ]);
  });

  it("does not double-count duplicate summary and payload metrics", () => {
    const totals = aggregateHookExecutionWritesByEntity([
      hookEvent({
        id: "exec_1",
        summary: {
          writesCreated: 12,
          writesByEntity: {
            paymentSchedule: { created: 12, updated: 0, deleted: 0 },
          },
        },
        payload: {
          writesCreated: 12,
          writesByEntity: {
            paymentSchedule: { created: 12, updated: 0, deleted: 0 },
          },
        },
      }),
    ]);

    expect(totals).toEqual([
      {
        entityName: "paymentSchedule",
        created: 12,
        updated: 0,
        deleted: 0,
        total: 12,
      },
    ]);
  });

  it("keeps entity breakdown within top-level write totals", () => {
    const events = [
      hookEvent({
        id: "exec_1",
        summary: {
          writesCreated: 12,
          writesUpdated: 1,
          writesByEntity: {
            paymentSchedule: { created: 12, updated: 0, deleted: 0 },
            financialItem: { created: 0, updated: 1, deleted: 0 },
          },
        },
        payload: {
          writesCreated: 12,
          writesUpdated: 1,
          writesByEntity: {
            paymentSchedule: { created: 12, updated: 0, deleted: 0 },
            financialItem: { created: 0, updated: 1, deleted: 0 },
          },
        },
      }),
      hookEvent({
        id: "exec_2",
        summary: {
          writesCreated: 5,
          writesByEntity: {
            paymentSchedule: { created: 5, updated: 0, deleted: 0 },
          },
        },
      }),
    ];

    const totals = aggregateHookExecutionWrites(events);
    const byEntity = aggregateHookExecutionWritesByEntity(events);
    const createdSum = byEntity.reduce((sum, entry) => sum + entry.created, 0);
    const updatedSum = byEntity.reduce((sum, entry) => sum + entry.updated, 0);
    const deletedSum = byEntity.reduce((sum, entry) => sum + entry.deleted, 0);

    expect(createdSum).toBe(totals.created);
    expect(updatedSum).toBe(totals.updated);
    expect(deletedSum).toBe(totals.deleted);
  });
});

describe("totalHookExecutionWritesFromEvent", () => {
  it("matches aggregate fields for a single event", () => {
    const event = hookEvent({
      id: "exec_1",
      summary: {
        writesCreated: 12,
        writesUpdated: 0,
        writesDeleted: 0,
      },
    });
    expect(totalHookExecutionWritesFromEvent(event)).toBe(12);
  });
});
