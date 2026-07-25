export const AI_CONTEXT_SECTION_PERMISSIONS = [
  "aiContextSection.read",
  "aiContextSection.create",
  "aiContextSection.update",
  "aiContextSection.delete",
] as const;

export type AiContextSectionPermission =
  (typeof AI_CONTEXT_SECTION_PERMISSIONS)[number];

export const AI_RECORD_SUMMARY_TEMPLATE_PERMISSIONS = [
  "aiRecordSummaryTemplate.read",
  "aiRecordSummaryTemplate.update",
  "aiRecordSummaryTemplate.delete",
] as const;

export type AiRecordSummaryTemplatePermission =
  (typeof AI_RECORD_SUMMARY_TEMPLATE_PERMISSIONS)[number];
