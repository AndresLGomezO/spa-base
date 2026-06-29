import type { SerializableEntityDefinition } from "@repo/entities";

import {
  parseRelationFieldPath,
  type RelationDefinitionLookup,
} from "./resolve-relation-field-path";

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

interface ResolveEntityFieldPathOptions {
  readonly getDefinition?: RelationDefinitionLookup;
  readonly getOneToManyRelationSubfieldValue?: (
    recordId: string,
    fieldPath: string,
  ) => unknown;
}

export function resolveEntityFieldPath(
  item: Record<string, unknown>,
  fieldPath: string,
  definition: SerializableEntityDefinition,
  getOneToManyCellValue: (
    recordId: string,
    columnName: string,
  ) => string | null,
  options?: ResolveEntityFieldPathOptions,
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

  const parsed = parseRelationFieldPath(
    definition,
    trimmedPath,
    options?.getDefinition,
  );
  if (!parsed) {
    return null;
  }

  if (parsed.relationKind === "one-to-many") {
    const subfieldValue = options?.getOneToManyRelationSubfieldValue?.(
      String(item.id),
      trimmedPath,
    );
    if (subfieldValue !== undefined) {
      return subfieldValue;
    }
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
