import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { canAssignRole, canManageRole, isUserRole } from "@repo/rbac-app";
import {
  createFirestoreAdminRegisteredUserRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { createJwtAuthMiddleware } from "../middlewares/jwt-auth.js";
import { requirePermission } from "../middlewares/require-permission.js";
import { syncUserRoleClaims } from "../services/role-claims-sync.service.js";

export const userRoleUpdateRoute: FastifyPluginAsync<{
  firebaseAdminConfig: FirebaseAdminConfig;
}> = async (fastify, opts) => {
  const registeredUserRepository = createFirestoreAdminRegisteredUserRepository(
    opts.firebaseAdminConfig,
  );
  const jwtAuth = createJwtAuthMiddleware(opts.firebaseAdminConfig);

  const paramsSchema = z.object({
    uid: z.string().trim().min(1),
  });
  const bodySchema = z.object({
    role: z
      .string()
      .trim()
      .min(1)
      .refine(isUserRole, { message: "Unknown role." }),
  });

  fastify.patch(
    "/users/:uid/role",
    {
      preHandler: [jwtAuth, requirePermission("role:assign")],
    },
    async (request, reply) => {
      const parsedParams = paramsSchema.safeParse(request.params);
      const parsedBody = bodySchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.status(400).send({
          ok: false,
          code: "INVALID_REQUEST",
          message: "Invalid user role update payload.",
        });
      }

      if (!request.user) {
        return reply.status(401).send({ error: "Authentication required" });
      }

      const targetUser = await registeredUserRepository.getByUid(
        parsedParams.data.uid,
      );
      if (!targetUser) {
        return reply.status(404).send({
          ok: false,
          code: "USER_NOT_FOUND",
          message: "User was not found.",
        });
      }

      const { role: nextRole } = parsedBody.data;
      const actorRole = request.user.role;

      if (!canManageRole(actorRole, targetUser.role)) {
        return reply.status(403).send({ error: "Access denied" });
      }

      if (!canAssignRole(actorRole, nextRole)) {
        return reply.status(403).send({ error: "Access denied" });
      }

      let updatedUser = await registeredUserRepository.updateRole(
        targetUser.uid,
        nextRole,
      );
      updatedUser = await syncUserRoleClaims(
        updatedUser,
        opts.firebaseAdminConfig,
      );

      return reply.send({
        ok: true,
        user: {
          uid: updatedUser.uid,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      });
    },
  );
};
