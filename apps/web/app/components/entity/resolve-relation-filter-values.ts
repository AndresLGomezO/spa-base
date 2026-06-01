import type { SerializableEntityDefinition } from "@repo/entities";
import type { DataViewFilterOption } from "@repo/data-view";

export function resolveRelationFilterValues(
  filters: Readonly<Record<string, readonly string[]>>,
  definition: SerializableEntityDefinition,
  filterOptions: Readonly<Record<string, readonly DataViewFilterOption[]>>,
): Readonly<Record<string, readonly string[]>> {
  const resolved: Record<string, string[]> = {};

  for (const [columnId, values] of Object.entries(filters)) {
    const fieldMeta = definition.fields[columnId];
    if (!fieldMeta?.relation || fieldMeta.relation.type === "one-to-many") {
      resolved[columnId] = [...values];
      continue;
    }

    const options = filterOptions[columnId] ?? [];
    resolved[columnId] = values.map((value) => {
      if (options.some((option) => option.value === value)) {
        return value;
      }

      const byLabel = options.find((option) => option.label === value);
      return byLabel?.value ?? value;
    });
  }

  return resolved;
}
