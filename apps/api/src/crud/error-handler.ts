import type { FastifyInstance } from "fastify";

import { ApiErrorCode } from "./errors.js";
import { errorEnvelope } from "./response.js";

export function registerCrudErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    return reply.status(500).send(
      errorEnvelope({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: "An unexpected error occurred.",
      }),
    );
  });
}
