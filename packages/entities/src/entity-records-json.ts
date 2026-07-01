import { getJoinCollectionRelations } from "./relations/relationConfig.js";
import { SYSTEM_FIELD_KEYS } from "./systemFields.js";
import type { DefinedEntity, FieldDefinitions } from "./types.js";

export const ENTITY_RECORDS_JSON_VERSION = 1 as const;

export interface EntityRecordJsonError {
  readonly path: string;
  readonly message: string;
}

export type EntityRecordJsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly EntityRecordJsonError[];
    };

export interface EntityRecordPayloadSplit {
  readonly documentPayload: Record<string, unknown>;
  readonly relations: Record<string, readonly string[]>;
}

export interface PortableEntityRecord {
  readonly id?: string;
  readonly relations?: Record<string, readonly string[]>;
  readonly [key: string]: unknown;
}

export interface EntityRecordsExportEnvelope {
  readonly entityName: string;
  readonly exportedAt: string;
  readonly records: readonly PortableEntityRecord[];
}

const META_KEYS_TO_STRIP = new Set<string>([
  ...SYSTEM_FIELD_KEYS,
  "_populated",
  "relations",
  "document",
]);

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

function zodIssuesToErrors(
  error: {
    issues: ReadonlyArray<{
      path: ReadonlyArray<PropertyKey>;
      message: string;
    }>;
  },
  pathPrefix = "",
): readonly EntityRecordJsonError[] {
  return error.issues.map((issue) => {
    const suffix =
      issue.path.length > 0 ? issue.path.map(String).join(".") : "$";
    const path = pathPrefix
      ? suffix === "$"
        ? pathPrefix
        : `${pathPrefix}.${suffix}`
      : suffix;
    return { path, message: issue.message };
  });
}

function parseJsonText(text: string): EntityRecordJsonImportResult<unknown> {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      errors: [{ path: "(root)", message: "Invalid JSON." }],
    };
  }
}

function parseRelations(
  value: unknown,
): Record<string, readonly string[]> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const relations: Record<string, readonly string[]> = {};
  for (const [fieldName, targets] of Object.entries(value)) {
    relations[fieldName] = Array.isArray(targets)
      ? targets.filter((entry): entry is string => typeof entry === "string")
      : [];
  }
  return relations;
}

export function splitEntityRecordPayload(
  item: unknown,
): EntityRecordJsonImportResult<EntityRecordPayloadSplit> {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return {
      ok: false,
      errors: [{ path: "$", message: "Each record must be a JSON object." }],
    };
  }

  const record = item as Record<string, unknown>;
  if ("document" in record) {
    const document = record.document;
    if (
      typeof document !== "object" ||
      document === null ||
      Array.isArray(document)
    ) {
      return {
        ok: false,
        errors: [
          {
            path: "document",
            message: 'Combined payload "document" must be an object.',
          },
        ],
      };
    }

    return {
      ok: true,
      data: {
        documentPayload: document as Record<string, unknown>,
        relations: parseRelations(record.relations) ?? {},
      },
    };
  }

  const relations = parseRelations(record.relations) ?? {};
  const documentPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key !== "relations") {
      documentPayload[key] = value;
    }
  }

  return {
    ok: true,
    data: { documentPayload, relations },
  };
}

export function stripEntityRecordSystemFields(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!META_KEYS_TO_STRIP.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

export function normalizeEntityRecordsImportInput(
  parsed: unknown,
): EntityRecordJsonImportResult<readonly unknown[]> {
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return {
        ok: false,
        errors: [
          { path: "(root)", message: "Import array must not be empty." },
        ],
      };
    }
    return { ok: true, data: parsed };
  }

  if (typeof parsed === "object" && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    if (
      "records" in record &&
      Array.isArray(record.records) &&
      !("document" in record)
    ) {
      if (record.records.length === 0) {
        return {
          ok: false,
          errors: [
            {
              path: "records",
              message: "Export records array must not be empty.",
            },
          ],
        };
      }
      return { ok: true, data: record.records };
    }

    return { ok: true, data: [parsed] };
  }

  return {
    ok: false,
    errors: [
      {
        path: "(root)",
        message:
          "Import JSON must be an object or a non-empty array of objects.",
      },
    ],
  };
}

export function parseEntityRecordsImportText(
  text: string,
): EntityRecordJsonImportResult<readonly unknown[]> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }
  return normalizeEntityRecordsImportInput(parsed.data);
}

export function validateEntityRecordSchema<
  TName extends string,
  TFields extends FieldDefinitions,
