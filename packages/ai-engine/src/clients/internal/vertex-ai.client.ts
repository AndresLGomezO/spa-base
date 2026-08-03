import { VertexAI } from "@google-cloud/vertexai";

import {
  buildMockChatAnswer,
  buildMockDocumentExtractAnswer,
  buildMockGroundedChatAnswer,
  buildMockGroundedChatSynthesisAnswer,
  buildMockRecordNarrativeAnswer,
  buildMockUiBuilderStepAnswer,
  looksLikeDocumentExtractPrompt,
  looksLikeRecordNarrativePrompt,
} from "../../vertex-mock-responses.js";
import { getStepTemperature } from "../../ui-builder-orchestrator/limits.js";
import { MAX_OUTPUT_TOKENS_ERROR } from "../../extract-json-from-model-answer.js";
import type { AiJobModelUsage } from "../../schemas/ai-job.schema.js";
import {
  isVertexRateLimitError,
  normalizeVertexError,
  parseVertexRetryDelayMs,
  sleep,
  VERTEX_MAX_RETRIES,
} from "../../vertex-retry.js";

export interface VertexAiConfig {
  readonly projectId: string;
  /**
   * Regional location for embeddings / Imagen (e.g. `us-central1`).
   * Kept separate from Gemini generative location — Gemini 3.x preview
   * models are global-only on Vertex.
   */
  readonly region: string;
  /**
   * Location for Gemini `generateContent` calls.
   * Defaults to `global` when unset — required for gemini-3.x preview models.
   */
  readonly geminiLocation?: string;
  /** Default model (Flash) for classify, chat, UI builder, and other light tasks. */
  readonly modelId: string;
  /** Optional stronger model for narrative / contract JSON summaries. */
  readonly reasoningModelId?: string;
  readonly imagenModelId?: string;
  readonly mockEnabled: boolean;
}

export interface GenerateModelAnswerResult {
  readonly text: string;
  readonly usage: AiJobModelUsage;
}

const vertexClientsByKey = new Map<string, VertexAI>();

/** Clears cached Vertex clients (tests only). */
export function resetVertexClientsForTests(): void {
  vertexClientsByKey.clear();
}

/** Gemini 3.x preview models require the global Vertex endpoint. */
export function resolveGeminiLocation(config: VertexAiConfig): string {
  const location = config.geminiLocation?.trim() || "global";
  return location;
}

/**
 * Vertex global location uses host `aiplatform.googleapis.com` (not
 * `global-aiplatform.googleapis.com`). Regional locations keep the
 * `{region}-aiplatform.googleapis.com` host the SDK builds by default.
 */
export function resolveVertexApiEndpoint(location: string): string | undefined {
  if (location === "global") {
    return "aiplatform.googleapis.com";
  }
  return undefined;
}

function getVertexClient(config: VertexAiConfig): VertexAI {
  const location = resolveGeminiLocation(config);
  const apiEndpoint = resolveVertexApiEndpoint(location);
  const cacheKey = `${config.projectId}:${location}:${apiEndpoint ?? "default"}`;
  const cached = vertexClientsByKey.get(cacheKey);
  if (cached) {
    return cached;
  }
  const client = new VertexAI({
    project: config.projectId,
    location,
    ...(apiEndpoint ? { apiEndpoint } : {}),
  });
  vertexClientsByKey.set(cacheKey, client);
  return client;
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

function optionalNonNegInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : undefined;
}

