import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import type { QueryEngine } from "@repo/query-engine";

import type { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import type { RecordReadEnricher } from "../entity-files/create-entity-file-read-enricher.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import {
  CATALOG_SEARCH_DEFAULT_LIMIT,
  CATALOG_SEARCH_MAX_LIMIT,
  runCatalogSearch,
} from "./run-catalog-search.js";

const searchQuerySchema = z.object({
  q: z.string().trim().min(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(CATALOG_SEARCH_MAX_LIMIT)
    .optional(),
});

interface RegisterGlobalSearchRoutesOptions {
  readonly authenticate: ReturnType<typeof createAuthenticatePreHandler>;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly entityRuntime: EntityRuntimeContext;
  readonly queryEngine: QueryEngine;
  readonly recordReadEnricher?: RecordReadEnricher;
}

export async function registerGlobalSearchRoutes(
  app: FastifyInstance,
  options: RegisterGlobalSearchRoutesOptions,
): Promise<void> {
  const requireAnyEntityRead = createRequirePermission(
    options.permissionDeps,
    "*.read",
  );

  app.get(
    "/api/search",
    {
      preHandler: [
        options.authenticate,
        requireAnyEntityRead as preHandlerAsyncHookHandler,
      ],
    },
    async (request, reply) => {
      const tenantId = request.ctx?.tenantId?.trim();
      if (!tenantId) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.TENANT_NOT_RESOLVED,
          "Tenant context is required.",
        );
      }

      const parsed = searchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid search query.",
          parsed.error.flatten(),
        );
      }

      await options.entityRuntime.loadTenantDefinitions(tenantId);

      const enricher = options.recordReadEnricher;
      const items = await runCatalogSearch({
        query: parsed.data.q,
        limit: parsed.data.limit ?? CATALOG_SEARCH_DEFAULT_LIMIT,
        entities: options.entityRuntime.getEntitiesForTenant(tenantId),
        queryEngine: options.queryEngine,
        context: {
          userId: request.ctx!.uid,
          tenantId,
          permissions: request.ctx?.permissions ?? [],
          ...(request.ctx?.isSuperAdmin ? { isSuperAdmin: true } : {}),
        },
        ...(enricher
          ? {
              enrichRecords: async (
                entityName: string,
                records: readonly Record<string, unknown>[],
              ) =>
                enricher(records, {
                  entityName,
                  tenantId,
                  request,
                }),
            }
          : {}),
      });

      return reply.send(successEnvelope({ items }));
    },
  );
}
