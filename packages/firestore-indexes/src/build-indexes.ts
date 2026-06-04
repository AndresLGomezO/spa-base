import {
  getForeignKeyRelationFields,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";

import {
  collectFilterableFields,
  collectSortableFields,
} from "./index-field-sets.js";
import type { FirestoreCompositeIndex, FirestoreIndexField } from "./types.js";

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

export function buildListQueryIndex(
  collection: string,
  options: {
    readonly tenantWideRead?: boolean;
    readonly filterFields?: readonly string[];
    readonly sortField: string;
    readonly sortDirection: "ASCENDING" | "DESCENDING";
  },
): FirestoreCompositeIndex {
  const fields: FirestoreIndexField[] = [];

  if (!options.tenantWideRead) {
    fields.push({ fieldPath: OWNERSHIP_FIELD, arrayConfig: "CONTAINS" });
  }

  const filterFields = options.filterFields ?? [];
  const sortField = options.sortField;

  for (const field of filterFields) {
    if (field === sortField) {
      continue;
    }
    fields.push({ fieldPath: field, order: "ASCENDING" });
  }

  if (
    !fields.some(
      (field) => field.fieldPath === sortField && !("arrayConfig" in field),
    )
  ) {
    fields.push({ fieldPath: sortField, order: options.sortDirection });
  }

  if (
    sortField !== DEFAULT_SORT_FIELD &&
    !fields.some((field) => field.fieldPath === DEFAULT_SORT_FIELD)
  ) {
    fields.push({
      fieldPath: DEFAULT_SORT_FIELD,
      order: options.sortDirection,
    });
  }

  return {
    collectionGroup: collection,
    queryScope: "COLLECTION",
    fields,
  };
}

export function indexesForEntity(
  entity: AnyDefinedEntity,
): FirestoreCompositeIndex[] {
  const collection = resolveEntityCollection(entity);
  const tenantWideRead = entity.metadata.tenantWideRead === true;
  const indexes: FirestoreCompositeIndex[] = [];

  if (!tenantWideRead) {
    indexes.push(buildOwnershipListIndex(collection));

    for (const { fieldName } of getForeignKeyRelationFields(entity.metadata)) {
      indexes.push(buildOwnershipFkIndex(collection, fieldName));
      indexes.push(buildFindByFieldIndex(collection, fieldName));
    }
  }

  if (entity.metadata.inMemoryListQueries === true) {
    return dedupeIndexes(indexes);
  }

  const filterableFields = collectFilterableFields(entity);
  const sortableFields = collectSortableFields(entity);
  const sortDirections = ["ASCENDING", "DESCENDING"] as const;

  for (const sortField of sortableFields) {
    for (const sortDirection of sortDirections) {
      indexes.push(
        buildListQueryIndex(collection, {
          tenantWideRead,
          sortField,
          sortDirection,
        }),
      );
    }
  }

  for (const filterField of filterableFields) {
    for (const sortDirection of sortDirections) {
      indexes.push(
        buildListQueryIndex(collection, {
          tenantWideRead,
          filterFields: [filterField],
          sortField: DEFAULT_SORT_FIELD,
          sortDirection,
        }),
      );
    }
  }

  return dedupeIndexes(indexes);
}

export function indexesForEntities(
  entities: readonly AnyDefinedEntity[],
): FirestoreCompositeIndex[] {
  return dedupeIndexes(entities.flatMap((entity) => indexesForEntity(entity)));
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
