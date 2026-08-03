import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import { z } from "zod";

import type {
  StatementExtractionRecord,
  StatementExtractionRepository,
} from "@repo/ai-context/storage";
import { decryptEnvelope, type KmsEnvelopeClient } from "@repo/encryption";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import { createRequirePermission } from "../rbac/create-require-permission.js";
import type { LoadRequestPermissionsDeps } from "../rbac/load-request-permissions.js";
import type { CloudTasksClientConfig } from "../ai/cloud-tasks.client.js";
import {
  createEnqueueDocumentExtraction,
  type EnqueueDocumentExtractionInput,
} from "./enqueue-document-extraction.js";

export type ApplyStatementExtractionFn = (
  tenantId: string,
  userId: string,
  extraction: StatementExtractionRecord,
  decryptedPayload: Record<string, unknown>,
) => Promise<void>;

interface RegisterStatementExtractionRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly permissionDeps: LoadRequestPermissionsDeps;
  readonly statementExtractionRepository: StatementExtractionRepository;
  readonly kmsClient: KmsEnvelopeClient;
  readonly cloudTasksConfig: CloudTasksClientConfig;
  readonly enqueueDocumentExtraction?: (
    payload: EnqueueDocumentExtractionInput,
  ) => Promise<unknown>;
  /**
   * Tenant apply hook. When omitted, apply only decrypts, merges edits, and
   * marks the extraction as applied (platform stub).
   */
  readonly applyExtraction?: ApplyStatementExtractionFn;
  /** Optional hook runner for tenant confirm hooks (soft-wired). */
  readonly hookRunner?: {
    readonly runById?: (
      tenantId: string,
      hookId: string,
      context: Record<string, unknown>,
    ) => Promise<void>;
  };
}

function stripEncryptedPayload(
  record: StatementExtractionRecord,
): Omit<StatementExtractionRecord, "encryptedPayload"> {
  const rest = { ...record };
  Reflect.deleteProperty(rest, "encryptedPayload");
  return rest;
}

