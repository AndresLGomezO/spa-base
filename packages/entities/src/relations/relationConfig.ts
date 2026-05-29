import type {
  EntityMetadata,
  FieldDefinitions,
  RelationConfig,
} from "../types.js";

export type RelationStorageStrategy = "foreignKey" | "joinCollection" | "none";

export function getRelationStorageStrategy(
  relation: RelationConfig,
): RelationStorageStrategy {
  if (relation.type === "many-to-many") {
    return "joinCollection";
  }
  if (relation.type === "one-to-many") {
    return "none";
  }
  return "foreignKey";
}

export function usesForeignKeyStorage(relation: RelationConfig): boolean {
  return getRelationStorageStrategy(relation) === "foreignKey";
}

export function resolveJoinCollectionName(
  sourceEntity: string,
  targetEntity: string,
  relation: RelationConfig,
): string {
  if (relation.joinCollection) {
    return relation.joinCollection;
  }
  return `${sourceEntity}_${targetEntity}`;
}

export function getRelationOnDelete(
  relation: RelationConfig,
): RelationConfig["onDelete"] {
  return relation.onDelete ?? "restrict";
}

export interface RelationFieldEntry {
  readonly fieldName: string;
  readonly relation: RelationConfig;
}

export function getRelationFields<
  TName extends string,
  TFields extends FieldDefinitions,
>(metadata: EntityMetadata<TName, TFields>): readonly RelationFieldEntry[] {
  const entries: RelationFieldEntry[] = [];

  for (const [fieldName, meta] of Object.entries(metadata.fields)) {
    if (meta.type === "relation" && meta.relation) {
      entries.push({ fieldName, relation: meta.relation });
    }
  }

  return entries;
}

export function getForeignKeyRelationFields<
  TName extends string,
  TFields extends FieldDefinitions,
>(metadata: EntityMetadata<TName, TFields>): readonly RelationFieldEntry[] {
  return getRelationFields(metadata).filter((entry) =>
    usesForeignKeyStorage(entry.relation),
  );
}

export function getJoinCollectionRelations<
  TName extends string,
  TFields extends FieldDefinitions,
>(metadata: EntityMetadata<TName, TFields>): readonly RelationFieldEntry[] {
  return getRelationFields(metadata).filter(
    (entry) => getRelationStorageStrategy(entry.relation) === "joinCollection",
  );
}
