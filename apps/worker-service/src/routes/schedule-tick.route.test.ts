import { beforeEach, describe, expect, it, vi } from "vitest";
import fastify from "fastify";

import { HOOK_TASK_ROUTES } from "../hooks/hook-task-routes.js";

const processScheduleTick = vi.fn(async () => undefined);

vi.mock("../services/schedule-tick-processor.js", () => ({
  processScheduleTick: (...args: Parameters<typeof processScheduleTick>) =>
    processScheduleTick(...args),
}));

vi.mock("../config/env.js", () => ({
  scheduleTickConfig: { scheduledHookUserUid: "scheduler_user" },
  authConfig: {
    authEnabled: false,
    allowLocalTaskBypass: true,
    serviceAccountEmail: "",
  },
  workerEnv: {},
  vertexAiConfig: {},
}));

import { scheduleTickRoute } from "./schedule-tick.route.js";

describe("schedule tick route", () => {
  beforeEach(() => {
    processScheduleTick.mockClear();
  });

  it("accepts tick requests and returns 202", async () => {
    const deps = {
      hookRuntime: {} as never,
      formulaRuntime: {} as never,
      entityRuntime: {} as never,
      permissionDeps: {} as never,
      firebaseAdminConfig: { projectId: "demo" },
      indexProjectId: "demo",
    };

    const app = fastify({ logger: false });
    await app.register(scheduleTickRoute, deps);

    const response = await app.inject({
      method: "POST",
      url: HOOK_TASK_ROUTES.SCHEDULE_TICK,
      payload: {},
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ success: true, accepted: true });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(processScheduleTick).toHaveBeenCalledTimes(1);
    expect(processScheduleTick).toHaveBeenCalledWith(
      deps,
      expect.objectContaining({
        firebaseAdminConfig: deps.firebaseAdminConfig,
        scheduledHookUserUid: "scheduler_user",
      }),
    );

    await app.close();
  });
});
