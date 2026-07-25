import {
  hashSourceValue,
  type AiRecordSummaryTemplate,
} from "@repo/ai-context";

export type RecordAiSummaryRedactFn = (
  value: unknown,
  field: string,
) => unknown;

export interface ComputeRecordAiSummaryInput {
  readonly record: Readonly<Record<string, unknown>>;
  readonly template: AiRecordSummaryTemplate;
  readonly redactFn?: RecordAiSummaryRedactFn;
}

export interface ComputedRecordAiSummary {
  readonly aiSummaryText: string;
  readonly aiSummaryJson: Record<string, unknown>;
  readonly aiSummaryHash: string;
  readonly needsReembed: boolean;
}

function readFieldPath(
  record: Readonly<Record<string, unknown>>,
  path: string,
): unknown {
  let value: unknown = record;
  for (const segment of path.split(".")) {
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

function redactField(
  record: Readonly<Record<string, unknown>>,
  field: string,
  template: AiRecordSummaryTemplate,
  redactFn?: RecordAiSummaryRedactFn,
): unknown {
  const piiLevel = template.piiLevel[field] ?? "public";
  if (piiLevel === "excluded") {
    return undefined;
  }
  if (piiLevel === "masked") {
    return "***";
  }
  const value = readFieldPath(record, field);
  return redactFn ? redactFn(value, field) : value;
}

function toTemplateText(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function computeRecordAiSummary(
  input: ComputeRecordAiSummaryInput,
): ComputedRecordAiSummary {
  const aiSummaryText = input.template.textTemplate.replace(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (_placeholder, rawField: string) => {
      const field = rawField.trim();
      return toTemplateText(
        redactField(input.record, field, input.template, input.redactFn),
      );
    },
  );

  const aiSummaryJson: Record<string, unknown> = {};
  for (const field of input.template.jsonFields) {
    const value = redactField(
      input.record,
      field,
      input.template,
      input.redactFn,
    );
    if (value !== undefined) {
      aiSummaryJson[field] = value;
    }
  }

  const aiSummaryHash = hashSourceValue({
    text: aiSummaryText,
    json: aiSummaryJson,
  });

  return {
    aiSummaryText,
    aiSummaryJson,
    aiSummaryHash,
    needsReembed: input.record.aiSummaryHash !== aiSummaryHash,
  };
}
