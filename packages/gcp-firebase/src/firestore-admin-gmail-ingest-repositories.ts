import {
  buildFingerprintDocId,
  buildProcessedDocId,
  createEmailMatchBindingInputSchema,
  EMAIL_INGEST_FINGERPRINTS_COLLECTION,
  EMAIL_INGEST_JOBS_COLLECTION,
  EMAIL_INGEST_PROCESSED_COLLECTION,
  EMAIL_MATCH_BINDINGS_COLLECTION,
  emailIngestFingerprintRecordSchema,
  emailIngestJobRecordSchema,
  emailIngestProcessedRecordSchema,
  emailIngestRunMetricsSchema,
  emailMatchBindingSchema,
  emptyEmailIngestRunMetrics,
  GMAIL_CONNECTIONS_BY_EMAIL_COLLECTION,
  GMAIL_INTEGRATION_DOC_ID,
  GMAIL_INTEGRATIONS_SUBCOLLECTION,
  gmailConnectionRecordSchema,
  normalizeGmailEmail,
  patchEmailMatchBindingInputSchema,
  type CreateEmailMatchBindingInput,
  type EmailIngestFingerprintRecord,
  type EmailIngestJobKind,
  type EmailIngestJobRecord,
  type EmailIngestProcessedRecord,
  type EmailIngestProcessedStatus,
  type EmailIngestRunMetrics,
  type EmailIngestStepTraceEntry,
  type EmailMatchBinding,
  type GmailConnectionRecord,
  type PatchEmailMatchBindingInput,
} from "@repo/gmail-ingest";
import { USERS_COLLECTION } from "@repo/shared-types";
import { nanoid } from "nanoid";

import {
  getFirestoreAdmin,
  type FirebaseAdminConfig,
} from "./firebase-admin.js";
import { applyListRecentTimeRange } from "./apply-list-recent-time-range.js";
import { tenantEntityCollectionRef } from "./tenant-entity-path.js";

const RUN_METRICS_KEYS = [
  "fetched",
  "queued",
  "processing",
  "finished",
  "processed",
  "skippedDedup",
  "skippedNoMatch",
  "skippedIrrelevant",
  "failed",
] as const satisfies ReadonlyArray<keyof EmailIngestRunMetrics>;

