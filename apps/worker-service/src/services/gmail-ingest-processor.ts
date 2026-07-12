import { z } from "zod";

import {
  buildEmailAiPrompt,
  buildEmailHookEnvelope,
  buildGmailSearchQuery,
  decryptUserSecret,
  emailAiExtractResultSchema,
  findBestMatchingBinding,
  GmailApiClient,
  refreshGmailAccessToken,
  type EmailAiExtractResult,
  type EmailIngestStepTraceEntry,
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

export const gmailBackfillTaskPayloadSchema = z.object({
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
  afterDate: z.string().trim().optional(),
  beforeDate: z.string().trim().optional(),
  maxMessages: z.number().int().min(1).max(500).optional(),
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
  readonly vertexAiConfig: VertexAiConfig;
  readonly enqueueProcessMessage: (payload: {
    readonly tenantId: string;
    readonly userId: string;
    readonly jobId: string;
    readonly gmailMessageId: string;
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
  const binding = findBestMatchingBinding(bindings, email);
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
      step("match-bindings", "skipped", "No binding matched"),
    );
    return;
  }

  await deps.entityRuntime.ensureTenantEntitiesLoaded(tenantId);
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
  const query = buildGmailSearchQuery(bindings, {
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
    step("backfill-query", "info", "Built Gmail query", { query }),
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
  if (!deps.gmailPubsubTopic) {
    logger.info("Gmail watch renew skipped: no pubsub topic configured", {
      meta: { userId: payload.userId },
    });
    return;
  }
  const { accessToken } = await resolveAccessToken(deps, payload.userId);
  const gmail = new GmailApiClient(accessToken);
  const watch = await gmail.watch(deps.gmailPubsubTopic);
  await deps.gmailConnectionRepository.upsert(payload.userId, {
    status: "connected",
    historyId: watch.historyId,
    watchExpiration: new Date(Number(watch.expiration)).toISOString(),
  });
  if (payload.tenantId && payload.jobId) {
    await appendJobStep(
      deps,
      payload.tenantId,
      payload.jobId,
      step("watch-renew", "success", "Gmail watch renewed", {
        historyId: watch.historyId,
      }),
    );
    await deps.emailIngestJobRepository.complete(
      payload.tenantId,
      payload.jobId,
      "completed",
    );
  }
}

export function createGmailIngestProcessorDeps(
  firebaseAdminConfig: FirebaseAdminConfig,
  base: DataHookProcessorDeps,
  options: {
    readonly encryptionMasterKey: string;
    readonly gmailOAuthClientId: string;
    readonly gmailOAuthClientSecret: string;
    readonly gmailPubsubTopic?: string;
    readonly vertexAiConfig: VertexAiConfig;
    readonly enqueueProcessMessage: GmailIngestProcessorDeps["enqueueProcessMessage"];
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
    ...(options.gmailPubsubTopic
      ? { gmailPubsubTopic: options.gmailPubsubTopic }
      : {}),
    vertexAiConfig: options.vertexAiConfig,
    enqueueProcessMessage: options.enqueueProcessMessage,
  };
}
