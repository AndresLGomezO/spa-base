import { z } from "zod";

export const AI_RECORD_SUMMARY_TEMPLATE_FRAGMENT_KEY =
  "aiRecordSummaryTemplate" as const;

export const aiRecordSummaryTemplateSchema = z.object({
  textTemplate: z.string().max(8_000),
  jsonFields: z.array(z.string()).max(50).default([]),
  embeddingFields: z.array(z.string()).max(50).default([]),
  piiLevel: z
    .record(z.string(), z.enum(["public", "masked", "excluded"]))
    .default({}),
});

export type AiRecordSummaryTemplate = z.infer<
  typeof aiRecordSummaryTemplateSchema
>;

export function parseAiRecordSummaryTemplate(
  value: string | unknown,
): AiRecordSummaryTemplate {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return aiRecordSummaryTemplateSchema.parse(parsed);
}
