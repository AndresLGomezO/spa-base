import type { AiController } from "@repo/ai-engine/controller";
import type { VertexAiConfig } from "@repo/ai-engine/vertex-ai.client";
import type { DataHookEmbeddingRequest } from "@repo/hooks";

export type ComputeDataHookEmbeddingDeps = {
  readonly vertexAiConfig: VertexAiConfig;
  readonly aiController: AiController;
};

/**
 * Domain-agnostic embedding caller for `computeEmbedding` / `matchSimilarRecord`.
 * Every request is recorded via the unified AI controller.
 */
export function createComputeDataHookEmbedding(
  deps: ComputeDataHookEmbeddingDeps,
): (request: DataHookEmbeddingRequest) => Promise<readonly number[]> {
  return async (request) => {
    const tenantId = request.tenantId ?? "unknown";
    const result = await deps.aiController.runAiRequest({
      tenantId,
      feature: "dataHookEmbedding",
      operation: "generateEmbedding",
      requestedBy: "system",
      permission: "ai.dataHook.run",
      input: {
        kind: "dataHookEmbedding",
        text: request.text,
        ...(request.hookId ? { hookId: request.hookId } : {}),
        ...(request.hookExecutionId
          ? { hookExecutionId: request.hookExecutionId }
          : {}),
        ...(request.recordId ? { recordId: request.recordId } : {}),
        ...(request.entityName ? { entityName: request.entityName } : {}),
      },
      params: {
        operation: "generateEmbedding",
        text: request.text,
      },
    });

    if (!result.embeddingVector) {
      throw new Error("Embedding AI response missing vector.");
    }
    return result.embeddingVector;
  };
}
