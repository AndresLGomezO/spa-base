import {
  parseFlexLayoutFromStyles,
  type ViewFilterComponentConfig,
  type ViewFilterEntry,
} from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";
import {
  FilterPanel,
  FilterPanelBody,
  SearchField,
  useFilterPanelDismiss,
} from "@repo/ui";
import { DynamicFilterFields } from "@repo/data-view";
import type { DataViewColumnDescriptor } from "@repo/data-view";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@repo/theme/utils";

import { buildEntityColumnDescriptors } from "../../components/entity/build-entity-column-descriptors";
import { useEntityFilterOptions } from "../../hooks/useEntityFilterOptions";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { tryGetEntityDefinition } from "../../entities/entity-catalog";
import { toQualifiedViewFilterColumnId } from "./view-filter-qualified-id";
import {
  useOptionalViewFilterPageState,
  type ViewFilterPageState,
} from "./view-filter-page-context";
import { ViewFilterDateField } from "./ViewFilterDateField";

interface ViewFilterComponentProps {
  readonly config: ViewFilterComponentConfig;
}

function resolveEnableSearch(config: ViewFilterComponentConfig): boolean {
  return config.enableSearch === true;
}

function resolveEnableFilters(config: ViewFilterComponentConfig): boolean {
  return config.enableFilters !== false;
}

function resolveEnableDateFilter(config: ViewFilterComponentConfig): boolean {
  return config.enableDateFilter === true;
}

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

function groupFiltersByEntity(
  filters: readonly ViewFilterEntry[],
  catalog: ReturnType<typeof useEntityCatalog>["items"],
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

interface ViewFilterEntityGroupProps {
  readonly group: EntityFilterGroup;
  readonly pageState: ViewFilterPageState;
}

function ViewFilterEntityGroup({
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

export function ViewFilterComponent({ config }: ViewFilterComponentProps) {
  const { items } = useEntityCatalog();
  const pageState = useOptionalViewFilterPageState();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation("common");

  const enableSearch = resolveEnableSearch(config);
  const enableFilters = resolveEnableFilters(config);
  const enableDateFilter = resolveEnableDateFilter(config);

  const groups = useMemo(
    () => groupFiltersByEntity(config.filters, items),
    [config.filters, items],
  );

  const columns = useMemo(
    () =>
      groups.flatMap((group) =>
        buildEntityColumnDescriptors({
          definition: group.definition,
          columns: group.entries.map((entry) => entry.fieldName),
          getOneToManyCellValue: () => null,
        }).map((column) => ({
          ...column,
          id: toQualifiedViewFilterColumnId(group.entityName, column.id),
          filterable: column.filterable ?? true,
        })),
      ),
    [groups],
  );

  useFilterPanelDismiss(
    enableFilters ? filtersOpen : false,
    setFiltersOpen,
    rootRef,
  );

  if (!pageState || (!enableSearch && !enableFilters && !enableDateFilter)) {
    return null;
  }

  const dateFilterConfig = pageState.dateFilter.config;
  const dateField =
    enableDateFilter && dateFilterConfig ? (
      <div
        className="w-auto shrink-0 overflow-visible py-0.5"
        data-testid="view-filter-date-field"
      >
        <label className="inline-flex w-auto flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">
            {t("viewFilterComponents.dateFilterLabel")}
          </span>
          <ViewFilterDateField
            granularity={dateFilterConfig.granularity}
            value={pageState.dateFilter.value}
            onChange={pageState.dateFilter.setValue}
            isExplicit={pageState.dateFilter.isExplicit}
            locale={i18n.language}
          />
        </label>
      </div>
    ) : null;

  const labels = {
    removeBadge: (label: string) => t("dataView.removeBadge", { label }),
    filtersTrigger: t("dataView.filtersTrigger"),
    filtersClearAll: t("dataView.filtersClearAll"),
  };

  const activeBadges = enableFilters
    ? columns.flatMap((column) => {
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
      })
    : [];

  const filterBody = (
    <div className="flex min-w-0 w-full flex-col gap-4">
      {groups.map((group) => (
        <ViewFilterEntityGroup
          key={group.entityName}
          group={group}
          pageState={pageState}
        />
      ))}
    </div>
  );

  const toolbarFlex = parseFlexLayoutFromStyles(config.styles);
  const toolbarRowClassName = cn(
    "flex w-full min-w-0 flex-nowrap items-end gap-2 overflow-visible py-0.5",
    toolbarFlex.justify === "end" && "justify-end",
    toolbarFlex.justify === "center" && "justify-center",
    toolbarFlex.justify === "between" && "justify-between",
  );

  const searchFieldClassName = "max-w-none min-w-0 w-full";

  const searchField = enableSearch ? (
    <div className="min-w-0 flex-1 overflow-visible py-0.5">
      <SearchField
        value={pageState.search}
        onChange={pageState.setSearch}
        placeholder={
          config.searchPlaceholder?.trim() || t("dataView.searchPlaceholder")
        }
        ariaLabel={
          config.searchPlaceholder?.trim() || t("dataView.searchPlaceholder")
        }
        clearAriaLabel={t("dataView.searchClear")}
        className={searchFieldClassName}
      />
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "w-full min-w-0 max-w-full",
        filtersOpen && "relative isolate z-30",
      )}
      data-testid="view-filter-toolbar"
    >
      <div className={toolbarRowClassName}>
        {dateField}
        {enableFilters ? (
          <div className="min-w-0 w-full flex-1">
            <FilterPanel
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              activeBadges={activeBadges}
              triggerLabel={labels.filtersTrigger}
              clearAllLabel={labels.filtersClearAll}
              removeAriaLabel={labels.removeBadge}
              onClearAll={() => {
                for (const column of columns) {
                  pageState.setFilter(column.id, []);
                }
              }}
              badgesBelowToolbar
              renderBody={false}
              compact
              toolbarFillWidth
              manageDismiss={false}
              toolbarPrefix={searchField ?? undefined}
            >
              {filterBody}
            </FilterPanel>
          </div>
        ) : (
          searchField
        )}
      </div>
      {enableFilters ? (
        <div className="mt-0 w-full min-w-0 max-w-full">
          <FilterPanelBody
            open={filtersOpen}
            onClearAll={() => {
              for (const column of columns) {
                pageState.setFilter(column.id, []);
              }
            }}
            clearAllLabel={labels.filtersClearAll}
            disabled={false}
          >
            {filterBody}
          </FilterPanelBody>
        </div>
      ) : null}
    </div>
  );
}
