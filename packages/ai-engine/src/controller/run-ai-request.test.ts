import { describe, expect, it, vi } from "vitest";

import type {
  AiJobRecord,
  AiJobStepTraceEntry,
} from "../schemas/ai-job.schema.js";
import {
  AiDisabledError,
  type AiJobRepositoryPort,
} from "./ai-request.types.js";
import { createAiController } from "./run-ai-request.js";

function createMemoryRepo(): AiJobRepositoryPort & {
  readonly byId: Map<string, AiJobRecord>;
} {
  const byId = new Map<string, AiJobRecord>();
  let seq = 0;
  return {
    byId,
    async create(tenantId, input) {
      const id = `aijob_${++seq}`;
      const now = new Date().toISOString();
      const record: AiJobRecord = {
        id,
        tenantId,
        feature: input.feature,
        status: input.status ?? "pending",
        input: input.input,
        output: null,
        error: input.error ?? null,
        requestedBy: input.requestedBy,
        permission: input.permission,
        createdAt: now,
        updatedAt: now,
        ...(input.operation ? { operation: input.operation } : {}),
        ...(input.parentJobId ? { parentJobId: input.parentJobId } : {}),
        ...(input.contextRef ? { contextRef: input.contextRef } : {}),
      };
      byId.set(id, record);
      return record;
    },
    async update(tenantId, id, patch) {
      const current = byId.get(id);
      if (!current || current.tenantId !== tenantId) {
        throw new Error(`missing ${id}`);
      }
      const next = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      byId.set(id, next);
      return next;
    },
    async appendStepTrace(tenantId, id, entry: AiJobStepTraceEntry) {
      const current = byId.get(id);
      if (!current || current.tenantId !== tenantId) {
        throw new Error(`missing ${id}`);
      }
      const next = {
        ...current,
        stepTrace: [...(current.stepTrace ?? []), entry],
        updatedAt: new Date().toISOString(),
      };
      byId.set(id, next);
      return next;
    },
  };
}

function createDeps(overrides?: {
  readonly aiEnabled?: boolean;
  readonly aiTraceEnabled?: boolean;
}) {
  const repository = createMemoryRepo();
  const generateModelAnswer = vi.fn(async () => ({
    text: '{"ok":true}',
    usage: {
      modelId: "gemini-3.6-flash",
      promptTokens: 100,
      candidatesTokens: 20,
      totalTokens: 120,
      finishReason: "STOP",
    },
  }));
  const generateChatAnswer = vi.fn(async () => ({
    text: "hello",
    usage: {
      modelId: "gemini-3.6-flash",
      promptTokens: 10,
      candidatesTokens: 5,
      totalTokens: 15,
      finishReason: "STOP",
    },
  }));
  const generateTextEmbedding = vi.fn(async () => ({
    vector: [0.1, 0.2, 0.3, 0.4],
    usage: {
      modelId: "text-embedding-005",
      outputDimensions: 4,
      inputCharacters: 5,
      promptTokens: 2,
    },
  }));
  const controller = createAiController({
    repository,
    vertexAiConfig: {
      projectId: "demo",
      region: "us-central1",
      modelId: "gemini-3.6-flash",
      mockEnabled: true,
    },
    clients: {
      generateModelAnswer,
      generateChatAnswer,
      generateTextEmbedding,
    },
    flags: {
      isAiEnabled: () => overrides?.aiEnabled ?? true,
      isAiTraceEnabled: () => overrides?.aiTraceEnabled ?? true,
    },
  });
  return {
    controller,
    repository,
    generateModelAnswer,
    generateChatAnswer,
    generateTextEmbedding,
  };
}

