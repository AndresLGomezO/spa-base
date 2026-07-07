import {
  entityQueryDefinitionRecordSchema,
  type CreateEntityQueryDefinitionInput,
  type EntityQueryDefinitionRecord,
  type PatchEntityQueryDefinitionInput,
} from "./types.js";

export function buildEntityQueryDefinitionRecord(
  base: {
    readonly id: string;
    readonly tenantId: string;
    readonly queryId: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  },
  input: CreateEntityQueryDefinitionInput,
): EntityQueryDefinitionRecord {
  return entityQueryDefinitionRecordSchema.parse({
    ...base,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    sourceEntity: input.sourceEntity,
    queryMode: input.queryMode,
    parameters: input.parameters,
    filter: input.filter,
    sort: input.sort,
    ...(input.select ? { select: input.select } : {}),
    groupBy: input.groupBy,
    aggregations: input.aggregations,
    groupSort: input.groupSort,
    ...(input.groupLimit !== undefined ? { groupLimit: input.groupLimit } : {}),
    limitMode: input.limitMode,
    ...(input.limitMode === "topN" ? { limit: input.limit } : {}),
    status: input.status,
  });
}

export function mergeEntityQueryDefinitionPatch(
  current: EntityQueryDefinitionRecord,
  input: PatchEntityQueryDefinitionInput,
  updatedAt: string,
): EntityQueryDefinitionRecord {
  const limitMode = input.limitMode ?? current.limitMode;
  const limit =
    limitMode === "topN" ? (input.limit ?? current.limit ?? 20) : undefined;

  return entityQueryDefinitionRecordSchema.parse({
    ...current,
    ...(input.name ? { name: input.name } : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.queryMode !== undefined ? { queryMode: input.queryMode } : {}),
    ...(input.parameters !== undefined ? { parameters: input.parameters } : {}),
    ...(input.filter ? { filter: input.filter } : {}),
    ...(input.sort ? { sort: input.sort } : {}),
    ...(input.select !== undefined ? { select: input.select } : {}),
    ...(input.groupBy !== undefined ? { groupBy: input.groupBy } : {}),
    ...(input.aggregations !== undefined
      ? { aggregations: input.aggregations }
      : {}),
    ...(input.groupSort !== undefined ? { groupSort: input.groupSort } : {}),
    ...(input.groupLimit !== undefined ? { groupLimit: input.groupLimit } : {}),
    ...(input.limitMode ? { limitMode: input.limitMode } : {}),
    ...(limitMode === "topN" ? { limit } : {}),
    ...(input.status ? { status: input.status } : {}),
    updatedAt,
  });
}