export function parseVertexUsageMetadata(
  modelId: string,
  response: {
    readonly usageMetadata?: {
      readonly promptTokenCount?: number;
      readonly candidatesTokenCount?: number;
      readonly thoughtsTokenCount?: number;
      readonly cachedContentTokenCount?: number;
      readonly totalTokenCount?: number;
    };
    readonly candidates?: ReadonlyArray<{
      readonly finishReason?: string;
    }>;
  },
): AiJobModelUsage {
  const meta = response.usageMetadata;
  const finishReason = response.candidates?.[0]?.finishReason;
  return {
    modelId,
    ...(optionalNonNegInt(meta?.promptTokenCount) != null
      ? { promptTokens: optionalNonNegInt(meta?.promptTokenCount) }
      : {}),
    ...(optionalNonNegInt(meta?.candidatesTokenCount) != null
      ? { candidatesTokens: optionalNonNegInt(meta?.candidatesTokenCount) }
      : {}),
    ...(optionalNonNegInt(meta?.thoughtsTokenCount) != null
      ? { thoughtsTokens: optionalNonNegInt(meta?.thoughtsTokenCount) }
      : {}),
    ...(optionalNonNegInt(meta?.cachedContentTokenCount) != null
      ? {
          cachedContentTokens: optionalNonNegInt(meta?.cachedContentTokenCount),
        }
      : {}),
    ...(optionalNonNegInt(meta?.totalTokenCount) != null
      ? { totalTokens: optionalNonNegInt(meta?.totalTokenCount) }
      : {}),
    ...(typeof finishReason === "string" && finishReason.trim().length > 0
      ? { finishReason }
      : {}),
  };
}

function mockUsage(modelId: string): AiJobModelUsage {
  return { modelId };
}

export async function generateChatAnswer(
  config: VertexAiConfig,
  question: string,
): Promise<GenerateModelAnswerResult> {
  return generateModelAnswer(config, {
    systemInstruction:
      "You are a helpful assistant for an entity management platform. Answer clearly and concisely.",
    userText: question,
  });
}

export type GenerateModelFilePart =
  | {
      readonly fileUri: string;
      readonly mimeType: string;
    }
  | {
      readonly inlineData: {
        readonly data: string;
        readonly mimeType: string;
      };
    };

export interface GenerateModelAnswerInput {
  readonly systemInstruction: string;
  readonly userText: string;
  readonly contextBlocks?: readonly {
    readonly id: string;
    readonly content: string;
  }[];
  /** @deprecated Prefer `fileParts` with inlineData; kept for existing callers. */
  readonly inlineImage?: {
    readonly mimeType: string;
    readonly base64Data: string;
  };
  /**
   * Multimodal parts (GCS `fileData` URIs or inline base64). Prefer GCS URIs
   * so raw document bytes never sit in `ai_jobs.input`.
   */
  readonly fileParts?: readonly GenerateModelFilePart[];
}

export interface GenerateModelAnswerOptions {
  /** Override `VertexAiConfig.modelId` for this call (e.g. reasoning model). */
  readonly modelId?: string;
  readonly maxOutputTokens?: number;
  /**
   * Soft ceiling on Gemini 2.5+ thinking tokens. Thinking counts toward
   * `maxOutputTokens`; leave room for the visible answer (Pro minimum is 128).
   */
  readonly thinkingBudget?: number;
  readonly responseMimeType?: "text/plain" | "application/json";
  /** When true, enable Vertex Google Search grounding (incompatible with JSON mime). */
  readonly googleSearch?: boolean;
  /** Vertex CachedContent resource name (projects/.../cachedContents/...). */
  readonly cachedContent?: string;
  readonly stepId?: string;
}

const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
/** List/card layouts can be large; allow headroom above chat defaults. */
export const UI_BUILDER_MAX_OUTPUT_TOKENS = 16_384;
/** Compact JSON classification — keep thinking small so MAX_TOKENS still has answer room. */
export const DATA_HOOK_AI_THINKING_BUDGET = 512;
/**
 * Single `callAi` classify default. Narrative uses a higher dedicated budget.
 */
export const DATA_HOOK_AI_MAX_OUTPUT_TOKENS = 16_384;
/** Long markdown narratives + chart payloads (Gemini 2.5 supports this). */
export const DATA_HOOK_AI_NARRATIVE_MAX_OUTPUT_TOKENS = 32_768;
/** Minimal thinking so almost all budget goes to the visible JSON answer. */
export const DATA_HOOK_AI_NARRATIVE_THINKING_BUDGET = 128;
export const DATA_HOOK_AI_BATCH_MAX_OUTPUT_TOKENS = 16_384;

