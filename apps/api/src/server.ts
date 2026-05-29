import cors from "@fastify/cors";
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
} from "@repo/firestore-converters";
import {
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminHookRepository,
  createFirestoreAdminJoinCollectionRepository,
  createFirestoreAdminPlatformRoleRepository,
  createFirestoreAdminRegisteredUserRepository,
} from "@repo/gcp-firebase";
import { type RoleCatalog, type UserAccessProfile } from "@repo/rbac";

import { platformApp } from "@app/platform/app.config.js";
import { bootstrapPlatformApp } from "@app/platform/bootstrap.js";
import { seedPlatformRoles } from "./admin/seed-platform-roles.js";
import { seedPlatformTenants } from "./admin/seed-platform-tenants.js";
import { createAuthenticatePreHandler } from "./auth/authenticate-request.js";
import { apiEnv } from "./config/env.js";
import { registerCrudErrorHandler, registerCrudRoutes } from "./crud/index.js";
import { createEntityRuntimeMaps } from "./entities/create-entity-runtime-maps.js";
import {
  createEntityRuntimeContext,
  type EntityRuntimeContext,
} from "./entities/entity-runtime-context.js";
import { registerDynamicEntityCrudRoutes } from "./entities/register-dynamic-entity-crud-routes.js";
import { registerListEntitiesRoute } from "./entities/list-entities.route.js";
import { registerEntityDefinitionRoutes } from "./entities/register-entity-definition-routes.js";
import type { CrudHookDeps } from "./hooks/crud-hook-deps.types.js";
import { createHookRuntimeContext } from "./hooks/hook-runtime-context.js";
import { registerHookRoutes } from "./hooks/register-hook-routes.js";
import { registerModuleRoutes } from "./modules/register-module-routes.js";
import {
  createEntityPermissionGuards,
  createLoadRequestPermissionsDeps,
  type LoadRequestPermissionsDeps,
} from "./rbac/index.js";
import { createRoleCatalogLoader } from "./rbac/role-catalog.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { authSelectTenantRoute } from "./routes/auth-select-tenant.route.js";
import { authValidateRoute } from "./routes/auth-validate.route.js";

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
  readonly getRoleCatalog?: () => Promise<RoleCatalog>;
  readonly skipPlatformRoleSeed?: boolean;
  readonly skipPlatformTenantSeed?: boolean;
}

function buildPermissionDeps(
  options: BuildServerOptions,
  registeredUserRepository: ReturnType<
    typeof createFirestoreAdminRegisteredUserRepository
  >,
  loadRoleCatalog: () => Promise<RoleCatalog>,
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
        );

  return {
    ...baseDeps,
    getKnownPermissions: (tenantId) =>
      entityRuntime.getKnownPermissions(tenantId),
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
  });

  const firebaseAdminConfig = {
    projectId: apiEnv.GCP_PROJECT_ID,
    authEmulatorHost: apiEnv.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: apiEnv.FIRESTORE_EMULATOR_HOST,
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
  const loadRoleCatalog =
    options.getRoleCatalog ?? createRoleCatalogLoader(platformRoleRepository);

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

  const hookRuntime = createHookRuntimeContext(hookRepository);

  const entityRuntime = createEntityRuntimeContext({
    firebaseAdminConfig,
    entityDefinitionRepository,
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
  const queryContext = entityRuntime.createQueryContext();
  const crudHooks: CrudHookDeps = {
    hookRuntime,
    entityRuntime,
    permissionDeps,
  };

  await server.register(authValidateRoute, {
    firebaseAdminConfig,
    permissionDeps,
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
      entity,
      repository,
      authenticate,
      authorize: createEntityPermissionGuards(permissionDeps, entity.name),
      relations: relationContext.hooksFor(entity.name),
      queryEngine: queryContext.queryEngine,
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

  const dynamicDefinitions =
    options.repositories != null
      ? await entityDefinitionRepository.list("tenant_dev_1")
      : [];
  for (const record of dynamicDefinitions) {
    await entityRuntime.syncDefinition(record);
  }

  return server;
}
