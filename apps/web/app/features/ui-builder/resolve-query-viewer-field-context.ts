import {
  isContainerComponent,
  isQueryViewerComponent,
  type QueryViewerComponentConfig,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { tryGetEntityDefinition } from "../../entities/entity-catalog";
import type { EntityQueryDefinitionRecord } from "../../lib/api-client";

function rowTreeContainsId(rows: readonly RowNode[], rowId: string): boolean {
  for (const row of rows) {
    if (row.id === rowId) {
      return true;
    }

    if (row.type === "component" && isContainerComponent(row.component)) {
      if (rowTreeContainsId(row.component.rows, rowId)) {
        return true;
      }
      continue;
    }

    if (row.type === "nested-layout") {
      for (const column of row.columns) {
        if (rowTreeContainsId(column.rows, rowId)) {
          return true;
        }
      }
    }
  }

  return false;
}

export function findEnclosingQueryViewerConfig(
  layout: UiLayoutDocument,
  targetRowId: string,
): QueryViewerComponentConfig | null {
  for (const column of layout.root.columns) {
    const found = findQueryViewerInRows(column.rows, targetRowId);
    if (found) {
      return found;
    }
  }

  return null;
}

function findQueryViewerInRows(
  rows: readonly RowNode[],
  targetRowId: string,
): QueryViewerComponentConfig | null {
  for (const row of rows) {
    if (row.type === "component" && isQueryViewerComponent(row.component)) {
      if (
        row.id === targetRowId ||
        rowTreeContainsId(row.component.rows, targetRowId)
      ) {
        return row.component;
      }
      continue;
    }

    if (row.type === "component" && isContainerComponent(row.component)) {
      const nested = findQueryViewerInRows(row.component.rows, targetRowId);
      if (nested) {
        return nested;
      }
      continue;
    }

    if (row.type === "nested-layout") {
      for (const column of row.columns) {
        const nested = findQueryViewerInRows(column.rows, targetRowId);
        if (nested) {
          return nested;
        }
      }
    }
  }

  return null;
}

export function isInsideQueryViewerTemplate(
  layout: UiLayoutDocument,
  targetRowId: string,
): boolean {
  return findEnclosingQueryViewerConfig(layout, targetRowId) !== null;
}

export function resolveQueryViewerSourceDefinition(
  layout: UiLayoutDocument,
  targetRowId: string,
  queryDefinitions: readonly EntityQueryDefinitionRecord[],
  catalogItems: readonly EntityCatalogEntry[],
): EntityCatalogEntry | null {
  const queryViewer = findEnclosingQueryViewerConfig(layout, targetRowId);
  if (!queryViewer) {
    return null;
  }

  const queryId = queryViewer.entityQueryDefinitionId.trim();
  if (queryId.length === 0) {
    return null;
  }

  const queryDefinition = queryDefinitions.find((item) => item.id === queryId);
  if (!queryDefinition) {
    return null;
  }

  return (
    tryGetEntityDefinition(queryDefinition.sourceEntity, catalogItems) ?? null
  );
}
