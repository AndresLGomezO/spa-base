import { createHmac, timingSafeEqual } from "node:crypto";

import type { FastifyInstance, preHandlerAsyncHookHandler } from "fastify";
import { z } from "zod";

import {
  buildGmailAuthorizeUrl,
  computeGmailWatchRenewAt,
  createEmailMatchBindingInputSchema,
  encryptUserSecret,
  exchangeGmailAuthCode,
  GMAIL_OAUTH_SCOPES,
  normalizeGmailEmail,
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
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";
import type { GmailTasksClient } from "./gmail-tasks.client.js";

interface GmailOAuthEnv {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly stateSecret: string;
  readonly encryptionMasterKey: string;
  readonly webAppOrigin: string;
  readonly allowedWebOrigins: readonly string[];
  readonly pubsubTopicName?: string;
}

interface RegisterGmailIngestRoutesOptions {
  readonly authenticate: preHandlerAsyncHookHandler;
  readonly gmailConnectionRepository: GmailConnectionRepository;
  readonly emailMatchBindingRepository: EmailMatchBindingRepository;
  readonly emailIngestJobRepository: EmailIngestJobRepository;
  readonly gmailTasksClient: GmailTasksClient;
  readonly entityRuntime: EntityRuntimeContext;
  readonly oauth: GmailOAuthEnv | null;
  /** Effective mode (env default + platform override). Resolved per request. */
  readonly getDeliveryMode: () => Promise<"poll" | "push">;
}

const GMAIL_SETTINGS_PATH = "/account/settings/integrations/email";

function signOAuthState(
  secret: string,
  payload: {
    readonly uid: string;
    readonly tenantId: string;
    readonly nonce: string;
    readonly returnOrigin: string;
  },
): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyOAuthState(
  secret: string,
  state: string,
): {
  readonly uid: string;
  readonly tenantId: string;
  readonly returnOrigin: string;
} | null {
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
    ) as {
      uid?: string;
      tenantId?: string;
      returnOrigin?: string;
    };
    if (!parsed.uid || !parsed.tenantId) return null;
    return {
      uid: parsed.uid,
      tenantId: parsed.tenantId,
      returnOrigin: parsed.returnOrigin ?? "",
    };
  } catch {
    return null;
  }
}

function resolveReturnOrigin(
  requested: string | undefined,
  allowed: readonly string[],
  fallback: string,
): string {
  const normalized = requested?.replace(/\/$/, "") ?? "";
  if (normalized && allowed.includes(normalized)) {
    return normalized;
  }
  return fallback.replace(/\/$/, "");
}

