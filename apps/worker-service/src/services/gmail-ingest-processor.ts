import { z } from "zod";

import {
  buildEmailContentFingerprint,
  buildEmailHookEnvelope,
  buildGmailSearchQuery,
  buildIngestBatchHash,
  computeGmailWatchRenewAt,
  decryptUserSecret,
  extractBodyFields,
  GmailApiClient,
  refreshGmailAccessToken,
  resolveMatchingBindings,
  resolveWindowAfterDate,
  resolveWindowBeforeDate,
  shouldRenewGmailWatchSoon,
  type EmailAiExtractResult,
  type EmailIngestMessageOutcome,
  type EmailIngestStepTraceEntry,
  type EmailMatchBinding,
  type GmailIngestDeliveryMode,
} from "@repo/gmail-ingest";
import { runAiExtract } from "./gmail-ai-extract.js";
import {
  createFirestoreAdminEmailIngestFingerprintRepository,
  createFirestoreAdminEmailIngestJobRepository,
  createFirestoreAdminEmailIngestProcessedRepository,
  createFirestoreAdminEmailMatchBindingRepository,
  createFirestoreAdminGmailConnectionRepository,
  type EmailIngestFingerprintRepository,
  type EmailIngestJobRepository,
  type EmailIngestProcessedRepository,
  type EmailMatchBindingRepository,
  type FirebaseAdminConfig,
  type GmailConnectionRepository,
} from "@repo/gcp-firebase";
import { importGmailAttachmentsForBinding } from "./gmail-attachment-import.js";
import {
  updateEmailLedgerStatus,
  upsertProcessedEmailLedger,
  type EmailLedgerEntities,
} from "./email-ledger-upsert.js";
import {
  emailTriggerAppliesToBinding,
  formatHookEvent,
  isEmailTrigger,
  runDataHook,
  type HookLogger,
} from "@repo/hooks";
import type { AiController } from "@repo/ai-engine/controller";
import { type VertexAiConfig } from "@repo/ai-engine/vertex-ai.client";
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
import { createSendUserNotificationWithPush } from "@repo/gcp-firebase";
import { processPendingAggregationEventsForModel } from "@repo/aggregation-engine";

export const gmailWindowSyncTaskPayloadSchema = z.object({
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
  bindingId: z.string().trim().min(1).optional(),
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
  reprocess: z.boolean().optional(),
});

