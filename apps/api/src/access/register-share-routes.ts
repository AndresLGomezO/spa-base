import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { z } from "zod";

import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { requireRequestTenant } from "../auth/resolve-target-tenant-id.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import type { ShareService } from "./share-service.js";
import { ShareAccessError } from "./share-service.js";

const shareBodySchema = z.object({
  userId: z.string().trim().min(1),
  permission: z.enum(["read", "write"]),
});

const shareParamsSchema = z.object({
  entityName: z.string().trim().min(1),
  id: z.string().trim().min(1),
});

const revokeParamsSchema = z.object({
  entityName: z.string().trim().min(1),
  id: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

interface RegisterShareRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly shareService: ShareService;
  readonly entityRuntime: EntityRuntimeContext;
  readonly prefix?: string;
}

export function registerShareRoutes(
  app: FastifyInstance,
  options: RegisterShareRoutesOptions,
): void {
  const prefix = options.prefix ?? "/api";

  app.post(
    `${prefix}/:entityName/:id/share`,
    { preHandler: options.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) return;

      const params = shareParamsSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid parameters.",
        );
      }

      const body = shareBodySchema.safeParse(request.body);
      if (!body.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid share body. Expected { userId, permission }.",
        );
      }

      const entity = options.entityRuntime.resolveEntity(
        params.data.entityName,
        tenantId,
      );
      if (!entity) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }

      try {
        await options.shareService.grantShare({
          tenantId,
          collection: entity.metadata.collection,
          entityName: params.data.entityName,
          recordId: params.data.id,
          callerUserId: request.ctx?.uid ?? "",
          callerPermissions: request.ctx?.permissions ?? [],
          targetUserId: body.data.userId,
          permission: body.data.permission,
        });

        return reply.status(200).send(successEnvelope({ shared: true }));
      } catch (error) {
        if (error instanceof ShareAccessError) {
          return replyWithError(
            reply,
            403,
            ApiErrorCode.FORBIDDEN,
            error.message,
          );
        }
        throw error;
      }
    },
  );

  app.delete(
    `${prefix}/:entityName/:id/share/:userId`,
    { preHandler: options.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) return;

      const params = revokeParamsSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid parameters.",
        );
      }

      const entity = options.entityRuntime.resolveEntity(
        params.data.entityName,
        tenantId,
      );
      if (!entity) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }

      try {
        await options.shareService.revokeShare({
          tenantId,
          collection: entity.metadata.collection,
          entityName: params.data.entityName,
          recordId: params.data.id,
          callerUserId: request.ctx?.uid ?? "",
          callerPermissions: request.ctx?.permissions ?? [],
          targetUserId: params.data.userId,
        });

        return reply.status(200).send(successEnvelope({ revoked: true }));
      } catch (error) {
        if (error instanceof ShareAccessError) {
          return replyWithError(
            reply,
            403,
            ApiErrorCode.FORBIDDEN,
            error.message,
          );
        }
        throw error;
      }
    },
  );

  app.get(
    `${prefix}/:entityName/:id/share`,
    { preHandler: options.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) return;

      const params = shareParamsSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid parameters.",
        );
      }

      const entity = options.entityRuntime.resolveEntity(
        params.data.entityName,
        tenantId,
      );
      if (!entity) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }

      try {
        const shares = await options.shareService.listShares({
          tenantId,
          collection: entity.metadata.collection,
          entityName: params.data.entityName,
          recordId: params.data.id,
          callerUserId: request.ctx?.uid ?? "",
          callerPermissions: request.ctx?.permissions ?? [],
        });

        return reply.status(200).send(successEnvelope(shares));
      } catch (error) {
        if (error instanceof ShareAccessError) {
          return replyWithError(
            reply,
            403,
            ApiErrorCode.FORBIDDEN,
            error.message,
          );
        }
        throw error;
      }
    },
  );
}
