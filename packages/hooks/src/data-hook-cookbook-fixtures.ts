import type { PortableDataHookDefinition } from "./data-hook-definition-json.js";

/**
 * Cookbook hook definitions from docs/data-hook-definition-json.md §11.
 * Used by tests to keep the spec and Zod schemas in sync.
 */
export const DATA_HOOK_COOKBOOK_FIXTURES: readonly PortableDataHookDefinition[] =
  [
    {
      name: "Set pending status",
      entity: "loan",
      phase: "before",
      trigger: { operation: "create" },
      condition: null,
      actions: [
        {
          type: "setField",
          field: "status",
          value: { kind: "literal", value: "Pending" },
        },
      ],
      enabled: true,
      order: 0,
    },
    {
      name: "Complete when funded",
      entity: "loan",
      phase: "before",
      trigger: { operation: "create" },
      condition: {
        type: "group",
        combinator: "and",
        children: [
          {
            type: "condition",
            field: "amount",
            operator: ">=",
            value: {
              kind: "field",
              source: "current",
              path: "commitmentAmount",
            },
          },
        ],
      },
      actions: [
        {
          type: "setField",
          field: "status",
          value: { kind: "literal", value: "COMPLETE" },
        },
      ],
      enabled: true,
      order: 1,
    },
    {
      name: "Create payment on loan",
      entity: "loan",
      phase: "after",
      trigger: { operation: "create" },
      condition: null,
      actions: [
        {
          type: "createRecord",
          entity: "payment",
          data: {
            loanId: { kind: "field", source: "current", path: "id" },
            amount: { kind: "field", source: "current", path: "amount" },
          },
        },
      ],
      enabled: true,
      order: 2,
    },
    {
      name: "Generate payment schedule",
      entity: "loanDetails",
      phase: "after",
      trigger: { operation: "create" },
      condition: null,
      actions: [
        {
          type: "createRecords",
          entity: "paymentSchedule",
          count: { kind: "field", source: "current", path: "periods" },
          data: {
            sequence: { kind: "var", name: "loopIndex" },
            dueDate: {
              kind: "call",
              fn: "dateAdd",
              args: [
                { kind: "field", source: "current", path: "startDate" },
                {
                  kind: "binary",
                  op: "*",
                  left: { kind: "var", name: "loopIndex" },
                  right: { kind: "literal", value: 30 },
                },
                { kind: "literal", value: "DAY" },
              ],
            },
          },
        },
      ],
      enabled: true,
      order: 3,
    },
    {
      name: "Deactivate commitments",
      entity: "loan",
      phase: "after",
      trigger: { operation: "update", updateFields: ["status"] },
      condition: {
        type: "condition",
        field: "status",
        operator: "==",
        value: { kind: "literal", value: "CLOSED" },
      },
      actions: [
        {
          type: "updateMatching",
          entity: "commitment",
          where: {
            type: "condition",
            field: "contractId",
            operator: "==",
            value: { kind: "field", source: "current", path: "id" },
          },
          set: {
            isActive: { kind: "literal", value: false },
          },
        },
      ],
      enabled: true,
      order: 4,
    },
    {
      name: "Create payment",
      entity: "loan",
      phase: "after",
      trigger: { operation: "create" },
      chainHooks: true,
      condition: null,
      actions: [
        {
          type: "createRecord",
          entity: "payment",
          data: {
            loanId: { kind: "field", source: "current", path: "id" },
          },
        },
      ],
      enabled: true,
      order: 5,
    },
    {
      name: "Tag payment",
      entity: "payment",
      phase: "before",
      trigger: { operation: "create" },
      condition: null,
      actions: [
        {
          type: "setField",
          field: "note",
          value: { kind: "literal", value: "from payment hook" },
        },
      ],
      enabled: true,
      order: 0,
    },
    {
      name: "Log transaction create",
      entity: "transaction",
      phase: "after",
      trigger: { operation: "create" },
      execution: "deferred",
      condition: null,
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "Transaction created" },
        },
      ],
      enabled: true,
      order: 0,
    },
    {
      name: "Seed schedule horizon",
      entity: "financialItem",
      phase: "before",
      trigger: { operation: "create" },
      condition: null,
      actions: [
        {
          type: "createRecords",
          entity: "paymentSchedule",
          count: {
            kind: "call",
            fn: "min",
            args: [
              {
                kind: "field",
                source: "current",
                path: "scheduleHorizonMonths",
              },
              { kind: "literal", value: 1000 },
            ],
          },
          startIndex: { kind: "literal", value: 0 },
          data: {
            sequence: { kind: "var", name: "loopIndex" },
            financialItemId: {
              kind: "field",
              source: "current",
              path: "id",
            },
          },
        },
      ],
      enabled: true,
      order: 6,
    },
    {
      name: "Extend schedule horizon",
      entity: "financialItem",
      phase: "after",
      execution: "queued",
      trigger: {
        kind: "schedule",
        cron: "0 0 1 * *",
        timezone: "UTC",
        scope: "eachRecord",
        eachRecordWhere: {
          type: "condition",
          field: "status",
          operator: "==",
          value: { kind: "literal", value: "ACTIVE" },
        },
      },
      condition: null,
      actions: [
        {
          type: "aggregateMatching",
          entity: "paymentSchedule",
          op: "count",
          as: "existingCount",
          where: {
            type: "condition",
            field: "financialItemId",
            operator: "==",
            value: { kind: "field", source: "current", path: "id" },
          },
        },
        {
          type: "createRecords",
          entity: "paymentSchedule",
          count: {
            kind: "call",
            fn: "min",
            args: [
              { kind: "literal", value: 100 },
              {
                kind: "binary",
                op: "-",
                left: {
                  kind: "field",
                  source: "current",
                  path: "scheduleHorizonMonths",
                },
                right: {
                  kind: "field",
                  source: "aggregate",
                  alias: "existingCount",
                },
              },
            ],
          },
          startIndex: {
            kind: "field",
            source: "aggregate",
            alias: "existingCount",
          },
          data: {
            sequence: { kind: "var", name: "loopIndex" },
            financialItemId: {
              kind: "field",
              source: "current",
              path: "id",
            },
          },
        },
      ],
      enabled: true,
      order: 7,
    },
  ] as const;