function nowIso(): string {
  return new Date().toISOString();
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface GmailConnectionRepository {
  get(userId: string): Promise<GmailConnectionRecord | null>;
  findByEmail(email: string): Promise<GmailConnectionRecord | null>;
  /**
   * Connected mailboxes that can be window-synced (have tenantId).
   * Used by the poll orchestrator.
   */
  listConnected(): Promise<readonly GmailConnectionRecord[]>;
  upsert(
    userId: string,
    patch: Partial<GmailConnectionRecord> &
      Pick<GmailConnectionRecord, "status">,
  ): Promise<GmailConnectionRecord>;
  delete(userId: string): Promise<void>;
}

export interface EmailMatchBindingRepository {
  get(tenantId: string, bindingId: string): Promise<EmailMatchBinding | null>;
  listForUser(
    tenantId: string,
    userId: string,
  ): Promise<readonly EmailMatchBinding[]>;
  listForRecord(
    tenantId: string,
    entityName: string,
    recordId: string,
  ): Promise<readonly EmailMatchBinding[]>;
  create(
    tenantId: string,
    userId: string,
    input: CreateEmailMatchBindingInput,
  ): Promise<EmailMatchBinding>;
  patch(
    tenantId: string,
    bindingId: string,
    userId: string,
    input: PatchEmailMatchBindingInput,
  ): Promise<EmailMatchBinding | null>;
  delete(tenantId: string, bindingId: string, userId: string): Promise<boolean>;
}

export interface EmailIngestProcessedRepository {
  get(
    tenantId: string,
    userId: string,
    gmailMessageId: string,
  ): Promise<EmailIngestProcessedRecord | null>;
  /**
   * Returns gmailMessageIds that already have status "processed".
   * Used by window sync to avoid enqueueing work the worker would only dedup.
   */
  listProcessedMessageIds(
    tenantId: string,
    userId: string,
    gmailMessageIds: readonly string[],
  ): Promise<ReadonlySet<string>>;
  upsert(
    tenantId: string,
    record: Omit<EmailIngestProcessedRecord, "id" | "tenantId"> & {
      readonly id?: string;
    },
  ): Promise<EmailIngestProcessedRecord>;
}

export interface EmailIngestFingerprintRepository {
  get(
    tenantId: string,
    userId: string,
    contentFingerprint: string,
  ): Promise<EmailIngestFingerprintRecord | null>;
  upsert(
    tenantId: string,
    record: Omit<EmailIngestFingerprintRecord, "id" | "tenantId"> & {
      readonly id?: string;
    },
  ): Promise<EmailIngestFingerprintRecord>;
}

export type EmailIngestRunMetricsPatch = Partial<{
  readonly fetched: number;
  readonly queued: number;
  readonly processing: number;
  readonly finished: number;
  readonly processed: number;
  readonly skippedDedup: number;
  readonly skippedNoMatch: number;
  readonly skippedIrrelevant: number;
  readonly failed: number;
}>;

export interface EmailIngestJobRepository {
  create(input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly kind: EmailIngestJobKind;
    readonly title: string;
  }): Promise<EmailIngestJobRecord>;
  appendStep(
    tenantId: string,
    jobId: string,
    step: EmailIngestStepTraceEntry,
  ): Promise<EmailIngestJobRecord | null>;
  /**
   * Atomically append a step and/or adjust run metrics. When `finalizeIfIdle`
   * is true and finished >= queued with processing <= 0, marks the job completed.
   */
  applyRunProgress(
    tenantId: string,
    jobId: string,
    options: {
      readonly step?: EmailIngestStepTraceEntry;
      readonly setMetrics?: EmailIngestRunMetricsPatch;
      readonly increments?: EmailIngestRunMetricsPatch;
      readonly windowQuery?: string | null;
      readonly finalizeIfIdle?: boolean;
      readonly status?: "pending" | "running" | "completed" | "failed";
    },
  ): Promise<EmailIngestJobRecord | null>;
  complete(
    tenantId: string,
    jobId: string,
    status: "completed" | "failed",
    errorMessage?: string | null,
  ): Promise<EmailIngestJobRecord | null>;
  listRecent(
    tenantId: string,
    options?: {
      readonly limit?: number;
      readonly since?: string;
      readonly until?: string;
    },
  ): Promise<readonly EmailIngestJobRecord[]>;
  get(tenantId: string, jobId: string): Promise<EmailIngestJobRecord | null>;
}

