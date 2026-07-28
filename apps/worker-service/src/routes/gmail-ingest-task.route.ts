import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { WorkloadRunRecorder } from "@repo/workload-runs";

import { dispatchHookTaskAsync } from "./dispatch-hook-task-async.js";
import { createWorkerHookLogger } from "../hooks/create-worker-hook-logger.js";
import { createAsyncSemaphore } from "../lib/async-semaphore.js";
import {
  gmailProcessMessageTaskPayloadSchema,
  gmailWatchRenewTaskPayloadSchema,
  gmailWindowSyncTaskPayloadSchema,
  processGmailPoll,
  processGmailProcessMessage,
  processGmailWatchRenew,
  processGmailWindowSync,
  type GmailIngestProcessorDeps,
} from "../services/gmail-ingest-processor.js";
import { readWorkloadRunLineageFromHeaders } from "../workloads/workload-run-context.js";
import { withWorkloadRun } from "../workloads/with-workload-run.js";

const ROUTES = {
  WINDOW_SYNC: "/tasks/gmail-window-sync",
  WATCH_RENEW: "/tasks/gmail-watch-renew",
  PROCESS_MESSAGE: "/tasks/gmail-process-message",
  POLL: "/tasks/gmail-poll",
} as const;

/**
 * Email hooks update shared parents (schedules / financial items). Serialize
 * process-message work so chained updates do not contend on Firestore.
 *
 * Local HTTP dispatch awaits completion (see X-Local-Task-Dispatcher) so
 * window-sync enqueue gets backpressure instead of 202-fan-out. Cloud Tasks
 * keeps 202 accept + queue rate limits (max concurrent 2 in Terraform).
 */
const processMessageGate = createAsyncSemaphore(1);

function isLocalTaskDispatcher(request: FastifyRequest): boolean {
  const header = request.headers["x-local-task-dispatcher"];
  return header === "true";
}

export async function gmailIngestTaskRoute(
  app: FastifyInstance,
  deps: GmailIngestProcessorDeps & {
    readonly workloadRunRecorder?: WorkloadRunRecorder;
  },
): Promise<void> {
  app.post(
    ROUTES.PROCESS_MESSAGE,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = gmailProcessMessageTaskPayloadSchema.safeParse(
        request.body,
      );
      if (!parsed.success) {
        return reply
          .status(200)
          .send({ success: false, error: "INVALID_PAYLOAD" });
      }
      const payload = parsed.data;
      const logger = createWorkerHookLogger(
        request.log,
        payload.tenantId,
        deps.hookLogMessageRepository,
      );
      return dispatchHookTaskAsync({
        request,
        reply,
        tenantId: payload.tenantId,
        hookId: payload.jobId,
        logLabel: "Processing Gmail message",
        awaitCompletion: isLocalTaskDispatcher(request),
        process: () =>
          processMessageGate.run(async () => {
            if (!deps.workloadRunRecorder) {
              await processGmailProcessMessage(deps, payload, logger);
              return;
            }
            const lineage = readWorkloadRunLineageFromHeaders(
              request.headers as Record<string, string | string[] | undefined>,
            );
            await withWorkloadRun(
              deps.workloadRunRecorder,
              {
                workloadId: "worker:gmail-process-message",
                triggeredBy: "cloudTasks",
                tenantId: payload.tenantId,
                parentRunId: lineage.parentRunId,
                rootRunId: lineage.rootRunId,
              },
              request.log,
              async (handle) => {
                await processGmailProcessMessage(deps, payload, logger);
                await handle.addArtifact({
                  kind: "emailIngestJob",
                  id: payload.jobId,
                  tenantId: payload.tenantId,
                });
              },
            );
          }),
      });
    },
  );

  app.post(
    ROUTES.WINDOW_SYNC,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = gmailWindowSyncTaskPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(200)
          .send({ success: false, error: "INVALID_PAYLOAD" });
      }
      const payload = parsed.data;
      const logger = createWorkerHookLogger(
        request.log,
        payload.tenantId,
        deps.hookLogMessageRepository,
      );
      return dispatchHookTaskAsync({
        request,
        reply,
        tenantId: payload.tenantId,
        hookId: payload.jobId,
        logLabel: "Gmail window sync",
        process: async () => {
          const doWork = async () => {
            try {
              await processGmailWindowSync(deps, payload, logger);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "window sync failed";
              await deps.emailIngestJobRepository.complete(
                payload.tenantId,
                payload.jobId,
                "failed",
                message,
              );
              throw error;
            }
          };
          if (!deps.workloadRunRecorder) {
            return doWork();
          }
          const lineage = readWorkloadRunLineageFromHeaders(
            request.headers as Record<string, string | string[] | undefined>,
          );
          await withWorkloadRun(
            deps.workloadRunRecorder,
            {
              workloadId: "worker:gmail-window-sync",
              triggeredBy: "cloudTasks",
              tenantId: payload.tenantId,
              parentRunId: lineage.parentRunId,
              rootRunId: lineage.rootRunId,
            },
            request.log,
            async (handle) => {
              await doWork();
              await handle.addArtifact({
                kind: "emailIngestJob",
                id: payload.jobId,
                tenantId: payload.tenantId,
              });
            },
          );
        },
      });
    },
  );

  app.post(
    ROUTES.WATCH_RENEW,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = gmailWatchRenewTaskPayloadSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(200)
          .send({ success: false, error: "INVALID_PAYLOAD" });
      }
      const payload = parsed.data;
      const logger = createWorkerHookLogger(
        request.log,
        payload.tenantId ?? "platform",
        deps.hookLogMessageRepository,
      );
      return dispatchHookTaskAsync({
        request,
        reply,
        tenantId: payload.tenantId ?? "platform",
        hookId: payload.jobId ?? payload.userId,
        logLabel: "Gmail watch renew",
        process: async () => {
          if (!deps.workloadRunRecorder) {
            return processGmailWatchRenew(deps, payload, logger);
          }
          const lineage = readWorkloadRunLineageFromHeaders(
            request.headers as Record<string, string | string[] | undefined>,
          );
          await withWorkloadRun(
            deps.workloadRunRecorder,
            {
              workloadId: "worker:gmail-watch-renew",
              triggeredBy: "cloudTasks",
              parentRunId: lineage.parentRunId,
              rootRunId: lineage.rootRunId,
            },
            request.log,
            async () => {
              await processGmailWatchRenew(deps, payload, logger);
            },
          );
        },
      });
    },
  );

  app.post(
    ROUTES.POLL,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const logger = createWorkerHookLogger(
        request.log,
        "platform",
        deps.hookLogMessageRepository,
      );
      return dispatchHookTaskAsync({
        request,
        reply,
        tenantId: "platform",
        hookId: "gmail-poll",
        logLabel: "Gmail poll",
        process: async () => {
          if (!deps.workloadRunRecorder) {
            return processGmailPoll(deps, logger);
          }
          await withWorkloadRun(
            deps.workloadRunRecorder,
            {
              workloadId: "scheduler:gmail-poll",
              triggeredBy: "scheduler",
            },
            request.log,
            async () => {
              await processGmailPoll(deps, logger);
            },
          );
        },
      });
    },
  );
}
