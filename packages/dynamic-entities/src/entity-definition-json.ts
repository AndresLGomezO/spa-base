import { z } from "zod";

import {
  createEntityDefinitionInputSchema,
  fieldDefinitionSchema,
  type CreateEntityDefinitionInput,
  type EntityDefinitionRecord,
  type FieldDefinitionRecord,
} from "./types.js";

export const ENTITY_DEFINITION_JSON_VERSION = 1 as const;
export const FIELD_DEFINITION_JSON_KIND = "field-definition" as const;
export const ENTITY_DEFINITION_JSON_KIND = "entity-definition" as const;
export const ENTITY_DEFINITIONS_CATALOG_JSON_KIND =
  "entity-definitions-catalog" as const;

export interface EntityDefinitionJsonError {
  readonly path: string;
  readonly message: string;
}

type JsonImportResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errors: readonly EntityDefinitionJsonError[];
    };

const fieldDefinitionEnvelopeSchema = z.object({
  kind: z.literal(FIELD_DEFINITION_JSON_KIND),
  version: z.literal(ENTITY_DEFINITION_JSON_VERSION),
  data: fieldDefinitionSchema,
});

const entityDefinitionFormDataSchema = createEntityDefinitionInputSchema
  .extend({
    navIcon: z.string().trim().optional(),
  })
  .strict();

export type EntityDefinitionFormData = z.infer<
  typeof entityDefinitionFormDataSchema
>;

const entityDefinitionEnvelopeSchema = z.object({
  kind: z.literal(ENTITY_DEFINITION_JSON_KIND),
  version: z.literal(ENTITY_DEFINITION_JSON_VERSION),
  data: entityDefinitionFormDataSchema,
});

const portableEntityDefinitionSchema = createEntityDefinitionInputSchema;

export const portableEntityCategorySchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  icon: z.string().trim().min(1),
  order: z.number().int(),
});

export type PortableEntityCategory = z.infer<
  typeof portableEntityCategorySchema
>;

export interface EntityCategoryLike {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly order: number;
}

const entityDefinitionsCatalogEnvelopeSchema = z.object({
  kind: z.literal(ENTITY_DEFINITIONS_CATALOG_JSON_KIND),
  version: z.literal(ENTITY_DEFINITION_JSON_VERSION),
  exportedAt: z.string().datetime(),
  entityCategories: z.array(portableEntityCategorySchema).optional(),
  entityDefinitions: z.array(portableEntityDefinitionSchema).min(1),
});

export { entityDefinitionsCatalogEnvelopeSchema };

export type EntityDefinitionsCatalogEnvelope = z.infer<
  typeof entityDefinitionsCatalogEnvelopeSchema
>;

