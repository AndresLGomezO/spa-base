import { createHash } from "node:crypto";

import type { GmailMessageEnvelope } from "./types.js";

const BODY_SLICE = 2_000;

function normalizeFingerprintPart(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Stable content fingerprint for dedupe across Gmail id remaps / retries.
 * Prefers RFC Message-ID when present; otherwise falls back to gmail id.
 */
export function buildEmailContentFingerprint(
  email: Pick<
    GmailMessageEnvelope,
    | "messageId"
    | "rfcMessageId"
    | "from"
    | "subject"
    | "date"
    | "bodyText"
    | "snippet"
  >,
): string {
  const idPart =
    normalizeFingerprintPart(email.rfcMessageId) || email.messageId;
  const body = normalizeFingerprintPart(email.bodyText ?? email.snippet).slice(
    0,
    BODY_SLICE,
  );
  const material = [
    idPart,
    email.date ?? "",
    normalizeFingerprintPart(email.from),
    normalizeFingerprintPart(email.subject),
    body,
  ].join("|");
  return createHash("sha256").update(material).digest("hex");
}

export function buildIngestBatchHash(messageIds: readonly string[]): string {
  const sorted = [...messageIds].sort();
  return createHash("sha256").update(sorted.join("\n")).digest("hex");
}

export function buildFingerprintDocId(
  userId: string,
  contentFingerprint: string,
): string {
  return `${userId}_${contentFingerprint}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Gmail `after:` / `before:` use YYYY/MM/DD (UTC). */
export function formatGmailQueryDate(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for Gmail query: ${String(isoOrDate)}`);
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/** Overlap fence so late-arriving / re-labeled mail is not dropped (Gmail day precision). */
export const GMAIL_WATERMARK_OVERLAP_MS = 2 * 24 * 60 * 60 * 1000;

export function resolveWindowAfterDate(
  ingestWatermarkAt: string | null | undefined,
  now: Date = new Date(),
): string | undefined {
  if (!ingestWatermarkAt) return undefined;
  const watermark = new Date(ingestWatermarkAt);
  if (Number.isNaN(watermark.getTime())) return undefined;
  const after = new Date(
    Math.min(watermark.getTime(), now.getTime()) - GMAIL_WATERMARK_OVERLAP_MS,
  );
  return formatGmailQueryDate(after);
}

/** Gmail `before:` is exclusive; use the UTC day after windowEnd. */
export function resolveWindowBeforeDate(windowEnd: Date = new Date()): string {
  const nextDay = new Date(
    Date.UTC(
      windowEnd.getUTCFullYear(),
      windowEnd.getUTCMonth(),
      windowEnd.getUTCDate() + 1,
    ),
  );
  return formatGmailQueryDate(nextDay);
}