export function createFirestoreAdminGmailConnectionRepository(
  config: FirebaseAdminConfig,
): GmailConnectionRepository {
  function firestore() {
    return getFirestoreAdmin(config);
  }

  function docRef(userId: string) {
    return firestore()
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(GMAIL_INTEGRATIONS_SUBCOLLECTION)
      .doc(GMAIL_INTEGRATION_DOC_ID);
  }

  function emailIndexRef(email: string) {
    return firestore()
      .collection(GMAIL_CONNECTIONS_BY_EMAIL_COLLECTION)
      .doc(normalizeGmailEmail(email));
  }

  async function syncEmailIndex(options: {
    readonly userId: string;
    readonly tenantId: string | null;
    readonly previousEmail: string | null;
    readonly nextEmail: string | null;
  }): Promise<void> {
    const previous =
      options.previousEmail != null
        ? normalizeGmailEmail(options.previousEmail)
        : null;
    const next =
      options.nextEmail != null ? normalizeGmailEmail(options.nextEmail) : null;

    if (previous && previous !== next) {
      const existing = await emailIndexRef(previous).get();
      if (existing.exists && existing.data()?.userId === options.userId) {
        await emailIndexRef(previous).delete();
      }
    }

    if (next) {
      await emailIndexRef(next).set({
        userId: options.userId,
        tenantId: options.tenantId,
        emailAddress: next,
        updatedAt: nowIso(),
      });
    }
  }

  return {
    async get(userId) {
      const snapshot = await docRef(userId).get();
      if (!snapshot.exists) return null;
      return gmailConnectionRecordSchema.parse({
        userId,
        ...snapshot.data(),
      });
    },
    async findByEmail(email) {
      const normalized = normalizeGmailEmail(email);
      if (!normalized) return null;
      const indexSnap = await emailIndexRef(normalized).get();
      if (!indexSnap.exists) return null;
      const userId = indexSnap.data()?.userId;
      if (typeof userId !== "string" || !userId.trim()) return null;
      const connection = await this.get(userId);
      if (!connection?.emailAddress) return null;
      if (normalizeGmailEmail(connection.emailAddress) !== normalized) {
        return null;
      }
      return connection;
    },
    async listConnected() {
      const snapshot = await firestore()
        .collection(GMAIL_CONNECTIONS_BY_EMAIL_COLLECTION)
        .get();
      const results: GmailConnectionRecord[] = [];
      const seenUserIds = new Set<string>();

      for (const doc of snapshot.docs) {
        const userId = doc.data()?.userId;
        if (typeof userId !== "string" || !userId.trim()) continue;
        if (seenUserIds.has(userId)) continue;
        seenUserIds.add(userId);

        const connection = await this.get(userId);
        if (
          !connection ||
          connection.status !== "connected" ||
          !connection.tenantId
        ) {
          continue;
        }
        results.push(connection);
      }

      return results;
    },
    async upsert(userId, patch) {
      const existing = await this.get(userId);
      const timestamp = nowIso();
      const rawEmail =
        patch.emailAddress !== undefined
          ? patch.emailAddress
          : (existing?.emailAddress ?? null);
      const emailAddress =
        rawEmail != null ? normalizeGmailEmail(rawEmail) : null;
      const tenantId =
        patch.tenantId !== undefined
          ? patch.tenantId
          : (existing?.tenantId ?? null);
      const next = gmailConnectionRecordSchema.parse({
        userId,
        tenantId,
        status: patch.status,
        emailAddress,
        scopes: patch.scopes ?? existing?.scopes ?? [],
        encryptedRefreshToken:
          patch.encryptedRefreshToken !== undefined
            ? patch.encryptedRefreshToken
            : (existing?.encryptedRefreshToken ?? null),
        encryptedAccessToken:
          patch.encryptedAccessToken !== undefined
            ? patch.encryptedAccessToken
            : (existing?.encryptedAccessToken ?? null),
        accessTokenExpiresAt:
          patch.accessTokenExpiresAt !== undefined
            ? patch.accessTokenExpiresAt
            : (existing?.accessTokenExpiresAt ?? null),
        historyId:
          patch.historyId !== undefined
            ? patch.historyId
            : (existing?.historyId ?? null),
        watchExpiration:
          patch.watchExpiration !== undefined
            ? patch.watchExpiration
            : (existing?.watchExpiration ?? null),
        ingestWatermarkAt:
          patch.ingestWatermarkAt !== undefined
            ? patch.ingestWatermarkAt
            : (existing?.ingestWatermarkAt ?? null),
        ingestBatchHash:
          patch.ingestBatchHash !== undefined
            ? patch.ingestBatchHash
            : (existing?.ingestBatchHash ?? null),
        lastSyncAt:
          patch.lastSyncAt !== undefined
            ? patch.lastSyncAt
            : (existing?.lastSyncAt ?? null),
        lastError:
          patch.lastError !== undefined
            ? patch.lastError
            : (existing?.lastError ?? null),
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
      await docRef(userId).set(next);
      await syncEmailIndex({
        userId,
        tenantId: next.tenantId,
        previousEmail: existing?.emailAddress ?? null,
        nextEmail: next.emailAddress,
      });
      return next;
    },
    async delete(userId) {
      const existing = await this.get(userId);
      await docRef(userId).delete();
      if (existing?.emailAddress) {
        await syncEmailIndex({
          userId,
          tenantId: existing.tenantId,
          previousEmail: existing.emailAddress,
          nextEmail: null,
        });
      }
    },
  };
}

export function createFirestoreAdminEmailMatchBindingRepository(
  config: FirebaseAdminConfig,
): EmailMatchBindingRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      EMAIL_MATCH_BINDINGS_COLLECTION,
    );
  }

  return {
    async get(tenantId, bindingId) {
      const snapshot = await collection(tenantId).doc(bindingId).get();
      if (!snapshot.exists) return null;
      return emailMatchBindingSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async listForUser(tenantId, userId) {
      const snapshot = await collection(tenantId)
        .where("userId", "==", userId)
        .get();
      return snapshot.docs.map((doc) =>
        emailMatchBindingSchema.parse({ id: doc.id, ...doc.data() }),
      );
    },
    async listForRecord(tenantId, entityName, recordId) {
      const snapshot = await collection(tenantId)
        .where("entityName", "==", entityName)
        .where("recordId", "==", recordId)
        .get();
      return snapshot.docs.map((doc) =>
        emailMatchBindingSchema.parse({ id: doc.id, ...doc.data() }),
      );
    },
    async create(tenantId, userId, input) {
      const parsed = createEmailMatchBindingInputSchema.parse(input);
      const id = parsed.id?.trim() || `emb_${nanoid(12)}`;
      const timestamp = nowIso();
      const record = emailMatchBindingSchema.parse({
        id,
        tenantId,
        userId,
        entityName: parsed.entityName,
        recordId: parsed.recordId,
        name: emptyToNull(parsed.name),
        description: emptyToNull(parsed.description),
        enabled: parsed.enabled ?? true,
        catchupNeeded: true,
        order: parsed.order ?? 100,
        ingestMode: parsed.ingestMode ?? "create",
        fromAddresses: parsed.fromAddresses ?? [],
        subjectPatterns: parsed.subjectPatterns ?? [],
        bodyPatterns: parsed.bodyPatterns ?? [],
        gmailQueryExtra: parsed.gmailQueryExtra ?? null,
        useAi: parsed.useAi ?? false,
        aiInstructions: parsed.aiInstructions ?? null,
        bodyFieldExtractors: parsed.bodyFieldExtractors ?? [],
        attachmentImport: parsed.attachmentImport ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await collection(tenantId).doc(id).set(record);
      return record;
    },
    async patch(tenantId, bindingId, userId, input) {
      const existing = await this.get(tenantId, bindingId);
      if (!existing || existing.userId !== userId) return null;
      const parsed = patchEmailMatchBindingInputSchema.parse(input);
      const enabling = parsed.enabled === true && existing.enabled === false;
      const next = emailMatchBindingSchema.parse({
        ...existing,
        ...parsed,
        name:
          parsed.name !== undefined ? emptyToNull(parsed.name) : existing.name,
        description:
          parsed.description !== undefined
            ? emptyToNull(parsed.description)
            : existing.description,
        catchupNeeded:
          parsed.catchupNeeded !== undefined
            ? parsed.catchupNeeded
            : enabling
              ? true
              : existing.catchupNeeded,
        gmailQueryExtra:
          parsed.gmailQueryExtra !== undefined
            ? parsed.gmailQueryExtra
            : existing.gmailQueryExtra,
        aiInstructions:
          parsed.aiInstructions !== undefined
            ? parsed.aiInstructions
            : existing.aiInstructions,
        bodyFieldExtractors:
          parsed.bodyFieldExtractors !== undefined
            ? parsed.bodyFieldExtractors
            : (existing.bodyFieldExtractors ?? []),
        attachmentImport:
          parsed.attachmentImport !== undefined
            ? parsed.attachmentImport
            : (existing.attachmentImport ?? null),
        updatedAt: nowIso(),
      });
      await collection(tenantId).doc(bindingId).set(next);
      return next;
    },
    async delete(tenantId, bindingId, userId) {
      const existing = await this.get(tenantId, bindingId);
      if (!existing || existing.userId !== userId) return false;
      await collection(tenantId).doc(bindingId).delete();
      return true;
    },
  };
}

export function createFirestoreAdminEmailIngestProcessedRepository(
  config: FirebaseAdminConfig,
): EmailIngestProcessedRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      EMAIL_INGEST_PROCESSED_COLLECTION,
    );
  }

  return {
    async get(tenantId, userId, gmailMessageId) {
      const id = buildProcessedDocId(userId, gmailMessageId);
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return emailIngestProcessedRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async listProcessedMessageIds(tenantId, userId, gmailMessageIds) {
      const processed = new Set<string>();
      if (gmailMessageIds.length === 0) return processed;

      const db = getFirestoreAdmin(config);
      const col = collection(tenantId);
      const chunkSize = 100;
      for (let i = 0; i < gmailMessageIds.length; i += chunkSize) {
        const chunk = gmailMessageIds.slice(i, i + chunkSize);
        const refs = chunk.map((gmailMessageId) =>
          col.doc(buildProcessedDocId(userId, gmailMessageId)),
        );
        const snapshots = await db.getAll(...refs);
        for (const snapshot of snapshots) {
          if (!snapshot.exists) continue;
          const status = snapshot.data()?.status;
          const gmailMessageId = snapshot.data()?.gmailMessageId;
          if (
            status === "processed" &&
            typeof gmailMessageId === "string" &&
            gmailMessageId.trim()
          ) {
            processed.add(gmailMessageId);
          }
        }
      }
      return processed;
    },
    async upsert(tenantId, record) {
      const id =
        record.id ?? buildProcessedDocId(record.userId, record.gmailMessageId);
      const next = emailIngestProcessedRecordSchema.parse({
        ...record,
        id,
        tenantId,
      });
      await collection(tenantId).doc(id).set(next);
      return next;
    },
  };
}

