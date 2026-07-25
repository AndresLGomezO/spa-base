import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import {
  AI_FEATURE_RUN_PERMISSION,
  AI_UI_BUILDER_PERMISSIONS,
} from "@repo/ai-engine/permissions";
import {
  aiJobProgressSchema,
  aiJobStepTraceSchema,
  submitAiChatRequestSchema,
  submitAiUiBuilderRequestSchema,
  uiBuilderDraftSchema,
} from "@repo/ai-engine/schemas";
import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";
import type {
  AiChatSessionRepository,
  AiJobRepository,
} from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import { createRequireAnyPermission } from "../rbac/create-require-any-permission.js";
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
  getAiSpendStatusForUser,
  type AiSpendGuardDeps,
} from "./ai-spend-guard.js";
import { replyWithAiSpendLimit } from "./reply-with-ai-spend-limit.js";
import {
  ensureUiBuilderAiContexts,
  type SyncTenantAiContextsDeps,
} from "./sync-tenant-ai-contexts.js";

interface RegisterAiRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly aiJobRepository: AiJobRepository;
  readonly aiChatSessionRepository: AiChatSessionRepository;
  readonly cloudTasksConfig: CloudTasksClientConfig;
  readonly tenantAiContextDeps?: SyncTenantAiContextsDeps;
  readonly aiSpendGuardDeps?: AiSpendGuardDeps;
}

