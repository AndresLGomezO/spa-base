import type { AiJobModelUsage } from "../schemas/ai-job.schema.js";

export type GeminiFlashPrice = {
  readonly kind: "geminiFlash";
  readonly inputPerMTok: number;
  readonly outputPerMTok: number;
  readonly cachedInputPerMTok: number;
};

export type GeminiProPrice = {
  readonly kind: "geminiPro";
  readonly inputPerMTok: number;
  readonly outputPerMTok: number;
  readonly longContextInputPerMTok: number;
  readonly longContextOutputPerMTok: number;
  readonly longContextThresholdTokens: number;
  readonly cachedInputPerMTok: number;
};

export type EmbeddingPrice = {
  readonly kind: "embedding";
  readonly inputPerMTok: number;
};

export type ImagePrice = {
  readonly kind: "image";
  readonly pricePerImage: number;
};

export type ModelPrice =
  | GeminiFlashPrice
  | GeminiProPrice
  | EmbeddingPrice
  | ImagePrice;

/**
 * Hardcoded USD list prices for the models currently configured via
 * VERTEX_MODEL_ID / VERTEX_REASONING_MODEL_ID / VERTEX_IMAGEN_MODEL_ID /
 * text-embedding-005. Rough estimates that may lag real Vertex billing.
 */
export const MODEL_PRICING: Readonly<Record<string, ModelPrice>> = {
  "gemini-3.6-flash": {
    kind: "geminiFlash",
    inputPerMTok: 0.5,
    outputPerMTok: 3.0,
    cachedInputPerMTok: 0.05,
  },
  "gemini-3.1-pro-preview": {
    kind: "geminiPro",
    inputPerMTok: 2.0,
    outputPerMTok: 12.0,
    longContextInputPerMTok: 4.0,
    longContextOutputPerMTok: 18.0,
    longContextThresholdTokens: 200_000,
    cachedInputPerMTok: 0.2,
  },
  "text-embedding-005": {
    kind: "embedding",
    inputPerMTok: 0.1,
  },
  "imagen-3.0-generate-002": {
    kind: "image",
    pricePerImage: 0.04,
  },
};

export type CostEstimateInput = Omit<
  AiJobModelUsage,
  "modelId" | "estimatedCostUsd" | "costTier"
>;

export type CostEstimate = {
  readonly estimatedCostUsd?: number;
  readonly costTier?: "standard" | "longContext";
};

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * Estimate USD cost for a single model call from token / image usage.
 * Returns `{}` when the model id is unknown or usage is insufficient.
 */
export function estimateCostUsd(
  modelId: string,
  usage: CostEstimateInput,
): CostEstimate {
  const price = MODEL_PRICING[modelId];
  if (!price) {
    return {};
  }

  if (price.kind === "image") {
    const imageCount = usage.imageCount ?? 0;
    if (imageCount <= 0) {
      return {};
    }
    return { estimatedCostUsd: roundUsd(imageCount * price.pricePerImage) };
  }

  if (price.kind === "embedding") {
    let tokens = usage.promptTokens;
    if (tokens == null && typeof usage.inputCharacters === "number") {
      tokens = Math.ceil(usage.inputCharacters / 4);
    }
    if (tokens == null || tokens < 0) {
      return {};
    }
    return {
      estimatedCostUsd: roundUsd((tokens / 1_000_000) * price.inputPerMTok),
    };
  }

  const promptTokens = usage.promptTokens ?? 0;
  const candidatesTokens = usage.candidatesTokens ?? 0;
  const cachedTokens = Math.min(usage.cachedContentTokens ?? 0, promptTokens);
  const billablePrompt = Math.max(0, promptTokens - cachedTokens);

  if (price.kind === "geminiFlash") {
    const cost =
      (billablePrompt / 1_000_000) * price.inputPerMTok +
      (candidatesTokens / 1_000_000) * price.outputPerMTok +
      (cachedTokens / 1_000_000) * price.cachedInputPerMTok;
    return { estimatedCostUsd: roundUsd(cost), costTier: "standard" };
  }

  const longContext = promptTokens > price.longContextThresholdTokens;
  const inputRate = longContext
    ? price.longContextInputPerMTok
    : price.inputPerMTok;
  const outputRate = longContext
    ? price.longContextOutputPerMTok
    : price.outputPerMTok;
  const cost =
    (billablePrompt / 1_000_000) * inputRate +
    (candidatesTokens / 1_000_000) * outputRate +
    (cachedTokens / 1_000_000) * price.cachedInputPerMTok;
  return {
    estimatedCostUsd: roundUsd(cost),
    costTier: longContext ? "longContext" : "standard",
  };
}

/** Merge a usage object with a cost estimate (omitting undefined cost fields). */
export function withEstimatedCost(usage: AiJobModelUsage): AiJobModelUsage {
  const estimate = estimateCostUsd(usage.modelId, usage);
  return {
    ...usage,
    ...(estimate.estimatedCostUsd != null
      ? { estimatedCostUsd: estimate.estimatedCostUsd }
      : {}),
    ...(estimate.costTier != null ? { costTier: estimate.costTier } : {}),
  };
}
