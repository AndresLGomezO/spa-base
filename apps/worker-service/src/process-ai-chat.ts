import type { AiController } from "@repo/ai-engine/controller";
import type { AiChatInput, AiChatOutput } from "@repo/ai-engine/schemas";
import type { VertexAiConfig } from "@repo/ai-engine/vertex-ai.client";

export async function processAiChat(
  config: VertexAiConfig,
  input: AiChatInput,
  options: {
    readonly aiController: AiController;
    readonly tenantId: string;
    readonly parentJobId: string;
    readonly requestedBy: string;
  },
): Promise<AiChatOutput> {
  void config;
  const result = await options.aiController.runAiRequest({
    tenantId: options.tenantId,
    feature: "chat",
    operation: "generateChat",
    requestedBy: options.requestedBy,
    permission: "ai.chat.run",
    parentJobId: options.parentJobId,
    input: { question: input.question },
    params: {
      operation: "generateChat",
      question: input.question,
    },
  });
  if (
    !("answer" in result.output) ||
    typeof result.output.answer !== "string"
  ) {
    throw new Error("Chat AI response missing answer.");
  }
  return { answer: result.output.answer };
}

export type { VertexAiConfig };
