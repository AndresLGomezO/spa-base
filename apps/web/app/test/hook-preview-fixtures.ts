import type { HookPreviewInput } from "../features/data-hooks/preview/hook-preview-types.js";

/** Minimal hook shape used by buildHookPreviewModel tests (not tied to any tenant catalog). */
export const createInitialScheduleRowHook: HookPreviewInput = {
  name: "Create initial schedule row",
  description:
    "Seed paymentSchedule horizon from scheduleHorizonMonths (frequency-aware due dates).",
  entity: "financialItem",
  phase: "after",
  trigger: {
    operation: "create",
  },
  condition: {
    type: "group",
    combinator: "and",
    children: [
      {
        type: "condition",
        field: "amount",
        operator: ">",
        value: {
          kind: "literal",
          value: 0,
        },
      },
      {
        type: "condition",
        field: "nextDueDate",
        operator: "isNotEmpty",
      },
    ],
  },
  actions: [
    {
      type: "createRecords",
      entity: "paymentSchedule",
      count: {
        kind: "formula",
        name: "recurringScheduleInitialRowCount",
        inputs: {
          frequency: {
            kind: "field",
            source: "current",
            path: "frequency",
          },
        },
      },
      startIndex: {
        kind: "literal",
        value: 0,
      },
      data: {
        financialItemId: {
          kind: "field",
          source: "current",
          path: "id",
        },
        dueDate: {
          kind: "formula",
          name: "frequencyScheduleDueDate",
          inputs: {
            baseDate: {
              kind: "field",
              source: "current",
              path: "nextDueDate",
            },
            frequency: {
              kind: "field",
              source: "current",
              path: "frequency",
            },
          },
        },
        expectedAmount: {
          kind: "field",
          source: "current",
          path: "amount",
        },
        sequence: {
          kind: "var",
          name: "loopIndex",
        },
        status: {
          kind: "literal",
          value: "UPCOMING",
        },
      },
    },
    {
      type: "aggregateMatching",
      entity: "paymentSchedule",
      op: "count",
      as: "scheduleRowCount",
      where: {
        type: "group",
        combinator: "and",
        children: [
          {
            type: "condition",
            field: "financialItemId",
            operator: "==",
            value: {
              kind: "field",
              source: "current",
              path: "id",
            },
          },
          {
            type: "condition",
            field: "status",
            operator: "==",
            value: {
              kind: "literal",
              value: "UPCOMING",
            },
          },
        ],
      },
    },
    {
      type: "sendNotification",
      message: {
        kind: "call",
        fn: "concat",
        args: [
          {
            kind: "literal",
            value: "Created ",
          },
          {
            kind: "field",
            source: "aggregate",
            alias: "scheduleRowCount",
          },
          {
            kind: "literal",
            value: " payment schedule row(s) for ",
          },
          {
            kind: "field",
            source: "current",
            path: "name",
          },
        ],
      },
    },
  ],
  enabled: true,
};
