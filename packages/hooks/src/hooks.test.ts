import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DataHookDefinition } from "./data-hook-definition.js";
import { formatHookEvent, parseHookEvent } from "./event.js";
import {
  runDataHook,
  evaluateConditionNode,
  compileDataHook,
} from "./interpret-data-hook.js";
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
          entities: { create, update: vi.fn(), list: vi.fn() },
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
          entities: { create, update: vi.fn(), list: vi.fn() },
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
          entities: { create: vi.fn(), update, list },
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
});
