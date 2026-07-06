import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  getEntityQueryDefinition,
  listEntityQueryDefinitions,
  type EntityQueryDefinitionRecord,
} from "../../lib/api-client";
import { resolveEntityQueryDefinitionDocumentId } from "../../lib/resolve-entity-query-definition-reference";
import { executeEntityQueryDefinition } from "./execute-entity-query-definition";

interface QueryViewerResults {
  readonly definition: EntityQueryDefinitionRecord;
  readonly items: readonly Record<string, unknown>[];
}

export async function loadQueryViewerResults(
  queryId: string,
  catalogItems: readonly EntityCatalogEntry[],
  options: {
    readonly parameterBindings?: Readonly<
      Record<string, import("@repo/entities").FilterBindingSource>
    >;
    readonly context?: import("../../lib/metric-binding-resolution.js").PageFilterContext;
  } = {},
): Promise<QueryViewerResults> {
  const definitions = await listEntityQueryDefinitions();
  const resolvedId =
    resolveEntityQueryDefinitionDocumentId(queryId, definitions.items) ??
    queryId.trim();
  const definition = await getEntityQueryDefinition(resolvedId);
  const items = await executeEntityQueryDefinition(
    definition,
    catalogItems,
    options,
  );
  return { definition, items };
}
