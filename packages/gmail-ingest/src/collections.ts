export const GMAIL_INTEGRATIONS_SUBCOLLECTION = "integrations" as const;
export const GMAIL_INTEGRATION_DOC_ID = "gmail" as const;
/** Top-level email → userId lookup for Pub/Sub push (mailbox emailAddress). */
export const GMAIL_CONNECTIONS_BY_EMAIL_COLLECTION =
  "gmailConnectionsByEmail" as const;

export const EMAIL_MATCH_BINDINGS_COLLECTION =
  "__email_match_bindings" as const;
export const EMAIL_INGEST_PROCESSED_COLLECTION =
  "__email_ingest_processed" as const;
export const EMAIL_INGEST_FINGERPRINTS_COLLECTION =
  "__email_ingest_fingerprints" as const;
export const EMAIL_INGEST_JOBS_COLLECTION = "__email_ingest_jobs" as const;

export const GMAIL_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
] as const;