export async function registerAiRoutes(
  app: FastifyInstance,
  options: RegisterAiRoutesOptions,
): Promise<void> {
  const requireAiChatRun = createRequirePermission(
    options.permissionDeps,
    "ai.chat.run",
  );
  const requireAiUiBuilderRun = createRequirePermission(
    options.permissionDeps,
    AI_UI_BUILDER_PERMISSIONS[0]!,
  );
  const requireAiUiBuilderRead = createRequirePermission(
    options.permissionDeps,
    "ai.uiBuilder.read",
  );
  const requireAiJobRead = createRequireAnyPermission(options.permissionDeps, [
    "ai.chat.read",
    "ai.uiBuilder.read",
  ]);
  const cloudTasks = createCloudTasksClient(options.cloudTasksConfig);

  app.post(
    "/api/ai/chat",
    {
      preHandler: [options.authenticate, requireAiChatRun],
    },
    async (request, reply) => {
      const parsedBody = submitAiChatRequestSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request body.",
          parsedBody.error.flatten(),
        );
      }

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

      let sessionId = parsedBody.data.sessionId;
      if (sessionId) {
        const existing = await options.aiChatSessionRepository.get(
          tenantId,
          sessionId,
        );
        if (!existing || existing.userId !== uid) {
          return replyWithError(
            reply,
            404,
            ApiErrorCode.NOT_FOUND,
            "AI chat session not found.",
          );
        }
      } else {
        const created = await options.aiChatSessionRepository.create(tenantId, {
          userId: uid,
        });
        sessionId = created.id;
      }

      const job = await options.aiJobRepository.create(tenantId, {
        feature: "chat",
        input: {
          question: parsedBody.data.question,
          sessionId,
          userPermissions: [...(request.ctx?.permissions ?? [])],
        },
        requestedBy: uid,
        permission: AI_FEATURE_RUN_PERMISSION.chat,
      });

      try {
        await cloudTasks.enqueueTask({
          path: AI_TASK_ROUTES.PROCESS_AI_CHAT,
          payload: { jobId: job.id, tenantId },
          taskId: buildDeterministicTaskId(
            "ai-chat",
            job.id,
            `${tenantId}:${job.id}`,
          ),
        });
      } catch (error) {
        await options.aiJobRepository.update(tenantId, job.id, {
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Failed to enqueue AI chat task.",
        });
        return replyWithError(
          reply,
          503,
          ApiErrorCode.INTERNAL_ERROR,
          "Failed to enqueue AI chat job.",
        );
      }

      return reply.send(successEnvelope({ jobId: job.id, sessionId }));
    },
  );

  app.get(
    "/api/ai/chat/sessions/:sessionId",
    {
      preHandler: [options.authenticate, requireAiJobRead],
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

      const sessionId = (request.params as { sessionId?: string }).sessionId;
      if (!sessionId) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "sessionId is required.",
        );
      }

      const session = await options.aiChatSessionRepository.get(
        tenantId,
        sessionId,
      );
      if (!session || session.userId !== uid) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "AI chat session not found.",
        );
      }

      return reply.send(
        successEnvelope({
          id: session.id,
          status: session.status,
          messages: session.messages,
          citations: session.citations,
          lastJobId: session.lastJobId ?? null,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }),
      );
    },
  );

  app.post(
    "/api/ai/ui-builder",
    {
      preHandler: [options.authenticate, requireAiUiBuilderRun],
    },
    async (request, reply) => {
      const parsedBody = submitAiUiBuilderRequestSchema.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request body.",
          parsedBody.error.flatten(),
        );
      }

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

      if (options.tenantAiContextDeps) {
        try {
          await ensureUiBuilderAiContexts(
            options.tenantAiContextDeps,
            tenantId,
            parsedBody.data.entityName,
          );
        } catch (error) {
          return replyWithError(
            reply,
            503,
            ApiErrorCode.INTERNAL_ERROR,
            error instanceof Error
              ? error.message
              : "Failed to prepare AI context.",
          );
        }
      }

      const job = await options.aiJobRepository.create(tenantId, {
        feature: "uiBuilder",
        input: parsedBody.data,
        requestedBy: uid,
        permission: AI_FEATURE_RUN_PERMISSION.uiBuilder,
      });

      try {
        await cloudTasks.enqueueTask({
          path: AI_TASK_ROUTES.PROCESS_AI_UI_BUILDER,
          payload: { jobId: job.id, tenantId },
          taskId: buildDeterministicTaskId(
            "ai-ui-builder",
            job.id,
            `${tenantId}:${job.id}`,
          ),
        });
      } catch (error) {
        await options.aiJobRepository.update(tenantId, job.id, {
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Failed to enqueue AI UI builder task.",
        });
        return replyWithError(
          reply,
          503,
          ApiErrorCode.INTERNAL_ERROR,
          "Failed to enqueue AI UI builder job.",
        );
      }

      return reply.send(successEnvelope({ jobId: job.id }));
    },
  );

  app.get(
    "/api/ai/jobs/:jobId",
    {
      preHandler: [options.authenticate, requireAiJobRead],
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

      const job = await options.aiJobRepository.getById(tenantId, jobId);
      if (!job) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "AI job not found.",
        );
      }

      const canReadStepTrace =
        request.ctx?.permissions?.includes("ai.uiBuilder.read");

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

  app.get(
    "/api/ai/jobs",
    {
      preHandler: [options.authenticate, requireAiUiBuilderRead],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const query = request.query as {
        feature?: string;
        limit?: string;
      };
      const feature =
        query.feature === "uiBuilder" ||
        query.feature === "chat" ||
        query.feature === "dataModelBuilder"
          ? query.feature
          : "uiBuilder";
      const limit = Number.parseInt(query.limit ?? "20", 10);

      const jobs = await options.aiJobRepository.listRecent(tenantId, {
        feature,
        limit: Number.isFinite(limit) ? limit : 20,
      });

      return reply.send(
        successEnvelope({
          jobs: jobs.map((job) => ({
            id: job.id,
            status: job.status,
            feature: job.feature,
            input: job.input,
            error: job.error,
            progress: job.progress ?? null,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
          })),
        }),
      );
    },
  );

  app.get(
    "/api/ai/spend-status",
    {
      preHandler: [options.authenticate, requireAiJobRead],
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

      if (!options.aiSpendGuardDeps) {
        return replyWithError(
          reply,
          503,
          ApiErrorCode.INTERNAL_ERROR,
          "AI spend status is not configured.",
        );
      }

      const ctx = await loadRequestPermissions(request, options.permissionDeps);
      const status = await getAiSpendStatusForUser(options.aiSpendGuardDeps, {
        tenantId,
        userId: uid,
        roleCatalog: ctx.roleCatalog,
        tenantRoleNames: ctx.tenantRoleNames,
      });

      return reply.send(successEnvelope(status));
    },
  );
}
