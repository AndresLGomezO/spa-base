import { beforeEach, describe, expect, it, vi } from "vitest";
import fastify from "fastify";

import { HOOK_TASK_ROUTES } from "../hooks/hook-task-routes.js";

const processDataHookJob = vi.fn(async () => undefined);

vi.mock("../services/data-hook-processor.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/data-hook-processor.js")>();
  return {
    ...actual,
    processDataHookJob: (...args: Parameters<typeof processDataHookJob>) =>
      processDataHookJob(...args),
  };
});

import { dataHookTaskRoute } from "./data-hook-task.route.js";

describe("data hook task route", () => {
  beforeEach(() => {
    processDataHookJob.mockClear();
  });

  it("accepts valid payloads and returns 202", async () => {
    const deps = {
      hookRuntime: {} as never,
      entityRuntime: {} as never,
      permissionDeps: {} as never,
    };

    const app = fastify({ logger: false });
    await app.register(dataHookTaskRoute, deps);

    const payload = {
      hookId: "hook_abc",
      tenantId: "tenant_a",
      entityName: "loan",
      phase: "after" as const,
      operation: "create" as const,
      current: { id: "loan_1", amount: 100 },
      user: { uid: "user_123" },
      depth: 0,
      visitedHookIds: [] as string[],
    };

    const response = await app.inject({
      method: "POST",
      url: HOOK_TASK_ROUTES.PROCESS_DATA_HOOK,
      payload,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ success: true, accepted: true });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(processDataHookJob).toHaveBeenCalledTimes(1);
    expect(processDataHookJob).toHaveBeenCalledWith(
      deps,
      payload,
      expect.objectContaining({
        info: expect.any(Function),
        error: expect.any(Function),
      }),
    );

    await app.close();
  });

  it("rejects invalid payloads with 200 and error code", async () => {
    const deps = {
      hookRuntime: {} as never,
      entityRuntime: {} as never,
      permissionDeps: {} as never,
    };

    const app = fastify({ logger: false });
    await app.register(dataHookTaskRoute, deps);

    const response = await app.inject({
      method: "POST",
      url: HOOK_TASK_ROUTES.PROCESS_DATA_HOOK,
      payload: { hookId: "hook_abc" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: false,
      error: "INVALID_PAYLOAD",
    });
    expect(processDataHookJob).not.toHaveBeenCalled();

    await app.close();
  });
});
