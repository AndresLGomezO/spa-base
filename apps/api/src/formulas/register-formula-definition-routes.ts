import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  createFormulaDefinitionInputSchema,
  patchFormulaDefinitionInputSchema,
  parsePlatformFormulaLibrary,
  validateFormulaCatalog,
  validateFormulaDefinitionsCatalogEnvelope,
} from "@repo/formula-definitions";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { FormulaRuntimeContext } from "./formula-runtime-context.js";
import {
  FormulaCatalogReplaceError,
  replaceFormulasCatalog,
} from "./replace-formulas-catalog.js";

interface RegisterFormulaDefinitionRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly formulaRuntime: FormulaRuntimeContext;
}

const tenantIdQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
});

export async function registerFormulaDefinitionRoutes(
  app: FastifyInstance,
  options: RegisterFormulaDefinitionRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(
    options.permissionDeps,
    "formula.read",
  );
  const requireCreate = createRequirePermission(
    options.permissionDeps,
    "formula.create",
  );
  const requireUpdate = createRequirePermission(
    options.permissionDeps,
    "formula.update",
  );
  const requireDelete = createRequirePermission(
    options.permissionDeps,
    "formula.delete",
  );

  app.get(
    "/api/formula-definitions",
    { preHandler: [options.authenticate, requireRead] },
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

      const tenantItems =
        await options.formulaRuntime.repository.list(tenantId);
      const platformItems = parsePlatformFormulaLibrary();
      return reply.send(
        successEnvelope({ items: [...platformItems, ...tenantItems] }),
      );
    },
  );

  app.get(
    "/api/formula-definitions/:id",
    { preHandler: [options.authenticate, requireRead] },
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

      const platformMatch = parsePlatformFormulaLibrary().find(
        (item) => item.id === parsedParams.data.id,
      );
      if (platformMatch) {
        return reply.send(successEnvelope(platformMatch));
      }

      const item = await options.formulaRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!item) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Formula definition not found.",
        );
      }

      return reply.send(successEnvelope(item));
    },
  );

  app.post(
    "/api/formula-definitions",
    { preHandler: [options.authenticate, requireCreate] },
    async (request, reply) => {
      const parsedBody = createFormulaDefinitionInputSchema.safeParse(
        request.body,
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

      const availableFormulaNames =
        await options.formulaRuntime.getAvailableFormulaNames(tenantId);
      const validationErrors = validateFormulaCatalog(
        [parsedBody.data],
        availableFormulaNames,
      );
      if (validationErrors.length > 0) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          validationErrors.map((error) => error.message).join(" "),
        );
      }

      try {
        const created = await options.formulaRuntime.repository.create(
          tenantId,
          parsedBody.data,
        );
        options.formulaRuntime.syncFormula(created);
        return reply.status(201).send(successEnvelope(created));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create formula definition.";
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
    "/api/formula-definitions/:id",
    { preHandler: [options.authenticate, requireUpdate] },
    async (request, reply) => {
      const parsedParams = z
        .object({ id: z.string().trim().min(1) })
        .safeParse(request.params);
      const parsedBody = patchFormulaDefinitionInputSchema.safeParse(
        request.body,
      );
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

      const current = await options.formulaRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Formula definition not found.",
        );
      }
      if (current.source === "platform") {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "Platform formulas are read-only.",
        );
      }

      try {
        const updated = await options.formulaRuntime.repository.update(
          tenantId,
          parsedParams.data.id,
          parsedBody.data,
        );
        options.formulaRuntime.syncFormula(updated);
        return reply.send(successEnvelope(updated));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update formula definition.";
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
    "/api/formula-definitions/:id",
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

      const current = await options.formulaRuntime.repository.getById(
        tenantId,
        parsedParams.data.id,
      );
      if (!current) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Formula definition not found.",
        );
      }
      if (current.source === "platform") {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "Platform formulas cannot be deleted.",
        );
      }

      await options.formulaRuntime.repository.delete(
        tenantId,
        parsedParams.data.id,
      );
      options.formulaRuntime.invalidateTenant(tenantId);
      return reply.status(204).send();
    },
  );

  app.put(
    "/api/formula-definitions/catalog",
    {
      preHandler: [
        options.authenticate,
        requireCreate,
        requireUpdate,
        requireDelete,
      ],
    },
    async (request, reply) => {
      const parsedBody = validateFormulaDefinitionsCatalogEnvelope(
        request.body,
      );
      if (!parsedBody.ok) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid formula catalog.",
          parsedBody.errors,
        );
      }

      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      try {
        const result = await replaceFormulasCatalog(
          options.formulaRuntime,
          tenantId,
          parsedBody.data,
        );
        return reply.send(successEnvelope(result));
      } catch (error) {
        const message =
          error instanceof FormulaCatalogReplaceError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to replace formula catalog.";
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
