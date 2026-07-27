import { describe, expect, it, vi } from "vitest";
import { createInMemoryAiJobRepository } from "@repo/firestore-converters";
import { createInMemoryDataHookAiCacheRepository } from "@repo/firestore-converters";
import { createMockVertexCachedContentClient } from "@repo/ai-engine/grounded-chat";
import { createAiController } from "@repo/ai-engine/controller";

import { createCallDataHookAi } from "./call-data-hook-ai.js";

function textResult(text: string, modelId = "gemini-3.6-flash") {
  return {
    text,
    usage: {
      modelId,
      promptTokens: 100,
      candidatesTokens: 40,
      totalTokens: 140,
      finishReason: "STOP",
    },
  };
}

describe("createCallDataHookAi via controller", () => {
  it("records an ai_jobs entry with feature/operation/input/output on Flash by default", async () => {
    const repository = createInMemoryAiJobRepository();
    const generateModelAnswer = vi.fn(async () =>
      textResult(
        JSON.stringify({ summary: "ok", confidence: 1 }),
        "gemini-3.6-flash",
      ),
    );
    const aiController = createAiController({
      repository,
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      clients: {
        generateModelAnswer,
        generateChatAnswer: vi.fn(async () => textResult("unused")),
        generateTextEmbedding: vi.fn(async () => ({
          vector: [0.1],
          usage: { modelId: "text-embedding-005", outputDimensions: 1 },
        })),
      },
      flags: {
        isAiEnabled: () => true,
        isAiTraceEnabled: () => true,
      },
    });

    const callAi = createCallDataHookAi({
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      aiController,
      getRepository: () => undefined,
    });

    const result = await callAi({
      tenantId: "tenant_a",
      hookId: "hook_enrich",
      hookName: "Enrich transactions",
      hookExecutionId: "exec_1",
      recordId: "txn_1",
      entityName: "transaction",
      prompt: "Enrich this transaction",
      systemInstruction: "Reply with JSON only.",
    });

    expect(result).toMatchObject({ summary: "ok" });
    expect(generateModelAnswer).toHaveBeenCalledOnce();
    expect(generateModelAnswer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        modelId: "gemini-3.6-flash",
        responseMimeType: "application/json",
      }),
    );

    const jobs = await repository.listRecent("tenant_a", { limit: 10 });
    expect(jobs).toHaveLength(1);
    const job = jobs[0]!;
    expect(job.feature).toBe("dataHookCallAi");
    expect(job.operation).toBe("generateText");
    expect(job.status).toBe("completed");
    expect(job.contextRef).toEqual({
      source: "hookExecution",
      id: "exec_1",
    });
    expect(job.input).toMatchObject({
      kind: "dataHookCallAi",
      hookId: "hook_enrich",
      prompt: "Enrich this transaction",
    });
    expect(job.output).toEqual({
      text: JSON.stringify({ summary: "ok", confidence: 1 }),
    });
    expect(job.stepTrace?.length).toBe(1);
    expect(job.stepTrace?.[0]?.durationMs).toBeTypeOf("number");
    expect(job.modelUsage).toMatchObject({
      modelId: "gemini-3.6-flash",
      promptTokens: 100,
      candidatesTokens: 40,
    });
    expect(job.modelUsage?.estimatedCostUsd).toBeTypeOf("number");
    expect(job.stepTrace?.[0]?.modelUsage?.modelId).toBe("gemini-3.6-flash");
  });

  it("uses the reasoning model when model is reasoning", async () => {
    const repository = createInMemoryAiJobRepository();
    const generateModelAnswer = vi.fn(async () =>
      textResult(
        JSON.stringify({ summary: "ok", confidence: 1 }),
        "gemini-3.1-pro-preview",
      ),
    );
    const aiController = createAiController({
      repository,
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      clients: {
        generateModelAnswer,
        generateChatAnswer: vi.fn(async () => textResult("unused")),
        generateTextEmbedding: vi.fn(async () => ({
          vector: [0.1],
          usage: { modelId: "text-embedding-005", outputDimensions: 1 },
        })),
      },
      flags: {
        isAiEnabled: () => true,
        isAiTraceEnabled: () => true,
      },
    });

    const callAi = createCallDataHookAi({
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      aiController,
      getRepository: () => undefined,
    });

    await callAi({
      tenantId: "tenant_a",
      hookId: "hook_summary",
      prompt: "Summarize portfolio",
      model: "reasoning",
    });

    expect(generateModelAnswer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        modelId: "gemini-3.1-pro-preview",
      }),
    );
    const jobs = await repository.listRecent("tenant_a", { limit: 10 });
    expect(jobs[0]?.modelUsage?.modelId).toBe("gemini-3.1-pro-preview");
  });

  it("omits reasoning modelId for classify requests with includeEntities", async () => {
    const repository = createInMemoryAiJobRepository();
    const generateModelAnswer = vi.fn(async () =>
      textResult(
        JSON.stringify({
          action: "abstain",
          categoryId: null,
          confidence: 0.1,
        }),
      ),
    );
    const aiController = createAiController({
      repository,
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      clients: {
        generateModelAnswer,
        generateChatAnswer: vi.fn(async () => textResult("unused")),
        generateTextEmbedding: vi.fn(async () => ({
          vector: [0.1],
          usage: { modelId: "text-embedding-005", outputDimensions: 1 },
        })),
      },
      flags: {
        isAiEnabled: () => true,
        isAiTraceEnabled: () => false,
      },
    });

    const categoryRepo = {
      findAll: vi.fn(async () => ({ items: [] as const })),
    };

    const callAi = createCallDataHookAi({
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      aiController,
      getRepository: () => categoryRepo as never,
    });

    await callAi({
      tenantId: "tenant_a",
      hookId: "hook_classify",
      prompt: "Classify transaction",
      includeEntities: ["category"],
    });

    expect(generateModelAnswer).toHaveBeenCalledOnce();
    expect(generateModelAnswer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        googleSearch: false,
        responseMimeType: "application/json",
      }),
    );
    expect(generateModelAnswer).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.not.objectContaining({ modelId: expect.anything() }),
    );
  });

  it("sends only the txn tail and cachedContent when classify catalog cache hits", async () => {
    const repository = createInMemoryAiJobRepository();
    const generateModelAnswer = vi.fn(async () =>
      textResult(
        JSON.stringify({
          action: "useExisting",
          categoryId: "cat_transport",
          confidence: 0.99,
        }),
      ),
    );
    const aiController = createAiController({
      repository,
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      clients: {
        generateModelAnswer,
        generateChatAnswer: vi.fn(async () => textResult("unused")),
        generateTextEmbedding: vi.fn(async () => ({
          vector: [0.1],
          usage: { modelId: "text-embedding-005", outputDimensions: 1 },
        })),
      },
      flags: {
        isAiEnabled: () => true,
        isAiTraceEnabled: () => false,
      },
    });

    const categoryRepo = {
      findAll: vi.fn(async () => ({
        items: [
          {
            id: "cat_transport",
            tenantId: "tenant_a",
            name: "Transport",
            kind: "EXPENSE",
          },
        ],
      })),
    };
    const cacheClient = createMockVertexCachedContentClient();
    const cacheRepository = createInMemoryDataHookAiCacheRepository();

    const callAi = createCallDataHookAi({
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      aiController,
      getRepository: () => categoryRepo as never,
      cacheClient,
      cacheRepository,
      isDataHookAiCacheEnabled: () => true,
    });

    const result = await callAi({
      tenantId: "tenant_a",
      hookId: "hook_classify",
      prompt: "Classify this bank transaction...\nDescription: UBER RIDES",
      systemInstruction: "Reply with JSON only.",
      includeEntities: ["category"],
    });

    expect(result).toMatchObject({
      action: "useExisting",
      categoryId: "cat_transport",
    });
    expect(generateModelAnswer).toHaveBeenCalledOnce();
    expect(generateModelAnswer).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userText: "Classify this bank transaction...\nDescription: UBER RIDES",
      }),
      expect.objectContaining({
        cachedContent: expect.stringContaining("cachedContents/mock-"),
        googleSearch: false,
      }),
    );
    const jobs = await repository.listRecent("tenant_a", { limit: 10 });
    expect(jobs[0]?.input).toMatchObject({
      kind: "dataHookCallAi",
      prompt: "Classify this bank transaction...\nDescription: UBER RIDES",
    });
  });

  it("retries once when the model returns truncated JSON", async () => {
    const repository = createInMemoryAiJobRepository();
    const generateModelAnswer = vi
      .fn()
      .mockResolvedValueOnce(
        textResult(
          '{"text":"partial","charts":[{"type":"pie"',
          "gemini-3.1-pro-preview",
        ),
      )
      .mockResolvedValueOnce(
        textResult(
          JSON.stringify({
            text: "complete",
            charts: [{ type: "pie", data: [] }],
          }),
          "gemini-3.1-pro-preview",
        ),
      );
    const aiController = createAiController({
      repository,
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      clients: {
        generateModelAnswer,
        generateChatAnswer: vi.fn(async () => textResult("unused")),
        generateTextEmbedding: vi.fn(async () => ({
          vector: [0.1],
          usage: { modelId: "text-embedding-005", outputDimensions: 1 },
        })),
      },
      flags: {
        isAiEnabled: () => true,
        isAiTraceEnabled: () => true,
      },
    });

    const callAi = createCallDataHookAi({
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      aiController,
      getRepository: () => undefined,
    });

    const result = await callAi({
      tenantId: "tenant_a",
      hookId: "hook_summary",
      prompt: "Summarize portfolio",
      systemInstruction: "Reply with JSON only.",
    });

    expect(result).toMatchObject({ text: "complete" });
    expect(generateModelAnswer).toHaveBeenCalledTimes(2);
    expect(generateModelAnswer).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        userText: expect.stringContaining("truncated mid-JSON"),
      }),
      expect.anything(),
    );
    expect(await repository.listRecent("tenant_a", { limit: 10 })).toHaveLength(
      2,
    );
  });

  it("omits stepTrace when aiTraceEnabled is false", async () => {
    const repository = createInMemoryAiJobRepository();
    const aiController = createAiController({
      repository,
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      clients: {
        generateModelAnswer: vi.fn(async () =>
          textResult(JSON.stringify({ summary: "ok" })),
        ),
        generateChatAnswer: vi.fn(async () => textResult("unused")),
        generateTextEmbedding: vi.fn(async () => ({
          vector: [0.1],
          usage: { modelId: "text-embedding-005", outputDimensions: 1 },
        })),
      },
      flags: {
        isAiEnabled: () => true,
        isAiTraceEnabled: () => false,
      },
    });

    const callAi = createCallDataHookAi({
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        reasoningModelId: "gemini-3.1-pro-preview",
        mockEnabled: false,
      },
      aiController,
      getRepository: () => undefined,
    });

    await callAi({
      tenantId: "tenant_a",
      hookId: "hook_1",
      prompt: "hi",
    });

    const jobs = await repository.listRecent("tenant_a", { limit: 10 });
    expect(jobs[0]?.status).toBe("completed");
    expect(jobs[0]?.stepTrace).toBeUndefined();
    expect(jobs[0]?.modelUsage?.modelId).toBe("gemini-3.6-flash");
  });
});
