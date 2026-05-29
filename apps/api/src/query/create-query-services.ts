import { getAllEntities } from "@repo/entities";
import type { EntityQueryExecutor } from "@repo/firestore-converters";
import { createQueryEngine, type QueryEngine } from "@repo/query-engine";

export interface EntityQueryRuntimeContext {
  readonly queryEngine: QueryEngine;
  readonly executorsByEntityName: Readonly<
    Record<string, EntityQueryExecutor | undefined>
  >;
}

export function createQueryRuntimeContext(
  executorsByEntityName: Record<string, EntityQueryExecutor>,
): EntityQueryRuntimeContext {
  return {
    queryEngine: createQueryEngine({
      getEntityDefinition: (name) =>
        getAllEntities().find((entity) => entity.name === name),
      getExecutor: (entityName) => executorsByEntityName[entityName],
    }),
    executorsByEntityName,
  };
}
