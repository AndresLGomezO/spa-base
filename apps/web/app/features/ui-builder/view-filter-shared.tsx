import type { ViewFilterEntry } from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";
import { DynamicFilterFields } from "@repo/data-view";
import type { DataViewColumnDescriptor } from "@repo/data-view";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { buildEntityColumnDescriptors } from "../../components/entity/build-entity-column-descriptors";
import { useEntityFilterOptions } from "../../hooks/useEntityFilterOptions";
import { tryGetEntityDefinition } from "../../entities/entity-catalog";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { toQualifiedViewFilterColumnId } from "./view-filter-qualified-id";
import type { ViewFilterPageState } from "./view-filter-page-context";

function remapFilterOptionsToQualifiedIds(
  entityName: string,
  options: Readonly<
    Record<string, readonly { value: string; label: string }[]>
  >,
): Readonly<Record<string, readonly { value: string; label: string }[]>> {
  const remapped: Record<string, { value: string; label: string }[]> = {};

  for (const [fieldName, fieldOptions] of Object.entries(options)) {
    remapped[toQualifiedViewFilterColumnId(entityName, fieldName)] = [
      ...fieldOptions,
    ];
  }

  return remapped;
}

interface EntityFilterGroup {
  readonly entityName: string;
  readonly definition: SerializableEntityDefinition;
  readonly entries: readonly ViewFilterEntry[];
}

export function groupFiltersByEntity(
  filters: readonly ViewFilterEntry[],
  catalog: readonly EntityCatalogEntry[],
): readonly EntityFilterGroup[] {
  const groups = new Map<string, ViewFilterEntry[]>();

  for (const entry of filters) {
    const entityName = entry.entityName.trim();
    const fieldName = entry.fieldName.trim();
    if (entityName.length === 0 || fieldName.length === 0) {
      continue;
    }

    const definition = tryGetEntityDefinition(entityName, catalog);
    if (!definition || !(fieldName in definition.fields)) {
      continue;
    }

    const existing = groups.get(entityName) ?? [];
    existing.push({ entityName, fieldName });
    groups.set(entityName, existing);
  }

  return [...groups.entries()].flatMap(([entityName, entries]) => {
    const definition = tryGetEntityDefinition(entityName, catalog);
    if (!definition) {
      return [];
    }

    return [{ entityName, definition, entries }];
  });
}

export function buildQualifiedFilterColumnsForGroups(
  groups: readonly EntityFilterGroup[],
): DataViewColumnDescriptor<Record<string, unknown>>[] {
  return groups.flatMap((group) =>
    buildEntityColumnDescriptors({
      definition: group.definition,
      columns: group.entries.map((entry) => entry.fieldName),
      getOneToManyCellValue: () => null,
    }).map((column) => ({
      ...column,
      id: toQualifiedViewFilterColumnId(group.entityName, column.id),
      filterable: column.filterable ?? true,
    })),
  );
}

interface ViewFilterEntityGroupProps {
  readonly group: EntityFilterGroup;
  readonly pageState: ViewFilterPageState;
}

export function ViewFilterEntityGroup({
  group,
  pageState,
}: ViewFilterEntityGroupProps) {
  const { t } = useTranslation("common");
  const { entityName, definition, entries } = group;

  const columns = useMemo(() => {
    const fieldNames = entries.map((entry) => entry.fieldName);

    return buildEntityColumnDescriptors({
      definition,
      columns: fieldNames,
      getOneToManyCellValue: () => null,
    }).map((column) => ({
      ...column,
      id: toQualifiedViewFilterColumnId(entityName, column.id),
      filterable: column.filterable ?? true,
    }));
  }, [definition, entityName, entries]);

  const entityFilters = useMemo(() => {
    const prefix = `${entityName}.`;
    const scoped: Record<string, readonly string[]> = {};

    for (const [columnId, values] of Object.entries(pageState.filters)) {
      if (columnId.startsWith(prefix)) {
        scoped[columnId] = values;
      }
    }

    return scoped;
  }, [entityName, pageState.filters]);

  const unqualifiedColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        id: column.id.slice(column.id.indexOf(".") + 1),
      })),
    [columns],
  );

  const unqualifiedFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(entityFilters).map(([columnId, values]) => [
          columnId.slice(columnId.indexOf(".") + 1),
          values,
        ]),
      ),
    [entityFilters],
  );

  const { filterOptions } = useEntityFilterOptions({
    definition,
    columns: unqualifiedColumns,
    filters: unqualifiedFilters,
    booleanLabels: {
      trueLabel: t("table.booleanYes"),
      falseLabel: t("table.booleanNo"),
    },
  });

  const qualifiedFilterOptions = useMemo(
    () => remapFilterOptionsToQualifiedIds(entityName, filterOptions),
    [entityName, filterOptions],
  );

  if (columns.length === 0) {
    return null;
  }

  const labels = {
    filterPlaceholder: t("dataView.filterPlaceholder"),
    filterSearchPlaceholder: t("dataView.filterSearchPlaceholder"),
    filterSelectedCount: (count: number) =>
      t("dataView.filterSelectedCount", { count }),
    noFilterResults: t("dataView.noFilterResults"),
    removeBadge: (label: string) => t("dataView.removeBadge", { label }),
    filtersTrigger: t("dataView.filtersTrigger"),
    filtersClearAll: t("dataView.filtersClearAll"),
  };

  return (
    <DynamicFilterFields
      columns={columns as DataViewColumnDescriptor<Record<string, unknown>>[]}
      filterOptions={qualifiedFilterOptions}
      filters={pageState.filters}
      onFilterChange={pageState.setFilter}
      labels={labels}
    />
  );
}

export function buildActiveFilterBadges(
  columns: readonly DataViewColumnDescriptor<Record<string, unknown>>[],
  pageState: ViewFilterPageState,
) {
  return columns.flatMap((column) => {
    const values = pageState.filters[column.id] ?? [];
    return values.map((value) => ({
      id: `${column.id}:${value}`,
      label: `${column.label}: ${value}`,
      onRemove: () => {
        pageState.setFilter(
          column.id,
          values.filter((item) => item !== value),
        );
      },
    }));
  });
}
