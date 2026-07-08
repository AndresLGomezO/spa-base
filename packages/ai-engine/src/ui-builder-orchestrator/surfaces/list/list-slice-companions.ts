import type {
  DefinedEntity,
  FieldDefinitions,
  ListSliceData,
} from "@repo/entities";
import { parseDesignLayoutSliceJson } from "@repo/entities";
import {
  createDefaultUiLayout,
  sanitizeTableColumnFieldPaths,
  normalizeLayout,
  type FieldPathValidationDefinition,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import type { ListViewTypeChoice } from "../../types.js";

function entityFieldPaths(
  entity: DefinedEntity<string, FieldDefinitions>,
): readonly string[] {
  return Object.keys(entity.metadata.fields);
}

function toFieldPathDefinition(
  entity: DefinedEntity<string, FieldDefinitions>,
): FieldPathValidationDefinition {
  return {
    name: entity.metadata.name,
    fields: entity.metadata.fields as FieldPathValidationDefinition["fields"],
  };
}

export function sanitizeTableFields(
  entity: DefinedEntity<string, FieldDefinitions>,
  fields: readonly string[],
): readonly string[] {
  const definition = toFieldPathDefinition(entity);
  return sanitizeTableColumnFieldPaths(definition, fields);
}

export function buildListSliceStub(
  entity: DefinedEntity<string, FieldDefinitions>,
): ListSliceData {
  const fields = entityFieldPaths(entity);
  const columnFields = fields.length > 0 ? fields.slice(0, 5) : ["name"];
  const layout = createDefaultUiLayout([columnFields[0] ?? "name"]);

  return {
    listViewType: "expandableTable",
    table: { fields: [...columnFields], showActions: true },
    expandableTable: {
      columns: [
        {
          id: "col-1",
          label: "Column",
          cellLayout: layout,
        },
      ],
      rowExpandLayout: layout,
      showActions: true,
    },
  };
}

function parseFallbackListSlice(
  fallbackLayoutJson: string | undefined,
): ListSliceData | undefined {
  if (!fallbackLayoutJson?.trim()) {
    return undefined;
  }

  const parsed = parseDesignLayoutSliceJson(fallbackLayoutJson.trim(), "list");
  if (!parsed.ok) {
    return undefined;
  }

  return parsed.data as ListSliceData;
}

function repairListSliceLayouts(slice: ListSliceData): ListSliceData {
  return {
    ...slice,
    expandableTable: {
      ...slice.expandableTable,
      columns: slice.expandableTable.columns.map((column) => ({
        ...column,
        cellLayout: normalizeLayout(column.cellLayout),
      })),
      rowExpandLayout: normalizeLayout(slice.expandableTable.rowExpandLayout),
    },
    ...(slice.listItem ? { listItem: normalizeLayout(slice.listItem) } : {}),
  };
}

export function mergeListSliceWithCompanions(
  entity: DefinedEntity<string, FieldDefinitions>,
  listViewType: ListViewTypeChoice,
  activePartial: Partial<ListSliceData>,
  fallbackLayoutJson: string | undefined,
  stub?: ListSliceData,
): ListSliceData {
  const baseStub = stub ?? buildListSliceStub(entity);
  const fallback = parseFallbackListSlice(fallbackLayoutJson) ?? baseStub;

  const merged: ListSliceData = {
    listViewType,
    table: activePartial.table
      ? {
          fields: [...sanitizeTableFields(entity, activePartial.table.fields)],
          ...(activePartial.table.showActions !== undefined
            ? { showActions: activePartial.table.showActions }
            : {}),
        }
      : fallback.table,
    expandableTable:
      listViewType === "expandableTable" && activePartial.expandableTable
        ? {
            columns: [...activePartial.expandableTable.columns],
            rowExpandLayout: activePartial.expandableTable.rowExpandLayout,
            ...(activePartial.expandableTable.showActions !== undefined
              ? { showActions: activePartial.expandableTable.showActions }
              : {}),
          }
        : fallback.expandableTable,
    ...(listViewType === "card" && activePartial.listItem
      ? { listItem: activePartial.listItem }
      : fallback.listItem
        ? { listItem: fallback.listItem }
        : {}),
  };

  return repairListSliceLayouts(merged);
}

export type { UiLayoutDocument };
