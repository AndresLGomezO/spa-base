import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createInMemoryDataHookExecutionRepository,
  createInMemoryUserNotificationRepository,
} from "@repo/firestore-converters";

const dispatchChainedEntityHooks = vi.fn(async () => ({}));
let capturedDispatchChainedHooks:
  | ((params: {
      entityName: string;
      phase: "after";
      operation: "create";
      current: Record<string, unknown>;
      depth: number;
      visitedHookIds: ReadonlySet<string>;
    }) => Promise<Record<string, unknown>>)
  | undefined;

vi.mock("./dispatch-chained-entity-hooks.js", () => ({
  dispatchChainedEntityHooks: (
    ...args: Parameters<typeof dispatchChainedEntityHooks>
  ) => dispatchChainedEntityHooks(...args),
}));

vi.mock("./create-hook-services.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./create-hook-services.js")>();
  return {
    ...actual,
    createHookEntityServices: vi.fn((options) => {
      capturedDispatchChainedHooks = options.dispatchChainedHooks;
      return {
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        list: vi.fn(),
        delete: vi.fn(),
        get: vi.fn(),
      };
    }),
  };
});

import { buildHookEntityServices } from "./hook-entity-services-factory.js";

describe("buildHookEntityServices", () => {
  beforeEach(() => {
    dispatchChainedEntityHooks.mockClear();
    capturedDispatchChainedHooks = undefined;
  });

  it("passes sendUserNotification into chained hook dispatch when repository is wired", async () => {
    const userNotificationRepository =
      createInMemoryUserNotificationRepository();
    const hookExecutionRepository = createInMemoryDataHookExecutionRepository();

    buildHookEntityServices({
      user: {
        tenantId: "tenant_a",
        uid: "user_123",
        permissions: ["*"],
        isSuperAdmin: true,
        roleCatalog: {},
        knownPermissions: ["*"],
        platformRole: "superadmin",
        tenantRoleNames: ["admin"],
      },
      deps: {
        hookRuntime: {} as never,
        formulaRuntime: {} as never,
        entityRuntime: {} as never,
        permissionDeps: {} as never,
        hookExecutionRepository,
        userNotificationRepository,
      },
      logger: { info: vi.fn(), error: vi.fn() },
    });

    expect(capturedDispatchChainedHooks).toBeDefined();
    await capturedDispatchChainedHooks!({
      entityName: "loanDetails",
      phase: "after",
      operation: "create",
      current: { id: "loan_1" },
      depth: 1,
      visitedHookIds: new Set<string>(),
    });

    expect(dispatchChainedEntityHooks).toHaveBeenCalledWith(
      expect.objectContaining({
        sendUserNotification: expect.any(Function),
      }),
    );
  });
});
