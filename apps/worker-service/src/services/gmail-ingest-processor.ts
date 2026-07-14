import { z } from "zod";

import {
  bindingMatchesMessage,
  buildEmailAiPrompt,
  buildEmailHookEnvelope,
  buildGmailSearchQuery,
  computeGmailWatchRenewAt,
  decryptUserSecret,
  emailAiExtractResultSchema,
  extractBodyFields,
  findBestMatchingBinding,
  GmailApiClient,
  refreshGmailAccessToken,
  resolveMatchedSubscriptionName,
  shouldRenewGmailWatchSoon,
  type EmailAiExtractResult,
  type EmailIngestStepTraceEntry,
  type GmailIngestDeliveryMode,
  type GmailMessageEnvelope,
} from "@repo/gmail-ingest";
import {
  createFirestoreAdminEmailIngestJobRepository,
  createFirestoreAdminEmailIngestProcessedRepository,
  createFirestoreAdminEmailMatchBindingRepository,
  createFirestoreAdminGmailConnectionRepository,
  type EmailIngestJobRepository,
  type EmailIngestProcessedRepository,
  type EmailMatchBindingRepository,
  type FirebaseAdminConfig,
  type GmailConnectionRepository,
} from "@repo/gcp-firebase";
import {
  formatHookEvent,
  isEmailTrigger,
  runDataHook,
  type HookLogger,
} from "@repo/hooks";
import { extractJsonFromModelAnswer } from "@repo/ai-engine/extract-json-from-model-answer";
import {
  generateModelAnswer,
  type VertexAiConfig,
} from "@repo/ai-engine/vertex-ai.client";
import { getAllKnownPermissions } from "@repo/rbac";

import type { DataHookProcessorDeps } from "./data-hook-processor.js";
import {
  buildHookEntityServices,
  resolveHookUserContext,
} from "../hooks/worker-hook-entity-services.js";
import {
  createDataHookExecutionRecorderForTenant,
  createRecordDataHookExecution,
} from "../hooks/record-data-hook-execution.js";
import { createSendUserNotification } from "../notifications/create-send-user-notification.js";

export const gmailBackfillTaskPayloadSchema = z.object({
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
  afterDate: z.string().trim().optional(),
  beforeDate: z.string().trim().optional(),
  maxMessages: z.number().int().min(1).max(500).optional(),
  bindingId: z.string().trim().min(1).optional(),
  reprocess: z.boolean().optional().default(false),
});

export const gmailHistorySyncTaskPayloadSchema = z.object({
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
  historyId: z.string().trim().optional(),
});

export const gmailWatchRenewTaskPayloadSchema = z.object({
  userId: z.string().trim().min(1),
  jobId: z.string().trim().optional(),
  tenantId: z.string().trim().optional(),
});

export const gmailProcessMessageTaskPayloadSchema = z.object({
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
  gmailMessageId: z.string().trim().min(1),
  bindingId: z.string().trim().min(1).optional(),
  reprocess: z.boolean().optional().default(false),
});

export interface GmailIngestProcessorDeps extends DataHookProcessorDeps {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly gmailConnectionRepository: GmailConnectionRepository;
  readonly emailMatchBindingRepository: EmailMatchBindingRepository;
  readonly emailIngestProcessedRepository: EmailIngestProcessedRepository;
  readonly emailIngestJobRepository: EmailIngestJobRepository;
  readonly encryptionMasterKey: string;
  readonly gmailOAuthClientId: string;
  readonly gmailOAuthClientSecret: string;
  readonly gmailPubsubTopic?: string;
  readonly deliveryMode: GmailIngestDeliveryMode;
  readonly vertexAiConfig: VertexAiConfig;
  readonly enqueueProcessMessage: (payload: {
    readonly tenantId: string;
    readonly userId: string;
    readonly jobId: string;
    readonly gmailMessageId: string;
    readonly bindingId?: string;
    readonly reprocess?: boolean;
  }) => Promise<void>;
  readonly enqueueHistorySync?: (payload: {
    readonly tenantId: string;
    readonly userId: string;
    readonly jobId: string;
    readonly historyId?: string;
  }) => Promise<void>;
  /** Schedule the next watch renew before expiration (Cloud Tasks or local delay). */
  readonly scheduleWatchRenew?: (payload: {
    readonly userId: string;
    readonly tenantId?: string;
    readonly scheduleTime: Date;
  }) => Promise<void>;
}

