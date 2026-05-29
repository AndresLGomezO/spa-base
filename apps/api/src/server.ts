import cors from "@fastify/cors";
import Fastify from "fastify";

import {
  customerConverter,
  orderConverter,
  type TenantScopedEntityRepository,
} from "@repo/firestore-converters";
import {
  createFirestoreAdminEntityRepository,
  createFirestoreAdminRegisteredUserRepository,
} from "@repo/gcp-firebase";
import type { UserAccessProfile } from "@repo/rbac";
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

import { createAuthenticatePreHandler } from "./auth/authenticate-request.js";
import { apiEnv } from "./config/env.js";
import { registerCrudErrorHandler, registerCrudRoutes } from "./crud/index.js";
import {
  createEntityPermissionGuards,
  createLoadRequestPermissionsDeps,
  type LoadRequestPermissionsDeps,
} from "./rbac/index.js";
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
  readonly getUserAccessProfile?: (
    uid: string,
  ) => Promise<UserAccessProfile | null>;
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

  const registeredUserRepository =
    createFirestoreAdminRegisteredUserRepository(firebaseAdminConfig);
  const permissionDeps: LoadRequestPermissionsDeps =
    options.getUserAccessProfile
      ? { getUserAccessProfile: options.getUserAccessProfile }
      : createLoadRequestPermissionsDeps(registeredUserRepository);

  await server.register(authValidateRoute, {
    firebaseAdminConfig,
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

  await registerCrudRoutes<CustomerRecord, CustomerUpdate>(server, {
    entity: Customer,
    repository:
      options.repositories?.customer ??
      createFirestoreAdminEntityRepository({
        config: firebaseAdminConfig,
        collection: CUSTOMERS_COLLECTION,
        converter: customerConverter,
      }),
    authenticate,
    authorize: customerAuthorize,
  });

  await registerCrudRoutes<OrderRecord, OrderUpdate>(server, {
    entity: Order,
    repository:
      options.repositories?.order ??
      createFirestoreAdminEntityRepository({
        config: firebaseAdminConfig,
        collection: ORDERS_COLLECTION,
        converter: orderConverter,
      }),
    authenticate,
    authorize: orderAuthorize,
  });

  return server;
}
