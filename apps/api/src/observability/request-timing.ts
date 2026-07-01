import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

interface RequestTimingState {
  readonly startedAt: number;
  rbacMs: number;
  queryMs: number;
  hooksMs: number;
}

interface RequestTimingRecordInput {
  readonly tenantId: string;
  readonly route: string;
  readonly method: string;
  readonly statusCode: number;
  readonly rbacMs: number;
  readonly queryMs: number;
  readonly hooksMs: number;
  readonly totalMs: number;
}

declare module "fastify" {
  interface FastifyRequest {
    perfTiming?: RequestTimingState;
  }
}

export function registerRequestTiming(
  app: FastifyInstance,
  options: {
    readonly isEnabled: () => boolean | Promise<boolean>;
    readonly persist?: (
      input: RequestTimingRecordInput,
    ) => void | Promise<void>;
  },
): void {
  app.addHook("onRequest", async (request) => {
    request.perfTiming = {
      startedAt: performance.now(),
      rbacMs: 0,
      queryMs: 0,
      hooksMs: 0,
    };
  });

  app.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const timing = request.perfTiming;
      if (!timing) {
        return;
      }

      const enabled = await options.isEnabled();
      if (!enabled) {
        return;
      }

      const totalMs = Math.round(performance.now() - timing.startedAt);
      const route = request.routeOptions.url ?? request.url;
      const method = request.method;
      const statusCode = reply.statusCode;
      const rbacMs = timing.rbacMs;
      const queryMs = timing.queryMs;
      const hooksMs = timing.hooksMs;

      app.log.info(
        {
          route,
          method,
          statusCode,
          rbacMs,
          queryMs,
          hooksMs,
          totalMs,
        },
        "request timing",
      );

      const tenantId = request.ctx?.tenantId;
      if (tenantId && options.persist) {
        await options.persist({
          tenantId,
          route,
          method,
          statusCode,
          rbacMs,
          queryMs,
          hooksMs,
          totalMs,
        });
      }
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
