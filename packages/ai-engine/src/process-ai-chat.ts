import type { AiChatInput } from "./schemas/ai-chat.schema.js";
import type { AiChatOutput } from "./schemas/ai-job.schema.js";
import { generateChatAnswer, type VertexAiConfig } from "./vertex-ai.client.js";

export async function processAiChat(
  config: VertexAiConfig,
  input: AiChatInput,
): Promise<AiChatOutput> {
  const answer = await generateChatAnswer(config, input.question);
  return { answer };
}
