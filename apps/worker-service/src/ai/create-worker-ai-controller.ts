import {
  createAiController,
  createDefaultAiClients,
  type AiController,
} from "@repo/ai-engine/controller";
import type { VertexAiConfig } from "@repo/ai-engine/vertex-ai.client";
import type { AiJobRepository } from "@repo/worker-firestore";

export function createWorkerAiController(options: {
  readonly aiJobRepository: AiJobRepository;
  readonly vertexAiConfig: VertexAiConfig;
  readonly isAiEnabled: () => boolean | Promise<boolean>;
  readonly isAiTraceEnabled: () => boolean | Promise<boolean>;
}): AiController {
  return createAiController({
    repository: options.aiJobRepository,
    vertexAiConfig: options.vertexAiConfig,
    clients: createDefaultAiClients(),
    flags: {
      isAiEnabled: options.isAiEnabled,
      isAiTraceEnabled: options.isAiTraceEnabled,
    },
  });
}
