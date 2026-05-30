import {
  isDocumentStoredField,
  isJoinCollectionRelationField,
  type SerializableEntityDefinition,
} from "@repo/entities";

export function getJoinRelationFieldNames(
  definition: SerializableEntityDefinition,
): readonly string[] {
  return Object.entries(definition.fields)
    .filter(([, meta]) => isJoinCollectionRelationField(meta))
    .map(([fieldName]) => fieldName);
}

export function splitEntityFormPayload(
  definition: SerializableEntityDefinition,
  values: Record<string, unknown>,
): {
  readonly documentPayload: Record<string, unknown>;
  readonly joinRelations: Record<string, readonly string[]>;
} {
  const documentPayload: Record<string, unknown> = {};
  const joinRelations: Record<string, readonly string[]> = {};

  for (const [fieldName, value] of Object.entries(values)) {
    const meta = definition.fields[fieldName];
    if (!meta) {
      continue;
    }

    if (isJoinCollectionRelationField(meta)) {
      joinRelations[fieldName] = Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : [];
      continue;
    }

    if (!isDocumentStoredField(meta)) {
      continue;
    }

    documentPayload[fieldName] = value;
  }

  return { documentPayload, joinRelations };
}
