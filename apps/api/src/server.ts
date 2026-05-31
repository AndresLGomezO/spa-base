import cors from "@fastify/cors";
import compress from "@fastify/compress";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

import { getAllEntities } from "@repo/entities";
import type {
  EntityDefinitionRepository,
  EntityQueryExecutor,
  HookRepository,
  JoinCollectionRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import {
  createInMemoryEntityDefinitionRepository,
  createInMemoryHookRepository,
  createInMemoryTenantRoleRepository,
  createInMemoryTenantUserInviteRepository,
} from "@repo/firestore-converters";
import {
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminHookRepository,
  createFirestoreAdminJoinCollectionRepository,
  createFirestoreAdminPlatformRoleRepository,
  createFirestoreAdminRegisteredUserRepository,
  createFirestoreAdminTenantRoleRepository,
  createFirestoreAdminTenantUserInviteRepository,
} from "@repo/gcp-firebase";
import { type RoleCatalog, type UserAccessProfile } from "@repo/rbac";

import { platformApp } from "@app/platform/app.config.js";
import { bootstrapPlatformApp } from "@app/platform/bootstrap.js";
import { seedPlatformRoles } from "./admin/seed-platform-roles.js";
import { seedPlatformTenants } from "./admin/seed-platform-tenants.js";
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
import { registerEntityDefinitionRoutes } from "./entities/register-entity-definition-routes.js";
import type { CrudHookDeps } from "./hooks/crud-hook-deps.types.js";
import { createHookRuntimeContext } from "./hooks/hook-runtime-context.js";
import { registerHookRoutes } from "./hooks/register-hook-routes.js";
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
  readonly hookRepository?: HookRepository;
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
    await seedPlatformRoles(firebaseAdminConfig);
  }

  if (!options.skipPlatformTenantSeed) {
    await seedPlatformTenants(firebaseAdminConfig);
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

  const hookRepository =
    options.hookRepository ??
    (options.repositories
      ? createInMemoryHookRepository()
      : createFirestoreAdminHookRepository(firebaseAdminConfig));

  const tenantUserInviteRepository =
    options.tenantUserInviteRepository ??
    (options.repositories
      ? createInMemoryTenantUserInviteRepository()
      : createFirestoreAdminTenantUserInviteRepository(firebaseAdminConfig));

  const hookRuntime = createHookRuntimeContext(hookRepository);

  const entityRuntime = createEntityRuntimeContext({
    firebaseAdminConfig,
    entityDefinitionRepository,
    definitionCacheTtlMs: apiEnv.CACHE_TTL_MS,
    onIndexHint: (hint) => {
      server.log.warn(
        {
          collection: hint.collection,
          tenantId: hint.tenantId,
          filters: hint.filters,
          sort: hint.sort,
          suggestedFields: hint.suggestedFields,
        },
        hint.message,
      );
    },
    repositories: options.repositories,
    queryExecutors: options.queryExecutors,
  });

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
  };

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
  });

  await registerEntityDefinitionRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
  });

  await registerHookRoutes(server, {
    authenticate,
    permissionDeps,
    entityRuntime,
    hookRuntime,
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

  for (const entity of getAllEntities()) {
    const repository = runtimeMaps.repositories[entity.name];
    if (!repository) {
      throw new Error(`Missing repository for entity "${entity.name}".`);
    }

    await registerCrudRoutes(server, {
      entity: {
        name: entity.name,
        schema: entity.schema,
        createSchema: entity.createSchema,
        updateSchema: entity.updateSchema,
        businessFieldNames: Object.keys(entity.metadata.fields),
      },
      repository,
      authenticate,
      authorize: createEntityPermissionGuards(permissionDeps, entity.name),
      relations: relationContext.hooksFor(entity.name),
      queryEngine: queryContext.queryEngine,
      referencePopulator: {
        getEntityDefinition: (name, tenantId) =>
          entityRuntime.getEntityDefinition(name, tenantId),
        getRepository: (tenantId, entityName) =>
          entityRuntime.getRepository(tenantId, entityName),
      },
      crudHooks,
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

  const dynamicDefinitions =
    options.repositories != null
      ? await entityDefinitionRepository.list("tenant_dev_1")
      : [];
  for (const record of dynamicDefinitions) {
    await entityRuntime.syncDefinition(record);
  }

  return server;
}
