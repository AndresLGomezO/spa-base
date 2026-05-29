import cors from "@fastify/cors";
import Fastify from "fastify";

import {
  Customer,
  Order,
  type CustomerRecord,
  type CustomerUpdate,
  type OrderRecord,
  type OrderUpdate,
} from "@repo/shared-types";

import { createAuthenticatePreHandler } from "./auth/authenticate-request.js";
import { apiEnv } from "./config/env.js";
import { registerCrudErrorHandler, registerCrudRoutes } from "./crud/index.js";
import { createInMemoryEntityRepository } from "./repositories/in-memory-entity-repository.js";
import { authValidateRoute } from "./routes/auth-validate.route.js";

interface BuildServerOptions {
  readonly logger?: boolean;
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

  await server.register(authValidateRoute, {
    firebaseAdminConfig,
  });

  const authenticate = createAuthenticatePreHandler(firebaseAdminConfig);

  await registerCrudRoutes<CustomerRecord, CustomerUpdate>(server, {
    entity: Customer,
    repository: createInMemoryEntityRepository<CustomerRecord>(),
    authenticate,
  });

  await registerCrudRoutes<OrderRecord, OrderUpdate>(server, {
    entity: Order,
    repository: createInMemoryEntityRepository<OrderRecord>(),
    authenticate,
  });

  return server;
}
