import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";

import { AI_FEATURE_RUN_PERMISSION } from "@repo/ai-engine/permissions";
import { submitAiChatRequestSchema } from "@repo/ai-engine/schemas";
import { AI_TASK_ROUTES } from "@repo/ai-engine/task-routes";
import type { AiJobRepository } from "@repo/firestore-converters";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import {
  buildDeterministicTaskId,
  createCloudTasksClient,
  type CloudTasksClientConfig,
} from "./cloud-tasks.client.js";

interface RegisterAiRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly aiJobRepository: AiJobRepository;
  readonly cloudTasksConfig: CloudTasksClientConfig;
}

export async function registerAiRoutes(
  app: FastifyInstance,
  options: RegisterAiRoutesOptions,
): Promise<void> {
  const requireAiChatRun = createRequirePermission(
    options.permissionDeps,
    "ai.chat.run",
  );
  const requireAiChatRead = createRequirePermission(
    options.permissionDeps,
    "ai.chat.read",
  );
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

      const job = await options.aiJobRepository.create(tenantId, {
        feature: "chat",
        input: { question: parsedBody.data.question },
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

      return reply.send(successEnvelope({ jobId: job.id }));
    },
  );

  app.get(
    "/api/ai/jobs/:jobId",
    {
      preHandler: [options.authenticate, requireAiChatRead],
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

      return reply.send(
        successEnvelope({
          id: job.id,
          status: job.status,
          feature: job.feature,
          input: job.input,
          output: job.output,
          error: job.error,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        }),
      );
    },
  );
}
