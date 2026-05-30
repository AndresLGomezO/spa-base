import type { SerializableEntityDefinition } from "@repo/entities";

import { formatFieldLabel } from "../../entities/entity-catalog";
import type { DataViewColumnDescriptor } from "../data-view/types";
import {
  getEntityCellRawValue,
  resolveEntityCellValue,
} from "./resolve-entity-cell-value";

interface BuildEntityColumnDescriptorsParams {
  readonly definition: SerializableEntityDefinition;
  readonly columns: readonly string[];
  readonly getOneToManyCellValue: (
    recordId: string,
    columnName: string,
  ) => string | null;
}

export function buildEntityColumnDescriptors(
  params: BuildEntityColumnDescriptorsParams,
): readonly DataViewColumnDescriptor<Record<string, unknown>>[] {
  const { definition, columns, getOneToManyCellValue } = params;

  return columns.map((column) => {
    const fieldMeta = definition.fields[column];
    const fieldUi = definition.ui.fields?.[column];

    return {
      id: column,
      label: formatFieldLabel(column, definition),
      getValue: (item) =>
        getEntityCellRawValue(item, column, definition, getOneToManyCellValue),
      getDisplayValue: (item) =>
        resolveEntityCellValue(item, column, definition, getOneToManyCellValue),
      filterKind: fieldMeta?.type === "boolean" ? "boolean" : undefined,
      filterable: fieldUi?.filterable,
      sortable: fieldUi?.sortable,
      getRowId: (item) => String(item.id),
    };
  });
}
