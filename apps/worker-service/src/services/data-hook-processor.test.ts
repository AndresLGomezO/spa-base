import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataHookJobPayload } from "@repo/hooks";

const { finish, reloadTenantHooks, getById } = vi.hoisted(() => ({
  finish: vi.fn(async () => undefined),
  reloadTenantHooks: vi.fn(async () => undefined),
  getById: vi.fn(async () => null),
}));

vi.mock("../hooks/record-data-hook-execution.js", () => ({
  createDataHookExecutionRecorderForTenant: () => ({ finish }),
  createRecordDataHookExecution: vi.fn(),
}));

vi.mock("../config/env.js", () => ({
  vertexAiConfig: {
    projectId: "test",
    region: "us-central1",
    geminiLocation: "global",
    modelId: "gemini-flash",
    mockEnabled: true,
  },
  workerEnv: {
    GCP_PROJECT_ID: "test",
    AGGREGATION_EVENTS_TOPIC: "",
  },
}));

import {
  PermanentHookTaskError,
  processDataHookJob,
  type DataHookProcessorDeps,
} from "./data-hook-processor.js";

function createPayload(
  overrides?: Partial<DataHookJobPayload>,
): DataHookJobPayload {
  return {
    hookId: "hook_missing",
    tenantId: "tenant_a",
    entityName: "loan",
    phase: "after",
    operation: "update",
    current: { id: "loan_1" },
    user: { uid: "user_1" },
    depth: 0,
    visitedHookIds: [],
    executionId: "exec_pending",
    ...overrides,
  };
}

describe("processDataHookJob", () => {
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
  };

  const deps = {
    hookRuntime: {
      repository: { getById },
      ensureTenantHooksLoaded: vi.fn(async () => undefined),
      reloadTenantHooks,
    },
    formulaRuntime: {
      getFormulaResolver: vi.fn(async () => undefined),
    },
    entityRuntime: {
      ensureTenantEntitiesLoaded: vi.fn(async () => undefined),
    },
    permissionDeps: {} as never,
    hookExecutionRepository: {},
  } as unknown as DataHookProcessorDeps;

  beforeEach(() => {
    finish.mockClear();
    reloadTenantHooks.mockClear();
    getById.mockClear();
    getById.mockResolvedValue(null);
  });

  it("reloads hook cache and marks execution error when hook is not found", async () => {
    await expect(
      processDataHookJob(deps, createPayload(), logger),
    ).rejects.toThrow(PermanentHookTaskError);

    expect(reloadTenantHooks).toHaveBeenCalledWith("tenant_a");
    expect(getById).toHaveBeenCalledTimes(2);
    expect(finish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "exec_pending",
        status: "error",
        error: "Hook not found.",
      }),
    );
  });
});
