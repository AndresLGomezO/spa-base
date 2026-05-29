import "fastify";

import type { RequestContext } from "../auth/request-context.js";

declare module "fastify" {
  interface FastifyRequest {
    ctx?: RequestContext;
  }
}
