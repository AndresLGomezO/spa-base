import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  DataViewColumnDescriptor,
  DataViewFilterOption,
} from "@repo/data-view";

import { fetchAllEntityItems } from "../lib/fetch-all-entity-items";
import { formatRecordDisplayLabel } from "../components/entity/format-record-display-label";
import { getFilterableRelationTargets } from "./get-filterable-relation-targets";

export function useRelationFilterOptions(
  definition: SerializableEntityDefinition,
  columns: readonly Pick<
    DataViewColumnDescriptor<unknown>,
    "id" | "filterable"
  >[],
): Readonly<Record<string, readonly DataViewFilterOption[]>> {
  const targets = useMemo(
    () => getFilterableRelationTargets(definition, columns),
    [definition, columns],
  );

  const uniqueTargets = useMemo(() => {
    const seen = new Set<string>();
    return targets.filter(({ target }) => {
      if (seen.has(target)) {
        return false;
      }
      seen.add(target);
      return true;
    });
  }, [targets]);

  const queries = useQueries({
    queries: uniqueTargets.map(({ target }) => ({
      queryKey: ["entity", target, "relation-filter-options"] as const,
      queryFn: () => fetchAllEntityItems<Record<string, unknown>>(target),
      staleTime: 5 * 60 * 1000,
    })),
  });

  return useMemo(() => {
    const optionsByTarget = new Map<string, readonly DataViewFilterOption[]>();

    uniqueTargets.forEach(({ target }, index) => {
      const items = queries[index]?.data ?? [];
      optionsByTarget.set(
        target,
        items.map((item) => ({
          value: String(item.id),
          label: formatRecordDisplayLabel(item),
        })),
      );
    });

    const optionsByColumn: Record<string, DataViewFilterOption[]> = {};
    for (const { columnId, target } of targets) {
      optionsByColumn[columnId] = [...(optionsByTarget.get(target) ?? [])];
    }

    return optionsByColumn;
  }, [queries, targets, uniqueTargets]);
}
