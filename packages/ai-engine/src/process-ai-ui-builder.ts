import type { AiUiBuilderInput } from "./schemas/ai-ui-builder.schema.js";
import type { AiUiBuilderOutput } from "./schemas/ai-ui-builder.schema.js";
import {
  generateModelAnswer,
  UI_BUILDER_MAX_OUTPUT_TOKENS,
  type VertexAiConfig,
} from "./vertex-ai.client.js";

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
  const answer = await generateModelAnswer(
    config,
    {
      systemInstruction: context.systemInstruction,
      contextBlocks: context.contextBlocks,
      userText: input.question,
    },
    {
      maxOutputTokens: UI_BUILDER_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
    },
  );
  return { answer };
}
