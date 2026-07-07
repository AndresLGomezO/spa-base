import {
  createEntityQueryDefinitionInputSchema,
  type EntityQueryDefinitionFormData,
} from "@repo/entity-queries/browser";

import {
  editorRootToEntityQueryFilter,
  editorRowsToEntityQuerySort,
  entityQueryFilterRootToEditor,
  entityQuerySortToEditorRows,
  type EntityQueryFilterEditorGroup,
  type EntityQuerySortEditorRow,
} from "../../../components/entity/entity-query-filter-utils";
import {
  editorRowsToEntityQueryAggregations,
  editorRowsToEntityQueryParameters,
  entityQueryAggregationsToEditorRows,
  entityQueryParametersToEditorRows,
  type EntityQueryAggregationEditorRow,
  type EntityQueryParameterEditorRow,
} from "../../../components/entity/entity-query-aggregation-editor-utils";
import type { EntityQueryDefinitionRecord } from "../../../lib/api-client";

export interface EntityQueryFormStateExportInput {
  readonly name: string;
  readonly description?: string;
  readonly sourceEntity: string;
  readonly queryMode: NonNullable<EntityQueryDefinitionRecord["queryMode"]>;
  readonly parameters: readonly EntityQueryParameterEditorRow[];
  readonly filter: EntityQueryFilterEditorGroup;
  readonly sort: readonly EntityQuerySortEditorRow[];
  readonly select: readonly string[];
  readonly groupBy: readonly string[];
  readonly aggregations: readonly EntityQueryAggregationEditorRow[];
  readonly groupSort: readonly EntityQuerySortEditorRow[];
  readonly groupLimit?: number;
  readonly limitMode: EntityQueryDefinitionRecord["limitMode"];
  readonly limit: number;
  readonly status: EntityQueryDefinitionRecord["status"];
}

function buildEntityQueryFormStatePayload(
  input: EntityQueryFormStateExportInput,
): EntityQueryDefinitionFormData {
  return structuredClone({
    name: input.name.trim(),
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    sourceEntity: input.sourceEntity,
    queryMode: input.queryMode,
    parameters: editorRowsToEntityQueryParameters(input.parameters),
    filter: editorRootToEntityQueryFilter(input.filter),
    sort: editorRowsToEntityQuerySort(input.sort),
    ...(input.select.length > 0 ? { select: [...input.select] } : {}),
    groupBy: [...input.groupBy],
    aggregations: editorRowsToEntityQueryAggregations(input.aggregations),
    groupSort: editorRowsToEntityQuerySort(input.groupSort),
    ...(input.groupLimit !== undefined ? { groupLimit: input.groupLimit } : {}),
    limitMode: input.limitMode,
    ...(input.limitMode === "topN" ? { limit: input.limit } : {}),
    status: input.status,
  }) as EntityQueryDefinitionFormData;
}

export function exportEntityQueryFormState(
  input: EntityQueryFormStateExportInput,
): EntityQueryDefinitionFormData {
  return buildEntityQueryFormStatePayload(input);
}

export function validateEntityQueryFormState(
  input: EntityQueryFormStateExportInput,
):
  | { readonly ok: true; readonly data: EntityQueryDefinitionFormData }
  | {
      readonly ok: false;
      readonly message: string;
    } {
  const result = createEntityQueryDefinitionInputSchema.safeParse(
    buildEntityQueryFormStatePayload(input),
  );

  if (!result.success) {
    return {
      ok: false,
      message: result.error.issues[0]?.message ?? "Invalid query settings.",
    };
  }

  return { ok: true, data: result.data };
}

export interface EntityQueryFormStateImportResult {
  readonly description?: string;
  readonly queryMode: NonNullable<EntityQueryDefinitionRecord["queryMode"]>;
  readonly parameters: readonly EntityQueryParameterEditorRow[];
  readonly filter: EntityQueryFilterEditorGroup;
  readonly sort: readonly EntityQuerySortEditorRow[];
  readonly select: readonly string[];
  readonly groupBy: readonly string[];
  readonly aggregations: readonly EntityQueryAggregationEditorRow[];
  readonly groupSort: readonly EntityQuerySortEditorRow[];
  readonly groupLimit?: number;
  readonly limitMode: EntityQueryDefinitionRecord["limitMode"];
  readonly limit: number;
  readonly status: EntityQueryDefinitionRecord["status"];
}

export function importEntityQueryFormState(
  data: EntityQueryDefinitionFormData,
): EntityQueryFormStateImportResult {
  return {
    ...(data.description !== undefined
      ? { description: data.description }
      : {}),
    queryMode: data.queryMode ?? "records",
    parameters: entityQueryParametersToEditorRows(data.parameters ?? []),
    filter: entityQueryFilterRootToEditor(data.filter, data.parameters),
    sort: entityQuerySortToEditorRows(data.sort),
    select: data.select ? [...data.select] : [],
    groupBy: data.groupBy ? [...data.groupBy] : [],
    aggregations: entityQueryAggregationsToEditorRows(data.aggregations ?? []),
    groupSort: entityQuerySortToEditorRows(data.groupSort ?? []),
    groupLimit: data.groupLimit,
    limitMode: data.limitMode,
    limit: data.limit ?? 20,
    status: data.status,
  };
}
