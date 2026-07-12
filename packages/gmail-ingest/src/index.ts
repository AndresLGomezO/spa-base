import {
  EMAIL_INGEST_JOBS_COLLECTION,
  EMAIL_INGEST_PROCESSED_COLLECTION,
  EMAIL_MATCH_BINDINGS_COLLECTION,
  GMAIL_INTEGRATION_DOC_ID,
  GMAIL_INTEGRATIONS_SUBCOLLECTION,
  GMAIL_OAUTH_SCOPES,
} from "./collections.js";
export {
  EMAIL_INGEST_JOBS_COLLECTION,
  EMAIL_INGEST_PROCESSED_COLLECTION,
  EMAIL_MATCH_BINDINGS_COLLECTION,
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

export { decryptUserSecret, encryptUserSecret } from "./token-crypto.js";

export {
  buildProcessedDocId,
  createEmailMatchBindingInputSchema,
  emailAiExtractResultSchema,
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
