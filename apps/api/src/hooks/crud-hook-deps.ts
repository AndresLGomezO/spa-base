import type { FastifyInstance, FastifyRequest } from "fastify";
import type { HookEntityServices } from "@repo/hooks";

import { loadRequestPermissions } from "../rbac/load-request-permissions.js";
import { buildHookEntityServices } from "./hook-entity-services-factory.js";
import { createTenantHookLogger } from "./create-tenant-hook-logger.js";
import type { CrudHookDeps } from "./crud-hook-deps.types.js";

export async function resolveCrudHookEntityServices(
  app: FastifyInstance,
  request: FastifyRequest,
  tenantId: string,
  deps: CrudHookDeps,
): Promise<HookEntityServices> {
  await deps.hookRuntime.ensureTenantHooksLoaded(tenantId);
  const ctx = await loadRequestPermissions(request, deps.permissionDeps);
  const formulaResolver = await deps.formulaRuntime.getFormulaResolver(tenantId);

  return buildHookEntityServices({
    user: {
      tenantId,
      uid: ctx.uid,
      permissions: ctx.permissions ?? [],
      isSuperAdmin: ctx.isSuperAdmin ?? false,
      roleCatalog: ctx.roleCatalog ?? {},
      knownPermissions: ctx.knownPermissions ?? [],
      platformRole: ctx.platformRole ?? null,
      tenantRoleNames: ctx.tenantRoleNames ?? [],
    },
    deps,
    formulaResolver,
    logger: createTenantHookLogger(
      app,
      tenantId,
      deps.hookLogMessageRepository,
    ),
  });
}
