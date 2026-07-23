import type { HookEntityServices, HookLogger } from "@repo/hooks";
import type { FormulaResolver } from "@repo/hooks";

import { emitAggregationEventIfNeeded } from "../aggregation/emit-aggregation-event.js";
import {
  createHookEntityAccessControl,
  createHookEntityServices,
} from "./create-hook-services.js";
import type { CrudHookDeps } from "./crud-hook-deps.types.js";
import { dispatchChainedEntityHooks } from "./dispatch-chained-entity-hooks.js";
import {
  createRecordDataHookExecution,
  createDataHookExecutionRecorderForTenant,
} from "./record-data-hook-execution.js";
import { createSendUserNotification } from "../notifications/create-send-user-notification.js";

interface ResolvedHookUserContext {
  readonly tenantId: string;
  readonly uid: string;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly roleCatalog: Awaited<
    ReturnType<CrudHookDeps["permissionDeps"]["getRoleCatalog"]>
  >;
  readonly knownPermissions: readonly string[];
  readonly platformRole: string | null;
  readonly tenantRoleNames: readonly string[];
}

export function buildHookEntityServices(options: {
  readonly user: ResolvedHookUserContext;
  readonly deps: CrudHookDeps;
  readonly logger: HookLogger;
  readonly formulaResolver?: FormulaResolver;
}): HookEntityServices {
  const { user, deps, logger, formulaResolver } = options;

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
    ...(deps.aggregation
      ? {
          onRecordMutated: async (input) => {
            try {
              await emitAggregationEventIfNeeded(deps.aggregation!, {
                tenantId: input.tenantId,
                entityName: input.entityName,
                operation: input.operation,
                documentId: input.documentId,
                before: input.before,
                after: input.after,
                businessFieldNames: input.businessFieldNames,
              });
            } catch (error) {
              logger.error("Failed to emit aggregation event after hook write", {
                err: error,
                entityName: input.entityName,
                tenantId: input.tenantId,
                operation: input.operation,
                documentId: input.documentId,
              });
            }
          },
        }
      : {}),
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
        ...(deps.enqueueDataHookJob
          ? { enqueueDataHookJob: deps.enqueueDataHookJob }
          : {}),
        ...(deps.hookExecutionRepository
          ? {
              recordDataHookExecution: createRecordDataHookExecution(
                deps.hookExecutionRepository,
                user.tenantId,
              ),
              dataHookExecutionRecorder:
                createDataHookExecutionRecorderForTenant(
                  deps.hookExecutionRepository,
                  user.tenantId,
                ),
            }
          : {}),
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
      }),
  });

  return services;
}
