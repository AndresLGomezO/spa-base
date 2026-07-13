import {
  EMAIL_INGEST_JOBS_COLLECTION,
  EMAIL_INGEST_PROCESSED_COLLECTION,
  EMAIL_MATCH_BINDINGS_COLLECTION,
  GMAIL_CONNECTIONS_BY_EMAIL_COLLECTION,
  GMAIL_INTEGRATION_DOC_ID,
  GMAIL_INTEGRATIONS_SUBCOLLECTION,
  GMAIL_OAUTH_SCOPES,
} from "./collections.js";
export {
  EMAIL_INGEST_JOBS_COLLECTION,
  EMAIL_INGEST_PROCESSED_COLLECTION,
  EMAIL_MATCH_BINDINGS_COLLECTION,
  GMAIL_CONNECTIONS_BY_EMAIL_COLLECTION,
  GMAIL_INTEGRATION_DOC_ID,
  GMAIL_INTEGRATIONS_SUBCOLLECTION,
  GMAIL_OAUTH_SCOPES,
};

export {
  bindingMatchesMessage,
  buildGmailSearchQuery,
  findBestMatchingBinding,
  matchesFromAddress,
  matchesTextPattern,
} from "./match.js";

export {
  buildGmailAuthorizeUrl,
  exchangeGmailAuthCode,
  refreshGmailAccessToken,
  type GmailOAuthConfig,
  type GmailTokenResponse,
} from "./oauth.js";

export { GmailApiClient, gmailApiMessageToEnvelope } from "./gmail-api.js";

export { buildEmailAiPrompt, buildEmailHookEnvelope } from "./hook-envelope.js";

export {
  extractBodyFields,
  compileExtractorPattern,
} from "./body-field-extract.js";

export { resolveMatchedSubscriptionName } from "./resolve-matched-subscription-name.js";
export type { SubscriptionAliasCandidate } from "./resolve-matched-subscription-name.js";

export { decryptUserSecret, encryptUserSecret } from "./token-crypto.js";

export {
  computeGmailWatchRenewAt,
  GMAIL_WATCH_RENEW_IF_WITHIN_MS,
  GMAIL_WATCH_RENEW_LEAD_MS,
  normalizeGmailEmail,
  parseGmailWatchExpirationMs,
  shouldRenewGmailWatchSoon,
} from "./watch-renew.js";

export {
  buildProcessedDocId,
  createEmailMatchBindingInputSchema,
  emailAiExtractResultSchema,
  emailBodyFieldExtractorSchema,
  emailBodyFieldTransformSchema,
  emailIngestJobKindSchema,
  emailIngestJobRecordSchema,
  emailIngestJobStatusSchema,
  emailIngestProcessedRecordSchema,
  emailIngestProcessedStatusSchema,
  emailIngestStepTraceEntrySchema,
  emailMatchBindingSchema,
  gmailConnectionPublicStatusSchema,
  gmailConnectionRecordSchema,
  gmailConnectionStatusSchema,
  gmailMessageEnvelopeSchema,
  patchEmailMatchBindingInputSchema,
  toPublicGmailStatus,
  type CreateEmailMatchBindingInput,
  type EmailAiExtractResult,
  type EmailBodyFieldExtractor,
  type EmailBodyFieldTransform,
  type EmailIngestJobKind,
  type EmailIngestJobRecord,
  type EmailIngestJobStatus,
  type EmailIngestProcessedRecord,
  type EmailIngestProcessedStatus,
  type EmailIngestStepTraceEntry,
  type EmailMatchBinding,
  type GmailConnectionPublicStatus,
  type GmailConnectionRecord,
  type GmailConnectionStatus,
  type GmailMessageEnvelope,
  type PatchEmailMatchBindingInput,
} from "./types.js";

export {
  EMAIL_MATCH_BINDING_JSON_KIND,
  EMAIL_MATCH_BINDING_JSON_VERSION,
  EMAIL_MATCH_BINDINGS_JSON_KIND,
  createEmailMatchBindingEnvelope,
  createEmailMatchBindingsEnvelope,
  parseEmailMatchBindingJson,
  parseEmailMatchBindingsJson,
  portableEmailMatchBindingSchema,
  toPortableEmailMatchBinding,
  type EmailMatchBindingEnvelope,
  type EmailMatchBindingJsonError,
  type EmailMatchBindingsEnvelope,
  type PortableEmailMatchBinding,
} from "./email-match-binding-json.js";
