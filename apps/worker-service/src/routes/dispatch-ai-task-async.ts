import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from "fastify";

import { PermanentTaskError } from "../services/ai-chat-processor.js";
import { markAiJobFailedIfExists } from "../services/mark-ai-job-failed.js";
import type { AiJobRepository } from "@repo/worker-firestore";

interface DispatchAiTaskAsyncOptions {
  readonly request: FastifyRequest;
  readonly reply: FastifyReply;
  readonly aiJobRepository: AiJobRepository;
  readonly tenantId: string;
  readonly jobId: string;
  readonly logLabel: string;
  readonly process: () => Promise<void>;
}

export function dispatchAiTaskAsync(
  options: DispatchAiTaskAsyncOptions,
): FastifyReply {
  const {
    request,
    reply,
    aiJobRepository,
    tenantId,
    jobId,
    logLabel,
    process,
  } = options;

  request.log.info({ jobId, tenantId }, logLabel);

  void process().catch(async (error: unknown) => {
    const code =
      error instanceof PermanentTaskError ? error.code : "TRANSIENT_ERROR";
    await markAiJobFailedIfExists(aiJobRepository, tenantId, jobId, code);
    logAiTaskFailure(request.log, error, { jobId, tenantId }, logLabel);
  });

  return reply.status(202).send({ success: true, accepted: true });
}

function logAiTaskFailure(
  log: FastifyBaseLogger,
  error: unknown,
  context: { jobId: string; tenantId: string },
  label: string,
): void {
  if (error instanceof PermanentTaskError) {
    log.warn({ ...context, code: error.code }, error.message);
    return;
  }

  log.error({ err: error, ...context }, `${label} failed`);
}
