import {
  getForeignKeyRelationFields,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";

import {
  buildFindByFieldIndex,
  buildListQueryIndex,
  buildOwnershipFkIndex,
  buildOwnershipListIndex,
  computeIndexSignature,
  indexesForEntity,
  resolveEntityCollection,
} from "./build-indexes.js";
import {
  collectFilterableFields,
  collectSortableFields,
} from "./index-field-sets.js";
import type { FirestoreCompositeIndex } from "./types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export interface EntityIndexPlanSummary {
  readonly total: number;
  readonly ownershipBaseline: number;
  readonly ownershipFk: number;
  readonly findByField: number;
  readonly sortOnly: number;
  readonly filterOnly: number;
}

export interface EntityIndexPlan {
  readonly entityName: string;
  readonly collection: string;
  readonly indexes: readonly FirestoreCompositeIndex[];
  readonly summary: EntityIndexPlanSummary;
}

export interface TenantIndexPlan {
  readonly total: number;
  readonly summary: EntityIndexPlanSummary;
  readonly entities: readonly EntityIndexPlan[];
}

const DEFAULT_SORT_FIELD = "id";
const SORT_DIRECTIONS = ["ASCENDING", "DESCENDING"] as const;

export function emptyIndexPlanSummary(): EntityIndexPlanSummary {
  return {
    total: 0,
    ownershipBaseline: 0,
    ownershipFk: 0,
    findByField: 0,
    sortOnly: 0,
    filterOnly: 0,
  };
}

export function mergeIndexPlanSummaries(
  summaries: readonly EntityIndexPlanSummary[],
): EntityIndexPlanSummary {
  return summaries.reduce(
    (accumulator, summary) => ({
      total: accumulator.total + summary.total,
      ownershipBaseline:
        accumulator.ownershipBaseline + summary.ownershipBaseline,
      ownershipFk: accumulator.ownershipFk + summary.ownershipFk,
      findByField: accumulator.findByField + summary.findByField,
      sortOnly: accumulator.sortOnly + summary.sortOnly,
      filterOnly: accumulator.filterOnly + summary.filterOnly,
    }),
    emptyIndexPlanSummary(),
  );
}

type IndexCategory = keyof Omit<EntityIndexPlanSummary, "total">;

function categorizeIndexForEntity(
  entity: AnyDefinedEntity,
  index: FirestoreCompositeIndex,
): IndexCategory {
  const collection = resolveEntityCollection(entity);
  const tenantWideRead = entity.metadata.tenantWideRead === true;
  const signature = computeIndexSignature(index);
  const sortDirections = SORT_DIRECTIONS;

  if (
    signature === computeIndexSignature(buildOwnershipListIndex(collection))
  ) {
    return "ownershipBaseline";
  }

  for (const { fieldName } of getForeignKeyRelationFields(entity.metadata)) {
    if (
      signature ===
      computeIndexSignature(buildOwnershipFkIndex(collection, fieldName))
    ) {
      return "ownershipFk";
    }
    if (
      signature ===
      computeIndexSignature(buildFindByFieldIndex(collection, fieldName))
    ) {
      return "findByField";
    }
  }

  for (const sortField of collectSortableFields(entity)) {
    for (const sortDirection of sortDirections) {
      if (
        signature ===
        computeIndexSignature(
          buildListQueryIndex(collection, {
            tenantWideRead,
            sortField,
            sortDirection,
          }),
        )
      ) {
        return "sortOnly";
      }
    }
  }

  for (const filterField of collectFilterableFields(entity)) {
    for (const sortDirection of sortDirections) {
      if (
        signature ===
        computeIndexSignature(
          buildListQueryIndex(collection, {
            tenantWideRead,
            filterFields: [filterField],
            sortField: DEFAULT_SORT_FIELD,
            sortDirection,
          }),
        )
      ) {
        return "filterOnly";
      }
    }
  }

  return "sortOnly";
}

function summarizeIndexes(
  entity: AnyDefinedEntity,
  indexes: readonly FirestoreCompositeIndex[],
): EntityIndexPlanSummary {
  const summary = emptyIndexPlanSummary();
  const counts = { ...summary, total: indexes.length };

  for (const index of indexes) {
    const category = categorizeIndexForEntity(entity, index);
    counts[category] += 1;
  }

  return counts;
}

export function planIndexesForEntity(
  entity: AnyDefinedEntity,
): EntityIndexPlan {
  const indexes = indexesForEntity(entity);
  return {
    entityName: entity.name,
    collection: resolveEntityCollection(entity),
    indexes,
    summary: summarizeIndexes(entity, indexes),
  };
}

export function planIndexesForTenant(
  entities: readonly AnyDefinedEntity[],
): TenantIndexPlan {
  const entityPlans = entities.map((entity) => planIndexesForEntity(entity));
  return {
    total: entityPlans.reduce((sum, plan) => sum + plan.summary.total, 0),
    summary: mergeIndexPlanSummaries(entityPlans.map((plan) => plan.summary)),
    entities: entityPlans,
  };
}

export interface IndexMatchQuery {
  readonly tenantWideRead?: boolean;
  readonly equalityFilterFields: readonly string[];
  readonly sortField: string;
  readonly sortDirection: "ASCENDING" | "DESCENDING";
}

export function indexForQueryShape(
  collection: string,
  shape: IndexMatchQuery,
): FirestoreCompositeIndex {
  return buildListQueryIndex(collection, {
    ...(shape.tenantWideRead ? { tenantWideRead: true } : {}),
    ...(shape.equalityFilterFields.length > 0
      ? { filterFields: shape.equalityFilterFields }
      : {}),
    sortField: shape.sortField,
    sortDirection: shape.sortDirection,
  });
}

export function matchesPlannedIndex(
  collection: string,
  plannedIndexes: readonly FirestoreCompositeIndex[],
  shape: IndexMatchQuery,
): boolean {
  const signature = computeIndexSignature(
    indexForQueryShape(collection, shape),
  );
  return plannedIndexes.some(
    (index) => computeIndexSignature(index) === signature,
  );
}

export function plannedIndexSignatures(
  indexes: readonly FirestoreCompositeIndex[],
): ReadonlySet<string> {
  return new Set(indexes.map((index) => computeIndexSignature(index)));
}
