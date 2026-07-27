import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DataHookDefinition } from "./data-hook-definition.js";
import { formatHookEvent, parseHookEvent } from "./event.js";
import {
  runDataHook,
  evaluateCondition,
  evaluateConditionNode,
  compileDataHook,
} from "./interpret-data-hook.js";
import {
  validateDataHookActions,
  validateCreateDataHookInput,
} from "./validate-data-hook.js";
import {
  MAX_LOADED_RECORDS,
  MAX_AGGREGATE_ACTIONS,
} from "./data-hook-definition.js";
import {
  clearHookRegistry,
  executeHooks,
  getHooksForEvent,
  registerDynamicHook,
  registerSystemHook,
} from "./registry.js";
import type { HookContext } from "./types.js";
import { HookExecutionError } from "./types.js";
import { mockHookEntityServices } from "./test/mock-hook-entity-services.js";

function createContext(overrides: Partial<HookContext> = {}): HookContext {
  return {
    tenantId: "tenant_a",
    entityName: "loan",
    event: "loan.beforeCreate",
    current: { amount: 100 },
    user: { uid: "user_1" },
    services: {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
      },
    },
    ...overrides,
  };
}

const sampleDefinition: DataHookDefinition = {
  id: "hook_1",
  tenantId: "tenant_a",
  name: "Set status",
  entity: "loan",
  phase: "before",
  trigger: { operation: "create" },
  actions: [
    {
      type: "setField",
      field: "status",
      value: { kind: "literal", value: "Pending" },
    },
  ],
  enabled: true,
  order: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("hook events", () => {
  it("formats and parses hook events", () => {
    const parsed = {
      entity: "loan",
      operation: "create" as const,
      phase: "after" as const,
    };

    expect(formatHookEvent(parsed)).toBe("loan.afterCreate");
    expect(parseHookEvent("loan.afterCreate")).toEqual(parsed);
  });

  it("formats and parses schedule events", () => {
    const parsed = {
      entity: "task",
      operation: "schedule" as const,
      phase: "after" as const,
    };

    expect(formatHookEvent(parsed)).toBe("task.afterSchedule");
    expect(parseHookEvent("task.afterSchedule")).toEqual(parsed);
  });

  it("formats and parses email events", () => {
    const parsed = {
      entity: "financialItem",
      phase: "after" as const,
      operation: "email" as const,
    };

    expect(formatHookEvent(parsed)).toBe("financialItem.afterEmail");
    expect(parseHookEvent("financialItem.afterEmail")).toEqual(parsed);
  });

  it("rejects invalid events", () => {
    expect(() => parseHookEvent("loan.created")).toThrow(HookExecutionError);
  });
});

describe("executeHooks", () => {
  beforeEach(() => {
    clearHookRegistry();
  });

  it("runs system hooks in order", async () => {
    const calls: string[] = [];

    registerSystemHook({
      moduleName: "inventory",
      event: "loan.afterCreate",
      order: 2,
      handler: async () => {
        calls.push("second");
      },
    });
    registerSystemHook({
      moduleName: "inventory",
      event: "loan.afterCreate",
      order: 1,
      handler: async () => {
        calls.push("first");
      },
    });

    await executeHooks(
      "loan.afterCreate",
      createContext({ event: "loan.afterCreate" }),
    );

    expect(calls).toEqual(["first", "second"]);
  });

  it("blocks before hooks on failure", async () => {
    registerSystemHook({
      moduleName: "inventory",
      event: "loan.beforeCreate",
      handler: async () => {
        throw new Error("blocked");
      },
    });

    await expect(
      executeHooks("loan.beforeCreate", createContext()),
    ).rejects.toThrow(HookExecutionError);
  });

  it("runs tenant dynamic hooks", async () => {
    registerDynamicHook("tenant_a", sampleDefinition);

    const context = createContext();
    await executeHooks("loan.beforeCreate", context);

    expect(context.current.status).toBe("Pending");
  });

  it("registers a multi-operation CRUD hook on each event", async () => {
    registerDynamicHook("tenant_a", {
      ...sampleDefinition,
      id: "hook_multi",
      phase: "after",
      trigger: {
        kind: "crud",
        operations: [
          { operation: "create" },
          { operation: "update", updateFields: ["amount"] },
          { operation: "delete" },
        ],
      },
      actions: [
        {
          type: "setField",
          field: "touched",
          value: { kind: "literal", value: true },
        },
      ],
    });

    expect(getHooksForEvent("loan.afterCreate", "tenant_a")).toHaveLength(1);
    expect(getHooksForEvent("loan.afterUpdate", "tenant_a")).toHaveLength(1);
    expect(getHooksForEvent("loan.afterDelete", "tenant_a")).toHaveLength(1);
  });

  it("skips multi-operation update when its updateFields did not change", async () => {
    const recorder = {
      createPending: vi.fn(async () => ({ id: "exec_pending" })),
      markRunning: vi.fn(async () => undefined),
      beginRunning: vi.fn(async () => ({ id: "exec_running" })),
      finish: vi.fn(async () => undefined),
      createTerminal: vi.fn(async () => undefined),
    };

    await runDataHook(
      {
        ...sampleDefinition,
        id: "hook_multi_fields",
        phase: "after",
        trigger: {
          kind: "crud",
          operations: [
            { operation: "create" },
            { operation: "update", updateFields: ["categoryId"] },
          ],
        },
        actions: [
          {
            type: "sendNotification",
            message: { kind: "literal", value: "x" },
          },
        ],
      },
      createContext({
        event: "loan.afterUpdate",
        current: { id: "loan_1", categoryId: "cat_1", amount: 50 },
        previous: { id: "loan_1", categoryId: "cat_1", amount: 100 },
        services: {
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(recorder.createTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "skipped",
        error: "No configured update fields changed.",
      }),
    );
    expect(recorder.beginRunning).not.toHaveBeenCalled();
  });
});

describe("runDataHook", () => {
  it("mutates current on before setField", async () => {
    const context = createContext();

    await runDataHook(
      {
        ...sampleDefinition,
        actions: [
          {
            type: "setField",
            field: "status",
            value: { kind: "literal", value: "Approved" },
          },
        ],
      },
      context,
    );

    expect(context.current.status).toBe("Approved");
  });

  it("evaluates expression-driven setField", async () => {
    const context = createContext({
      event: "loan.beforeCreate",
      current: { amount: 100, commitmentAmount: 100 },
    });

    await runDataHook(
      {
        ...sampleDefinition,
        condition: {
          type: "condition",
          field: "amount",
          operator: ">=",
          value: { kind: "field", source: "current", path: "commitmentAmount" },
        },
        actions: [
          {
            type: "setField",
            field: "status",
            value: { kind: "literal", value: "COMPLETE" },
          },
        ],
      },
      context,
    );

    expect(context.current.status).toBe("COMPLETE");
  });

  it("skips when condition is not met", async () => {
    const context = createContext({
      current: { amount: 50, commitmentAmount: 100 },
    });

    await runDataHook(
      {
        ...sampleDefinition,
        condition: {
          type: "condition",
          field: "amount",
          operator: ">=",
          value: { kind: "field", source: "current", path: "commitmentAmount" },
        },
        actions: [
          {
            type: "setField",
            field: "status",
            value: { kind: "literal", value: "COMPLETE" },
          },
        ],
      },
      context,
    );

    expect(context.current.status).toBeUndefined();
  });

  it("only fires update hooks when tracked fields change", async () => {
    const context = createContext({
      event: "loan.beforeUpdate",
      current: { amount: 100, note: "changed" },
      previous: { amount: 100, note: "original" },
    });

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "before",
        trigger: { operation: "update", updateFields: ["amount"] },
        actions: [
          {
            type: "setField",
            field: "touched",
            value: { kind: "literal", value: true },
          },
        ],
      },
      context,
    );

    expect(context.current.touched).toBeUndefined();
  });

  it("calls entity services on after createRecord", async () => {
    const create = vi.fn(async () => ({ id: "task_1" }));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "createRecord",
            entity: "task",
            data: { name: { kind: "literal", value: "Follow up" } },
          },
        ],
      },
      createContext({
        event: "loan.afterCreate",
        services: {
          entities: {
            create,
            update: vi.fn(),
            list: vi.fn(),
            delete: vi.fn(),
            get: vi.fn(),
            createMany: vi.fn(async () => []),
          },
        },
      }),
    );

    expect(create).toHaveBeenCalledWith(
      "task",
      { name: "Follow up" },
      undefined,
    );
  });

  it("generates multiple records with loop index", async () => {
    const createMany = vi.fn<
      (
        entity: string,
        records: readonly Record<string, unknown>[],
      ) => Promise<Array<{ id: string }>>
    >(async (_entity, records) => records.map(() => ({ id: "c" })));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "createRecords",
            entity: "commitment",
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
      },
      createContext({
        event: "loan.afterCreate",
        current: { periods: 3, startDate: "2026-01-01T00:00:00.000Z" },
        services: {
          entities: mockHookEntityServices({ createMany }),
        },
      }),
    );

    expect(createMany).toHaveBeenCalledTimes(1);
    const records = createMany.mock.calls[0]?.[1] ?? [];
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({ sequence: 0 });
    expect(records[1]).toMatchObject({
      sequence: 1,
      dueDate: "2026-01-31T00:00:00.000Z",
    });
  });

  it("uses startIndex as absolute loopIndex offset", async () => {
    const createMany = vi.fn<
      (
        entity: string,
        records: readonly Record<string, unknown>[],
      ) => Promise<Array<{ id: string }>>
    >(async (_entity, records) => records.map(() => ({ id: "c" })));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "createRecords",
            entity: "commitment",
            count: { kind: "literal", value: 2 },
            startIndex: { kind: "literal", value: 5 },
            data: {
              sequence: { kind: "var", name: "loopIndex" },
            },
          },
        ],
      },
      createContext({
        event: "loan.afterCreate",
        services: {
          entities: mockHookEntityServices({ createMany }),
        },
      }),
    );

    const records = createMany.mock.calls[0]?.[1] ?? [];
    expect(records[0]).toMatchObject({ sequence: 5 });
    expect(records[1]).toMatchObject({ sequence: 6 });
  });

  it("carries loopState across createRecords iterations", async () => {
    const createMany = vi.fn<
      (
        entity: string,
        records: readonly Record<string, unknown>[],
      ) => Promise<Array<{ id: string }>>
    >(async (_entity, records) => records.map(() => ({ id: "c" })));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "createRecords",
            entity: "lineItem",
            count: { kind: "literal", value: 3 },
            data: {
              portion: {
                kind: "binary",
                op: "/",
                left: { kind: "field", source: "current", path: "total" },
                right: { kind: "literal", value: 3 },
              },
              __loopState: {
                kind: "binary",
                op: "-",
                left: {
                  kind: "call",
                  fn: "coalesce",
                  args: [
                    { kind: "var", name: "loopState" },
                    { kind: "field", source: "current", path: "total" },
                  ],
                },
                right: {
                  kind: "binary",
                  op: "/",
                  left: { kind: "field", source: "current", path: "total" },
                  right: { kind: "literal", value: 3 },
                },
              },
            },
          },
        ],
      },
      createContext({
        event: "loan.afterCreate",
        current: { total: 300 },
        services: {
          entities: mockHookEntityServices({ createMany }),
        },
      }),
    );

    const records = createMany.mock.calls[0]?.[1] ?? [];
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({ portion: 100 });
    expect(records[0]).not.toHaveProperty("__loopState");
    expect(records[1]).toMatchObject({ portion: 100 });
    expect(records[2]).toMatchObject({ portion: 100 });
  });

  it("rejects createRecords count above sync tier at runtime", async () => {
    await expect(
      runDataHook(
        {
          ...sampleDefinition,
          phase: "after",
          trigger: { operation: "create" },
          actions: [
            {
              type: "createRecords",
              entity: "commitment",
              count: { kind: "literal", value: 1_001 },
              data: {},
            },
          ],
        },
        createContext({
          event: "loan.afterCreate",
          services: {
            entities: mockHookEntityServices(),
          },
        }),
      ),
    ).rejects.toThrow(/exceeds the maximum of 1000/);
  });

  it("allows createRecords count above sync tier when queued", async () => {
    const createMany = vi.fn<
      (
        entity: string,
        records: readonly Record<string, unknown>[],
      ) => Promise<Array<{ id: string }>>
    >(async (_entity, records) => records.map(() => ({ id: "c" })));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        execution: "queued",
        trigger: { operation: "create" },
        actions: [
          {
            type: "createRecords",
            entity: "commitment",
            count: { kind: "literal", value: 1_500 },
            data: {
              sequence: { kind: "var", name: "loopIndex" },
            },
          },
        ],
      },
      createContext({
        event: "loan.afterCreate",
        services: {
          entities: mockHookEntityServices({ createMany }),
        },
      }),
    );

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0]?.[1]).toHaveLength(1_500);
  });

  it("updates matching related records", async () => {
    const update = vi.fn<
      (
        entity: string,
        id: string,
        data: Record<string, unknown>,
      ) => Promise<{ id: string }>
    >(async () => ({ id: "x" }));
    const list = vi.fn(async () => [
      {
        id: "cm_1",
        tenantId: "tenant_a",
        contractId: "loan_1",
        isActive: true,
      },
      {
        id: "cm_2",
        tenantId: "tenant_a",
        contractId: "loan_1",
        isActive: true,
      },
    ]);

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "update" },
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
            set: { isActive: { kind: "literal", value: false } },
          },
        ],
      },
      createContext({
        event: "loan.afterUpdate",
        current: { id: "loan_1" },
        previous: { id: "loan_1" },
        services: {
          entities: {
            create: vi.fn(),
            update,
            list,
            delete: vi.fn(),
            get: vi.fn(),
            createMany: vi.fn(async () => []),
          },
        },
      }),
    );

    expect(list).toHaveBeenCalledWith("commitment", {
      field: "contractId",
      value: "loan_1",
      limit: 10_000,
    });
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[0]?.[2]).toEqual({ isActive: false });
  });

  it("skips the hook when updateMatching ifNoMatches is skip and nothing matches", async () => {
    const recorder = {
      createPending: vi.fn(async () => ({ id: "exec_pending" })),
      markRunning: vi.fn(async () => undefined),
      beginRunning: vi.fn(async () => ({ id: "exec_running" })),
      finish: vi.fn(async () => undefined),
      createTerminal: vi.fn(async () => undefined),
    };
    const update = vi.fn(async () => ({ id: "x" }));
    const list = vi.fn(async () => []);

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "updateMatching",
            entity: "loanDetails",
            ifNoMatches: "skip",
            where: {
              type: "condition",
              field: "financialItemId",
              operator: "==",
              value: { kind: "field", source: "current", path: "id" },
            },
            set: {
              planRevision: { kind: "literal", value: 1 },
            },
          },
        ],
      },
      createContext({
        event: "loan.afterCreate",
        current: { id: "loan_1" },
        services: {
          entities: {
            create: vi.fn(),
            update,
            list,
            delete: vi.fn(),
            get: vi.fn(),
            createMany: vi.fn(async () => []),
          },
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(update).not.toHaveBeenCalled();
    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "skipped",
        error: "No matching records.",
      }),
    );
  });

  it("succeeds with empty updateMatching when ifNoMatches is omitted", async () => {
    const recorder = {
      createPending: vi.fn(async () => ({ id: "exec_pending" })),
      markRunning: vi.fn(async () => undefined),
      beginRunning: vi.fn(async () => ({ id: "exec_running" })),
      finish: vi.fn(async () => undefined),
      createTerminal: vi.fn(async () => undefined),
    };
    const update = vi.fn(async () => ({ id: "x" }));
    const list = vi.fn(async () => []);

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "updateMatching",
            entity: "loanDetails",
            where: {
              type: "condition",
              field: "financialItemId",
              operator: "==",
              value: { kind: "field", source: "current", path: "id" },
            },
            set: {
              planRevision: { kind: "literal", value: 1 },
            },
          },
        ],
      },
      createContext({
        event: "loan.afterCreate",
        current: { id: "loan_1" },
        services: {
          entities: {
            create: vi.fn(),
            update,
            list,
            delete: vi.fn(),
            get: vi.fn(),
            createMany: vi.fn(async () => []),
          },
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(update).not.toHaveBeenCalled();
    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success" }),
    );
  });

  it("updates matching records when ifNoMatches is skip and rows match", async () => {
    const recorder = {
      createPending: vi.fn(async () => ({ id: "exec_pending" })),
      markRunning: vi.fn(async () => undefined),
      beginRunning: vi.fn(async () => ({ id: "exec_running" })),
      finish: vi.fn(async () => undefined),
      createTerminal: vi.fn(async () => undefined),
    };
    const update = vi.fn(async () => ({ id: "ld_1" }));
    const list = vi.fn(async () => [
      {
        id: "ld_1",
        tenantId: "tenant_a",
        financialItemId: "loan_1",
        amortizationType: "FRENCH",
      },
    ]);

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "updateMatching",
            entity: "loanDetails",
            ifNoMatches: "skip",
            where: {
              type: "condition",
              field: "financialItemId",
              operator: "==",
              value: { kind: "field", source: "current", path: "id" },
            },
            set: {
              planRevision: { kind: "literal", value: 2 },
            },
          },
        ],
      },
      createContext({
        event: "loan.afterCreate",
        current: { id: "loan_1" },
        services: {
          entities: {
            create: vi.fn(),
            update,
            list,
            delete: vi.fn(),
            get: vi.fn(),
            createMany: vi.fn(async () => []),
          },
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(update).toHaveBeenCalledWith(
      "loanDetails",
      "ld_1",
      { planRevision: 2 },
      undefined,
    );
    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success" }),
    );
  });

  it("updates matching records with compound where tree", async () => {
    const update = vi.fn<
      (
        entity: string,
        id: string,
        data: Record<string, unknown>,
      ) => Promise<{ id: string }>
    >(async () => ({ id: "x" }));
    const list = vi.fn(async () => [
      {
        id: "ps_1",
        tenantId: "tenant_a",
        contractId: "loan_1",
        status: "UPCOMING",
      },
      {
        id: "ps_2",
        tenantId: "tenant_a",
        contractId: "loan_1",
        status: "PAID",
      },
      {
        id: "ps_3",
        tenantId: "tenant_a",
        contractId: "loan_1",
        status: "UPCOMING",
      },
    ]);

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "update" },
        actions: [
          {
            type: "updateMatching",
            entity: "paymentSchedule",
            where: {
              type: "group",
              combinator: "and",
              children: [
                {
                  type: "condition",
                  field: "contractId",
                  operator: "==",
                  value: { kind: "field", source: "current", path: "id" },
                },
                {
                  type: "condition",
                  field: "status",
                  operator: "==",
                  value: { kind: "literal", value: "UPCOMING" },
                },
              ],
            },
            set: { status: { kind: "literal", value: "SKIPPED" } },
          },
        ],
      },
      createContext({
        event: "loan.afterUpdate",
        current: { id: "loan_1" },
        previous: { id: "loan_1" },
        services: {
          entities: {
            create: vi.fn(),
            update,
            list,
            delete: vi.fn(),
            get: vi.fn(),
            createMany: vi.fn(async () => []),
          },
        },
      }),
    );

    expect(list).toHaveBeenCalledWith("paymentSchedule", {
      field: "contractId",
      value: "loan_1",
      limit: 10_000,
    });
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls.map((call) => call[1])).toEqual(["ps_1", "ps_3"]);
    expect(update.mock.calls[0]?.[2]).toEqual({ status: "SKIPPED" });
  });

  it("rejects updateMatching without an indexed lookup leaf", async () => {
    await expect(
      runDataHook(
        {
          ...sampleDefinition,
          phase: "after",
          trigger: { operation: "update" },
          actions: [
            {
              type: "updateMatching",
              entity: "commitment",
              where: {
                type: "group",
                combinator: "and",
                children: [
                  {
                    type: "condition",
                    field: "status",
                    operator: "isEmpty",
                  },
                ],
              },
              set: { isActive: { kind: "literal", value: false } },
            },
          ],
        },
        createContext({
          event: "loan.afterUpdate",
          current: { id: "loan_1" },
          services: {
            entities: {
              create: vi.fn(),
              update: vi.fn(),
              list: vi.fn(async () => []),
              delete: vi.fn(),
              get: vi.fn(),
              createMany: vi.fn(async () => []),
            },
          },
        }),
      ),
    ).rejects.toThrow(/== leaf with a value expression/);
  });

  it("deletes matching records with compound where tree", async () => {
    const deleteFn = vi.fn(async (_entity: string, id: string) => {
      void _entity;
      void id;
      return true;
    });
    const list = vi.fn(async () => [
      {
        id: "ps_1",
        tenantId: "tenant_a",
        financialItemId: "fi_1",
        status: "UPCOMING",
      },
      {
        id: "ps_2",
        tenantId: "tenant_a",
        financialItemId: "fi_1",
        status: "PAID",
      },
      {
        id: "ps_3",
        tenantId: "tenant_a",
        financialItemId: "fi_1",
        status: "UPCOMING",
      },
    ]);

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "update" },
        actions: [
          {
            type: "deleteMatching",
            entity: "paymentSchedule",
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
                  value: { kind: "literal", value: "UPCOMING" },
                },
              ],
            },
          },
        ],
      },
      createContext({
        event: "loan.afterUpdate",
        current: { id: "fi_1" },
        services: {
          entities: {
            create: vi.fn(),
            update: vi.fn(),
            list,
            delete: deleteFn,
            get: vi.fn(),
            createMany: vi.fn(async () => []),
          },
        },
      }),
    );

    expect(list).toHaveBeenCalledWith("paymentSchedule", {
      field: "financialItemId",
      value: "fi_1",
      limit: 10_000,
    });
    expect(deleteFn).toHaveBeenCalledTimes(2);
    expect(deleteFn.mock.calls.map((call) => call[1])).toEqual([
      "ps_1",
      "ps_3",
    ]);
  });

  it("deletes a record by evaluated id", async () => {
    const deleteFn = vi.fn(async (_entity: string, id: string) => {
      void _entity;
      void id;
      return true;
    });

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "deleteRecord",
            entity: "paymentSchedule",
            id: { kind: "field", source: "current", path: "paymentScheduleId" },
          },
        ],
      },
      createContext({
        event: "transaction.afterCreate",
        current: { paymentScheduleId: "ps_99" },
        services: {
          entities: {
            create: vi.fn(),
            update: vi.fn(),
            list: vi.fn(),
            delete: deleteFn,
            get: vi.fn(),
            createMany: vi.fn(async () => []),
          },
        },
      }),
    );

    expect(deleteFn.mock.calls[0]?.[0]).toBe("paymentSchedule");
    expect(deleteFn.mock.calls[0]?.[1]).toBe("ps_99");
  });

  it("loads a related record and uses loaded fields in createRecord", async () => {
    const get = vi.fn(async () => ({
      id: "fi_1",
      tenantId: "tenant_a",
      frequency: "MONTHLY",
    }));
    const create = vi.fn(async () => ({ id: "ld_1" }));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "getRecord",
            entity: "financialItem",
            as: "parent",
            id: {
              kind: "field",
              source: "current",
              path: "financialItemId",
            },
          },
          {
            type: "createRecord",
            entity: "loanDetails",
            data: {
              financialItemId: {
                kind: "field",
                source: "current",
                path: "financialItemId",
              },
              note: {
                kind: "field",
                source: "loaded",
                alias: "parent",
                path: "frequency",
              },
            },
          },
        ],
      },
      createContext({
        event: "loanDetails.afterCreate",
        current: { id: "ld_new", financialItemId: "fi_1" },
        services: {
          entities: {
            create,
            createMany: vi.fn(async () => []),
            update: vi.fn(),
            list: vi.fn(),
            delete: vi.fn(),
            get,
          },
        },
      }),
    );

    expect(get).toHaveBeenCalledWith("financialItem", "fi_1");
    expect(create).toHaveBeenCalledWith(
      "loanDetails",
      { financialItemId: "fi_1", note: "MONTHLY" },
      undefined,
    );
  });

  it("fails getRecord when the record is missing", async () => {
    const get = vi.fn(async () => {
      throw new Error('Record "missing" was not found for financialItem.');
    });

    await expect(
      runDataHook(
        {
          ...sampleDefinition,
          phase: "after",
          trigger: { operation: "create" },
          actions: [
            {
              type: "getRecord",
              entity: "financialItem",
              as: "parent",
              id: { kind: "literal", value: "missing" },
            },
          ],
        },
        createContext({
          services: {
            entities: {
              create: vi.fn(),
              createMany: vi.fn(async () => []),
              update: vi.fn(),
              list: vi.fn(),
              delete: vi.fn(),
              get,
            },
          },
        }),
      ),
    ).rejects.toThrow(/not found/);
  });

  it("getOrCreateRecord reuses an existing match", async () => {
    const list = vi.fn(async () => [
      {
        id: "cat_1",
        tenantId: "tenant_a",
        name: "Transportation",
        kind: "EXPENSE",
      },
    ]);
    const create = vi.fn(async () => ({ id: "cat_new" }));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "getOrCreateRecord",
            entity: "category",
            as: "category",
            where: {
              type: "condition",
              field: "name",
              operator: "==",
              value: {
                kind: "field",
                source: "current",
                path: "categoryName",
              },
            },
            data: {
              name: {
                kind: "field",
                source: "current",
                path: "categoryName",
              },
              kind: { kind: "literal", value: "EXPENSE" },
            },
          },
          {
            type: "createRecord",
            entity: "transaction",
            data: {
              categoryId: {
                kind: "field",
                source: "loaded",
                alias: "category",
                path: "id",
              },
            },
          },
        ],
      },
      createContext({
        event: "financialItem.afterEmail",
        current: { id: "fi_1", categoryName: "Transportation" },
        services: {
          entities: {
            create,
            createMany: vi.fn(async () => []),
            update: vi.fn(),
            list,
            delete: vi.fn(),
            get: vi.fn(),
          },
        },
      }),
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      "transaction",
      { categoryId: "cat_1" },
      undefined,
    );
  });

  it("getOrCreateRecord creates when no match exists", async () => {
    const list = vi.fn(async () => []);
    const create = vi.fn(
      async (_entity: string, data: Record<string, unknown>) => {
        if (_entity === "category") {
          return { id: "cat_new", tenantId: "tenant_a", ...data };
        }
        return { id: "tx_1", ...data };
      },
    );

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "getOrCreateRecord",
            entity: "category",
            as: "category",
            where: {
              type: "condition",
              field: "name",
              operator: "==",
              value: {
                kind: "field",
                source: "current",
                path: "categoryName",
              },
            },
            data: {
              name: {
                kind: "field",
                source: "current",
                path: "categoryName",
              },
              kind: { kind: "literal", value: "EXPENSE" },
            },
          },
          {
            type: "createRecord",
            entity: "transaction",
            data: {
              categoryId: {
                kind: "field",
                source: "loaded",
                alias: "category",
                path: "id",
              },
            },
          },
        ],
      },
      createContext({
        event: "financialItem.afterEmail",
        current: { id: "fi_1", categoryName: "Transportation" },
        services: {
          entities: {
            create,
            createMany: vi.fn(async () => []),
            update: vi.fn(),
            list,
            delete: vi.fn(),
            get: vi.fn(),
          },
        },
      }),
    );

    expect(create).toHaveBeenCalledWith(
      "category",
      { name: "Transportation", kind: "EXPENSE" },
      undefined,
    );
    expect(create).toHaveBeenCalledWith(
      "transaction",
      { categoryId: "cat_new" },
      undefined,
    );
  });

  it("matchRelatedRecord scores aliases against haystack and loads the winner", async () => {
    const list = vi.fn(async () => [
      {
        id: "child_netflix",
        tenantId: "tenant_a",
        name: "Netflix",
        billingAliases: ["NETFLIX"],
        parentFinancialItemId: "card_1",
        status: "ACTIVE",
      },
      {
        id: "child_google",
        tenantId: "tenant_a",
        name: "Google One",
        billingAliases: ["GOOGLE *GOOGLE ONE"],
        parentFinancialItemId: "card_1",
        status: "ACTIVE",
      },
    ]);
    const create = vi.fn(async () => ({ id: "txn_1" }));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { kind: "email" },
        actions: [
          {
            type: "matchRelatedRecord",
            entity: "financialItem",
            as: "subscription",
            aliasField: "billingAliases",
            haystack: {
              kind: "call",
              fn: "coalesce",
              args: [
                {
                  kind: "field",
                  source: "current",
                  path: "__extracted.fields.description",
                },
                {
                  kind: "field",
                  source: "current",
                  path: "__email.subject",
                },
                { kind: "literal", value: "" },
              ],
            },
            where: {
              type: "group",
              combinator: "and",
              children: [
                {
                  type: "condition",
                  field: "parentFinancialItemId",
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
                  value: { kind: "literal", value: "ACTIVE" },
                },
              ],
            },
          },
          {
            type: "createRecord",
            entity: "transaction",
            data: {
              financialItemId: {
                kind: "call",
                fn: "coalesce",
                args: [
                  {
                    kind: "field",
                    source: "loaded",
                    alias: "subscription",
                    path: "id",
                  },
                  {
                    kind: "field",
                    source: "current",
                    path: "id",
                  },
                ],
              },
            },
          },
        ],
      },
      createContext({
        event: "financialItem.afterEmail",
        current: {
          id: "card_1",
          __extracted: {
            fields: {
              description: "PURCHASE GOOGLE *GOOGLE ONE STORE",
            },
          },
        },
        services: {
          entities: {
            create,
            createMany: vi.fn(async () => []),
            update: vi.fn(),
            list,
            delete: vi.fn(),
            get: vi.fn(),
          },
        },
      }),
    );

    expect(list).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      "transaction",
      { financialItemId: "child_google" },
      undefined,
    );
  });

  it("matchRelatedRecord loads null for empty haystack without listing", async () => {
    const list = vi.fn(async () => []);
    const create = vi.fn(async () => ({ id: "txn_1" }));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { kind: "email" },
        actions: [
          {
            type: "matchRelatedRecord",
            entity: "financialItem",
            as: "subscription",
            aliasField: "billingAliases",
            haystack: {
              kind: "literal",
              value: "   ",
            },
            where: {
              type: "condition",
              field: "parentFinancialItemId",
              operator: "==",
              value: {
                kind: "field",
                source: "current",
                path: "id",
              },
            },
          },
          {
            type: "createRecord",
            entity: "transaction",
            data: {
              financialItemId: {
                kind: "call",
                fn: "coalesce",
                args: [
                  {
                    kind: "field",
                    source: "loaded",
                    alias: "subscription",
                    path: "id",
                  },
                  {
                    kind: "field",
                    source: "current",
                    path: "id",
                  },
                ],
              },
            },
          },
        ],
      },
      createContext({
        event: "financialItem.afterEmail",
        current: { id: "card_1" },
        services: {
          entities: {
            create,
            createMany: vi.fn(async () => []),
            update: vi.fn(),
            list,
            delete: vi.fn(),
            get: vi.fn(),
          },
        },
      }),
    );

    expect(list).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      "transaction",
      { financialItemId: "card_1" },
      undefined,
    );
  });

  it("getOrCreateRecord with createIfMissing false loads null without creating", async () => {
    const list = vi.fn(async () => []);
    const create = vi.fn(async () => ({ id: "should_not_create" }));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "getOrCreateRecord",
            entity: "financialItem",
            as: "subscription",
            createIfMissing: false,
            where: {
              type: "group",
              combinator: "and",
              children: [
                {
                  type: "condition",
                  field: "name",
                  operator: "==",
                  value: {
                    kind: "field",
                    source: "current",
                    path: "matchedSubscriptionName",
                  },
                },
                {
                  type: "condition",
                  field: "parentFinancialItemId",
                  operator: "==",
                  value: {
                    kind: "field",
                    source: "current",
                    path: "id",
                  },
                },
              ],
            },
          },
          {
            type: "createRecord",
            entity: "transaction",
            data: {
              financialItemId: {
                kind: "call",
                fn: "coalesce",
                args: [
                  {
                    kind: "field",
                    source: "loaded",
                    alias: "subscription",
                    path: "id",
                  },
                  {
                    kind: "field",
                    source: "current",
                    path: "id",
                  },
                ],
              },
            },
          },
        ],
      },
      createContext({
        event: "financialItem.afterEmail",
        current: {
          id: "card_1",
          matchedSubscriptionName: "Netflix",
        },
        services: {
          entities: {
            create,
            createMany: vi.fn(async () => []),
            update: vi.fn(),
            list,
            delete: vi.fn(),
            get: vi.fn(),
          },
        },
      }),
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      "transaction",
      { financialItemId: "card_1" },
      undefined,
    );
    expect(create).not.toHaveBeenCalledWith(
      "financialItem",
      expect.anything(),
      expect.anything(),
    );
  });

  it("getOrCreateRecord loads null when lookup is empty", async () => {
    const list = vi.fn(async () => []);
    const create = vi.fn(async () => ({ id: "tx_1" }));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "getOrCreateRecord",
            entity: "category",
            as: "category",
            where: {
              type: "condition",
              field: "name",
              operator: "==",
              value: {
                kind: "field",
                source: "current",
                path: "categoryName",
              },
            },
            data: {
              name: {
                kind: "field",
                source: "current",
                path: "categoryName",
              },
              kind: { kind: "literal", value: "EXPENSE" },
            },
          },
          {
            type: "createRecord",
            entity: "transaction",
            data: {
              categoryId: {
                kind: "call",
                fn: "coalesce",
                args: [
                  {
                    kind: "field",
                    source: "loaded",
                    alias: "category",
                    path: "id",
                  },
                  {
                    kind: "field",
                    source: "current",
                    path: "fallbackCategoryId",
                  },
                ],
              },
            },
          },
        ],
      },
      createContext({
        event: "financialItem.afterEmail",
        current: {
          id: "fi_1",
          categoryName: null,
          fallbackCategoryId: "cat_fallback",
        },
        services: {
          entities: {
            create,
            createMany: vi.fn(async () => []),
            update: vi.fn(),
            list,
            delete: vi.fn(),
            get: vi.fn(),
          },
        },
      }),
    );

    expect(list).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      "transaction",
      { categoryId: "cat_fallback" },
      undefined,
    );
  });

  it("aggregates matching records and uses aggregate alias in setField", async () => {
    const list = vi.fn(async () => [
      {
        id: "row_1",
        tenantId: "tenant_a",
        parentId: "parent_1",
        dueDate: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "row_2",
        tenantId: "tenant_a",
        parentId: "parent_1",
        dueDate: "2026-01-15T00:00:00.000Z",
      },
      {
        id: "row_3",
        tenantId: "tenant_a",
        parentId: "parent_1",
        dueDate: "2026-06-01T00:00:00.000Z",
      },
    ]);
    const update = vi.fn(async () => ({ id: "parent_1" }));
    const context = createContext({
      entityName: "parent",
      event: "parent.afterUpdate",
      current: { id: "parent_1" },
      services: {
        entities: {
          create: vi.fn(),
          update,
          list,
          delete: vi.fn(),
          get: vi.fn(),
          createMany: vi.fn(async () => []),
        },
      },
    });

    await runDataHook(
      {
        ...sampleDefinition,
        entity: "parent",
        phase: "after",
        trigger: { operation: "update" },
        actions: [
          {
            type: "aggregateMatching",
            entity: "childRow",
            op: "min",
            field: "dueDate",
            as: "nextDue",
            where: {
              type: "condition",
              field: "parentId",
              operator: "==",
              value: { kind: "field", source: "current", path: "id" },
            },
          },
          {
            type: "setField",
            field: "nextDueDate",
            value: {
              kind: "field",
              source: "aggregate",
              alias: "nextDue",
            },
          },
        ],
      },
      context,
    );

    expect(list).toHaveBeenCalled();
    expect(context.current.nextDueDate).toBe("2026-01-15T00:00:00.000Z");
    expect(update).toHaveBeenCalledWith(
      "parent",
      "parent_1",
      { nextDueDate: "2026-01-15T00:00:00.000Z" },
      undefined,
    );
  });

  it("returns zero for count aggregate with no matches", async () => {
    const list = vi.fn(async () => []);
    const context = createContext({
      current: { id: "parent_1" },
      services: {
        entities: {
          create: vi.fn(),
          update: vi.fn(),
          list,
          delete: vi.fn(),
          get: vi.fn(),
          createMany: vi.fn(async () => []),
        },
      },
    });

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "before",
        trigger: { operation: "update" },
        actions: [
          {
            type: "aggregateMatching",
            entity: "childRow",
            op: "count",
            as: "total",
            where: {
              type: "condition",
              field: "parentId",
              operator: "==",
              value: { kind: "literal", value: "parent_1" },
            },
          },
          {
            type: "setField",
            field: "childCount",
            value: {
              kind: "field",
              source: "aggregate",
              alias: "total",
            },
          },
        ],
      },
      context,
    );

    expect(context.current.childCount).toBe(0);
  });

  it("rejects deleteMatching in before phase", async () => {
    await expect(
      runDataHook(
        {
          ...sampleDefinition,
          phase: "before",
          trigger: { operation: "update" },
          actions: [
            {
              type: "deleteMatching",
              entity: "paymentSchedule",
              where: {
                type: "condition",
                field: "financialItemId",
                operator: "==",
                value: { kind: "field", source: "current", path: "id" },
              },
            },
          ],
        },
        createContext({
          event: "loan.beforeUpdate",
          current: { id: "fi_1" },
          services: {
            entities: {
              create: vi.fn(),
              update: vi.fn(),
              list: vi.fn(),
              delete: vi.fn(),
              get: vi.fn(),
              createMany: vi.fn(async () => []),
            },
          },
        }),
      ),
    ).rejects.toThrow(/after-phase hooks/);
  });

  it("evaluates nested AND condition trees", async () => {
    const context = createContext({
      current: { amount: 100, status: "ACTIVE", commitmentAmount: 100 },
    });

    await runDataHook(
      {
        ...sampleDefinition,
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
            {
              type: "condition",
              field: "status",
              operator: "==",
              value: { kind: "literal", value: "ACTIVE" },
            },
          ],
        },
        actions: [
          {
            type: "setField",
            field: "approved",
            value: { kind: "literal", value: true },
          },
        ],
      },
      context,
    );

    expect(context.current.approved).toBe(true);
  });

  it("short-circuits OR groups when a child matches", async () => {
    const context = createContext({
      current: { amount: 50, status: "ACTIVE" },
    });

    await runDataHook(
      {
        ...sampleDefinition,
        condition: {
          type: "group",
          combinator: "or",
          children: [
            {
              type: "condition",
              field: "amount",
              operator: ">=",
              value: { kind: "literal", value: 100 },
            },
            {
              type: "condition",
              field: "status",
              operator: "==",
              value: { kind: "literal", value: "ACTIVE" },
            },
          ],
        },
        actions: [
          {
            type: "setField",
            field: "matched",
            value: { kind: "literal", value: true },
          },
        ],
      },
      context,
    );

    expect(context.current.matched).toBe(true);
  });

  it("runs when an empty condition group is configured", async () => {
    const context = createContext();

    await runDataHook(
      {
        ...sampleDefinition,
        condition: {
          type: "group",
          combinator: "and",
          children: [],
        },
        actions: [
          {
            type: "setField",
            field: "ran",
            value: { kind: "literal", value: true },
          },
        ],
      },
      context,
    );

    expect(context.current.ran).toBe(true);
  });

  it("passes chainHooks write options when chaining is enabled", async () => {
    const create = vi.fn(async () => ({ id: "payment_1" }));
    const context = createContext({
      event: "loan.afterCreate",
      services: {
        logger: { info: vi.fn(), error: vi.fn() },
        entities: {
          create,
          update: vi.fn(),
          list: vi.fn(),
          delete: vi.fn(),
          get: vi.fn(),
          createMany: vi.fn(async () => []),
        },
      },
    });

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        chainHooks: true,
        actions: [
          {
            type: "createRecord",
            entity: "payment",
            data: {
              note: { kind: "literal", value: "linked" },
            },
          },
        ],
      },
      context,
    );

    expect(create).toHaveBeenCalledWith(
      "payment",
      { note: "linked" },
      expect.objectContaining({ chainHooks: true }),
    );
  });

  it("skips when the hook id is already visited in the chain", async () => {
    const context = createContext({
      visitedHookIds: new Set(["hook_1"]),
    });

    await runDataHook(sampleDefinition, context);

    expect(context.current.status).toBeUndefined();
  });

  it("skips when depth exceeds the configured limit", async () => {
    const context = createContext({ depth: 6 });

    await runDataHook(sampleDefinition, context);

    expect(context.current.status).toBeUndefined();
  });
});

