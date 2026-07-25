import { GoogleGenAI } from "@google/genai";

import type { AiJobModelUsage } from "../../schemas/ai-job.schema.js";
import {
  isVertexRateLimitError,
  normalizeVertexError,
  parseVertexRetryDelayMs,
  sleep,
  VERTEX_MAX_RETRIES,
} from "../../vertex-retry.js";

export interface VertexImagenConfig {
  readonly projectId: string;
  readonly region: string;
  readonly imagenModelId: string;
  readonly mockEnabled: boolean;
}

export interface GenerateImagenImageResult {
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly usage: AiJobModelUsage;
}

/** Minimal valid 1×1 PNG for mock mode. */
const MOCK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let genAiClient: GoogleGenAI | null = null;

function getGenAiClient(config: VertexImagenConfig): GoogleGenAI {
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      vertexai: true,
      project: config.projectId,
      location: config.region,
    });
  }
  return genAiClient;
}

export async function generateImagenImage(
  config: VertexImagenConfig,
  prompt: string,
  options?: { readonly aspectRatio?: "16:9" | "4:3" | "1:1" },
): Promise<GenerateImagenImageResult> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error("Imagen prompt is empty.");
  }

  const aspectRatio = options?.aspectRatio ?? "16:9";
  const usage: AiJobModelUsage = {
    modelId: config.mockEnabled ? "mock" : config.imagenModelId,
    imageCount: 1,
    aspectRatio,
  };

  if (config.mockEnabled) {
    return {
      buffer: Buffer.from(MOCK_PNG_BASE64, "base64"),
      mimeType: "image/png",
      usage,
    };
  }

  const ai = getGenAiClient(config);

  for (let attempt = 0; attempt <= VERTEX_MAX_RETRIES; attempt += 1) {
    try {
      const response = await ai.models.generateImages({
        model: config.imagenModelId,
        prompt: trimmedPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio,
        },
      });

      const generatedImage = response.generatedImages?.[0];
      const imageBytes = generatedImage?.image?.imageBytes;
      if (!imageBytes) {
        throw new Error("Imagen returned no image bytes.");
      }

      return {
        buffer: Buffer.from(imageBytes, "base64"),
        mimeType: "image/png",
        usage: {
          modelId: config.imagenModelId,
          imageCount: 1,
          aspectRatio,
        },
      };
    } catch (error) {
      if (!isVertexRateLimitError(error) || attempt === VERTEX_MAX_RETRIES) {
        throw new Error(normalizeVertexError(error));
      }
      await sleep(parseVertexRetryDelayMs(error, attempt));
    }
  }

  throw new Error(normalizeVertexError("Imagen request failed."));
}
