import cors from "@fastify/cors";
import Fastify from "fastify";

import { getAllEntities } from "@repo/entities";
import type {
  EntityQueryExecutor,
  JoinCollectionRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import {
  createFirestoreAdminJoinCollectionRepository,
  createFirestoreAdminPlatformRoleRepository,
  createFirestoreAdminRegisteredUserRepository,
} from "@repo/gcp-firebase";
import { type RoleCatalog, type UserAccessProfile } from "@repo/rbac";
import "@repo/shared-types/register-entities";

import { seedPlatformRoles } from "./admin/seed-platform-roles.js";
import { seedPlatformTenants } from "./admin/seed-platform-tenants.js";
import { createAuthenticatePreHandler } from "./auth/authenticate-request.js";
import { apiEnv } from "./config/env.js";
import { registerCrudErrorHandler, registerCrudRoutes } from "./crud/index.js";
import { createEntityRuntimeMaps } from "./entities/create-entity-runtime-maps.js";
import { registerListEntitiesRoute } from "./entities/list-entities.route.js";
import { createQueryRuntimeContext } from "./query/create-query-services.js";
import {
  createEntityPermissionGuards,
  createLoadRequestPermissionsDeps,
  type LoadRequestPermissionsDeps,
} from "./rbac/index.js";
import { createRoleCatalogLoader } from "./rbac/role-catalog.js";
import { createRelationRuntimeContext } from "./relations/create-relation-services.js";
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
  readonly getUserAccessProfile?: (
    uid: string,
  ) => Promise<UserAccessProfile | null>;
  readonly getRoleCatalog?: () => Promise<RoleCatalog>;
  readonly skipPlatformRoleSeed?: boolean;
  readonly skipPlatformTenantSeed?: boolean;
}

export async function buildServer(options: BuildServerOptions = {}) {
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

  const permissionDeps: LoadRequestPermissionsDeps =
    options.getUserAccessProfile
      ? {
          getUserAccessProfile: options.getUserAccessProfile,
          getRoleCatalog: loadRoleCatalog,
        }
      : createLoadRequestPermissionsDeps(
          registeredUserRepository,
          loadRoleCatalog,
        );

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
  const runtimeMaps = createEntityRuntimeMaps(firebaseAdminConfig, {
    repositories: options.repositories,
    queryExecutors: options.queryExecutors,
  });
  const joinRepository =
    options.joinRepository ??
    createFirestoreAdminJoinCollectionRepository(firebaseAdminConfig);
  const relationContext = createRelationRuntimeContext(
    runtimeMaps.repositories,
    joinRepository,
  );
  const queryContext = createQueryRuntimeContext(runtimeMaps.queryExecutors);

  await registerListEntitiesRoute(server, {
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
    });
  }

  return server;
}
