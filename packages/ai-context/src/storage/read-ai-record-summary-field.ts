import type { AiRecordSummaryRecord } from "./ai-record-summary.schema.js";

/** True when a field path should be resolved from an AI record summary doc. */
export function resolvesFromAiRecordSummary(fieldPath: string): boolean {
  const path = fieldPath.trim();
  if (
    path === "rag.text" ||
    path === "context" ||
    path === "aiSummaryJson" ||
    path === "aiShortSummaryJson" ||
    path === "aiSummaryText"
  ) {
    return true;
  }
  if (/^narratives\./.test(path)) return true;
  if (path.endsWith("AiSummaryText") || path.endsWith("AiSummaryJson")) {
    return true;
  }
  return false;
}

export function readAiRecordSummaryField(
  record: AiRecordSummaryRecord | null | undefined,
  fieldPath: string,
): string | undefined {
  if (!record) return undefined;
  const path = fieldPath.trim();
  if (path === "rag.text" || path === "aiShortSummaryJson") {
    return record.rag?.text;
  }
  if (path === "context" || path === "aiSummaryJson") {
    return record.context ? JSON.stringify(record.context) : undefined;
  }
  const narrativeMatch = /^narratives\.([^.]+)(?:\.text)?$/.exec(path);
  if (narrativeMatch) {
    const variant = narrativeMatch[1]!;
    return record.narratives[variant]?.text;
  }
  // Legacy aliases used by summary tabs before the AI-doc migration.
  if (path === "aiSummaryText") {
    return record.narratives.default?.text ?? record.rag?.text;
  }
  if (path.endsWith("AiSummaryText")) {
    const prefix = path.slice(0, -"AiSummaryText".length);
    const variant =
      prefix === "loans" ||
      prefix === "incomes" ||
      prefix === "investments" ||
      prefix === "services"
        ? prefix
        : "default";
    return record.narratives[variant]?.text;
  }
  if (path.endsWith("AiSummaryJson")) {
    const prefix = path.slice(0, -"AiSummaryJson".length);
    // Domain rollups live under context when present.
    if (record.context && prefix in record.context) {
      return JSON.stringify(record.context[prefix]);
    }
    return record.context ? JSON.stringify(record.context) : undefined;
  }
  return undefined;
}
