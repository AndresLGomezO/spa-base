import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import {
  isPlatformSuperAdmin,
  resolvePermissions,
  toUserAccessProfile,
} from "@repo/rbac";
import {
  createFirestoreAdminRegisteredUserRepository,
  getFirebaseUserRecord,
  mapFirebaseUserRecordToAuthUserProjection,
  setFirebaseUserCustomClaims,
  verifyFirebaseAppCheckToken,
  verifyFirebaseIdToken,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { extractBearerToken } from "../auth/extract-bearer-token.js";
import { canAccessTenant } from "../auth/build-auth-session-context.js";
import { listAvailableTenants } from "../admin/list-available-tenants.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

const headerSchema = z.object({
  authorization: z.string().min(1),
  "x-firebase-appcheck": z.string().min(1),
});

const bodySchema = z.object({
  tenantId: z.string().trim().min(1),
});

export const authSelectTenantRoute: FastifyPluginAsync<{
  firebaseAdminConfig: FirebaseAdminConfig;
  permissionDeps: LoadRequestPermissionsDeps;
}> = async (fastify, opts) => {
  const registeredUserRepository = createFirestoreAdminRegisteredUserRepository(
    opts.firebaseAdminConfig,
  );

  fastify.post("/auth/select-tenant", async (request, reply) => {
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

    const parsedBody = bodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({
        ok: false,
        code: "INVALID_BODY",
        message: "Request body must include a valid tenantId.",
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
      void decodedAppCheck;

      const authUserRecord = await getFirebaseUserRecord(
        decodedIdToken.uid,
        opts.firebaseAdminConfig,
      );
      const upsertResult = await registeredUserRepository.upsertFromAuthUser(
        mapFirebaseUserRecordToAuthUserProjection(authUserRecord),
      );
      const registeredUser = upsertResult.user;

      const requestedTenantId = parsedBody.data.tenantId;
      const accessProfile = toUserAccessProfile(registeredUser);
      const isSuperAdmin = isPlatformSuperAdmin(accessProfile.platformRole);

      const userTenantIds = Object.keys(registeredUser.tenants ?? {});
      const tenantAccess = await listAvailableTenants({
        config: opts.firebaseAdminConfig,
        isSuperAdmin,
        userTenantIds,
      });

      if (
        !canAccessTenant({
          isSuperAdmin,
          userTenantIds,
          requestedTenantId,
          availableTenantIds: tenantAccess.availableTenants,
        })
      ) {
        return reply.status(403).send({
          ok: false,
          code: "FORBIDDEN",
          message: "You do not have access to the requested tenant.",
        });
      }

      await setFirebaseUserCustomClaims(
        decodedIdToken.uid,
        { tenantId: requestedTenantId },
        opts.firebaseAdminConfig,
      );

      const roleCatalog =
        await opts.permissionDeps.getRoleCatalog(requestedTenantId);

      const permissions = resolvePermissions(
        {
          ...accessProfile,
          tenantId: requestedTenantId,
        },
        { roleCatalog },
      );

      return reply.send({
        ok: true,
        tenantId: requestedTenantId,
        availableTenants: tenantAccess.availableTenants,
        tenantOptions: tenantAccess.tenantOptions,
        permissions,
        isSuperAdmin,
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
