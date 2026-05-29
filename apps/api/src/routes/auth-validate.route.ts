import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import {
  createFirestoreAdminRegisteredUserRepository,
  getFirebaseUserRecord,
  mapFirebaseUserRecordToAuthUserProjection,
  verifyFirebaseAppCheckToken,
  verifyFirebaseIdToken,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { extractBearerToken } from "../auth/extract-bearer-token.js";
import { buildAuthSessionContext } from "../auth/build-auth-session-context.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

const headerSchema = z.object({
  authorization: z.string().min(1),
  "x-firebase-appcheck": z.string().min(1),
});

export const authValidateRoute: FastifyPluginAsync<{
  firebaseAdminConfig: FirebaseAdminConfig;
  permissionDeps: LoadRequestPermissionsDeps;
}> = async (fastify, opts) => {
  const registeredUserRepository = createFirestoreAdminRegisteredUserRepository(
    opts.firebaseAdminConfig,
  );

  fastify.get("/auth/validate", async (request, reply) => {
    const parsedHeaders = headerSchema.safeParse(request.headers);

    if (!parsedHeaders.success) {
      return reply.status(401).send({
        ok: false,
        code: "MISSING_AUTH_HEADERS",
        message: "Authorization and X-Firebase-AppCheck headers are required.",
      });
    }

    const idToken = extractBearerToken(parsedHeaders.data.authorization);
    if (!idToken) {
      return reply.status(401).send({
        ok: false,
        code: "INVALID_AUTH_HEADER",
        message: "Authorization header must be a Bearer token.",
      });
    }

    try {
      const [decodedIdToken, decodedAppCheck, roleCatalog] = await Promise.all([
        verifyFirebaseIdToken(idToken, opts.firebaseAdminConfig),
        verifyFirebaseAppCheckToken(
          parsedHeaders.data["x-firebase-appcheck"],
          opts.firebaseAdminConfig,
        ),
        opts.permissionDeps.getRoleCatalog(),
      ]);
      const authUserRecord = await getFirebaseUserRecord(
        decodedIdToken.uid,
        opts.firebaseAdminConfig,
      );
      const upsertResult = await registeredUserRepository.upsertFromAuthUser(
        mapFirebaseUserRecordToAuthUserProjection(authUserRecord),
      );

      const tenantClaim = decodedIdToken.tenantId;
      const jwtTenantId =
        typeof tenantClaim === "string" ? tenantClaim.trim() : "";

      const session = await buildAuthSessionContext({
        registeredUser: upsertResult.user,
        created: upsertResult.created,
        jwtTenantId,
        roleCatalog,
        firebaseAdminConfig: opts.firebaseAdminConfig,
        registeredUserRepository,
      });

      return reply.send({
        ok: true,
        user: {
          uid: session.user.uid,
          email: session.user.email,
          permissions: session.permissions,
          isSuperAdmin: session.isSuperAdmin,
          tenantId: session.tenantId,
          availableTenants: session.availableTenants,
        },
        appCheck: {
          appId: decodedAppCheck.appId,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Token verification failed.";
      return reply.status(401).send({
        ok: false,
        code: "TOKEN_VERIFICATION_FAILED",
        message,
      });
    }
  });
};