describe("compileDataHook", () => {
  it("runs deferred after hooks without blocking the caller", async () => {
    const info = vi.fn();
    const handler = compileDataHook({
      ...sampleDefinition,
      phase: "after",
      trigger: { operation: "create" },
      execution: "deferred",
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "deferred" },
        },
      ],
    });

    await handler(
      createContext({
        event: "loan.afterCreate",
        services: {
          logger: { info, error: vi.fn() },
        },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(info).toHaveBeenCalled();
  });

  it("enqueues queued after hooks when enqueue service is present", async () => {
    const enqueue = vi.fn(async () => undefined);
    const handler = compileDataHook({
      ...sampleDefinition,
      id: "hook_queued",
      phase: "after",
      trigger: { operation: "create" },
      execution: "queued",
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "queued" },
        },
      ],
    });

    await handler(
      createContext({
        event: "loan.afterCreate",
        services: {
          enqueueDataHookJob: enqueue,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        hookId: "hook_queued",
        tenantId: "tenant_a",
        entityName: "loan",
        phase: "after",
        operation: "create",
      }),
    );
  });

  it("falls back to deferred execution when queued hook has no enqueue service", async () => {
    const info = vi.fn();
    const handler = compileDataHook({
      ...sampleDefinition,
      phase: "after",
      trigger: { operation: "create" },
      execution: "queued",
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "queued-fallback" },
        },
      ],
    });

    await handler(
      createContext({
        event: "loan.afterCreate",
        services: {
          logger: { info, error: vi.fn() },
        },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(info).toHaveBeenCalled();
  });

  it("logs sendNotification with the evaluated message and hook context", async () => {
    const info = vi.fn();
    const handler = compileDataHook({
      ...sampleDefinition,
      phase: "after",
      trigger: { operation: "create" },
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "Origination date missing" },
        },
      ],
    });

    await handler(
      createContext({
        event: "loanDetails.afterCreate",
        entityName: "loanDetails",
        current: { id: "loan_1" },
        services: {
          logger: { info, error: vi.fn() },
        },
      }),
    );

    expect(info).toHaveBeenCalledWith("Origination date missing", {
      hookId: "hook_1",
      hookName: "Set status",
      entityName: "loanDetails",
      event: "loanDetails.afterCreate",
      tenantId: "tenant_a",
      action: "sendNotification",
      recordId: "loan_1",
    });
  });

  it("delivers sendNotification to sendUserNotification when wired", async () => {
    const info = vi.fn();
    const sendUserNotification = vi.fn(async () => undefined);
    const handler = compileDataHook({
      ...sampleDefinition,
      phase: "after",
      trigger: { operation: "create" },
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "Loan plan generated" },
        },
      ],
    });

    await handler(
      createContext({
        event: "loanDetails.afterCreate",
        entityName: "loanDetails",
        current: { id: "loan_1" },
        services: {
          logger: { info, error: vi.fn() },
          sendUserNotification,
        },
      }),
    );

    expect(sendUserNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        message: "Loan plan generated",
        level: "info",
        hookId: "hook_1",
        hookName: "Set status",
        entityName: "loanDetails",
        event: "loanDetails.afterCreate",
        recordId: "loan_1",
      }),
    );
  });

  it("delivers sendUserNotification with recordEntity and recordId overrides", async () => {
    const sendUserNotification = vi.fn(async () => undefined);
    const handler = compileDataHook({
      ...sampleDefinition,
      phase: "after",
      trigger: { operation: "create" },
      actions: [
        {
          type: "sendNotification",
          message: {
            kind: "call",
            fn: "concat",
            args: [
              { kind: "literal", value: "Generated plan for " },
              {
                kind: "field",
                source: "loaded",
                alias: "parent",
                path: "name",
              },
            ],
          },
          recordEntity: { kind: "literal", value: "financialItem" },
          recordId: {
            kind: "field",
            source: "loaded",
            alias: "parent",
            path: "id",
          },
        },
      ],
    });

    await handler(
      createContext({
        event: "loanDetails.afterCreate",
        entityName: "loanDetails",
        current: { id: "loan_1", financialItemId: "fi_1" },
        loaded: { parent: { id: "fi_1", name: "Hipoteca Altavista" } },
        services: {
          logger: { info: vi.fn(), error: vi.fn() },
          sendUserNotification,
        },
      }),
    );

    expect(sendUserNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Generated plan for Hipoteca Altavista",
        entityName: "financialItem",
        recordId: "fi_1",
      }),
    );
  });

  it("delivers sendUserNotification when success message uses aggregate count", async () => {
    const list = vi.fn(async () => [
      {
        id: "ps_1",
        tenantId: "tenant_test",
        financialItemId: "fi_1",
        status: "UPCOMING",
      },
      {
        id: "ps_2",
        tenantId: "tenant_test",
        financialItemId: "fi_1",
        status: "UPCOMING",
      },
    ]);
    const sendUserNotification = vi.fn(async () => undefined);
    const handler = compileDataHook({
      ...sampleDefinition,
      phase: "after",
      trigger: { operation: "create" },
      actions: [
        {
          type: "aggregateMatching",
          entity: "paymentSchedule",
          op: "count",
          as: "scheduleRowCount",
          where: {
            type: "condition",
            field: "financialItemId",
            operator: "==",
            value: { kind: "field", source: "current", path: "id" },
          },
        },
        {
          type: "sendNotification",
          message: {
            kind: "call",
            fn: "concat",
            args: [
              { kind: "literal", value: "Created " },
              {
                kind: "field",
                source: "aggregate",
                alias: "scheduleRowCount",
              },
              { kind: "literal", value: " payment schedule row(s)" },
            ],
          },
        },
      ],
    });

    await handler(
      createContext({
        event: "financialItem.afterCreate",
        entityName: "financialItem",
        current: { id: "fi_1" },
        services: {
          logger: { info: vi.fn(), error: vi.fn() },
          entities: {
            create: vi.fn(),
            createMany: vi.fn(async () => []),
            update: vi.fn(),
            list,
            delete: vi.fn(),
            get: vi.fn(),
          },
          sendUserNotification,
        },
      }),
    );

    expect(sendUserNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        message: "Created 2 payment schedule row(s)",
        entityName: "financialItem",
      }),
    );
  });

  it("skips sendNotification logging when the evaluated message is empty", async () => {
    const info = vi.fn();
    const handler = compileDataHook({
      ...sampleDefinition,
      phase: "after",
      trigger: { operation: "create" },
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "" },
        },
      ],
    });

    await handler(
      createContext({
        event: "loanDetails.afterCreate",
        entityName: "loanDetails",
        services: {
          logger: { info, error: vi.fn() },
        },
      }),
    );

    expect(info).not.toHaveBeenCalled();
  });
});