export interface GmailIngestProcessorDeps extends DataHookProcessorDeps {
  readonly firebaseAdminConfig: FirebaseAdminConfig;
  readonly gmailConnectionRepository: GmailConnectionRepository;
  readonly emailMatchBindingRepository: EmailMatchBindingRepository;
  readonly emailIngestProcessedRepository: EmailIngestProcessedRepository;
  readonly emailIngestFingerprintRepository: EmailIngestFingerprintRepository;
  readonly emailIngestJobRepository: EmailIngestJobRepository;
  readonly encryptionMasterKey: string;
  readonly gmailOAuthClientId: string;
  readonly gmailOAuthClientSecret: string;
  readonly gmailPubsubTopic?: string;
  readonly getDeliveryMode: () => Promise<GmailIngestDeliveryMode>;
  readonly vertexAiConfig: VertexAiConfig;
  readonly aiController: AiController;
  readonly enqueueProcessMessage: (payload: {
    readonly tenantId: string;
    readonly userId: string;
    readonly jobId: string;
    readonly gmailMessageId: string;
    readonly bindingId?: string;
    readonly reprocess?: boolean;
  }) => Promise<void>;
  readonly enqueueWindowSync?: (payload: {
    readonly tenantId: string;
    readonly userId: string;
    readonly jobId: string;
    readonly bindingId?: string;
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

/** Per-message path: skip chatty info steps; metrics already track progress. */
async function appendMessageJobStep(
  deps: GmailIngestProcessorDeps,
  tenantId: string,
  jobId: string,
  entry: EmailIngestStepTraceEntry,
): Promise<void> {
  if (entry.status === "info") {
    return;
  }
  await appendJobStep(deps, tenantId, jobId, entry);
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
  if ((await deps.getDeliveryMode()) !== "push" || !deps.gmailPubsubTopic) {
    return;
  }

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

function messageOutcomeStepStatus(
  outcome: EmailIngestMessageOutcome,
): EmailIngestStepTraceEntry["status"] {
  if (outcome === "processed") return "success";
  if (outcome === "failed") return "error";
  return "skipped";
}

export async function processGmailProcessMessage(
  deps: GmailIngestProcessorDeps,
  payload: z.infer<typeof gmailProcessMessageTaskPayloadSchema>,
  logger: HookLogger,
): Promise<void> {
  const { tenantId, userId, jobId, gmailMessageId } = payload;
  const reprocessBinding =
    payload.reprocess === true && Boolean(payload.bindingId);

  await deps.emailIngestJobRepository.applyRunProgress(tenantId, jobId, {
    increments: { processing: 1 },
    status: "running",
  });

  let outcome: EmailIngestMessageOutcome = "failed";
  let outcomeMeta: Record<string, unknown> = { gmailMessageId };
  let emailLedgerId: string | null = null;
  let emailLedgerEntities: EmailLedgerEntities | null = null;

  try {
    await appendMessageJobStep(
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
    if (!reprocessBinding && existing && existing.status === "processed") {
      outcome = "skippedDedup";
      outcomeMeta = {
        gmailMessageId,
        reason: "already_processed",
        priorStatus: existing.status,
      };
      await appendMessageJobStep(
        deps,
        tenantId,
        jobId,
        step("dedup", "skipped", "Message already processed", outcomeMeta),
      );
      return;
    }

    const { accessToken } = await resolveAccessToken(deps, userId);
    const gmail = new GmailApiClient(accessToken);
    const email = await gmail.getMessage(gmailMessageId);
    const contentFingerprint = buildEmailContentFingerprint(email);
    outcomeMeta = {
      gmailMessageId,
      from: email.from,
      subject: email.subject,
      threadId: email.threadId,
      date: email.date,
      contentFingerprint,
      reprocessBindingId: reprocessBinding ? payload.bindingId : null,
    };

    const priorFingerprint = await deps.emailIngestFingerprintRepository.get(
      tenantId,
      userId,
      contentFingerprint,
    );
    if (
      !reprocessBinding &&
      priorFingerprint &&
      priorFingerprint.gmailMessageId !== gmailMessageId
    ) {
      await deps.emailIngestProcessedRepository.upsert(tenantId, {
        userId,
        gmailMessageId,
        threadId: email.threadId,
        contentFingerprint,
        bindingId: null,
        entityName: null,
        recordId: null,
        status: "processed",
        hookSummary: `Skipped: fingerprint already processed as ${priorFingerprint.gmailMessageId}`,
        processedAt: new Date().toISOString(),
      });
      outcome = "skippedDedup";
      outcomeMeta = {
        ...outcomeMeta,
        reason: "content_fingerprint",
        priorGmailMessageId: priorFingerprint.gmailMessageId,
      };
      await appendMessageJobStep(
        deps,
        tenantId,
        jobId,
        step(
          "dedup",
          "skipped",
          "Content fingerprint already processed",
          outcomeMeta,
        ),
      );
      return;
    }

    await appendMessageJobStep(
      deps,
      tenantId,
      jobId,
      step("match-bindings", "info", "Matching email bindings", {
        from: email.from,
        subject: email.subject,
        preferredBindingId: payload.bindingId ?? null,
        reprocess: reprocessBinding,
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

    let matchedBindings = [
      ...resolveMatchingBindings(enabledBindings, email, payload.bindingId),
    ].sort((left, right) => {
      const orderDelta = (left.order ?? 100) - (right.order ?? 100);
      if (orderDelta !== 0) return orderDelta;
      return left.id.localeCompare(right.id);
    });

    // Binding Sync Now: only run the requested rule (do not re-fire create
    // hooks from sibling bindings that already ingested this mail).
    if (reprocessBinding && payload.bindingId) {
      matchedBindings = matchedBindings.filter(
        (binding) => binding.id === payload.bindingId,
      );
    }
    if (matchedBindings.length === 0) {
      await deps.emailIngestProcessedRepository.upsert(tenantId, {
        userId,
        gmailMessageId,
        threadId: email.threadId,
        contentFingerprint,
        bindingId: null,
        entityName: null,
        recordId: null,
        status: "skipped_no_match",
        processedAt: new Date().toISOString(),
      });
      outcome = "skippedNoMatch";
      outcomeMeta = {
        ...outcomeMeta,
        preferredBindingId: payload.bindingId ?? null,
        enabledBindingCount: enabledBindings.length,
      };
      await appendMessageJobStep(
        deps,
        tenantId,
        jobId,
        step("match-bindings", "skipped", "No binding matched", outcomeMeta),
      );
      return;
    }

    const matchedBindingIds = matchedBindings.map((binding) => binding.id);
    outcomeMeta = {
      ...outcomeMeta,
      bindingIds: matchedBindingIds,
      bindingId: matchedBindings[0]!.id,
      entityName: matchedBindings[0]!.entityName,
      recordId: matchedBindings[0]!.recordId,
      matchedBindingCount: matchedBindings.length,
    };

    await appendMessageJobStep(
      deps,
      tenantId,
      jobId,
      step(
        "match-bindings",
        "success",
        `Matched ${matchedBindings.length} binding(s)`,
        {
          bindingIds: matchedBindingIds,
          preferredBindingId: payload.bindingId ?? null,
        },
      ),
    );

    await deps.hookRuntime.ensureTenantHooksLoaded(tenantId);

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
    emailLedgerEntities = entities;

    type BindingPassResult =
      | { readonly kind: "processed"; readonly hooksRan: number }
      | { readonly kind: "skipped_irrelevant"; readonly reason: string }
      | { readonly kind: "failed"; readonly error: string };

    const bindingResults: Array<{
      readonly bindingId: string;
      readonly result: BindingPassResult;
    }> = [];
    let totalHooksRan = 0;
    let primaryBinding: EmailMatchBinding | null = null;
    let primaryExtracted: EmailAiExtractResult | null = null;

    for (const binding of matchedBindings) {
      const passMeta = {
        bindingId: binding.id,
        entityName: binding.entityName,
        recordId: binding.recordId,
      };

      const repository = deps.entityRuntime.getRepository(
        tenantId,
        binding.entityName,
      );
      if (!repository) {
        bindingResults.push({
          bindingId: binding.id,
          result: {
            kind: "failed",
            error: "Entity repository unavailable",
          },
        });
        await appendMessageJobStep(
          deps,
          tenantId,
          jobId,
          step(
            "load-record",
            "error",
            "Entity repository unavailable",
            passMeta,
          ),
        );
        continue;
      }

      const record = await repository.findById(binding.recordId, tenantId);
      if (!record) {
        bindingResults.push({
          bindingId: binding.id,
          result: {
            kind: "failed",
            error: "Matched record not found",
          },
        });
        await appendMessageJobStep(
          deps,
          tenantId,
          jobId,
          step(
            "load-record",
            "error",
            "Matched entity record missing",
            passMeta,
          ),
        );
        continue;
      }

      let extracted: EmailAiExtractResult | null = null;
      let relevant = true;
      if (binding.useAi) {
        await appendMessageJobStep(
          deps,
          tenantId,
          jobId,
          step("ai-extract", "info", "Running AI extract", passMeta),
        );
        const entity = deps.entityRuntime.resolveEntity(
          binding.entityName,
          tenantId,
        );
        const fieldNames = entity ? Object.keys(entity.metadata.fields) : [];
        extracted = await runAiExtract(deps, {
          tenantId,
          userId,
          jobId,
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
        await appendMessageJobStep(
          deps,
          tenantId,
          jobId,
          step(
            "ai-extract",
            extracted ? "success" : "error",
            extracted
              ? `AI relevance=${extracted.relevant}`
              : "AI extract failed",
            extracted
              ? {
                  ...passMeta,
                  reason: extracted.reason,
                  fields: extracted.fields,
                }
              : { ...passMeta, gmailMessageId },
          ),
        );
      } else if ((binding.bodyFieldExtractors?.length ?? 0) > 0) {
        await appendMessageJobStep(
          deps,
          tenantId,
          jobId,
          step("body-extract", "info", "Running body field extractors", {
            ...passMeta,
            extractorCount: binding.bodyFieldExtractors?.length ?? 0,
          }),
        );
        const extractText = [email.subject, email.bodyText ?? ""]
          .filter((part) => part.trim().length > 0)
          .join("\n");
        extracted = extractBodyFields(
          extractText,
          binding.bodyFieldExtractors ?? [],
        );
        relevant = extracted.relevant;
        await appendMessageJobStep(
          deps,
          tenantId,
          jobId,
          step(
            "body-extract",
            extracted.relevant ? "success" : "skipped",
            extracted.reason,
            { ...passMeta, fields: extracted.fields },
          ),
        );
      }

      if (!relevant) {
        bindingResults.push({
          bindingId: binding.id,
          result: {
            kind: "skipped_irrelevant",
            reason: extracted?.reason ?? "not_relevant",
          },
        });
        await appendMessageJobStep(
          deps,
          tenantId,
          jobId,
          step("relevance", "skipped", "Email marked irrelevant for binding", {
            ...passMeta,
            reason: extracted?.reason ?? "not_relevant",
          }),
        );
        continue;
      }

      if (!primaryBinding) {
        primaryBinding = binding;
        primaryExtracted = extracted;
        await appendMessageJobStep(
          deps,
          tenantId,
          jobId,
          step("email-ledger", "info", "Upserting email ledger row", passMeta),
        );
        const relatedFinancialItemId =
          extracted?.fields?.relatedFinancialItemId;
        const matchRecordId =
          typeof relatedFinancialItemId === "string" &&
          relatedFinancialItemId.trim().length > 0
            ? relatedFinancialItemId.trim()
            : binding.recordId;
        const ledger = await upsertProcessedEmailLedger({
          entities,
          email,
          userId,
          bindingId: binding.id,
          matchEntityName: binding.entityName,
          matchRecordId,
          extracted,
          relevant,
          contentFingerprint,
          status: "processed",
        });
        emailLedgerId = ledger.id;
        await appendMessageJobStep(
          deps,
          tenantId,
          jobId,
          step(
            "email-ledger",
            "success",
            ledger.created
              ? "Created email ledger row"
              : "Updated email ledger row",
            { emailId: ledger.id, created: ledger.created, ...passMeta },
          ),
        );
      }

      if (!emailLedgerId) {
        bindingResults.push({
          bindingId: binding.id,
          result: { kind: "failed", error: "Email ledger unavailable" },
        });
        continue;
      }

      if (binding.attachmentImport?.enabled) {
        await appendMessageJobStep(
          deps,
          tenantId,
          jobId,
          step("attachment-import", "info", "Importing Gmail PDF attachments", {
            ...passMeta,
          }),
        );
        try {
          const result = await importGmailAttachmentsForBinding({
            gmail,
            email,
            binding,
            extracted,
            entities,
            firebaseAdminConfig: deps.firebaseAdminConfig,
            tenantId,
            uploadedBy: userId,
            emailId: emailLedgerId,
          });
          await appendMessageJobStep(
            deps,
            tenantId,
            jobId,
            step(
              "attachment-import",
              "success",
              `Attachments created=${result.created} skipped=${result.skipped}`,
              { ...result, ...passMeta },
            ),
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          await appendMessageJobStep(
            deps,
            tenantId,
            jobId,
            step("attachment-import", "error", message, {
              ...passMeta,
              gmailMessageId,
            }),
          );
          throw error;
        }
      }

      const current = buildEmailHookEnvelope({
        record: { ...record },
        email,
        bindingId: binding.id,
        entityName: binding.entityName,
        recordId: binding.recordId,
        extracted,
        relevant,
        emailLedgerId,
        ingestMode: binding.ingestMode ?? "create",
      });

      const event = formatHookEvent({
        entity: binding.entityName,
        phase: "after",
        operation: "email",
      });

      const definitions = (await deps.hookRuntime.repository.list(tenantId))
        .filter(
          (definition) =>
            definition.enabled &&
            definition.entity === binding.entityName &&
            isEmailTrigger(definition.trigger) &&
            definition.phase === "after" &&
            emailTriggerAppliesToBinding(definition.trigger, binding.id),
        )
        .sort((left, right) => left.order - right.order);

      await appendMessageJobStep(
        deps,
        tenantId,
        jobId,
        step(
          "hooks",
          "info",
          `Dispatching ${definitions.length} email hook(s)`,
          {
            event,
            ...passMeta,
            hookIds: definitions.map((definition) => definition.id),
          },
        ),
      );

      for (const definition of definitions) {
        const recordDataHookExecution = deps.hookExecutionRepository
          ? createRecordDataHookExecution(
              deps.hookExecutionRepository,
              tenantId,
            )
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
            ...(deps.callAi ? { callAi: deps.callAi } : {}),
            ...(deps.computeEmbedding
              ? { computeEmbedding: deps.computeEmbedding }
              : {}),
            ...(deps.computeRecordAiSummary
              ? { computeRecordAiSummary: deps.computeRecordAiSummary }
              : {}),
            ...(deps.upsertAiRecordContext
              ? { upsertAiRecordContext: deps.upsertAiRecordContext }
              : {}),
            ...(deps.enqueueAiRecordNarrative
              ? { enqueueAiRecordNarrative: deps.enqueueAiRecordNarrative }
              : {}),
            ...(deps.userNotificationRepository
              ? {
                  sendUserNotification: createSendUserNotificationWithPush({
                    userNotificationRepository: deps.userNotificationRepository,
                    tenantId,
                    ...(deps.pushTokenRepository
                      ? { pushTokenRepository: deps.pushTokenRepository }
                      : {}),
                    ...(deps.firebaseAdminConfig
                      ? { firebaseAdminConfig: deps.firebaseAdminConfig }
                      : {}),
                    onPushError: (error) => {
                      logger.error("Failed to deliver web push notification", {
                        err: error,
                        tenantId,
                      });
                    },
                  }),
                }
              : {}),
          },
        });
      }

      totalHooksRan += definitions.length;
      bindingResults.push({
        bindingId: binding.id,
        result: { kind: "processed", hooksRan: definitions.length },
      });
    }

    const processedBindings = bindingResults.filter(
      (entry) => entry.result.kind === "processed",
    );
    const failedBindings = bindingResults.filter(
      (entry) => entry.result.kind === "failed",
    );
    const irrelevantBindings = bindingResults.filter(
      (entry) => entry.result.kind === "skipped_irrelevant",
    );

    if (processedBindings.length === 0 && failedBindings.length > 0) {
      const primaryFailed = failedBindings[0]!;
      await deps.emailIngestProcessedRepository.upsert(tenantId, {
        userId,
        gmailMessageId,
        threadId: email.threadId,
        contentFingerprint,
        bindingId: primaryFailed.bindingId,
        entityName:
          matchedBindings.find(
            (binding) => binding.id === primaryFailed.bindingId,
          )?.entityName ?? null,
        recordId:
          matchedBindings.find(
            (binding) => binding.id === primaryFailed.bindingId,
          )?.recordId ?? null,
        status: "failed",
        errorMessage:
          primaryFailed.result.kind === "failed"
            ? primaryFailed.result.error
            : "Binding processing failed",
        hookSummary: `bindings: ${matchedBindingIds.join(",")}`,
        processedAt: new Date().toISOString(),
      });
      outcome = "failed";
      outcomeMeta = {
        ...outcomeMeta,
        error:
          primaryFailed.result.kind === "failed"
            ? primaryFailed.result.error
            : "Binding processing failed",
        bindingResults,
      };
      await appendMessageJobStep(
        deps,
        tenantId,
        jobId,
        step("done", "error", "All matching bindings failed", outcomeMeta),
      );
      return;
    }

    if (processedBindings.length === 0) {
      await deps.emailIngestProcessedRepository.upsert(tenantId, {
        userId,
        gmailMessageId,
        threadId: email.threadId,
        contentFingerprint,
        bindingId: matchedBindings[0]!.id,
        entityName: matchedBindings[0]!.entityName,
        recordId: matchedBindings[0]!.recordId,
        status: "skipped_irrelevant",
        hookSummary: `bindings: ${matchedBindingIds.join(",")}`,
        processedAt: new Date().toISOString(),
      });
      outcome = "skippedIrrelevant";
      outcomeMeta = {
        ...outcomeMeta,
        reason:
          irrelevantBindings[0]?.result.kind === "skipped_irrelevant"
            ? irrelevantBindings[0].result.reason
            : "not_relevant",
        bindingResults,
      };
      await appendMessageJobStep(
        deps,
        tenantId,
        jobId,
        step(
          "done",
          "skipped",
          "All matching bindings irrelevant",
          outcomeMeta,
        ),
      );
      return;
    }

    const primary = primaryBinding ?? matchedBindings[0]!;
    await deps.emailIngestProcessedRepository.upsert(tenantId, {
      userId,
      gmailMessageId,
      threadId: email.threadId,
      contentFingerprint,
      bindingId: primary.id,
      entityName: primary.entityName,
      recordId: primary.recordId,
      status: "processed",
      hookSummary: `bindings: ${matchedBindingIds.join(",")}; Ran ${totalHooksRan} email hook(s) across ${processedBindings.length} binding(s)`,
      processedAt: new Date().toISOString(),
    });
    await deps.emailIngestFingerprintRepository.upsert(tenantId, {
      userId,
      contentFingerprint,
      gmailMessageId,
      processedAt: new Date().toISOString(),
    });

    outcome = "processed";
    outcomeMeta = {
      ...outcomeMeta,
      hooksRan: totalHooksRan,
      processedBindingCount: processedBindings.length,
      failedBindingCount: failedBindings.length,
      bindingResults,
      primaryExtractedFields: primaryExtracted?.fields ?? null,
    };
    await appendMessageJobStep(
      deps,
      tenantId,
      jobId,
      step("done", "success", "Message processed", outcomeMeta),
    );

    logger.info("Gmail message processed", {
      tenantId,
      entityName: primary.entityName,
      meta: {
        gmailMessageId,
        bindingId: primary.id,
        bindingIds: matchedBindingIds,
        hooks: totalHooksRan,
      },
    });
  } catch (error) {
    outcome = "failed";
    const message = error instanceof Error ? error.message : String(error);
    outcomeMeta = { ...outcomeMeta, error: message };
    if (emailLedgerId && emailLedgerEntities) {
      try {
        await updateEmailLedgerStatus({
          entities: emailLedgerEntities,
          emailId: emailLedgerId,
          status: "failed",
          reason: message,
        });
      } catch (ledgerError) {
        logger.error("Failed to mark email ledger as failed", {
          tenantId,
          meta: {
            gmailMessageId,
            emailLedgerId,
            error:
              ledgerError instanceof Error
                ? ledgerError.message
                : String(ledgerError),
          },
        });
      }
    }
    await appendMessageJobStep(
      deps,
      tenantId,
      jobId,
      step("message-error", "error", message, outcomeMeta),
    );
    logger.error("Gmail message processing failed", {
      tenantId,
      meta: { gmailMessageId, jobId, error: message },
    });
    // Outcome is recorded in finally — do not rethrow or Cloud Tasks will retry
    // and double-count finished/failed metrics for the same message.
  } finally {
    await deps.emailIngestJobRepository.applyRunProgress(tenantId, jobId, {
      increments: {
        processing: -1,
        finished: 1,
        [outcome]: 1,
      },
      step: step(
        "message-finished",
        messageOutcomeStepStatus(outcome),
        `Message outcome: ${outcome}`,
        { ...outcomeMeta, outcome },
      ),
      finalizeIfIdle: true,
    });
  }
}

export async function processGmailWindowSync(
  deps: GmailIngestProcessorDeps,
  payload: z.infer<typeof gmailWindowSyncTaskPayloadSchema>,
  logger: HookLogger,
): Promise<void> {
  const { tenantId, userId, jobId } = payload;
  const scopedBindingId = payload.bindingId ?? null;
  const windowEnd = new Date();
  const connection = await deps.gmailConnectionRepository.get(userId);

  await appendJobStep(
    deps,
    tenantId,
    jobId,
    step("window-sync-start", "info", "Starting Gmail window sync", {
      ingestWatermarkAt: connection?.ingestWatermarkAt ?? null,
      windowEnd: windowEnd.toISOString(),
      bindingId: scopedBindingId,
    }),
  );

  if (deps.aggregation) {
    try {
      const drained = await processPendingAggregationEventsForModel(
        {
          aggregationEventRepository:
            deps.aggregation.metricRuntime.aggregationEventRepository,
          metricDefinitionRepository:
            deps.aggregation.metricRuntime.metricDefinitionRepository,
          metricValueRepository:
            deps.aggregation.metricRuntime.metricValueRepository,
          metricContributionRepository:
            deps.aggregation.metricRuntime.metricContributionRepository,
          resolveQueryMembership:
            deps.aggregation.metricRuntime.resolveQueryMembership,
        },
        tenantId,
        "transaction",
        (message, meta) => {
          logger.info(message, meta);
        },
      );
      if (drained > 0) {
        await appendJobStep(
          deps,
          tenantId,
          jobId,
          step(
            "aggregation-pending-drain",
            "success",
            `Processed ${drained} pending aggregation event(s)`,
            { drained },
          ),
        );
      }
    } catch (error) {
      logger.error("Failed to drain pending aggregation events", {
        meta: {
          tenantId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  const { accessToken } = await resolveAccessToken(deps, userId);
  const gmail = new GmailApiClient(accessToken);

  if (!scopedBindingId) {
    try {
      await renewGmailWatchAndSchedule(
        deps,
        { userId, accessToken, tenantId },
        logger,
      );
    } catch (error) {
      logger.error("Gmail watch renew during window sync failed", {
        meta: {
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  const bindings = await deps.emailMatchBindingRepository.listForUser(
    tenantId,
    userId,
  );
  const enabledBindings = bindings.filter((binding) => binding.enabled);
  const beforeDate = resolveWindowBeforeDate(windowEnd);

  const messageIds = new Set<string>();
  // Preferred binding is informational for catch-up tracing only; process
  // message resolves *all* matching bindings in one pass.
  const preferredBindingIdsByMessage = new Map<string, string>();
  let windowQuery: string | null = null;
  let catchupBindingCount = 0;

  async function listAllMessageIds(query: string): Promise<readonly string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;
    for (;;) {
      const page = await gmail.listMessageIds({
        query,
        maxResults: 100,
        ...(pageToken ? { pageToken } : {}),
      });
      ids.push(...page.messageIds);
      if (!page.nextPageToken || page.messageIds.length === 0) break;
      pageToken = page.nextPageToken;
    }
    return ids;
  }

  if (scopedBindingId) {
    const scopedBinding = enabledBindings.find(
      (binding) => binding.id === scopedBindingId,
    );
    if (!scopedBinding) {
      await appendJobStep(
        deps,
        tenantId,
        jobId,
        step("binding-sync", "error", "Scoped binding missing or disabled", {
          bindingId: scopedBindingId,
        }),
      );
      await deps.emailIngestJobRepository.complete(
        tenantId,
        jobId,
        "failed",
        "Scoped binding missing or disabled",
      );
      return;
    }

    // Binding Sync Now: catch-up style for this rule only (no after: watermark).
    // Does not advance the mailbox watermark so other bindings stay unaffected.
    windowQuery = buildGmailSearchQuery([scopedBinding], { beforeDate });
    if (windowQuery) {
      const listed = await listAllMessageIds(windowQuery);
      for (const messageId of listed) {
        messageIds.add(messageId);
        preferredBindingIdsByMessage.set(messageId, scopedBinding.id);
      }
      await appendJobStep(
        deps,
        tenantId,
        jobId,
        step("binding-sync-query", "info", "Built binding-scoped Gmail query", {
          bindingId: scopedBinding.id,
          query: windowQuery,
          listedCount: listed.length,
          entityName: scopedBinding.entityName,
          recordId: scopedBinding.recordId,
        }),
      );
    } else {
      await appendJobStep(
        deps,
        tenantId,
        jobId,
        step(
          "binding-sync-query",
          "skipped",
          "Scoped binding has no searchable query",
          { bindingId: scopedBinding.id },
        ),
      );
    }

    if (scopedBinding.catchupNeeded === true) {
      await deps.emailMatchBindingRepository.patch(
        tenantId,
        scopedBinding.id,
        userId,
        { catchupNeeded: false },
      );
      catchupBindingCount = 1;
    }
  } else {
    const afterDate = resolveWindowAfterDate(
      connection?.ingestWatermarkAt,
      windowEnd,
    );

    windowQuery = buildGmailSearchQuery(enabledBindings, {
      ...(afterDate ? { afterDate } : {}),
      beforeDate,
    });

    if (windowQuery) {
      const listed = await listAllMessageIds(windowQuery);
      for (const messageId of listed) {
        messageIds.add(messageId);
      }
      await appendJobStep(
        deps,
        tenantId,
        jobId,
        step("window-query", "info", "Built window Gmail query", {
          query: windowQuery,
          bootstrap: !connection?.ingestWatermarkAt,
          listedCount: listed.length,
          enabledBindingCount: enabledBindings.length,
        }),
      );
    } else {
      await appendJobStep(
        deps,
        tenantId,
        jobId,
        step(
          "window-query",
          "skipped",
          "No enabled bindings for window query",
          {
            enabledBindingCount: enabledBindings.length,
          },
        ),
      );
    }

    const catchupBindings = enabledBindings.filter(
      (binding) => binding.catchupNeeded === true,
    );
    catchupBindingCount = catchupBindings.length;
    for (const binding of catchupBindings) {
      const catchupQuery = buildGmailSearchQuery([binding], { beforeDate });
      if (!catchupQuery) continue;
      const listed = await listAllMessageIds(catchupQuery);
      await appendJobStep(
        deps,
        tenantId,
        jobId,
        step("catchup-query", "info", "Binding catch-up query", {
          bindingId: binding.id,
          query: catchupQuery,
          listedCount: listed.length,
          entityName: binding.entityName,
          recordId: binding.recordId,
        }),
      );
      for (const messageId of listed) {
        messageIds.add(messageId);
        if (!preferredBindingIdsByMessage.has(messageId)) {
          preferredBindingIdsByMessage.set(messageId, binding.id);
        }
      }
      await deps.emailMatchBindingRepository.patch(
        tenantId,
        binding.id,
        userId,
        {
          catchupNeeded: false,
        },
      );
    }
  }

  const sortedIds = [...messageIds].sort();
  const ingestBatchHash = buildIngestBatchHash(sortedIds);
  const ingestWatermarkAt = windowEnd.toISOString();

  // Full mailbox sync skips already-processed mail. Binding Sync Now must
  // re-queue them so a new rule can run against previously ingested messages.
  let toEnqueue = sortedIds;
  let skippedDedupUpfront = 0;
  if (!scopedBindingId) {
    const alreadyProcessed =
      await deps.emailIngestProcessedRepository.listProcessedMessageIds(
        tenantId,
        userId,
        sortedIds,
      );
    toEnqueue = sortedIds.filter(
      (messageId) => !alreadyProcessed.has(messageId),
    );
    skippedDedupUpfront = sortedIds.length - toEnqueue.length;
  }
  const enqueued = toEnqueue.length;

  if (!scopedBindingId) {
    let profileHistoryId: string | undefined;
    try {
      const profile = await gmail.getProfile();
      if (profile.historyId) profileHistoryId = String(profile.historyId);
    } catch {
      // Watch continuity only; window sync does not require historyId.
    }

    await deps.gmailConnectionRepository.upsert(userId, {
      status: "connected",
      ingestWatermarkAt,
      ingestBatchHash,
      lastSyncAt: ingestWatermarkAt,
      ...(profileHistoryId ? { historyId: profileHistoryId } : {}),
    });
  } else {
    // Binding-scoped sync: refresh lastSyncAt only; keep mailbox watermark.
    await deps.gmailConnectionRepository.upsert(userId, {
      status: "connected",
      lastSyncAt: ingestWatermarkAt,
    });
  }

  const watermarkNote = scopedBindingId
    ? "mailbox watermark unchanged"
    : "watermark advanced";

  // Initialize metrics before fan-out. Local dispatch schedules onto a paced
  // queue without blocking this loop on full message processing.
  await deps.emailIngestJobRepository.applyRunProgress(tenantId, jobId, {
    setMetrics: {
      fetched: messageIds.size,
      queued: enqueued,
      processing: 0,
      finished: 0,
      processed: 0,
      skippedDedup: skippedDedupUpfront,
      skippedNoMatch: 0,
      skippedIrrelevant: 0,
      failed: 0,
    },
    windowQuery: windowQuery,
    status: enqueued > 0 ? "running" : "completed",
    step: step(
      "window-sync-done",
      "success",
      enqueued > 0
        ? `Queued ${enqueued} message(s) (${skippedDedupUpfront} already processed); ${watermarkNote}`
        : skippedDedupUpfront > 0
          ? `All ${skippedDedupUpfront} listed message(s) already processed; ${watermarkNote}`
          : `No messages to enqueue; ${watermarkNote}`,
      {
        fetched: messageIds.size,
        enqueued,
        skippedDedupUpfront,
        bindingId: scopedBindingId,
        ingestWatermarkAt: scopedBindingId
          ? (connection?.ingestWatermarkAt ?? null)
          : ingestWatermarkAt,
        ingestBatchHash: scopedBindingId ? null : ingestBatchHash,
        catchupBindingCount,
        messageIdsPreview: toEnqueue.slice(0, 25),
      },
    ),
    finalizeIfIdle: enqueued === 0,
  });

  logger.info("Gmail window sync listing completed", {
    tenantId,
    meta: {
      fetched: messageIds.size,
      enqueued,
      skippedDedupUpfront,
      jobId,
      bindingId: scopedBindingId,
      ingestWatermarkAt: scopedBindingId
        ? (connection?.ingestWatermarkAt ?? null)
        : ingestWatermarkAt,
    },
  });

  if (enqueued === 0) {
    await deps.emailIngestJobRepository.complete(tenantId, jobId, "completed");
    return;
  }

  // Local: paced FIFO (enqueuer schedules; route awaits each). Cloud Tasks:
  // create tasks quickly; queue rate limits drain them.
  for (const messageId of toEnqueue) {
    const bindingId =
      preferredBindingIdsByMessage.get(messageId) ??
      scopedBindingId ??
      undefined;
    await deps.enqueueProcessMessage({
      tenantId,
      userId,
      jobId,
      gmailMessageId: messageId,
      ...(bindingId ? { bindingId } : {}),
      ...(scopedBindingId ? { reprocess: true } : {}),
    });
  }
}

export async function processGmailWatchRenew(
  deps: GmailIngestProcessorDeps,
  payload: z.infer<typeof gmailWatchRenewTaskPayloadSchema>,
  logger: HookLogger,
): Promise<void> {
  if ((await deps.getDeliveryMode()) !== "push" || !deps.gmailPubsubTopic) {
    logger.info("Gmail watch renew skipped: push mode inactive or no topic", {
      meta: {
        userId: payload.userId,
        deliveryMode: await deps.getDeliveryMode(),
      },
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
  const deliveryMode = await deps.getDeliveryMode();
  if (deliveryMode !== "poll") {
    logger.info("Gmail poll skipped: delivery mode is not poll", {
      meta: { deliveryMode },
    });
    return { enqueued: 0, skipped: 0 };
  }
  if (!deps.enqueueWindowSync) {
    throw new Error("enqueueWindowSync is required for Gmail poll");
  }

  const connections = await deps.gmailConnectionRepository.listConnected();
  let enqueued = 0;
  let skipped = 0;

  for (const connection of connections) {
    if (!connection.tenantId) {
      skipped += 1;
      continue;
    }
    const job = await deps.emailIngestJobRepository.create({
      tenantId: connection.tenantId,
      userId: connection.userId,
      kind: "windowSync",
      title: "Gmail poll window sync",
    });
    await deps.enqueueWindowSync({
      tenantId: connection.tenantId,
      userId: connection.userId,
      jobId: job.id,
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
    readonly getDeliveryMode: () => Promise<GmailIngestDeliveryMode>;
    readonly vertexAiConfig: VertexAiConfig;
    readonly aiController: AiController;
    readonly enqueueProcessMessage: GmailIngestProcessorDeps["enqueueProcessMessage"];
    readonly enqueueWindowSync?: GmailIngestProcessorDeps["enqueueWindowSync"];
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
    emailIngestFingerprintRepository:
      createFirestoreAdminEmailIngestFingerprintRepository(firebaseAdminConfig),
    emailIngestJobRepository:
      createFirestoreAdminEmailIngestJobRepository(firebaseAdminConfig),
    encryptionMasterKey: options.encryptionMasterKey,
    gmailOAuthClientId: options.gmailOAuthClientId,
    gmailOAuthClientSecret: options.gmailOAuthClientSecret,
    getDeliveryMode: options.getDeliveryMode,
    ...(options.gmailPubsubTopic
      ? { gmailPubsubTopic: options.gmailPubsubTopic }
      : {}),
    vertexAiConfig: options.vertexAiConfig,
    aiController: options.aiController,
    enqueueProcessMessage: options.enqueueProcessMessage,
    ...(options.enqueueWindowSync
      ? { enqueueWindowSync: options.enqueueWindowSync }
      : {}),
    ...(options.scheduleWatchRenew
      ? { scheduleWatchRenew: options.scheduleWatchRenew }
      : {}),
  };
}
