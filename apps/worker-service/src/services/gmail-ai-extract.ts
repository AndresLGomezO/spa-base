import {
  buildEmailAiPrompt,
  emailAiExtractResultSchema,
  type EmailAiExtractResult,
  type GmailMessageEnvelope,
} from "@repo/gmail-ingest";
import type { AiController } from "@repo/ai-engine/controller";
import { extractJsonFromModelAnswer } from "@repo/ai-engine/extract-json-from-model-answer";

export type GmailAiExtractDeps = {
  readonly aiController: AiController;
};

export async function runAiExtract(
  deps: GmailAiExtractDeps,
  options: {
    readonly tenantId: string;
    readonly userId: string;
    readonly jobId: string;
    readonly email: GmailMessageEnvelope;
    readonly entityName: string;
    readonly record: Record<string, unknown>;
    readonly fieldNames: readonly string[];
    readonly aiInstructions?: string | null;
  },
): Promise<EmailAiExtractResult | null> {
  try {
    const prompt = buildEmailAiPrompt({
      email: options.email,
      entityName: options.entityName,
      recordSnapshot: options.record,
      fieldNames: options.fieldNames,
      aiInstructions: options.aiInstructions,
    });
    const result = await deps.aiController.runAiRequest({
      tenantId: options.tenantId,
      feature: "gmailExtract",
      operation: "generateText",
      requestedBy: options.userId,
      permission: "ai.dataHook.run",
      contextRef: { source: "emailIngestJob", id: options.jobId },
      input: {
        kind: "gmailExtract",
        userId: options.userId,
        messageId: options.email.messageId,
        entityName: options.entityName,
        ...(options.aiInstructions
          ? { aiInstructions: options.aiInstructions }
          : {}),
      },
      params: {
        operation: "generateText",
        systemInstruction:
          "You are an email structuring assistant. Reply with JSON only.",
        userText: prompt,
        modelOptions: { responseMimeType: "application/json" },
      },
    });
    if (!("text" in result.output) || typeof result.output.text !== "string") {
      return null;
    }
    const json = extractJsonFromModelAnswer(result.output.text);
    const parsed = emailAiExtractResultSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