describe("createAiController", () => {
  it("persists a failed job and throws when AI is disabled", async () => {
    const { controller, repository, generateModelAnswer } = createDeps({
      aiEnabled: false,
    });

    await expect(
      controller.runAiRequest({
        tenantId: "t1",
        feature: "dataHookCallAi",
        operation: "generateText",
        requestedBy: "system",
        permission: "ai.dataHook.run",
        input: {
          kind: "dataHookCallAi",
          hookId: "hook_1",
          prompt: "hi",
        },
        params: {
          operation: "generateText",
          systemInstruction: "sys",
          userText: "hi",
        },
      }),
    ).rejects.toBeInstanceOf(AiDisabledError);

    expect(generateModelAnswer).not.toHaveBeenCalled();
    const jobs = [...repository.byId.values()];
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.status).toBe("failed");
    expect(jobs[0]?.error).toBe("ai.disabled");
  });

  it("writes completed job with stepTrace and modelUsage when tracing is on", async () => {
    const { controller, repository } = createDeps({ aiTraceEnabled: true });

    const result = await controller.runAiRequest({
      tenantId: "t1",
      feature: "chat",
      operation: "generateChat",
      requestedBy: "user_1",
      permission: "ai.chat.run",
      input: { question: "What?" },
      params: { operation: "generateChat", question: "What?" },
    });

    expect(result.output).toEqual({ answer: "hello" });
    expect(result.modelUsage?.modelId).toBe("gemini-3.6-flash");
    expect(result.modelUsage?.estimatedCostUsd).toBeTypeOf("number");
    const job = repository.byId.get(result.jobId);
    expect(job?.status).toBe("completed");
    expect(job?.stepTrace?.length).toBe(1);
    expect(job?.stepTrace?.[0]?.rawModelAnswer).toBe("hello");
    expect(job?.modelUsage).toMatchObject({
      modelId: "gemini-3.6-flash",
      promptTokens: 10,
      candidatesTokens: 5,
      finishReason: "STOP",
    });
    expect(job?.modelUsage?.estimatedCostUsd).toBeTypeOf("number");
    expect(job?.stepTrace?.[0]?.modelUsage?.modelId).toBe("gemini-3.6-flash");
  });

  it("omits stepTrace when tracing is off but still persists modelUsage", async () => {
    const { controller, repository } = createDeps({ aiTraceEnabled: false });

    const result = await controller.runAiRequest({
      tenantId: "t1",
      feature: "dataHookCallAi",
      operation: "generateText",
      requestedBy: "system",
      permission: "ai.dataHook.run",
      input: {
        kind: "dataHookCallAi",
        hookId: "hook_1",
        prompt: "prompt",
      },
      params: {
        operation: "generateText",
        systemInstruction: "sys",
        userText: "prompt",
      },
    });

    const job = repository.byId.get(result.jobId);
    expect(job?.status).toBe("completed");
    expect(job?.stepTrace).toBeUndefined();
    expect(job?.output).toEqual({ text: '{"ok":true}' });
    expect(job?.modelUsage?.modelId).toBe("gemini-3.6-flash");
    expect(job?.modelUsage?.estimatedCostUsd).toBeTypeOf("number");
  });

  it("stores embedding sample not full vector and records embedding usage", async () => {
    const { controller, repository } = createDeps();
    const result = await controller.runAiRequest({
      tenantId: "t1",
      feature: "dataHookEmbedding",
      operation: "generateEmbedding",
      requestedBy: "system",
      permission: "ai.dataHook.run",
      input: {
        kind: "dataHookEmbedding",
        text: "hello",
      },
      params: { operation: "generateEmbedding", text: "hello" },
    });

    expect(result.output).toEqual({
      dimensions: 4,
      sample: [0.1, 0.2, 0.3, 0.4],
    });
    const job = repository.byId.get(result.jobId);
    expect(job?.feature).toBe("dataHookEmbedding");
    expect(job?.modelUsage).toMatchObject({
      modelId: "text-embedding-005",
      outputDimensions: 4,
    });
  });

  it("marks parentJobId on child jobs", async () => {
    const { controller, repository } = createDeps();
    const result = await controller.runAiRequest({
      tenantId: "t1",
      feature: "uiBuilder",
      operation: "generateText",
      requestedBy: "user_1",
      permission: "ai.uiBuilder.run",
      parentJobId: "aijob_parent",
      input: {
        kind: "uiBuilderStep",
        stepId: "list.selectViewType",
      },
      params: {
        operation: "generateText",
        systemInstruction: "sys",
        userText: "user",
        stepId: "list.selectViewType",
      },
    });

    const job = repository.byId.get(result.jobId);
    expect(job?.parentJobId).toBe("aijob_parent");
  });
});
