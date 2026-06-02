import type { SerializableEntityDefinition } from "@repo/entities";

import { parseRelationFieldPath } from "./resolve-relation-field-path";

function getPopulatedRecord(
  item: Record<string, unknown>,
  relationField: string,
): Record<string, unknown> | null {
  const populated = item._populated as
    | Record<string, Record<string, unknown> | null>
    | undefined;
  if (!populated) {
    return null;
  }
  return populated[relationField] ?? null;
}

export function resolveEntityFieldPath(
  item: Record<string, unknown>,
  fieldPath: string,
  definition: SerializableEntityDefinition,
  getOneToManyCellValue: (
    recordId: string,
    columnName: string,
  ) => string | null,
): unknown {
  const trimmedPath = fieldPath.trim();
  if (!trimmedPath.includes(".")) {
    if (trimmedPath in item) {
      return item[trimmedPath];
    }

    const fieldMeta = definition.fields[trimmedPath];
    if (fieldMeta?.relation?.type === "one-to-many") {
      return getOneToManyCellValue(String(item.id), trimmedPath);
    }

    return item[trimmedPath];
  }

  const parsed = parseRelationFieldPath(definition, trimmedPath);
  if (!parsed) {
    return null;
  }

  const { relationField, subField } = parsed;
  const populatedRecord = getPopulatedRecord(item, relationField);
  if (!populatedRecord) {
    return null;
  }

  return populatedRecord[subField] ?? null;
}

export function resolveEntityFieldRootName(fieldPath: string): string {
  return fieldPath.includes(".")
    ? (fieldPath.split(".", 1)[0] ?? fieldPath)
    : fieldPath;
}
