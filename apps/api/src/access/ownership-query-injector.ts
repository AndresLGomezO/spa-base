import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import type {
  Filter,
  QueryContext,
  RbacQueryInjector,
} from "@repo/query-engine";
import { QueryError, QueryErrorCode } from "@repo/query-engine";

import { canReadRecord, shouldBypassOwnershipFilter } from "./record-access.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export interface EntityDefinitionResolver {
  getEntityDefinition(
    name: string,
    tenantId: string,
  ): AnyDefinedEntity | undefined;
}

function toRecordAccessContext(context: QueryContext) {
  return {
    userId: context.userId,
    permissions: context.permissions,
    ...(context.isSuperAdmin ? { isSuperAdmin: true } : {}),
  };
}

function resolveEntityConfig(entity: AnyDefinedEntity | undefined) {
  return entity?.metadata.tenantWideRead ? { tenantWideRead: true } : undefined;
}

export function createOwnershipQueryInjector(
  resolver: EntityDefinitionResolver,
): RbacQueryInjector {
  return {
    injectFilters(entityName, context) {
      const entity = resolver.getEntityDefinition(entityName, context.tenantId);
      if (
        shouldBypassOwnershipFilter(
          entityName,
          toRecordAccessContext(context),
          resolveEntityConfig(entity),
        )
      ) {
        return [];
      }

      const filter: Filter = {
        field: "accessUserIds",
        operator: "array-contains",
        value: context.userId,
      };
      return [filter];
    },
  };
}

export function createRecordAccessChecker(resolver: EntityDefinitionResolver) {
  return {
    assertCanRead(
      entityName: string,
      record: Record<string, unknown>,
      context: QueryContext,
    ): void {
      const entity = resolver.getEntityDefinition(entityName, context.tenantId);
      if (
        !canReadRecord(
          record,
          entityName,
          toRecordAccessContext(context),
          resolveEntityConfig(entity),
        )
      ) {
        throw new QueryError(QueryErrorCode.NOT_FOUND, "Record not found.");
      }
    },
  };
}
