import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import type { EntityQueryExecutor } from "@repo/firestore-converters";
import { createQueryEngine, type QueryEngine } from "@repo/query-engine";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

interface TenantEntityResolver {
  getEntityDefinition(
    name: string,
    tenantId: string,
  ): AnyDefinedEntity | undefined;
  getQueryExecutor(
    tenantId: string,
    entityName: string,
  ): EntityQueryExecutor | undefined;
}

interface EntityQueryRuntimeContext {
  readonly queryEngine: QueryEngine;
  readonly executorsByEntityName: Readonly<
    Record<string, EntityQueryExecutor | undefined>
  >;
}

export function createQueryRuntimeContext(
  resolver: TenantEntityResolver,
  executorsByEntityName: Record<string, EntityQueryExecutor>,
): EntityQueryRuntimeContext {
  return {
    queryEngine: createQueryEngine({
      getEntityDefinition: (name, context) =>
        resolver.getEntityDefinition(name, context.tenantId),
      getExecutor: (entityName, context) =>
        resolver.getQueryExecutor(context.tenantId, entityName) ??
        executorsByEntityName[entityName],
    }),
    executorsByEntityName,
  };
}
