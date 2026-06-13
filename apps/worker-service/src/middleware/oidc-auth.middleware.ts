import type { FastifyRequest, FastifyReply } from "fastify";

import { authConfig } from "../config/env.js";

export async function oidcAuthHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!authConfig.authEnabled) return;

  if (authConfig.allowLocalTaskBypass) {
    const localTask =
      request.headers["x-local-task-dispatcher"] === "true" ||
      Boolean(request.headers["x-cloudtasks-queuename"]);
    const directCall = request.headers["x-direct-call"] === "true";
    if (localTask || directCall) return;
  }

  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    request.log.warn("OIDC auth: missing or malformed Authorization header");
    reply.status(403).send({ error: "Forbidden" });
    return;
  }

  const email = decodeOidcEmail(header.substring(7));
  if (!email || email !== authConfig.serviceAccountEmail) {
    request.log.warn(
      { received: email ?? "null", expected: authConfig.serviceAccountEmail },
      "OIDC auth: email mismatch or decode failure",
    );
    reply.status(403).send({ error: "Forbidden" });
  }
}

function decodeOidcEmail(token: string): string | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;

    const decoded = JSON.parse(
      Buffer.from(segment, "base64url").toString("utf-8"),
    ) as { email?: unknown };
    return typeof decoded.email === "string" ? decoded.email : null;
  } catch {
    return null;
  }
}
