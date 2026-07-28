import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

import { createAuthenticatePreHandler } from "../auth/authenticate-request.js";
import { createRequireSuperAdmin } from "../admin/require-superadmin.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { WorkloadController } from "./workload-controller.js";
import {
  WorkloadNotFoundError,
  WorkloadActionNotAllowedError,
} from "./workload-controller.js";

const listQuerySchema = z.object({
  kind: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

const listRunsQuerySchema = z.object({
  since: z.string().trim().min(1).optional(),
  until: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  triggeredBy: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().trim().min(1).optional(),
});

const logsQuerySchema = z.object({
  tail: z.coerce.number().int().positive().max(500).optional(),
});

const idParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const runIdParamsSchema = z.object({
  id: z.string().trim().min(1),
  runId: z.string().trim().min(1),
});

const actionParamsSchema = z.object({
  id: z.string().trim().min(1),
  action: z.string().trim().min(1),
});

const traceParamsSchema = z.object({
  rootRunId: z.string().trim().min(1),
});

export const workloadsRoutes: FastifyPluginAsync<{
  firebaseAdminConfig: FirebaseAdminConfig;
  permissionDeps: LoadRequestPermissionsDeps;
  controller: WorkloadController;
}> = async (fastify, opts) => {
  const authenticate = createAuthenticatePreHandler(opts.firebaseAdminConfig, {
    requireTenant: false,
  });
  const requireSuperAdmin = createRequireSuperAdmin(opts.permissionDeps);
  const { controller } = opts;

  fastify.get(
    "/admin/workloads/runs/trace/:rootRunId",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const params = traceParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send({ ok: false, message: "Invalid rootRunId." });
      }
      try {
        const runs = await controller.getRunTrace(params.data.rootRunId);
        return reply.send({ ok: true, runs });
      } catch (err) {
        return replyGcpError(reply, err);
      }
    },
  );

  fastify.get(
    "/admin/workloads",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const query = listQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply
          .status(400)
          .send({ ok: false, message: "Invalid query parameters." });
      }
      const filters = {
        kind: query.data.kind?.split(","),
        source: query.data.source?.split(","),
        status: query.data.status?.split(","),
        q: query.data.q,
      };
      try {
        const workloads = await controller.listWorkloads(filters);
        return reply.send({ ok: true, workloads });
      } catch (err) {
        return replyGcpError(reply, err);
      }
    },
  );

  fastify.get(
    "/admin/workloads/:id",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send({ ok: false, message: "Invalid workload id." });
      }
      try {
        const detail = await controller.getWorkload(params.data.id);
        if (!detail) {
          return reply
            .status(404)
            .send({ ok: false, message: "Workload not found." });
        }
        const { runStats, ...workload } = detail;
        return reply.send({
          ok: true,
          workload,
          ...(runStats
            ? {
                stats24h: {
                  success: runStats.success ?? 0,
                  error: runStats.error ?? 0,
                  timeout: runStats.timeout ?? 0,
                  running: runStats.running ?? 0,
                  cancelled: runStats.cancelled ?? 0,
                },
              }
            : {}),
        });
      } catch (err) {
        return replyGcpError(reply, err);
      }
    },
  );

  fastify.post(
    "/admin/workloads/:id/actions/:action",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const params = actionParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send({ ok: false, message: "Invalid parameters." });
      }
      try {
        await controller.applyAction(
          params.data.id,
          params.data.action,
          request.ctx?.uid,
        );
        const detail = await controller.getWorkload(params.data.id);
        if (!detail) {
          return reply
            .status(404)
            .send({ ok: false, message: "Workload not found." });
        }
        const { runStats: _, ...workload } = detail;
        void _;
        return reply.send({ ok: true, workload });
      } catch (err) {
        if (err instanceof WorkloadNotFoundError) {
          return reply.status(404).send({ ok: false, message: err.message });
        }
        if (err instanceof WorkloadActionNotAllowedError) {
          return reply.status(400).send({ ok: false, message: err.message });
        }
        return replyGcpError(reply, err);
      }
    },
  );

  fastify.get(
    "/admin/workloads/:id/runs",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const params = idParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send({ ok: false, message: "Invalid workload id." });
      }
      const query = listRunsQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply
          .status(400)
          .send({ ok: false, message: "Invalid query parameters." });
      }
      try {
        const result = await controller.listRuns(params.data.id, query.data);
        return reply.send({ ok: true, ...result });
      } catch (err) {
        return replyGcpError(reply, err);
      }
    },
  );

  fastify.get(
    "/admin/workloads/:id/runs/:runId",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const params = runIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send({ ok: false, message: "Invalid parameters." });
      }
      try {
        const run = await controller.getRun(params.data.id, params.data.runId);
        if (!run) {
          return reply
            .status(404)
            .send({ ok: false, message: "Run not found." });
        }
        return reply.send({ ok: true, run });
      } catch (err) {
        return replyGcpError(reply, err);
      }
    },
  );

  fastify.get(
    "/admin/workloads/:id/runs/:runId/logs",
    { preHandler: [authenticate, requireSuperAdmin] },
    async (request, reply) => {
      const params = runIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send({ ok: false, message: "Invalid parameters." });
      }
      const query = logsQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply
          .status(400)
          .send({ ok: false, message: "Invalid query parameters." });
      }
      try {
        const result = await controller.getRunLogs(
          params.data.id,
          params.data.runId,
          { tail: query.data.tail },
        );
        if (!result) {
          return reply
            .status(404)
            .send({ ok: false, message: "Run not found." });
        }
        const cloudEntries = result.logEntries ?? [];
        const excerpt = result.logExcerpt ?? [];
        let source: "cloudLogging" | "excerpt" | "empty" = "empty";
        let entries = cloudEntries;
        if (cloudEntries.length > 0) {
          source = "cloudLogging";
        } else if (excerpt.length > 0) {
          source = "excerpt";
          entries = excerpt.map((message) => ({
            timestamp: result.run.startedAt,
            severity: "DEFAULT",
            message,
          }));
        }
        return reply.send({
          ok: true,
          entries,
          source,
          cloudLoggingUrl: result.cloudLoggingUrl,
        });
      } catch (err) {
        return replyGcpError(reply, err);
      }
    },
  );
};

function replyGcpError(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  err: unknown,
) {
  const message = err instanceof Error ? err.message : String(err);
  return reply
    .status(502)
    .send({ ok: false, message: `GCP adapter error: ${message}` });
}
