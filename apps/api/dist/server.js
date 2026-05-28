import Fastify from "fastify";
import { apiEnv } from "./config/env.js";
import { authValidateRoute } from "./routes/auth-validate.route.js";
export async function buildServer() {
    const server = Fastify({
        logger: true,
    });
    await server.register(authValidateRoute, {
        firebaseAdminConfig: {
            projectId: apiEnv.GCP_PROJECT_ID,
            authEmulatorHost: apiEnv.FIREBASE_AUTH_EMULATOR_HOST,
        },
    });
    return server;
}