function step(
  stepId: string,
  status: EmailIngestStepTraceEntry["status"],
  message: string,
  meta?: Record<string, unknown>,
): EmailIngestStepTraceEntry {
  return {
    stepId,
    timestamp: new Date().toISOString(),
    status,
    message,
    ...(meta ? { meta } : {}),
  };
}

async function appendJobStep(
  deps: GmailIngestProcessorDeps,
  tenantId: string,
  jobId: string,
  entry: EmailIngestStepTraceEntry,
): Promise<void> {
  await deps.emailIngestJobRepository.appendStep(tenantId, jobId, entry);
}

async function resolveAccessToken(
  deps: GmailIngestProcessorDeps,
  userId: string,
): Promise<{
  readonly accessToken: string;
  readonly emailAddress: string | null;
}> {
  const connection = await deps.gmailConnectionRepository.get(userId);
  if (!connection || connection.status !== "connected") {
    throw new Error("Gmail is not connected for this user.");
  }
  if (!connection.encryptedRefreshToken) {
    throw new Error("Missing Gmail refresh token.");
  }

  const refreshToken = decryptUserSecret(
    deps.encryptionMasterKey,
    userId,
    connection.encryptedRefreshToken,
  );
  const tokens = await refreshGmailAccessToken(
    {
      clientId: deps.gmailOAuthClientId,
      clientSecret: deps.gmailOAuthClientSecret,
    },
    refreshToken,
  );
  const encryptedAccessToken = (
    await import("@repo/gmail-ingest")
  ).encryptUserSecret(deps.encryptionMasterKey, userId, tokens.access_token);
  await deps.gmailConnectionRepository.upsert(userId, {
    status: "connected",
    encryptedAccessToken,
    accessTokenExpiresAt: new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString(),
    lastError: null,
  });
  return {
    accessToken: tokens.access_token,
    emailAddress: connection.emailAddress,
  };
}

async function renewGmailWatchAndSchedule(
  deps: GmailIngestProcessorDeps,
  options: {
    readonly userId: string;
    readonly accessToken: string;
    readonly tenantId?: string | null;
    readonly force?: boolean;
  },
  logger: HookLogger,
): Promise<void> {
  if (deps.deliveryMode !== "push" || !deps.gmailPubsubTopic) return;

  const connection = await deps.gmailConnectionRepository.get(options.userId);
  if (!connection || connection.status !== "connected") return;

  if (
    !options.force &&
    !shouldRenewGmailWatchSoon(connection.watchExpiration)
  ) {
    return;
  }

  const gmail = new GmailApiClient(options.accessToken);
  const watch = await gmail.watch(deps.gmailPubsubTopic);
  const watchExpiration = new Date(Number(watch.expiration)).toISOString();
  const tenantId = options.tenantId ?? connection.tenantId ?? undefined;

  await deps.gmailConnectionRepository.upsert(options.userId, {
    status: "connected",
    watchExpiration,
    // Watch renew task updates the cursor; opportunistic renew during sync does not,
    // so an in-flight history.list from an older startHistoryId cannot be skipped.
    ...(options.force || !connection.historyId
      ? { historyId: String(watch.historyId) }
      : {}),
    ...(tenantId ? { tenantId } : {}),
  });

  if (deps.scheduleWatchRenew) {
    await deps.scheduleWatchRenew({
      userId: options.userId,
      ...(tenantId ? { tenantId } : {}),
      scheduleTime: computeGmailWatchRenewAt(watchExpiration),
    });
  }

  logger.info("Gmail watch renewed", {
    meta: {
      userId: options.userId,
      historyId: watch.historyId,
      watchExpiration,
    },
  });
}

