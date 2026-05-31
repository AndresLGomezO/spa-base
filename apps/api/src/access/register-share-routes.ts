import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { z } from "zod";

import type { RequestContext } from "../auth/request-context.js";
import { requireRequestTenant } from "../auth/resolve-target-tenant-id.js";
import { ApiErrorCode } from "../crud/errors.js";
import { noopPreHandler } from "../crud/noop-pre-handler.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { parseOrFormatError } from "../crud/validation.js";
import { toRecordAccessContext } from "./crud-access.js";
import { ShareError, type ShareService } from "./share-service.js";

const shareBodySchema = z.object({
  userId: z.string().trim().min(1),
  permission: z.enum(["read", "write"]),
});

const shareParamsSchema = z.object({
  entityName: z.string().trim().min(1).optional(),
  id: z.string().trim().min(1),
  userId: z.string().trim().min(1).optional(),
});

interface RegisterShareRoutesOptions {
  readonly routeEntityName?: string;
  readonly parametricEntityName?: boolean;
  readonly prefix?: string;
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly authorize?: preHandlerAsyncHookHandler;
  readonly shareService: ShareService;
  readonly resolveEntityName: (
    request: FastifyRequest,
    tenantId: string,
  ) => string | null;
}

function mapShareError(reply: FastifyReply, error: unknown): boolean {
  if (!(error instanceof ShareError)) {
    return false;
  }

  const statusCode =
    error.code === "NOT_FOUND"
      ? 404
      : error.code === "FORBIDDEN"
        ? 403
        : error.code === "SHARE_LIMIT"
          ? 400
          : 400;

  replyWithError(
    reply,
    statusCode,
    error.code === "FORBIDDEN"
      ? ApiErrorCode.QUERY_FORBIDDEN
      : error.code === "NOT_FOUND"
        ? ApiErrorCode.NOT_FOUND
        : ApiErrorCode.VALIDATION_ERROR,
    error.message,
  );
  return true;
}

function buildShareContext(request: FastifyRequest): RequestContext | null {
  return request.ctx ?? null;
}

export async function registerShareRoutes(
  app: FastifyInstance,
  options: RegisterShareRoutesOptions,
): Promise<void> {
  const routePrefix = options.prefix ?? "/api";
  const basePath = options.parametricEntityName
    ? `${routePrefix}/:entityName`
    : `${routePrefix}/${options.routeEntityName ?? "entityName"}`;
  const preHandlers = [
    options.authenticate,
    options.authorize ?? noopPreHandler,
  ];

  app.get(
    `${basePath}/:id/share`,
    { preHandler: preHandlers },
    async (request, reply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) return;

      const ctx = buildShareContext(request);
      if (!ctx) {
        return replyWithError(
          reply,
          401,
          ApiErrorCode.UNAUTHORIZED,
          "Authentication required.",
        );
      }

      const parsedParams = parseOrFormatError(
        z.object({
          entityName: z.string().trim().min(1).optional(),
          id: z.string().trim().min(1),
        }),
        request.params,
      );
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
          parsedParams.details,
        );
      }

      const entityName =
        options.resolveEntityName(request, tenantId) ??
        parsedParams.data.entityName;
      if (!entityName) {
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
          entityName,
          recordId: parsedParams.data.id,
          context: toRecordAccessContext(ctx),
        });
        return reply.send(successEnvelope({ shares }));
      } catch (error) {
        if (mapShareError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );

  app.post(
    `${basePath}/:id/share`,
    { preHandler: preHandlers },
    async (request, reply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) return;

      const ctx = buildShareContext(request);
      if (!ctx) {
        return replyWithError(
          reply,
          401,
          ApiErrorCode.UNAUTHORIZED,
          "Authentication required.",
        );
      }

      const parsedParams = parseOrFormatError(
        z.object({
          entityName: z.string().trim().min(1).optional(),
          id: z.string().trim().min(1),
        }),
        request.params,
      );
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
          parsedParams.details,
        );
      }

      const parsedBody = parseOrFormatError(shareBodySchema, request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.details,
        );
      }

      const entityName =
        options.resolveEntityName(request, tenantId) ??
        parsedParams.data.entityName;
      if (!entityName) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }

      try {
        const shares = await options.shareService.grantShare({
          tenantId,
          entityName,
          recordId: parsedParams.data.id,
          targetUserId: parsedBody.data.userId,
          permission: parsedBody.data.permission,
          context: toRecordAccessContext(ctx),
        });
        return reply.send(successEnvelope({ shares }));
      } catch (error) {
        if (mapShareError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );

  app.delete(
    `${basePath}/:id/share/:userId`,
    { preHandler: preHandlers },
    async (request, reply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) return;

      const ctx = buildShareContext(request);
      if (!ctx) {
        return replyWithError(
          reply,
          401,
          ApiErrorCode.UNAUTHORIZED,
          "Authentication required.",
        );
      }

      const parsedParams = parseOrFormatError(
        shareParamsSchema,
        request.params,
      );
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
          parsedParams.details,
        );
      }

      const entityName =
        options.resolveEntityName(request, tenantId) ??
        parsedParams.data.entityName;
      if (!entityName || !parsedParams.data.userId) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Entity not found.",
        );
      }

      try {
        const shares = await options.shareService.revokeShare({
          tenantId,
          entityName,
          recordId: parsedParams.data.id,
          targetUserId: parsedParams.data.userId,
          context: toRecordAccessContext(ctx),
        });
        return reply.send(successEnvelope({ shares }));
      } catch (error) {
        if (mapShareError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );
}
