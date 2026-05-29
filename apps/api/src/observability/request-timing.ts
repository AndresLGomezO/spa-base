import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

interface RequestTimingState {
  readonly startedAt: number;
  rbacMs: number;
  queryMs: number;
  hooksMs: number;
}

declare module "fastify" {
  interface FastifyRequest {
    perfTiming?: RequestTimingState;
  }
}

export function registerRequestTiming(
  app: FastifyInstance,
  options: { readonly enabled: boolean },
): void {
  app.addHook("onRequest", async (request) => {
    request.perfTiming = {
      startedAt: performance.now(),
      rbacMs: 0,
      queryMs: 0,
      hooksMs: 0,
    };
  });

  if (!options.enabled) {
    return;
  }

  app.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const timing = request.perfTiming;
      if (!timing) {
        return;
      }

      const totalMs = Math.round(performance.now() - timing.startedAt);
      app.log.info(
        {
          route: request.routeOptions.url ?? request.url,
          method: request.method,
          statusCode: reply.statusCode,
          rbacMs: timing.rbacMs,
          queryMs: timing.queryMs,
          hooksMs: timing.hooksMs,
          totalMs,
        },
        "request timing",
      );
    },
  );
}

export async function measureRbacTiming<T>(
  request: FastifyRequest,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    if (request.perfTiming) {
      request.perfTiming.rbacMs += Math.round(performance.now() - startedAt);
    }
  }
}

export async function measureQueryTiming<T>(
  request: FastifyRequest,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    if (request.perfTiming) {
      request.perfTiming.queryMs += Math.round(performance.now() - startedAt);
    }
  }
}

export async function measureHooksTiming<T>(
  request: FastifyRequest,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    if (request.perfTiming) {
      request.perfTiming.hooksMs += Math.round(performance.now() - startedAt);
    }
  }
}
