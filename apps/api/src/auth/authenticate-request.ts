import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import {
  verifyFirebaseAppCheckToken,
  verifyFirebaseIdToken,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { extractBearerToken } from "./extract-bearer-token.js";
import type { RequestContext } from "./request-context.js";

const headerSchema = z.object({
  authorization: z.string().min(1),
  "x-firebase-appcheck": z.string().min(1),
});

interface AuthenticateOptions {
  readonly requireTenant?: boolean;
}

export function createAuthenticatePreHandler(
  config: FirebaseAdminConfig,
  options: AuthenticateOptions = {},
) {
  const requireTenant = options.requireTenant ?? true;

  return async function authenticateRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const parsedHeaders = headerSchema.safeParse(request.headers);

    if (!parsedHeaders.success) {
      reply.status(401).send({
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message:
            "Authorization and X-Firebase-AppCheck headers are required.",
        },
      });
      return;
    }

    const idToken = extractBearerToken(parsedHeaders.data.authorization);
    if (!idToken) {
      reply.status(401).send({
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Authorization header must be a Bearer token.",
        },
      });
      return;
    }

    try {
      const [decodedIdToken, decodedAppCheck] = await Promise.all([
        verifyFirebaseIdToken(idToken, config),
        verifyFirebaseAppCheckToken(
          parsedHeaders.data["x-firebase-appcheck"],
          config,
        ),
      ]);

      const claims = decodedIdToken as Record<string, unknown>;
      const uid =
        typeof claims.uid === "string" && claims.uid.length > 0
          ? claims.uid
          : null;

      if (!uid) {
        reply.status(401).send({
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message: "Token is missing a valid uid claim.",
          },
        });
        return;
      }

      const tenantClaim = claims.tenantId;
      const tenantId =
        typeof tenantClaim === "string" ? tenantClaim.trim() : "";

      if (requireTenant && tenantId.length === 0) {
        reply.status(403).send({
          data: null,
          error: {
            code: "TENANT_NOT_RESOLVED",
            message: "Token is missing a valid tenantId custom claim.",
          },
        });
        return;
      }

      const ctx: RequestContext = {
        uid,
        tenantId,
        claims: {
          ...claims,
          appCheckAppId: decodedAppCheck.appId,
        },
      };

      request.ctx = ctx;
    } catch {
      reply.status(401).send({
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Token verification failed.",
        },
      });
    }
  };
}