function deepMerge(
  base: Record<string, unknown>,
  edits: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(edits)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      out[key] &&
      typeof out[key] === "object" &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(
        out[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function registerStatementExtractionRoutes(
  app: FastifyInstance,
  options: RegisterStatementExtractionRoutesOptions,
): Promise<void> {
  const requireRead = createRequirePermission(
    options.permissionDeps,
    "ai.documentExtract.read",
  );
  const requireRun = createRequirePermission(
    options.permissionDeps,
    "ai.documentExtract.run",
  );

  const enqueue =
    options.enqueueDocumentExtraction ??
    createEnqueueDocumentExtraction(options.cloudTasksConfig);

  const idParams = z.object({ id: z.string().trim().min(1) });
  const listQuery = z.object({
    status: z.string().trim().min(1).optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
  });
  const applyBody = z
    .object({
      edits: z.record(z.string(), z.unknown()).optional(),
    })
    .optional();

  async function loadExtraction(
    request: FastifyRequest,
    reply: FastifyReply,
    id: string,
  ): Promise<{
    readonly tenantId: string;
    readonly uid: string;
    readonly record: StatementExtractionRecord;
  } | null> {
    const tenantId = requireJwtTenant(request, reply);
    if (!tenantId) return null;

    const uid = request.ctx?.uid;
    if (!uid) {
      await replyWithError(
        reply,
        401,
        ApiErrorCode.UNAUTHORIZED,
        "Authentication is required.",
      );
      return null;
    }

    const record = await options.statementExtractionRepository.get(
      tenantId,
      id,
    );
    if (!record) {
      await replyWithError(
        reply,
        404,
        ApiErrorCode.NOT_FOUND,
        "Statement extraction not found.",
      );
      return null;
    }
    return { tenantId, uid, record };
  }

  app.get(
    "/api/statement-extractions",
    {
      preHandler: [options.authenticate, requireRead],
    },
    async (request, reply) => {
      const tenantId = requireJwtTenant(request, reply);
      if (!tenantId) return;

      const parsedQuery = listQuery.safeParse(request.query);
      if (!parsedQuery.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid query.",
        );
      }

      const items = await options.statementExtractionRepository.list(tenantId, {
        ...(parsedQuery.data.status
          ? { status: parsedQuery.data.status }
          : { status: "awaitingReview" }),
        ...(parsedQuery.data.limit ? { limit: parsedQuery.data.limit } : {}),
      });

      return reply.send(
        successEnvelope({
          items: items.map((item) => stripEncryptedPayload(item)),
        }),
      );
    },
  );

  app.get(
    "/api/statement-extractions/:id",
    {
      preHandler: [options.authenticate, requireRead],
    },
    async (request, reply) => {
      const parsedParams = idParams.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const loaded = await loadExtraction(request, reply, parsedParams.data.id);
      if (!loaded) return;

      return reply.send(successEnvelope(stripEncryptedPayload(loaded.record)));
    },
  );

  app.post(
    "/api/statement-extractions/:id/apply",
    {
      preHandler: [options.authenticate, requireRun],
    },
    async (request, reply) => {
      const parsedParams = idParams.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }
      const parsedBody = applyBody.safeParse(request.body);
      if (!parsedBody.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid body.",
        );
      }

      const loaded = await loadExtraction(request, reply, parsedParams.data.id);
      if (!loaded) return;

      if (loaded.record.status !== "awaitingReview") {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          `Extraction status must be awaitingReview (got ${loaded.record.status}).`,
        );
      }

      let decrypted: Record<string, unknown>;
      try {
        const buf = await decryptEnvelope(
          loaded.record.encryptedPayload,
          options.kmsClient,
        );
        const parsed = JSON.parse(buf.toString("utf8")) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Decrypted payload is not a JSON object.");
        }
        decrypted = parsed as Record<string, unknown>;
      } catch (error) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          error instanceof Error
            ? error.message
            : "Failed to decrypt extraction payload.",
        );
      }

      const edits = parsedBody.data?.edits;
      const merged =
        edits && Object.keys(edits).length > 0
          ? deepMerge(decrypted, edits)
          : decrypted;

      try {
        if (options.applyExtraction) {
          await options.applyExtraction(
            loaded.tenantId,
            loaded.uid,
            loaded.record,
            merged,
          );
        } else if (options.hookRunner?.runById) {
          // Soft stub: prefer a future template.onConfirmHookId lookup when wired.
          await options.hookRunner.runById(
            loaded.tenantId,
            loaded.record.templateId ?? "document-extraction-apply",
            {
              extractionId: loaded.record.id,
              attachmentId: loaded.record.attachmentId,
              payload: merged,
              requestedBy: loaded.uid,
            },
          );
        }

        const updated = await options.statementExtractionRepository.update(
          loaded.tenantId,
          loaded.record.id,
          {
            status: "applied",
            appliedAt: new Date().toISOString(),
          },
        );

        return reply.send(successEnvelope(stripEncryptedPayload(updated)));
      } catch (error) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          error instanceof Error
            ? error.message
            : "Failed to apply statement extraction.",
        );
      }
    },
  );

  app.post(
    "/api/statement-extractions/:id/reject",
    {
      preHandler: [options.authenticate, requireRun],
    },
    async (request, reply) => {
      const parsedParams = idParams.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const loaded = await loadExtraction(request, reply, parsedParams.data.id);
      if (!loaded) return;

      if (
        loaded.record.status !== "awaitingReview" &&
        loaded.record.status !== "processing"
      ) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          `Cannot reject extraction in status ${loaded.record.status}.`,
        );
      }

      const updated = await options.statementExtractionRepository.update(
        loaded.tenantId,
        loaded.record.id,
        {
          status: "rejected",
          rejectedAt: new Date().toISOString(),
        },
      );
      return reply.send(successEnvelope(stripEncryptedPayload(updated)));
    },
  );

  app.post(
    "/api/statement-extractions/:id/rerun",
    {
      preHandler: [options.authenticate, requireRun],
    },
    async (request, reply) => {
      const parsedParams = idParams.safeParse(request.params);
      if (!parsedParams.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid request.",
        );
      }

      const loaded = await loadExtraction(request, reply, parsedParams.data.id);
      if (!loaded) return;

      try {
        const taskName = await enqueue({
          tenantId: loaded.tenantId,
          attachmentId: loaded.record.attachmentId,
          ...(loaded.record.templateId
            ? { templateId: loaded.record.templateId }
            : {}),
          requestedBy: loaded.uid,
        });
        return reply.send(
          successEnvelope({
            enqueued: true,
            taskName,
            attachmentId: loaded.record.attachmentId,
          }),
        );
      } catch (error) {
        return replyWithError(
          reply,
          500,
          ApiErrorCode.INTERNAL_ERROR,
          error instanceof Error
            ? error.message
            : "Failed to enqueue document extraction.",
        );
      }
    },
  );
}