async function runAiExtract(
  deps: GmailIngestProcessorDeps,
  options: {
    readonly email: GmailMessageEnvelope;
    readonly entityName: string;
    readonly record: Record<string, unknown>;
    readonly fieldNames: readonly string[];
    readonly aiInstructions?: string | null;
  },
): Promise<EmailAiExtractResult | null> {
  try {
    const prompt = buildEmailAiPrompt({
      email: options.email,
      entityName: options.entityName,
      recordSnapshot: options.record,
      fieldNames: options.fieldNames,
      aiInstructions: options.aiInstructions,
    });
    const answer = await generateModelAnswer(
      deps.vertexAiConfig,
      {
        systemInstruction:
          "You are an email structuring assistant. Reply with JSON only.",
        userText: prompt,
      },
      { responseMimeType: "application/json" },
    );
    const json = extractJsonFromModelAnswer(answer);
    const parsed = emailAiExtractResultSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function processGmailProcessMessage(
  deps: GmailIngestProcessorDeps,
  payload: z.infer<typeof gmailProcessMessageTaskPayloadSchema>,
  logger: HookLogger,
): Promise<void> {
  const { tenantId, userId, jobId, gmailMessageId } = payload;

  await appendJobStep(
    deps,
    tenantId,
    jobId,
    step("fetch-message", "info", "Fetching Gmail message", {
      gmailMessageId,
    }),
  );

  if (!payload.reprocess) {
    const existing = await deps.emailIngestProcessedRepository.get(
      tenantId,
      userId,
      gmailMessageId,
    );
    if (existing && existing.status === "processed") {
      await appendJobStep(
        deps,
        tenantId,
        jobId,
        step("dedup", "skipped", "Message already processed", {
          gmailMessageId,
        }),
      );
      return;
    }
  } else {
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step(
        "dedup",
        "info",
        "Reprocess requested; ignoring prior dedup marker",
        {
          gmailMessageId,
        },
      ),
    );
  }

  const { accessToken } = await resolveAccessToken(deps, userId);
  const gmail = new GmailApiClient(accessToken);
  const email = await gmail.getMessage(gmailMessageId);

  await appendJobStep(
    deps,
    tenantId,
    jobId,
    step("match-bindings", "info", "Matching email bindings", {
      from: email.from,
      subject: email.subject,
    }),
  );

  const bindings = await deps.emailMatchBindingRepository.listForUser(
    tenantId,
    userId,
  );
  await deps.entityRuntime.ensureTenantEntitiesLoaded(tenantId);
  const enabledBindings = bindings.filter((candidate) => {
    const entity = deps.entityRuntime.resolveEntity(
      candidate.entityName,
      tenantId,
    );
    return entity?.metadata.emailMatchingEnabled === true;
  });

  let binding = null as (typeof enabledBindings)[number] | null;
  if (payload.bindingId) {
    const preferred = enabledBindings.find(
      (candidate) => candidate.id === payload.bindingId,
    );
    if (preferred && bindingMatchesMessage(preferred, email)) {
      binding = preferred;
    }
  } else {
    binding = findBestMatchingBinding(enabledBindings, email);
  }
  if (!binding) {
    await deps.emailIngestProcessedRepository.upsert(tenantId, {
      userId,
      gmailMessageId,
      threadId: email.threadId,
      bindingId: null,
      entityName: null,
      recordId: null,
      status: "skipped_no_match",
      processedAt: new Date().toISOString(),
    });
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step(
        "match-bindings",
        "skipped",
        payload.bindingId
          ? "Preferred binding did not match"
          : "No binding matched",
        payload.bindingId ? { bindingId: payload.bindingId } : undefined,
      ),
    );
    return;
  }

  await deps.hookRuntime.ensureTenantHooksLoaded(tenantId);

  const repository = deps.entityRuntime.getRepository(
    tenantId,
    binding.entityName,
  );
  if (!repository) {
    await deps.emailIngestProcessedRepository.upsert(tenantId, {
      userId,
      gmailMessageId,
      threadId: email.threadId,
      bindingId: binding.id,
      entityName: binding.entityName,
      recordId: binding.recordId,
      status: "failed",
      errorMessage: "Entity repository unavailable",
      processedAt: new Date().toISOString(),
    });
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step("load-record", "error", "Entity repository unavailable", {
        entityName: binding.entityName,
      }),
    );
    return;
  }
  const record = await repository.findById(binding.recordId, tenantId);
  if (!record) {
    await deps.emailIngestProcessedRepository.upsert(tenantId, {
      userId,
      gmailMessageId,
      threadId: email.threadId,
      bindingId: binding.id,
      entityName: binding.entityName,
      recordId: binding.recordId,
      status: "failed",
      errorMessage: "Matched record not found",
      processedAt: new Date().toISOString(),
    });
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step("load-record", "error", "Matched entity record missing", {
        entityName: binding.entityName,
        recordId: binding.recordId,
      }),
    );
    return;
  }

  let extracted: EmailAiExtractResult | null = null;
  let relevant = true;
  if (binding.useAi) {
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step("ai-extract", "info", "Running AI extract"),
    );
    const entity = deps.entityRuntime.resolveEntity(
      binding.entityName,
      tenantId,
    );
    const fieldNames = entity ? Object.keys(entity.metadata.fields) : [];
    extracted = await runAiExtract(deps, {
      email,
      entityName: binding.entityName,
      record: { ...record },
      fieldNames,
      aiInstructions: binding.aiInstructions,
    });
    if (extracted) {
      extracted = {
        ...extracted,
        fields: { ...extracted.fields, extractSource: "ai" },
      };
    }
    relevant = extracted?.relevant ?? false;
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step(
        "ai-extract",
        extracted ? "success" : "error",
        extracted ? `AI relevance=${extracted.relevant}` : "AI extract failed",
        extracted ? { reason: extracted.reason } : undefined,
      ),
    );
  } else if ((binding.bodyFieldExtractors?.length ?? 0) > 0) {
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step("body-extract", "info", "Running body field extractors"),
    );
    extracted = extractBodyFields(
      email.bodyText,
      binding.bodyFieldExtractors ?? [],
    );
    relevant = extracted.relevant;
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step(
        "body-extract",
        extracted.relevant ? "success" : "skipped",
        extracted.reason,
        { fields: extracted.fields },
      ),
    );
  }

  if (!relevant) {
    await deps.emailIngestProcessedRepository.upsert(tenantId, {
      userId,
      gmailMessageId,
      threadId: email.threadId,
      bindingId: binding.id,
      entityName: binding.entityName,
      recordId: binding.recordId,
      status: "skipped_irrelevant",
      processedAt: new Date().toISOString(),
    });
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step("relevance", "skipped", "Email marked irrelevant"),
    );
    return;
  }

  if (extracted && binding.entityName === "financialItem") {
    const existingMatchedName =
      typeof extracted.fields.matchedSubscriptionName === "string"
        ? extracted.fields.matchedSubscriptionName.trim()
        : "";
    const description =
      typeof extracted.fields.description === "string"
        ? extracted.fields.description.trim()
        : "";
    if (!existingMatchedName && description.length > 0) {
      const children = await repository.findByField({
        tenantId,
        field: "parentFinancialItemId",
        value: binding.recordId,
        limit: 200,
      });
      const matchedSubscriptionName = resolveMatchedSubscriptionName({
        description,
        children: children.items
          .map((child) => child as Record<string, unknown>)
          .filter(
            (child) =>
              typeof child.name === "string" && child.name.trim().length > 0,
          )
          .map((child) => ({
            name: String(child.name),
            status: child.status,
            billingAliases: child.billingAliases,
          })),
      });
      if (matchedSubscriptionName) {
        extracted = {
          ...extracted,
          fields: {
            ...extracted.fields,
            matchedSubscriptionName,
          },
        };
        await appendJobStep(
          deps,
          tenantId,
          jobId,
          step(
            "subscription-alias",
            "success",
            `Matched subscription via billingAliases: ${matchedSubscriptionName}`,
            { matchedSubscriptionName },
          ),
        );
      }
    }
  }

  const user = await resolveHookUserContext(
    tenantId,
    userId,
    deps.permissionDeps,
    {
      getKnownPermissions: (id) => getAllKnownPermissions(id),
    },
  );
  const formulaResolver =
    await deps.formulaRuntime.getFormulaResolver(tenantId);
  const entities = buildHookEntityServices({
    user,
    deps,
    logger,
    formulaResolver,
  });

  const current = buildEmailHookEnvelope({
    record: { ...record },
    email,
    bindingId: binding.id,
    entityName: binding.entityName,
    recordId: binding.recordId,
    extracted,
    relevant,
  });

  const event = formatHookEvent({
    entity: binding.entityName,
    phase: "after",
    operation: "email",
  });

  const definitions = (await deps.hookRuntime.repository.list(tenantId)).filter(
    (definition) =>
      definition.enabled &&
      definition.entity === binding.entityName &&
      isEmailTrigger(definition.trigger) &&
      definition.phase === "after",
  );

  await appendJobStep(
    deps,
    tenantId,
    jobId,
    step("hooks", "info", `Dispatching ${definitions.length} email hook(s)`, {
      event,
    }),
  );

  for (const definition of definitions) {
    const recordDataHookExecution = deps.hookExecutionRepository
      ? createRecordDataHookExecution(deps.hookExecutionRepository, tenantId)
      : undefined;
    const dataHookExecutionRecorder = deps.hookExecutionRepository
      ? createDataHookExecutionRecorderForTenant(
          deps.hookExecutionRepository,
          tenantId,
        )
      : undefined;

    await runDataHook(definition, {
      tenantId,
      entityName: binding.entityName,
      event,
      current: { ...current },
      user: { uid: user.uid },
      ...(formulaResolver ? { formulaResolver } : {}),
      services: {
        logger,
        entities,
        ...(recordDataHookExecution ? { recordDataHookExecution } : {}),
        ...(dataHookExecutionRecorder ? { dataHookExecutionRecorder } : {}),
        ...(deps.callWebhook ? { callWebhook: deps.callWebhook } : {}),
        ...(deps.userNotificationRepository
          ? {
              sendUserNotification: createSendUserNotification(
                deps.userNotificationRepository,
                tenantId,
              ),
            }
          : {}),
      },
    });
  }

  await deps.emailIngestProcessedRepository.upsert(tenantId, {
    userId,
    gmailMessageId,
    threadId: email.threadId,
    bindingId: binding.id,
    entityName: binding.entityName,
    recordId: binding.recordId,
    status: "processed",
    hookSummary: `Ran ${definitions.length} email hook(s)`,
    processedAt: new Date().toISOString(),
  });

  await appendJobStep(
    deps,
    tenantId,
    jobId,
    step("done", "success", "Message processed"),
  );

  logger.info("Gmail message processed", {
    tenantId,
    entityName: binding.entityName,
    meta: {
      gmailMessageId,
      bindingId: binding.id,
      hooks: definitions.length,
    },
  });
}

