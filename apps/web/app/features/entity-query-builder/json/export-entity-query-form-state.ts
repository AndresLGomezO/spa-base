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
import type { EntityQueryDefinitionRecord } from "../../../lib/api-client";

export interface EntityQueryFormStateExportInput {
  readonly name: string;
  readonly description?: string;
  readonly sourceEntity: string;
  readonly filter: EntityQueryFilterEditorGroup;
  readonly sort: readonly EntityQuerySortEditorRow[];
  readonly select: readonly string[];
  readonly limitMode: EntityQueryDefinitionRecord["limitMode"];
  readonly limit: number;
  readonly status: EntityQueryDefinitionRecord["status"];
}

export function exportEntityQueryFormState(
  input: EntityQueryFormStateExportInput,
): EntityQueryDefinitionFormData {
  return createEntityQueryDefinitionInputSchema.parse({
    name: input.name.trim(),
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    sourceEntity: input.sourceEntity,
    filter: editorRootToEntityQueryFilter(input.filter),
    sort: editorRowsToEntityQuerySort(input.sort),
    ...(input.select.length > 0 ? { select: [...input.select] } : {}),
    limitMode: input.limitMode,
    ...(input.limitMode === "topN" ? { limit: input.limit } : {}),
    status: input.status,
  });
}

export interface EntityQueryFormStateImportResult {
  readonly description?: string;
  readonly filter: EntityQueryFilterEditorGroup;
  readonly sort: readonly EntityQuerySortEditorRow[];
  readonly select: readonly string[];
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
    filter: entityQueryFilterRootToEditor(data.filter, data.parameters),
    sort: entityQuerySortToEditorRows(data.sort),
    select: data.select ? [...data.select] : [],
    limitMode: data.limitMode,
    limit: data.limit ?? 20,
    status: data.status,
  };
}
