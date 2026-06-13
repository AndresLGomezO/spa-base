import type { AiChatInput, AiChatOutput } from "@repo/ai-engine/schemas";
import {
  generateChatAnswer,
  type VertexAiConfig,
} from "@repo/ai-engine/vertex-ai.client";

export async function processAiChat(
  config: VertexAiConfig,
  input: AiChatInput,
): Promise<AiChatOutput> {
  const answer = await generateChatAnswer(config, input.question);
  return { answer };
}

export type { VertexAiConfig };
