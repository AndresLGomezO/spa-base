import type { FastifyInstance } from "fastify";

import { ApiErrorCode } from "./errors.js";
import { errorEnvelope } from "./response.js";

function isBodyTooLargeError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "FST_ERR_CTP_BODY_TOO_LARGE"
  );
}

export function registerCrudErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    if (isBodyTooLargeError(error)) {
      return reply.status(413).send(
        errorEnvelope({
          code: ApiErrorCode.VALIDATION_ERROR,
          message: "Request body is too large.",
        }),
      );
    }

    return reply.status(500).send(
      errorEnvelope({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: "An unexpected error occurred.",
      }),
    );
  });
}
