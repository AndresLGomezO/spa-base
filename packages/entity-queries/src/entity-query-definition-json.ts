import { z } from "zod";

import {
  createEntityQueryDefinitionInputSchema,
  type CreateEntityQueryDefinitionInput,
  type EntityQueryDefinitionRecord,
} from "./types.js";

export const ENTITY_QUERY_DEFINITION_JSON_VERSION = 1 as const;
export const ENTITY_QUERY_DEFINITION_JSON_KIND =
  "entity-query-definition" as const;
export const ENTITY_QUERY_DEFINITIONS_CATALOG_JSON_KIND =
  "entity-query-definitions-catalog" as const;

export interface EntityQueryDefinitionJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly EntityQueryDefinitionJsonError[];
    };

const portableEntityQueryDefinitionSchema =
  createEntityQueryDefinitionInputSchema;

export type PortableEntityQueryDefinition = z.infer<
  typeof portableEntityQueryDefinitionSchema
>;

const entityQueryDefinitionEnvelopeSchema = z.object({
  kind: z.literal(ENTITY_QUERY_DEFINITION_JSON_KIND),
  version: z.literal(ENTITY_QUERY_DEFINITION_JSON_VERSION),
  data: portableEntityQueryDefinitionSchema,
});

export type EntityQueryDefinitionFormData = z.infer<
  typeof entityQueryDefinitionEnvelopeSchema
>["data"];

const entityQueryDefinitionsCatalogEnvelopeSchema = z.object({
  kind: z.literal(ENTITY_QUERY_DEFINITIONS_CATALOG_JSON_KIND),
  version: z.literal(ENTITY_QUERY_DEFINITION_JSON_VERSION),
  exportedAt: z.string().datetime(),
  entityQueryDefinitions: z.array(portableEntityQueryDefinitionSchema).min(1),
});

export { entityQueryDefinitionsCatalogEnvelopeSchema };

export type EntityQueryDefinitionsCatalogEnvelope = z.infer<
  typeof entityQueryDefinitionsCatalogEnvelopeSchema
>;

export interface CatalogReplacePlan {
  readonly toCreate: readonly CreateEntityQueryDefinitionInput[];
  readonly toUpdate: readonly {
    readonly existing: EntityQueryDefinitionRecord;
    readonly input: CreateEntityQueryDefinitionInput;
  }[];
  readonly toDelete: readonly EntityQueryDefinitionRecord[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly EntityQueryDefinitionJsonError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "$",
    message: issue.message,
  }));
}

function parseJsonText(text: string): JsonImportResult<unknown> {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      errors: [{ path: "(root)", message: "Invalid JSON." }],
    };
  }
}

function validateCatalogCrossReferences(
  definitions: readonly CreateEntityQueryDefinitionInput[],
): readonly EntityQueryDefinitionJsonError[] {
  const errors: EntityQueryDefinitionJsonError[] = [];
  const nameCounts = new Map<string, number>();

  for (const definition of definitions) {
    nameCounts.set(definition.name, (nameCounts.get(definition.name) ?? 0) + 1);
  }

  for (const [name, count] of nameCounts) {
    if (count > 1) {
      errors.push({
        path: "entityQueryDefinitions",
        message: `Duplicate query name "${name}".`,
      });
    }
  }

  return errors;
}

export function toPortableEntityQueryDefinition(
  record: EntityQueryDefinitionRecord,
): CreateEntityQueryDefinitionInput {
  const {
    id: _id,
    tenantId: _tenantId,
    queryId: _queryId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    name,
    description,
    sourceEntity,
    parameters,
    filter,
    sort,
    select,
    limitMode,
    limit,
    status,
  } = record;
  void _id;
  void _tenantId;
  void _queryId;
  void _createdAt;
  void _updatedAt;

  return createEntityQueryDefinitionInputSchema.parse({
    name,
    ...(description !== undefined ? { description } : {}),
    sourceEntity,
    ...(parameters !== undefined ? { parameters } : {}),
    filter,
    sort,
    ...(select !== undefined ? { select } : {}),
    limitMode,
    ...(limit !== undefined ? { limit } : {}),
    status,
  });
}

export function createEntityQueryDefinitionEnvelope(
  data: EntityQueryDefinitionFormData,
): {
  readonly kind: typeof ENTITY_QUERY_DEFINITION_JSON_KIND;
  readonly version: typeof ENTITY_QUERY_DEFINITION_JSON_VERSION;
  readonly data: EntityQueryDefinitionFormData;
} {
  return {
    kind: ENTITY_QUERY_DEFINITION_JSON_KIND,
    version: ENTITY_QUERY_DEFINITION_JSON_VERSION,
    data,
  };
}

export function createEntityQueryDefinitionsCatalogEnvelope(
  definitions: readonly EntityQueryDefinitionRecord[],
  options?: { readonly exportedAt?: string },
): EntityQueryDefinitionsCatalogEnvelope {
  return {
    kind: ENTITY_QUERY_DEFINITIONS_CATALOG_JSON_KIND,
    version: ENTITY_QUERY_DEFINITION_JSON_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    entityQueryDefinitions: definitions.map(toPortableEntityQueryDefinition),
  };
}

export function parseEntityQueryDefinitionJson(
  text: string,
): JsonImportResult<EntityQueryDefinitionFormData> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = entityQueryDefinitionEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function validateEntityQueryDefinitionImport(
  text: string,
): JsonImportResult<EntityQueryDefinitionFormData> {
  return parseEntityQueryDefinitionJson(text);
}

export function parseEntityQueryDefinitionsCatalogJson(
  text: string,
): JsonImportResult<EntityQueryDefinitionsCatalogEnvelope> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = entityQueryDefinitionsCatalogEnvelopeSchema.safeParse(
    parsed.data,
  );
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.entityQueryDefinitions,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function validateEntityQueryDefinitionsCatalogImport(
  text: string,
): JsonImportResult<EntityQueryDefinitionsCatalogEnvelope> {
  return parseEntityQueryDefinitionsCatalogJson(text);
}

export function validateEntityQueryDefinitionsCatalogEnvelope(
  input: unknown,
): JsonImportResult<EntityQueryDefinitionsCatalogEnvelope> {
  const result = entityQueryDefinitionsCatalogEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogCrossReferences(
    result.data.entityQueryDefinitions,
  );
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function computeCatalogReplacePlan(input: {
  readonly existing: readonly EntityQueryDefinitionRecord[];
  readonly imported: readonly CreateEntityQueryDefinitionInput[];
}): CatalogReplacePlan {
  const existingByName = new Map(
    input.existing.map((record) => [record.name, record]),
  );
  const importedByName = new Map(
    input.imported.map((record) => [record.name, record]),
  );

  const toCreate: CreateEntityQueryDefinitionInput[] = [];
  const toUpdate: CatalogReplacePlan["toUpdate"][number][] = [];
  const toDelete: EntityQueryDefinitionRecord[] = [];

  for (const imported of input.imported) {
    const existing = existingByName.get(imported.name);
    if (existing) {
      toUpdate.push({ existing, input: imported });
    } else {
      toCreate.push(imported);
    }
  }

  for (const existing of input.existing) {
    if (!importedByName.has(existing.name)) {
      toDelete.push(existing);
    }
  }

  return {
    toCreate,
    toUpdate,
    toDelete,
    counts: {
      created: toCreate.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
    },
  };
}
