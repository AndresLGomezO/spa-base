import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from "fastify";

import { PermanentTaskError } from "../services/ai-chat-processor.js";

interface DispatchHookTaskAsyncOptions {
  readonly request: FastifyRequest;
  readonly reply: FastifyReply;
  readonly tenantId: string;
  readonly hookId: string;
  readonly logLabel: string;
  readonly process: () => Promise<void>;
}

export function dispatchHookTaskAsync(
  options: DispatchHookTaskAsyncOptions,
): FastifyReply {
  const { request, reply, tenantId, hookId, logLabel, process } = options;

  request.log.info({ hookId, tenantId }, logLabel);

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
