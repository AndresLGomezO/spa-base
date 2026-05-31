import { hasPermission } from "@repo/rbac";

import { QueryError, QueryErrorCode } from "./errors.js";
import type { Filter, QueryContext, RbacQueryInjector } from "./types.js";

const defaultRbacQueryInjector: RbacQueryInjector = {
  injectFilters() {
    return [];
  },
};

export function assertQueryReadPermission(
  entityName: string,
  context: QueryContext,
): void {
  if (context.isSuperAdmin) {
    return;
  }

  const readPermission = `${entityName}.read`;
  const readAllPermission = `${entityName}.read_all`;
  if (
    !hasPermission(readPermission, [...context.permissions]) &&
    !hasPermission(readAllPermission, [...context.permissions])
  ) {
    throw new QueryError(
      QueryErrorCode.QUERY_FORBIDDEN,
      `Missing permission: ${readPermission}`,
    );
  }
}

export function applyRbacFilters(
  entityName: string,
  context: QueryContext,
  injector: RbacQueryInjector = defaultRbacQueryInjector,
): readonly Filter[] {
  assertQueryReadPermission(entityName, context);
  return injector.injectFilters(entityName, context);
}

export type { RbacQueryInjector };
