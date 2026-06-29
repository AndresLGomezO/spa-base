import type {
  UiLayoutDocument,
  UiComponentConfig,
  ViewFilterComponentConfig,
  ViewFilterEntry,
} from "@repo/ui-builder-core";
import {
  isContainerComponent,
  isDashboardSectionComponent,
  isViewFilterComponent,
  isViewSearchComponent,
  resolveDashboardDateFilterConfig,
  type DashboardDateFilterConfig,
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
  readonly filterColumns: readonly DataViewColumnDescriptor<
    Record<string, unknown>
  >[];
  readonly searchColumns: readonly DataViewColumnDescriptor<
    Record<string, unknown>
  >[];
  readonly catalogEntities: readonly string[];
  readonly filterConfigs: readonly ViewFilterComponentConfig[];
  readonly dateFilterConfig: DashboardDateFilterConfig | null;
}

function walkRows(
  rows: readonly RowNode[],
  visit: (component: UiComponentConfig) => void,
): void {
  for (const row of rows) {
    if (row.type === "component") {
      if (isContainerComponent(row.component)) {
        walkRows(row.component.rows, visit);
        continue;
      }

      visit(row.component);
      continue;
    }

    for (const column of row.columns) {
      walkRows(column.rows, visit);
    }
  }
}

function walkLayout(
  layout: UiLayoutDocument,
  visit: (component: UiComponentConfig) => void,
): void {
  for (const column of layout.root.columns) {
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
  configs: readonly ViewFilterComponentConfig[],
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
  const filterConfigs: ViewFilterComponentConfig[] = [];

  const visit = (component: UiComponentConfig) => {
    if (isViewSearchComponent(component)) {
      return;
    }

    if (isViewFilterComponent(component)) {
      filterConfigs.push(component);
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
    filterConfigs
      .map((config) => resolveDashboardDateFilterConfig(config))
      .find((config) => config !== null) ?? null;

  return {
    filterColumns: buildQualifiedFilterColumns(options.catalog, filterEntries),
    searchColumns: buildGlobalSearchColumns(options.catalog, catalogEntities),
    catalogEntities,
    filterConfigs,
    dateFilterConfig,
  };
}
