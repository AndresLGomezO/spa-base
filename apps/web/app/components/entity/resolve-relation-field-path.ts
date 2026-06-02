import type { SerializableEntityDefinition } from "@repo/entities";

export function resolveRelationFieldName(
  definition: SerializableEntityDefinition,
  pathSegment: string,
): string | null {
  const segment = pathSegment.trim();
  if (!segment) {
    return null;
  }

  const directMeta = definition.fields[segment];
  if (
    directMeta?.relation &&
    (directMeta.relation.type === "many-to-one" ||
      directMeta.relation.type === "one-to-one")
  ) {
    return segment;
  }

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (
      meta.relation &&
      (meta.relation.type === "many-to-one" ||
        meta.relation.type === "one-to-one") &&
      meta.relation.target === segment
    ) {
      return fieldName;
    }
  }

  return null;
}

export function parseRelationFieldPath(
  definition: SerializableEntityDefinition,
  fieldPath: string,
): { readonly relationField: string; readonly subField: string } | null {
  const trimmedPath = fieldPath.trim();
  if (!trimmedPath.includes(".")) {
    return null;
  }

  const [firstSegment, subField] = trimmedPath.split(".", 2);
  if (!firstSegment || !subField) {
    return null;
  }

  const relationField = resolveRelationFieldName(definition, firstSegment);
  if (!relationField) {
    return null;
  }

  return { relationField, subField };
}
