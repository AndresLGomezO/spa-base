import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { dispatchHookTaskAsync } from "./dispatch-hook-task-async.js";
import { createWorkerHookLogger } from "../hooks/create-worker-hook-logger.js";
import {
  gmailBackfillTaskPayloadSchema,
  gmailHistorySyncTaskPayloadSchema,
  gmailProcessMessageTaskPayloadSchema,
  gmailWatchRenewTaskPayloadSchema,
  processGmailBackfill,
  processGmailHistorySync,
  processGmailProcessMessage,
  processGmailWatchRenew,
  type GmailIngestProcessorDeps,
} from "../services/gmail-ingest-processor.js";

const ROUTES = {
  BACKFILL: "/tasks/gmail-backfill",
  HISTORY_SYNC: "/tasks/gmail-history-sync",
  WATCH_RENEW: "/tasks/gmail-watch-renew",
  PROCESS_MESSAGE: "/tasks/gmail-process-message",
} as const;

export async function gmailIngestTaskRoute(
  app: FastifyInstance,
  deps: GmailIngestProcessorDeps,
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
        process: async () => {
          try {
            await processGmailProcessMessage(deps, payload, logger);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "process failed";
            await deps.emailIngestJobRepository.complete(
              payload.tenantId,
              payload.jobId,
              "failed",
              message,
            );
            throw error;
          }
        },
      });
    },
  );

  app.post(
    ROUTES.BACKFILL,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = gmailBackfillTaskPayloadSchema.safeParse(request.body);
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
        logLabel: "Gmail backfill",
        process: async () => {
          try {
            await processGmailBackfill(deps, payload, logger);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "backfill failed";
            await deps.emailIngestJobRepository.complete(
              payload.tenantId,
              payload.jobId,
              "failed",
              message,
            );
            throw error;
          }
        },
      });
    },
  );

  app.post(
    ROUTES.HISTORY_SYNC,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = gmailHistorySyncTaskPayloadSchema.safeParse(request.body);
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
        logLabel: "Gmail history sync",
        process: async () => {
          try {
            await processGmailHistorySync(deps, payload, logger);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "history sync failed";
            await deps.emailIngestJobRepository.complete(
              payload.tenantId,
              payload.jobId,
              "failed",
              message,
            );
            throw error;
          }
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
        process: () => processGmailWatchRenew(deps, payload, logger),
      });
    },
  );
}
