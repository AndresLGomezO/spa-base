import type { FastifyReply, FastifyRequest } from "fastify";
import { hasPermission, type Permission } from "@repo/rbac-app";

const FORBIDDEN_RESPONSE = { error: "Access denied" } as const;
const AUTH_REQUIRED_RESPONSE = { error: "Authentication required" } as const;

export function requirePermission(permission: Permission) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<unknown> => {
    if (!req.user) {
      return reply.status(401).send(AUTH_REQUIRED_RESPONSE);
    }

    const { uid, role } = req.user;

    if (!hasPermission(role, permission)) {
      req.log.warn(
        {
          actor_uid: uid,
          permission_required: permission,
          actor_role: role,
          path: req.url,
        },
        "RBAC denied",
      );
      return reply.status(403).send(FORBIDDEN_RESPONSE);
    }
    return undefined;
  };
}

export function requireAnyPermission(permissions: readonly Permission[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<unknown> => {
    if (!req.user) {
      return reply.status(401).send(AUTH_REQUIRED_RESPONSE);
    }

    const { uid, role } = req.user;
    const hasAny = permissions.some((permission) =>
      hasPermission(role, permission),
    );

    if (!hasAny) {
      req.log.warn(
        {
          actor_uid: uid,
          permissions_required: permissions,
          actor_role: role,
          path: req.url,
        },
        "RBAC denied",
      );
      return reply.status(403).send(FORBIDDEN_RESPONSE);
    }
    return undefined;
  };
}
