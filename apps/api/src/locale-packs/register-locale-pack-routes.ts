import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  createLocalePackInputSchema,
  patchLocalePackInputSchema,
  validateLocalePacksCatalogEnvelope,
} from "@repo/locale-packs";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { LocalePackRuntimeContext } from "./locale-pack-runtime-context.js";
import {
  reconcileLocalePacks,
  reconcileLocalePacksBodySchema,
} from "./reconcile-locale-packs.js";
import {
  LocalePackCatalogReplaceError,
  replaceLocalePacksCatalog,
} from "./replace-locale-packs-catalog.js";

interface RegisterLocalePackRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly localePackRuntime: LocalePackRuntimeContext;
}

const tenantIdQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
});

export async function registerLocalePackRoutes(
  app: FastifyInstance,
  options: RegisterLocalePackRoutesOptions,
): Promise<void> {
  const requireCreate = createRequirePermission(
    options.permissionDeps,
    "localePack.create",
  );
  const requireUpdate = createRequirePermission(
    options.permissionDeps,
    "localePack.update",
  );
  const requireDelete = createRequirePermission(
    options.permissionDeps,
    "localePack.delete",
  );

  // Any authenticated tenant member can list packs (needed for LanguageSwitcher).
  app.get(
    "/api/locale-packs",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const parsedQuery = tenantIdQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid query parameters.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const [items, tenant] = await Promise.all([
        options.localePackRuntime.repository.list(tenantId),
        options.localePackRuntime.tenantRepository.getById(tenantId),
      ]);
      return reply.send(
        successEnvelope({
          items,
          defaultLocale: tenant?.defaultLocale?.trim() || "en",
        }),
      );
    },
  );

  app.get(
    "/api/locale-packs/:id",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const item = await options.localePackRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Locale pack not found.",
        );
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/locale-packs",
    { preHandler: [options.authenticate, requireCreate] },
    async (request, reply) => {
      const parsedBody = createLocalePackInputSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.error.flatten(),
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      try {
        const created = await options.localePackRuntime.repository.create(
          tenantId,
          parsedBody.data,
        );
        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create locale pack.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );

  app.patch(
    "/api/locale-packs/:id",
    { preHandler: [options.authenticate, requireUpdate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchLocalePackInputSchema.safeParse(request.body);
      if (!parsedParams.success || !parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
          parsedBody.success ? undefined : parsedBody.error.flatten(),
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const current = await options.localePackRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Locale pack not found.",
        );
      }

      try {
        const updated = await options.localePackRuntime.repository.update(
          tenantId,
          parsedParams.data.id,
          parsedBody.data,
        );
        return reply.send(successEnvelope(updated));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update locale pack.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );

  app.delete(
    "/api/locale-packs/:id",
    { preHandler: [options.authenticate, requireDelete] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid path parameters.",
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const current = await options.localePackRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Locale pack not found.",
        );
      }

      await options.localePackRuntime.repository.delete(
        tenantId,
        parsedParams.data.id,
      );
      return reply.status(204).send();
    },
  );

  app.put(
    "/api/locale-packs/catalog",
    {
      preHandler: [
        options.authenticate,
        requireCreate,
        requireUpdate,
        requireDelete,
      ],
    },
    async (request, reply) => {
      const parsedBody = validateLocalePacksCatalogEnvelope(request.body);
      if (!parsedBody.ok) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid locale pack catalog.",
          parsedBody.errors,
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      try {
        const result = await replaceLocalePacksCatalog(
          options.localePackRuntime,
          tenantId,
          parsedBody.data,
        );
        return reply.send(successEnvelope(result));
      } catch (error) {
        const message =
          error instanceof LocalePackCatalogReplaceError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to replace locale pack catalog.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );

  app.post(
    "/api/locale-packs/reconcile",
    {
      preHandler: [
        options.authenticate,
        requireCreate,
        requireUpdate,
        requireDelete,
      ],
    },
    async (request, reply) => {
      const parsedBody = reconcileLocalePacksBodySchema.safeParse(
        request.body ?? {},
      );
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Validation failed.",
          parsedBody.error.flatten(),
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      try {
        const result = await reconcileLocalePacks(
          options.localePackRuntime,
          tenantId,
          parsedBody.data,
        );
        return reply.send(successEnvelope(result));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to reconcile locale packs.";
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          message,
        );
      }
    },
  );
}
