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
  emitAggregationEventIfNeeded,
  type AggregationEmitterDeps,
} from "@repo/aggregation-engine";
import {
  createHookEntityAccessControl,
  getAllKnownPermissions,
  isPlatformSuperAdmin,
  resolvePermissions,
} from "@repo/rbac";

import type { DataHookExecutionRepository } from "@repo/firestore-converters";
import type { HookLogMessageRepository } from "@repo/firestore-converters";
import type {
  PushTokenRepository,
  UserNotificationRepository,
} from "@repo/firestore-converters";
import type { DataHookJobPayload, DataHookWebhookRequest } from "@repo/hooks";
import type { FormulaRuntimeContext } from "@repo/formula-definitions/runtime";
import type { FormulaResolver } from "@repo/hooks";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";
import { createSendUserNotificationWithPush } from "@repo/gcp-firebase";

import type { WorkerHookEntityRuntime } from "./worker-hook-entity-runtime.js";
import type { WorkerPermissionDeps } from "./worker-permission-deps.js";
import type { HookRuntimeContext } from "./worker-hook-runtime-context.js";
import {
  createDataHookExecutionRecorderForTenant,
  createRecordDataHookExecution,
} from "./record-data-hook-execution.js";

export interface WorkerCrudHookDeps {
  readonly hookRuntime: HookRuntimeContext;
  readonly formulaRuntime: FormulaRuntimeContext;
  readonly entityRuntime: WorkerHookEntityRuntime;
  readonly permissionDeps: WorkerPermissionDeps;
  readonly hookExecutionRepository?: DataHookExecutionRepository;
  readonly hookLogMessageRepository?: HookLogMessageRepository;
  readonly userNotificationRepository?: UserNotificationRepository;
  readonly pushTokenRepository?: PushTokenRepository;
  readonly firebaseAdminConfig?: FirebaseAdminConfig;
  readonly callWebhook?: (request: DataHookWebhookRequest) => Promise<void>;
  readonly callAi?: (
    request: import("@repo/hooks").DataHookAiRequest,
  ) => Promise<Record<string, unknown>>;
  readonly computeEmbedding?: (
    request: import("@repo/hooks").DataHookEmbeddingRequest,
  ) => Promise<readonly number[]>;
  readonly computeRecordAiSummary?: (
    request: import("@repo/hooks").DataHookRecordAiSummaryRequest,
  ) => Promise<import("@repo/hooks").DataHookRecordAiSummaryResult | null>;
  readonly upsertAiRecordContext?: (
    request: import("@repo/hooks").DataHookUpsertAiRecordContextRequest,
  ) => Promise<
    import("@repo/hooks").DataHookUpsertAiRecordContextResult | null
  >;
  readonly enqueueAiRecordNarrative?: (
    request: import("@repo/hooks").DataHookEnqueueAiRecordNarrativeRequest,
  ) => Promise<{ readonly ok: true } | null>;
  readonly invalidateAiRecordNarratives?: (
    request: import("@repo/hooks").DataHookInvalidateAiRecordNarrativesRequest,
  ) => Promise<{ readonly ok: true } | null>;
  readonly refreshNarrative?: import("../services/record-narrative-refresh-processor.js").RecordNarrativeRefreshProcessor;
  readonly aiRecordSummaryRepository?: import("@repo/firestore-converters").AiRecordSummaryRepository;
  readonly aggregation?: AggregationEmitterDeps;
  readonly aiController?: import("@repo/ai-engine/controller").AiController;
  /** Shared Vertex CachedContent deps for classify `callAi` / batch. */
  readonly callAiCache?: {
    readonly cacheClient?: import("@repo/ai-engine/grounded-chat").VertexCachedContentClient;
    readonly cacheRepository?: import("@repo/firestore-converters/data-hook-ai-cache").DataHookAiCacheRepository;
    readonly isDataHookAiCacheEnabled?: () => boolean | Promise<boolean>;
  };
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
  readonly callAi?: (
    request: import("@repo/hooks").DataHookAiRequest,
  ) => Promise<Record<string, unknown>>;
  readonly computeEmbedding?: (
    request: import("@repo/hooks").DataHookEmbeddingRequest,
  ) => Promise<readonly number[]>;
  readonly computeRecordAiSummary?: (
    request: import("@repo/hooks").DataHookRecordAiSummaryRequest,
  ) => Promise<import("@repo/hooks").DataHookRecordAiSummaryResult | null>;
  readonly upsertAiRecordContext?: (
    request: import("@repo/hooks").DataHookUpsertAiRecordContextRequest,
  ) => Promise<
    import("@repo/hooks").DataHookUpsertAiRecordContextResult | null
  >;
  readonly enqueueAiRecordNarrative?: (
    request: import("@repo/hooks").DataHookEnqueueAiRecordNarrativeRequest,
  ) => Promise<{ readonly ok: true } | null>;
  readonly invalidateAiRecordNarratives?: (
    request: import("@repo/hooks").DataHookInvalidateAiRecordNarrativesRequest,
  ) => Promise<{ readonly ok: true } | null>;
  readonly sendUserNotification?: (
    input: import("@repo/firestore-converters").CreateUserNotificationInput,
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
      ...(options.callAi ? { callAi: options.callAi } : {}),
      ...(options.computeEmbedding
        ? { computeEmbedding: options.computeEmbedding }
        : {}),
      ...(options.computeRecordAiSummary
        ? { computeRecordAiSummary: options.computeRecordAiSummary }
        : {}),
      ...(options.upsertAiRecordContext
        ? { upsertAiRecordContext: options.upsertAiRecordContext }
        : {}),
      ...(options.enqueueAiRecordNarrative
        ? { enqueueAiRecordNarrative: options.enqueueAiRecordNarrative }
        : {}),
      ...(options.invalidateAiRecordNarratives
        ? { invalidateAiRecordNarratives: options.invalidateAiRecordNarratives }
        : {}),
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
              logger.error(
                "Failed to emit aggregation event after hook write",
                {
                  err: error,
                  entityName: input.entityName,
                  tenantId: input.tenantId,
                  operation: input.operation,
                  documentId: input.documentId,
                },
              );
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
        ...(recordDataHookExecution ? { recordDataHookExecution } : {}),
        ...(dataHookExecutionRecorder ? { dataHookExecutionRecorder } : {}),
        ...(deps.callWebhook ? { callWebhook: deps.callWebhook } : {}),
        ...(deps.callAi ? { callAi: deps.callAi } : {}),
        ...(deps.computeEmbedding
          ? { computeEmbedding: deps.computeEmbedding }
          : {}),
        ...(deps.computeRecordAiSummary
          ? { computeRecordAiSummary: deps.computeRecordAiSummary }
          : {}),
        ...(deps.upsertAiRecordContext
          ? { upsertAiRecordContext: deps.upsertAiRecordContext }
          : {}),
        ...(deps.enqueueAiRecordNarrative
          ? { enqueueAiRecordNarrative: deps.enqueueAiRecordNarrative }
          : {}),
        ...(deps.invalidateAiRecordNarratives
          ? { invalidateAiRecordNarratives: deps.invalidateAiRecordNarratives }
          : {}),
        ...(deps.userNotificationRepository
          ? {
              sendUserNotification: createSendUserNotificationWithPush({
                userNotificationRepository: deps.userNotificationRepository,
                tenantId: user.tenantId,
                ...(deps.pushTokenRepository
                  ? { pushTokenRepository: deps.pushTokenRepository }
                  : {}),
                ...(deps.firebaseAdminConfig
                  ? { firebaseAdminConfig: deps.firebaseAdminConfig }
                  : {}),
                onPushError: (error) => {
                  logger.error("Failed to deliver web push notification", {
                    err: error,
                    tenantId: user.tenantId,
                    userId: user.uid,
                  });
                },
              }),
            }
          : {}),
        ...(formulaResolver ? { formulaResolver } : {}),
        ...(enqueueDataHookJob ? { enqueueDataHookJob } : {}),
      }),
  });

  return services;
}
