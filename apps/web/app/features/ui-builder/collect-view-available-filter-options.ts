import type { ViewFilterEntry } from "@repo/ui-builder-core";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  formatFieldLabel,
  getEntityLabel,
} from "../../entities/entity-catalog";
import { resolveAvailableViewFilterFieldNames } from "./resolve-view-filter-field-names";

interface ViewAvailableFilterOption {
  readonly entityName: string;
  readonly entityLabel: string;
  readonly fieldName: string;
  readonly fieldLabel: string;
}

function filterEntryKey(entry: ViewFilterEntry): string {
  return `${entry.entityName}.${entry.fieldName}`;
}

export function collectViewAvailableFilterOptions(
  catalog: readonly EntityCatalogEntry[],
): readonly ViewAvailableFilterOption[] {
  const available: ViewAvailableFilterOption[] = [];

  for (const definition of catalog) {
    const fieldNames = resolveAvailableViewFilterFieldNames(definition);

    for (const fieldName of fieldNames) {
      available.push({
        entityName: definition.name,
        entityLabel: getEntityLabel(definition),
        fieldName,
        fieldLabel: formatFieldLabel(fieldName, definition),
      });
    }
  }

  return available.sort((left, right) => {
    const entityCompare = left.entityLabel.localeCompare(right.entityLabel);
    if (entityCompare !== 0) {
      return entityCompare;
    }

    return left.fieldLabel.localeCompare(right.fieldLabel);
  });
}

export function isViewFilterEntryAdded(
  entry: ViewFilterEntry,
  activeFilters: readonly ViewFilterEntry[],
): boolean {
  const key = filterEntryKey(entry);
  return activeFilters.some((item) => filterEntryKey(item) === key);
}

export function toViewFilterEntryKey(entry: ViewFilterEntry): string {
  return filterEntryKey(entry);
}

export function listCatalogEntityNames(
  catalog: readonly EntityCatalogEntry[],
): readonly string[] {
  return catalog.map((entry) => entry.name).sort();
}
