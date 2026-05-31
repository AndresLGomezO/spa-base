import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import { z } from "zod";

import { createVersionedConverter } from "../core/versioned-converter.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;
type AnyRecord = Record<string, unknown>;

const DEFAULT_SCHEMA_VERSION = 1;

export interface EntityConverterEncryptionConfig {
  readonly sensitiveFieldNames: readonly string[];
  readonly encrypt: (data: AnyRecord, fields: readonly string[]) => AnyRecord;
  readonly decrypt: (data: AnyRecord, fields: readonly string[]) => AnyRecord;
}

export function createEntityConverter(
  entity: AnyDefinedEntity,
  encryption?: EntityConverterEncryptionConfig,
) {
  const domainSchema = entity.schema;

  const persistedSchema = (
    domainSchema as unknown as z.ZodObject<Record<string, z.ZodTypeAny>>
  )
    .extend({
      _schemaVersion: z.literal(DEFAULT_SCHEMA_VERSION),
    })
    .strict();

  type Domain = z.infer<typeof domainSchema>;
  type Persisted = Domain & {
    readonly _schemaVersion: typeof DEFAULT_SCHEMA_VERSION;
  };

  const baseConverter = createVersionedConverter<Domain, Persisted>({
    currentVersion: DEFAULT_SCHEMA_VERSION,
    domainSchema,
    persistedSchema: persistedSchema as unknown as z.ZodType<Persisted>,
    migrations: {},
    fromPersisted: (persisted) => {
      const domain = { ...persisted } as AnyRecord;
      Reflect.deleteProperty(domain, "_schemaVersion");
      return domain as Domain;
    },
    toPersisted: (domain) => domain,
  });

  if (!encryption || encryption.sensitiveFieldNames.length === 0) {
    return baseConverter;
  }

  return {
    read(raw: unknown): Domain {
      const rawRecord = raw as AnyRecord;
      const decrypted = encryption.decrypt(
        rawRecord,
        encryption.sensitiveFieldNames,
      );
      return baseConverter.read(decrypted);
    },
    write(rawDomain: unknown): Persisted {
      const persisted = baseConverter.write(rawDomain);
      return encryption.encrypt(
        persisted as unknown as AnyRecord,
        encryption.sensitiveFieldNames,
      ) as unknown as Persisted;
    },
  };
}
