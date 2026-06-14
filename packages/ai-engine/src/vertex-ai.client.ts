import { VertexAI } from "@google-cloud/vertexai";

import {
  buildMockChatAnswer,
  buildMockUiBuilderStepAnswer,
} from "./vertex-mock-responses.js";
import { getStepTemperature } from "./ui-builder-orchestrator/limits.js";
import {
  isVertexRateLimitError,
  normalizeVertexError,
  parseVertexRetryDelayMs,
  sleep,
  VERTEX_MAX_RETRIES,
} from "./vertex-retry.js";

export interface VertexAiConfig {
  readonly projectId: string;
  readonly region: string;
  readonly modelId: string;
  readonly imagenModelId?: string;
  readonly mockEnabled: boolean;
}

let vertexClient: VertexAI | null = null;

function getVertexClient(config: VertexAiConfig): VertexAI {
  if (!vertexClient) {
    vertexClient = new VertexAI({
      project: config.projectId,
      location: config.region,
    });
  }
  return vertexClient;
}

export function extractResponseText(response: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new Error("Vertex AI returned an empty response.");
  }
  return text;
}

export async function generateChatAnswer(
  config: VertexAiConfig,
  question: string,
): Promise<string> {
  return generateModelAnswer(config, {
    systemInstruction:
      "You are a helpful assistant for an entity management platform. Answer clearly and concisely.",
    userText: question,
  });
}

export interface GenerateModelAnswerInput {
  readonly systemInstruction: string;
  readonly userText: string;
  readonly contextBlocks?: readonly {
    readonly id: string;
    readonly content: string;
  }[];
  readonly inlineImage?: {
    readonly mimeType: string;
    readonly base64Data: string;
  };
}

export interface GenerateModelAnswerOptions {
  readonly maxOutputTokens?: number;
  readonly responseMimeType?: "text/plain" | "application/json";
  readonly stepId?: string;
}

const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
/** List/card layouts can be large; allow headroom above chat defaults. */
export const UI_BUILDER_MAX_OUTPUT_TOKENS = 16_384;

export async function generateModelAnswer(
  config: VertexAiConfig,
  input: GenerateModelAnswerInput,
  options?: GenerateModelAnswerOptions,
): Promise<string> {
  if (config.mockEnabled) {
    if (options?.stepId) {
      return buildMockUiBuilderStepAnswer(options.stepId, input.contextBlocks);
    }
    if (input.contextBlocks && input.contextBlocks.length > 0) {
      return buildMockUiBuilderStepAnswer(
        "list.selectViewType",
        input.contextBlocks,
      );
    }
    return buildMockChatAnswer(input.userText);
  }

  const contextText =
    input.contextBlocks && input.contextBlocks.length > 0
      ? input.contextBlocks
          .map((block) => `<!-- ${block.id} -->\n${block.content}`)
          .join("\n\n")
      : "";

  const userText = contextText
    ? `${contextText}\n\n---\n\n${input.userText}`
    : input.userText;

  const model = getVertexClient(config).getGenerativeModel({
    model: config.modelId,
    systemInstruction: {
      role: "system",
      parts: [{ text: input.systemInstruction }],
    },
  });

  for (let attempt = 0; attempt <= VERTEX_MAX_RETRIES; attempt += 1) {
    try {
      const userParts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [{ text: userText }];
      if (input.inlineImage) {
        userParts.push({
          inlineData: {
            mimeType: input.inlineImage.mimeType,
            data: input.inlineImage.base64Data,
          },
        });
      }

      const result = await model.generateContent({
        contents: [{ role: "user", parts: userParts }],
        generationConfig: {
          temperature: options?.stepId
            ? getStepTemperature(options.stepId)
            : 0.2,
          maxOutputTokens:
            options?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
          ...(options?.responseMimeType
            ? { responseMimeType: options.responseMimeType }
            : {}),
        },
      });

      const response = result.response;
      const finishReason = response.candidates?.[0]?.finishReason;
      const text = extractResponseText(response);
      if (finishReason === "MAX_TOKENS") {
        if (options?.stepId) {
          return text;
        }
        throw new Error(
          "Model response was truncated (max output tokens reached).",
        );
      }
      return text;
    } catch (error) {
      if (!isVertexRateLimitError(error) || attempt === VERTEX_MAX_RETRIES) {
        throw new Error(normalizeVertexError(error));
      }
      await sleep(parseVertexRetryDelayMs(error, attempt));
    }
  }

  throw new Error(normalizeVertexError("Vertex AI request failed."));
}