describe("callWebhook action", () => {
  it("delegates to callWebhook service with default body", async () => {
    const callWebhook = vi.fn(async () => undefined);
    const context = createContext({
      event: "loan.afterCreate",
      current: { id: "loan_1", amount: 100 },
      services: {
        callWebhook,
        logger: { info: vi.fn(), error: vi.fn() },
      },
    });

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "callWebhook",
            url: { kind: "literal", value: "https://example.com/hook" },
          },
        ],
      },
      context,
    );

    expect(callWebhook).toHaveBeenCalledWith({
      url: "https://example.com/hook",
      body: {
        tenantId: "tenant_a",
        entityName: "loan",
        event: "loan.afterCreate",
        current: { id: "loan_1", amount: 100 },
        user: { uid: "user_1" },
      },
    });
  });

  it("throws when callWebhook service is missing", async () => {
    await expect(
      runDataHook(
        {
          ...sampleDefinition,
          actions: [
            {
              type: "callWebhook",
              url: { kind: "literal", value: "https://example.com/hook" },
            },
          ],
        },
        createContext(),
      ),
    ).rejects.toThrow(HookExecutionError);
  });
});

describe("callAi action", () => {
  it("delegates to callAi service and loads the result", async () => {
    const callAi = vi.fn(async () => ({
      categoryId: "cat_1",
      confidence: 0.9,
    }));
    const loaded: Record<string, Record<string, unknown> | null> = {};
    const context = createContext({
      event: "loan.beforeCreate",
      current: { id: "txn_1", description: "UBER TRIP" },
      loaded,
      services: {
        callAi,
        logger: { info: vi.fn(), error: vi.fn() },
      },
    });

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "before",
        trigger: { operation: "create" },
        actions: [
          {
            type: "callAi",
            prompt: {
              kind: "call",
              fn: "concat",
              args: [
                { kind: "literal", value: "Classify: " },
                {
                  kind: "field",
                  source: "current",
                  path: "description",
                },
              ],
            },
            includeEntities: ["category"],
            as: "classification",
          },
          {
            type: "setField",
            field: "categoryId",
            value: {
              kind: "field",
              source: "loaded",
              alias: "classification",
              path: "categoryId",
            },
          },
        ],
      },
      context,
    );

    expect(callAi).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Classify: UBER TRIP",
        tenantId: "tenant_a",
        includeEntities: ["category"],
      }),
    );
    expect(context.current.categoryId).toBe("cat_1");
    expect(loaded.classification).toEqual({
      categoryId: "cat_1",
      confidence: 0.9,
    });
  });

  it("skips the model call when when is falsey and loads null", async () => {
    const callAi = vi.fn(async () => ({ categoryId: "cat_1" }));
    const loaded: Record<string, Record<string, unknown> | null> = {};
    const context = createContext({
      loaded,
      services: {
        callAi,
        logger: { info: vi.fn(), error: vi.fn() },
      },
    });

    await runDataHook(
      {
        ...sampleDefinition,
        actions: [
          {
            type: "callAi",
            prompt: { kind: "literal", value: "Classify" },
            when: { kind: "literal", value: false },
            as: "classification",
          },
        ],
      },
      context,
    );

    expect(callAi).not.toHaveBeenCalled();
    expect(loaded.classification).toBeNull();
  });

  it("throws when callAi service is missing", async () => {
    await expect(
      runDataHook(
        {
          ...sampleDefinition,
          actions: [
            {
              type: "callAi",
              prompt: { kind: "literal", value: "Classify" },
              as: "classification",
            },
          ],
        },
        createContext(),
      ),
    ).rejects.toThrow(HookExecutionError);
  });
});

