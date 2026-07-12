import { createHmac, timingSafeEqual } from "node:crypto";

import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  buildGmailAuthorizeUrl,
  createEmailMatchBindingInputSchema,
  encryptUserSecret,
  exchangeGmailAuthCode,
  GMAIL_OAUTH_SCOPES,
  patchEmailMatchBindingInputSchema,
  toPublicGmailStatus,
} from "@repo/gmail-ingest";
import type {
  EmailIngestJobRepository,
  EmailMatchBindingRepository,
  GmailConnectionRepository,
} from "@repo/gcp-firebase";

import { ApiErrorCode } from "../crud/errors.js";
import { replyWithError, successEnvelope } from "../crud/response.js";
import { requireJwtTenant } from "../auth/resolve-target-tenant-id.js";
import type { GmailTasksClient } from "./gmail-tasks.client.js";

interface GmailOAuthEnv {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly stateSecret: string;
  readonly encryptionMasterKey: string;
  readonly pubsubTopicName?: string;
}

interface RegisterGmailIngestRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly gmailConnectionRepository: GmailConnectionRepository;
  readonly emailMatchBindingRepository: EmailMatchBindingRepository;
  readonly emailIngestJobRepository: EmailIngestJobRepository;
  readonly gmailTasksClient: GmailTasksClient;
  readonly oauth: GmailOAuthEnv | null;
}

function signOAuthState(
  secret: string,
  payload: {
    readonly uid: string;
    readonly tenantId: string;
    readonly nonce: string;
  },
): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyOAuthState(
  secret: string,
  state: string,
): { readonly uid: string; readonly tenantId: string } | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as { uid?: string; tenantId?: string };
    if (!parsed.uid || !parsed.tenantId) return null;
    return { uid: parsed.uid, tenantId: parsed.tenantId };
  } catch {
    return null;
  }
}

const backfillBodySchema = z.object({
  afterDate: z.string().trim().optional(),
  beforeDate: z.string().trim().optional(),
  maxMessages: z.coerce.number().int().min(1).max(500).optional(),
});

const bindingIdParamsSchema = z.object({
  bindingId: z.string().trim().min(1),
});

