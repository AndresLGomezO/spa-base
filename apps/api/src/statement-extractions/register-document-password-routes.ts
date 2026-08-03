import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { z } from "zod";

import {
  ATTACHMENT_DOCUMENT_TYPES,
  decodeDocumentPasswords,
  encodeDocumentPasswords,
  listDocumentTypesWithPassword,
} from "@repo/ai-context/document-extraction";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";

interface RegisterDocumentPasswordRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
}

const idParams = z.object({
  id: z.string().trim().min(1),
});

const documentTypeParams = z.object({
  id: z.string().trim().min(1),
  documentType: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase())
    .refine(
      (value) =>
        (ATTACHMENT_DOCUMENT_TYPES as readonly string[]).includes(value),
      "Invalid document type.",
    ),
});

const putBody = z.object({
  password: z.string().min(1).max(256),
});

async function loadFinancialItem(
  options: RegisterDocumentPasswordRoutesOptions,
  request: FastifyRequest,
  reply: FastifyReply,
  id: string,
): Promise<{
  readonly tenantId: string;
  readonly record: Record<string, unknown> & { readonly id: string };
} | null> {
  const tenantId = requireJwtTenant(request, reply);
  if (!tenantId) return null;

  await options.entityRuntime.loadTenantDefinitions(tenantId);
  const repo = options.entityRuntime.getRepository(tenantId, "financialItem");
  if (!repo) {
    await replyWithError(
      reply,
      500,
      ApiErrorCode.INTERNAL_ERROR,
      "financialItem repository is unavailable.",
    );
    return null;
  }

  const record = await repo.findById(id, tenantId);
  if (!record) {
    await replyWithError(
      reply,
      404,
      ApiErrorCode.NOT_FOUND,
      "Financial item not found.",
    );
    return null;
  }

  return {
    tenantId,
    record: record as Record<string, unknown> & { readonly id: string },
  };
}

export async function registerDocumentPasswordRoutes(
  app: FastifyInstance,
  options: RegisterDocumentPasswordRoutesOptions,
): Promise<void> {
  const requireUpdate = createRequirePermission(
    options.permissionDeps,
    "financialItem.update",
  );

  app.get(
    "/api/financial-items/:id/document-passwords",
    {
      preHandler: [options.authenticate, requireUpdate],
    },
    async (request, reply) => {
      const parsedParams = idParams.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const loaded = await loadFinancialItem(
        options,
        request,
        reply,
        parsedParams.data.id,
      );
      if (!loaded) return;

      return reply.send(
        successEnvelope({
          documentTypes: listDocumentTypesWithPassword(
            loaded.record.documentPasswords,
          ),
        }),
      );
    },
  );

  app.put(
    "/api/financial-items/:id/document-passwords/:documentType",
    {
      preHandler: [options.authenticate, requireUpdate],
    },
    async (request, reply) => {
      const parsedParams = documentTypeParams.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }
      const parsedBody = putBody.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Password is required.",
        );
      }

      const loaded = await loadFinancialItem(
        options,
        request,
        reply,
        parsedParams.data.id,
      );
      if (!loaded) return;

      const repo = options.entityRuntime.getRepository(
        loaded.tenantId,
        "financialItem",
      );
      if (!repo) {
        return replyWithError(
          reply,
          500,
          ApiErrorCode.INTERNAL_ERROR,
          "financialItem repository is unavailable.",
        );
      }

      const nextMap = {
        ...decodeDocumentPasswords(loaded.record.documentPasswords),
        [parsedParams.data.documentType]: parsedBody.data.password,
      };

      await repo.update(loaded.record.id, loaded.tenantId, {
        documentPasswords: encodeDocumentPasswords(nextMap),
      });

      return reply.send(
        successEnvelope({
          documentTypes: listDocumentTypesWithPassword(
            encodeDocumentPasswords(nextMap),
          ),
        }),
      );
    },
  );

  app.delete(
    "/api/financial-items/:id/document-passwords/:documentType",
    {
      preHandler: [options.authenticate, requireUpdate],
    },
    async (request, reply) => {
      const parsedParams = documentTypeParams.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const loaded = await loadFinancialItem(
        options,
        request,
        reply,
        parsedParams.data.id,
      );
      if (!loaded) return;

      const repo = options.entityRuntime.getRepository(
        loaded.tenantId,
        "financialItem",
      );
      if (!repo) {
        return replyWithError(
          reply,
          500,
          ApiErrorCode.INTERNAL_ERROR,
          "financialItem repository is unavailable.",
        );
      }

      const nextMap = {
        ...decodeDocumentPasswords(loaded.record.documentPasswords),
      };
      delete nextMap[parsedParams.data.documentType];

      const encoded =
        Object.keys(nextMap).length > 0
          ? encodeDocumentPasswords(nextMap)
          : null;

      await repo.update(loaded.record.id, loaded.tenantId, {
        documentPasswords: encoded,
      });

      return reply.send(
        successEnvelope({
          documentTypes: listDocumentTypesWithPassword(encoded),
        }),
      );
    },
  );
}
