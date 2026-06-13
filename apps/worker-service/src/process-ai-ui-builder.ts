import type {
  AiUiBuilderInput,
  AiUiBuilderOutput,
} from "@repo/ai-engine/schemas";
import { processAiUiBuilder as engineProcessAiUiBuilder } from "@repo/ai-engine/process-ai-ui-builder";
import type { VertexAiConfig } from "@repo/ai-engine/vertex-ai.client";

export interface ProcessAiUiBuilderContext {
  readonly systemInstruction: string;
  readonly contextBlocks: readonly {
    readonly id: string;
    readonly content: string;
  }[];
}

export async function processAiUiBuilder(
  config: VertexAiConfig,
  input: AiUiBuilderInput,
  context: ProcessAiUiBuilderContext,
): Promise<AiUiBuilderOutput> {
  return engineProcessAiUiBuilder(config, input, context);
}

export type { VertexAiConfig };
