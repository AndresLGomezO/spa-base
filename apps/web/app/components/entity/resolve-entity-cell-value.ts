import type { SerializableEntityDefinition } from "@repo/entities";
import {
  formatDisplayValue,
  type DateDisplayFormat,
  type DisplayFieldType,
  type DisplayFormat,
} from "@repo/ui";

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
} {
  const fieldMeta = definition.fields[column];
  const uiField = definition.ui.fields?.[column];

  return {
    fieldType: fieldMeta?.type as DisplayFieldType | undefined,
    ...(uiField?.displayFormat ? { displayFormat: uiField.displayFormat } : {}),
    ...(uiField?.dateDisplayFormat
      ? { dateDisplayFormat: uiField.dateDisplayFormat }
      : {}),
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
