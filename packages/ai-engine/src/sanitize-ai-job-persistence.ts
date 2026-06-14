import type { AiJobStepTraceEntry } from "./schemas/ai-job.schema.js";

/** Firestore document limit is 1 MiB — keep trace well under to leave room for draft/input. */
export const MAX_STEP_TRACE_BYTES = 700_000;

const MAX_BLOCK_CONTENT_CHARS = 1_200;
const MAX_RENDER_BLOCK_CONTENT_CHARS = 32_000;
const MAX_PROMPT_CHARS = 4_000;
const MAX_RENDER_PROMPT_CHARS = 8_000;
const MAX_RAW_ANSWER_CHARS = 12_000;
const MAX_RENDER_RAW_ANSWER_CHARS = 32_000;

function traceContentLimits(stepId: string): {
  readonly maxBlock: number;
  readonly maxPrompt: number;
  readonly maxRaw: number;
} {
  if (stepId.startsWith("formsRender.")) {
    return {
      maxBlock: MAX_RENDER_BLOCK_CONTENT_CHARS,
      maxPrompt: MAX_RENDER_PROMPT_CHARS,
      maxRaw: MAX_RENDER_RAW_ANSWER_CHARS,
    };
  }
  return {
    maxBlock: MAX_BLOCK_CONTENT_CHARS,
    maxPrompt: MAX_PROMPT_CHARS,
    maxRaw: MAX_RAW_ANSWER_CHARS,
  };
}

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)}\n… [truncated ${value.length - maxChars} chars]`;
}

function jsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function summarizeDraftForTrace(draft: unknown): unknown {
  if (draft === undefined || draft === null) {
    return draft;
  }
  if (typeof draft !== "object") {
    return draft;
  }

  const record = draft as Record<string, unknown>;
  const layoutTargets = record.layoutTargets;
  const layoutTargetKeys =
    layoutTargets && typeof layoutTargets === "object"
      ? Object.keys(layoutTargets)
      : [];

  return {
    surface: record.surface,
    presentation: record.presentation,
    creativeMode: record.creativeMode,
    outputMode: record.outputMode,
    completedStepIds: record.completedStepIds,
    wizardSteps: record.wizardSteps,
    formBlueprint: record.formBlueprint,
    layoutTargetKeys,
    ...(typeof record.renderHtml === "string"
      ? { renderHtmlChars: record.renderHtml.length }
      : {}),
    ...(record.renderOutput !== undefined
      ? { renderOutput: record.renderOutput }
      : {}),
  };
}

export function sanitizeStepTraceEntry(
  entry: AiJobStepTraceEntry,
): AiJobStepTraceEntry {
  const limits = traceContentLimits(entry.stepId);
  return {
    stepId: entry.stepId,
    attempt: entry.attempt,
    systemInstruction: truncateText(entry.systemInstruction, limits.maxPrompt),
    contextBlocks: entry.contextBlocks.map((block) => ({
      id: block.id,
      content: truncateText(block.content, limits.maxBlock),
    })),
    userText: truncateText(entry.userText, limits.maxPrompt),
    outputInstruction: truncateText(entry.outputInstruction, limits.maxPrompt),
    ...(entry.retryHint
      ? { retryHint: truncateText(entry.retryHint, limits.maxPrompt) }
      : {}),
    rawModelAnswer: truncateText(entry.rawModelAnswer, limits.maxRaw),
    ...(entry.parsedJson !== undefined ? { parsedJson: entry.parsedJson } : {}),
    ...(entry.validationErrors
      ? { validationErrors: [...entry.validationErrors] }
      : {}),
    validationOk: entry.validationOk,
    ...(entry.durationMs != null ? { durationMs: entry.durationMs } : {}),
    ...(entry.draftBeforeStep !== undefined
      ? { draftBeforeStep: summarizeDraftForTrace(entry.draftBeforeStep) }
      : {}),
    ...(entry.draftAfterStep !== undefined
      ? { draftAfterStep: summarizeDraftForTrace(entry.draftAfterStep) }
      : {}),
  };
}

function omitContextBlockContent(
  trace: readonly AiJobStepTraceEntry[],
): AiJobStepTraceEntry[] {
  return trace.map((entry) => ({
    ...entry,
    contextBlocks: entry.contextBlocks.map((block) => ({
      id: block.id,
      content: `[${block.id}] omitted — trace size limit`,
    })),
  }));
}

export function sanitizeStepTraceForPersistence(
  trace: readonly AiJobStepTraceEntry[],
): AiJobStepTraceEntry[] {
  let sanitized = trace.map(sanitizeStepTraceEntry);

  while (
    sanitized.length > 1 &&
    jsonByteLength(sanitized) > MAX_STEP_TRACE_BYTES
  ) {
    sanitized = sanitized.slice(1);
  }

  if (jsonByteLength(sanitized) > MAX_STEP_TRACE_BYTES) {
    sanitized = omitContextBlockContent(sanitized);
  }

  while (
    sanitized.length > 1 &&
    jsonByteLength(sanitized) > MAX_STEP_TRACE_BYTES
  ) {
    sanitized = sanitized.slice(1);
  }

  return sanitized;
}

export function slimUiBuilderDraftForPersistence(
  draft: Record<string, unknown>,
): Record<string, unknown> {
  const { currentLayoutJson, layoutTargets, ...rest } = draft;
  void currentLayoutJson;

  if (!layoutTargets || typeof layoutTargets !== "object") {
    return rest;
  }

  const slimTargets: Record<string, unknown> = {};
  for (const [key, target] of Object.entries(layoutTargets)) {
    if (!target || typeof target !== "object") {
      continue;
    }
    const targetRecord = target as Record<string, unknown>;
    slimTargets[key] = {
      ...(typeof targetRecord.pathKey === "string"
        ? { pathKey: targetRecord.pathKey }
        : {}),
      ...(typeof targetRecord.label === "string"
        ? { label: targetRecord.label }
        : {}),
      ...(Array.isArray(targetRecord.skeleton)
        ? { skeleton: targetRecord.skeleton }
        : {}),
    };
  }

  return {
    ...rest,
    layoutTargets: slimTargets,
  };
}

export function stripCurrentLayoutJsonFromJobInput<
  T extends { readonly currentLayoutJson?: string },
>(input: T): Omit<T, "currentLayoutJson"> {
  const { currentLayoutJson, ...rest } = input;
  void currentLayoutJson;
  return rest;
}
