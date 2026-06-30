import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  getEntityQueryDefinition,
  type EntityQueryDefinitionRecord,
} from "../../lib/api-client";
import { executeEntityQueryDefinition } from "./execute-entity-query-definition";

interface QueryViewerResults {
  readonly definition: EntityQueryDefinitionRecord;
  readonly items: readonly Record<string, unknown>[];
}

export async function loadQueryViewerResults(
  queryId: string,
  catalogItems: readonly EntityCatalogEntry[],
): Promise<QueryViewerResults> {
  const definition = await getEntityQueryDefinition(queryId);
  const items = await executeEntityQueryDefinition(definition, catalogItems);
  return { definition, items };
}
