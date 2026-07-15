import { z } from "zod";

import {
  buildEmailAiPrompt,
  buildEmailContentFingerprint,
  buildEmailHookEnvelope,
  buildGmailSearchQuery,
  buildIngestBatchHash,
  computeGmailWatchRenewAt,
  decryptUserSecret,
  emailAiExtractResultSchema,
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
  type GmailMessageEnvelope,
} from "@repo/gmail-ingest";
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

export const gmailWindowSyncTaskPayloadSchema = z.object({
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
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
  readonly enqueueProcessMessage: (payload: {
    readonly tenantId: string;
    readonly userId: string;
    readonly jobId: string;
    readonly gmailMessageId: string;
    readonly bindingId?: string;
  }) => Promise<void>;
  readonly enqueueWindowSync?: (payload: {
    readonly tenantId: string;
    readonly userId: string;
    readonly jobId: string;
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

  await deps.emailIngestJobRepository.applyRunProgress(tenantId, jobId, {
    increments: { processing: 1 },
    status: "running",
    step: step("message-start", "info", "Started processing message", {
      gmailMessageId,
      preferredBindingId: payload.bindingId ?? null,
    }),
  });

  let outcome: EmailIngestMessageOutcome = "failed";
  let outcomeMeta: Record<string, unknown> = { gmailMessageId };
  let emailLedgerId: string | null = null;
  let emailLedgerEntities: EmailLedgerEntities | null = null;

  try {
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
      outcome = "skippedDedup";
      outcomeMeta = {
        gmailMessageId,
        reason: "already_processed",
        priorStatus: existing.status,
      };
      await appendJobStep(
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
    };

    const priorFingerprint = await deps.emailIngestFingerprintRepository.get(
      tenantId,
      userId,
      contentFingerprint,
    );
    if (
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
      await appendJobStep(
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

    await appendJobStep(
      deps,
      tenantId,
      jobId,
      step("match-bindings", "info", "Matching email bindings", {
        from: email.from,
        subject: email.subject,
        preferredBindingId: payload.bindingId ?? null,
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

    const matchedBindings = [...resolveMatchingBindings(
      enabledBindings,
      email,
      payload.bindingId,
    )].sort((left, right) => {
      const orderDelta = (left.order ?? 100) - (right.order ?? 100);
      if (orderDelta !== 0) return orderDelta;
      return left.id.localeCompare(right.id);
    });
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
      await appendJobStep(
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

    await appendJobStep(
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
        await appendJobStep(
          deps,
          tenantId,
          jobId,
          step("load-record", "error", "Entity repository unavailable", passMeta),
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
        await appendJobStep(
          deps,
          tenantId,
          jobId,
          step("load-record", "error", "Matched entity record missing", passMeta),
        );
        continue;
      }

      let extracted: EmailAiExtractResult | null = null;
      let relevant = true;
      if (binding.useAi) {
        await appendJobStep(
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
        await appendJobStep(
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
        await appendJobStep(
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
        await appendJobStep(
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
        await appendJobStep(
          deps,
          tenantId,
          jobId,
          step("email-ledger", "info", "Upserting email ledger row", passMeta),
        );
        const ledger = await upsertProcessedEmailLedger({
          entities,
          email,
          userId,
          bindingId: binding.id,
          matchEntityName: binding.entityName,
          matchRecordId: binding.recordId,
          extracted,
          relevant,
          contentFingerprint,
          status: "processed",
        });
        emailLedgerId = ledger.id;
        await appendJobStep(
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
        await appendJobStep(
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
          await appendJobStep(
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
          await appendJobStep(
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
            definition.phase === "after",
        )
        .sort((left, right) => left.order - right.order);

      await appendJobStep(
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
            ...(dataHookExecutionRecorder
              ? { dataHookExecutionRecorder }
              : {}),
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
          matchedBindings.find((binding) => binding.id === primaryFailed.bindingId)
            ?.entityName ?? null,
        recordId:
          matchedBindings.find((binding) => binding.id === primaryFailed.bindingId)
            ?.recordId ?? null,
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
      await appendJobStep(
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
      await appendJobStep(
        deps,
        tenantId,
        jobId,
        step("done", "skipped", "All matching bindings irrelevant", outcomeMeta),
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
    await appendJobStep(
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
    await appendJobStep(
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
  const windowEnd = new Date();
  const connection = await deps.gmailConnectionRepository.get(userId);

  await appendJobStep(
    deps,
    tenantId,
    jobId,
    step("window-sync-start", "info", "Starting Gmail window sync", {
      ingestWatermarkAt: connection?.ingestWatermarkAt ?? null,
      windowEnd: windowEnd.toISOString(),
    }),
  );

  const { accessToken } = await resolveAccessToken(deps, userId);
  const gmail = new GmailApiClient(accessToken);

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

  const bindings = await deps.emailMatchBindingRepository.listForUser(
    tenantId,
    userId,
  );
  const enabledBindings = bindings.filter((binding) => binding.enabled);
  const afterDate = resolveWindowAfterDate(
    connection?.ingestWatermarkAt,
    windowEnd,
  );
  const beforeDate = resolveWindowBeforeDate(windowEnd);

  const windowQuery = buildGmailSearchQuery(enabledBindings, {
    ...(afterDate ? { afterDate } : {}),
    beforeDate,
  });

  const messageIds = new Set<string>();
  // Preferred binding is informational for catch-up tracing only; process
  // message resolves *all* matching bindings in one pass.
  const preferredBindingIdsByMessage = new Map<string, string>();

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
      step("window-query", "skipped", "No enabled bindings for window query", {
        enabledBindingCount: enabledBindings.length,
      }),
    );
  }

  const catchupBindings = enabledBindings.filter(
    (binding) => binding.catchupNeeded === true,
  );
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
    await deps.emailMatchBindingRepository.patch(tenantId, binding.id, userId, {
      catchupNeeded: false,
    });
  }

  let enqueued = 0;
  for (const messageId of messageIds) {
    const bindingId = preferredBindingIdsByMessage.get(messageId);
    await deps.enqueueProcessMessage({
      tenantId,
      userId,
      jobId,
      gmailMessageId: messageId,
      ...(bindingId ? { bindingId } : {}),
    });
    enqueued += 1;
  }

  const sortedIds = [...messageIds].sort();
  const ingestBatchHash = buildIngestBatchHash(sortedIds);
  const ingestWatermarkAt = windowEnd.toISOString();

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

  await deps.emailIngestJobRepository.applyRunProgress(tenantId, jobId, {
    setMetrics: {
      fetched: messageIds.size,
      queued: enqueued,
      processing: 0,
      finished: 0,
      processed: 0,
      skippedDedup: 0,
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
        ? `Enqueued ${enqueued} message(s); watermark advanced — processing in progress`
        : `No messages to enqueue; watermark advanced`,
      {
        fetched: messageIds.size,
        enqueued,
        ingestWatermarkAt,
        ingestBatchHash,
        catchupBindingCount: catchupBindings.length,
        messageIdsPreview: sortedIds.slice(0, 25),
      },
    ),
    finalizeIfIdle: enqueued === 0,
  });

  if (enqueued === 0) {
    await deps.emailIngestJobRepository.complete(tenantId, jobId, "completed");
  }

  logger.info("Gmail window sync listing completed", {
    tenantId,
    meta: { fetched: messageIds.size, enqueued, jobId, ingestWatermarkAt },
  });
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
    enqueueProcessMessage: options.enqueueProcessMessage,
    ...(options.enqueueWindowSync
      ? { enqueueWindowSync: options.enqueueWindowSync }
      : {}),
    ...(options.scheduleWatchRenew
      ? { scheduleWatchRenew: options.scheduleWatchRenew }
      : {}),
  };
}
