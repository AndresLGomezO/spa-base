import type {
  UiLayoutDocument,
  UiComponentConfig,
  ViewFiltersComponentConfig,
  ViewFilterEntry,
  ViewDateFilterComponentConfig,
} from "@repo/ui-builder-core";
import {
  isDashboardSectionComponent,
  isGridComponent,
  isRowHolderComponent,
  isViewFiltersComponent,
  isViewSearchComponent,
  isViewDateFilterComponent,
  resolveDashboardDateFilterConfig,
  type DashboardDateFilterConfig,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";
import type { RowNode } from "@repo/ui-builder-core";
import type { DashboardSectionDefinition } from "@repo/entities";
import type { DataViewColumnDescriptor } from "@repo/data-view";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { tryGetEntityDefinition } from "../../entities/entity-catalog";
import { buildEntityColumnDescriptors } from "../../components/entity/build-entity-column-descriptors";
import { listCatalogEntityNames } from "./collect-view-available-filter-options";
import { resolveViewSearchFieldNames } from "./resolve-view-filter-field-names";
import { toQualifiedViewFilterColumnId } from "./view-filter-qualified-id";

interface CollectedViewFilterDescriptors {
  readonly hasSearch: boolean;
  readonly filterColumns: readonly DataViewColumnDescriptor<
    Record<string, unknown>
  >[];
  readonly searchColumns: readonly DataViewColumnDescriptor<
    Record<string, unknown>
  >[];
  readonly catalogEntities: readonly string[];
  readonly filterConfigs: readonly ViewFiltersComponentConfig[];
  readonly dateFilterConfig: DashboardDateFilterConfig | null;
}

function walkRows(
  rows: readonly RowNode[],
  visit: (component: UiComponentConfig) => void,
): void {
  for (const row of rows) {
    if (row.type === "component") {
      if (isRowHolderComponent(row.component)) {
        if (isGridComponent(row.component)) {
          for (const trackRow of row.component.rows) {
            if (trackRow.type === "component") {
              walkRows(
                isRowHolderComponent(trackRow.component)
                  ? trackRow.component.rows
                  : [trackRow],
                visit,
              );
            }
          }
          continue;
        }

        walkRows(row.component.rows, visit);
        continue;
      }

      visit(row.component);
    }
  }
}

function walkLayout(
  layout: UiLayoutDocument,
  visit: (component: UiComponentConfig) => void,
): void {
  for (const column of resolveLayoutRootColumns(layout)) {
    walkRows(column.rows, visit);
  }
}

function filterEntryKey(entry: ViewFilterEntry): string {
  return `${entry.entityName}.${entry.fieldName}`;
}

function buildQualifiedFilterColumns(
  catalog: readonly EntityCatalogEntry[],
  entries: readonly ViewFilterEntry[],
): DataViewColumnDescriptor<Record<string, unknown>>[] {
  const columnsById = new Map<
    string,
    DataViewColumnDescriptor<Record<string, unknown>>
  >();

  for (const entry of entries) {
    const entityName = entry.entityName.trim();
    const fieldName = entry.fieldName.trim();
    if (entityName.length === 0 || fieldName.length === 0) {
      continue;
    }

    const definition = tryGetEntityDefinition(entityName, catalog);
    if (!definition || !(fieldName in definition.fields)) {
      continue;
    }

    const [descriptor] = buildEntityColumnDescriptors({
      definition,
      columns: [fieldName],
      getOneToManyCellValue: () => null,
    });
    if (!descriptor) {
      continue;
    }

    const qualifiedId = toQualifiedViewFilterColumnId(entityName, fieldName);
    columnsById.set(qualifiedId, {
      ...descriptor,
      id: qualifiedId,
      filterable: descriptor.filterable ?? true,
    });
  }

  return [...columnsById.values()];
}

function buildGlobalSearchColumns(
  catalog: readonly EntityCatalogEntry[],
  entityNames: readonly string[],
): DataViewColumnDescriptor<Record<string, unknown>>[] {
  const columnsById = new Map<
    string,
    DataViewColumnDescriptor<Record<string, unknown>>
  >();

  for (const entityName of entityNames) {
    const definition = tryGetEntityDefinition(entityName, catalog);
    if (!definition) {
      continue;
    }

    const fieldNames = resolveViewSearchFieldNames(definition, undefined);
    const descriptors = buildEntityColumnDescriptors({
      definition,
      columns: fieldNames,
      getOneToManyCellValue: () => null,
    });

    for (const descriptor of descriptors) {
      const qualifiedId = toQualifiedViewFilterColumnId(
        entityName,
        descriptor.id,
      );
      columnsById.set(qualifiedId, {
        ...descriptor,
        id: qualifiedId,
        searchable: descriptor.searchable ?? true,
      });
    }
  }

  return [...columnsById.values()];
}

function collectFilterEntries(
  configs: readonly ViewFiltersComponentConfig[],
): ViewFilterEntry[] {
  const entriesByKey = new Map<string, ViewFilterEntry>();

  for (const config of configs) {
    for (const entry of config.filters) {
      const entityName = entry.entityName.trim();
      const fieldName = entry.fieldName.trim();
      if (entityName.length === 0 || fieldName.length === 0) {
        continue;
      }

      entriesByKey.set(filterEntryKey({ entityName, fieldName }), {
        entityName,
        fieldName,
      });
    }
  }

  return [...entriesByKey.values()];
}

export function collectViewFilterDescriptors(options: {
  readonly dashboardLayout: UiLayoutDocument;
  readonly sections: readonly DashboardSectionDefinition[];
  readonly catalog: readonly EntityCatalogEntry[];
}): CollectedViewFilterDescriptors {
  let hasSearch = false;
  const filterConfigs: ViewFiltersComponentConfig[] = [];
  const dateFilterConfigs: ViewDateFilterComponentConfig[] = [];

  const visit = (component: UiComponentConfig) => {
    if (isViewSearchComponent(component)) {
      hasSearch = true;
      return;
    }

    if (isViewFiltersComponent(component)) {
      filterConfigs.push(component);
      return;
    }

    if (isViewDateFilterComponent(component)) {
      dateFilterConfigs.push(component);
    }
  };

  const sectionIdsToWalk = new Set<string>();

  const visitWithSections = (component: UiComponentConfig) => {
    visit(component);

    if (isDashboardSectionComponent(component) && component.sectionId.trim()) {
      sectionIdsToWalk.add(component.sectionId);
    }
  };

  walkLayout(options.dashboardLayout, visitWithSections);

  for (const section of options.sections) {
    if (!sectionIdsToWalk.has(section.id)) {
      continue;
    }

    walkLayout(section.layout, visit);
  }

  const catalogEntities = listCatalogEntityNames(options.catalog);
  const filterEntries = collectFilterEntries(filterConfigs);
  const dateFilterConfig =
    dateFilterConfigs.length > 0
      ? resolveDashboardDateFilterConfig(dateFilterConfigs[0]!)
      : null;

  return {
    hasSearch,
    filterColumns: buildQualifiedFilterColumns(options.catalog, filterEntries),
    searchColumns: hasSearch
      ? buildGlobalSearchColumns(options.catalog, catalogEntities)
      : [],
    catalogEntities,
    filterConfigs,
    dateFilterConfig,
  };
}
