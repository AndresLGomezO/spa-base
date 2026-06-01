import {
  getForeignKeyRelationFields,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";

import type { FirestoreCompositeIndex } from "./types.js";

const OWNERSHIP_FIELD = "accessUserIds";
const DEFAULT_SORT_FIELD = "id";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export function resolveEntityCollection(entity: AnyDefinedEntity): string {
  return entity.metadata.collection;
}

export function buildOwnershipListIndex(
  collection: string,
): FirestoreCompositeIndex {
  return {
    collectionGroup: collection,
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: OWNERSHIP_FIELD, arrayConfig: "CONTAINS" },
      { fieldPath: DEFAULT_SORT_FIELD, order: "ASCENDING" },
    ],
  };
}

export function buildOwnershipFkIndex(
  collection: string,
  fkField: string,
): FirestoreCompositeIndex {
  return {
    collectionGroup: collection,
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: OWNERSHIP_FIELD, arrayConfig: "CONTAINS" },
      { fieldPath: fkField, order: "ASCENDING" },
      { fieldPath: DEFAULT_SORT_FIELD, order: "ASCENDING" },
    ],
  };
}

export function indexesForEntity(
  entity: AnyDefinedEntity,
): FirestoreCompositeIndex[] {
  const collection = resolveEntityCollection(entity);
  const indexes: FirestoreCompositeIndex[] = [];

  if (!entity.metadata.tenantWideRead) {
    indexes.push(buildOwnershipListIndex(collection));

    for (const { fieldName } of getForeignKeyRelationFields(entity.metadata)) {
      indexes.push(buildOwnershipFkIndex(collection, fieldName));
    }
  }

  return indexes;
}

export function indexesForEntities(
  entities: readonly AnyDefinedEntity[],
): FirestoreCompositeIndex[] {
  return entities.flatMap((entity) => indexesForEntity(entity));
}

function indexSignature(index: FirestoreCompositeIndex): string {
  const fieldsKey = index.fields
    .map((field) => {
      if ("arrayConfig" in field) {
        return `${field.fieldPath}:array:${field.arrayConfig}`;
      }
      return `${field.fieldPath}:order:${field.order}`;
    })
    .join(",");
  return `${index.collectionGroup}|${index.queryScope}|${fieldsKey}`;
}

export function dedupeIndexes(
  indexes: readonly FirestoreCompositeIndex[],
): FirestoreCompositeIndex[] {
  const seen = new Map<string, FirestoreCompositeIndex>();
  for (const index of indexes) {
    seen.set(indexSignature(index), index);
  }
  return [...seen.values()].sort((left, right) => {
    const leftKey = indexSignature(left);
    const rightKey = indexSignature(right);
    return leftKey.localeCompare(rightKey);
  });
}
