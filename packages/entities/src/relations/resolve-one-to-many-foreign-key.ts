import type { RelationConfig } from "../types.js";
import type { SerializableEntityDefinition } from "../ui/types.js";

type RelationFieldMeta = {
  readonly type: string;
  readonly relation?: {
    readonly target?: string;
    readonly type?: string;
    readonly inverse?: string;
  };
};

export function isOneToManyRelationField(meta: RelationFieldMeta): boolean {
  return meta.type === "relation" && meta.relation?.type === "one-to-many";
}

export function resolveOneToManyForeignKeyField(
  parentEntityName: string,
  targetEntityDefinition: SerializableEntityDefinition,
  relation?: Pick<RelationConfig, "inverse">,
): string | null {
  if (relation?.inverse) {
    const inverseField = targetEntityDefinition.fields[relation.inverse];
    if (inverseField) {
      return relation.inverse;
    }
  }

  for (const [fieldName, meta] of Object.entries(
    targetEntityDefinition.fields,
  )) {
    if (
      meta.type === "relation" &&
      meta.relation?.target === parentEntityName &&
      (meta.relation.type === "many-to-one" ||
        meta.relation.type === "one-to-one")
    ) {
      return fieldName;
    }
  }

  const conventionalName = `${parentEntityName}Id`;
  if (targetEntityDefinition.fields[conventionalName]) {
    return conventionalName;
  }

  return null;
}
