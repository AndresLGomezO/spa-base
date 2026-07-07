import {
  isGridComponent,
  isQueryViewerComponent,
  isRowHolderComponent,
  type QueryViewerComponentConfig,
  type RowNode,
  type UiLayoutDocument,
  resolveLayoutRootColumns,
} from "@repo/ui-builder-core";
import { listEntityQueryAggregationOutputFields } from "@repo/entity-queries/browser";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { tryGetEntityDefinition } from "../../entities/entity-catalog";
import type { EntityQueryDefinitionRecord } from "../../lib/api-client";
import { resolveEntityQueryDefinitionDocumentId } from "../../lib/resolve-entity-query-definition-reference";

function rowTreeContainsId(rows: readonly RowNode[], rowId: string): boolean {
  for (const row of rows) {
    if (row.id === rowId) {
      return true;
    }

    if (row.type === "component" && isRowHolderComponent(row.component)) {
      if (isGridComponent(row.component)) {
        for (const trackRow of row.component.rows) {
          if (
            trackRow.type === "component" &&
            isRowHolderComponent(trackRow.component) &&
            rowTreeContainsId(trackRow.component.rows, rowId)
          ) {
            return true;
          }
        }
        continue;
      }

      if (rowTreeContainsId(row.component.rows, rowId)) {
        return true;
      }
    }
  }

  return false;
}

export function findEnclosingQueryViewerConfig(
  layout: UiLayoutDocument,
  targetRowId: string,
): QueryViewerComponentConfig | null {
  for (const column of resolveLayoutRootColumns(layout)) {
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

    if (row.type === "component" && isRowHolderComponent(row.component)) {
      if (isGridComponent(row.component)) {
        for (const trackRow of row.component.rows) {
          if (trackRow.type !== "component") {
            continue;
          }
          const nested = findQueryViewerInRows(
            isRowHolderComponent(trackRow.component)
              ? trackRow.component.rows
              : [trackRow],
            targetRowId,
          );
          if (nested) {
            return nested;
          }
        }
        continue;
      }

      const nested = findQueryViewerInRows(row.component.rows, targetRowId);
      if (nested) {
        return nested;
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

function buildAggregatedQueryViewerSourceDefinition(
  sourceDefinition: EntityCatalogEntry,
  queryDefinition: EntityQueryDefinitionRecord,
): EntityCatalogEntry {
  const outputFields = listEntityQueryAggregationOutputFields({
    groupBy: queryDefinition.groupBy ?? [],
    aggregations: queryDefinition.aggregations ?? [],
  });

  const mergedFields = { ...sourceDefinition.fields };
  for (const field of outputFields) {
    if (mergedFields[field]) {
      continue;
    }

    mergedFields[field] = {
      type: "number",
      required: false,
      optional: true,
    };
  }

  return {
    ...sourceDefinition,
    fields: mergedFields,
  };
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

  const resolvedQueryId =
    resolveEntityQueryDefinitionDocumentId(queryId, queryDefinitions) ??
    queryId;
  const queryDefinition = queryDefinitions.find(
    (item) => item.id === resolvedQueryId,
  );
  if (!queryDefinition) {
    return null;
  }

  const sourceDefinition = tryGetEntityDefinition(
    queryDefinition.sourceEntity,
    catalogItems,
  );
  if (!sourceDefinition) {
    return null;
  }

  if (queryDefinition.queryMode === "aggregated") {
    return buildAggregatedQueryViewerSourceDefinition(
      sourceDefinition,
      queryDefinition,
    );
  }

  return sourceDefinition;
}