export interface CatalogReplacePlan {
  readonly toCreate: readonly CreateEntityDefinitionInput[];
  readonly toUpdate: readonly {
    readonly existing: EntityDefinitionRecord;
    readonly input: CreateEntityDefinitionInput;
  }[];
  readonly toDelete: readonly EntityDefinitionRecord[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

export interface CategoryReplacePlan {
  readonly toCreate: readonly PortableEntityCategory[];
  readonly toUpdate: readonly {
    readonly existing: EntityCategoryLike;
    readonly input: PortableEntityCategory;
  }[];
  readonly toDelete: readonly EntityCategoryLike[];
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
}

function zodIssuesToErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): readonly EntityDefinitionJsonError[] {
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

function collectRelationTargetsFromCreateInputs(
  definitions: readonly CreateEntityDefinitionInput[],
): readonly string[] {
  const targets: string[] = [];
  for (const definition of definitions) {
    for (const field of definition.fields) {
      if (field.type === "relation" && field.relation?.target) {
        targets.push(field.relation.target);
      }
    }
  }
  return targets;
}

function validateCatalogCrossReferences(
  definitions: readonly CreateEntityDefinitionInput[],
): readonly EntityDefinitionJsonError[] {
  const errors: EntityDefinitionJsonError[] = [];
  const entityNames = new Set(definitions.map((item) => item.name));
  const nameCounts = new Map<string, number>();

  for (const definition of definitions) {
    nameCounts.set(definition.name, (nameCounts.get(definition.name) ?? 0) + 1);
  }

  for (const [name, count] of nameCounts) {
    if (count > 1) {
      errors.push({
        path: "entityDefinitions",
        message: `Duplicate entity name "${name}".`,
      });
    }
  }

  for (const target of collectRelationTargetsFromCreateInputs(definitions)) {
    if (!entityNames.has(target)) {
      errors.push({
        path: "entityDefinitions",
        message: `Relation target "${target}" is not defined in entityDefinitions.`,
      });
    }
  }

  return errors;
}

function validateCatalogCategoryCrossReferences(
  categories: readonly PortableEntityCategory[],
): readonly EntityDefinitionJsonError[] {
  const errors: EntityDefinitionJsonError[] = [];
  const idCounts = new Map<string, number>();

  for (const category of categories) {
    idCounts.set(category.id, (idCounts.get(category.id) ?? 0) + 1);
  }

  for (const [id, count] of idCounts) {
    if (count > 1) {
      errors.push({
        path: "entityCategories",
        message: `Duplicate category id "${id}".`,
      });
    }
  }

  return errors;
}

function validateCatalogNavCategoryReferences(
  definitions: readonly CreateEntityDefinitionInput[],
  categories: readonly PortableEntityCategory[] | undefined,
): readonly EntityDefinitionJsonError[] {
  if (categories === undefined) {
    return [];
  }

  const errors: EntityDefinitionJsonError[] = [];
  const categoryIds = new Set(categories.map((category) => category.id));

  for (const definition of definitions) {
    if (!definition.navCategoryId) {
      continue;
    }
    if (!categoryIds.has(definition.navCategoryId)) {
      errors.push({
        path: `entityDefinitions.${definition.name}.navCategoryId`,
        message: `navCategoryId "${definition.navCategoryId}" is not defined in entityCategories.`,
      });
    }
  }

  return errors;
}

function validateCatalogEnvelopeCrossReferences(
  envelope: EntityDefinitionsCatalogEnvelope,
): readonly EntityDefinitionJsonError[] {
  const errors: EntityDefinitionJsonError[] = [
    ...validateCatalogCrossReferences(envelope.entityDefinitions),
  ];

  if (envelope.entityCategories !== undefined) {
    errors.push(
      ...validateCatalogCategoryCrossReferences(envelope.entityCategories),
    );
    errors.push(
      ...validateCatalogNavCategoryReferences(
        envelope.entityDefinitions,
        envelope.entityCategories,
      ),
    );
  }

  return errors;
}

export function createFieldDefinitionEnvelope(data: FieldDefinitionRecord): {
  readonly kind: typeof FIELD_DEFINITION_JSON_KIND;
  readonly version: typeof ENTITY_DEFINITION_JSON_VERSION;
  readonly data: FieldDefinitionRecord;
} {
  return {
    kind: FIELD_DEFINITION_JSON_KIND,
    version: ENTITY_DEFINITION_JSON_VERSION,
    data,
  };
}

export function createEntityDefinitionEnvelope(
  data: EntityDefinitionFormData,
): {
  readonly kind: typeof ENTITY_DEFINITION_JSON_KIND;
  readonly version: typeof ENTITY_DEFINITION_JSON_VERSION;
  readonly data: EntityDefinitionFormData;
} {
  return {
    kind: ENTITY_DEFINITION_JSON_KIND,
    version: ENTITY_DEFINITION_JSON_VERSION,
    data,
  };
}

export function toPortableEntityDefinition(
  record: EntityDefinitionRecord,
): CreateEntityDefinitionInput {
  const {
    id: _id,
    tenantId: _tenantId,
    version: _version,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...portable
  } = record;
  void _id;
  void _tenantId;
  void _version;
  void _createdAt;
  void _updatedAt;
  return portable;
}

export function toPortableEntityCategory(
  record: EntityCategoryLike,
): PortableEntityCategory {
  return {
    id: record.id,
    name: record.name,
    icon: record.icon,
    order: record.order,
  };
}

export function createEntityDefinitionsCatalogEnvelope(
  definitions: readonly EntityDefinitionRecord[],
  options?: {
    readonly categories?: readonly EntityCategoryLike[];
    readonly exportedAt?: string;
  },
): EntityDefinitionsCatalogEnvelope {
  return {
    kind: ENTITY_DEFINITIONS_CATALOG_JSON_KIND,
    version: ENTITY_DEFINITION_JSON_VERSION,
    exportedAt: options?.exportedAt ?? new Date().toISOString(),
    entityCategories: (options?.categories ?? []).map(toPortableEntityCategory),
    entityDefinitions: definitions.map(toPortableEntityDefinition),
  };
}

export function parseFieldDefinitionJson(
  text: string,
): JsonImportResult<FieldDefinitionRecord> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = fieldDefinitionEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function validateFieldDefinitionImport(
  text: string,
): JsonImportResult<FieldDefinitionRecord> {
  return parseFieldDefinitionJson(text);
}

export function parseEntityDefinitionJson(
  text: string,
): JsonImportResult<EntityDefinitionFormData> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = entityDefinitionEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  return { ok: true, data: result.data.data };
}

export function validateEntityDefinitionImport(
  text: string,
): JsonImportResult<EntityDefinitionFormData> {
  return parseEntityDefinitionJson(text);
}

export function parseEntityDefinitionsCatalogJson(
  text: string,
): JsonImportResult<EntityDefinitionsCatalogEnvelope> {
  const parsed = parseJsonText(text);
  if (!parsed.ok) {
    return parsed;
  }

  const result = entityDefinitionsCatalogEnvelopeSchema.safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogEnvelopeCrossReferences(result.data);
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

export function validateEntityDefinitionsCatalogImport(
  text: string,
): JsonImportResult<EntityDefinitionsCatalogEnvelope> {
  return parseEntityDefinitionsCatalogJson(text);
}

export function validateEntityDefinitionsCatalogEnvelope(
  input: unknown,
): JsonImportResult<EntityDefinitionsCatalogEnvelope> {
  const result = entityDefinitionsCatalogEnvelopeSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: zodIssuesToErrors(result.error) };
  }