function resolveMockModelAnswer(
  input: GenerateModelAnswerInput,
  options?: GenerateModelAnswerOptions,
): string {
  if (options?.stepId === "groundedChat.synthesis") {
    return buildMockGroundedChatSynthesisAnswer(input.userText);
  }
  if (options?.stepId?.startsWith("groundedChat.")) {
    return buildMockGroundedChatAnswer(input.userText);
  }
  if (options?.stepId) {
    return buildMockUiBuilderStepAnswer(options.stepId, input.contextBlocks);
  }
  if (input.contextBlocks && input.contextBlocks.length > 0) {
    return buildMockUiBuilderStepAnswer(
      "list.selectViewType",
      input.contextBlocks,
    );
  }
  if (
    options?.responseMimeType === "application/json" ||
    looksLikeRecordNarrativePrompt(input.userText)
  ) {
    if (looksLikeDocumentExtractPrompt(input.userText)) {
      return buildMockDocumentExtractAnswer(input.userText);
    }
    // Prefer chart-capable narrative JSON for recordNarrativeRefresh / callAi narratives.
    return looksLikeRecordNarrativePrompt(input.userText)
      ? buildMockRecordNarrativeAnswer(input.userText)
      : buildMockChatAnswer(input.userText);
  }
  if (looksLikeDocumentExtractPrompt(input.userText)) {
    return buildMockDocumentExtractAnswer(input.userText);
  }
  return buildMockChatAnswer(input.userText);
}

function extractPartialResponseText(response: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("");
}

function buildGenerationConfig(
  options?: GenerateModelAnswerOptions,
): Record<string, unknown> {
  const generationConfig: Record<string, unknown> = {
    temperature: options?.stepId ? getStepTemperature(options.stepId) : 0.2,
    maxOutputTokens: options?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  };
  // JSON mime + Google Search tools are often incompatible on Gemini.
  if (options?.responseMimeType && !options.googleSearch) {
    generationConfig.responseMimeType = options.responseMimeType;
  }
  if (typeof options?.thinkingBudget === "number") {
    // Not yet on GenerationConfig typings in @google-cloud/vertexai@1.12;
    // the Vertex REST API accepts thinkingConfig for Gemini 2.5+.
    generationConfig.thinkingConfig = {
      thinkingBudget: options.thinkingBudget,
    };
  }
  return generationConfig;
}

export type VertexUserPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { fileUri: string; mimeType: string } };

export function buildUserParts(
  userText: string,
  options?: {
    readonly inlineImage?: GenerateModelAnswerInput["inlineImage"];
    readonly fileParts?: readonly GenerateModelFilePart[];
  },
): VertexUserPart[] {
  const userParts: VertexUserPart[] = [{ text: userText }];
  if (options?.inlineImage) {
    userParts.push({
      inlineData: {
        mimeType: options.inlineImage.mimeType,
        data: options.inlineImage.base64Data,
      },
    });
  }
  for (const part of options?.fileParts ?? []) {
    if ("fileUri" in part) {
      userParts.push({
        fileData: { fileUri: part.fileUri, mimeType: part.mimeType },
      });
    } else {
      userParts.push({
        inlineData: {
          mimeType: part.inlineData.mimeType,
          data: part.inlineData.data,
        },
      });
    }
  }
  return userParts;
}

async function emitMockAnswerChunks(
  text: string,
  onChunk?: (textSoFar: string) => void | Promise<void>,
): Promise<void> {
  if (!onChunk) {
    return;
  }
  const chunkSize = Math.max(12, Math.ceil(text.length / 4));
  for (let index = chunkSize; index < text.length; index += chunkSize) {
    await onChunk(text.slice(0, index));
    await sleep(15);
  }
  await onChunk(text);
}

