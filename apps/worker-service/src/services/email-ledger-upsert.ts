import type {
  EmailAiExtractResult,
  GmailMessageEnvelope,
} from "@repo/gmail-ingest";
import type { HookEntityServices } from "@repo/hooks";

/** Rates (and other tenants) seed an `email` entity; worker upserts by name. */
export const EMAIL_LEDGER_ENTITY_NAME = "email";

const BODY_TEXT_MAX_CHARS = 8_000;

export type EmailLedgerStatus = "processed" | "skipped_irrelevant" | "failed";

export type EmailLedgerEntities = Pick<
  HookEntityServices,
  "list" | "create" | "update"
>;

function truncateBody(bodyText: string | null | undefined): string | null {
  if (bodyText == null) return null;
  const trimmed = bodyText.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length <= BODY_TEXT_MAX_CHARS) return trimmed;
  return `${trimmed.slice(0, BODY_TEXT_MAX_CHARS)}…`;
}

function extractSourceFromFields(
  extracted: EmailAiExtractResult | null,
): string | null {
  const raw = extracted?.fields?.extractSource;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

/**
 * Upsert a domain `email` ledger row by `gmailMessageId` (+ mailbox `userId`).
 * Idempotent: re-running the same message updates the existing row.
 */
export async function upsertProcessedEmailLedger(options: {
  readonly entities: EmailLedgerEntities;
  readonly email: GmailMessageEnvelope;
  readonly userId: string;
  readonly bindingId: string;
  readonly matchEntityName: string;
  readonly matchRecordId: string;
  readonly extracted: EmailAiExtractResult | null;
  readonly relevant: boolean;
  readonly contentFingerprint?: string | null;
  readonly status: EmailLedgerStatus;
}): Promise<{ readonly id: string; readonly created: boolean }> {
  const byMessage = await options.entities.list(EMAIL_LEDGER_ENTITY_NAME, {
    field: "gmailMessageId",
    value: options.email.messageId,
  });
  const existing =
    byMessage.find((row) => row.userId === options.userId) ?? byMessage[0];

  const data: Record<string, unknown> = {
    subject: options.email.subject || "(no subject)",
    fromAddress: options.email.from,
    snippet: options.email.snippet || null,
    bodyText: truncateBody(options.email.bodyText),
    ...(options.email.date ? { receivedAt: options.email.date } : {}),
    gmailMessageId: options.email.messageId,
    threadId: options.email.threadId,
    rfcMessageId: options.email.rfcMessageId ?? null,
    ...(options.contentFingerprint
      ? { contentFingerprint: options.contentFingerprint }
      : {}),
    status: options.status,
    bindingId: options.bindingId,
    matchEntityName: options.matchEntityName,
    matchRecordId: options.matchRecordId,
    userId: options.userId,
    relevant: options.relevant,
    extractSource: extractSourceFromFields(options.extracted),
    reason: options.extracted?.reason ?? null,
  };

  if (existing?.id) {
    await options.entities.update(
      EMAIL_LEDGER_ENTITY_NAME,
      String(existing.id),
      data,
    );
    return { id: String(existing.id), created: false };
  }

  const created = await options.entities.create(EMAIL_LEDGER_ENTITY_NAME, data);
  const id = created.id;
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("email ledger create did not return an id");
  }
  return { id, created: true };
}

export async function updateEmailLedgerStatus(options: {
  readonly entities: EmailLedgerEntities;
  readonly emailId: string;
  readonly status: EmailLedgerStatus;
  readonly reason?: string | null;
}): Promise<void> {
  await options.entities.update(EMAIL_LEDGER_ENTITY_NAME, options.emailId, {
    status: options.status,
    ...(options.reason !== undefined ? { reason: options.reason } : {}),
  });
}
