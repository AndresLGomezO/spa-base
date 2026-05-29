import cors from "@fastify/cors";
import Fastify from "fastify";

import { apiEnv } from "./config/env.js";
import { authValidateRoute } from "./routes/auth-validate.route.js";
import { userRoleUpdateRoute } from "./routes/user-role-update.route.js";

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

  await server.register(authValidateRoute, { firebaseAdminConfig });
  await server.register(userRoleUpdateRoute, { firebaseAdminConfig });

  return server;
}
