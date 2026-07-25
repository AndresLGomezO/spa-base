import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { z } from "zod";

import { hasPermission } from "@repo/rbac";
import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";
import { isAiRecordNarrativeStale } from "@repo/ai-context";
import type { AiRecordSummaryRepository } from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import {
  loadRequestPermissions,
  type LoadRequestPermissionsDeps,
} from "../rbac/load-request-permissions.js";
import {
  buildDeterministicTaskId,
  createCloudTasksClient,
  type CloudTasksClientConfig,
} from "../ai/cloud-tasks.client.js";
import { assertAiSpendAllowedForRequest } from "../ai/ai-spend-guard.js";
import { replyWithAiSpendLimit } from "../ai/reply-with-ai-spend-limit.js";
import type { AiSpendGuardDeps } from "../ai/ai-spend-guard.js";

type AiRecordSummaryDoc = NonNullable<
  Awaited<ReturnType<AiRecordSummaryRepository["get"]>>
>;

interface RegisterAiRecordSummaryRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly aiRecordSummaryRepository: AiRecordSummaryRepository;
  readonly cloudTasksConfig: CloudTasksClientConfig;
  readonly aiSpendGuardDeps?: AiSpendGuardDeps;
}

const paramsSchema = z.object({
  entityName: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
});

const refreshBodySchema = z
  .object({
    variant: z.string().trim().min(1).optional(),
  })
  .optional();

function userCanSeeAiDoc(
  record: {
    readonly ownerId?: string;
    readonly accessUserIds: readonly string[];
    readonly tenantWideRead: boolean;
  },
  userId: string,
): boolean {
  if (record.tenantWideRead) return true;
  if (record.ownerId === userId) return true;
  return record.accessUserIds.includes(userId);
}

export async function registerAiRecordSummaryRoutes(
  app: FastifyInstance,
  options: RegisterAiRecordSummaryRoutesOptions,
): Promise<void> {
  const cloudTasks = createCloudTasksClient(options.cloudTasksConfig);

  async function authorizeAiDocAccess(
    request: FastifyRequest,
    reply: FastifyReply,
    entityName: string,
    recordId: string,
  ): Promise<{
    readonly tenantId: string;
    readonly uid: string;
    readonly record: AiRecordSummaryDoc;
  } | null> {
    const tenantId = requireJwtTenant(request, reply);
    if (!tenantId) return null;

    const uid = request.ctx?.uid;
    if (!uid) {
      await replyWithError(
        reply,
        401,
        ApiErrorCode.UNAUTHORIZED,
        "Authentication is required.",
      );
      return null;
    }

    const resolvedCtx = await loadRequestPermissions(
      request,
      options.permissionDeps,
    );
    const isSuperAdmin = resolvedCtx.isSuperAdmin === true;
    const canDebug = hasPermission(
      "aiRecordSummaryTemplate.read",
      resolvedCtx.permissions ?? [],
      { isSuperAdmin },
    );

    const record = await options.aiRecordSummaryRepository.get(
      tenantId,
      entityName,
      recordId,
    );
    if (!record) {
      await replyWithError(
        reply,
        404,
        ApiErrorCode.NOT_FOUND,
        "AI record summary not found.",
      );
      return null;
    }

    if (!isSuperAdmin && !canDebug && !userCanSeeAiDoc(record, uid)) {
      await replyWithError(
        reply,
        403,
        ApiErrorCode.FORBIDDEN,
        "You do not have permission to perform this action.",
      );
      return null;
    }

    return { tenantId, uid, record };
  }

  app.get(
    "/api/ai-record-summaries/:entityName/:recordId",
    {
      preHandler: [options.authenticate],
    },
    async (request, reply) => {
      const parsed = paramsSchema.safeParse(request.params);
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const access = await authorizeAiDocAccess(
        request,
        reply,
        parsed.data.entityName,
        parsed.data.recordId,
      );
      if (!access) return;

      // Omit large embeddings from the default API payload.
      const { rag, ...rest } = access.record;
      return reply.send(
        successEnvelope({
          ...rest,
          ...(rag
            ? {
                rag: {
                  text: rag.text,
                  hash: rag.hash,
                  updatedAt: rag.updatedAt,
                  sourceHash: rag.sourceHash,
                  hasEmbedding: Boolean(rag.embedding?.length),
                },
              }
            : {}),
        }),
      );
    },
  );

  app.post(
    "/api/ai-record-summaries/:entityName/:recordId/refresh-narrative",
    {
      preHandler: [options.authenticate],
    },
    async (request, reply) => {
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }
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

      const access = await authorizeAiDocAccess(
        request,
        reply,
        parsedParams.data.entityName,
        parsedParams.data.recordId,
      );
      if (!access) return;

      const variant = parsedBody.data?.variant?.trim() || "default";
      if (!access.record.contextHash?.trim() || !access.record.context) {
        return replyWithError(
          reply,
          409,
          ApiErrorCode.VALIDATION_ERROR,
          "AI record context is not ready for narrative refresh.",
        );
      }

      if (!isAiRecordNarrativeStale(access.record, variant)) {
        return reply.send(
          successEnvelope({
            enqueued: false,
            reason: "already_current" as const,
            variant,
          }),
        );
      }

      const { tenantId } = access;
      const { entityName, recordId } = parsedParams.data;

      if (options.aiSpendGuardDeps) {
        try {
          const ctx = await loadRequestPermissions(
            request,
            options.permissionDeps,
          );
          await assertAiSpendAllowedForRequest(options.aiSpendGuardDeps, {
            tenantId,
            userId: access.uid,
            roleCatalog: ctx.roleCatalog,
            tenantRoleNames: ctx.tenantRoleNames,
          });
        } catch (error) {
          const spendReply = replyWithAiSpendLimit(reply, error);
          if (spendReply) return spendReply;
          throw error;
        }
      }

      const expectedHash =
        access.record.variantContextHashes?.[variant]?.trim() ||
        access.record.contextHash!.trim();

      try {
        await cloudTasks.enqueueTask({
          path: AI_TASK_ROUTES.REFRESH_RECORD_NARRATIVE,
          payload: {
            tenantId,
            entityName,
            recordId,
            variant,
          },
          taskId: buildDeterministicTaskId(
            "ai-narrative",
            `${tenantId}:${entityName}:${recordId}:${variant}:${expectedHash}`,
            `${tenantId}:${entityName}:${recordId}:${variant}`,
          ),
        });
      } catch (error) {
        return replyWithError(
          reply,
          503,
          ApiErrorCode.INTERNAL_ERROR,
          error instanceof Error
            ? error.message
            : "Failed to enqueue narrative refresh.",
        );
      }

      return reply.send(
        successEnvelope({
          enqueued: true,
          variant,
        }),
      );
    },
  );
}
