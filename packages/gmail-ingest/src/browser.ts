/**
 * Browser-safe entry point for @repo/gmail-ingest JSON import/export and
 * client-side match/extract preview.
 * Avoid importing the package root from client code — it pulls Node crypto via token encryption.
 */
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
} from "./email-match-binding-json.js";
export type {
  EmailMatchBindingEnvelope,
  EmailMatchBindingJsonError,
  EmailMatchBindingsEnvelope,
  PortableEmailMatchBinding,
} from "./email-match-binding-json.js";

export {
  bindingMatchesMessage,
  matchesFromAddress,
  matchesTextPattern,
} from "./match.js";
export { extractBodyFields } from "./body-field-extract.js";
export type {
  EmailBodyFieldExtractor,
  EmailBodyFieldTransform,
  EmailMatchIngestMode,
} from "./types.js";
