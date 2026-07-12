import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const HKDF_INFO = "field-encryption";
const HKDF_INFO_USER = "user-field-encryption";

/**
 * Derives a per-tenant 256-bit key from the master key using HKDF-SHA256.
 * The tenantId is used as salt so each tenant gets a unique derived key.
 */
export function deriveKey(masterKey: string, tenantId: string): Buffer {
  const ikm = Buffer.from(masterKey, "base64");
  return Buffer.from(hkdfSync("sha256", ikm, tenantId, HKDF_INFO, KEY_LENGTH));
}

/**
 * Derives a per-user 256-bit key from the master key using HKDF-SHA256.
 * Used for auth-global secrets (e.g. Gmail OAuth tokens) that are not tenant-scoped.
 */
export function deriveUserKey(masterKey: string, userId: string): Buffer {
  const ikm = Buffer.from(masterKey, "base64");
  return Buffer.from(
    hkdfSync("sha256", ikm, userId, HKDF_INFO_USER, KEY_LENGTH),
  );
}

/**
 * Encrypts a single plaintext value using AES-256-GCM.
 * Returns a string in the format `iv:ciphertext:authTag` (base64-encoded).
 */
export function encryptValue(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${encrypted.toString("base64")}.${authTag.toString("base64")}`;
}

/**
 * Decrypts a value previously encrypted with `encryptValue`.
 * Expects the `iv.ciphertext.authTag` base64 format.
 */
export function decryptValue(encrypted: string, key: Buffer): string {
  const parts = encrypted.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format.");
  }

  const iv = Buffer.from(parts[0]!, "base64");
  const ciphertext = Buffer.from(parts[1]!, "base64");
  const authTag = Buffer.from(parts[2]!, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Encrypts the specified fields in a data record.
 * Non-string values are JSON-stringified before encryption.
 * Fields that are `null` or `undefined` are left untouched.
 */
export function encryptFields(
  data: Record<string, unknown>,
  sensitiveFieldNames: readonly string[],
  key: Buffer,
): Record<string, unknown> {
  if (sensitiveFieldNames.length === 0) return data;

  const result = { ...data };
  for (const fieldName of sensitiveFieldNames) {
    const value = result[fieldName];
    if (value === null || value === undefined) continue;

    const plaintext = typeof value === "string" ? value : JSON.stringify(value);
    result[fieldName] = encryptValue(plaintext, key);
  }
  return result;
}

/**
 * Decrypts the specified fields in a data record.
 * Attempts to JSON-parse the decrypted value; falls back to raw string.
 * Fields that are `null`, `undefined`, or not strings are left untouched.
 */
export function decryptFields(
  data: Record<string, unknown>,
  sensitiveFieldNames: readonly string[],
  key: Buffer,
): Record<string, unknown> {
  if (sensitiveFieldNames.length === 0) return data;

  const result = { ...data };
  for (const fieldName of sensitiveFieldNames) {
    const value = result[fieldName];
    if (value === null || value === undefined || typeof value !== "string") {
      continue;
    }

    const decrypted = decryptValue(value, key);
    try {
      result[fieldName] = JSON.parse(decrypted) as unknown;
    } catch {
      result[fieldName] = decrypted;
    }
  }
  return result;
}
