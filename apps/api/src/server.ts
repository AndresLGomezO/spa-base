import cors from "@fastify/cors";
import compress from "@fastify/compress";
import rateLimit from "@fastify/rate-limit";

import { isRateLimitExemptRequest } from "./rate-limit-allowlist.js";
import Fastify from "fastify";

import { getAllEntities, prepareRecordSearchFields } from "@repo/entities";
import { computeIndexSignature } from "@repo/firestore-indexes";
import type {
  EntityCategoryRepository,
  EntityDefinitionRepository,
  EntityQueryExecutor,
  EntityUiOverrideRepository,
  TenantDashboardLayoutRepository,
  TenantSidebarLayoutRepository,
  UiBuilderPresetRepository,
  AggregationEventRepository,
  BackfillJobRepository,
  AiJobRepository,
  AiChatSessionRepository,
  AiContextSectionRepository,
  AiRecordSummaryRepository,
  AiSpendRepository,
  TenantAiContextRepository,
  UserAiMemoryRepository,
  UiBuilderAiSuggestionRepository,
  DataHookRepository,
  DataHookExecutionRepository,
  HookLogMessageRepository,
  UserNotificationRepository,
  PushTokenRepository,
  RequestPerfLogRepository,
  AuditLogRepository,
  JoinCollectionRepository,
  MetricContributionRepository,
  MetricDefinitionRepository,
  FormulaDefinitionRepository,
  MetricValueRepository,
  EntityQueryDefinitionRepository,
  ChartDefinitionRepository,
  CustomViewRepository,
  PlatformRuntimeSettingsRepository,
  TenantDeletionArchiveRepository,
  TenantDeletionJobRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import {
  createInMemoryAggregationEventRepository,
  createInMemoryBackfillJobRepository,
  createInMemoryAiJobRepository,
  createInMemoryAiSpendRepository,
  createInMemoryAiChatSessionRepository,
  createInMemoryAiContextSectionRepository,
  createInMemoryAiRecordSummaryRepository,
  createInMemoryUserAiMemoryRepository,
  createInMemoryUiBuilderAiSuggestionRepository,
  createInMemoryEntityCategoryRepository,
  createInMemoryEntityDefinitionRepository,
  createInMemoryEntityUiOverrideRepository,
  createInMemoryTenantDashboardLayoutRepository,
  createInMemoryTenantSidebarLayoutRepository,
  createInMemoryUiBuilderPresetRepository,
  createInMemoryDataHookRepository,
  createInMemoryDataHookExecutionRepository,
  createInMemoryHookLogMessageRepository,
  createInMemoryUserNotificationRepository,
  createInMemoryPushTokenRepository,
  createInMemoryRequestPerfLogRepository,
  createInMemoryIndexProvisionEventRepository,
  createInMemoryAuditLogRepository,
  createInMemoryPlatformRuntimeSettingsRepository,
  createInMemoryMetricDefinitionRepository,
  createInMemoryFormulaDefinitionRepository,
  createInMemoryEntityQueryDefinitionRepository,
  createInMemoryChartDefinitionRepository,
  createInMemoryCustomViewRepository,
  createInMemoryMetricContributionRepository,
  createInMemoryMetricValueRepository,
  createInMemoryTenantAiContextRepository,
  createInMemoryTenantRoleRepository,
  createInMemoryTenantUserInviteRepository,
  createInMemoryTenantDeletionArchiveRepository,
  createInMemoryTenantDeletionJobRepository,
} from "@repo/firestore-converters";
import {
  createFirestoreAdminAggregationEventRepository,
  createFirestoreAdminBackfillJobRepository,
  createFirestoreAdminAiJobRepository,
  createFirestoreAdminAiSpendRepository,
  createFirestoreAdminAiChatSessionRepository,
  createFirestoreAdminAiContextSectionRepository,
  createFirestoreAdminAiRecordSummaryRepository,
  createFirestoreAdminUserAiMemoryRepository,
  createFirestoreAdminUiBuilderAiSuggestionRepository,
  createFirestoreAdminEntityCategoryRepository,
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminEntityUiOverrideRepository,
  createFirestoreAdminTenantDashboardLayoutRepository,
  createFirestoreAdminTenantSidebarLayoutRepository,
  createFirestoreAdminUiBuilderPresetRepository,
  createFirestoreAdminDataHookRepository,
  createFirestoreAdminDataHookExecutionRepository,
  createFirestoreAdminHookLogMessageRepository,
  createFirestoreAdminUserNotificationRepository,
  createFirestoreAdminPushTokenRepository,
  createFirestoreAdminRequestPerfLogRepository,
  createFirestoreAdminIndexProvisionEventRepository,
  createFirestoreAdminAuditLogRepository,
  createFirestoreAdminPlatformRuntimeSettingsRepository,
  createFirestoreAdminJoinCollectionRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminFormulaDefinitionRepository,
  createFirestoreAdminEntityQueryDefinitionRepository,
  createFirestoreAdminChartDefinitionRepository,
  createFirestoreAdminCustomViewRepository,
  createFirestoreAdminMetricContributionRepository,
  createFirestoreAdminMetricValueRepository,
  createFirestoreAdminPlatformRoleRepository,
  createFirestoreAdminRegisteredUserRepository,
  createFirestoreAdminTenantRoleRepository,
  createFirestoreAdminTenantUserInviteRepository,
  createFirestoreAdminTenantDeletionArchiveRepository,
  createFirestoreAdminTenantDeletionJobRepository,
  createFirestoreAdminTenantRepository,
  createFirestoreAdminTenantAiContextRepository,
  createFirestoreAdminGmailConnectionRepository,
  createFirestoreAdminEmailMatchBindingRepository,
  createFirestoreAdminEmailIngestJobRepository,
  createFirestoreIndexStatusStore,
  configureIndexProvisioningQueue,
} from "@repo/gcp-firebase";
import { createMetricRuntimeContext } from "./aggregation/metric-runtime-context.js";
import {
  createMetricQueryMembershipResolver,
  listSourceDocumentsForMetricDefinition,
} from "./aggregation/metric-query-runtime.js";
import { registerMetricDefinitionRoutes } from "./aggregation/register-metric-definition-routes.js";
import { registerMetricReadRoutes } from "./aggregation/register-metric-read-routes.js";
import { registerEntityQueryDefinitionRoutes } from "./entity-queries/register-entity-query-definition-routes.js";
import { registerChartDefinitionRoutes } from "./chart-definitions/register-chart-definition-routes.js";
import { registerCustomViewRoutes } from "./custom-views/register-custom-view-routes.js";
import type { AggregationEmitterDeps } from "./aggregation/emit-aggregation-event.js";
import { emitAggregationEventIfNeeded } from "./aggregation/emit-aggregation-event.js";
import { type RoleCatalog, type UserAccessProfile } from "@repo/rbac";

import { platformApp } from "@app/platform/app.config.js";
import { bootstrapPlatformApp } from "@app/platform/bootstrap.js";
import { tryLoadLocalTenantConfig } from "./admin/local-tenant-seed/load-tenant-config.js";
import { createAuthenticatePreHandler } from "./auth/authenticate-request.js";
import { apiEnv } from "./config/env.js";
import { createRuntimeSettingsCache } from "@repo/debug-logs";
import { registerRequestTiming } from "./observability/request-timing.js";
import { registerCrudErrorHandler, registerCrudRoutes } from "./crud/index.js";
import { createEntityRuntimeMaps } from "./entities/create-entity-runtime-maps.js";
import {
  createEntityRuntimeContext,
  type EntityRuntimeContext,
} from "./entities/entity-runtime-context.js";
import { registerDynamicEntityCrudRoutes } from "./entities/register-dynamic-entity-crud-routes.js";
import { registerEntityRelationRoutes } from "./entities/register-entity-relation-routes.js";
import { registerEntityRecordsImportExportRoutes } from "./entities/register-entity-records-import-export-routes.js";
import { registerListEntitiesRoute } from "./entities/list-entities.route.js";
import { registerGlobalSearchRoutes } from "./search/register-global-search-routes.js";
import { registerEntityUiOverrideRoutes } from "./entities/register-entity-ui-override-routes.js";
import { registerUiBuilderPresetRoutes } from "./ui-builder-presets/register-ui-builder-preset-routes.js";
import { registerTenantDashboardLayoutRoutes } from "./tenant-dashboard-layout/register-tenant-dashboard-layout-routes.js";
import { registerTenantSidebarLayoutRoutes } from "./tenant-sidebar-layout/register-tenant-sidebar-layout-routes.js";
import { registerEntityCategoryRoutes } from "./entity-categories/register-entity-category-routes.js";
import { registerEntityDefinitionRoutes } from "./entities/register-entity-definition-routes.js";
import { registerIndexRoutes } from "./indexes/register-index-routes.js";
import {
  createIndexProvisionEventWriter,
  indexProvisionEventFromCompositeIndex,
} from "./indexes/index-provision-events.js";
import { createTenantIndexGuard } from "./indexes/create-tenant-index-guard.js";
import type { CrudHookDeps } from "./hooks/crud-hook-deps.types.js";
import { createFormulaRuntimeContext } from "./formulas/formula-runtime-context.js";
import { loadFormulaAdmin } from "./formulas/load-formula-admin.js";
import { createHookRuntimeContext } from "./hooks/hook-runtime-context.js";
import { createHookTasksClient } from "./hooks/hook-tasks.client.js";
import { createTenantDeletionTasksClient } from "./admin/tenant-deletion-tasks.client.js";
import { parseProtectedTenantIds } from "./admin/enqueue-tenant-deletion.js";
import { callDataHookWebhook } from "./hooks/call-data-hook-webhook.js";
import { registerHookRoutes } from "./hooks/register-hook-routes.js";
import { createInMemoryTenantRepository } from "./test/mock-tenant-repository.js";
import { registerAiRoutes } from "./ai/register-ai-routes.js";
import { registerAiContextSectionRoutes } from "./ai-context-sections/register-ai-context-section-routes.js";
import { registerAiRecordSummaryTemplateRoutes } from "./ai-record-summary-templates/register-ai-record-summary-template-routes.js";
import { registerAiRecordSummaryRoutes } from "./ai-record-summaries/register-ai-record-summary-routes.js";
import { registerDebugRoutes } from "./debug/register-debug-routes.js";
import { registerNotificationRoutes } from "./notifications/register-notification-routes.js";
import { registerPushTokenRoutes } from "./notifications/register-push-token-routes.js";
import { registerGmailIngestRoutes } from "./gmail-ingest/register-gmail-ingest-routes.js";
import { createGmailTasksClient } from "./gmail-ingest/gmail-tasks.client.js";
import { registerUiBuilderAiSuggestionRoutes } from "./ai/register-ui-builder-ai-suggestion-routes.js";
import type { SyncTenantAiContextsDeps } from "./ai/sync-tenant-ai-contexts.js";
import { registerRoleRoutes } from "./roles/register-role-routes.js";
import { registerModuleRoutes } from "./modules/register-module-routes.js";
import {
  createEntityPermissionGuards,
  createLoadRequestPermissionsDeps,
  type LoadRequestPermissionsDeps,
} from "./rbac/index.js";
import { createTenantRoleCatalogLoader } from "./rbac/role-catalog.js";
import { createOwnershipQueryInjector } from "./access/ownership-query-injector.js";
import { createShareService } from "./access/share-service.js";
import { registerShareRoutes } from "./access/register-share-routes.js";
import { createAuditLogger } from "./audit/audit-log.js";
import { createEntityFileReadEnricher } from "./entity-files/create-entity-file-read-enricher.js";
import { registerEntityFileRoutes } from "./entity-files/register-entity-file-routes.js";
import { sanitizeFileFieldsForWrite } from "./entity-files/entity-file-field-utils.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { platformRuntimeSettingsRoutes } from "./routes/platform-runtime-settings.routes.js";
import { authSelectTenantRoute } from "./routes/auth-select-tenant.route.js";
import { authValidateRoute } from "./routes/auth-validate.route.js";
import { registerTenantUserRoutes } from "./routes/tenant-users.routes.js";
import { reloadHookCacheRoute } from "./dev/reload-hook-cache.route.js";

type GenericRecord = { readonly id: string; readonly tenantId: string };

interface BuildServerOptions {
  readonly logger?: boolean;
  readonly repositories?: Record<
    string,
    TenantScopedEntityRepository<GenericRecord, unknown>
  >;
  readonly joinRepository?: JoinCollectionRepository;
  readonly queryExecutors?: Record<string, EntityQueryExecutor>;
  readonly entityDefinitionRepository?: EntityDefinitionRepository;
  readonly entityUiOverrideRepository?: EntityUiOverrideRepository;
  readonly tenantDashboardLayoutRepository?: TenantDashboardLayoutRepository;
  readonly tenantSidebarLayoutRepository?: TenantSidebarLayoutRepository;
  readonly uiBuilderPresetRepository?: UiBuilderPresetRepository;
  readonly entityCategoryRepository?: EntityCategoryRepository;
  readonly hookRepository?: DataHookRepository;
  readonly hookExecutionRepository?: DataHookExecutionRepository;
  readonly hookLogMessageRepository?: HookLogMessageRepository;
  readonly userNotificationRepository?: UserNotificationRepository;
  readonly pushTokenRepository?: PushTokenRepository;
  readonly requestPerfLogRepository?: RequestPerfLogRepository;
  readonly indexProvisionEventRepository?: import("@repo/firestore-converters").IndexProvisionEventRepository;
  readonly platformRuntimeSettingsRepository?: PlatformRuntimeSettingsRepository;
  readonly auditLogRepository?: AuditLogRepository;
  readonly metricDefinitionRepository?: MetricDefinitionRepository;
  readonly formulaDefinitionRepository?: FormulaDefinitionRepository;
  readonly entityQueryDefinitionRepository?: EntityQueryDefinitionRepository;
  readonly chartDefinitionRepository?: ChartDefinitionRepository;
  readonly customViewRepository?: CustomViewRepository;
  readonly aggregationEventRepository?: AggregationEventRepository;
  readonly metricValueRepository?: MetricValueRepository;
  readonly metricContributionRepository?: MetricContributionRepository;
  readonly backfillJobRepository?: BackfillJobRepository;
  readonly aiJobRepository?: AiJobRepository;
  readonly aiSpendRepository?: AiSpendRepository;
  readonly tenantRepository?: import("@repo/firestore-converters").TenantRepository;
  readonly aiChatSessionRepository?: AiChatSessionRepository;
  readonly aiContextSectionRepository?: AiContextSectionRepository;
  readonly aiRecordSummaryRepository?: AiRecordSummaryRepository;
  readonly userAiMemoryRepository?: UserAiMemoryRepository;
  readonly tenantAiContextRepository?: TenantAiContextRepository;
  readonly uiBuilderAiSuggestionRepository?: UiBuilderAiSuggestionRepository;
  readonly getUserAccessProfile?: (
    uid: string,
  ) => Promise<UserAccessProfile | null>;
  readonly getRoleCatalog?: (tenantId: string) => Promise<RoleCatalog>;
  readonly skipPlatformRoleSeed?: boolean;
  readonly skipPlatformTenantSeed?: boolean;
  readonly tenantDeletionJobRepository?: TenantDeletionJobRepository;
  readonly tenantDeletionArchiveRepository?: TenantDeletionArchiveRepository;
  readonly tenantUserInviteRepository?: import("@repo/firestore-converters").TenantUserInviteRepository;
}

function buildPermissionDeps(
  options: BuildServerOptions,
  registeredUserRepository: ReturnType<
    typeof createFirestoreAdminRegisteredUserRepository
  >,
  loadRoleCatalog: (tenantId: string) => Promise<RoleCatalog>,
  entityRuntime: EntityRuntimeContext,
): LoadRequestPermissionsDeps {
  const baseDeps =
    options.getUserAccessProfile != null
      ? {
          getUserAccessProfile: options.getUserAccessProfile,
          getRoleCatalog: loadRoleCatalog,
        }
      : createLoadRequestPermissionsDeps(
          registeredUserRepository,
          loadRoleCatalog,
          { cacheTtlMs: apiEnv.CACHE_TTL_MS },
        );

  return {
    ...baseDeps,
    getKnownPermissions: (tenantId) =>
      entityRuntime.getKnownPermissions(tenantId),
    prepareKnownPermissions: async (tenantId) => {
      await entityRuntime.loadTenantDefinitions(tenantId);
      return entityRuntime.getKnownPermissions(tenantId);
    },
  };
}

export async function buildServer(options: BuildServerOptions = {}) {
  bootstrapPlatformApp(platformApp);

  const server = Fastify({
    logger: options.logger ?? true,
  });

  const corsOrigins = apiEnv.API_CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  await server.register(cors, {
    origin: corsOrigins,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  await server.register(compress, {
    global: true,
    encodings: ["gzip", "deflate"],
  });

  if (apiEnv.API_RATE_LIMIT_MAX > 0 && process.env.NODE_ENV !== "test") {
    await server.register(rateLimit, {
      max: apiEnv.API_RATE_LIMIT_MAX,
      timeWindow: apiEnv.API_RATE_LIMIT_TIME_WINDOW_MS,
      allowList: (request) => isRateLimitExemptRequest(request),
      keyGenerator: (request) => {
        const ctx = request.ctx;
        if (ctx?.uid && ctx.tenantId) {
          return `${ctx.uid}:${ctx.tenantId}`;
        }
        if (ctx?.uid) {
          return ctx.uid;
        }
        return request.ip;
      },
    });
  }

  server.get("/health", async () => ({ status: "ok" }));

  const firebaseAdminConfig = {
    projectId: apiEnv.GCP_PROJECT_ID,
    authEmulatorHost: apiEnv.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: apiEnv.FIRESTORE_EMULATOR_HOST,
    storageEmulatorHost: apiEnv.FIREBASE_STORAGE_EMULATOR_HOST,
    storageEmulatorPublicHost: apiEnv.FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST,
    storageBucket: apiEnv.GCP_STORAGE_BUCKET,
  };

  registerCrudErrorHandler(server);

  if (!options.skipPlatformRoleSeed) {
    const { seedPlatformRoles } =
      await import("./admin/seed-platform-roles.js");
    await seedPlatformRoles(firebaseAdminConfig);
  }

  const registeredUserRepository =
    createFirestoreAdminRegisteredUserRepository(firebaseAdminConfig);
  const platformRoleRepository =
    createFirestoreAdminPlatformRoleRepository(firebaseAdminConfig);
  const tenantRoleRepository = options.repositories
    ? createInMemoryTenantRoleRepository()
    : createFirestoreAdminTenantRoleRepository(firebaseAdminConfig);
  const tenantRoleCatalogLoader = createTenantRoleCatalogLoader(
    platformRoleRepository,
    tenantRoleRepository,
    { ttlMs: apiEnv.CACHE_TTL_MS },
  );
  const loadRoleCatalog =
    options.getRoleCatalog ??
    ((tenantId: string) =>
      tenantRoleCatalogLoader.loadRoleCatalogForTenant(tenantId));

  const entityDefinitionRepository =
    options.entityDefinitionRepository ??
    (options.repositories
      ? createInMemoryEntityDefinitionRepository()
      : createFirestoreAdminEntityDefinitionRepository(firebaseAdminConfig));

  const entityUiOverrideRepository =
    options.entityUiOverrideRepository ??
    (options.repositories
      ? createInMemoryEntityUiOverrideRepository()
      : createFirestoreAdminEntityUiOverrideRepository(firebaseAdminConfig));

  const uiBuilderPresetRepository =
    options.uiBuilderPresetRepository ??
    (options.repositories
      ? createInMemoryUiBuilderPresetRepository()
      : createFirestoreAdminUiBuilderPresetRepository(firebaseAdminConfig));

  const tenantDashboardLayoutRepository =
    options.tenantDashboardLayoutRepository ??
    (options.repositories
      ? createInMemoryTenantDashboardLayoutRepository()
      : createFirestoreAdminTenantDashboardLayoutRepository(
          firebaseAdminConfig,
        ));

  const tenantSidebarLayoutRepository =
    options.tenantSidebarLayoutRepository ??
    (options.repositories
      ? createInMemoryTenantSidebarLayoutRepository()
      : createFirestoreAdminTenantSidebarLayoutRepository(firebaseAdminConfig));

  const entityCategoryRepository =
    options.entityCategoryRepository ??
    (options.repositories
      ? createInMemoryEntityCategoryRepository()
      : createFirestoreAdminEntityCategoryRepository(firebaseAdminConfig));

  const hookRepository =
    options.hookRepository ??
    (options.repositories
      ? createInMemoryDataHookRepository()
      : createFirestoreAdminDataHookRepository(firebaseAdminConfig));

  const hookExecutionRepository =
    options.hookExecutionRepository ??
    (options.repositories
      ? createInMemoryDataHookExecutionRepository()
      : createFirestoreAdminDataHookExecutionRepository(firebaseAdminConfig));

  const hookLogMessageRepository =
    options.hookLogMessageRepository ??
    (options.repositories
      ? createInMemoryHookLogMessageRepository()
      : createFirestoreAdminHookLogMessageRepository(firebaseAdminConfig));

  const userNotificationRepository =
    options.userNotificationRepository ??
    (options.repositories
      ? createInMemoryUserNotificationRepository()
      : createFirestoreAdminUserNotificationRepository(firebaseAdminConfig));

  const pushTokenRepository =
    options.pushTokenRepository ??
    (options.repositories
      ? createInMemoryPushTokenRepository()
      : createFirestoreAdminPushTokenRepository(firebaseAdminConfig));

  const requestPerfLogRepository =
    options.requestPerfLogRepository ??
    (options.repositories
      ? createInMemoryRequestPerfLogRepository()
      : createFirestoreAdminRequestPerfLogRepository(firebaseAdminConfig));

  const indexProvisionEventRepository =
    options.indexProvisionEventRepository ??
    (options.repositories
      ? createInMemoryIndexProvisionEventRepository()
      : createFirestoreAdminIndexProvisionEventRepository(firebaseAdminConfig));

  const recordIndexProvisionEvent = createIndexProvisionEventWriter(
    indexProvisionEventRepository,
  );

  const auditLogRepository =
    options.auditLogRepository ??
    (options.repositories
      ? createInMemoryAuditLogRepository()
      : createFirestoreAdminAuditLogRepository(firebaseAdminConfig));

  const platformRuntimeSettingsRepository =
    options.platformRuntimeSettingsRepository ??
    (options.repositories
      ? createInMemoryPlatformRuntimeSettingsRepository()
      : createFirestoreAdminPlatformRuntimeSettingsRepository(
          firebaseAdminConfig,
        ));

  const runtimeSettingsCache = createRuntimeSettingsCache(
    platformRuntimeSettingsRepository,
  );

  registerRequestTiming(server, {
    isEnabled: () => runtimeSettingsCache.isRequestPerfTraceEnabled(),
    persist: async (input) => {
      await requestPerfLogRepository.create(input.tenantId, {
        route: input.route,
        method: input.method,
        statusCode: input.statusCode,
        rbacMs: input.rbacMs,
        queryMs: input.queryMs,
        hooksMs: input.hooksMs,
        totalMs: input.totalMs,
        timestamp: new Date().toISOString(),
      });
    },
  });

  const tenantUserInviteRepository =
    options.tenantUserInviteRepository ??
    (options.repositories
      ? createInMemoryTenantUserInviteRepository()
      : createFirestoreAdminTenantUserInviteRepository(firebaseAdminConfig));

  const hookRuntime = createHookRuntimeContext(hookRepository);
  await server.register(reloadHookCacheRoute, { hookRuntime });
  const hookTasksClient = createHookTasksClient({
    projectId: apiEnv.GCP_PROJECT_ID,
    region: apiEnv.GCP_REGION,
    queueName: apiEnv.HOOK_TASKS_QUEUE_NAME,
    workerBaseUrl: apiEnv.WORKER_SERVICE_URL,
    serviceAccountEmail: apiEnv.TASKS_SA_EMAIL,
    localDispatch: apiEnv.HOOK_TASKS_LOCAL_DISPATCH,
  });

  const tenantDeletionTasksClient = createTenantDeletionTasksClient({
    projectId: apiEnv.GCP_PROJECT_ID,
    region: apiEnv.GCP_REGION,
    queueName: apiEnv.HOOK_TASKS_QUEUE_NAME,
    workerBaseUrl: apiEnv.WORKER_SERVICE_URL,
    serviceAccountEmail: apiEnv.TASKS_SA_EMAIL,
    localDispatch: apiEnv.HOOK_TASKS_LOCAL_DISPATCH,
  });

  const tenantDeletionJobRepository =
    options.tenantDeletionJobRepository ??
    (options.repositories
      ? createInMemoryTenantDeletionJobRepository()
      : createFirestoreAdminTenantDeletionJobRepository(firebaseAdminConfig));

  const tenantDeletionArchiveRepository =
    options.tenantDeletionArchiveRepository ??
    (options.repositories
      ? createInMemoryTenantDeletionArchiveRepository()
      : createFirestoreAdminTenantDeletionArchiveRepository(
          firebaseAdminConfig,
        ));

  const metricDefinitionRepository =
    options.metricDefinitionRepository ??
    (options.repositories
      ? createInMemoryMetricDefinitionRepository()
      : createFirestoreAdminMetricDefinitionRepository(firebaseAdminConfig));

  const formulaDefinitionRepository =
    options.formulaDefinitionRepository ??
    (options.repositories
      ? createInMemoryFormulaDefinitionRepository()
      : createFirestoreAdminFormulaDefinitionRepository(firebaseAdminConfig));

  const formulaRuntime = createFormulaRuntimeContext(
    formulaDefinitionRepository,
  );

  const entityQueryDefinitionRepository =
    options.entityQueryDefinitionRepository ??
    (options.repositories
      ? createInMemoryEntityQueryDefinitionRepository()
      : createFirestoreAdminEntityQueryDefinitionRepository(
          firebaseAdminConfig,
        ));

  const chartDefinitionRepository =
    options.chartDefinitionRepository ??
    (options.repositories
      ? createInMemoryChartDefinitionRepository()
      : createFirestoreAdminChartDefinitionRepository(firebaseAdminConfig));

  const customViewRepository =
    options.customViewRepository ??
    (options.repositories
      ? createInMemoryCustomViewRepository()
      : createFirestoreAdminCustomViewRepository(firebaseAdminConfig));

  const aggregationEventRepository =
    options.aggregationEventRepository ??
    (options.repositories
      ? createInMemoryAggregationEventRepository()
      : createFirestoreAdminAggregationEventRepository(firebaseAdminConfig));

  const metricValueRepository =
    options.metricValueRepository ??
    (options.repositories
      ? createInMemoryMetricValueRepository()
      : createFirestoreAdminMetricValueRepository(firebaseAdminConfig));

  const backfillJobRepository =
    options.backfillJobRepository ??
    (options.repositories
      ? createInMemoryBackfillJobRepository()
      : createFirestoreAdminBackfillJobRepository(firebaseAdminConfig));

  const aiJobRepository =
    options.aiJobRepository ??
    (options.repositories
      ? createInMemoryAiJobRepository()
      : createFirestoreAdminAiJobRepository(firebaseAdminConfig));

  const aiSpendRepository =
    options.aiSpendRepository ??
    (options.repositories
      ? createInMemoryAiSpendRepository()
      : createFirestoreAdminAiSpendRepository(firebaseAdminConfig));

  const aiChatSessionRepository =
    options.aiChatSessionRepository ??
    (options.repositories
      ? createInMemoryAiChatSessionRepository()
      : createFirestoreAdminAiChatSessionRepository(firebaseAdminConfig));

  const userAiMemoryRepository =
    options.userAiMemoryRepository ??
    (options.repositories
      ? createInMemoryUserAiMemoryRepository()
      : createFirestoreAdminUserAiMemoryRepository(firebaseAdminConfig));

  const aiContextSectionRepository =
    options.aiContextSectionRepository ??
    (options.repositories
      ? createInMemoryAiContextSectionRepository()
      : createFirestoreAdminAiContextSectionRepository(firebaseAdminConfig));

  const aiRecordSummaryRepository =
    options.aiRecordSummaryRepository ??
    (options.repositories
      ? createInMemoryAiRecordSummaryRepository()
      : createFirestoreAdminAiRecordSummaryRepository(firebaseAdminConfig));

  const uiBuilderAiSuggestionRepository =
    options.uiBuilderAiSuggestionRepository ??
    (options.repositories
      ? createInMemoryUiBuilderAiSuggestionRepository()
      : createFirestoreAdminUiBuilderAiSuggestionRepository(
          firebaseAdminConfig,
        ));

  const tenantAiContextRepository =
    options.tenantAiContextRepository ??
    (options.repositories
      ? createInMemoryTenantAiContextRepository()
      : createFirestoreAdminTenantAiContextRepository(firebaseAdminConfig));

  const tenantRepositoryForAiContext = options.repositories
    ? (options.tenantRepository ?? null)
    : (options.tenantRepository ??
      createFirestoreAdminTenantRepository(firebaseAdminConfig));

  const tenantRepositoryForSpend =
    options.tenantRepository ??
    tenantRepositoryForAiContext ??
    createInMemoryTenantRepository();

  const metricContributionRepository =
    options.metricContributionRepository ??
    (options.repositories
      ? createInMemoryMetricContributionRepository()
      : createFirestoreAdminMetricContributionRepository(firebaseAdminConfig));

  const indexStatusStore =
    options.repositories == null
      ? createFirestoreIndexStatusStore(firebaseAdminConfig)
      : undefined;

  configureIndexProvisioningQueue({
    concurrency: apiEnv.INDEX_PROVISIONING_CONCURRENCY,
    batchDelayMs: apiEnv.INDEX_PROVISIONING_BATCH_DELAY_MS,
  });

  const warnedIndexFailureSignatures = new Set<string>();
  let indexProgressLogTimer: ReturnType<typeof setTimeout> | undefined;
  const indexProgressCounts = {
    ready: 0,
    creating: 0,
    error: 0,
    total: 0,
  };

  function scheduleIndexProgressSummaryLog(): void {
    if (indexProgressLogTimer) {
      return;
    }
    indexProgressLogTimer = setTimeout(() => {
      indexProgressLogTimer = undefined;
      server.log.info(
        {
          ready: indexProgressCounts.ready,
          creating: indexProgressCounts.creating,
          failed: indexProgressCounts.error,
          total: indexProgressCounts.total,
        },
        `Index provisioning progress: ${indexProgressCounts.ready}/${indexProgressCounts.total} ready, ${indexProgressCounts.creating} creating, ${indexProgressCounts.error} failed`,
      );
    }, 10_000);
  }

  const localTenant = tryLoadLocalTenantConfig();
  const entityRuntime = createEntityRuntimeContext({
    firebaseAdminConfig,
    entityDefinitionRepository,
    definitionCacheTtlMs: apiEnv.CACHE_TTL_MS,
    cursorSecret: apiEnv.QUERY_CURSOR_SECRET,
    clientFallbackMaxDocs: apiEnv.CLIENT_QUERY_FALLBACK_MAX_DOCS,
    ensureFirestoreIndexes: apiEnv.ENSURE_FIRESTORE_INDEXES,
    indexProvisioningExcludedTenants: new Set(
      localTenant?.indexProvisioningExcluded ? [localTenant.id] : [],
    ),
    indexStatusStore,
    indexProvisioningConcurrency: apiEnv.INDEX_PROVISIONING_CONCURRENCY,
    indexProvisioningBatchDelayMs: apiEnv.INDEX_PROVISIONING_BATCH_DELAY_MS,
    onIndexHint: (hint) => {
      void recordIndexProvisionEvent({
        timestamp: new Date().toISOString(),
        event: "operation_blocked",
        collection: hint.collection,
        blockedOperation: "list_query",
        tenantId: hint.tenantId,
        trigger: "missing_index_hint",
      });
      server.log.warn(
        {
          collection: hint.collection,
          tenantId: hint.tenantId,
          filters: hint.filters,
          sort: hint.sort,
          suggestedFields: hint.suggestedFields,
        },
        "List query requires a composite index; update the entity model or use POST /api/indexes/provision.",
      );
    },
    onIndexEnsured: (index) => {
      server.log.info(
        { collection: index.collectionGroup, fields: index.fields },
        "Ensured Firestore composite index (add to firestore.indexes.json for IaC)",
      );
    },
    onIndexEnsureError: (error, index) => {
      const signature = computeIndexSignature(index);
      if (warnedIndexFailureSignatures.has(signature)) {
        return;
      }
      warnedIndexFailureSignatures.add(signature);
      const message = error instanceof Error ? error.message : String(error);
      server.log.warn(
        {
          collection: index.collectionGroup,
          signature,
          err: error,
        },
        `Index provisioning permanently failed for ${index.collectionGroup} (${signature}): ${message}`,
      );
    },
    onProvisionEvent: async (event) => {
      if (event.event === "ready") {
        indexProgressCounts.ready += 1;
      } else if (event.event === "creating") {
        indexProgressCounts.creating += 1;
        indexProgressCounts.total += 1;
      } else if (event.event === "error") {
        indexProgressCounts.error += 1;
        indexProgressCounts.creating = Math.max(
          0,
          indexProgressCounts.creating - 1,
        );
      }
      scheduleIndexProgressSummaryLog();

      await recordIndexProvisionEvent(
        indexProvisionEventFromCompositeIndex(event.index, event.event, {
          tenantId: event.tenantId,
          trigger: event.trigger,
          errorMessage: event.errorMessage,
          operationName: event.operationName,
          retryExhausted: event.retryExhausted,
        }),
      );
    },
    repositories: options.repositories,
    queryExecutors: options.queryExecutors,
  });

  const tenantIndexGuard = createTenantIndexGuard({
    statusStore: indexStatusStore,
    entityRuntime,
    recordEvent: recordIndexProvisionEvent,
  });

  const tenantAiContextSync: SyncTenantAiContextsDeps | undefined =
    tenantRepositoryForAiContext
      ? {
          repository: tenantAiContextRepository,
          tenantRepository: tenantRepositoryForAiContext,
          entityCategoryRepository,
          entityRuntime,
          userAiMemoryRepository,
        }
      : undefined;

  if (!options.skipPlatformTenantSeed) {
    const { seedPlatformTenants } =
      await import("./admin/seed-platform-tenants.js");
    await seedPlatformTenants(firebaseAdminConfig, entityRuntime);
  }

  const resolveQueryMembership = createMetricQueryMembershipResolver({
    entityRuntime,
    entityQueryDefinitionRepository,
  });

  const metricRuntime = createMetricRuntimeContext({
    metricDefinitionRepository,
    aggregationEventRepository,
    metricValueRepository,
    backfillJobRepository,
    metricContributionRepository,
    listSourceDocuments: (tenantId, metric) =>
      listSourceDocumentsForMetricDefinition(
        entityRuntime,
        entityQueryDefinitionRepository,
        tenantId,
        metric,
      ),
    resolveQueryMembership,
  });

  const aggregationEmitter: AggregationEmitterDeps = {
    metricRuntime,
    publishToPubSub: apiEnv.AGGREGATION_EVENTS_PUBSUB,
    aggregationTopic: apiEnv.AGGREGATION_EVENTS_TOPIC,
    projectId: apiEnv.GCP_PROJECT_ID,
    getSchemaVersion: () => 1,
    log: (message, meta) => {
      server.log.info(meta, message);
    },
  };

  const permissionDeps = buildPermissionDeps(
    options,
    registeredUserRepository,
    loadRoleCatalog,
    entityRuntime,
  );

  const runtimeMaps = createEntityRuntimeMaps(firebaseAdminConfig, {
    repositories: options.repositories,
    queryExecutors: options.queryExecutors,
  });
  const joinRepository =
    options.joinRepository ??
    createFirestoreAdminJoinCollectionRepository(firebaseAdminConfig);
  const relationContext = entityRuntime.createRelationContext(
    joinRepository,
    async (input) => {
      try {
        await emitAggregationEventIfNeeded(aggregationEmitter, input);
      } catch (error) {
        server.log.error(
          {
            err: error,
            entityName: input.entityName,
            tenantId: input.tenantId,
            operation: input.operation,
            documentId: input.documentId,
          },
          "Failed to emit aggregation event after relation cascade",
        );
      }
    },
  );
  const ownershipQueryInjector = createOwnershipQueryInjector(
    (entityName, tenantId) => {
      const entity = entityRuntime.resolveEntity(entityName, tenantId);
      if (!entity) return undefined;
      return { tenantWideRead: entity.metadata.tenantWideRead };
    },
  );
  const queryContext = entityRuntime.createQueryContext(ownershipQueryInjector);
  const crudHooks: CrudHookDeps = {
    hookRuntime,
    formulaRuntime,
    entityRuntime,
    permissionDeps,
    hookExecutionRepository,
    hookLogMessageRepository,
    userNotificationRepository,
    pushTokenRepository,
    firebaseAdminConfig,
    enqueueDataHookJob:
      hookTasksClient.enqueueDataHookJob.bind(hookTasksClient),
    callWebhook: callDataHookWebhook,
    aggregation: aggregationEmitter,
  };
  const recordReadEnricher = createEntityFileReadEnricher(
    firebaseAdminConfig,
    entityRuntime,
  );

  await server.register(authValidateRoute, {
    firebaseAdminConfig,
    permissionDeps,
    tenantUserInviteRepository,
  });

  await server.register(authSelectTenantRoute, {
    firebaseAdminConfig,
    permissionDeps,
  });

  await server.register(adminRoutes, {
    firebaseAdminConfig,
    registeredUserRepository,
    permissionDeps,
    tenantAiContextSync,
    tenantIndexGuard,
    entityRuntime,
    tenantDeletionJobRepository,
    tenantDeletionArchiveRepository,
    tenantDeletionTasksClient,
    tenantDeletionProtectedIds: parseProtectedTenantIds(
      apiEnv.TENANT_DELETION_PROTECTED_IDS,
    ),
  });

  const authenticate = createAuthenticatePreHandler(firebaseAdminConfig);

  await registerTenantUserRoutes(server, {
    authenticate,
    permissionDeps,
    registeredUserRepository,
    tenantUserInviteRepository,
    getRoleCatalog: loadRoleCatalog,
  });

  await registerListEntitiesRoute(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    firebaseAdminConfig,
    entityUiOverrideRepository,
  });

  await registerGlobalSearchRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    queryEngine: queryContext.queryEngine,
    recordReadEnricher,
  });

  await registerEntityUiOverrideRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    entityUiOverrideRepository,
  });

  await registerUiBuilderPresetRoutes(server, {
    authenticate,
    permissionDeps,
    uiBuilderPresetRepository,
  });

  await registerTenantDashboardLayoutRoutes(server, {
    authenticate,
    permissionDeps,
    tenantDashboardLayoutRepository,
    firebaseAdminConfig,
  });

  await registerTenantSidebarLayoutRoutes(server, {
    authenticate,
    permissionDeps,
    tenantSidebarLayoutRepository,
    firebaseAdminConfig,
  });

  registerEntityFileRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    firebaseAdminConfig,
  });

  await registerEntityDefinitionRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    entityCategoryRepository,
    firebaseAdminConfig,
    tenantAiContextSync,
    tenantIndexGuard,
  });

  await registerEntityCategoryRoutes(server, {
    authenticate,
    permissionDeps,
    entityCategoryRepository,
    entityDefinitionRepository,
  });

  await registerHookRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    hookRuntime,
    formulaRuntime,
    hookExecutionRepository,
    tenantIndexGuard,
  });

  await registerAiRoutes(server, {
    authenticate,
    permissionDeps,
    aiJobRepository,
    aiChatSessionRepository,
    tenantAiContextDeps: tenantAiContextSync,
    aiSpendGuardDeps: {
      tenantRepository: tenantRepositoryForSpend,
      aiSpendRepository,
      getRoleCatalog: loadRoleCatalog,
      registeredUserRepository,
    },
    cloudTasksConfig: {
      projectId: apiEnv.GCP_PROJECT_ID,
      region: apiEnv.GCP_REGION,
      queueName: apiEnv.CLOUD_TASKS_QUEUE_NAME,
      workerBaseUrl: apiEnv.WORKER_SERVICE_URL,
      serviceAccountEmail: apiEnv.TASKS_SA_EMAIL,
      localDispatch: apiEnv.AI_TASKS_LOCAL_DISPATCH,
    },
  });

  await registerAiContextSectionRoutes(server, {
    authenticate,
    permissionDeps,
    aiContextSectionRepository,
    userAiMemoryRepository,
  });

  await registerAiRecordSummaryTemplateRoutes(server, {
    authenticate,
    permissionDeps,
    tenantAiContextRepository,
    entityDefinitionRepository,
    userAiMemoryRepository,
  });

  await registerAiRecordSummaryRoutes(server, {
    authenticate,
    permissionDeps,
    aiRecordSummaryRepository,
    aiSpendGuardDeps: {
      tenantRepository: tenantRepositoryForSpend,
      aiSpendRepository,
      getRoleCatalog: loadRoleCatalog,
      registeredUserRepository,
    },
    cloudTasksConfig: {
      projectId: apiEnv.GCP_PROJECT_ID,
      region: apiEnv.GCP_REGION,
      queueName: apiEnv.CLOUD_TASKS_QUEUE_NAME,
      workerBaseUrl: apiEnv.WORKER_SERVICE_URL,
      serviceAccountEmail: apiEnv.TASKS_SA_EMAIL,
      localDispatch: apiEnv.AI_TASKS_LOCAL_DISPATCH,
    },
  });

  const gmailConnectionRepository =
    createFirestoreAdminGmailConnectionRepository(firebaseAdminConfig);
  const emailMatchBindingRepository =
    createFirestoreAdminEmailMatchBindingRepository(firebaseAdminConfig);
  const emailIngestJobRepository =
    createFirestoreAdminEmailIngestJobRepository(firebaseAdminConfig);
  const gmailTasksClient = createGmailTasksClient({
    projectId: apiEnv.GCP_PROJECT_ID,
    region: apiEnv.GCP_REGION,
    queueName: apiEnv.GMAIL_TASKS_QUEUE_NAME,
    workerBaseUrl: apiEnv.WORKER_SERVICE_URL,
    serviceAccountEmail: apiEnv.TASKS_SA_EMAIL,
    localDispatch: apiEnv.GMAIL_TASKS_LOCAL_DISPATCH,
  });

  await server.register(platformRuntimeSettingsRoutes, {
    firebaseAdminConfig,
    permissionDeps,
    platformRuntimeSettingsRepository,
    runtimeSettingsCache,
    gmailConnectionRepository,
    gmailTasksClient,
    ...(apiEnv.GMAIL_PUBSUB_TOPIC
      ? { gmailPubsubTopic: apiEnv.GMAIL_PUBSUB_TOPIC }
      : {}),
  });

  await registerDebugRoutes(server, {
    authenticate,
    permissionDeps,
    aiJobRepository,
    hookExecutionRepository,
    hookLogMessageRepository,
    auditLogRepository,
    requestPerfLogRepository,
    indexProvisionEventRepository,
    emailIngestJobRepository,
    entityRuntime,
  });

  await registerNotificationRoutes(server, {
    authenticate,
    userNotificationRepository,
  });

  await registerPushTokenRoutes(server, {
    authenticate,
    pushTokenRepository,
  });

  const gmailOAuthConfigured =
    Boolean(apiEnv.GMAIL_OAUTH_CLIENT_ID?.trim()) &&
    Boolean(apiEnv.GMAIL_OAUTH_CLIENT_SECRET?.trim()) &&
    Boolean(apiEnv.TENANT_ENCRYPTION_MASTER_KEY?.trim());

  const webAppOrigins = [
    apiEnv.WEB_APP_ORIGIN.replace(/\/$/, ""),
    ...apiEnv.API_CORS_ORIGINS.split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean),
  ];
  const allowedWebOrigins = [...new Set(webAppOrigins)];

  await registerGmailIngestRoutes(server, {
    authenticate,
    gmailConnectionRepository,
    emailMatchBindingRepository,
    emailIngestJobRepository,
    gmailTasksClient,
    entityRuntime,
    getDeliveryMode: () => runtimeSettingsCache.getGmailIngestDeliveryMode(),
    oauth: gmailOAuthConfigured
      ? {
          clientId: apiEnv.GMAIL_OAUTH_CLIENT_ID!,
          clientSecret: apiEnv.GMAIL_OAUTH_CLIENT_SECRET!,
          redirectUri: apiEnv.GMAIL_OAUTH_REDIRECT_URI,
          stateSecret: apiEnv.GMAIL_OAUTH_STATE_SECRET,
          encryptionMasterKey: apiEnv.TENANT_ENCRYPTION_MASTER_KEY!,
          webAppOrigin: apiEnv.WEB_APP_ORIGIN.replace(/\/$/, ""),
          allowedWebOrigins,
          ...(apiEnv.GMAIL_PUBSUB_TOPIC
            ? { pubsubTopicName: apiEnv.GMAIL_PUBSUB_TOPIC }
            : {}),
        }
      : null,
  });
  await registerUiBuilderAiSuggestionRoutes(server, {
    authenticate,
    permissionDeps,
    uiBuilderAiSuggestionRepository,
  });

  await registerMetricDefinitionRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    metricRuntime,
    entityQueryDefinitionRepository,
    tenantIndexGuard,
  });

  const { registerFormulaDefinitionRoutes } = await loadFormulaAdmin();
  await registerFormulaDefinitionRoutes(server, {
    authenticate,
    permissionDeps,
    formulaRuntime,
  });

  await registerEntityQueryDefinitionRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    entityQueryDefinitionRepository,
    metricDefinitionRepository,
    tenantIndexGuard,
  });

  await registerChartDefinitionRoutes(server, {
    authenticate,
    permissionDeps,
    chartDefinitionRepository,
  });

  await registerCustomViewRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    customViewRepository,
    entityQueryDefinitionRepository,
    entityCategoryRepository,
    tenantIndexGuard,
  });

  await registerMetricReadRoutes(server, {
    authenticate,
    permissionDeps,
    metricRuntime,
    entityRuntime,
    entityQueryDefinitionRepository,
  });

  await registerRoleRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    tenantRoleRepository,
    tenantRoleCatalogLoader,
  });

  await registerModuleRoutes(server, {
    authenticate,
    permissionDeps,
  });

  await registerIndexRoutes(server, {
    authenticate,
    firebaseAdminConfig,
    entityRuntime,
    statusStore: indexStatusStore,
    indexProvisionEventRepository,
    ensureFirestoreIndexes: apiEnv.ENSURE_FIRESTORE_INDEXES,
    publishToPubSub: apiEnv.INDEX_PROVISIONING_PUBSUB,
    indexProvisioningTopic: apiEnv.INDEX_PROVISIONING_TOPIC,
  });

  for (const entity of getAllEntities()) {
    const repository = runtimeMaps.repositories[entity.name];
    if (!repository) {
      throw new Error(`Missing repository for entity "${entity.name}".`);
    }

    await registerCrudRoutes(server, {
      entity: {
        name: entity.name,
        collection: entity.metadata.collection,
        schema: entity.schema,
        createSchema: entity.createSchema,
        updateSchema: entity.updateSchema,
        businessFieldNames: Object.keys(entity.metadata.fields),
        prepareRecordForWrite: (record) =>
          sanitizeFileFieldsForWrite(
            entity,
            prepareRecordSearchFields(entity, record),
          ),
      },
      repository,
      authenticate,
      authorize: createEntityPermissionGuards(permissionDeps, entity.name),
      relations: relationContext.hooksFor(entity.name),
      queryEngine: queryContext.queryEngine,
      indexStatusStore,
      indexProvisionEventWriter: recordIndexProvisionEvent,
      referencePopulator: {
        getEntityDefinition: (name, tenantId) =>
          entityRuntime.getEntityDefinition(name, tenantId),
        getRepository: (tenantId, entityName) =>
          entityRuntime.getRepository(tenantId, entityName),
        firebaseAdminConfig,
      },
      crudHooks,
      recordReadEnricher,
      aggregation: aggregationEmitter,
    });
  }

  await registerDynamicEntityCrudRoutes(
    entityRuntime,
    server,
    authenticate,
    permissionDeps,
    queryContext.queryEngine,
    relationContext,
    crudHooks,
    indexStatusStore,
    recordReadEnricher,
    firebaseAdminConfig,
    aggregationEmitter,
  );

  await registerEntityRelationRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    relationContext,
  });

  await registerEntityRecordsImportExportRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    relationContext,
    queryEngine: queryContext.queryEngine,
    crudHooks,
    aggregation: aggregationEmitter,
    tenantIndexGuard,
  });

  if (!options.repositories) {
    const auditLogger = createAuditLogger(firebaseAdminConfig);
    const shareService = createShareService({
      firebaseAdminConfig,
      auditLogger,
    });
    registerShareRoutes(server, {
      authenticate,
      shareService,
      entityRuntime,
    });
  }

  const bootstrapTenantId = "rates";
  if (!options.repositories) {
    try {
      await entityRuntime.loadTenantDefinitions(bootstrapTenantId, {
        force: true,
      });
    } catch (error) {
      server.log.warn(
        { err: error, tenantId: bootstrapTenantId },
        "Could not preload tenant entity definitions at boot",
      );
    }
  } else {
    const dynamicDefinitions =
      await entityDefinitionRepository.list(bootstrapTenantId);
    for (const record of dynamicDefinitions) {
      await entityRuntime.syncDefinition(record);
    }
  }

  return server;
}
