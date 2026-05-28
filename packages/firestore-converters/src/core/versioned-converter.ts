import { z } from "zod";

import {
  MissingSchemaTransformError,
  MissingSchemaVersionError,
  SchemaValidationError,
  UnsupportedSchemaVersionError,
} from "./errors.js";
import { normalizeFirestoreTimestamps } from "./timestamps.js";

type AnyRecord = Record<string, unknown>;

export type SchemaTransform = (input: AnyRecord) => AnyRecord;

export interface VersionedConverterConfig<
  TDomain,
  TPersistedLatest extends { _schemaVersion: number },
> {
  readonly currentVersion: number;
  readonly domainSchema: z.ZodType<TDomain>;
  readonly persistedSchema: z.ZodType<TPersistedLatest>;
  readonly migrations?: Record<number, SchemaTransform>;
  readonly fromPersisted: (persisted: TPersistedLatest) => TDomain;
  readonly toPersisted: (
    domain: TDomain,
  ) => Omit<TPersistedLatest, "_schemaVersion">;
}

function parseSchemaVersion(input: AnyRecord): number {
  const version = input._schemaVersion;
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    throw new MissingSchemaVersionError(input);
  }
  return version;
}

function parseWithSchema<T>(
  schema: z.ZodType<T>,
  input: unknown,
  message: string,
): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new SchemaValidationError(message, parsed.error.format());
  }
  return parsed.data;
}

function parseDomainWithUnknownKeyStripping<T>(
  schema: z.ZodType<T>,
  input: unknown,
): T {
  if (schema instanceof z.ZodObject) {
    const stripped = schema.strip();
    return parseWithSchema(
      stripped as unknown as z.ZodType<T>,
      input,
      "Domain document does not match schema.",
    );
  }
  return parseWithSchema(
    schema,
    input,
    "Domain document does not match schema.",
  );
}

export function createVersionedConverter<
  TDomain,
  TPersistedLatest extends { _schemaVersion: number },
>(config: VersionedConverterConfig<TDomain, TPersistedLatest>) {
  const migrations = config.migrations ?? {};

  function migrateToLatest(input: unknown): TPersistedLatest {
    const normalized = normalizeFirestoreTimestamps(input);
    const asRecord = parseWithSchema(
      z.record(z.string(), z.unknown()),
      normalized,
      "Raw firestore document must be an object.",
    );

    const sourceVersion = parseSchemaVersion(asRecord);
    if (sourceVersion > config.currentVersion) {
      throw new UnsupportedSchemaVersionError(
        sourceVersion,
        config.currentVersion,
      );
    }

    let workingDocument = asRecord;
    for (
      let version = sourceVersion;
      version < config.currentVersion;
      version += 1
    ) {
      const transform = migrations[version];
      if (!transform) {
        throw new MissingSchemaTransformError(version, version + 1);
      }
      workingDocument = transform(workingDocument);
    }

    return parseWithSchema(
      config.persistedSchema,
      workingDocument,
      "Persisted document does not match latest schema.",
    );
  }

  return {
    read(raw: unknown): TDomain {
      const latestPersisted = migrateToLatest(raw);
      return config.fromPersisted(latestPersisted);
    },
    write(rawDomain: unknown): TPersistedLatest {
      const domain = parseDomainWithUnknownKeyStripping(
        config.domainSchema,
        rawDomain,
      );

      const persistedCandidate = {
        ...config.toPersisted(domain),
        _schemaVersion: config.currentVersion,
      };

      return parseWithSchema(
        config.persistedSchema,
        persistedCandidate,
        "Persisted write document does not match schema.",
      );
    },
  };
}
