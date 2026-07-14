import type { EmailAiExtractResult, GmailMessageEnvelope } from "./types.js";

export function buildEmailHookEnvelope(options: {
  readonly record: Record<string, unknown>;
  readonly email: GmailMessageEnvelope;
  readonly bindingId: string;
  readonly entityName: string;
  readonly recordId: string;
  readonly extracted: EmailAiExtractResult | null;
  readonly relevant: boolean;
  /** Domain email ledger row id when the worker upserted one before hooks. */
  readonly emailLedgerId?: string | null;
}): Record<string, unknown> {
  return {
    ...options.record,
    __email: options.email,
    __extracted: options.extracted,
    __emailRelevant: options.relevant,
    __matchBindingId: options.bindingId,
    __matchEntityName: options.entityName,
    __matchRecordId: options.recordId,
    ...(options.emailLedgerId
      ? { __emailLedger: { id: options.emailLedgerId } }
      : {}),
  };
}

export function buildEmailAiPrompt(options: {
  readonly email: GmailMessageEnvelope;
  readonly entityName: string;
  readonly recordSnapshot: Record<string, unknown>;
  readonly fieldNames: readonly string[];
  readonly aiInstructions?: string | null;
}): string {
  return [
    "You extract structured data from an inbound email for a multi-tenant app.",
    "Decide if the email is relevant for processing against the matched entity record.",
    "Return JSON only with keys: relevant (boolean), reason (string), fields (object), suggestedActions (string array, optional).",
    `Matched entity: ${options.entityName}`,
    `Known entity fields: ${options.fieldNames.join(", ") || "(none)"}`,
    `Matched record snapshot: ${JSON.stringify(options.recordSnapshot)}`,
    options.aiInstructions
      ? `Tenant instructions: ${options.aiInstructions}`
      : null,
    `From: ${options.email.from}`,
    `Subject: ${options.email.subject}`,
    `Date: ${options.email.date ?? ""}`,
    `Snippet: ${options.email.snippet}`,
    `Body: ${options.email.bodyText ?? ""}`,
  ]
    .filter(Boolean)
    .join("\n");
}