describe("AI enrichment actions", () => {
  it("computeRecordAiSummary loads ok without writing record fields", async () => {
    const computeRecordAiSummary = vi.fn(async () => ({
      ok: true as const,
      contextChanged: true,
    }));
    const current = { id: "record_1", name: "Ada" };
    const loaded: Record<string, Record<string, unknown> | null> = {};

    await runDataHook(
      {
        ...sampleDefinition,
        actions: [
          {
            type: "computeRecordAiSummary",
            as: "summary",
          },
        ],
      },
      createContext({
        current,
        loaded,
        services: {
          computeRecordAiSummary,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(computeRecordAiSummary).toHaveBeenCalledWith({
      tenantId: "tenant_a",
      entityName: "loan",
      recordId: "record_1",
      record: current,
    });
    expect(current).toEqual({ id: "record_1", name: "Ada" });
    expect(loaded.summary).toEqual({ ok: true, contextChanged: true });
  });

  it("computeEmbedding loads values from the service", async () => {
    const computeEmbedding = vi.fn(async () => [0.1, 0.2, 0.3] as const);
    const loaded: Record<string, Record<string, unknown> | null> = {};
    await runDataHook(
      {
        ...sampleDefinition,
        actions: [
          {
            type: "computeEmbedding",
            text: { kind: "literal", value: "UBER TRIP" },
            as: "embedding",
          },
        ],
      },
      createContext({
        loaded,
        services: {
          computeEmbedding,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );
    expect(computeEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({ text: "UBER TRIP" }),
    );
    expect(loaded.embedding).toEqual({ values: [0.1, 0.2, 0.3] });
  });

  it("computeEmbedding skips when when is falsey", async () => {
    const computeEmbedding = vi.fn(async () => [0.1, 0.2, 0.3] as const);
    const loaded: Record<string, Record<string, unknown> | null> = {};
    await runDataHook(
      {
        ...sampleDefinition,
        actions: [
          {
            type: "computeEmbedding",
            text: { kind: "literal", value: "UBER TRIP" },
            when: { kind: "literal", value: false },
            as: "embedding",
          },
        ],
      },
      createContext({
        loaded,
        services: {
          computeEmbedding,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );
    expect(computeEmbedding).not.toHaveBeenCalled();
    expect(loaded.embedding).toBeNull();
  });

  it("matchSimilarRecord picks the closest candidate above minScore", async () => {
    const query = [1, 0, 0];
    const computeEmbedding = vi.fn(async () => query);
    const list = vi.fn(async () => [
      {
        id: "ex_rappi",
        tenantId: "tenant_a",
        enabled: true,
        embedding: [0, 1, 0],
      },
      {
        id: "ex_uber",
        tenantId: "tenant_a",
        enabled: true,
        embedding: [0.99, 0.01, 0],
      },
    ]);
    const loaded: Record<string, Record<string, unknown> | null> = {};

    await runDataHook(
      {
        ...sampleDefinition,
        actions: [
          {
            type: "matchSimilarRecord",
            entity: "categoryExample",
            where: {
              type: "condition",
              field: "enabled",
              operator: "==",
              value: { kind: "literal", value: true },
            },
            haystack: { kind: "literal", value: "UBER TRIP HELP" },
            embeddingField: "embedding",
            minScore: 0.5,
            as: "example",
          },
        ],
      },
      createContext({
        loaded,
        services: {
          computeEmbedding,
          entities: {
            list,
            get: vi.fn(),
            create: vi.fn(),
            createMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(loaded.example?.id).toBe("ex_uber");
  });
});

describe("resolution source tracing", () => {
  function createMockRecorder() {
    return {
      createPending: vi.fn(async () => ({ id: "exec_pending" })),
      markRunning: vi.fn(async () => undefined),
      beginRunning: vi.fn(async () => ({ id: "exec_running" })),
      finish: vi.fn(async () => undefined),
      createTerminal: vi.fn(async () => undefined),
    };
  }

  it("records directMatch when matchRelatedRecord hits", async () => {
    const recorder = createMockRecorder();
    const list = vi.fn(async () => [
      {
        id: "txn_prior",
        tenantId: "tenant_a",
        categorizationStatus: "DONE",
        description: "UBER TRIP",
        categoryId: "cat_transport",
      },
    ]);

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "matchRelatedRecord",
            entity: "transaction",
            where: {
              type: "condition",
              field: "categorizationStatus",
              operator: "==",
              value: { kind: "literal", value: "DONE" },
            },
            haystack: {
              kind: "field",
              source: "current",
              path: "description",
            },
            aliasField: "description",
            as: "priorTxn",
          },
          {
            type: "callAi",
            prompt: { kind: "literal", value: "Classify" },
            when: {
              kind: "call",
              fn: "isEmpty",
              args: [
                {
                  kind: "field",
                  source: "loaded",
                  alias: "priorTxn",
                  path: "categoryId",
                },
              ],
            },
            as: "llmMatch",
          },
        ],
      },
      createContext({
        event: "transaction.afterCreate",
        entityName: "transaction",
        current: {
          id: "txn_1",
          description: "UBER TRIP",
          categorizationStatus: "PENDING",
        },
        services: {
          dataHookExecutionRecorder: recorder,
          callAi: vi.fn(async () => ({ categoryId: "should_not_run" })),
          entities: {
            list,
            get: vi.fn(),
            create: vi.fn(),
            createMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        resolutionSource: "directMatch",
        actionTrace: expect.arrayContaining([
          expect.objectContaining({
            type: "matchRelatedRecord",
            outcome: "ran",
            matched: true,
            as: "priorTxn",
          }),
          expect.objectContaining({
            type: "callAi",
            outcome: "skipped",
            matched: false,
            as: "llmMatch",
          }),
        ]),
      }),
    );
  });

  it("records embeddingMatch with score and skips callAi", async () => {
    const recorder = createMockRecorder();
    const query = [1, 0, 0];
    const computeEmbedding = vi.fn(async () => query);
    const callAi = vi.fn(async () => ({ categoryId: "should_not_run" }));
    const list = vi.fn(async (entity: string) => {
      if (entity === "transaction") {
        return [];
      }
      return [
        {
          id: "ex_uber",
          tenantId: "tenant_a",
          enabled: true,
          categoryId: "cat_transport",
          embedding: [0.99, 0.01, 0],
        },
      ];
    });

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "matchRelatedRecord",
            entity: "transaction",
            where: {
              type: "condition",
              field: "categorizationStatus",
              operator: "==",
              value: { kind: "literal", value: "DONE" },
            },
            haystack: {
              kind: "field",
              source: "current",
              path: "description",
            },
            aliasField: "description",
            as: "priorTxn",
          },
          {
            type: "matchSimilarRecord",
            entity: "categoryExample",
            where: {
              type: "condition",
              field: "enabled",
              operator: "==",
              value: { kind: "literal", value: true },
            },
            haystack: {
              kind: "field",
              source: "current",
              path: "description",
            },
            embeddingField: "embedding",
            minScore: 0.5,
            when: {
              kind: "call",
              fn: "isEmpty",
              args: [
                {
                  kind: "field",
                  source: "loaded",
                  alias: "priorTxn",
                  path: "categoryId",
                },
              ],
            },
            as: "example",
          },
          {
            type: "callAi",
            prompt: { kind: "literal", value: "Classify" },
            when: {
              kind: "call",
              fn: "isEmpty",
              args: [
                {
                  kind: "call",
                  fn: "coalesce",
                  args: [
                    {
                      kind: "field",
                      source: "loaded",
                      alias: "priorTxn",
                      path: "categoryId",
                    },
                    {
                      kind: "field",
                      source: "loaded",
                      alias: "example",
                      path: "categoryId",
                    },
                  ],
                },
              ],
            },
            as: "llmMatch",
          },
        ],
      },
      createContext({
        event: "transaction.afterCreate",
        entityName: "transaction",
        current: {
          id: "txn_1",
          description: "UBER TRIP HELP",
          categorizationStatus: "PENDING",
        },
        services: {
          dataHookExecutionRecorder: recorder,
          callAi,
          computeEmbedding,
          entities: {
            list,
            get: vi.fn(),
            create: vi.fn(),
            createMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(callAi).not.toHaveBeenCalled();
    expect(computeEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({
        hookExecutionId: "exec_running",
      }),
    );
    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        resolutionSource: "embeddingMatch",
        actionTrace: expect.arrayContaining([
          expect.objectContaining({
            type: "matchSimilarRecord",
            outcome: "ran",
            matched: true,
            as: "example",
            score: expect.any(Number),
          }),
          expect.objectContaining({
            type: "callAi",
            outcome: "skipped",
            matched: false,
          }),
        ]),
      }),
    );
  });

  it("records llm when matches miss and passes hookExecutionId", async () => {
    const recorder = createMockRecorder();
    const callAi = vi.fn(async () => ({ categoryId: "cat_food" }));
    const list = vi.fn(async () => []);

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "matchRelatedRecord",
            entity: "transaction",
            where: {
              type: "condition",
              field: "categorizationStatus",
              operator: "==",
              value: { kind: "literal", value: "DONE" },
            },
            haystack: {
              kind: "field",
              source: "current",
              path: "description",
            },
            aliasField: "description",
            as: "priorTxn",
          },
          {
            type: "callAi",
            prompt: { kind: "literal", value: "Classify" },
            when: {
              kind: "call",
              fn: "isEmpty",
              args: [
                {
                  kind: "field",
                  source: "loaded",
                  alias: "priorTxn",
                  path: "categoryId",
                },
              ],
            },
            as: "llmMatch",
          },
        ],
      },
      createContext({
        event: "transaction.afterCreate",
        entityName: "transaction",
        current: {
          id: "txn_1",
          description: "UNKNOWN MERCHANT",
          categorizationStatus: "PENDING",
        },
        services: {
          dataHookExecutionRecorder: recorder,
          callAi,
          entities: {
            list,
            get: vi.fn(),
            create: vi.fn(),
            createMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(callAi).toHaveBeenCalledWith(
      expect.objectContaining({
        hookExecutionId: "exec_running",
      }),
    );
    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        resolutionSource: "llm",
        actionTrace: expect.arrayContaining([
          expect.objectContaining({
            type: "matchRelatedRecord",
            outcome: "empty",
            matched: false,
          }),
          expect.objectContaining({
            type: "callAi",
            outcome: "ran",
            matched: true,
            as: "llmMatch",
          }),
        ]),
      }),
    );
  });
  it("soft-fails matchSimilarRecord on embedding quota so callAi can run", async () => {
    const recorder = createMockRecorder();
    const callAi = vi.fn(async () => ({ categoryId: "cat_food" }));
    const computeEmbedding = vi.fn(async () => {
      throw new Error(
        "8 RESOURCE_EXHAUSTED: Quota exceeded for aiplatform.googleapis.com/online_prediction_requests_per_base_model with base model: textembedding-gecko.",
      );
    });
    const list = vi.fn(async (entity: string) => {
      if (entity === "transaction") {
        return [];
      }
      return [
        {
          id: "ex_1",
          tenantId: "tenant_a",
          enabled: true,
          categoryId: "cat_transport",
          embedding: [1, 0, 0],
        },
      ];
    });

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "matchRelatedRecord",
            entity: "transaction",
            where: {
              type: "condition",
              field: "categorizationStatus",
              operator: "==",
              value: { kind: "literal", value: "DONE" },
            },
            haystack: {
              kind: "field",
              source: "current",
              path: "description",
            },
            aliasField: "description",
            as: "priorTxn",
          },
          {
            type: "matchSimilarRecord",
            entity: "categoryExample",
            where: {
              type: "condition",
              field: "enabled",
              operator: "==",
              value: { kind: "literal", value: true },
            },
            haystack: {
              kind: "field",
              source: "current",
              path: "description",
            },
            embeddingField: "embedding",
            minScore: 0.5,
            when: {
              kind: "call",
              fn: "isEmpty",
              args: [
                {
                  kind: "field",
                  source: "loaded",
                  alias: "priorTxn",
                  path: "categoryId",
                },
              ],
            },
            as: "example",
          },
          {
            type: "callAi",
            prompt: { kind: "literal", value: "Classify" },
            when: {
              kind: "call",
              fn: "isEmpty",
              args: [
                {
                  kind: "call",
                  fn: "coalesce",
                  args: [
                    {
                      kind: "field",
                      source: "loaded",
                      alias: "priorTxn",
                      path: "categoryId",
                    },
                    {
                      kind: "field",
                      source: "loaded",
                      alias: "example",
                      path: "categoryId",
                    },
                  ],
                },
              ],
            },
            as: "llmMatch",
          },
        ],
      },
      createContext({
        event: "transaction.afterCreate",
        entityName: "transaction",
        current: {
          id: "txn_1",
          description: "UNKNOWN MERCHANT",
          categorizationStatus: "PENDING",
        },
        services: {
          dataHookExecutionRecorder: recorder,
          callAi,
          computeEmbedding,
          entities: {
            list,
            get: vi.fn(),
            create: vi.fn(),
            createMany: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(callAi).toHaveBeenCalled();
    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        resolutionSource: "llm",
        actionTrace: expect.arrayContaining([
          expect.objectContaining({
            type: "matchSimilarRecord",
            outcome: "empty",
            matched: false,
          }),
          expect.objectContaining({
            type: "callAi",
            outcome: "ran",
            matched: true,
          }),
        ]),
      }),
    );
  });
});

describe("execution logging", () => {
  function createMockRecorder() {
    const recorder = {
      createPending: vi.fn(async () => ({ id: "exec_pending" })),
      markRunning: vi.fn(async () => undefined),
      beginRunning: vi.fn(async () => ({ id: "exec_running" })),
      finish: vi.fn(async () => undefined),
      createTerminal: vi.fn(async () => undefined),
    };
    return recorder;
  }

  it("records success when dataHookExecutionRecorder is present", async () => {
    const recorder = createMockRecorder();
    await runDataHook(sampleDefinition, {
      ...createContext(),
      services: {
        dataHookExecutionRecorder: recorder,
        logger: { info: vi.fn(), error: vi.fn() },
      },
    });

    expect(recorder.beginRunning).toHaveBeenCalledWith(
      expect.objectContaining({
        hookId: "hook_1",
        phase: "before",
        operation: "create",
      }),
      undefined,
    );
    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "exec_running",
        status: "success",
      }),
    );
  });

  it("stamps emailLedgerId from current.__emailLedger.id", async () => {
    const recorder = createMockRecorder();
    await runDataHook(sampleDefinition, {
      ...createContext({
        current: {
          id: "fi_1",
          amount: 100,
          __emailLedger: { id: "email_ledger_1" },
        },
      }),
      services: {
        dataHookExecutionRecorder: recorder,
        logger: { info: vi.fn(), error: vi.fn() },
      },
    });

    expect(recorder.beginRunning).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: "fi_1",
        emailLedgerId: "email_ledger_1",
      }),
      undefined,
    );
  });

  it("records skipped when condition is false", async () => {
    const recorder = createMockRecorder();
    await runDataHook(
      {
        ...sampleDefinition,
        condition: {
          type: "condition",
          field: "amount",
          operator: "==",
          value: { kind: "literal", value: 999 },
        },
      },
      {
        ...createContext(),
        services: {
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      },
    );

    expect(recorder.createTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "skipped",
        error: "Condition evaluated to false.",
      }),
    );
    expect(recorder.beginRunning).not.toHaveBeenCalled();
  });

  it("finishes existing execution when skipped with executionId", async () => {
    const recorder = createMockRecorder();
    await runDataHook(
      {
        ...sampleDefinition,
        condition: {
          type: "condition",
          field: "amount",
          operator: "==",
          value: { kind: "literal", value: 999 },
        },
      },
      {
        ...createContext(),
        services: {
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      },
      { executionId: "exec_pending" },
    );

    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "exec_pending",
        status: "skipped",
        error: "Condition evaluated to false.",
      }),
    );
    expect(recorder.createTerminal).not.toHaveBeenCalled();
    expect(recorder.beginRunning).not.toHaveBeenCalled();
  });

  it("records error when action fails", async () => {
    const recorder = createMockRecorder();
    await expect(
      runDataHook(
        {
          ...sampleDefinition,
          actions: [
            {
              type: "callWebhook",
              url: { kind: "literal", value: "https://example.com/hook" },
            },
          ],
        },
        {
          ...createContext(),
          services: {
            dataHookExecutionRecorder: recorder,
            logger: { info: vi.fn(), error: vi.fn() },
          },
        },
      ),
    ).rejects.toThrow(HookExecutionError);

    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "exec_running",
        status: "error",
      }),
    );
  });

  it("records write metrics and action trace for createRecords", async () => {
    const recorder = createMockRecorder();
    const createMany = vi.fn<
      (
        entity: string,
        records: readonly Record<string, unknown>[],
      ) => Promise<Array<{ id: string }>>
    >(async (_entity, records) => records.map(() => ({ id: "c" })));

    await runDataHook(
      {
        ...sampleDefinition,
        phase: "after",
        trigger: { operation: "create" },
        actions: [
          {
            type: "createRecords",
            entity: "commitment",
            count: { kind: "literal", value: 3 },
            data: {
              sequence: { kind: "var", name: "loopIndex" },
            },
          },
        ],
      },
      {
        ...createContext({
          event: "loan.afterCreate",
          services: {
            entities: mockHookEntityServices({ createMany }),
            dataHookExecutionRecorder: recorder,
            logger: { info: vi.fn(), error: vi.fn() },
          },
        }),
      },
    );

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0]?.[1]).toHaveLength(3);
    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        writesCreated: 3,
        writesByEntity: {
          commitment: { created: 3, updated: 0, deleted: 0 },
        },
        actionTrace: [
          expect.objectContaining({
            type: "createRecords",
            entity: "commitment",
            count: 3,
            durationMs: expect.any(Number),
          }),
        ],
      }),
    );
  });

  it("creates pending execution when queued hook is enqueued", async () => {
    const enqueue = vi.fn(async () => undefined);
    const recorder = createMockRecorder();
    const handler = compileDataHook({
      ...sampleDefinition,
      id: "hook_queued",
      phase: "after",
      trigger: { operation: "create" },
      execution: "queued",
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "queued" },
        },
      ],
    });

    await handler(
      createContext({
        event: "loan.afterCreate",
        services: {
          enqueueDataHookJob: enqueue,
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(recorder.createPending).toHaveBeenCalledWith(
      expect.objectContaining({
        hookId: "hook_queued",
        executionMode: "queued",
      }),
    );
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        hookId: "hook_queued",
        executionId: "exec_pending",
      }),
    );
  });

  it("does not enqueue queued hook when condition is false", async () => {
    const enqueue = vi.fn(async () => undefined);
    const recorder = createMockRecorder();
    const handler = compileDataHook({
      ...sampleDefinition,
      id: "hook_queued_cond",
      phase: "after",
      trigger: { operation: "create" },
      execution: "queued",
      condition: {
        type: "condition",
        field: "amount",
        operator: "==",
        value: { kind: "literal", value: 999 },
      },
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "queued" },
        },
      ],
    });

    await handler(
      createContext({
        event: "loan.afterCreate",
        current: { id: "loan_1", amount: 100 },
        services: {
          enqueueDataHookJob: enqueue,
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(enqueue).not.toHaveBeenCalled();
    expect(recorder.createPending).not.toHaveBeenCalled();
    expect(recorder.createTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "skipped",
        error: "Condition evaluated to false.",
        executionMode: "queued",
      }),
    );
  });

  it("does not enqueue queued hook when updateFields did not change", async () => {
    const enqueue = vi.fn(async () => undefined);
    const recorder = createMockRecorder();
    const handler = compileDataHook({
      ...sampleDefinition,
      id: "hook_queued_fields",
      phase: "after",
      trigger: { operation: "update", updateFields: ["categoryId"] },
      execution: "queued",
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "queued" },
        },
      ],
    });

    await handler(
      createContext({
        event: "loan.afterUpdate",
        current: { id: "loan_1", categoryId: "cat_1", amount: 50 },
        previous: { id: "loan_1", categoryId: "cat_1", amount: 100 },
        services: {
          enqueueDataHookJob: enqueue,
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(enqueue).not.toHaveBeenCalled();
    expect(recorder.createPending).not.toHaveBeenCalled();
    expect(recorder.createTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "skipped",
        error: "No configured update fields changed.",
        executionMode: "queued",
      }),
    );
  });
});

