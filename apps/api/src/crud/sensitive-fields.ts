import { deriveKey, encryptFields, decryptFields } from "@repo/encryption";

import { apiEnv } from "../config/env.js";

interface FieldSensitivityMeta {
  readonly sensitive?: boolean;
}

/**
 * Returns names of fields marked as `sensitive` in the entity metadata.
 */
function getSensitiveFieldNames(
  fields: Readonly<Record<string, FieldSensitivityMeta>>,
): readonly string[] {
  return Object.entries(fields)
    .filter(([, meta]) => meta.sensitive)
    .map(([name]) => name);
}

/**
 * Returns the derived per-tenant encryption key, or `null` if the
 * master key is not configured.
 */
function getTenantEncryptionKey(tenantId: string): Buffer | null {
  const masterKey = apiEnv.TENANT_ENCRYPTION_MASTER_KEY;
  if (!masterKey) return null;
  return deriveKey(masterKey, tenantId);
}

/**
 * Encrypts sensitive fields in a record before persisting.
 * Returns the data unchanged if no master key is configured or there are
 * no sensitive fields.
 */
export function encryptSensitiveFields(
  data: Record<string, unknown>,
  fields: Readonly<Record<string, FieldSensitivityMeta>>,
  tenantId: string,
): Record<string, unknown> {
  const sensitiveNames = getSensitiveFieldNames(fields);
  if (sensitiveNames.length === 0) return data;

  const key = getTenantEncryptionKey(tenantId);
  if (!key) return data;

  return encryptFields(data, sensitiveNames, key);
}

/**
 * Decrypts sensitive fields in a record after reading from storage.
 * Returns the data unchanged if no master key is configured or there are
 * no sensitive fields.
 */
export function decryptSensitiveFields(
  data: Record<string, unknown>,
  fields: Readonly<Record<string, FieldSensitivityMeta>>,
  tenantId: string,
): Record<string, unknown> {
  const sensitiveNames = getSensitiveFieldNames(fields);
  if (sensitiveNames.length === 0) return data;

  const key = getTenantEncryptionKey(tenantId);
  if (!key) return data;

  return decryptFields(data, sensitiveNames, key);
}
