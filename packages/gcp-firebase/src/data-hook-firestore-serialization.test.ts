import { describe, expect, it } from "vitest";
import type { DataHookDefinition } from "@repo/hooks";

import {
  deserializeDataHookFromFirestore,
  serializeDataHookForFirestore,
} from "./data-hook-firestore-serialization.js";

function maxFirestoreDepth(value: unknown, depth = 0): number {
  if (value === null || typeof value !== "object") {
    return depth;
  }
  if (Array.isArray(value)) {
    return Math.max(
      depth,
      ...value.map((entry) => maxFirestoreDepth(entry, depth + 1)),
    );
  }
  return Math.max(
    depth,
    ...Object.values(value).map((entry) => maxFirestoreDepth(entry, depth + 1)),
  );
}

describe("data hook firestore serialization", () => {
  it("round-trips legacy nested hook documents without a serialization marker", () => {
    const legacy = {
      id: "hook_legacy",
      tenantId: "tenant_test",
      name: "Legacy hook",
      entity: "loan",
      phase: "after",
      trigger: { operation: "create" },
      condition: null,
      actions: [
        {
          type: "setField",
          field: "status",
          value: { kind: "literal", value: "OK" },
        },
      ],
      enabled: true,
      order: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(deserializeDataHookFromFirestore(legacy).actions).toEqual(
      legacy.actions,
    );
  });

  it("keeps serialized nested hook actions within Firestore nesting limits", () => {
    const record = {
      id: "hook_test",
      tenantId: "tenant_test",
      name: "Generate payment schedule",
      entity: "loan",
      phase: "after" as const,
      trigger: { operation: "create" as const },
      condition: {
        type: "group" as const,
        combinator: "and" as const,
        children: [
          {
            type: "condition" as const,
            field: "status",
            operator: "==" as const,
            value: { kind: "literal" as const, value: "ACTIVE" },
          },
        ],
      },
      actions: [
        {
          type: "createRecords" as const,
          entity: "paymentSchedule",
          count: {
            kind: "field" as const,
            source: "current" as const,
            path: "periods",
          },
          data: {
            sequence: { kind: "var" as const, name: "loopIndex" as const },
            dueDate: {
              kind: "call" as const,
              fn: "dateAdd" as const,
              args: [
                {
                  kind: "field" as const,
                  source: "current" as const,
                  path: "startDate",
                },
                {
                  kind: "binary" as const,
                  op: "*" as const,
                  left: { kind: "var" as const, name: "loopIndex" as const },
                  right: { kind: "literal" as const, value: 30 },
                },
                { kind: "literal" as const, value: "DAY" },
              ],
            },
            amount: {
              kind: "call" as const,
              fn: "round" as const,
              args: [
                {
                  kind: "field" as const,
                  source: "current" as const,
                  path: "principal",
                },
              ],
            },
          },
        },
        {
          type: "aggregateMatching" as const,
          entity: "paymentSchedule",
          as: "scheduleRowCount",
          op: "count" as const,
          where: {
            type: "condition" as const,
            field: "loanId",
            operator: "==" as const,
            value: {
              kind: "field" as const,
              source: "current" as const,
              path: "id",
            },
          },
        },
        {
          type: "sendNotification" as const,
          message: {
            kind: "binary" as const,
            op: "+" as const,
            left: { kind: "literal" as const, value: "Created " },
            right: {
              kind: "field" as const,
              source: "aggregate" as const,
              alias: "scheduleRowCount",
            },
          },
        },
      ],
      enabled: true,
      order: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } satisfies DataHookDefinition;

    const serialized = serializeDataHookForFirestore(record);
    expect(maxFirestoreDepth(serialized)).toBeLessThanOrEqual(20);
    expect(typeof serialized.actions).toBe("string");
    expect(typeof serialized.trigger).toBe("string");

    const roundTrip = deserializeDataHookFromFirestore(serialized);
    expect(roundTrip.actions).toEqual(record.actions);
    expect(roundTrip.trigger).toEqual(record.trigger);
    expect(roundTrip.condition).toEqual(record.condition);
  });
});
