import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from "fastify";

import { PermanentTaskError } from "../services/ai-chat-processor.js";

interface DispatchHookTaskAsyncOptions {
  readonly request: FastifyRequest;
  readonly reply: FastifyReply;
  readonly tenantId: string;
  readonly hookId: string;
  readonly logLabel: string;
  readonly process: () => Promise<unknown>;
  /**
   * When true, wait for `process` before responding (local HTTP dispatch
   * backpressure). Cloud Tasks should keep the default 202 accept path.
   */
  readonly awaitCompletion?: boolean;
}

export async function dispatchHookTaskAsync(
  options: DispatchHookTaskAsyncOptions,
): Promise<FastifyReply> {
  const {
    request,
    reply,
    tenantId,
    hookId,
    logLabel,
    process,
    awaitCompletion = false,
  } = options;

  request.log.info({ hookId, tenantId }, logLabel);

  if (awaitCompletion) {
    try {
      await process();
      return reply.status(200).send({ success: true });
    } catch (error: unknown) {
      logHookTaskFailure(request.log, error, { hookId, tenantId }, logLabel);
      if (error instanceof PermanentTaskError) {
        return reply.status(200).send({ success: false, error: error.code });
      }
      return reply.status(500).send({ success: false });
    }
  }

  void process().catch((error: unknown) => {
    logHookTaskFailure(request.log, error, { hookId, tenantId }, logLabel);
  });

  return reply.status(202).send({ success: true, accepted: true });
}

function logHookTaskFailure(
  log: FastifyBaseLogger,
  error: unknown,
  context: { hookId: string; tenantId: string },
  label: string,
): void {
  if (error instanceof PermanentTaskError) {
    log.warn({ ...context, code: error.code }, error.message);
    return;
  }

  log.error({ err: error, ...context }, `${label} failed`);
}
