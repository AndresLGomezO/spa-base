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

import { getBootstrapAdminEmails } from "../config/env.js";
import {
  resolveEffectiveUserRole,
  resolveInitialUserRole,
  resolveRoleFromTokenClaims,
  shouldSyncRoleClaims,
  syncUserRoleClaims,
} from "../services/role-claims-sync.service.js";

const headerSchema = z.object({
  authorization: z.string().min(1),
  "x-firebase-appcheck": z.string().min(1),
});

const bearerSchema = z.string().regex(/^Bearer\s+(.+)$/i);

function extractBearerToken(value: string): string | null {
  const parsed = bearerSchema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data.replace(/^Bearer\s+/i, "");
}

export const authValidateRoute: FastifyPluginAsync<{
  firebaseAdminConfig: FirebaseAdminConfig;
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
      const [decodedIdToken, decodedAppCheck] = await Promise.all([
        verifyFirebaseIdToken(idToken, opts.firebaseAdminConfig),
        verifyFirebaseAppCheckToken(
          parsedHeaders.data["x-firebase-appcheck"],
          opts.firebaseAdminConfig,
        ),
      ]);
      const authUserRecord = await getFirebaseUserRecord(
        decodedIdToken.uid,
        opts.firebaseAdminConfig,
      );
      const authUserProjection =
        mapFirebaseUserRecordToAuthUserProjection(authUserRecord);
      const existingUser = await registeredUserRepository.getByUid(
        authUserProjection.uid,
      );
      let registeredUser = await registeredUserRepository.upsertFromAuthUser(
        authUserProjection,
        existingUser
          ? undefined
          : {
              initialRole: resolveInitialUserRole(
                authUserProjection.email,
                getBootstrapAdminEmails(),
              ),
            },
      );

      if (
        shouldSyncRoleClaims(
          registeredUser.role,
          decodedIdToken as Record<string, unknown>,
        )
      ) {
        registeredUser = await syncUserRoleClaims(
          registeredUser,
          opts.firebaseAdminConfig,
        );
      }

      const tokenRole = resolveRoleFromTokenClaims(
        decodedIdToken as Record<string, unknown>,
      );
      const effectiveRole = resolveEffectiveUserRole(
        tokenRole,
        registeredUser.role,
        registeredUser.lastClaimsSyncAt,
        decodedIdToken.auth_time,
      );

      return reply.send({
        ok: true,
        user: {
          uid: registeredUser.uid,
          email: registeredUser.email,
          role: effectiveRole,
          claims: decodedIdToken,
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
