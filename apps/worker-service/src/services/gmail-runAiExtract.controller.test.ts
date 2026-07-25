import { describe, expect, it, vi } from "vitest";
import { createInMemoryAiJobRepository } from "@repo/firestore-converters";
import { createAiController } from "@repo/ai-engine/controller";

import { runAiExtract } from "./gmail-ai-extract.js";

const sampleEmail = {
  messageId: "msg_1",
  threadId: "thread_1",
  from: "billing@example.com",
  subject: "Invoice #1",
  snippet: "Please pay $12",
  date: new Date().toISOString(),
  bodyText: "Please pay $12",
  attachments: [] as {
    attachmentId: string;
    filename: string;
    mimeType: string;
    size: number;
  }[],
};

function textResult(text: string) {
  return {
    text,
    usage: {
      modelId: "gemini-3.6-flash",
      promptTokens: 80,
      candidatesTokens: 30,
      totalTokens: 110,
      finishReason: "STOP",
    },
  };
}

describe("runAiExtract via controller", () => {
  it("records a gmailExtract ai_jobs entry with prompt output and duration", async () => {
    const repository = createInMemoryAiJobRepository();
    const modelAnswer = JSON.stringify({
      relevant: true,
      reason: "invoice",
      fields: { amount: 12 },
    });
    const aiController = createAiController({
      repository,
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        mockEnabled: false,
      },
      clients: {
        generateModelAnswer: vi.fn(async () => textResult(modelAnswer)),
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

    const extracted = await runAiExtract(
      { aiController },
      {
        tenantId: "tenant_a",
        userId: "user_1",
        jobId: "emailjob_1",
        email: sampleEmail,
        entityName: "transaction",
        record: { id: "tx_1" },
        fieldNames: ["amount", "description"],
        aiInstructions: "Extract amount",
      },
    );

    expect(extracted).toMatchObject({
      relevant: true,
      reason: "invoice",
    });

    const jobs = await repository.listRecent("tenant_a", { limit: 10 });
    expect(jobs).toHaveLength(1);
    const job = jobs[0]!;
    expect(job.feature).toBe("gmailExtract");
    expect(job.operation).toBe("generateText");
    expect(job.status).toBe("completed");
    expect(job.contextRef).toEqual({
      source: "emailIngestJob",
      id: "emailjob_1",
    });
    expect(job.input).toMatchObject({
      kind: "gmailExtract",
      messageId: "msg_1",
      entityName: "transaction",
    });
    expect(job.output).toEqual({ text: modelAnswer });
    expect(job.stepTrace?.[0]?.durationMs).toBeTypeOf("number");
    expect(job.modelUsage).toMatchObject({
      modelId: "gemini-3.6-flash",
      promptTokens: 80,
      candidatesTokens: 30,
    });
    expect(job.modelUsage?.estimatedCostUsd).toBeTypeOf("number");
  });

  it("still writes the job envelope when tracing is off", async () => {
    const repository = createInMemoryAiJobRepository();
    const aiController = createAiController({
      repository,
      vertexAiConfig: {
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        mockEnabled: false,
      },
      clients: {
        generateModelAnswer: vi.fn(async () =>
          textResult(
            JSON.stringify({ relevant: false, reason: "spam", fields: {} }),
          ),
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

    await runAiExtract(
      { aiController },
      {
        tenantId: "tenant_a",
        userId: "user_1",
        jobId: "emailjob_2",
        email: {
          ...sampleEmail,
          messageId: "msg_2",
          subject: "Hello",
        },
        entityName: "loan",
        record: {},
        fieldNames: [],
      },
    );

    const jobs = await repository.listRecent("tenant_a", { limit: 10 });
    expect(jobs[0]?.status).toBe("completed");
    expect(jobs[0]?.stepTrace).toBeUndefined();
    expect(jobs[0]?.modelUsage?.modelId).toBe("gemini-3.6-flash");
  });
});