export async function generateModelAnswer(
  config: VertexAiConfig,
  input: GenerateModelAnswerInput,
  options?: GenerateModelAnswerOptions,
): Promise<GenerateModelAnswerResult> {
  const resolvedModelId = options?.modelId ?? config.modelId;

  if (config.mockEnabled) {
    return {
      text: resolveMockModelAnswer(input, options),
      usage: mockUsage("mock"),
    };
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

  const model = getVertexClient(config).getGenerativeModel(
    options?.cachedContent
      ? ({
          model: resolvedModelId,
          cachedContent: options.cachedContent,
        } as never)
      : {
          model: resolvedModelId,
          systemInstruction: {
            role: "system",
            parts: [{ text: input.systemInstruction }],
          },
        },
  );

  for (let attempt = 0; attempt <= VERTEX_MAX_RETRIES; attempt += 1) {
    try {
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: buildUserParts(userText, {
              inlineImage: input.inlineImage,
              fileParts: input.fileParts,
            }),
          },
        ],
        generationConfig: buildGenerationConfig(options),
        ...(options?.googleSearch
          ? // Gemini 2.x+: use googleSearch (googleSearchRetrieval is legacy 1.5-only).
            { tools: [{ googleSearch: {} } as never] }
          : {}),
      });

      const response = result.response;
      const finishReason = response.candidates?.[0]?.finishReason;
      const text = extractResponseText(response);
      const usage = parseVertexUsageMetadata(resolvedModelId, response);
      if (finishReason === "MAX_TOKENS") {
        if (options?.stepId) {
          return { text, usage };
        }
        throw new Error(MAX_OUTPUT_TOKENS_ERROR);
      }
      return { text, usage };
    } catch (error) {
      if (!isVertexRateLimitError(error) || attempt === VERTEX_MAX_RETRIES) {
        throw new Error(normalizeVertexError(error));
      }
      await sleep(parseVertexRetryDelayMs(error, attempt));
    }
  }

  throw new Error(normalizeVertexError("Vertex AI request failed."));
}

export interface GenerateModelAnswerStreamOptions extends GenerateModelAnswerOptions {
  readonly onChunk?: (textSoFar: string) => void | Promise<void>;
}

/**
 * Stream a text completion, calling `onChunk` with the accumulated answer so far.
 * Spend/usage is taken from the final stream response (same metering as non-stream).
 */
export async function generateModelAnswerStream(
  config: VertexAiConfig,
  input: GenerateModelAnswerInput,
  options?: GenerateModelAnswerStreamOptions,
): Promise<GenerateModelAnswerResult> {
  const resolvedModelId = options?.modelId ?? config.modelId;

  if (config.mockEnabled) {
    const text = resolveMockModelAnswer(input, options);
    await emitMockAnswerChunks(text, options?.onChunk);
    return { text, usage: mockUsage("mock") };
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

  const model = getVertexClient(config).getGenerativeModel(
    options?.cachedContent
      ? ({
          model: resolvedModelId,
          cachedContent: options.cachedContent,
        } as never)
      : {
          model: resolvedModelId,
          systemInstruction: {
            role: "system",
            parts: [{ text: input.systemInstruction }],
          },
        },
  );

  for (let attempt = 0; attempt <= VERTEX_MAX_RETRIES; attempt += 1) {
    try {
      const streamingResult = await model.generateContentStream({
        contents: [
          {
            role: "user",
            parts: buildUserParts(userText, {
              inlineImage: input.inlineImage,
              fileParts: input.fileParts,
            }),
          },
        ],
        generationConfig: buildGenerationConfig(options),
        ...(options?.googleSearch
          ? { tools: [{ googleSearch: {} } as never] }
          : {}),
      });

      let textSoFar = "";
      for await (const chunk of streamingResult.stream) {
        const delta = extractPartialResponseText(chunk);
        if (!delta) continue;
        textSoFar += delta;
        if (options?.onChunk) {
          await options.onChunk(textSoFar);
        }
      }

      const response = await streamingResult.response;
      const finishReason = response.candidates?.[0]?.finishReason;
      const text =
        textSoFar.trim().length > 0
          ? textSoFar.trim()
          : extractResponseText(response);
      if (options?.onChunk && text !== textSoFar) {
        await options.onChunk(text);
      }
      const usage = parseVertexUsageMetadata(resolvedModelId, response);
      if (finishReason === "MAX_TOKENS") {
        if (options?.stepId) {
          return { text, usage };
        }
        throw new Error(MAX_OUTPUT_TOKENS_ERROR);
      }
      return { text, usage };
    } catch (error) {
      if (!isVertexRateLimitError(error) || attempt === VERTEX_MAX_RETRIES) {
        throw new Error(normalizeVertexError(error));
      }
      await sleep(parseVertexRetryDelayMs(error, attempt));
    }
  }

  throw new Error(normalizeVertexError("Vertex AI request failed."));
}
