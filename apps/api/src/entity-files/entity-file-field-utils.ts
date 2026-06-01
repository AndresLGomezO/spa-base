import {
  isEntityFileReference,
  resolveFileFieldMaxSizeBytes,
  stripDownloadUrlFromFileReference,
  type DefinedEntity,
  type EntityFileReference,
  type FieldDefinitions,
  type NormalizedFieldMeta,
} from "@repo/entities";
import {
  createEntityFileDownloadUrl,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

function isFileFieldMeta(meta: NormalizedFieldMeta): boolean {
  return meta.type === "image" || meta.type === "document";
}

export function sanitizeFileFieldsForWrite(
  entity: AnyDefinedEntity,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...record };

  for (const [fieldName, meta] of Object.entries(entity.metadata.fields)) {
    if (!isFileFieldMeta(meta) || !(fieldName in next)) {
      continue;
    }
    next[fieldName] = stripDownloadUrlFromFileReference(next[fieldName]);
  }

  return next;
}

export async function enrichFileFieldsForRead(
  config: FirebaseAdminConfig,
  entity: AnyDefinedEntity,
  record: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const next = { ...record };

  for (const [fieldName, meta] of Object.entries(entity.metadata.fields)) {
    if (!isFileFieldMeta(meta)) {
      continue;
    }

    const value = next[fieldName];
    if (!isEntityFileReference(value)) {
      continue;
    }

    try {
      const downloadUrl = await createEntityFileDownloadUrl({
        config,
        storagePath: value.storagePath,
      });
      next[fieldName] = {
        ...value,
        downloadUrl,
      } satisfies EntityFileReference & { downloadUrl: string };
    } catch {
      next[fieldName] = value;
    }
  }

  return next;
}

export async function enrichRecordsFileFieldsForRead(
  config: FirebaseAdminConfig,
  entity: AnyDefinedEntity,
  records: readonly Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  return Promise.all(
    records.map((record) => enrichFileFieldsForRead(config, entity, record)),
  );
}

export function resolveFileFieldMeta(
  entity: AnyDefinedEntity,
  fieldName: string,
): NormalizedFieldMeta | null {
  const meta = entity.metadata.fields[fieldName];
  if (!meta || !isFileFieldMeta(meta)) {
    return null;
  }
  return meta;
}

export function resolveMaxSizeBytesForFileFieldMeta(
  meta: NormalizedFieldMeta,
): number {
  if (meta.type !== "image" && meta.type !== "document") {
    throw new Error("Field is not a file field.");
  }
  return resolveFileFieldMaxSizeBytes(meta.type, meta.maxSizeBytes);
}

export function fileReferenceMatchesRecordField(
  record: Record<string, unknown>,
  fieldName: string,
  storagePath: string,
): boolean {
  const value = record[fieldName];
  return (
    isEntityFileReference(value) &&
    value.storagePath.trim() === storagePath.trim()
  );
}
