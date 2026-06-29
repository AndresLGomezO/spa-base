import type { SerializableEntityDefinition } from "@repo/entities";
import { isOneToManyRelationField } from "@repo/entities";

type ParsedRelationFieldPath = {
  readonly relationField: string;
  readonly subField: string;
  readonly relationKind: "many-to-one" | "one-to-one" | "one-to-many";
};

export type RelationDefinitionLookup = (
  entityName: string,
) => SerializableEntityDefinition | undefined;

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

function resolveOneToManyRelationFieldName(
  definition: SerializableEntityDefinition,
  pathSegment: string,
): string | null {
  const segment = pathSegment.trim();
  if (!segment) {
    return null;
  }

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (!isOneToManyRelationField(meta)) {
      continue;
    }

    const targetEntity = meta.relation?.target;
    if (!targetEntity) {
      continue;
    }

    if (fieldName === segment || targetEntity === segment) {
      return fieldName;
    }
  }

  return null;
}

export function parseRelationFieldPath(
  definition: SerializableEntityDefinition,
  fieldPath: string,
  getDefinition?: RelationDefinitionLookup,
): ParsedRelationFieldPath | null {
  const trimmedPath = fieldPath.trim();
  if (!trimmedPath.includes(".")) {
    return null;
  }

  const [firstSegment, subField] = trimmedPath.split(".", 2);
  if (!firstSegment || !subField) {
    return null;
  }

  const relationField = resolveRelationFieldName(definition, firstSegment);
  if (relationField) {
    const relationMeta = definition.fields[relationField];
    const relationKind = relationMeta?.relation?.type;
    if (relationKind !== "many-to-one" && relationKind !== "one-to-one") {
      return null;
    }

    return {
      relationField,
      subField,
      relationKind,
    };
  }

  const oneToManyField = resolveOneToManyRelationFieldName(
    definition,
    firstSegment,
  );
  if (!oneToManyField) {
    if (getDefinition) {
      const reverseChild = getDefinition(firstSegment);
      if (reverseChild) {
        for (const [, meta] of Object.entries(reverseChild.fields)) {
          if (
            meta.relation?.target === definition.name &&
            (meta.relation.type === "many-to-one" ||
              meta.relation.type === "one-to-one")
          ) {
            if (subField in reverseChild.fields) {
              return {
                relationField: firstSegment,
                subField,
                relationKind: "one-to-many",
              };
            }
          }
        }
      }
    }

    return null;
  }

  const childEntity = definition.fields[oneToManyField]?.relation?.target;
  if (childEntity && getDefinition) {
    const childDefinition = getDefinition(childEntity);
    if (childDefinition && !(subField in childDefinition.fields)) {
      return null;
    }
  }

  return {
    relationField: oneToManyField,
    subField,
    relationKind: "one-to-many",
  };
}
