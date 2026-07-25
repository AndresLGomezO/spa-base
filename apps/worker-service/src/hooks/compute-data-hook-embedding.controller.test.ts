import { describe, expect, it, vi } from "vitest";
import { createInMemoryAiJobRepository } from "@repo/firestore-converters";
import { createAiController } from "@repo/ai-engine/controller";

import { createComputeDataHookEmbedding } from "./compute-data-hook-embedding.js";

describe("createComputeDataHookEmbedding via controller", () => {
  it("records an embedding ai_jobs entry and returns the full vector", async () => {
    const repository = createInMemoryAiJobRepository();
    const vector = [0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77, 0.88, 0.99];
    const aiController = createAiController({
      repository,
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        mockEnabled: false,
      },
      clients: {
        generateModelAnswer: vi.fn(async () => ({
          text: "unused",
          usage: { modelId: "gemini-3.6-flash" },
        })),
        generateChatAnswer: vi.fn(async () => ({
          text: "unused",
          usage: { modelId: "gemini-3.6-flash" },
        })),
        generateTextEmbedding: vi.fn(async () => ({
          vector,
          usage: {
            modelId: "text-embedding-005",
            outputDimensions: vector.length,
            inputCharacters: "coffee shop".length,
            promptTokens: 3,
          },
        })),
      },
      flags: {
        isAiEnabled: () => true,
        isAiTraceEnabled: () => true,
      },
    });

    const compute = createComputeDataHookEmbedding({
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        mockEnabled: false,
      },
      aiController,
    });

    const values = await compute({
      tenantId: "tenant_a",
      hookId: "hook_embed",
      hookExecutionId: "exec_embed",
      entityName: "transaction",
      recordId: "tx_1",
      text: "coffee shop",
    });

    expect(values).toEqual(vector);

    const jobs = await repository.listRecent("tenant_a", { limit: 10 });
    expect(jobs).toHaveLength(1);
    const job = jobs[0]!;
    expect(job.feature).toBe("dataHookEmbedding");
    expect(job.operation).toBe("generateEmbedding");
    expect(job.status).toBe("completed");
    expect(job.input).toMatchObject({
      kind: "dataHookEmbedding",
      hookId: "hook_embed",
      text: "coffee shop",
    });
    expect(job.output).toMatchObject({
      dimensions: vector.length,
      sample: vector.slice(0, 8),
    });
    expect(
      "vector" in (job.output ?? {})
        ? (job.output as { vector?: unknown }).vector
        : undefined,
    ).toBeUndefined();
    expect(job.modelUsage).toMatchObject({
      modelId: "text-embedding-005",
      outputDimensions: vector.length,
      promptTokens: 3,
    });
    expect(job.modelUsage?.estimatedCostUsd).toBeTypeOf("number");
  });
});
