import type { FastifyReply } from "fastify";

import { AiSpendLimitError } from "@repo/ai-engine/spend";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError } from "../crud/response.js";

export function replyWithAiSpendLimit(
  reply: FastifyReply,
  error: unknown,
): unknown | null {
  if (!(error instanceof AiSpendLimitError)) {
    return null;
  }
  return replyWithError(
    reply,
    403,
    ApiErrorCode.AI_SPEND_LIMIT,
    error.message,
    {
      scope: error.scope,
      meter: error.meter,
      limit: error.limit,
      used: error.used,
    },
  );
}
