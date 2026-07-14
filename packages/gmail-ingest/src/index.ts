import {
  EMAIL_INGEST_FINGERPRINTS_COLLECTION,
  EMAIL_INGEST_JOBS_COLLECTION,
  EMAIL_INGEST_PROCESSED_COLLECTION,
  EMAIL_MATCH_BINDINGS_COLLECTION,
  GMAIL_CONNECTIONS_BY_EMAIL_COLLECTION,
  GMAIL_INTEGRATION_DOC_ID,
  GMAIL_INTEGRATIONS_SUBCOLLECTION,
  GMAIL_OAUTH_SCOPES,
} from "./collections.js";
export {
  EMAIL_INGEST_FINGERPRINTS_COLLECTION,
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
  resolveMatchingBinding,
} from "./match.js";

export {
  buildGmailAuthorizeUrl,
  exchangeGmailAuthCode,
  refreshGmailAccessToken,
  type GmailOAuthConfig,
  type GmailTokenResponse,
} from "./oauth.js";

export {
  GmailApiClient,
  gmailApiMessageToEnvelope,
  listPdfAttachmentsFromPayload,
  decodeBase64UrlBuffer,
} from "./gmail-api.js";

export { buildEmailAiPrompt, buildEmailHookEnvelope } from "./hook-envelope.js";

export {
  extractBodyFields,
  compileExtractorPattern,
} from "./body-field-extract.js";

export {
  buildEmailContentFingerprint,
  buildFingerprintDocId,
  buildIngestBatchHash,
  formatGmailQueryDate,
  GMAIL_WATERMARK_OVERLAP_MS,
  resolveWindowAfterDate,
  resolveWindowBeforeDate,
} from "./content-fingerprint.js";

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
  gmailIngestDeliveryModeSchema,
  parseGmailIngestDeliveryMode,
  type GmailIngestDeliveryMode,
} from "./delivery-mode.js";

export {
  buildProcessedDocId,
  createEmailMatchBindingInputSchema,
  emailAiExtractResultSchema,
  emailBodyFieldExtractorSchema,
  emailBodyFieldTransformSchema,
  emailIngestFingerprintRecordSchema,
  emailIngestJobKindSchema,
  emailIngestJobRecordSchema,
  emailIngestJobStatusSchema,
  emailIngestPendingCount,
  emailIngestProcessedRecordSchema,
  emailIngestProcessedStatusSchema,
  emailIngestRunMetricsSchema,
  emailIngestStepTraceEntrySchema,
  emptyEmailIngestRunMetrics,
  emailMatchBindingSchema,
  emailAttachmentImportConfigSchema,
  gmailConnectionPublicStatusSchema,
  gmailConnectionRecordSchema,
  gmailConnectionStatusSchema,
  gmailMessageAttachmentSchema,
  gmailMessageEnvelopeSchema,
  patchEmailMatchBindingInputSchema,
  toPublicGmailStatus,
  type CreateEmailMatchBindingInput,
  type EmailAiExtractResult,
  type EmailAttachmentImportConfig,
  type EmailBodyFieldExtractor,
  type EmailBodyFieldTransform,
  type EmailIngestFingerprintRecord,
  type EmailIngestJobKind,
  type EmailIngestJobRecord,
  type EmailIngestJobStatus,
  type EmailIngestMessageOutcome,
  type EmailIngestProcessedRecord,
  type EmailIngestProcessedStatus,
  type EmailIngestRunMetrics,
  type EmailIngestStepTraceEntry,
  type EmailMatchBinding,
  type GmailConnectionPublicStatus,
  type GmailConnectionRecord,
  type GmailConnectionStatus,
  type GmailMessageAttachment,
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
