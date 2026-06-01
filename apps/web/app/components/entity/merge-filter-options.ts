import type { DataViewFilterOption } from "@repo/data-view";

export function mergeFilterOptions(
  base: Readonly<Record<string, readonly DataViewFilterOption[]>>,
  extra: Readonly<Record<string, readonly DataViewFilterOption[]>>,
): Readonly<Record<string, readonly DataViewFilterOption[]>> {
  const merged: Record<string, DataViewFilterOption[]> = {};

  for (const [columnId, options] of Object.entries(base)) {
    merged[columnId] = [...options];
  }

  for (const [columnId, options] of Object.entries(extra)) {
    const byValue = new Map(
      (merged[columnId] ?? []).map((option) => [option.value, option]),
    );
    for (const option of options) {
      byValue.set(option.value, option);
    }
    merged[columnId] = [...byValue.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }

  return merged;
}
