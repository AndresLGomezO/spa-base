import cors from "@fastify/cors";
import compress from "@fastify/compress";
import rateLimit from "@fastify/rate-limit";

import { isRateLimitExemptRequest } from "./rate-limit-allowlist.js";
import Fastify from "fastify";

import { getAllEntities, prepareRecordSearchFields } from "@repo/entities";
import type {
  EntityCategoryRepository,
  EntityDefinitionRepository,
  EntityQueryExecutor,
  EntityUiOverrideRepository,
  TenantDashboardLayoutRepository,
  UiBuilderPresetRepository,
  AggregationEventRepository,
  BackfillJobRepository,
  AiJobRepository,
  UiBuilderAiSuggestionRepository,
  DataHookRepository,
  JoinCollectionRepository,
  MetricContributionRepository,
  MetricDefinitionRepository,
  MetricValueRepository,
  EntityQueryDefinitionRepository,
  CustomViewRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import {
  createInMemoryAggregationEventRepository,
  createInMemoryBackfillJobRepository,
  createInMemoryAiJobRepository,
  createInMemoryUiBuilderAiSuggestionRepository,
  createInMemoryEntityCategoryRepository,
  createInMemoryEntityDefinitionRepository,
  createInMemoryEntityUiOverrideRepository,
  createInMemoryTenantDashboardLayoutRepository,
  createInMemoryUiBuilderPresetRepository,
  createInMemoryDataHookRepository,
  createInMemoryMetricDefinitionRepository,
  createInMemoryEntityQueryDefinitionRepository,
  createInMemoryCustomViewRepository,
  createInMemoryMetricContributionRepository,
  createInMemoryMetricValueRepository,
  createInMemoryTenantAiContextRepository,
  createInMemoryTenantRoleRepository,
  createInMemoryTenantUserInviteRepository,
} from "@repo/firestore-converters";
import {
  createFirestoreAdminAggregationEventRepository,
  createFirestoreAdminBackfillJobRepository,
  createFirestoreAdminAiJobRepository,
  createFirestoreAdminUiBuilderAiSuggestionRepository,
  createFirestoreAdminEntityCategoryRepository,
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminEntityUiOverrideRepository,
  createFirestoreAdminTenantDashboardLayoutRepository,
  createFirestoreAdminUiBuilderPresetRepository,
  createFirestoreAdminDataHookRepository,
  createFirestoreAdminJoinCollectionRepository,
  createFirestoreAdminMetricDefinitionRepository,
  createFirestoreAdminEntityQueryDefinitionRepository,
  createFirestoreAdminCustomViewRepository,
  createFirestoreAdminMetricContributionRepository,
  createFirestoreAdminMetricValueRepository,
  createFirestoreAdminPlatformRoleRepository,
  createFirestoreAdminRegisteredUserRepository,
  createFirestoreAdminTenantRoleRepository,
  createFirestoreAdminTenantUserInviteRepository,
  createFirestoreAdminTenantRepository,
  createFirestoreAdminTenantAiContextRepository,
  createFirestoreIndexStatusStore,
} from "@repo/gcp-firebase";
import { createMetricRuntimeContext } from "./aggregation/metric-runtime-context.js";
import { listSourceDocumentsForMetric } from "./aggregation/list-source-documents.js";
import { registerMetricDefinitionRoutes } from "./aggregation/register-metric-definition-routes.js";
import { registerMetricReadRoutes } from "./aggregation/register-metric-read-routes.js";
import { registerEntityQueryDefinitionRoutes } from "./entity-queries/register-entity-query-definition-routes.js";
import { registerCustomViewRoutes } from "./custom-views/register-custom-view-routes.js";
import type { AggregationEmitterDeps } from "./aggregation/emit-aggregation-event.js";
import { type RoleCatalog, type UserAccessProfile } from "@repo/rbac";

import { platformApp } from "@app/platform/app.config.js";
import { bootstrapPlatformApp } from "@app/platform/bootstrap.js";
import { RATES_TENANT_ID } from "./admin/rates-tenant/constants.js";
import { createAuthenticatePreHandler } from "./auth/authenticate-request.js";
import { apiEnv } from "./config/env.js";
import { registerRequestTiming } from "./observability/request-timing.js";
import { registerCrudErrorHandler, registerCrudRoutes } from "./crud/index.js";
import { createEntityRuntimeMaps } from "./entities/create-entity-runtime-maps.js";
import {
  createEntityRuntimeContext,
  type EntityRuntimeContext,
} from "./entities/entity-runtime-context.js";
import { registerDynamicEntityCrudRoutes } from "./entities/register-dynamic-entity-crud-routes.js";
import { registerEntityRelationRoutes } from "./entities/register-entity-relation-routes.js";
import { registerListEntitiesRoute } from "./entities/list-entities.route.js";
import { registerEntityUiOverrideRoutes } from "./entities/register-entity-ui-override-routes.js";
import { registerUiBuilderPresetRoutes } from "./ui-builder-presets/register-ui-builder-preset-routes.js";
import { registerTenantDashboardLayoutRoutes } from "./tenant-dashboard-layout/register-tenant-dashboard-layout-routes.js";
import { registerEntityCategoryRoutes } from "./entity-categories/register-entity-category-routes.js";
import { registerEntityDefinitionRoutes } from "./entities/register-entity-definition-routes.js";
import { registerIndexRoutes } from "./indexes/register-index-routes.js";
import type { CrudHookDeps } from "./hooks/crud-hook-deps.types.js";
import { createHookRuntimeContext } from "./hooks/hook-runtime-context.js";
import { createHookTasksClient } from "./hooks/hook-tasks.client.js";
import { registerHookRoutes } from "./hooks/register-hook-routes.js";
import { registerAiRoutes } from "./ai/register-ai-routes.js";
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
import { authSelectTenantRoute } from "./routes/auth-select-tenant.route.js";
import { authValidateRoute } from "./routes/auth-validate.route.js";
import { registerTenantUserRoutes } from "./routes/tenant-users.routes.js";

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
  readonly uiBuilderPresetRepository?: UiBuilderPresetRepository;
  readonly entityCategoryRepository?: EntityCategoryRepository;
  readonly hookRepository?: DataHookRepository;
  readonly metricDefinitionRepository?: MetricDefinitionRepository;
  readonly entityQueryDefinitionRepository?: EntityQueryDefinitionRepository;
  readonly customViewRepository?: CustomViewRepository;
  readonly aggregationEventRepository?: AggregationEventRepository;
  readonly metricValueRepository?: MetricValueRepository;
  readonly metricContributionRepository?: MetricContributionRepository;
  readonly backfillJobRepository?: BackfillJobRepository;
  readonly aiJobRepository?: AiJobRepository;
  readonly uiBuilderAiSuggestionRepository?: UiBuilderAiSuggestionRepository;
  readonly getUserAccessProfile?: (
    uid: string,
  ) => Promise<UserAccessProfile | null>;
  readonly getRoleCatalog?: (tenantId: string) => Promise<RoleCatalog>;
  readonly skipPlatformRoleSeed?: boolean;
  readonly skipPlatformTenantSeed?: boolean;
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

  registerRequestTiming(server, { enabled: apiEnv.ENABLE_PERF_LOGS });

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

  const tenantUserInviteRepository =
    options.tenantUserInviteRepository ??
    (options.repositories
      ? createInMemoryTenantUserInviteRepository()
      : createFirestoreAdminTenantUserInviteRepository(firebaseAdminConfig));

  const hookRuntime = createHookRuntimeContext(hookRepository);
  const hookTasksClient = createHookTasksClient({
    projectId: apiEnv.GCP_PROJECT_ID,
    region: apiEnv.GCP_REGION,
    queueName: apiEnv.HOOK_TASKS_QUEUE_NAME,
    workerBaseUrl: apiEnv.WORKER_SERVICE_URL,
    serviceAccountEmail: apiEnv.TASKS_SA_EMAIL,
    localDispatch: apiEnv.HOOK_TASKS_LOCAL_DISPATCH,
  });

  const metricDefinitionRepository =
    options.metricDefinitionRepository ??
    (options.repositories
      ? createInMemoryMetricDefinitionRepository()
      : createFirestoreAdminMetricDefinitionRepository(firebaseAdminConfig));

  const entityQueryDefinitionRepository =
    options.entityQueryDefinitionRepository ??
    (options.repositories
      ? createInMemoryEntityQueryDefinitionRepository()
      : createFirestoreAdminEntityQueryDefinitionRepository(
          firebaseAdminConfig,
        ));

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

  const uiBuilderAiSuggestionRepository =
    options.uiBuilderAiSuggestionRepository ??
    (options.repositories
      ? createInMemoryUiBuilderAiSuggestionRepository()
      : createFirestoreAdminUiBuilderAiSuggestionRepository(
          firebaseAdminConfig,
        ));

  const tenantAiContextRepository = options.repositories
    ? createInMemoryTenantAiContextRepository()
    : createFirestoreAdminTenantAiContextRepository(firebaseAdminConfig);

  const tenantRepositoryForAiContext = options.repositories
    ? null
    : createFirestoreAdminTenantRepository(firebaseAdminConfig);

  const metricContributionRepository =
    options.metricContributionRepository ??
    (options.repositories
      ? createInMemoryMetricContributionRepository()
      : createFirestoreAdminMetricContributionRepository(firebaseAdminConfig));

  const indexStatusStore =
    options.repositories == null
      ? createFirestoreIndexStatusStore(firebaseAdminConfig)
      : undefined;

  const entityRuntime = createEntityRuntimeContext({
    firebaseAdminConfig,
    entityDefinitionRepository,
    definitionCacheTtlMs: apiEnv.CACHE_TTL_MS,
    cursorSecret: apiEnv.QUERY_CURSOR_SECRET,
    clientFallbackMaxDocs: apiEnv.CLIENT_QUERY_FALLBACK_MAX_DOCS,
    ensureFirestoreIndexes: apiEnv.ENSURE_FIRESTORE_INDEXES,
    indexProvisioningExcludedTenants: new Set([RATES_TENANT_ID]),
    indexStatusStore,
    onIndexHint: (hint) => {
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
      server.log.error(
        {
          err: error,
          collection: index.collectionGroup,
          fields: index.fields,
        },
        "Failed to ensure Firestore composite index",
      );
    },
    repositories: options.repositories,
    queryExecutors: options.queryExecutors,
  });

  const tenantAiContextSync: SyncTenantAiContextsDeps | undefined =
    tenantRepositoryForAiContext
      ? {
          repository: tenantAiContextRepository,
          tenantRepository: tenantRepositoryForAiContext,
          entityCategoryRepository,
          entityRuntime,
        }
      : undefined;

  if (!options.skipPlatformTenantSeed) {
    const { seedPlatformTenants } =
      await import("./admin/seed-platform-tenants.js");
    await seedPlatformTenants(firebaseAdminConfig, entityRuntime);
  }

  const metricRuntime = createMetricRuntimeContext({
    metricDefinitionRepository,
    aggregationEventRepository,
    metricValueRepository,
    backfillJobRepository,
    metricContributionRepository,
    listSourceDocuments: (tenantId, sourceModel) =>
      listSourceDocumentsForMetric(entityRuntime, tenantId, sourceModel),
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
  const relationContext = entityRuntime.createRelationContext(joinRepository);
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
    entityRuntime,
    permissionDeps,
    enqueueDataHookJob:
      hookTasksClient.enqueueDataHookJob.bind(hookTasksClient),
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
  });

  await registerAiRoutes(server, {
    authenticate,
    permissionDeps,
    aiJobRepository,
    tenantAiContextDeps: tenantAiContextSync,
    cloudTasksConfig: {
      projectId: apiEnv.GCP_PROJECT_ID,
      region: apiEnv.GCP_REGION,
      queueName: apiEnv.CLOUD_TASKS_QUEUE_NAME,
      workerBaseUrl: apiEnv.WORKER_SERVICE_URL,
      serviceAccountEmail: apiEnv.TASKS_SA_EMAIL,
      localDispatch: apiEnv.AI_TASKS_LOCAL_DISPATCH,
    },
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
  });

  await registerEntityQueryDefinitionRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    entityQueryDefinitionRepository,
  });

  await registerCustomViewRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    customViewRepository,
    entityQueryDefinitionRepository,
    entityCategoryRepository,
  });

  await registerMetricReadRoutes(server, {
    authenticate,
    permissionDeps,
    metricRuntime,
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
