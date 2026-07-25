export const AI_SUMMARY_FIELD_KEYS = [
  "aiSummaryText",
  "aiSummaryJson",
  "aiSummaryEmbedding",
  "aiSummaryHash",
] as const;

export type AiSummaryFieldKey = (typeof AI_SUMMARY_FIELD_KEYS)[number];

export type AiRecordSummaryFields = {
  aiSummaryText?: string;
  aiSummaryJson?: unknown;
  aiSummaryEmbedding?: readonly number[];
  aiSummaryHash?: string;
};

export function readAiRecordSummaryFields(
  record: Readonly<Record<string, unknown>>,
): AiRecordSummaryFields {
  const fields: AiRecordSummaryFields = {};
  if (typeof record.aiSummaryText === "string") {
    fields.aiSummaryText = record.aiSummaryText;
  }
  if ("aiSummaryJson" in record) {
    fields.aiSummaryJson = record.aiSummaryJson;
  }
  if (
    Array.isArray(record.aiSummaryEmbedding) &&
    record.aiSummaryEmbedding.every(
      (value) => typeof value === "number" && Number.isFinite(value),
    )
  ) {
    fields.aiSummaryEmbedding = record.aiSummaryEmbedding as number[];
  }
  if (typeof record.aiSummaryHash === "string") {
    fields.aiSummaryHash = record.aiSummaryHash;
  }
  return fields;
}

export function writeAiRecordSummaryFields<T extends Record<string, unknown>>(
  record: T,
  fields: AiRecordSummaryFields,
): T & AiRecordSummaryFields {
  return { ...record, ...fields };
}
