/**
 * Encode/decode helpers for financialItem.documentPasswords.
 *
 * Stored as a sensitive string. Prefix keeps decryptFields from JSON.parse-ing
 * the value into an object (which would fail the string field schema).
 */

export const DOCUMENT_PASSWORDS_PREFIX = "docpw-v1:" as const;

export const ATTACHMENT_DOCUMENT_TYPES = [
  "STATEMENT",
  "RECEIPT",
  "CONTRACT",
  "INVOICE",
  "SUPPORT",
  "OTHER",
] as const;

export type AttachmentDocumentType = (typeof ATTACHMENT_DOCUMENT_TYPES)[number];

export type DocumentPasswordsMap = Readonly<Record<string, string>>;

function isDocumentType(value: string): value is AttachmentDocumentType {
  return (ATTACHMENT_DOCUMENT_TYPES as readonly string[]).includes(value);
}

function normalizeMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const documentType = key.trim().toUpperCase();
    if (
      !documentType ||
      !isDocumentType(documentType) ||
      typeof value !== "string" ||
      value.length === 0
    ) {
      continue;
    }
    out[documentType] = value;
  }
  return out;
}

/** Encode a password map for storage in the sensitive string field. */
export function encodeDocumentPasswords(map: DocumentPasswordsMap): string {
  return `${DOCUMENT_PASSWORDS_PREFIX}${JSON.stringify(normalizeMap(map))}`;
}

/** Decode a stored (already decrypted) documentPasswords field value. */
export function decodeDocumentPasswords(
  value: unknown,
): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    // Defensive: if decryptFields already JSON.parsed an unprefixed payload.
    return normalizeMap(value);
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return {};
  }
  const raw = value.startsWith(DOCUMENT_PASSWORDS_PREFIX)
    ? value.slice(DOCUMENT_PASSWORDS_PREFIX.length)
    : value;
  try {
    return normalizeMap(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

/** Look up the password for a document type (case-insensitive). */
export function getDocumentPassword(
  value: unknown,
  documentType: string,
): string | undefined {
  const map = decodeDocumentPasswords(value);
  const key = documentType.trim().toUpperCase();
  const password = map[key];
  return password && password.length > 0 ? password : undefined;
}

export function listDocumentTypesWithPassword(
  value: unknown,
): AttachmentDocumentType[] {
  const map = decodeDocumentPasswords(value);
  return ATTACHMENT_DOCUMENT_TYPES.filter((type) => Boolean(map[type]));
}
