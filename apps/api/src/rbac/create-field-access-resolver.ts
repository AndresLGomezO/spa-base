import {
  assertWritableFields,
  FieldAccessError,
  filterFields,
  resolveFieldAccessMap,
  type FieldAccess,
} from "@repo/rbac";

import type { RequestContext } from "../auth/request-context.js";

function buildFieldAccessInput(ctx: RequestContext) {
  const tenantId = ctx.tenantId.trim();
  return {
    platformRole: ctx.platformRole ?? null,
    tenants:
      ctx.tenantRoleNames && ctx.tenantRoleNames.length > 0
        ? { [tenantId]: ctx.tenantRoleNames }
        : {},
    tenantId,
  };
}

export function resolveRequestFieldAccessMap(
  ctx: RequestContext,
  entityName: string,
  entityFieldNames: readonly string[],
  action: "read" | "create" | "update",
): Record<string, FieldAccess> {
  if (ctx.isSuperAdmin) {
    const map: Record<string, FieldAccess> = {};
    for (const field of entityFieldNames) {
      map[field] = "write";
    }
    return map;
  }

  if (!ctx.roleCatalog) {
    return {};
  }

  return resolveFieldAccessMap(
    buildFieldAccessInput(ctx),
    entityName,
    entityFieldNames,
    {
      roleCatalog: ctx.roleCatalog,
      knownPermissions: ctx.knownPermissions,
      action,
    },
  );
}

export function applyReadFieldFilter<T extends Record<string, unknown>>(
  record: T,
  ctx: RequestContext,
  entityName: string,
  entityFieldNames: readonly string[],
): T {
  if (ctx.isSuperAdmin) {
    return record;
  }

  const fieldAccessMap = resolveRequestFieldAccessMap(
    ctx,
    entityName,
    entityFieldNames,
    "read",
  );

  return filterFields(record, fieldAccessMap, entityFieldNames);
}

export function assertRequestWritableFields(
  data: Readonly<Record<string, unknown>>,
  ctx: RequestContext,
  entityName: string,
  entityFieldNames: readonly string[],
  action: "create" | "update",
): void {
  if (ctx.isSuperAdmin) {
    return;
  }

  const fieldAccessMap = resolveRequestFieldAccessMap(
    ctx,
    entityName,
    entityFieldNames,
    action,
  );
  assertWritableFields(data, fieldAccessMap, entityFieldNames);
}

export { FieldAccessError };
