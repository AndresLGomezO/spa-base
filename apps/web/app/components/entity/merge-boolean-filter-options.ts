import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  DataViewColumnDescriptor,
  DataViewFilterOption,
} from "@repo/data-view";

interface BooleanFilterLabels {
  readonly trueLabel: string;
  readonly falseLabel: string;
}

export function mergeBooleanFilterOptions(
  definition: SerializableEntityDefinition,
  columns: readonly Pick<
    DataViewColumnDescriptor<unknown>,
    "id" | "filterable"
  >[],
  base: Readonly<Record<string, readonly DataViewFilterOption[]>>,
  labels: BooleanFilterLabels,
): Readonly<Record<string, readonly DataViewFilterOption[]>> {
  const merged: Record<string, DataViewFilterOption[]> = {};

  for (const [columnId, options] of Object.entries(base)) {
    merged[columnId] = [...options];
  }

  for (const column of columns) {
    if (column.filterable === false) {
      continue;
    }

    if (definition.fields[column.id]?.type !== "boolean") {
      continue;
    }

    merged[column.id] = [
      { value: "true", label: labels.trueLabel },
      { value: "false", label: labels.falseLabel },
    ];
  }

  return merged;
}