  const crossRefErrors = validateCatalogEnvelopeCrossReferences(result.data);
  if (crossRefErrors.length > 0) {
    return { ok: false, errors: crossRefErrors };
  }

  return { ok: true, data: result.data };
}

function collectRelationTargetsFromRecords(
  definitions: readonly EntityDefinitionRecord[],
): readonly string[] {
  const targets: string[] = [];
  for (const definition of definitions) {
    for (const field of definition.fields) {
      if (field.type === "relation" && field.relation?.target) {
        targets.push(field.relation.target);
      }
    }
  }
  return targets;
}

export function validateCatalogDeleteSafety(input: {
  readonly existing: readonly EntityDefinitionRecord[];
  readonly toDelete: readonly EntityDefinitionRecord[];
  readonly survivingNames: ReadonlySet<string>;
}): readonly EntityDefinitionJsonError[] {
  const errors: EntityDefinitionJsonError[] = [];
  const deletingNames = new Set(input.toDelete.map((item) => item.name));

  for (const definition of input.existing) {
    if (deletingNames.has(definition.name)) {
      continue;
    }
    if (!input.survivingNames.has(definition.name)) {
      continue;
    }

    for (const field of definition.fields) {
      if (field.type !== "relation" || !field.relation?.target) {
        continue;
      }
      if (deletingNames.has(field.relation.target)) {
        errors.push({
          path: `entityDefinitions.${definition.name}.fields.${field.name}.relation.target`,
          message: `Cannot delete "${field.relation.target}" because "${definition.name}" references it.`,
        });
      }
    }
  }

  for (const target of collectRelationTargetsFromRecords(input.toDelete)) {
    if (input.survivingNames.has(target)) {
      continue;
    }
    errors.push({
      path: "entityDefinitions",
      message: `Cannot delete entities referenced by relation target "${target}".`,
    });
  }

  return errors;
}

export function validateCatalogCategoryDeleteSafety(input: {
  readonly toDelete: readonly EntityCategoryLike[];
  readonly importedDefinitions: readonly CreateEntityDefinitionInput[];
}): readonly EntityDefinitionJsonError[] {
  const errors: EntityDefinitionJsonError[] = [];
  const deletingIds = new Set(input.toDelete.map((category) => category.id));

  for (const definition of input.importedDefinitions) {
    if (
      !definition.navCategoryId ||
      !deletingIds.has(definition.navCategoryId)
    ) {
      continue;
    }
    errors.push({
      path: `entityDefinitions.${definition.name}.navCategoryId`,
      message: `Cannot delete category "${definition.navCategoryId}" because "${definition.name}" references it.`,
    });
  }

  return errors;
}

export function computeCategoryReplacePlan(input: {
  readonly existing: readonly EntityCategoryLike[];
  readonly imported: readonly PortableEntityCategory[];
}): CategoryReplacePlan {
  const existingById = new Map(
    input.existing.map((record) => [record.id, record]),
  );
  const importedById = new Map(
    input.imported.map((record) => [record.id, record]),
  );

  const toCreate: PortableEntityCategory[] = [];
  const toUpdate: CategoryReplacePlan["toUpdate"][number][] = [];
  const toDelete: EntityCategoryLike[] = [];

  for (const imported of input.imported) {
    const existing = existingById.get(imported.id);
    if (existing) {
      toUpdate.push({ existing, input: imported });
    } else {
      toCreate.push(imported);
    }
  }

  for (const existing of input.existing) {
    if (!importedById.has(existing.id)) {
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

export function computeCatalogReplacePlan(input: {
  readonly existing: readonly EntityDefinitionRecord[];
  readonly imported: readonly CreateEntityDefinitionInput[];
}): CatalogReplacePlan {
  const existingByName = new Map(
    input.existing.map((record) => [record.name, record]),
  );
  const importedByName = new Map(
    input.imported.map((record) => [record.name, record]),
  );

  const toCreate: CreateEntityDefinitionInput[] = [];
  const toUpdate: CatalogReplacePlan["toUpdate"][number][] = [];
  const toDelete: EntityDefinitionRecord[] = [];

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
