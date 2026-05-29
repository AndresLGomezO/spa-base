import cors from "@fastify/cors";
import Fastify from "fastify";

import {
  customerConverter,
  orderConverter,
  type JoinCollectionRepository,
  type TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import {
  createFirestoreAdminEntityRepository,
  createFirestoreAdminJoinCollectionRepository,
  createFirestoreAdminPlatformRoleRepository,
  createFirestoreAdminRegisteredUserRepository,
} from "@repo/gcp-firebase";
import { type RoleCatalog, type UserAccessProfile } from "@repo/rbac";
import {
  CUSTOMERS_COLLECTION,
  Customer,
  ORDERS_COLLECTION,
  Order,
  type CustomerRecord,
  type CustomerUpdate,
  type OrderRecord,
  type OrderUpdate,
} from "@repo/shared-types";
import "@repo/shared-types/register-entities";

import { seedPlatformRoles } from "./admin/seed-platform-roles.js";
import { seedPlatformTenants } from "./admin/seed-platform-tenants.js";
import { createAuthenticatePreHandler } from "./auth/authenticate-request.js";
import { apiEnv } from "./config/env.js";
import { registerCrudErrorHandler, registerCrudRoutes } from "./crud/index.js";
import {
  createEntityPermissionGuards,
  createLoadRequestPermissionsDeps,
  type LoadRequestPermissionsDeps,
} from "./rbac/index.js";
import { createRoleCatalogLoader } from "./rbac/role-catalog.js";
import { createRelationRuntimeContext } from "./relations/create-relation-services.js";
import { createInMemoryJoinCollectionRepository } from "./repositories/in-memory-join-collection-repository.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { authSelectTenantRoute } from "./routes/auth-select-tenant.route.js";
import { authValidateRoute } from "./routes/auth-validate.route.js";

interface BuildServerOptions {
  readonly logger?: boolean;
  readonly repositories?: {
    readonly customer?: TenantScopedEntityRepository<
      CustomerRecord,
      CustomerUpdate
    >;
    readonly order?: TenantScopedEntityRepository<OrderRecord, OrderUpdate>;
  };
  readonly joinRepository?: JoinCollectionRepository;
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
  const customerAuthorize = createEntityPermissionGuards(
    permissionDeps,
    Customer.name,
  );
  const orderAuthorize = createEntityPermissionGuards(
    permissionDeps,
    Order.name,
  );

  const customerRepository =
    options.repositories?.customer ??
    createFirestoreAdminEntityRepository({
      config: firebaseAdminConfig,
      collection: CUSTOMERS_COLLECTION,
      converter: customerConverter,
    });
  const orderRepository =
    options.repositories?.order ??
    createFirestoreAdminEntityRepository({
      config: firebaseAdminConfig,
      collection: ORDERS_COLLECTION,
      converter: orderConverter,
    });
  const joinRepository =
    options.joinRepository ??
    createFirestoreAdminJoinCollectionRepository(firebaseAdminConfig);
  const relationContext = createRelationRuntimeContext(
    {
      customer: customerRepository,
      order: orderRepository,
    },
    joinRepository,
  );

  await registerCrudRoutes<CustomerRecord, CustomerUpdate>(server, {
    entity: Customer,
    repository: customerRepository,
    authenticate,
    authorize: customerAuthorize,
    relations: relationContext.hooksFor(Customer.name),
  });

  await registerCrudRoutes<OrderRecord, OrderUpdate>(server, {
    entity: Order,
    repository: orderRepository,
    authenticate,
    authorize: orderAuthorize,
    relations: relationContext.hooksFor(Order.name),
  });

  return server;
}
