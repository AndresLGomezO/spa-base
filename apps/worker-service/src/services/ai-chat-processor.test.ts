import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../process-ai-chat.js", () => ({
  processAiChat: vi.fn(),
}));

vi.mock("@repo/ai-engine/observability", () => ({
  emitAiChatMetrics: vi.fn(),
  emitAiErrorMetric: vi.fn(),
}));

import { processAiChat } from "../process-ai-chat.js";
import { PermanentTaskError, processAiChatJob } from "./ai-chat-processor.js";

describe("processAiChatJob streaming draft", () => {
  beforeEach(() => {
    vi.mocked(processAiChat).mockReset();
  });

  it("writes progress and partialAnswer draft while the orchestrator runs", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const aiJobRepository = {
      getById: vi.fn(async () => ({
        id: "job-1",
        feature: "chat",
        permission: "ai.chat.run",
        status: "pending",
        requestedBy: "u1",
        input: { question: "Biggest product?" },
      })),
      update: vi.fn(
        async (
          _tenantId: string,
          _id: string,
          patch: Record<string, unknown>,
        ) => {
          updates.push(patch);
          return { id: "job-1", ...patch };
        },
      ),
      listRecent: vi.fn(async () => []),
    };

    vi.mocked(processAiChat).mockImplementation(
      async (_config, _input, options) => {
        await options.callbacks?.onProgress?.({
          stepIndex: 0,
          totalSteps: 8,
          stepId: "groundedChat.synthesis",
          stepLabel: "Writing answer…",
          phase: "synthesis",
        });
        await options.callbacks?.onPartialAnswer?.("Your biggest");
        return {
          answer: "Your biggest product is Alpha.",
          citations: [],
          sessionId: "session-1",
          metrics: {
            stepCount: 2,
            toolCallCount: 1,
            cacheHit: false,
            parseRetryCount: 0,
          },
        };
      },
    );

    await processAiChatJob(
      {
        aiJobRepository: aiJobRepository as never,
        vertexAiConfig: {
          projectId: "demo",
          region: "us-central1",
          modelId: "flash",
          mockEnabled: true,
        },
        aiController: {} as never,
        tenantAiContextRepository: {} as never,
        userAiMemoryRepository: {} as never,
        aiChatSessionRepository: {} as never,
        groundedChatDataPorts: {
          listEntities: async () => [],
          listMetrics: async () => [],
          listQueries: async () => [],
          searchRecords: async () => [],
          getRecord: async () => null,
          getUserMemoryFacts: async () => [],
        },
      },
      "t1",
      "job-1",
    );

    expect(updates).toEqual(
      expect.arrayContaining([
        { status: "running" },
        expect.objectContaining({
          progress: expect.objectContaining({
            stepLabel: "Writing answer…",
          }),
        }),
        {
          draft: {
            partialAnswer: "Your biggest",
            streaming: true,
          },
        },
        expect.objectContaining({
          status: "completed",
          draft: {
            partialAnswer: "Your biggest product is Alpha.",
            streaming: false,
          },
        }),
      ]),
    );
  });

  it("marks failed jobs and clears streaming draft", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const aiJobRepository = {
      getById: vi.fn(async () => ({
        id: "job-2",
        feature: "chat",
        permission: "ai.chat.run",
        status: "pending",
        requestedBy: "u1",
        input: { question: "hi" },
      })),
      update: vi.fn(
        async (_t: string, _id: string, patch: Record<string, unknown>) => {
          updates.push(patch);
          return { id: "job-2", ...patch };
        },
      ),
      listRecent: vi.fn(async () => []),
    };

    vi.mocked(processAiChat).mockRejectedValue(new Error("boom"));

    await expect(
      processAiChatJob(
        {
          aiJobRepository: aiJobRepository as never,
          vertexAiConfig: {
            projectId: "demo",
            region: "us-central1",
            modelId: "flash",
            mockEnabled: true,
          },
          aiController: {} as never,
          tenantAiContextRepository: {} as never,
          userAiMemoryRepository: {} as never,
          aiChatSessionRepository: {} as never,
          groundedChatDataPorts: {
            listEntities: async () => [],
            listMetrics: async () => [],
            listQueries: async () => [],
            searchRecords: async () => [],
            getRecord: async () => null,
            getUserMemoryFacts: async () => [],
          },
        },
        "t1",
        "job-2",
      ),
    ).rejects.toBeInstanceOf(PermanentTaskError);

    expect(updates.at(-1)).toEqual(
      expect.objectContaining({
        status: "failed",
        draft: { streaming: false },
        progress: null,
      }),
    );
  });
});
