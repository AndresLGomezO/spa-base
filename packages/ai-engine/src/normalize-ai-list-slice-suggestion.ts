import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import {
  createDefaultUiLayout,
  parseDesignLayoutSliceJson,
  type ListSliceData,
} from "@repo/entities";
import {
  sanitizeTableColumnFieldPaths,
  normalizeLayout,
  type FieldPathValidationDefinition,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

type ActiveListViewType = "table" | "card" | "expandableTable";

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

function sanitizeTableFields(
  entity: DefinedEntity<string, FieldDefinitions>,
  fields: readonly string[],
): readonly string[] {
  const definition = toFieldPathDefinition(entity);
  return sanitizeTableColumnFieldPaths(definition, fields);
}

function normalizeListViewType(value: unknown): ActiveListViewType | undefined {
  if (value === "compact") {
    return "expandableTable";
  }
  if (value === "table" || value === "card" || value === "expandableTable") {
    return value;
  }
  return undefined;
}

function buildListSliceStub(
  entity: DefinedEntity<string, FieldDefinitions>,
): ListSliceData {
  const fields = entityFieldPaths(entity);
  const columnFields = fields.length > 0 ? fields.slice(0, 5) : ["name"];
  const layout = createDefaultUiLayout([columnFields[0] ?? "name"]);

  return {
    listViewType: "table",
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

function repairLayoutDocument(layout: UiLayoutDocument): UiLayoutDocument {
  return normalizeLayout(layout);
}

function repairListSliceLayouts(slice: ListSliceData): ListSliceData {
  return {
    ...slice,
    expandableTable: {
      ...slice.expandableTable,
      columns: slice.expandableTable.columns.map((column) => ({
        ...column,
        cellLayout: repairLayoutDocument(column.cellLayout),
      })),
      rowExpandLayout: repairLayoutDocument(
        slice.expandableTable.rowExpandLayout,
      ),
    },
    ...(slice.listItem
      ? { listItem: repairLayoutDocument(slice.listItem) }
      : {}),
  };
}

function extractListSliceData(
  aiPayload: unknown,
): Partial<ListSliceData> | null {
  if (!aiPayload || typeof aiPayload !== "object") {
    return null;
  }

  const record = aiPayload as Record<string, unknown>;
  if (record.kind === "design-layout-slice" && record.data) {
    return record.data as Partial<ListSliceData>;
  }

  if ("listViewType" in record) {
    return record as Partial<ListSliceData>;
  }

  return null;
}

export function normalizeAiListSliceSuggestion(
  entity: DefinedEntity<string, FieldDefinitions>,
  aiPayload: unknown,
  fallbackLayoutJson?: string,
): ListSliceData | null {
  const partial = extractListSliceData(aiPayload);
  if (!partial) {
    return null;
  }

  const listViewType = normalizeListViewType(partial.listViewType);
  if (!listViewType) {
    return null;
  }

  const stub = buildListSliceStub(entity);
  const fallback = parseFallbackListSlice(fallbackLayoutJson) ?? stub;

  const merged: ListSliceData = {
    listViewType,
    table:
      listViewType === "table" && partial.table
        ? {
            fields: [...sanitizeTableFields(entity, partial.table.fields)],
            ...(partial.table.showActions !== undefined
              ? { showActions: partial.table.showActions }
              : {}),
          }
        : fallback.table,
    expandableTable:
      listViewType === "expandableTable" && partial.expandableTable
        ? {
            columns: [...partial.expandableTable.columns],
            rowExpandLayout: partial.expandableTable.rowExpandLayout,
            ...(partial.expandableTable.showActions !== undefined
              ? { showActions: partial.expandableTable.showActions }
              : {}),
          }
        : fallback.expandableTable,
    ...(listViewType === "card" && partial.listItem
      ? { listItem: partial.listItem }
      : fallback.listItem
        ? { listItem: fallback.listItem }
        : {}),
  };

  return repairListSliceLayouts(merged);
}

export type { ActiveListViewType };
