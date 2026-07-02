import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  aiJobProgressSchema,
  aiJobStepTraceSchema,
  uiBuilderDraftSchema,
} from "@repo/ai-engine/schemas";
import type {
  AiJobRepository,
  AuditLogRepository,
  DataHookExecutionRepository,
  HookLogMessageRepository,
  RequestPerfLogRepository,
  IndexProvisionEventRepository,
} from "@repo/firestore-converters";
import { hasPermission } from "@repo/rbac";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequireAnyPermission } from "../rbac/create-require-any-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import {
  mergeDebugEvents,
  parseDebugSources,
  toAiDebugEvent,
  toAuditDebugEvent,
  toHookExecutionDebugEvent,
  toHookLogDebugEvent,
  toIndexProvisionDebugEvent,
  toRequestPerfDebugEvent,
} from "./build-debug-events.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { resolveEntityCollection } from "@repo/firestore-indexes";

interface RegisterDebugRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly aiJobRepository: AiJobRepository;
  readonly hookExecutionRepository: DataHookExecutionRepository;
  readonly hookLogMessageRepository: HookLogMessageRepository;
  readonly auditLogRepository: AuditLogRepository;
  readonly requestPerfLogRepository: RequestPerfLogRepository;
  readonly indexProvisionEventRepository: IndexProvisionEventRepository;
  readonly entityRuntime: EntityRuntimeContext;
}

const eventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sources: z.string().trim().optional(),
});

export async function registerDebugRoutes(
  app: FastifyInstance,
  options: RegisterDebugRoutesOptions,
): Promise<void> {
  const requireDebugRead = createRequireAnyPermission(options.permissionDeps, [
    "debug.read",
    "ai.uiBuilder.read",
    "ai.chat.read",
    "hook.read",
  ]);

  app.get(
    "/api/debug/events",
    {
      preHandler: [options.authenticate, requireDebugRead],
    },
    async (request, reply) => {
      const parsedQuery = eventsQuerySchema.safeParse(request.query);
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

      const permissions = request.ctx?.permissions ?? [];
      const isSuperAdmin = request.ctx?.isSuperAdmin ?? false;
      const limit = parsedQuery.data.limit;
      const sources = parseDebugSources(parsedQuery.data.sources);
      const perSourceLimit = Math.min(limit, 50);
      const groups: Awaited<ReturnType<typeof toAiDebugEvent>>[][] = [];

      const canReadAi =
        hasPermission("debug.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.uiBuilder.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.chat.read", permissions, { isSuperAdmin });

      const canReadHooks =
        hasPermission("debug.read", permissions, { isSuperAdmin }) ||
        hasPermission("hook.read", permissions, { isSuperAdmin });

      const canReadSensitive = hasPermission("debug.read", permissions, {
        isSuperAdmin,
      });

      if (sources.includes("ai") && canReadAi) {
        const jobs = await options.aiJobRepository.listRecent(tenantId, {
          limit: perSourceLimit,
        });
        groups.push(jobs.map(toAiDebugEvent));
      }

      if (sources.includes("hookExecution") && canReadHooks) {
        const executions = await options.hookExecutionRepository.listRecent(
          tenantId,
          { limit: perSourceLimit },
        );
        groups.push(executions.map(toHookExecutionDebugEvent));
      }

      if (sources.includes("hookLog") && canReadHooks) {
        const logs = await options.hookLogMessageRepository.listRecent(
          tenantId,
          { limit: perSourceLimit },
        );
        groups.push(logs.map(toHookLogDebugEvent));
      }

      if (sources.includes("audit") && canReadSensitive) {
        const audits = await options.auditLogRepository.listRecent(tenantId, {
          limit: perSourceLimit,
        });
        groups.push(audits.map(toAuditDebugEvent));
      }

      if (sources.includes("requestPerf") && canReadSensitive) {
        const perfLogs = await options.requestPerfLogRepository.listRecent(
          tenantId,
          { limit: perSourceLimit },
        );
        groups.push(perfLogs.map(toRequestPerfDebugEvent));
      }

      if (sources.includes("indexProvision") && canReadSensitive) {
        const tenantCollections = [
          ...new Set(
            options.entityRuntime
              .getEntitiesForTenant(tenantId)
              .map((entity) => resolveEntityCollection(entity)),
          ),
        ];
        const indexEvents =
          await options.indexProvisionEventRepository.listRecentForTenant(
            tenantId,
            tenantCollections,
            { limit: perSourceLimit },
          );
        groups.push(indexEvents.map(toIndexProvisionDebugEvent));
      }

      return reply.send(
        successEnvelope({
          items: mergeDebugEvents(groups, limit),
        }),
      );
    },
  );

  app.get(
    "/api/debug/ai-jobs/:jobId",
    {
      preHandler: [options.authenticate, requireDebugRead],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const jobId = (request.params as { jobId?: string }).jobId?.trim();
      if (!jobId) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Job id is required.",
        );
      }

      const permissions = request.ctx?.permissions ?? [];
      const isSuperAdmin = request.ctx?.isSuperAdmin ?? false;

      const job = await options.aiJobRepository.getById(tenantId, jobId);
      if (!job) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "AI job not found.",
        );
      }

      const canReadJob =
        hasPermission("debug.read", permissions, { isSuperAdmin }) ||
        (job.feature === "chat" &&
          hasPermission("ai.chat.read", permissions, { isSuperAdmin })) ||
        (job.feature === "uiBuilder" &&
          hasPermission("ai.uiBuilder.read", permissions, { isSuperAdmin }));

      if (!canReadJob) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "You do not have permission to view this AI job.",
        );
      }

      const canReadStepTrace =
        hasPermission("debug.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.uiBuilder.read", permissions, { isSuperAdmin });

      return reply.send(
        successEnvelope({
          id: job.id,
          status: job.status,
          feature: job.feature,
          input: job.input,
          output: job.output,
          error: job.error,
          progress: aiJobProgressSchema.nullable().safeParse(job.progress)
            .success
            ? (job.progress ?? null)
            : null,
          draft: uiBuilderDraftSchema.safeParse(job.draft ?? null).success
            ? (job.draft ?? null)
            : null,
          ...(canReadStepTrace &&
          aiJobStepTraceSchema.safeParse(job.stepTrace ?? []).success
            ? { stepTrace: job.stepTrace ?? [] }
            : {}),
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        }),
      );
    },
  );
}