describe("advance next due date payment gate", () => {
  const paymentGateCondition = {
    type: "group" as const,
    combinator: "and" as const,
    children: [
      {
        type: "condition" as const,
        field: "type",
        operator: "==" as const,
        value: { kind: "literal" as const, value: "PAYMENT" },
      },
      {
        type: "condition" as const,
        field: "financialItemId",
        operator: "isNotEmpty" as const,
      },
    ],
  };

  function createMockRecorder() {
    return {
      createPending: vi.fn(async () => ({ id: "exec_pending" })),
      markRunning: vi.fn(async () => undefined),
      beginRunning: vi.fn(async () => ({ id: "exec_running" })),
      finish: vi.fn(async () => undefined),
      createTerminal: vi.fn(async () => undefined),
    };
  }

  it("skips Advance next due date on EXPENSE with financialItemId (UBER path)", async () => {
    const recorder = createMockRecorder();
    const entities = mockHookEntityServices();
    await runDataHook(
      {
        ...sampleDefinition,
        id: "hook_advance_due",
        name: "Advance next due date",
        entity: "transaction",
        phase: "after",
        trigger: { operation: "create" },
        condition: paymentGateCondition,
        actions: [
          {
            type: "updateMatching",
            entity: "financialItem",
            where: {
              type: "condition",
              field: "id",
              operator: "==",
              value: {
                kind: "field",
                source: "current",
                path: "financialItemId",
              },
            },
            set: {
              nextDueDate: { kind: "literal", value: "2099-01-01" },
            },
          },
        ],
      },
      createContext({
        entityName: "transaction",
        event: "transaction.afterCreate",
        current: {
          id: "txn_uber",
          type: "EXPENSE",
          financialItemId: "fi_card",
          amount: 25000,
        },
        services: {
          entities,
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(recorder.createTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "skipped",
        error: "Condition evaluated to false.",
      }),
    );
    expect(entities.update).not.toHaveBeenCalled();
  });

  it("runs Advance next due date on PAYMENT with financialItemId", async () => {
    const recorder = createMockRecorder();
    const entities = mockHookEntityServices({
      list: vi.fn(async () => [
        { id: "fi_loan", tenantId: "tenant_a", nextDueDate: "2026-01-01" },
      ]),
      update: vi.fn(async (_entity, id, data) => ({
        id,
        tenantId: "tenant_a",
        ...data,
      })),
    });
    await runDataHook(
      {
        ...sampleDefinition,
        id: "hook_advance_due",
        name: "Advance next due date",
        entity: "transaction",
        phase: "after",
        trigger: { operation: "create" },
        condition: paymentGateCondition,
        actions: [
          {
            type: "updateMatching",
            entity: "financialItem",
            where: {
              type: "condition",
              field: "id",
              operator: "==",
              value: {
                kind: "field",
                source: "current",
                path: "financialItemId",
              },
            },
            set: {
              nextDueDate: { kind: "literal", value: "2026-02-01" },
            },
          },
        ],
      },
      createContext({
        entityName: "transaction",
        event: "transaction.afterCreate",
        current: {
          id: "txn_pay",
          type: "PAYMENT",
          financialItemId: "fi_loan",
          amount: 500000,
        },
        services: {
          entities,
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(recorder.finish).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success" }),
    );
    expect(entities.update).toHaveBeenCalledWith(
      "financialItem",
      "fi_loan",
      expect.objectContaining({ nextDueDate: "2026-02-01" }),
      undefined,
    );
  });
});

describe("mark schedule paid relatedFinancialItemId gate", () => {
  function createMockRecorder() {
    return {
      createPending: vi.fn(async () => ({ id: "exec_pending" })),
      markRunning: vi.fn(async () => undefined),
      beginRunning: vi.fn(async () => ({ id: "exec_running" })),
      finish: vi.fn(async () => undefined),
      createTerminal: vi.fn(async () => undefined),
    };
  }

  const markSchedulePaidDefinition: DataHookDefinition = {
    ...sampleDefinition,
    id: "hook_mark_schedule_paid",
    name: "Mark schedule PAID",
    entity: "transaction",
    phase: "after",
    trigger: {
      kind: "crud",
      operations: [
        { operation: "create" },
        {
          operation: "update",
          updateFields: ["paymentScheduleId", "relatedFinancialItemId"],
        },
      ],
    },
    condition: {
      type: "condition",
      field: "paymentScheduleId",
      operator: "isNotEmpty",
    },
    actions: [
      {
        type: "updateMatching",
        entity: "paymentSchedule",
        where: {
          type: "condition",
          field: "id",
          operator: "==",
          value: {
            kind: "field",
            source: "current",
            path: "paymentScheduleId",
          },
        },
        set: {
          status: { kind: "literal", value: "PAID" },
        },
      },
    ],
  };

  it("skips when relatedFinancialItemId changes without paymentScheduleId", async () => {
    const recorder = createMockRecorder();
    const entities = mockHookEntityServices();
    await runDataHook(
      markSchedulePaidDefinition,
      createContext({
        entityName: "transaction",
        event: "transaction.afterUpdate",
        current: {
          id: "txn_1",
          relatedFinancialItemId: "fi_card",
          paymentScheduleId: null,
        },
        previous: {
          id: "txn_1",
          relatedFinancialItemId: null,
          paymentScheduleId: null,
        },
        services: {
          entities,
          dataHookExecutionRecorder: recorder,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      }),
    );

    expect(recorder.createTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "skipped",
        error: "Condition evaluated to false.",
      }),
    );
    expect(entities.update).not.toHaveBeenCalled();
    expect(entities.list).not.toHaveBeenCalled();
  });
});

describe("evaluateConditionNode", () => {
  it("normalizes legacy bare leaf conditions", () => {
    const context = createContext({
      current: { amount: 100, commitmentAmount: 100 },
    });
    const scope = {
      current: context.current,
      now: new Date(),
    };

    expect(
      evaluateConditionNode(
        {
          field: "amount",
          operator: ">=",
          value: { kind: "field", source: "current", path: "commitmentAmount" },
        },
        context,
        scope,
      ),
    ).toBe(true);
  });

  it("evaluates in with array literal value", () => {
    const context = createContext({
      current: { itemType: "LOAN" },
    });
    const scope = {
      current: context.current,
      now: new Date(),
    };

    expect(
      evaluateCondition(
        {
          field: "itemType",
          operator: "in",
          value: {
            kind: "literal",
            value: ["MORTGAGE", "LOAN", "CREDIT_CARD"],
          },
        },
        context,
        scope,
      ),
    ).toBe(true);
  });

  it("evaluates notIn with array literal value", () => {
    const context = createContext({
      current: { itemType: "SAVINGS" },
    });
    const scope = {
      current: context.current,
      now: new Date(),
    };

    expect(
      evaluateCondition(
        {
          field: "itemType",
          operator: "notIn",
          value: {
            kind: "literal",
            value: ["MORTGAGE", "LOAN"],
          },
        },
        context,
        scope,
      ),
    ).toBe(true);
  });
});

describe("validateDataHookActions getRecord", () => {
  const entities = ["loan", "financialItem", "loanDetails"];

  it("rejects duplicate getRecord aliases", () => {
    expect(() =>
      validateDataHookActions(
        [
          {
            type: "getRecord",
            entity: "financialItem",
            as: "parent",
            id: { kind: "literal", value: "fi_1" },
          },
          {
            type: "getRecord",
            entity: "loan",
            as: "parent",
            id: { kind: "literal", value: "loan_1" },
          },
        ],
        entities,
      ),
    ).toThrow(/Duplicate binding alias/);
  });

  it("rejects unknown loaded alias references", () => {
    expect(() =>
      validateDataHookActions(
        [
          {
            type: "createRecord",
            entity: "loanDetails",
            data: {
              note: {
                kind: "field",
                source: "loaded",
                alias: "parent",
                path: "frequency",
              },
            },
          },
        ],
        entities,
      ),
    ).toThrow(/unknown loaded alias/);
  });

  it("rejects unknown loaded alias inside switch then branch", () => {
    expect(() =>
      validateDataHookActions(
        [
          {
            type: "setField",
            field: "balanceSheetRole",
            value: {
              kind: "switch",
              input: { kind: "field", source: "current", path: "itemType" },
              cases: [
                {
                  when: { kind: "literal", value: "MORTGAGE" },
                  then: {
                    kind: "field",
                    source: "loaded",
                    alias: "parent",
                    path: "frequency",
                  },
                },
              ],
              default: { kind: "literal", value: "NONE" },
            },
          },
        ],
        entities,
      ),
    ).toThrow(/unknown loaded alias/);
  });

  it("rejects array literal in setField value", () => {
    expect(() =>
      validateDataHookActions(
        [
          {
            type: "setField",
            field: "status",
            value: { kind: "literal", value: ["A", "B"] },
          },
        ],
        entities,
      ),
    ).toThrow(/Array literals are only allowed/);
  });

  it("rejects exceeding MAX_LOADED_RECORDS", () => {
    const actions = Array.from({ length: MAX_LOADED_RECORDS + 1 }, (_, i) => ({
      type: "getRecord" as const,
      entity: "financialItem",
      as: `alias${i}`,
      id: { kind: "literal" as const, value: `fi_${i}` },
    }));

    expect(() => validateDataHookActions(actions, entities)).toThrow(
      /maximum of/,
    );
  });
});

describe("validateDataHookActions aggregateMatching", () => {
  const entities = ["parent", "childRow"];

  it("rejects duplicate alias across getRecord and aggregateMatching", () => {
    expect(() =>
      validateDataHookActions(
        [
          {
            type: "getRecord",
            entity: "childRow",
            as: "shared",
            id: { kind: "literal", value: "row_1" },
          },
          {
            type: "aggregateMatching",
            entity: "childRow",
            op: "count",
            as: "shared",
            where: {
              type: "condition",
              field: "parentId",
              operator: "==",
              value: { kind: "literal", value: "p1" },
            },
          },
        ],
        entities,
      ),
    ).toThrow(/Duplicate binding alias/);
  });

  it("rejects unknown aggregate alias references", () => {
    expect(() =>
      validateDataHookActions(
        [
          {
            type: "setField",
            field: "total",
            value: {
              kind: "field",
              source: "aggregate",
              alias: "missing",
            },
          },
        ],
        entities,
      ),
    ).toThrow(/unknown aggregate alias/);
  });

  it("rejects exceeding MAX_AGGREGATE_ACTIONS", () => {
    const actions = Array.from(
      { length: MAX_AGGREGATE_ACTIONS + 1 },
      (_, i) => ({
        type: "aggregateMatching" as const,
        entity: "childRow",
        op: "count" as const,
        as: `agg${i}`,
        where: {
          type: "condition" as const,
          field: "parentId",
          operator: "==" as const,
          value: { kind: "literal" as const, value: "p1" },
        },
      }),
    );

    expect(() => validateDataHookActions(actions, entities)).toThrow(
      /maximum of/,
    );
  });
});

describe("validateCreateDataHookInput schedule triggers", () => {
  const entities = ["paymentSchedule"];

  const baseScheduleInput = {
    name: "Overdue sweep",
    entity: "paymentSchedule",
    phase: "after" as const,
    trigger: {
      kind: "schedule" as const,
      cron: "0 6 * * *",
      timezone: "UTC",
    },
    condition: null,
    actions: [
      {
        type: "sendNotification" as const,
        message: { kind: "literal" as const, value: "tick" },
      },
    ],
    enabled: true,
    order: 0,
  };

  it("accepts valid schedule trigger", () => {
    expect(() =>
      validateCreateDataHookInput(baseScheduleInput, entities),
    ).not.toThrow();
  });

  it("accepts in condition with array literal value", () => {
    expect(() =>
      validateCreateDataHookInput(
        {
          ...baseScheduleInput,
          trigger: { operation: "create" },
          condition: {
            type: "condition",
            field: "itemType",
            operator: "in",
            value: {
              kind: "literal",
              value: ["MORTGAGE", "LOAN"],
            },
          },
        },
        entities,
      ),
    ).not.toThrow();
  });

  it("rejects array literal in non-in/notIn condition", () => {
    expect(() =>
      validateCreateDataHookInput(
        {
          ...baseScheduleInput,
          trigger: { operation: "create" },
          condition: {
            type: "condition",
            field: "itemType",
            operator: "==",
            value: {
              kind: "literal",
              value: ["MORTGAGE"],
            },
          },
        },
        entities,
      ),
    ).toThrow(/Array literals are only allowed/);
  });

  it("rejects before-phase schedule trigger", () => {
    expect(() =>
      validateCreateDataHookInput(
        { ...baseScheduleInput, phase: "before" },
        entities,
      ),
    ).toThrow(/after phase/);
  });

  it("rejects invalid cron", () => {
    expect(() =>
      validateCreateDataHookInput(
        {
          ...baseScheduleInput,
          trigger: { kind: "schedule", cron: "not valid" },
        },
        entities,
      ),
    ).toThrow(/Invalid cron/);
  });

  it("requires eachRecordWhere for eachRecord scope", () => {
    expect(() =>
      validateCreateDataHookInput(
        {
          ...baseScheduleInput,
          trigger: {
            kind: "schedule",
            cron: "0 6 * * *",
            scope: "eachRecord",
          },
        },
        entities,
      ),
    ).toThrow(/eachRecordWhere/);
  });
});

describe("validateCreateDataHookInput createRecords limits", () => {
  const entities = ["loan", "paymentSchedule"];

  const baseHook = {
    name: "Generate rows",
    entity: "loan",
    phase: "after" as const,
    trigger: { operation: "create" as const },
    condition: null,
    enabled: true,
    order: 0,
  };

  it("rejects literal count above sync tier on after sync hook", () => {
    expect(() =>
      validateCreateDataHookInput(
        {
          ...baseHook,
          actions: [
            {
              type: "createRecords",
              entity: "paymentSchedule",
              count: { kind: "literal", value: 1_001 },
              data: {},
            },
          ],
        },
        entities,
      ),
    ).toThrow(/exceeds the maximum of 1000/);
  });

  it("accepts literal count above sync tier when execution is queued", () => {
    expect(() =>
      validateCreateDataHookInput(
        {
          ...baseHook,
          execution: "queued",
          actions: [
            {
              type: "createRecords",
              entity: "paymentSchedule",
              count: { kind: "literal", value: 2_000 },
              data: {},
            },
          ],
        },
        entities,
      ),
    ).not.toThrow();
  });

  it("rejects literal count above queued hard ceiling", () => {
    expect(() =>
      validateCreateDataHookInput(
        {
          ...baseHook,
          execution: "queued",
          actions: [
            {
              type: "createRecords",
              entity: "paymentSchedule",
              count: { kind: "literal", value: 5_001 },
              data: {},
            },
          ],
        },
        entities,
      ),
    ).toThrow(/hard maximum/);
  });
});

describe("scheduled hook registry", () => {
  beforeEach(() => {
    clearHookRegistry();
  });

  it("does not run schedule hooks on CRUD events", async () => {
    const scheduleDefinition: DataHookDefinition = {
      ...sampleDefinition,
      id: "schedule_hook",
      phase: "after",
      entity: "loan",
      trigger: { kind: "schedule", cron: "* * * * *" },
      actions: [
        {
          type: "setField",
          field: "status",
          value: { kind: "literal", value: "ScheduledRan" },
        },
      ],
    };

    registerDynamicHook("tenant_a", scheduleDefinition);

    const crudContext = createContext({ event: "loan.afterCreate" });
    await executeHooks("loan.afterCreate", crudContext);

    expect(crudContext.current.status).not.toBe("ScheduledRan");
  });
});
