import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import { z } from "zod";

import { createVersionedConverter } from "../core/versioned-converter.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const DEFAULT_SCHEMA_VERSION = 1;

export function createEntityConverter(entity: AnyDefinedEntity) {
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

  return createVersionedConverter<Domain, Persisted>({
    currentVersion: DEFAULT_SCHEMA_VERSION,
    domainSchema,
    persistedSchema: persistedSchema as unknown as z.ZodType<Persisted>,
    migrations: {},
    fromPersisted: (persisted) => {
      const domain = { ...persisted } as Record<string, unknown>;
      Reflect.deleteProperty(domain, "_schemaVersion");
      return domain as Domain;
    },
    toPersisted: (domain) => domain,
  });
}
