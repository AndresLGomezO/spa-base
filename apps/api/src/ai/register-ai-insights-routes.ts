import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { z } from "zod";

import {
  isAiRecordNarrativeStale,
  loadInsightSurfacePayload,
  resolveSurfaceLabels,
  type InsightSurfaceDefinition,
} from "@repo/ai-context";
import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";
import type {
  AiRecordSummaryRepository,
  InsightSurfaceRepository,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import {
  loadRequestPermissions,
  type LoadRequestPermissionsDeps,
} from "../rbac/load-request-permissions.js";
import {
  buildDeterministicTaskId,
  createCloudTasksClient,
  type CloudTasksClientConfig,
} from "./cloud-tasks.client.js";
import {
  assertAiSpendAllowedForRequest,
  type AiSpendGuardDeps,
} from "./ai-spend-guard.js";
import { replyWithAiSpendLimit } from "./reply-with-ai-spend-limit.js";

type GenericRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly [key: string]: unknown;
};

const SCOPE_RE = /^\d{4}-\d{2}$/;

interface RegisterAiInsightsRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly insightSurfaceRepository: InsightSurfaceRepository;
  readonly getRepository: (
    tenantId: string,
    entityName: string,
  ) => TenantScopedEntityRepository<GenericRecord, unknown> | undefined;
  readonly isTenantWideRead: (tenantId: string, entityName: string) => boolean;
  readonly aiRecordSummaryRepository: AiRecordSummaryRepository;
  readonly cloudTasksConfig: CloudTasksClientConfig;
  readonly aiSpendGuardDeps?: AiSpendGuardDeps;
  readonly now?: () => Date;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function userCanSee(
  record: GenericRecord,
  userId: string,
  tenantWideRead: boolean,
): boolean {
  if (tenantWideRead) {
    return true;
  }
  const access = record.accessUserIds;
  if (Array.isArray(access) && access.includes(userId)) {
    return true;
  }
  return record.ownerId === userId;
}

function resolveScope(
  raw: unknown,
  now: () => Date,
): { readonly scope: string } | { readonly error: string } {
  if (raw == null || raw === "") {
    return { scope: now().toISOString().slice(0, 7) };
  }
  const scope = asOptionalString(raw);
  if (!scope || !SCOPE_RE.test(scope)) {
    return { error: 'scope must be "YYYY-MM" when provided' };
  }
  return { scope };
}
async function enqueueNarrativeIfStale(
  options: RegisterAiInsightsRoutesOptions,
  cloudTasks: ReturnType<typeof createCloudTasksClient>,
  input: {
    readonly tenantId: string;
    readonly entityName: string;
    readonly recordId: string;
    readonly variant: string;
  },
): Promise<"enqueued" | "already_current" | "not_ready" | "missing"> {
  const record = await options.aiRecordSummaryRepository.get(
    input.tenantId,
    input.entityName,
    input.recordId,
  );
  if (!record) {
    return "missing";
  }
  if (!record.contextHash?.trim() || !record.context) {
    return "not_ready";
  }
  if (!isAiRecordNarrativeStale(record, input.variant)) {
    return "already_current";
  }

  const expectedHash =
    record.variantContextHashes?.[input.variant]?.trim() ||
    record.contextHash.trim();

  await cloudTasks.enqueueTask({
    path: AI_TASK_ROUTES.REFRESH_RECORD_NARRATIVE,
    payload: {
      tenantId: input.tenantId,
      entityName: input.entityName,
      recordId: input.recordId,
      variant: input.variant,
    },
    taskId: buildDeterministicTaskId(
      "ai-narrative",
      `${input.tenantId}:${input.entityName}:${input.recordId}:${input.variant}:${expectedHash}`,
      `${input.tenantId}:${input.entityName}:${input.recordId}:${input.variant}`,
    ),
  });
  return "enqueued";
}

function toSurfaceDescriptor(
  surface: InsightSurfaceDefinition,
  locale: string,
) {
  const labels = resolveSurfaceLabels(surface, locale);
  return {
    id: surface.id,
    icon: surface.icon,
    permission: surface.permission,
    labels,
    ui: surface.ui,
    scope: surface.scope,
    linkFields: surface.insight.linkFields,
    summaryFields: [
      ...(surface.summary.entitySource?.fields ?? []),
      ...surface.summary.signalFields,
    ],
    chat: {
      toolDescription: surface.chat.toolDescription,
    },
  };
}

