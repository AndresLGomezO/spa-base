import type {
  UiLayoutSummary,
  UiLayoutSummaryTab,
} from "@repo/ui-builder-core";

export interface ResolvedSummaryTab {
  readonly id: string;
  readonly label: string;
  readonly field: string;
  /** Markdown body; empty when not generated yet. */
  readonly text: string;
}

/**
 * Map layout summary tabs onto a source record. Configured tabs are always
 * returned (so the rail can show empty placeholders while generation is WIP).
 */
export function resolveSummaryTabsFromRecord(
  summary: UiLayoutSummary | null | undefined,
  record: Readonly<Record<string, unknown>> | null | undefined,
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
    const raw = record?.[field];
    const text = typeof raw === "string" ? raw.trim() : "";
    resolved.push({ id, label, field, text });
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
