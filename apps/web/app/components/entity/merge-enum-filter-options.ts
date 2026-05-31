import type { SerializableEntityDefinition } from "@repo/entities";
import type { DataViewFilterOption } from "@repo/data-view";

export function mergeEnumFilterOptions(
  definition: SerializableEntityDefinition,
  fromItems: Readonly<Record<string, readonly DataViewFilterOption[]>>,
): Readonly<Record<string, readonly DataViewFilterOption[]>> {
  const merged: Record<string, DataViewFilterOption[]> = {};

  for (const [columnId, options] of Object.entries(fromItems)) {
    merged[columnId] = [...options];
  }

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (meta.type !== "enum" || !meta.enumValues?.length) {
      continue;
    }

    const byValue = new Map<string, DataViewFilterOption>();
    for (const option of merged[fieldName] ?? []) {
      byValue.set(option.value, option);
    }
    for (const enumValue of meta.enumValues) {
      if (!byValue.has(enumValue)) {
        byValue.set(enumValue, { value: enumValue, label: enumValue });
      }
    }
    merged[fieldName] = [...byValue.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }

  return merged;
}
