import Fastify from "fastify";

import { apiEnv } from "./config/env.js";
import { authValidateRoute } from "./routes/auth-validate.route.js";

interface BuildServerOptions {
  readonly logger?: boolean;
}

export async function buildServer(options: BuildServerOptions = {}) {
  const server = Fastify({
    logger: options.logger ?? true,
  });

  await server.register(authValidateRoute, {
    firebaseAdminConfig: {
      projectId: apiEnv.GCP_PROJECT_ID,
      authEmulatorHost: apiEnv.FIREBASE_AUTH_EMULATOR_HOST,
      firestoreEmulatorHost: apiEnv.FIRESTORE_EMULATOR_HOST,
    },
  });

  return server;
}