function gmailSettingsRedirectUrl(
  origin: string,
  result: "connected" | "reauth_required" | "error",
): string {
  return `${origin.replace(/\/$/, "")}${GMAIL_SETTINGS_PATH}?gmail=${result}`;
}

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

      const body = z
        .object({
          returnOrigin: z.string().trim().url().optional(),
        })
        .safeParse(request.body ?? {});
      const returnOrigin = resolveReturnOrigin(
        body.success ? body.data.returnOrigin : undefined,
        options.oauth.allowedWebOrigins,
        options.oauth.webAppOrigin,
      );

      const state = signOAuthState(options.oauth.stateSecret, {
        uid,
        tenantId,
        nonce: `${Date.now()}`,
        returnOrigin,
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

    const returnOrigin = resolveReturnOrigin(
      verified.returnOrigin || undefined,
      options.oauth.allowedWebOrigins,
      options.oauth.webAppOrigin,
    );

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
          .redirect(gmailSettingsRedirectUrl(returnOrigin, "reauth_required"));
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
      const emailAddress = normalizeGmailEmail(profile.emailAddress);

      let historyId = profile.historyId ? String(profile.historyId) : null;
      let watchExpiration: string | null = null;

      const deliveryMode = await options.getDeliveryMode();
      const startPushWatch =
        deliveryMode === "push" && Boolean(options.oauth.pubsubTopicName);

      if (startPushWatch && options.oauth.pubsubTopicName) {
        try {
          const watch = await client.watch(options.oauth.pubsubTopicName);
          historyId = String(watch.historyId);
          watchExpiration = new Date(Number(watch.expiration)).toISOString();
        } catch (watchError) {
          const watchMessage =
            watchError instanceof Error
              ? watchError.message
              : "Failed to start Gmail watch";
          await options.gmailConnectionRepository.upsert(verified.uid, {
            status: "connected",
            tenantId: verified.tenantId,
            emailAddress,
            scopes: tokens.scope
              ? tokens.scope.split(/\s+/).filter(Boolean)
              : [...GMAIL_OAUTH_SCOPES],
            encryptedRefreshToken,
            encryptedAccessToken,
            accessTokenExpiresAt: expiresAt,
            historyId,
            watchExpiration: null,
            lastError: `Connected, but Gmail push watch failed: ${watchMessage.slice(0, 400)}`,
          });
          return reply
            .status(302)
            .redirect(gmailSettingsRedirectUrl(returnOrigin, "connected"));
        }
      }

      await options.gmailConnectionRepository.upsert(verified.uid, {
        status: "connected",
        tenantId: verified.tenantId,
        emailAddress,
        scopes: tokens.scope
          ? tokens.scope.split(/\s+/).filter(Boolean)
          : [...GMAIL_OAUTH_SCOPES],
        encryptedRefreshToken,
        encryptedAccessToken,
        accessTokenExpiresAt: expiresAt,
        historyId,
        watchExpiration,
        lastError: null,
      });

      if (startPushWatch && watchExpiration) {
        await options.gmailTasksClient.enqueueWatchRenew(
          {
            userId: verified.uid,
            tenantId: verified.tenantId,
          },
          { scheduleTime: computeGmailWatchRenewAt(watchExpiration) },
        );
      }

      return reply
        .status(302)
        .redirect(gmailSettingsRedirectUrl(returnOrigin, "connected"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OAuth callback failed";
      await options.gmailConnectionRepository.upsert(verified.uid, {
        status: "error",
        lastError: message.slice(0, 500),
      });
      return reply
        .status(302)
        .redirect(gmailSettingsRedirectUrl(returnOrigin, "error"));
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
    "/api/gmail/sync",
    { preHandler: [options.authenticate] },
    async (request, reply) => {
      const uid = request.ctx?.uid;
      const tenantId = requireJwtTenant(request, reply);
      if (!uid || !tenantId) return;

      const body = z
        .object({
          bindingId: z.string().trim().min(1).optional(),
        })
        .safeParse(request.body ?? {});
      if (!body.success) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Invalid sync request.",
        );
      }

      const connection = await options.gmailConnectionRepository.get(uid);
      if (!connection || connection.status !== "connected") {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Connect Gmail before syncing.",
        );
      }

      let bindingName: string | null = null;
      if (body.data.bindingId) {
        const binding = await options.emailMatchBindingRepository.get(
          tenantId,
          body.data.bindingId,
        );
        if (!binding || binding.userId !== uid) {
          return replyWithError(
            reply,
            404,
            ApiErrorCode.NOT_FOUND,
            "Email matching binding not found.",
          );
        }
        if (!binding.enabled) {
          return replyWithError(
            reply,
            400,
            ApiErrorCode.VALIDATION_ERROR,
            "Enable the binding before syncing.",
          );
        }
        bindingName = binding.name?.trim() || binding.id;
      }

      // Keep tenantId + email lookup index fresh for Pub/Sub (and older connects).
      await options.gmailConnectionRepository.upsert(uid, {
        status: "connected",
        tenantId,
      });

      const job = await options.emailIngestJobRepository.create({
        tenantId,
        userId: uid,
        kind: "windowSync",
        title: bindingName
          ? `Gmail binding sync: ${bindingName}`
          : "Gmail sync now",
      });

      await options.gmailTasksClient.enqueueWindowSync({
        tenantId,
        userId: uid,
        jobId: job.id,
        ...(body.data.bindingId ? { bindingId: body.data.bindingId } : {}),
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
      await options.entityRuntime.loadTenantDefinitions(tenantId);
      const entity = options.entityRuntime.resolveEntity(
        parsed.data.entityName,
        tenantId,
      );
      if (!entity || entity.metadata.emailMatchingEnabled !== true) {
        return replyWithError(
          reply,
          400,
          ApiErrorCode.VALIDATION_ERROR,
          "Email matching is not enabled for this entity.",
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
    if ((await options.getDeliveryMode()) !== "push") {
      return reply.status(204).send();
    }

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
      ) as { emailAddress?: string; historyId?: string | number };

      // Pub/Sub notifications are mailbox-wide; resolve the user by connected email.
      if (!decoded.emailAddress || decoded.historyId == null) {
        return reply.status(204).send();
      }

      const connection = await options.gmailConnectionRepository.findByEmail(
        decoded.emailAddress,
      );
      if (
        !connection ||
        connection.status !== "connected" ||
        !connection.tenantId
      ) {
        return reply.status(204).send();
      }

      const job = await options.emailIngestJobRepository.create({
        tenantId: connection.tenantId,
        userId: connection.userId,
        kind: "windowSync",
        title: "Gmail push window sync",
      });

      await options.gmailTasksClient.enqueueWindowSync({
        tenantId: connection.tenantId,
        userId: connection.userId,
        jobId: job.id,
      });

      return reply.status(204).send();
    } catch {
      return reply.status(204).send();
    }
  });
}
