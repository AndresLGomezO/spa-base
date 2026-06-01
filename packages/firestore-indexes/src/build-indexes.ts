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

export function buildOwnershipCreatedAtIndex(
  collection: string,
  direction: "ASCENDING" | "DESCENDING" = "DESCENDING",
): FirestoreCompositeIndex {
  return {
    collectionGroup: collection,
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: OWNERSHIP_FIELD, arrayConfig: "CONTAINS" },
      { fieldPath: "createdAt", order: direction },
      { fieldPath: DEFAULT_SORT_FIELD, order: "ASCENDING" },
    ],
  };
}

export function buildFindByFieldIndex(
  collection: string,
  fkField: string,
): FirestoreCompositeIndex {
  return {
    collectionGroup: collection,
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: fkField, order: "ASCENDING" },
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

    const defaultSortFields = collectDefaultSortFields(entity);
    for (const { field, direction } of defaultSortFields) {
      if (field === "createdAt") {
        indexes.push(
          buildOwnershipCreatedAtIndex(
            collection,
            direction === "desc" ? "DESCENDING" : "ASCENDING",
          ),
        );
      }
    }

    for (const { fieldName } of getForeignKeyRelationFields(entity.metadata)) {
      indexes.push(buildOwnershipFkIndex(collection, fieldName));
      indexes.push(buildFindByFieldIndex(collection, fieldName));
    }
  }

  return indexes;
}

function collectDefaultSortFields(
  entity: AnyDefinedEntity,
): Array<{ field: string; direction: "asc" | "desc" }> {
  const sorts = new Map<string, "asc" | "desc">();
  const views = entity.metadata.ui?.views ?? [];
  for (const view of views) {
    if (view.defaultSort) {
      sorts.set(view.defaultSort.field, view.defaultSort.direction);
    }
  }
  return [...sorts.entries()].map(([field, direction]) => ({
    field,
    direction,
  }));
}

export function indexesForEntities(
  entities: readonly AnyDefinedEntity[],
): FirestoreCompositeIndex[] {
  return entities.flatMap((entity) => indexesForEntity(entity));
}

export function computeIndexSignature(index: FirestoreCompositeIndex): string {
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
    seen.set(computeIndexSignature(index), index);
  }
  return [...seen.values()].sort((left, right) => {
    const leftKey = computeIndexSignature(left);
    const rightKey = computeIndexSignature(right);
    return leftKey.localeCompare(rightKey);
  });
}
