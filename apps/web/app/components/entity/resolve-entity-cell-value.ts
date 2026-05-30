import type { SerializableEntityDefinition } from "@repo/entities";

import { formatCellValue } from "./entity-field-utils";

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
  if (fieldMeta?.relation?.type === "one-to-many") {
    const relatedValue = getOneToManyCellValue(String(item.id), column);
    if (relatedValue !== null) {
      return relatedValue;
    }
  }

  return formatCellValue(item[column]);
}
