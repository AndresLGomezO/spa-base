import { describe, expect, it } from "vitest";

import { createInMemoryAiJobRepository } from "@repo/firestore-converters";

describe("AiJobRepository uiBuilder input persistence", () => {
  it("preserves entityName and surface for uiBuilder jobs", async () => {
    const repository = createInMemoryAiJobRepository();
    const created = await repository.create("tenant_a", {
      feature: "uiBuilder",
      input: {
        question: "Design a list",
        entityName: "contract",
        surface: "list",
      },
      requestedBy: "user_1",
      permission: "ai.uiBuilder.run",
    });

    expect(created.input).toEqual({
      question: "Design a list",
      entityName: "contract",
      surface: "list",
      outputMode: "structure",
    });

    const loaded = await repository.getById("tenant_a", created.id);
    expect(loaded?.input).toEqual({
      question: "Design a list",
      entityName: "contract",
      surface: "list",
      outputMode: "structure",
    });
  });

  it("still accepts chat jobs with question-only input", async () => {
    const repository = createInMemoryAiJobRepository();
    const created = await repository.create("tenant_a", {
      feature: "chat",
      input: { question: "hello" },
      requestedBy: "user_1",
      permission: "ai.chat.run",
    });

    expect(created.input).toEqual({ question: "hello" });
  });

  it("round-trips modelUsage on update and stepTrace", async () => {
    const repository = createInMemoryAiJobRepository();
    const created = await repository.create("tenant_a", {
      feature: "chat",
      input: { question: "hello" },
      requestedBy: "user_1",
      permission: "ai.chat.run",
      status: "running",
      operation: "generateChat",
    });

    const modelUsage = {
      modelId: "gemini-3.6-flash",
      promptTokens: 10,
      candidatesTokens: 5,
      totalTokens: 15,
      estimatedCostUsd: 0.00002,
      costTier: "standard" as const,
    };

    await repository.appendStepTrace("tenant_a", created.id, {
      stepId: "chat.generateChat",
      attempt: 0,
      systemInstruction: "sys",
      contextBlocks: [],
      userText: "hello",
      outputInstruction: "",
      rawModelAnswer: "hi",
      validationOk: true,
      durationMs: 12,
      modelUsage,
    });

    const updated = await repository.update("tenant_a", created.id, {
      status: "completed",
      output: { answer: "hi" },
      error: null,
      modelUsage,
    });

    expect(updated.modelUsage).toEqual(modelUsage);
    expect(updated.stepTrace?.[0]?.modelUsage).toEqual(modelUsage);

    const loaded = await repository.getById("tenant_a", created.id);
    expect(loaded?.modelUsage).toEqual(modelUsage);
    expect(loaded?.stepTrace?.[0]?.modelUsage).toEqual(modelUsage);
  });
});
