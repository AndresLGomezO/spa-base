import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google-cloud/vertexai", () => ({
  VertexAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: generateContentMock,
    }),
  })),
}));

import { generateModelAnswer } from "./vertex-ai.client.js";
import { VERTEX_RATE_LIMIT_ERROR_MESSAGE } from "./vertex-retry.js";

const vertexConfig = {
  projectId: "demo",
  region: "us-central1",
  modelId: "gemini-test",
  mockEnabled: false,
};

function successResponse(text: string) {
  return {
    response: {
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text }] },
        },
      ],
    },
  };
}

describe("generateModelAnswer rate limit retries", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries after 429 and returns the successful response", async () => {
    generateContentMock
      .mockRejectedValueOnce(
        new Error(
          '[VertexAI.ClientError]: got status: 429 Too Many Requests. {"status":"RESOURCE_EXHAUSTED"}',
        ),
      )
      .mockRejectedValueOnce(
        new Error(
          '[VertexAI.ClientError]: got status: 429 Too Many Requests. {"status":"RESOURCE_EXHAUSTED"}',
        ),
      )
      .mockResolvedValueOnce(successResponse("hello"));

    const promise = generateModelAnswer(vertexConfig, {
      systemInstruction: "test",
      userText: "question",
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("hello");
    expect(generateContentMock).toHaveBeenCalledTimes(3);
  });

  it("throws a friendly message when retries are exhausted", async () => {
    generateContentMock.mockRejectedValue(
      new Error(
        '[VertexAI.ClientError]: got status: 429 Too Many Requests. {"status":"RESOURCE_EXHAUSTED"}',
      ),
    );

    const promise = generateModelAnswer(vertexConfig, {
      systemInstruction: "test",
      userText: "question",
    });
    const assertion = expect(promise).rejects.toThrow(
      VERTEX_RATE_LIMIT_ERROR_MESSAGE,
    );

    await vi.runAllTimersAsync();
    await assertion;
  });

  it("passes thinkingBudget when provided", async () => {
    generateContentMock.mockResolvedValueOnce(successResponse("ok"));

    await generateModelAnswer(
      vertexConfig,
      { systemInstruction: "test", userText: "question" },
      { thinkingBudget: 512, maxOutputTokens: 8192 },
    );

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 512 },
        }),
      }),
    );
  });

  it("attaches googleSearch tool and skips JSON mime when googleSearch is true", async () => {
    generateContentMock.mockResolvedValueOnce(successResponse("{}"));

    await generateModelAnswer(
      vertexConfig,
      { systemInstruction: "test", userText: "question" },
      { googleSearch: true, responseMimeType: "application/json" },
    );

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [{ googleSearch: {} }],
        generationConfig: expect.not.objectContaining({
          responseMimeType: "application/json",
        }),
      }),
    );
  });
});
