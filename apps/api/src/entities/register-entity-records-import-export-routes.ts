import type {
  FastifyInstance,
  FastifyReply,
  preHandlerAsyncHookHandler,
} from "fastify";
import { RelationError } from "@repo/entity-relations";
import { z } from "zod";

import { createRequireSuperAdmin } from "../admin/require-superadmin.js";
import type { AggregationEmitterDeps } from "../aggregation/emit-aggregation-event.js";
import { requireRequestTenant } from "../auth/resolve-target-tenant-id.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { parseOrFormatError } from "../crud/validation.js";
import type { CrudHookDeps } from "../hooks/crud-hook-deps.types.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { QueryEngine } from "@repo/query-engine";

import type { createRelationRuntimeContext } from "../relations/create-relation-services.js";
import {
  exportEntityRecordsJson,
  importEntityRecordsJson,
} from "./import-export-entity-records.js";
import type { EntityRuntimeContext } from "./entity-runtime-context.js";
import type { TenantIndexGuard } from "../indexes/create-tenant-index-guard.js";

const entityNameParamsSchema = z.object({
  entityName: z.string().trim().min(1),
});

interface RegisterEntityRecordsImportExportRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly relationContext: ReturnType<typeof createRelationRuntimeContext>;
  readonly queryEngine?: QueryEngine;
  readonly crudHooks?: CrudHookDeps;
  readonly aggregation?: AggregationEmitterDeps;
  readonly tenantIndexGuard?: TenantIndexGuard;
}

function handleRelationError(reply: FastifyReply, error: unknown): boolean {
  if (error instanceof RelationError) {
    replyWithError(reply, 400, error.code as ApiErrorCode, error.message);
    return true;
  }
  return false;
}

export async function registerEntityRecordsImportExportRoutes(
  app: FastifyInstance,
  options: RegisterEntityRecordsImportExportRoutesOptions,
): Promise<void> {
  const requireSuperAdmin = createRequireSuperAdmin(options.permissionDeps);
  const deps = {
    entityRuntime: options.entityRuntime,
    relationContext: options.relationContext,
    queryEngine: options.queryEngine,
    crudHooks: options.crudHooks,
    aggregation: options.aggregation,
  };

  app.get(
    "/api/:entityName/export-json",
    { preHandler: [options.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) return;

      const parsedParams = parseOrFormatError(
        entityNameParamsSchema,
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

      const ctx = request.ctx;
      if (!ctx?.uid) {
        return replyWithError(
          reply,
          401,
          ApiErrorCode.UNAUTHORIZED,
          "Authentication required.",
        );
      }

      try {
        const envelope = await exportEntityRecordsJson(
          deps,
          tenantId,
          parsedParams.data.entityName,
          {
            userId: ctx.uid,
            tenantId,
            permissions: ctx.permissions ?? [],
            ...(ctx.isSuperAdmin ? { isSuperAdmin: true } : {}),
          },
        );
        return reply.send(successEnvelope(envelope));
      } catch (error) {
        if (error instanceof Error && error.message === "Entity not found.") {
          return replyWithError(
            reply,
            404,
            ApiErrorCode.NOT_FOUND,
            error.message,
          );
        }
        if (handleRelationError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );

  app.post(
    "/api/:entityName/import-json",
    { preHandler: [options.authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const tenantId = requireRequestTenant(request, reply);
      if (!tenantId) return;

      const parsedParams = parseOrFormatError(
        entityNameParamsSchema,
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

      try {
        if (options.tenantIndexGuard) {
          await options.tenantIndexGuard.assertEnvironmentReady(
            tenantId,
            "import",
          );
        }
        const result = await importEntityRecordsJson(
          app,
          request,
          deps,
          tenantId,
          parsedParams.data.entityName,
          request.body,
        );

        if (!result.ok) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Import validation failed.",
            Object.fromEntries(
              result.errors.map((error) => [error.path, [error.message]]),
            ),
          );
        }

        return reply.send(successEnvelope(result.data));
      } catch (error) {
        if (options.tenantIndexGuard?.mapError(reply, error)) {
          return;
        }
        if (handleRelationError(reply, error)) {
          return;
        }
        throw error;
      }
    },
  );
}
