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
  DataHookExecutionActiveCounts,
  DataHookExecutionRepository,
  HookLogMessageRepository,
  RequestPerfLogRepository,
  IndexProvisionEventRepository,
} from "@repo/firestore-converters";
import type { EmailIngestJobRepository } from "@repo/gcp-firebase";
import {
  decodeHookExecutionListCursor,
  encodeHookExecutionListCursor,
  summarizeHookExecutions,
} from "@repo/firestore-converters";
import { hasPermission } from "@repo/rbac";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequireAnyPermission } from "../rbac/create-require-any-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import {
  mergeDebugEvents,
  mergeHookExecutionDebugEvents,
  parseDebugSources,
  toAiDebugEvent,
  toAuditDebugEvent,
  toEmailIngestDebugEvent,
  toHookLogDebugEvent,
  toIndexProvisionDebugEvent,
  toRequestPerfDebugEvent,
} from "./build-debug-events.js";
import {
  buildDebugEventsSummaryPayload,
  collectDebugEventsForSummary,
} from "./build-debug-events-summary.js";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import { resolveEntityCollection } from "@repo/firestore-indexes";
import type { DebugEventSource } from "@repo/debug-logs";

interface RegisterDebugRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly aiJobRepository: AiJobRepository;
  readonly hookExecutionRepository: DataHookExecutionRepository;
  readonly hookLogMessageRepository: HookLogMessageRepository;
  readonly auditLogRepository: AuditLogRepository;
  readonly requestPerfLogRepository: RequestPerfLogRepository;
  readonly indexProvisionEventRepository: IndexProvisionEventRepository;
  readonly emailIngestJobRepository?: EmailIngestJobRepository;
  readonly entityRuntime: EntityRuntimeContext;
}

const isoDateTimeString = z
  .string()
  .trim()
  .refine((value) => Number.isFinite(Date.parse(value)), {
    message: "Invalid ISO datetime",
  });

const eventsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(1000).default(10),
    sources: z.string().trim().optional(),
    cursor: z.string().trim().optional(),
    since: isoDateTimeString.optional(),
    until: isoDateTimeString.optional(),
    before: isoDateTimeString.optional(),
    after: isoDateTimeString.optional(),
    entityName: z.string().trim().min(1).optional(),
    recordId: z.string().trim().min(1).optional(),
    emailLedgerId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.since &&
      value.until &&
      Date.parse(value.since) > Date.parse(value.until)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "since must be before until",
        path: ["since"],
      });
    }
    const hasEntity = value.entityName != null && value.entityName.length > 0;
    const hasRecord = value.recordId != null && value.recordId.length > 0;
    if (hasEntity !== hasRecord) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entityName and recordId must be provided together",
        path: hasEntity ? ["recordId"] : ["entityName"],
      });
    }
  });

const eventsSummaryQuerySchema = z
  .object({
    sources: z.string().trim().optional(),
    since: isoDateTimeString,
    until: isoDateTimeString,
  })
  .superRefine((value, ctx) => {
    if (Date.parse(value.since) > Date.parse(value.until)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "since must be before until",
        path: ["since"],
      });
    }
  });

function resolveListTimeRange(input: {
  readonly since?: string;
  readonly until?: string;
  readonly before?: string;
  readonly after?: string;
}): {
  readonly since?: string;
  readonly until?: string;
  readonly afterExclusive?: string;
  readonly beforeExclusive?: string;
} {
  return {
    ...(input.since ? { since: input.since } : {}),
    ...(input.until ? { until: input.until } : {}),
    ...(input.after ? { afterExclusive: input.after } : {}),
    ...(input.before ? { beforeExclusive: input.before } : {}),
  };
}

