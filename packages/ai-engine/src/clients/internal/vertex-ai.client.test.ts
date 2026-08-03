import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();
const generateContentStreamMock = vi.fn();

vi.mock("@google-cloud/vertexai", () => ({
  VertexAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: generateContentMock,
      generateContentStream: generateContentStreamMock,
    }),
  })),
}));

import {
  buildUserParts,
  generateModelAnswer,
  generateModelAnswerStream,
  resetVertexClientsForTests,
  resolveGeminiLocation,
  resolveVertexApiEndpoint,
} from "./vertex-ai.client.js";
import { VERTEX_RATE_LIMIT_ERROR_MESSAGE } from "../../vertex-retry.js";
import { VertexAI } from "@google-cloud/vertexai";

const vertexConfig = {
  projectId: "demo",
  region: "us-central1",
  geminiLocation: "global",
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
      usageMetadata: {
        promptTokenCount: 12,
        candidatesTokenCount: 4,
        thoughtsTokenCount: 2,
        cachedContentTokenCount: 1,
        totalTokenCount: 18,
      },
    },
  };
}

describe("buildUserParts", () => {
  it("emits fileData for GCS URIs and inlineData for base64 parts", () => {
    expect(
      buildUserParts("extract this", {
        fileParts: [
          {
            fileUri: "gs://bucket/doc.pdf",
            mimeType: "application/pdf",
          },
          {
            inlineData: {
              data: "abc",
              mimeType: "image/png",
            },
          },
        ],
      }),
    ).toEqual([
      { text: "extract this" },
      {
        fileData: {
          fileUri: "gs://bucket/doc.pdf",
          mimeType: "application/pdf",
        },
      },
      { inlineData: { data: "abc", mimeType: "image/png" } },
    ]);
  });
});

describe("Gemini location helpers", () => {
  it("defaults gemini location to global and uses the global api host", () => {
    expect(
      resolveGeminiLocation({
        projectId: "demo",
        region: "us-central1",
        modelId: "gemini-3.6-flash",
        mockEnabled: false,
      }),
    ).toBe("global");
    expect(resolveVertexApiEndpoint("global")).toBe(
      "aiplatform.googleapis.com",
    );
    expect(resolveVertexApiEndpoint("us-central1")).toBeUndefined();
  });
});

describe("generateModelAnswer rate limit retries", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    resetVertexClientsForTests();
    vi.mocked(VertexAI).mockClear();
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
    await expect(promise).resolves.toMatchObject({
      text: "hello",
      usage: {
        modelId: "gemini-test",
        promptTokens: 12,
        candidatesTokens: 4,
        thoughtsTokens: 2,
        cachedContentTokens: 1,
        totalTokens: 18,
        finishReason: "STOP",
      },
    });
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

  it("constructs the Vertex client with global location and apiEndpoint", async () => {
    generateContentMock.mockResolvedValueOnce(successResponse("ok"));

    await generateModelAnswer(vertexConfig, {
      systemInstruction: "test",
      userText: "question",
    });

    expect(VertexAI).toHaveBeenCalledWith(
      expect.objectContaining({
        project: "demo",
        location: "global",
        apiEndpoint: "aiplatform.googleapis.com",
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

describe("generateModelAnswerStream", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    generateContentStreamMock.mockReset();
    resetVertexClientsForTests();
    vi.mocked(VertexAI).mockClear();
  });

  it("emits mock chunks when mockEnabled", async () => {
    const chunks: string[] = [];
    const result = await generateModelAnswerStream(
      { ...vertexConfig, mockEnabled: true },
      {
        systemInstruction: "synth",
        userText: "## Scratchpad / tool findings\nTool getRecord (ok): {}",
      },
      {
        stepId: "groundedChat.synthesis",
        onChunk: async (textSoFar) => {
          chunks.push(textSoFar);
        },
      },
    );

    expect(result.text.length).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.at(-1)).toBe(result.text);
  });

  it("streams Vertex deltas and returns final usage", async () => {
    async function* stream() {
      yield {
        candidates: [{ content: { parts: [{ text: "Hello " }] } }],
      };
      yield {
        candidates: [{ content: { parts: [{ text: "world" }] } }],
      };
    }

    generateContentStreamMock.mockResolvedValueOnce({
      stream: stream(),
      response: Promise.resolve({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: "Hello world" }] },
          },
        ],
        usageMetadata: {
          promptTokenCount: 3,
          candidatesTokenCount: 2,
          totalTokenCount: 5,
        },
      }),
    });

    const chunks: string[] = [];
    const result = await generateModelAnswerStream(
      vertexConfig,
      { systemInstruction: "sys", userText: "hi" },
      {
        onChunk: async (textSoFar) => {
          chunks.push(textSoFar);
        },
      },
    );

    expect(chunks).toEqual(["Hello ", "Hello world"]);
    expect(result.text).toBe("Hello world");
    expect(result.usage.promptTokens).toBe(3);
  });
});