export async function registerGmailIngestRoutes(
  app: FastifyInstance,
  options: RegisterGmailIngestRoutesOptions,
): Promise<void> {
  app.get(
    "/api/gmail/status",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const uid = request.ctx?.uid;
      if (!uid) {
        return replyWithError(
          reply,
          401,
          ApiErrorCode.UNAUTHORIZED,
          "Authentication required.",
        );
      }
      const record = await options.gmailConnectionRepository.get(uid);
      return reply.send(successEnvelope(toPublicGmailStatus(record)));
    },
  );

  app.post(
    "/api/gmail/connect",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      if (!options.oauth) {
        return replyWithError(
          reply,
          503,
          ApiErrorCode.INTERNAL_ERROR,
          "Gmail OAuth is not configured.",
        );
      }
      const uid = request.ctx?.uid;
      const tenantId = requireJwtTenant(request, reply);
      if (!uid || !tenantId) return;

      const state = signOAuthState(options.oauth.stateSecret, {
        uid,
        tenantId,
        nonce: `${Date.now()}`,
      });
      const authorizeUrl = buildGmailAuthorizeUrl(
        {
          clientId: options.oauth.clientId,
          clientSecret: options.oauth.clientSecret,
          redirectUri: options.oauth.redirectUri,
        },
        state,
      );
      return reply.send(successEnvelope({ authorizeUrl }));
    },
  );

  app.get("/api/gmail/oauth/callback", async (request, reply) => {
    if (!options.oauth) {
      return reply.status(503).send("Gmail OAuth is not configured.");
    }
    const query = z
      .object({
        code: z.string().trim().min(1),
        state: z.string().trim().min(1),
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send("Invalid OAuth callback.");
    }

    const verified = verifyOAuthState(
      options.oauth.stateSecret,
      query.data.state,
    );
    if (!verified) {
      return reply.status(400).send("Invalid OAuth state.");
    }

    try {
      const tokens = await exchangeGmailAuthCode(
        {
          clientId: options.oauth.clientId,
          clientSecret: options.oauth.clientSecret,
          redirectUri: options.oauth.redirectUri,
        },
        query.data.code,
      );

      if (!tokens.refresh_token) {
        await options.gmailConnectionRepository.upsert(verified.uid, {
          status: "reauth_required",
          lastError: "Missing refresh token. Reconnect with consent.",
        });
        return reply
          .status(302)
          .redirect(
            "/account/settings/integrations/email?gmail=reauth_required",
          );
      }

      const expiresAt = new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString();
      const encryptedRefreshToken = encryptUserSecret(
        options.oauth.encryptionMasterKey,
        verified.uid,
        tokens.refresh_token,
      );
      const encryptedAccessToken = encryptUserSecret(
        options.oauth.encryptionMasterKey,
        verified.uid,
        tokens.access_token,
      );

      const { GmailApiClient } = await import("@repo/gmail-ingest");
      const client = new GmailApiClient(tokens.access_token);
      const profile = await client.getProfile();

      await options.gmailConnectionRepository.upsert(verified.uid, {
        status: "connected",
        emailAddress: profile.emailAddress,
        scopes: tokens.scope
          ? tokens.scope.split(/\s+/).filter(Boolean)
          : [...GMAIL_OAUTH_SCOPES],
        encryptedRefreshToken,
        encryptedAccessToken,
        accessTokenExpiresAt: expiresAt,
        lastError: null,
      });

      return reply
        .status(302)
        .redirect("/account/settings/integrations/email?gmail=connected");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OAuth callback failed";
      await options.gmailConnectionRepository.upsert(verified.uid, {
        status: "error",
        lastError: message.slice(0, 500),
      });
      return reply
        .status(302)
        .redirect("/account/settings/integrations/email?gmail=error");
    }
  });

  app.post(
    "/api/gmail/disconnect",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const uid = request.ctx?.uid;
      if (!uid) {
        return replyWithError(
          reply,
          401,
          ApiErrorCode.UNAUTHORIZED,
          "Authentication required.",
        );
      }
      await options.gmailConnectionRepository.delete(uid);
      return reply.send(successEnvelope({ disconnected: true }));
    },
  );

  app.post(
    "/api/gmail/backfill",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const uid = request.ctx?.uid;
      const tenantId = requireJwtTenant(request, reply);
      if (!uid || !tenantId) return;

      const connection = await options.gmailConnectionRepository.get(uid);
      if (!connection || connection.status !== "connected") {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Connect Gmail before starting a backfill.",
        );
      }

      const parsed = backfillBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid backfill request.",
        );
      }

      const job = await options.emailIngestJobRepository.create({
        tenantId,
        userId: uid,
        kind: "backfill",
        title: "Gmail backfill",
      });

      await options.gmailTasksClient.enqueueBackfill({
        tenantId,
        userId: uid,
        jobId: job.id,
        ...(parsed.data.afterDate ? { afterDate: parsed.data.afterDate } : {}),
        ...(parsed.data.beforeDate
          ? { beforeDate: parsed.data.beforeDate }
          : {}),
        ...(parsed.data.maxMessages
          ? { maxMessages: parsed.data.maxMessages }
          : {}),
      });

      return reply.send(successEnvelope({ jobId: job.id }));
    },
  );

  app.get(
    "/api/gmail/bindings",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const uid = request.ctx?.uid;
      const tenantId = requireJwtTenant(request, reply);
      if (!uid || !tenantId) return;
      const query = z
        .object({
          entityName: z.string().trim().min(1).optional(),
          recordId: z.string().trim().min(1).optional(),
        })
        .safeParse(request.query);
      if (!query.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid query.",
        );
      }

      const items =
        query.data.entityName && query.data.recordId
          ? await options.emailMatchBindingRepository.listForRecord(
              tenantId,
              query.data.entityName,
              query.data.recordId,
            )
          : await options.emailMatchBindingRepository.listForUser(
              tenantId,
              uid,
            );

      return reply.send(
        successEnvelope({
          items: items.filter((item) => item.userId === uid),
        }),
      );
    },
  );

  app.post(
    "/api/gmail/bindings",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const uid = request.ctx?.uid;
      const tenantId = requireJwtTenant(request, reply);
      if (!uid || !tenantId) return;
      const parsed = createEmailMatchBindingInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid binding.",
        );
      }
      const created = await options.emailMatchBindingRepository.create(
        tenantId,
        uid,
        parsed.data,
      );
      return reply.status(201).send(successEnvelope(created));
    },
  );

  app.patch(
    "/api/gmail/bindings/:bindingId",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const uid = request.ctx?.uid;
      const tenantId = requireJwtTenant(request, reply);
      if (!uid || !tenantId) return;
      const params = bindingIdParamsSchema.safeParse(request.params);
      const body = patchEmailMatchBindingInputSchema.safeParse(request.body);
      if (!params.success || !body.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid binding patch.",
        );
      }
      const updated = await options.emailMatchBindingRepository.patch(
        tenantId,
        params.data.bindingId,
        uid,
        body.data,
      );
      if (!updated) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Binding not found.",
        );
      }
      return reply.send(successEnvelope(updated));
    },
  );

  app.delete(
    "/api/gmail/bindings/:bindingId",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const uid = request.ctx?.uid;
      const tenantId = requireJwtTenant(request, reply);
      if (!uid || !tenantId) return;
      const params = bindingIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid binding id.",
        );
      }
      const deleted = await options.emailMatchBindingRepository.delete(
        tenantId,
        params.data.bindingId,
        uid,
      );
      if (!deleted) {
        return replyWithError(
          reply,
          404,
          ApiErrorCode.NOT_FOUND,
          "Binding not found.",
        );
      }
      return reply.send(successEnvelope({ deleted: true }));
    },
  );

  app.get(
    "/api/gmail/jobs",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const uid = request.ctx?.uid;
      const tenantId = requireJwtTenant(request, reply);
      if (!uid || !tenantId) return;
      const jobs = await options.emailIngestJobRepository.listRecent(tenantId, {
        limit: 50,
      });
      return reply.send(
        successEnvelope({
          items: jobs.filter((job) => job.userId === uid),
        }),
      );
    },
  );

  app.post("/api/gmail/pubsub", async (request, reply) => {
    const body = z
      .object({
        message: z
          .object({
            data: z.string().trim().min(1),
            attributes: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
      })
      .safeParse(request.body ?? {});

    if (!body.success || !body.data.message?.data) {
      return reply.status(204).send();
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(body.data.message.data, "base64").toString("utf8"),
      ) as { emailAddress?: string; historyId?: string };

      // Pub/Sub notifications are mailbox-wide; clients enqueue history sync
      // after identifying the user by connected email address.
      if (!decoded.emailAddress || !decoded.historyId) {
        return reply.status(204).send();
      }

      return reply.status(204).send();
    } catch {
      return reply.status(204).send();
    }
  });
}