export async function processGmailBackfill(
  deps: GmailIngestProcessorDeps,
  payload: z.infer<typeof gmailBackfillTaskPayloadSchema>,
  logger: HookLogger,
): Promise<void> {
  const { tenantId, userId, jobId } = payload;
  await appendJobStep(
    deps,
    tenantId,
    jobId,
    step("backfill-start", "info", "Starting Gmail backfill"),
  );

  const bindings = await deps.emailMatchBindingRepository.listForUser(
    tenantId,
    userId,
  );
  const scopedBindings = payload.bindingId
    ? bindings.filter((binding) => binding.id === payload.bindingId)
    : bindings;
  if (payload.bindingId && scopedBindings.length === 0) {
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step("backfill-query", "skipped", "Binding not found for backfill", {
        bindingId: payload.bindingId,
      }),
    );
    await deps.emailIngestJobRepository.complete(tenantId, jobId, "completed");
    return;
  }

  const query = buildGmailSearchQuery(scopedBindings, {
    ...(payload.afterDate ? { afterDate: payload.afterDate } : {}),
    ...(payload.beforeDate ? { beforeDate: payload.beforeDate } : {}),
  });
  if (!query) {
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step("backfill-query", "skipped", "No enabled bindings to search"),
    );
    await deps.emailIngestJobRepository.complete(tenantId, jobId, "completed");
    return;
  }

  await appendJobStep(
    deps,
    tenantId,
    jobId,
    step("backfill-query", "info", "Built Gmail query", {
      query,
      ...(payload.bindingId ? { bindingId: payload.bindingId } : {}),
    }),
  );

  const { accessToken } = await resolveAccessToken(deps, userId);
  const gmail = new GmailApiClient(accessToken);
  const maxMessages = payload.maxMessages ?? 100;
  let pageToken: string | undefined;
  let enqueued = 0;

  while (enqueued < maxMessages) {
    const page = await gmail.listMessageIds({
      query,
      maxResults: Math.min(50, maxMessages - enqueued),
      ...(pageToken ? { pageToken } : {}),
    });
    for (const messageId of page.messageIds) {
      await deps.enqueueProcessMessage({
        tenantId,
        userId,
        jobId,
        gmailMessageId: messageId,
        ...(payload.bindingId ? { bindingId: payload.bindingId } : {}),
        ...(payload.reprocess ? { reprocess: true } : {}),
      });
      enqueued += 1;
      if (enqueued >= maxMessages) break;
    }
    if (!page.nextPageToken || page.messageIds.length === 0) break;
    pageToken = page.nextPageToken;
  }

  await deps.gmailConnectionRepository.upsert(userId, {
    status: "connected",
    lastSyncAt: new Date().toISOString(),
  });

  await appendJobStep(
    deps,
    tenantId,
    jobId,
    step("backfill-done", "success", `Enqueued ${enqueued} message(s)`),
  );
  await deps.emailIngestJobRepository.complete(tenantId, jobId, "completed");
  logger.info("Gmail backfill enqueued messages", {
    tenantId,
    meta: { enqueued, jobId },
  });
}

