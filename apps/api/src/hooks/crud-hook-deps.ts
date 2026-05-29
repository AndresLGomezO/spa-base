import type { FastifyRequest } from "fastify";
import type { HookEntityServices } from "@repo/hooks";

import { createHookEntityServices } from "../hooks/create-hook-services.js";
import { loadRequestPermissions } from "../rbac/load-request-permissions.js";
import type { CrudHookDeps } from "./crud-hook-deps.types.js";

export async function resolveCrudHookEntityServices(
  request: FastifyRequest,
  tenantId: string,
  deps: CrudHookDeps,
): Promise<HookEntityServices> {
  await deps.hookRuntime.ensureTenantHooksLoaded(tenantId);
  const ctx = await loadRequestPermissions(request, deps.permissionDeps);

  return createHookEntityServices({
    entityRuntime: deps.entityRuntime,
    permissions: ctx.permissions ?? [],
    isSuperAdmin: ctx.isSuperAdmin ?? false,
    tenantId,
    roleCatalog: ctx.roleCatalog,
    platformRole: ctx.platformRole,
    tenantRoleNames: ctx.tenantRoleNames,
  });
}
