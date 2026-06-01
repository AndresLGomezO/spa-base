import type { SerializableEntityDefinition } from "@repo/entities";
import {
  formatDisplayValue,
  type DateDisplayFormat,
  type DisplayFieldType,
  type DisplayFormat,
} from "@repo/ui";

import { formatRecordDisplayLabel } from "./format-record-display-label";

function getPopulatedDisplayValue(
  item: Record<string, unknown>,
  column: string,
): string | null {
  const populated = item._populated as
    | Record<string, Record<string, unknown> | null>
    | undefined;
  if (!populated || !populated[column]) return null;
  const target = populated[column];
  return formatRecordDisplayLabel(target);
}

export function getEntityCellRawValue(
  item: Record<string, unknown>,
  column: string,
  definition: SerializableEntityDefinition,
  getOneToManyCellValue: (
    recordId: string,
    columnName: string,
  ) => string | null,
): unknown {
  const fieldMeta = definition.fields[column];
  if (fieldMeta?.relation?.type === "one-to-many") {
    const relatedValue = getOneToManyCellValue(String(item.id), column);
    if (relatedValue !== null) {
      return relatedValue;
    }
  }

  return item[column];
}

export function getEntityCellDisplayMeta(
  column: string,
  definition: SerializableEntityDefinition,
): {
  readonly fieldType?: DisplayFieldType;
  readonly displayFormat?: DisplayFormat;
  readonly dateDisplayFormat?: DateDisplayFormat;
  readonly fallbackImageUrl?: string | null;
} {
  const fieldMeta = definition.fields[column];
  const uiField = definition.ui.fields?.[column];
  const defaultImage = fieldMeta?.defaultImage;
  const fallbackImageUrl =
    fieldMeta?.type === "image" &&
    defaultImage &&
    "downloadUrl" in defaultImage &&
    typeof defaultImage.downloadUrl === "string"
      ? defaultImage.downloadUrl
      : null;

  return {
    fieldType: fieldMeta?.type as DisplayFieldType | undefined,
    ...(uiField?.displayFormat ? { displayFormat: uiField.displayFormat } : {}),
    ...(uiField?.dateDisplayFormat
      ? { dateDisplayFormat: uiField.dateDisplayFormat }
      : {}),
    ...(fallbackImageUrl ? { fallbackImageUrl } : {}),
  };
}

export function resolveEntityCellValue(
  item: Record<string, unknown>,
  column: string,
  definition: SerializableEntityDefinition,
  getOneToManyCellValue: (
    recordId: string,
    columnName: string,
  ) => string | null,
): string {
  const fieldMeta = definition.fields[column];
  if (
    fieldMeta?.relation?.type === "many-to-one" ||
    fieldMeta?.relation?.type === "one-to-one"
  ) {
    const displayLabel = getPopulatedDisplayValue(item, column);
    if (displayLabel !== null) {
      return displayLabel;
    }
  }

  const raw = getEntityCellRawValue(
    item,
    column,
    definition,
    getOneToManyCellValue,
  );
  const { fieldType, displayFormat, dateDisplayFormat } =
    getEntityCellDisplayMeta(column, definition);

  return formatDisplayValue(raw, {
    fieldType,
    displayFormat,
    dateDisplayFormat,
    fieldName: column,
  });
}

export function getEntityCellSchemaValue(
  item: Record<string, unknown>,
  column: string,
  definition: SerializableEntityDefinition,
  getOneToManyCellValue: (
    recordId: string,
    columnName: string,
  ) => string | null,
): unknown {
  const fieldMeta = definition.fields[column];
  if (fieldMeta?.relation) {
    return resolveEntityCellValue(
      item,
      column,
      definition,
      getOneToManyCellValue,
    );
  }

  return getEntityCellRawValue(item, column, definition, getOneToManyCellValue);
}
