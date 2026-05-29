import { beforeEach, describe, expect, it, vi } from "vitest";

import { interpretActions } from "./action-interpreter.js";
import { formatHookEvent, parseHookEvent } from "./event.js";
import {
  clearHookRegistry,
  executeHooks,
  registerDynamicHook,
  registerSystemHook,
} from "./registry.js";
import type { HookContext, HookRecord } from "./types.js";
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

const sampleRecord: HookRecord = {
  id: "hook_1",
  tenantId: "tenant_a",
  name: "Set status",
  entity: "loan",
  event: "loan.beforeCreate",
  type: "action",
  config: {
    actions: [{ type: "updateField", field: "status", value: "Pending" }],
  },
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

  it("logs after hook failures without throwing", async () => {
    const error = vi.fn();

    registerSystemHook({
      moduleName: "inventory",
      event: "loan.afterCreate",
      handler: async () => {
        throw new Error("after failed");
      },
    });

    await executeHooks(
      "loan.afterCreate",
      createContext({
        event: "loan.afterCreate",
        services: { logger: { info: vi.fn(), error } },
      }),
    );

    expect(error).toHaveBeenCalled();
  });

  it("runs tenant dynamic hooks", async () => {
    registerDynamicHook("tenant_a", sampleRecord);

    const context = createContext();
    await executeHooks("loan.beforeCreate", context);

    expect(context.current.status).toBe("Pending");
  });
});

describe("interpretActions", () => {
  it("mutates current on before updateField", async () => {
    const context = createContext();

    await interpretActions(
      [{ type: "updateField", field: "status", value: "Approved" }],
      context,
    );

    expect(context.current.status).toBe("Approved");
  });

  it("calls entity services on after createRecord", async () => {
    const create = vi.fn(async () => ({ id: "task_1" }));

    await interpretActions(
      [
        {
          type: "createRecord",
          entity: "project",
          data: { name: "Follow up" },
        },
      ],
      createContext({
        event: "loan.afterCreate",
        services: {
          entities: { create, update: vi.fn() },
        },
      }),
    );

    expect(create).toHaveBeenCalledWith("project", { name: "Follow up" });
  });
});
