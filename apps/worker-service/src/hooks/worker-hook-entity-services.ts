import {
  createHookEntityServices,
  executeHooks,
  formatHookEvent,
  type HookEntityServices,
  type HookLogger,
} from "@repo/hooks";
import {
  createHookEntityAccessControl,
  getAllKnownPermissions,
  isPlatformSuperAdmin,
  resolvePermissions,
} from "@repo/rbac";

import type { WorkerHookEntityRuntime } from "./worker-hook-entity-runtime.js";
import type { WorkerPermissionDeps } from "./worker-permission-deps.js";
import type { HookRuntimeContext } from "./worker-hook-runtime-context.js";

export interface WorkerCrudHookDeps {
  readonly hookRuntime: HookRuntimeContext;
  readonly entityRuntime: WorkerHookEntityRuntime;
  readonly permissionDeps: WorkerPermissionDeps;
}

export interface ResolvedHookUserContext {
  readonly tenantId: string;
  readonly uid: string;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly roleCatalog: Awaited<
    ReturnType<WorkerPermissionDeps["getRoleCatalog"]>
  >;
  readonly knownPermissions: readonly string[];
  readonly platformRole: string | null;
  readonly tenantRoleNames: readonly string[];
}

async function getTenantKnownPermissions(
  tenantId: string,
): Promise<readonly string[]> {
  return getAllKnownPermissions(tenantId);
}

export async function resolveHookUserContext(
  tenantId: string,
  uid: string,
  permissionDeps: WorkerPermissionDeps,
): Promise<ResolvedHookUserContext> {
  const [profile, roleCatalog, knownPermissions] = await Promise.all([
    permissionDeps.getUserAccessProfile(uid),
    permissionDeps.getRoleCatalog(tenantId),
    getTenantKnownPermissions(tenantId),
  ]);

  const accessProfile = profile ?? {
    platformRole: null,
    tenants: {},
  };
  const isSuperAdmin = isPlatformSuperAdmin(accessProfile.platformRole);
  const permissions = resolvePermissions(
    {
      ...accessProfile,
      tenantId,
    },
    { roleCatalog, knownPermissions },
  );

  return {
    tenantId,
    uid,
    permissions,
    isSuperAdmin,
    roleCatalog,
    knownPermissions,
    platformRole: accessProfile.platformRole ?? null,
    tenantRoleNames: accessProfile.tenants?.[tenantId] ?? [],
  };
}

async function dispatchChainedEntityHooks(options: {
  readonly tenantId: string;
  readonly entityName: string;
  readonly phase: "before" | "after";
  readonly operation: "create" | "update" | "delete";
  readonly current: Record<string, unknown>;
  readonly previous?: Record<string, unknown>;
  readonly depth: number;
  readonly visitedHookIds: ReadonlySet<string>;
  readonly user: { readonly uid: string };
  readonly logger: HookLogger;
  readonly entityServices: HookEntityServices;
}): Promise<Record<string, unknown>> {
  const event = formatHookEvent({
    entity: options.entityName,
    phase: options.phase,
    operation: options.operation,
  });

  const hookContext = {
    tenantId: options.tenantId,
    entityName: options.entityName,
    event,
    current: { ...options.current },
    ...(options.previous ? { previous: { ...options.previous } } : {}),
    user: options.user,
    depth: options.depth,
    visitedHookIds: options.visitedHookIds,
    services: {
      logger: options.logger,
      entities: options.entityServices,
    },
  };

  await executeHooks(event, hookContext);
  return hookContext.current;
}

export function buildHookEntityServices(options: {
  readonly user: ResolvedHookUserContext;
  readonly deps: WorkerCrudHookDeps;
  readonly logger: HookLogger;
}): HookEntityServices {
  const { user, deps, logger } = options;

  const services = createHookEntityServices({
    entityRuntime: deps.entityRuntime,
    accessControl: createHookEntityAccessControl({
      permissions: user.permissions,
      isSuperAdmin: user.isSuperAdmin,
      tenantId: user.tenantId,
      roleCatalog: user.roleCatalog,
      knownPermissions: user.knownPermissions,
      platformRole: user.platformRole,
      tenantRoleNames: user.tenantRoleNames,
    }),
    tenantId: user.tenantId,
    ownerUserId: user.uid,
    dispatchChainedHooks: (params) =>
      dispatchChainedEntityHooks({
        tenantId: user.tenantId,
        entityName: params.entityName,
        phase: params.phase,
        operation: params.operation,
        current: params.current,
        ...(params.previous ? { previous: params.previous } : {}),
        depth: params.depth,
        visitedHookIds: params.visitedHookIds,
        user: { uid: user.uid },
        logger,
        entityServices: services,
      }),
  });

  return services;
}
