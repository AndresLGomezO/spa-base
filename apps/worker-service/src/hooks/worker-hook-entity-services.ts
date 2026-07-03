import {
  createHookEntityServices,
  executeHooks,
  formatHookEvent,
  type HookEntityServices,
  type HookLogger,
  type HookOperation,
  type HookPhase,
} from "@repo/hooks";
import {
  createHookEntityAccessControl,
  getAllKnownPermissions,
  isPlatformSuperAdmin,
  resolvePermissions,
} from "@repo/rbac";

import type { DataHookExecutionRepository } from "@repo/firestore-converters";
import type { HookLogMessageRepository } from "@repo/firestore-converters";
import type { UserNotificationRepository } from "@repo/firestore-converters";
import type { DataHookJobPayload, DataHookWebhookRequest } from "@repo/hooks";
import type { FormulaRuntimeContext } from "@repo/formula-definitions/runtime";
import type { FormulaResolver } from "@repo/hooks";

import type { WorkerHookEntityRuntime } from "./worker-hook-entity-runtime.js";
import type { WorkerPermissionDeps } from "./worker-permission-deps.js";
import type { HookRuntimeContext } from "./worker-hook-runtime-context.js";
import {
  createDataHookExecutionRecorderForTenant,
  createRecordDataHookExecution,
} from "./record-data-hook-execution.js";
import { createSendUserNotification } from "../notifications/create-send-user-notification.js";

export interface WorkerCrudHookDeps {
  readonly hookRuntime: HookRuntimeContext;
  readonly formulaRuntime: FormulaRuntimeContext;
  readonly entityRuntime: WorkerHookEntityRuntime;
  readonly permissionDeps: WorkerPermissionDeps;
  readonly hookExecutionRepository?: DataHookExecutionRepository;
  readonly hookLogMessageRepository?: HookLogMessageRepository;
  readonly userNotificationRepository?: UserNotificationRepository;
  readonly callWebhook?: (request: DataHookWebhookRequest) => Promise<void>;
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
  options?: {
    readonly getKnownPermissions?: (tenantId: string) => readonly string[];
  },
): Promise<ResolvedHookUserContext> {
  const [profile, roleCatalog, knownPermissions] = await Promise.all([
    permissionDeps.getUserAccessProfile(uid),
    permissionDeps.getRoleCatalog(tenantId),
    options?.getKnownPermissions
      ? Promise.resolve(options.getKnownPermissions(tenantId))
      : getTenantKnownPermissions(tenantId),
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
  readonly phase: HookPhase;
  readonly operation: HookOperation;
  readonly current: Record<string, unknown>;
  readonly previous?: Record<string, unknown>;
  readonly depth: number;
  readonly visitedHookIds: ReadonlySet<string>;
  readonly user: { readonly uid: string };
  readonly logger: HookLogger;
  readonly entityServices: HookEntityServices;
  readonly recordDataHookExecution?: (
    entry: import("@repo/hooks").CreateDataHookExecutionInput,
  ) => Promise<void>;
  readonly dataHookExecutionRecorder?: import("@repo/hooks").DataHookExecutionRecorder;
  readonly callWebhook?: (
    request: import("@repo/hooks").DataHookWebhookRequest,
  ) => Promise<void>;
  readonly sendUserNotification?: (
    input: import("@repo/user-notifications").CreateUserNotificationInput,
  ) => Promise<void>;
  readonly enqueueDataHookJob?: (payload: DataHookJobPayload) => Promise<void>;
  readonly formulaResolver?: FormulaResolver;
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
    ...(options.formulaResolver
      ? { formulaResolver: options.formulaResolver }
      : {}),
    services: {
      logger: options.logger,
      entities: options.entityServices,
      ...(options.recordDataHookExecution
        ? { recordDataHookExecution: options.recordDataHookExecution }
        : {}),
      ...(options.dataHookExecutionRecorder
        ? { dataHookExecutionRecorder: options.dataHookExecutionRecorder }
        : {}),
      ...(options.callWebhook ? { callWebhook: options.callWebhook } : {}),
      ...(options.sendUserNotification
        ? { sendUserNotification: options.sendUserNotification }
        : {}),
      ...(options.enqueueDataHookJob
        ? { enqueueDataHookJob: options.enqueueDataHookJob }
        : {}),
    },
  };

  await executeHooks(event, hookContext);
  return hookContext.current;
}

export function buildHookEntityServices(options: {
  readonly user: ResolvedHookUserContext;
  readonly deps: WorkerCrudHookDeps;
  readonly logger: HookLogger;
  readonly formulaResolver?: FormulaResolver;
  readonly enqueueDataHookJob?: (payload: DataHookJobPayload) => Promise<void>;
}): HookEntityServices {
  const { user, deps, logger, formulaResolver, enqueueDataHookJob } = options;
  const recordDataHookExecution = deps.hookExecutionRepository
    ? createRecordDataHookExecution(deps.hookExecutionRepository, user.tenantId)
    : undefined;
  const dataHookExecutionRecorder = deps.hookExecutionRepository
    ? createDataHookExecutionRecorderForTenant(
        deps.hookExecutionRepository,
        user.tenantId,
      )
    : undefined;

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
        ...(recordDataHookExecution ? { recordDataHookExecution } : {}),
        ...(dataHookExecutionRecorder ? { dataHookExecutionRecorder } : {}),
        ...(deps.callWebhook ? { callWebhook: deps.callWebhook } : {}),
        ...(deps.userNotificationRepository
          ? {
              sendUserNotification: createSendUserNotification(
                deps.userNotificationRepository,
                user.tenantId,
              ),
            }
          : {}),
        ...(formulaResolver ? { formulaResolver } : {}),
        ...(enqueueDataHookJob ? { enqueueDataHookJob } : {}),
      }),
  });

  return services;
}
