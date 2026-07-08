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

async function enrichFileReferenceForRead(
  config: FirebaseAdminConfig,
  value: EntityFileReference,
): Promise<EntityFileReference & { downloadUrl?: string }> {
  try {
    const downloadUrl = await createEntityFileDownloadUrl({
      config,
      storagePath: value.storagePath,
    });
    return {
      ...value,
      downloadUrl,
    };
  } catch {
    return value;
  }
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
    const value = next[fieldName];
    if (meta.isArray === true && Array.isArray(value)) {
      next[fieldName] = value.map((item) =>
        stripDownloadUrlFromFileReference(item),
      );
      continue;
    }
    next[fieldName] = stripDownloadUrlFromFileReference(value);
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
    if (meta.isArray === true) {
      if (!Array.isArray(value)) {
        continue;
      }
      next[fieldName] = await Promise.all(
        value.map(async (item) => {
          if (!isEntityFileReference(item)) {
            return item;
          }
          return enrichFileReferenceForRead(config, item);
        }),
      );
      continue;
    }

    if (!isEntityFileReference(value)) {
      continue;
    }

    next[fieldName] = await enrichFileReferenceForRead(config, value);
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
  const trimmedPath = storagePath.trim();
  if (Array.isArray(value)) {
    return value.some(
      (item) =>
        isEntityFileReference(item) && item.storagePath.trim() === trimmedPath,
    );
  }
  return (
    isEntityFileReference(value) && value.storagePath.trim() === trimmedPath
  );
}
