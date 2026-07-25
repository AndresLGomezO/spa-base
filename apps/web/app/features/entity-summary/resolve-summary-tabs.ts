import type {
  UiLayoutSummary,
  UiLayoutSummaryTab,
} from "@repo/ui-builder-core";
import {
  isAiRecordNarrativeStale,
  readAiRecordSummaryField,
  type AiRecordSummaryRecord,
} from "@repo/ai-context/storage";

export interface ResolvedSummaryTab {
  readonly id: string;
  readonly label: string;
  readonly field: string;
  /** Markdown body; empty when not generated yet. */
  readonly text: string;
}

/** Minimal AI-doc shape accepted by summary tab resolution (API or full record). */
export type SummaryAiDoc = {
  readonly contextHash?: string;
  readonly variantContextHashes?: Readonly<Record<string, string>>;
  readonly narratives?: AiRecordSummaryRecord["narratives"];
  readonly rag?: {
    readonly text?: string;
    readonly hash?: string;
    readonly sourceHash?: string;
    readonly updatedAt?: string;
  } | null;
  readonly context?: Readonly<Record<string, unknown>> | null;
} | null;

/**
 * Extract narrative variant from a summary field path.
 * `narratives.loans.text` → `loans`; otherwise `default`.
 */
export function narrativeVariantFromSummaryField(
  field: string | null | undefined,
): string {
  const trimmed = field?.trim() ?? "";
  const match = /^narratives\.([^.]+)\.text$/.exec(trimmed);
  return match?.[1]?.trim() || "default";
}

/**
 * True when the AI doc has a contextHash (or per-variant hash) and the given
 * narrative variant is missing or its sourceHash does not match.
 */
export function isAiNarrativeStale(
  aiDoc: SummaryAiDoc | undefined,
  variant = "default",
): boolean {
  if (!aiDoc) return false;
  return isAiRecordNarrativeStale(
    {
      contextHash: aiDoc.contextHash,
      ...(aiDoc.variantContextHashes
        ? { variantContextHashes: { ...aiDoc.variantContextHashes } }
        : {}),
      narratives: aiDoc.narratives ?? {},
    },
    variant,
  );
}

/**
 * True when the AI doc has enough context to open the Summary surface
 * (even if narrative text is still empty / pending).
 */
export function hasAiSummarySurface(
  aiDoc: SummaryAiDoc | undefined,
  summaryText: string,
): boolean {
  if (summaryText.trim().length > 0) return true;
  if (!aiDoc) return false;
  return Boolean(aiDoc.contextHash?.trim()) || Boolean(aiDoc.context);
}

function toAiRecordForRead(
  aiDoc: SummaryAiDoc | undefined,
): AiRecordSummaryRecord | null {
  if (!aiDoc) return null;
  return {
    id: "",
    tenantId: "",
    entityName: "",
    recordId: "",
    accessUserIds: [],
    tenantWideRead: false,
    narratives: aiDoc.narratives ?? {},
    createdAt: "",
    updatedAt: "",
    ...(aiDoc.rag?.text
      ? {
          rag: {
            text: aiDoc.rag.text,
            hash: aiDoc.rag.hash ?? "",
            sourceHash: aiDoc.rag.sourceHash ?? "",
            updatedAt: aiDoc.rag.updatedAt ?? "",
          },
        }
      : {}),
    ...(aiDoc.context ? { context: { ...aiDoc.context } } : {}),
  };
}

function resolveFieldText(
  field: string,
  record: Readonly<Record<string, unknown>> | null | undefined,
  aiDoc: SummaryAiDoc | undefined,
): string {
  const fromAi = readAiRecordSummaryField(toAiRecordForRead(aiDoc), field);
  if (typeof fromAi === "string" && fromAi.trim()) {
    return fromAi.trim();
  }
  // Nested paths like narratives.default.text are never plain record keys.
  if (field.includes(".")) {
    return "";
  }
  const raw = record?.[field];
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Resolve a single summary field from an AI doc and/or business record.
 * Prefer AI-doc paths (`narratives.*`, `rag.text`, legacy aliases).
 */
export function resolveSummaryFieldText(
  field: string | null | undefined,
  record: Readonly<Record<string, unknown>> | null | undefined,
  aiDoc?: SummaryAiDoc,
): string {
  const trimmed = field?.trim() ?? "";
  if (!trimmed) return "";
  return resolveFieldText(trimmed, record, aiDoc);
}

/**
 * Map layout summary tabs onto a source record and optional AI summary doc.
 * Configured tabs are always returned (empty placeholders while generation WIP).
 */
export function resolveSummaryTabsFromRecord(
  summary: UiLayoutSummary | null | undefined,
  record: Readonly<Record<string, unknown>> | null | undefined,
  aiDoc?: SummaryAiDoc,
): readonly ResolvedSummaryTab[] {
  if (!summary) {
    return [];
  }
  const resolved: ResolvedSummaryTab[] = [];
  for (const tab of summary.tabs) {
    const id = tab.id.trim();
    const label = tab.label.trim();
    const field = tab.field.trim();
    if (!id || !label || !field) {
      continue;
    }
    resolved.push({
      id,
      label,
      field,
      text: resolveFieldText(field, record, aiDoc),
    });
  }
  return resolved;
}

export function createEmptySummaryTab(index: number): UiLayoutSummaryTab {
  return {
    id: `tab-${index + 1}`,
    label: `Tab ${index + 1}`,
    field: "",
  };
}

export function normalizeSummaryConfig(input: {
  readonly sourceEntity: string;
  readonly sourceRecordId?: string;
  readonly tabs: readonly UiLayoutSummaryTab[];
}): UiLayoutSummary | undefined {
  const sourceEntity = input.sourceEntity.trim();
  if (!sourceEntity) {
    return undefined;
  }
  const tabs = input.tabs
    .map((tab) => ({
      id: tab.id.trim(),
      label: tab.label.trim(),
      field: tab.field.trim(),
    }))
    .filter(
      (tab) =>
        tab.id.length > 0 && tab.label.length > 0 && tab.field.length > 0,
    );
  if (tabs.length === 0) {
    return undefined;
  }
  const sourceRecordId = input.sourceRecordId?.trim();
  return {
    sourceEntity,
    ...(sourceRecordId && sourceRecordId.length > 0 ? { sourceRecordId } : {}),
    tabs,
  };
}
