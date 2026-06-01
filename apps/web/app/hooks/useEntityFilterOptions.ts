import { useMemo } from "react";
import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  DataViewColumnDescriptor,
  DataViewFilterOption,
} from "@repo/data-view";

import { mergeBooleanFilterOptions } from "../components/entity/merge-boolean-filter-options";
import { mergeEnumFilterOptions } from "../components/entity/merge-enum-filter-options";
import { mergeFilterOptions } from "../components/entity/merge-filter-options";
import { useRelationFilterOptions } from "./useRelationFilterOptions";

interface UseEntityFilterOptionsParams {
  readonly definition: SerializableEntityDefinition;
  readonly columns: readonly DataViewColumnDescriptor<
    Record<string, unknown>
  >[];
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly booleanLabels: {
    readonly trueLabel: string;
    readonly falseLabel: string;
  };
}

interface UseEntityFilterOptionsResult {
  readonly filterOptions: Readonly<
    Record<string, readonly DataViewFilterOption[]>
  >;
  readonly relationFilterOptions: Readonly<
    Record<string, readonly DataViewFilterOption[]>
  >;
}

function mergeSelectedFilterValues(
  options: Readonly<Record<string, readonly DataViewFilterOption[]>>,
  filters: Readonly<Record<string, readonly string[]>>,
): Readonly<Record<string, readonly DataViewFilterOption[]>> {
  const merged: Record<string, DataViewFilterOption[]> = {};

  for (const [columnId, columnOptions] of Object.entries(options)) {
    merged[columnId] = [...columnOptions];
  }

  for (const [columnId, values] of Object.entries(filters)) {
    if (values.length === 0) {
      continue;
    }

    const byValue = new Map(
      (merged[columnId] ?? []).map((option) => [option.value, option]),
    );

    for (const value of values) {
      if (!byValue.has(value)) {
        byValue.set(value, { value, label: value });
      }
    }

    merged[columnId] = [...byValue.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }

  return merged;
}

export function useEntityFilterOptions({
  definition,
  columns,
  filters,
  booleanLabels,
}: UseEntityFilterOptionsParams): UseEntityFilterOptionsResult {
  const relationFilterOptions = useRelationFilterOptions(definition, columns);

  const filterOptions = useMemo(() => {
    const withEnums = mergeEnumFilterOptions(definition, {});
    const withBooleans = mergeBooleanFilterOptions(
      definition,
      columns,
      withEnums,
      booleanLabels,
    );
    const merged = mergeFilterOptions(withBooleans, relationFilterOptions);
    return mergeSelectedFilterValues(merged, filters);
  }, [booleanLabels, columns, definition, filters, relationFilterOptions]);

  return { filterOptions, relationFilterOptions };
}
