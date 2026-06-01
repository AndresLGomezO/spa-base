import {
  isEntityFileReference,
  type EntityFileReference,
  type SerializableEntityDefinition,
} from "@repo/entities";
import {
  createEntityFileDownloadUrl,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import type { EntityDefinitionRecord } from "@repo/dynamic-entities";

async function enrichFileReference(
  config: FirebaseAdminConfig,
  reference: EntityFileReference,
): Promise<EntityFileReference & { downloadUrl?: string }> {
  try {
    const downloadUrl = await createEntityFileDownloadUrl({
      config,
      storagePath: reference.storagePath,
    });
    return { ...reference, downloadUrl };
  } catch {
    return reference;
  }
}

export async function enrichEntityDefinitionRecordFileFields(
  config: FirebaseAdminConfig,
  record: EntityDefinitionRecord,
): Promise<EntityDefinitionRecord> {
  const fields = await Promise.all(
    record.fields.map(async (field) => {
      if (field.type !== "image" || !field.defaultImage) {
        return field;
      }
      if (!isEntityFileReference(field.defaultImage)) {
        return field;
      }
      return {
        ...field,
        defaultImage: await enrichFileReference(config, field.defaultImage),
      };
    }),
  );

  return { ...record, fields };
}

async function enrichSerializableDefinitionFileFields(
  config: FirebaseAdminConfig,
  definition: SerializableEntityDefinition,
): Promise<SerializableEntityDefinition> {
  const fields = { ...definition.fields };

  for (const [fieldName, meta] of Object.entries(fields)) {
    if (meta.type !== "image" || !meta.defaultImage) {
      continue;
    }
    if (!isEntityFileReference(meta.defaultImage)) {
      continue;
    }
    fields[fieldName] = {
      ...meta,
      defaultImage: await enrichFileReference(config, meta.defaultImage),
    };
  }

  return { ...definition, fields };
}

export async function enrichSerializableDefinitionsFileFields(
  config: FirebaseAdminConfig,
  definitions: readonly SerializableEntityDefinition[],
): Promise<SerializableEntityDefinition[]> {
  return Promise.all(
    definitions.map((definition) =>
      enrichSerializableDefinitionFileFields(config, definition),
    ),
  );
}
