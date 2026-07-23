import { generateTextEmbedding } from "@repo/ai-engine/text-embedding";
import type { VertexAiConfig } from "@repo/ai-engine/vertex-ai.client";
import type { DataHookEmbeddingRequest } from "@repo/hooks";

export type ComputeDataHookEmbeddingDeps = {
  readonly vertexAiConfig: VertexAiConfig;
};

/**
 * Domain-agnostic embedding caller for `computeEmbedding` / `matchSimilarRecord`.
 */
export function createComputeDataHookEmbedding(
  deps: ComputeDataHookEmbeddingDeps,
): (request: DataHookEmbeddingRequest) => Promise<readonly number[]> {
  return async (request) =>
    generateTextEmbedding(deps.vertexAiConfig, request.text, {
      taskType: "SEMANTIC_SIMILARITY",
    });
}
