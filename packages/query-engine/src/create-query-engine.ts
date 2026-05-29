import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import type { EntityQueryExecutor } from "@repo/firestore-converters";

import { applyRbacFilters } from "./apply-query-security.js";
import { QueryError, QueryErrorCode } from "./errors.js";
import { applySelectProjection } from "./format-results.js";
import { normalizeEntityQuery } from "./parse-query-config.js";
import type {
  QueryConfig,
  QueryContext,
  QueryResult,
  RbacQueryInjector,
  RelationIncludeResolver,
} from "./types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export interface QueryEngineDeps {
  readonly getEntityDefinition: (name: string) => AnyDefinedEntity | undefined;
  readonly getExecutor: (entityName: string) => EntityQueryExecutor | undefined;
  readonly rbacQueryInjector?: RbacQueryInjector;
  readonly relationIncludeResolver?: RelationIncludeResolver;
}

export interface QueryEngine {
  find(
    entityName: string,
    queryConfig: QueryConfig,
    context: QueryContext,
  ): Promise<QueryResult>;
  findOne(
    entityName: string,
    id: string,
    context: QueryContext,
    select?: readonly string[],
  ): Promise<Record<string, unknown>>;
}

export function createQueryEngine(deps: QueryEngineDeps): QueryEngine {
  const rbacQueryInjector = deps.rbacQueryInjector;

  function resolveEntity(entityName: string): AnyDefinedEntity {
    const entity = deps.getEntityDefinition(entityName);
    if (!entity) {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        `Unknown entity "${entityName}".`,
      );
    }
    return entity;
  }

  function resolveExecutor(entityName: string): EntityQueryExecutor {
    const executor = deps.getExecutor(entityName);
    if (!executor) {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        `No query executor registered for entity "${entityName}".`,
      );
    }
    return executor;
  }

  return {
    async find(entityName, queryConfig, context) {
      const entity = resolveEntity(entityName);
      const executor = resolveExecutor(entityName);

      const injectedFilters = applyRbacFilters(
        entityName,
        context,
        rbacQueryInjector,
      );
      const mergedConfig: QueryConfig = {
        ...queryConfig,
        filter: [...(queryConfig.filter ?? []), ...injectedFilters],
      };

      const normalizedQuery = normalizeEntityQuery(entity, mergedConfig);
      const result = await executor.executeQuery(
        context.tenantId,
        normalizedQuery,
      );
      const data = applySelectProjection(result.items, normalizedQuery.select);

      return {
        data,
        ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
      };
    },

    async findOne(entityName, id, context, select) {
      const entity = resolveEntity(entityName);
      const executor = resolveExecutor(entityName);

      applyRbacFilters(entityName, context, rbacQueryInjector);

      const parsedId = id.trim();
      if (!parsedId) {
        throw new QueryError(
          QueryErrorCode.QUERY_VALIDATION_ERROR,
          "Record id is required.",
        );
      }

      const record = await executor.findById(parsedId, context.tenantId);
      if (!record) {
        throw new QueryError(QueryErrorCode.NOT_FOUND, "Record not found.");
      }

      if (select && select.length > 0) {
        normalizeEntityQuery(entity, { select: [...select] });
      }

      const [projected] = applySelectProjection([record], select);
      return projected ?? record;
    },
  };
}

export type { RelationIncludeResolver };
