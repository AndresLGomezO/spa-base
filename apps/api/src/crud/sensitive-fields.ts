import { deriveKey, encryptFields, decryptFields } from "@repo/encryption";
import type { EntityConverterEncryptionConfig } from "@repo/firestore-converters";

import { apiEnv } from "../config/env.js";

interface FieldSensitivityMeta {
  readonly sensitive?: boolean;
}

type AnyRecord = Record<string, unknown>;

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
 * Builds the encryption config for a converter, or `undefined` if
 * the entity has no sensitive fields or the master key is not set.
 */
export function buildConverterEncryptionConfig(
  fields: Readonly<Record<string, FieldSensitivityMeta>>,
  tenantId: string,
): EntityConverterEncryptionConfig | undefined {
  const masterKey = apiEnv.TENANT_ENCRYPTION_MASTER_KEY;
  if (!masterKey) return undefined;

  const sensitiveFieldNames = getSensitiveFieldNames(fields);
  if (sensitiveFieldNames.length === 0) return undefined;

  const key = deriveKey(masterKey, tenantId);

  return {
    sensitiveFieldNames,
    encrypt: (data: AnyRecord, fieldNames: readonly string[]) =>
      encryptFields(data, fieldNames, key),
    decrypt: (data: AnyRecord, fieldNames: readonly string[]) =>
      decryptFields(data, fieldNames, key),
  };
}
