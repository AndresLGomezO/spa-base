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
  registerDynamicHook,
  registerSystemHook,
} from "./registry.js";
import type { HookContext } from "./types.js";
import { HookExecutionError } from "./types.js";

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
    const create = vi.fn<
      (entity: string, data: Record<string, unknown>) => Promise<{ id: string }>
    >(async () => ({ id: "c" }));

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
          entities: {
            create,
            update: vi.fn(),
            list: vi.fn(),
            delete: vi.fn(),
            get: vi.fn(),
          },
        },
      }),
    );

    expect(create).toHaveBeenCalledTimes(3);
    expect(create.mock.calls[0]?.[1]).toMatchObject({ sequence: 0 });
    expect(create.mock.calls[1]?.[1]).toMatchObject({
      sequence: 1,
      dueDate: "2026-01-31T00:00:00.000Z",
    });
  });

  it("uses startIndex as absolute loopIndex offset", async () => {
    const create = vi.fn<
      (entity: string, data: Record<string, unknown>) => Promise<{ id: string }>
    >(async () => ({ id: "c" }));

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
          entities: {
            create,
            update: vi.fn(),
            list: vi.fn(),
            delete: vi.fn(),
            get: vi.fn(),
          },
        },
      }),
    );

    expect(create.mock.calls[0]?.[1]).toMatchObject({ sequence: 5 });
    expect(create.mock.calls[1]?.[1]).toMatchObject({ sequence: 6 });
  });

  it("carries loopState across createRecords iterations", async () => {
    const create = vi.fn<
      (entity: string, data: Record<string, unknown>) => Promise<{ id: string }>
    >(async () => ({ id: "c" }));

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
          entities: {
            create,
            update: vi.fn(),
            list: vi.fn(),
            delete: vi.fn(),
            get: vi.fn(),
          },
        },
      }),
    );

    expect(create).toHaveBeenCalledTimes(3);
    expect(create.mock.calls[0]?.[1]).toMatchObject({ portion: 100 });
    expect(create.mock.calls[0]?.[1]).not.toHaveProperty("__loopState");
    expect(create.mock.calls[1]?.[1]).toMatchObject({ portion: 100 });
    expect(create.mock.calls[2]?.[1]).toMatchObject({ portion: 100 });
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
            entities: {
              create: vi.fn(),
              update: vi.fn(),
              list: vi.fn(),
              delete: vi.fn(),
              get: vi.fn(),
            },
          },
        }),
      ),
    ).rejects.toThrow(/exceeds the maximum of 1000/);
  });

  it("allows createRecords count above sync tier when queued", async () => {
    const create = vi.fn<
      (entity: string, data: Record<string, unknown>) => Promise<{ id: string }>
    >(async () => ({ id: "c" }));

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
          entities: {
            create,
            update: vi.fn(),
            list: vi.fn(),
            delete: vi.fn(),
            get: vi.fn(),
          },
        },
      }),
    );

    expect(create).toHaveBeenCalledTimes(1_500);
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
          },
        },
      }),
    );

    expect(list).toHaveBeenCalledWith("commitment", {
      field: "contractId",
      value: "loan_1",
      limit: 500,
    });
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[0]?.[2]).toEqual({ isActive: false });
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
          },
        },
      }),
    );

    expect(list).toHaveBeenCalledWith("paymentSchedule", {
      field: "contractId",
      value: "loan_1",
      limit: 500,
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
          },
        },
      }),
    );

    expect(list).toHaveBeenCalledWith("paymentSchedule", {
      field: "financialItemId",
      value: "fi_1",
      limit: 500,
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

describe("execution logging", () => {
  it("records success when recordDataHookExecution is present", async () => {
    const record = vi.fn(async () => undefined);
    await runDataHook(sampleDefinition, {
      ...createContext(),
      services: {
        recordDataHookExecution: record,
        logger: { info: vi.fn(), error: vi.fn() },
      },
    });

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        hookId: "hook_1",
        status: "success",
        phase: "before",
        operation: "create",
      }),
    );
  });

  it("records skipped when condition is false", async () => {
    const record = vi.fn(async () => undefined);
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
          recordDataHookExecution: record,
          logger: { info: vi.fn(), error: vi.fn() },
        },
      },
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "skipped",
        error: "Condition evaluated to false.",
      }),
    );
  });

  it("records error when action fails", async () => {
    const record = vi.fn(async () => undefined);
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
            recordDataHookExecution: record,
            logger: { info: vi.fn(), error: vi.fn() },
          },
        },
      ),
    ).rejects.toThrow(HookExecutionError);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
      }),
    );
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
