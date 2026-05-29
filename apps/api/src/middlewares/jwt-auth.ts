import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createFirestoreAdminRegisteredUserRepository,
  verifyFirebaseIdToken,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import {
  resolveEffectiveUserRole,
  resolveRoleFromTokenClaims,
} from "../services/role-claims-sync.service.js";

const AUTH_FAILED = {
  error: { code: "AUTH_FAILED", message: "Authentication failed" },
} as const;

const ACCOUNT_INACTIVE = {
  error: {
    code: "ACCOUNT_INACTIVE",
    message: "Your account is inactive. Please contact an administrator.",
  },
} as const;

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function createJwtAuthMiddleware(config: FirebaseAdminConfig) {
  const registeredUserRepository =
    createFirestoreAdminRegisteredUserRepository(config);

  return async function jwtAuthMiddleware(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const idToken = extractBearerToken(req.headers.authorization);
    if (!idToken) {
      reply.status(401).send(AUTH_FAILED);
      return;
    }

    try {
      const decoded = await verifyFirebaseIdToken(idToken, config);
      const registeredUser = await registeredUserRepository.getByUid(
        decoded.uid,
      );

      if (!registeredUser) {
        req.log.warn({ uid: decoded.uid }, "Auth failed: user not found");
        reply.status(401).send(AUTH_FAILED);
        return;
      }

      if (registeredUser.disabled) {
        req.log.warn({ uid: decoded.uid }, "Auth failed: account disabled");
        reply.status(403).send(ACCOUNT_INACTIVE);
        return;
      }

      const tokenRole = resolveRoleFromTokenClaims(
        decoded as Record<string, unknown>,
      );
      const role = resolveEffectiveUserRole(
        tokenRole,
        registeredUser.role,
        registeredUser.lastClaimsSyncAt,
        decoded.auth_time,
      );

      req.user = {
        uid: registeredUser.uid,
        email: registeredUser.email,
        role,
      };
    } catch (error) {
      req.log.warn(
        { error: error instanceof Error ? error.message : "unknown" },
        "Auth failed: token verification error",
      );
      reply.status(401).send(AUTH_FAILED);
    }
  };
}