export async function processGmailHistorySync(
  deps: GmailIngestProcessorDeps,
  payload: z.infer<typeof gmailHistorySyncTaskPayloadSchema>,
  logger: HookLogger,
): Promise<void> {
  const { tenantId, userId, jobId } = payload;
  const connection = await deps.gmailConnectionRepository.get(userId);
  const historyId = payload.historyId ?? connection?.historyId;
  if (!historyId) {
    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step("history", "skipped", "No historyId available"),
    );
    await deps.emailIngestJobRepository.complete(tenantId, jobId, "completed");
    return;
  }

  const { accessToken } = await resolveAccessToken(deps, userId);
  const gmail = new GmailApiClient(accessToken);

  try {
    await renewGmailWatchAndSchedule(
      deps,
      { userId, accessToken, tenantId },
      logger,
    );
  } catch (error) {
    logger.error("Gmail watch renew during history sync failed", {
      meta: {
        userId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  const history = await gmail.listHistoryMessageIds(historyId);
  for (const messageId of history.messageIds) {
    await deps.enqueueProcessMessage({
      tenantId,
      userId,
      jobId,
      gmailMessageId: messageId,
    });
  }
  if (history.latestHistoryId) {
    await deps.gmailConnectionRepository.upsert(userId, {
      status: "connected",
      historyId: history.latestHistoryId,
      lastSyncAt: new Date().toISOString(),
    });
  }
  await appendJobStep(
    deps,
    tenantId,
    jobId,
    step(
      "history",
      "success",
      `Enqueued ${history.messageIds.length} history message(s)`,
    ),
  );
  await deps.emailIngestJobRepository.complete(tenantId, jobId, "completed");
  logger.info("Gmail history sync completed", {
    tenantId,
    meta: { count: history.messageIds.length },
  });
}

export async function processGmailWatchRenew(
  deps: GmailIngestProcessorDeps,
  payload: z.infer<typeof gmailWatchRenewTaskPayloadSchema>,
  logger: HookLogger,
): Promise<void> {
  if (deps.deliveryMode !== "push" || !deps.gmailPubsubTopic) {
    logger.info("Gmail watch renew skipped: push mode inactive or no topic", {
      meta: { userId: payload.userId, deliveryMode: deps.deliveryMode },
    });
    return;
  }
  const { accessToken } = await resolveAccessToken(deps, payload.userId);
  await renewGmailWatchAndSchedule(
    deps,
    {
      userId: payload.userId,
      accessToken,
      tenantId: payload.tenantId,
      force: true,
    },
    logger,
  );
  if (payload.tenantId && payload.jobId) {
    const connection = await deps.gmailConnectionRepository.get(payload.userId);
    await appendJobStep(
      deps,
      payload.tenantId,
      payload.jobId,
      step("watch-renew", "success", "Gmail watch renewed", {
        historyId: connection?.historyId,
        watchExpiration: connection?.watchExpiration,
      }),
    );
    await deps.emailIngestJobRepository.complete(
      payload.tenantId,
      payload.jobId,
      "completed",
    );
  }
}

export async function processGmailPoll(
  deps: GmailIngestProcessorDeps,
  logger: HookLogger,
): Promise<{ readonly enqueued: number; readonly skipped: number }> {
  if (deps.deliveryMode !== "poll") {
    logger.info("Gmail poll skipped: delivery mode is not poll", {
      meta: { deliveryMode: deps.deliveryMode },
    });
    return { enqueued: 0, skipped: 0 };
  }
  if (!deps.enqueueHistorySync) {
    throw new Error("enqueueHistorySync is required for Gmail poll");
  }

  const connections = await deps.gmailConnectionRepository.listConnected();
  let enqueued = 0;
  let skipped = 0;

  for (const connection of connections) {
    if (!connection.tenantId || !connection.historyId) {
      skipped += 1;
      continue;
    }
    const job = await deps.emailIngestJobRepository.create({
      tenantId: connection.tenantId,
      userId: connection.userId,
      kind: "historySync",
      title: "Gmail poll history sync",
    });
    await deps.enqueueHistorySync({
      tenantId: connection.tenantId,
      userId: connection.userId,
      jobId: job.id,
      historyId: connection.historyId,
    });
    enqueued += 1;
  }

  logger.info("Gmail poll completed", {
    meta: { enqueued, skipped, connections: connections.length },
  });
  return { enqueued, skipped };
}

export function createGmailIngestProcessorDeps(
  firebaseAdminConfig: FirebaseAdminConfig,
  base: DataHookProcessorDeps,
  options: {
    readonly encryptionMasterKey: string;
    readonly gmailOAuthClientId: string;
    readonly gmailOAuthClientSecret: string;
    readonly gmailPubsubTopic?: string;
    readonly deliveryMode: GmailIngestDeliveryMode;
    readonly vertexAiConfig: VertexAiConfig;
    readonly enqueueProcessMessage: GmailIngestProcessorDeps["enqueueProcessMessage"];
    readonly enqueueHistorySync?: GmailIngestProcessorDeps["enqueueHistorySync"];
    readonly scheduleWatchRenew?: GmailIngestProcessorDeps["scheduleWatchRenew"];
  },
): GmailIngestProcessorDeps {
  return {
    ...base,
    firebaseAdminConfig,
    gmailConnectionRepository:
      createFirestoreAdminGmailConnectionRepository(firebaseAdminConfig),
    emailMatchBindingRepository:
      createFirestoreAdminEmailMatchBindingRepository(firebaseAdminConfig),
    emailIngestProcessedRepository:
      createFirestoreAdminEmailIngestProcessedRepository(firebaseAdminConfig),
    emailIngestJobRepository:
      createFirestoreAdminEmailIngestJobRepository(firebaseAdminConfig),
    encryptionMasterKey: options.encryptionMasterKey,
    gmailOAuthClientId: options.gmailOAuthClientId,
    gmailOAuthClientSecret: options.gmailOAuthClientSecret,
    deliveryMode: options.deliveryMode,
    ...(options.gmailPubsubTopic
      ? { gmailPubsubTopic: options.gmailPubsubTopic }
      : {}),
    vertexAiConfig: options.vertexAiConfig,
    enqueueProcessMessage: options.enqueueProcessMessage,
    ...(options.enqueueHistorySync
      ? { enqueueHistorySync: options.enqueueHistorySync }
      : {}),
    ...(options.scheduleWatchRenew
      ? { scheduleWatchRenew: options.scheduleWatchRenew }
      : {}),
  };
}