export function createFirestoreAdminEmailIngestFingerprintRepository(
  config: FirebaseAdminConfig,
): EmailIngestFingerprintRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      EMAIL_INGEST_FINGERPRINTS_COLLECTION,
    );
  }

  return {
    async get(tenantId, userId, contentFingerprint) {
      const id = buildFingerprintDocId(userId, contentFingerprint);
      const snapshot = await collection(tenantId).doc(id).get();
      if (!snapshot.exists) return null;
      return emailIngestFingerprintRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
    async upsert(tenantId, record) {
      const id =
        record.id ??
        buildFingerprintDocId(record.userId, record.contentFingerprint);
      const next = emailIngestFingerprintRecordSchema.parse({
        ...record,
        id,
        tenantId,
      });
      await collection(tenantId).doc(id).set(next);
      return next;
    },
  };
}

export function createFirestoreAdminEmailIngestJobRepository(
  config: FirebaseAdminConfig,
): EmailIngestJobRepository {
  function collection(tenantId: string) {
    return tenantEntityCollectionRef(
      getFirestoreAdmin(config),
      tenantId,
      EMAIL_INGEST_JOBS_COLLECTION,
    );
  }

  return {
    async create(input) {
      const id = `eij_${nanoid(12)}`;
      const timestamp = nowIso();
      const record = emailIngestJobRecordSchema.parse({
        id,
        tenantId: input.tenantId,
        userId: input.userId,
        kind: input.kind,
        status: "pending",
        title: input.title,
        stepTrace: [],
        runMetrics: emptyEmailIngestRunMetrics(),
        windowQuery: null,
        errorMessage: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null,
      });
      await collection(input.tenantId).doc(id).set(record);
      return record;
    },
    async appendStep(tenantId, jobId, step) {
      return this.applyRunProgress(tenantId, jobId, { step });
    },
    async applyRunProgress(tenantId, jobId, options) {
      const ref = collection(tenantId).doc(jobId);
      return getFirestoreAdmin(config).runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) return null;
        const existing = emailIngestJobRecordSchema.parse({
          id: snapshot.id,
          ...snapshot.data(),
        });

        const metrics = { ...existing.runMetrics };
        if (options.setMetrics) {
          for (const key of RUN_METRICS_KEYS) {
            const value = options.setMetrics[key];
            if (typeof value === "number") {
              metrics[key] = Math.max(0, value);
            }
          }
        }
        if (options.increments) {
          for (const key of RUN_METRICS_KEYS) {
            const delta = options.increments[key];
            if (typeof delta === "number" && delta !== 0) {
              metrics[key] = Math.max(0, metrics[key] + delta);
            }
          }
        }

        // Cap the in-doc trace: each append rewrites the whole job document in a
        // transaction. Unbounded growth (hundreds of messages × many steps) OOMs
        // the Firestore emulator and stalls the API.
        const MAX_STEP_TRACE = 100;
        const stepTrace = options.step
          ? [...existing.stepTrace, options.step].slice(-MAX_STEP_TRACE)
          : existing.stepTrace;

        const idle =
          metrics.queued > 0 &&
          metrics.finished >= metrics.queued &&
          metrics.processing <= 0;
        const shouldFinalize = options.finalizeIfIdle === true && idle;

        let status = options.status ?? existing.status;
        if (shouldFinalize) {
          status = "completed";
        } else if (
          status === "pending" &&
          (options.step || options.setMetrics)
        ) {
          status = "running";
        } else if (
          options.finalizeIfIdle !== true &&
          status === "completed" &&
          metrics.finished < metrics.queued
        ) {
          // Re-open if messages still outstanding after early complete.
          status = "running";
        }

        const timestamp = nowIso();
        const next = emailIngestJobRecordSchema.parse({
          ...existing,
          status,
          stepTrace,
          runMetrics: emailIngestRunMetricsSchema.parse(metrics),
          windowQuery:
            options.windowQuery !== undefined
              ? options.windowQuery
              : (existing.windowQuery ?? null),
          updatedAt: timestamp,
          completedAt: shouldFinalize
            ? timestamp
            : status === "completed" || status === "failed"
              ? (existing.completedAt ?? timestamp)
              : null,
        });
        tx.set(ref, next);
        return next;
      });
    },
    async complete(tenantId, jobId, status, errorMessage) {
      const existing = await this.get(tenantId, jobId);
      if (!existing) return null;
      const timestamp = nowIso();
      const next = emailIngestJobRecordSchema.parse({
        ...existing,
        status,
        errorMessage: errorMessage ?? null,
        updatedAt: timestamp,
        completedAt: timestamp,
      });
      await collection(tenantId).doc(jobId).set(next);
      return next;
    },
    async listRecent(tenantId, options) {
      const limit = options?.limit ?? 50;
      const query = applyListRecentTimeRange(
        collection(tenantId),
        "createdAt",
        options,
      );
      const snapshot = await query
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();
      return snapshot.docs.map((doc) =>
        emailIngestJobRecordSchema.parse({ id: doc.id, ...doc.data() }),
      );
    },
    async get(tenantId, jobId) {
      const snapshot = await collection(tenantId).doc(jobId).get();
      if (!snapshot.exists) return null;
      return emailIngestJobRecordSchema.parse({
        id: snapshot.id,
        ...snapshot.data(),
      });
    },
  };
}

export type { EmailIngestProcessedStatus };