function eventInExclusiveBounds(
  timestamp: string,
  bounds: {
    readonly since?: string;
    readonly until?: string;
    readonly afterExclusive?: string;
    readonly beforeExclusive?: string;
  },
): boolean {
  const value = Date.parse(timestamp);
  if (!Number.isFinite(value)) {
    return false;
  }
  if (bounds.since) {
    const sinceMs = Date.parse(bounds.since);
    if (Number.isFinite(sinceMs) && value < sinceMs) {
      return false;
    }
  }
  if (bounds.until) {
    const untilMs = Date.parse(bounds.until);
    if (Number.isFinite(untilMs) && value > untilMs) {
      return false;
    }
  }
  if (bounds.afterExclusive) {
    const afterMs = Date.parse(bounds.afterExclusive);
    if (Number.isFinite(afterMs) && value <= afterMs) {
      return false;
    }
  }
  if (bounds.beforeExclusive) {
    const beforeMs = Date.parse(bounds.beforeExclusive);
    if (Number.isFinite(beforeMs) && value >= beforeMs) {
      return false;
    }
  }
  return true;
}

const hookExecutionSummaryQuerySchema = z.object({
  windowHours: z.coerce.number().int().min(1).max(168).default(24),
  limit: z.coerce.number().int().min(1).max(500).default(200),
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
      const perSourceLimit = limit;
      const listBounds = resolveListTimeRange({
        since: parsedQuery.data.since,
        until: parsedQuery.data.until,
        before: parsedQuery.data.before,
        after: parsedQuery.data.after,
      });
      const repoSinceCandidates = [
        listBounds.since,
        listBounds.afterExclusive,
      ].filter((value): value is string => Boolean(value));
      const repoUntilCandidates = [
        listBounds.until,
        listBounds.beforeExclusive,
      ].filter((value): value is string => Boolean(value));
      const repoSince =
        repoSinceCandidates.length > 0
          ? repoSinceCandidates.reduce((left, right) =>
              Date.parse(left) >= Date.parse(right) ? left : right,
            )
          : undefined;
      const repoUntil =
        repoUntilCandidates.length > 0
          ? repoUntilCandidates.reduce((left, right) =>
              Date.parse(left) <= Date.parse(right) ? left : right,
            )
          : undefined;
      const timeRange = {
        ...(repoSince ? { since: repoSince } : {}),
        ...(repoUntil ? { until: repoUntil } : {}),
      };
      const groups: Awaited<ReturnType<typeof toAiDebugEvent>>[][] = [];
      let hookExecutionLive: DataHookExecutionActiveCounts | undefined;
      let hookExecutionNextCursor: string | undefined;

      const canReadAi =
        hasPermission("debug.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.uiBuilder.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.chat.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.dataHook.read", permissions, { isSuperAdmin });

      const canReadHooks =
        hasPermission("debug.read", permissions, { isSuperAdmin }) ||
        hasPermission("hook.read", permissions, { isSuperAdmin });

      const canReadSensitive = hasPermission("debug.read", permissions, {
        isSuperAdmin,
      });

      if (sources.includes("ai") && canReadAi) {
        const jobs = await options.aiJobRepository.listRecent(tenantId, {
          limit: perSourceLimit,
          ...timeRange,
        });
        groups.push(jobs.map(toAiDebugEvent));
      }

      if (sources.includes("hookExecution") && canReadHooks) {
        const scopedEmailLedgerId = parsedQuery.data.emailLedgerId;
        const listByEmailLedger =
          scopedEmailLedgerId != null && scopedEmailLedgerId.length > 0;
        const scopedEntityName = parsedQuery.data.entityName;
        const scopedRecordId = parsedQuery.data.recordId;
        const listScoped =
          !listByEmailLedger &&
          scopedEntityName != null &&
          scopedEntityName.length > 0 &&
          scopedRecordId != null &&
          scopedRecordId.length > 0;

        const listOptions = {
          limit: perSourceLimit,
          cursor: decodeHookExecutionListCursor(parsedQuery.data.cursor),
          ...timeRange,
        };

        const [active, recentPage, liveCounts] = await Promise.all([
          options.hookExecutionRepository.listActive(tenantId),
          listByEmailLedger
            ? options.hookExecutionRepository.listByEmailLedgerId(
                tenantId,
                scopedEmailLedgerId,
                listOptions,
              )
            : listScoped
              ? options.hookExecutionRepository.listByEntityRecord(
                  tenantId,
                  scopedEntityName,
                  scopedRecordId,
                  listOptions,
                )
              : options.hookExecutionRepository.listRecent(
                  tenantId,
                  listOptions,
                ),
          options.hookExecutionRepository.countActiveByStatus(tenantId),
        ]);
        hookExecutionLive = liveCounts;
        if (recentPage.nextCursor) {
          hookExecutionNextCursor = encodeHookExecutionListCursor(
            recentPage.nextCursor,
          );
        }
        const activeInRange = (parsedQuery.data.cursor ? [] : active).filter(
          (record) => {
            if (listByEmailLedger) {
              if (record.emailLedgerId !== scopedEmailLedgerId) {
                return false;
              }
            } else if (listScoped) {
              if (
                record.entityName !== scopedEntityName ||
                record.recordId !== scopedRecordId
              ) {
                return false;
              }
            }
            const startedAt = Date.parse(record.startedAt);
            if (!Number.isFinite(startedAt)) return false;
            if (timeRange.since && startedAt < Date.parse(timeRange.since)) {
              return false;
            }
            if (timeRange.until && startedAt > Date.parse(timeRange.until)) {
              return false;
            }
            return true;
          },
        );
        groups.push(
          mergeHookExecutionDebugEvents(
            activeInRange,
            recentPage.items,
            perSourceLimit,
          ),
        );
      }

      if (sources.includes("hookLog") && canReadHooks) {
        const logs = await options.hookLogMessageRepository.listRecent(
          tenantId,
          { limit: perSourceLimit, ...timeRange },
        );
        groups.push(logs.map(toHookLogDebugEvent));
      }

      if (sources.includes("audit") && canReadSensitive) {
        const audits = await options.auditLogRepository.listRecent(tenantId, {
          limit: perSourceLimit,
          ...timeRange,
        });
        groups.push(audits.map(toAuditDebugEvent));
      }

      if (sources.includes("requestPerf") && canReadSensitive) {
        const perfLogs = await options.requestPerfLogRepository.listRecent(
          tenantId,
          { limit: perSourceLimit, ...timeRange },
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
            { limit: perSourceLimit, ...timeRange },
          );
        groups.push(indexEvents.map(toIndexProvisionDebugEvent));
      }

      if (sources.includes("emailIngest") && options.emailIngestJobRepository) {
        const jobs = await options.emailIngestJobRepository.listRecent(
          tenantId,
          { limit: perSourceLimit, ...timeRange },
        );
        groups.push(jobs.map(toEmailIngestDebugEvent));
      }

      const merged = mergeDebugEvents(groups, limit * 2).filter((event) =>
        eventInExclusiveBounds(event.timestamp, listBounds),
      );
      const items = merged.slice(0, limit);
      const hasMoreWithoutCursor =
        !hookExecutionNextCursor && merged.length > limit;
      return reply.send(
        successEnvelope({
          items,
          ...(hookExecutionLive ? { hookExecutionLive } : {}),
          nextCursor: hookExecutionNextCursor ?? null,
          hasMore: Boolean(hookExecutionNextCursor) || hasMoreWithoutCursor,
        }),
      );
    },
  );

  app.get(
    "/api/debug/events/summary",
    {
      preHandler: [options.authenticate, requireDebugRead],
    },
    async (request, reply) => {
      const parsedQuery = eventsSummaryQuerySchema.safeParse(request.query);
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
      const sources = parseDebugSources(parsedQuery.data.sources);
      const source = (sources[0] ?? "hookExecution") as DebugEventSource;

      const canReadAi =
        hasPermission("debug.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.uiBuilder.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.chat.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.dataHook.read", permissions, { isSuperAdmin });
      const canReadHooks =
        hasPermission("debug.read", permissions, { isSuperAdmin }) ||
        hasPermission("hook.read", permissions, { isSuperAdmin });
      const canReadSensitive = hasPermission("debug.read", permissions, {
        isSuperAdmin,
      });

      const collected = await collectDebugEventsForSummary(
        options,
        tenantId,
        source,
        parsedQuery.data.since,
        parsedQuery.data.until,
        { canReadAi, canReadHooks, canReadSensitive },
      );

      const hookExecutionLive =
        source === "hookExecution" && canReadHooks
          ? await options.hookExecutionRepository.countActiveByStatus(tenantId)
          : undefined;

      return reply.send(
        successEnvelope(
          buildDebugEventsSummaryPayload(
            source,
            collected.events,
            collected.scannedCount,
            collected.truncated,
            hookExecutionLive,
          ),
        ),
      );
    },
  );

  app.get(
    "/api/debug/hook-executions/summary",
    {
      preHandler: [options.authenticate, requireDebugRead],
    },
    async (request, reply) => {
      const parsedQuery = hookExecutionSummaryQuerySchema.safeParse(
        request.query,
      );
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
      const canReadHooks =
        hasPermission("debug.read", permissions, { isSuperAdmin }) ||
        hasPermission("hook.read", permissions, { isSuperAdmin });
      if (!canReadHooks) {
        return replyWithError(
          reply,
          403,
          ApiErrorCode.FORBIDDEN,
          "You do not have permission to view hook executions.",
        );
      }

      const recentPage = await options.hookExecutionRepository.listRecent(
        tenantId,
        { limit: parsedQuery.data.limit },
      );
      const cutoffMs =
        Date.now() - parsedQuery.data.windowHours * 60 * 60 * 1000;
      const filtered = recentPage.items.filter((record) => {
        const startedAt = Date.parse(record.startedAt);
        return Number.isFinite(startedAt) && startedAt >= cutoffMs;
      });

      return reply.send(
        successEnvelope({
          windowHours: parsedQuery.data.windowHours,
          hooks: summarizeHookExecutions(filtered),
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
          hasPermission("ai.uiBuilder.read", permissions, { isSuperAdmin })) ||
        ((job.feature === "dataHookCallAi" ||
          job.feature === "dataHookBatchCallAi" ||
          job.feature === "dataHookEmbedding" ||
          job.feature === "gmailExtract") &&
          hasPermission("ai.dataHook.read", permissions, { isSuperAdmin }));

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
        hasPermission("ai.uiBuilder.read", permissions, { isSuperAdmin }) ||
        hasPermission("ai.dataHook.read", permissions, { isSuperAdmin });

      return reply.send(
        successEnvelope({
          id: job.id,
          status: job.status,
          feature: job.feature,
          ...(job.operation ? { operation: job.operation } : {}),
          ...(job.parentJobId ? { parentJobId: job.parentJobId } : {}),
          ...(job.modelUsage ? { modelUsage: job.modelUsage } : {}),
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

  app.get(
    "/api/debug/ai-jobs/:jobId/children",
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

      const parent = await options.aiJobRepository.getById(tenantId, jobId);
      if (!parent) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "AI job not found.",
        );
      }

      const children = await options.aiJobRepository.listRecent(tenantId, {
        parentJobId: jobId,
        limit: 100,
      });

      return reply.send(
        successEnvelope({
          parentJobId: jobId,
          children: children.map((child) => ({
            id: child.id,
            status: child.status,
            feature: child.feature,
            ...(child.operation ? { operation: child.operation } : {}),
            ...(child.modelUsage ? { modelUsage: child.modelUsage } : {}),
            error: child.error,
            createdAt: child.createdAt,
            updatedAt: child.updatedAt,
          })),
        }),
      );
    },
  );

  app.get(
    "/api/debug/email-ingest/:jobId",
    {
      preHandler: [options.authenticate, requireDebugRead],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;
      if (!options.emailIngestJobRepository) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Email ingest debugger is not available.",
        );
      }

      const jobId = (request.params as { jobId?: string }).jobId?.trim();
      if (!jobId) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Job id is required.",
        );
      }

      const job = await options.emailIngestJobRepository.get(tenantId, jobId);
      if (!job) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Email ingest job not found.",
        );
      }

      return reply.send(successEnvelope(job));
    },
  );
}