export async function registerAiInsightsRoutes(
  app: FastifyInstance,
  options: RegisterAiInsightsRoutesOptions,
): Promise<void> {
  const requireAiChatRun = createRequirePermission(
    options.permissionDeps,
    "ai.chat.run",
  );
  const cloudTasks = createCloudTasksClient(options.cloudTasksConfig);
  const now = options.now ?? (() => new Date());

  app.get(
    "/api/ai/insight-surfaces",
    {
      preHandler: [options.authenticate, requireAiChatRun],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const locale =
        asOptionalString((request.query as { locale?: string }).locale) ?? "en";
      const surfaces = await options.insightSurfaceRepository.list(tenantId);
      return reply.send(
        successEnvelope({
          surfaces: surfaces.map((surface) =>
            toSurfaceDescriptor(surface, locale),
          ),
        }),
      );
    },
  );

  app.get(
    "/api/ai/insights/:surfaceId",
    {
      preHandler: [options.authenticate, requireAiChatRun],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const uid = request.ctx?.uid;
      if (!uid) {
        return replyWithError(
          reply,
          401,
          ApiErrorCode.UNAUTHORIZED,
          "Authentication required.",
        );
      }

      const surfaceId = (request.params as { surfaceId: string }).surfaceId;
      const surface = await options.insightSurfaceRepository.getById(
        tenantId,
        surfaceId,
      );
      if (!surface) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          `Insight surface "${surfaceId}" was not found.`,
        );
      }

      const query = request.query as Record<string, string | undefined>;
      const locale = asOptionalString(query.locale) ?? "en";
      const scopeRaw = query[surface.scope.queryParam] ?? query.scope;
      const scopeResult = resolveScope(scopeRaw, now);
      if ("error" in scopeResult) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          scopeResult.error,
        );
      }

      const payload = await loadInsightSurfacePayload(options, {
        tenantId,
        userId: uid,
        surface,
        scope: scopeResult.scope,
        locale,
      });
      return reply.send(successEnvelope(payload));
    },
  );

  app.post(
    "/api/ai/insights/:surfaceId/refresh",
    {
      preHandler: [options.authenticate, requireAiChatRun],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const uid = request.ctx?.uid;
      if (!uid) {
        return replyWithError(
          reply,
          401,
          ApiErrorCode.UNAUTHORIZED,
          "Authentication required.",
        );
      }

      const surfaceId = (request.params as { surfaceId: string }).surfaceId;
      const surface = await options.insightSurfaceRepository.getById(
        tenantId,
        surfaceId,
      );
      if (!surface) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          `Insight surface "${surfaceId}" was not found.`,
        );
      }

      const refreshBodySchema = z
        .object({
          scope: z.string().trim().regex(SCOPE_RE).optional(),
          [surface.scope.queryParam]: z
            .string()
            .trim()
            .regex(SCOPE_RE)
            .optional(),
        })
        .optional();

      const parsedBody = refreshBodySchema.safeParse(request.body ?? {});
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request body.",
          parsedBody.error.flatten(),
        );
      }

      const body = parsedBody.data ?? {};
      const scopeRaw =
        (body as Record<string, string | undefined>).scope ??
        (body as Record<string, string | undefined>)[surface.scope.queryParam];
      const scopeResult = resolveScope(scopeRaw, now);
      if ("error" in scopeResult) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          scopeResult.error,
        );
      }
      const { scope } = scopeResult;

      if (options.aiSpendGuardDeps) {
        try {
          const ctx = await loadRequestPermissions(
            request,
            options.permissionDeps,
          );
          await assertAiSpendAllowedForRequest(options.aiSpendGuardDeps, {
            tenantId,
            userId: uid,
            roleCatalog: ctx.roleCatalog,
            tenantRoleNames: ctx.tenantRoleNames,
          });
        } catch (error) {
          const spendReply = replyWithAiSpendLimit(reply, error);
          if (spendReply) return spendReply;
          throw error;
        }
      }

      const insightRepo = options.getRepository(
        tenantId,
        surface.insight.entity,
      );
      const insightIds: string[] = [];
      if (insightRepo) {
        const page = await insightRepo.findAll({ tenantId, limit: 100 });
        const tenantWide = options.isTenantWideRead(
          tenantId,
          surface.insight.entity,
        );
        const ranked = page.items
          .filter(
            (record) =>
              asOptionalString(record[surface.scope.field]) === scope &&
              userCanSee(record, uid, tenantWide),
          )
          .sort((a, b) => {
            const rankA =
              asFiniteNumber(a[surface.insight.rankField]) ??
              Number.POSITIVE_INFINITY;
            const rankB =
              asFiniteNumber(b[surface.insight.rankField]) ??
              Number.POSITIVE_INFINITY;
            if (rankA !== rankB) return rankA - rankB;
            const impactA =
              asFiniteNumber(a[surface.insight.impactScoreField]) ??
              Number.NEGATIVE_INFINITY;
            const impactB =
              asFiniteNumber(b[surface.insight.impactScoreField]) ??
              Number.NEGATIVE_INFINITY;
            return impactB - impactA;
          })
          .slice(0, surface.insight.topN);
        for (const record of ranked) {
          insightIds.push(record.id);
        }
      }

      let enqueued = 0;
      let alreadyCurrent = 0;

      try {
        for (const recordId of insightIds) {
          const result = await enqueueNarrativeIfStale(options, cloudTasks, {
            tenantId,
            entityName: surface.insight.entity,
            recordId,
            variant: surface.insight.narrativeVariant,
          });
          if (result === "enqueued") enqueued += 1;
          if (result === "already_current") alreadyCurrent += 1;
        }

        const portfolioResult = await enqueueNarrativeIfStale(
          options,
          cloudTasks,
          {
            tenantId,
            entityName: surface.portfolio.entity,
            recordId: surface.portfolio.recordId,
            variant: surface.portfolio.narrativeVariant,
          },
        );
        if (portfolioResult === "enqueued") enqueued += 1;
        if (portfolioResult === "already_current") alreadyCurrent += 1;
      } catch (error) {
        return replyWithError(
          reply,
          503,
          ApiErrorCode.INTERNAL_ERROR,
          error instanceof Error
            ? error.message
            : "Failed to enqueue insight refresh.",
        );
      }

      return reply.send(
        successEnvelope({
          surfaceId: surface.id,
          scope,
          enqueued,
          alreadyCurrent,
        }),
      );
    },
  );
}