>(
  entity: DefinedEntity<TName, TFields>,
  payload: Record<string, unknown>,
  mode: "create" | "update",
): readonly EntityRecordJsonError[] {
  const schema = mode === "create" ? entity.createSchema : entity.updateSchema;
  const result = schema.safeParse(payload);
  if (result.success) {
    return [];
  }
  return zodIssuesToErrors(result.error);
}

function validateRelationsShape(
  entity: AnyDefinedEntity,
  relations: Record<string, readonly string[]>,
  pathPrefix: string,
): readonly EntityRecordJsonError[] {
  const joinFields = new Set(
    getJoinCollectionRelations(entity.metadata).map((entry) => entry.fieldName),
  );
  const errors: EntityRecordJsonError[] = [];

  for (const fieldName of Object.keys(relations)) {
    if (!joinFields.has(fieldName)) {
      errors.push({
        path: `${pathPrefix}.relations.${fieldName}`,
        message: `Unknown many-to-many relation field "${fieldName}".`,
      });
    }
  }

  return errors;
}

export function validateEntityRecordsImport<
  TName extends string,
  TFields extends FieldDefinitions,
>(
  entity: DefinedEntity<TName, TFields>,
  items: readonly unknown[],
): EntityRecordJsonImportResult<
  readonly {
    readonly documentPayload: Record<string, unknown>;
    readonly relations: Record<string, readonly string[]>;
    readonly mode: "create" | "update";
    readonly id?: string;
  }[]
> {
  const errors: EntityRecordJsonError[] = [];
  const normalized: {
    documentPayload: Record<string, unknown>;
    relations: Record<string, readonly string[]>;
    mode: "create" | "update";
    id?: string;
  }[] = [];
  const seenIds = new Set<string>();

  items.forEach((item, index) => {
    const pathPrefix = `[${index}]`;
    const split = splitEntityRecordPayload(item);
    if (!split.ok) {
      errors.push(
        ...split.errors.map((error) => ({
          path: `${pathPrefix}${error.path === "$" ? "" : `.${error.path}`}`,
          message: error.message,
        })),
      );
      return;
    }

    const rawDocument = split.data.documentPayload;
    const rawId = rawDocument.id;
    const hasId = typeof rawId === "string" && rawId.trim().length > 0;
    const id = hasId ? rawId.trim() : undefined;
    const mode: "create" | "update" = hasId ? "update" : "create";

    const documentPayload = stripEntityRecordSystemFields(rawDocument);

    if (id) {
      if (seenIds.has(id)) {
        errors.push({
          path: `${pathPrefix}.id`,
          message: `Duplicate record id "${id}" in import batch.`,
        });
      } else {
        seenIds.add(id);
      }
    }

    const payloadForSchema =
      mode === "update"
        ? stripEntityRecordSystemFields({ ...documentPayload, id: undefined })
        : documentPayload;

    errors.push(
      ...validateEntityRecordSchema(entity, payloadForSchema, mode).map(
        (error) => ({
          path: `${pathPrefix}${error.path === "$" ? "" : `.${error.path}`}`,
          message: error.message,
        }),
      ),
    );

    errors.push(
      ...validateRelationsShape(entity, split.data.relations, pathPrefix).map(
        (error) => ({ path: error.path, message: error.message }),
      ),
    );

    normalized.push({
      documentPayload: payloadForSchema,
      relations: split.data.relations,
      mode,
      ...(id ? { id } : {}),
    });
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: normalized };
}

export function toPortableEntityRecord<
  TName extends string,
  TFields extends FieldDefinitions,
>(
  entity: DefinedEntity<TName, TFields>,
  record: Record<string, unknown>,
  relations?: Record<string, readonly string[]>,
): PortableEntityRecord {
  const portable: Record<string, unknown> = {};
  for (const fieldName of Object.keys(entity.metadata.fields)) {
    if (fieldName in record) {
      portable[fieldName] = record[fieldName];
    }
  }

  if (typeof record.id === "string" && record.id.length > 0) {
    portable.id = record.id;
  }

  const relationEntries = relations ?? {};
  if (Object.keys(relationEntries).length > 0) {
    portable.relations = relationEntries;
  }

  return portable as PortableEntityRecord;
}

export function createEntityRecordsExportEnvelope(
  entityName: string,
  records: readonly PortableEntityRecord[],
  exportedAt = new Date().toISOString(),
): EntityRecordsExportEnvelope {
  return {
    entityName,
    exportedAt,
    records,
  };
}
