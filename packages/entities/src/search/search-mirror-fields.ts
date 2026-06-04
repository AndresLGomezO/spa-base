import { z } from "zod";

import type { DefinedEntity, FieldDefinitions } from "../types.js";

import {
  listSearchableStringFields,
  resolveSearchField,
} from "./searchable-fields.js";

export function shouldPersistSearchMirrorFields(
  entity: AnyDefinedEntity,
): boolean {
  return (
    entity.metadata.inMemoryListQueries !== true &&
    listSearchableStringFields(entity).length > 0
  );
}

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export function searchMirrorFieldName(sourceField: string): string {
  return `${sourceField}SearchTokens`;
}

/** Removed string mirror (`{field}Search`); strip if still present on records. */
export function legacySearchMirrorFieldName(sourceField: string): string {
  return `${sourceField}Search`;
}

export function resolveSearchStorageField(
  entity: AnyDefinedEntity,
): string | null {
  const sourceField = resolveSearchField(entity);
  if (!sourceField) {
    return null;
  }

  return searchMirrorFieldName(sourceField);
}

export function listSearchMirrorStorageFields(
  entity: AnyDefinedEntity,
): readonly string[] {
  return listSearchableStringFields(entity).map((sourceField) =>
    searchMirrorFieldName(sourceField),
  );
}

export function listLegacySearchMirrorFieldNames(
  entity: AnyDefinedEntity,
): readonly string[] {
  return listSearchableStringFields(entity).map((sourceField) =>
    legacySearchMirrorFieldName(sourceField),
  );
}

/** Lowercase word tokens for prefix search on any word (not full-string prefix only). */
export function tokenizeSearchMirrorValue(value: string): string[] {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return [];
  }

  return normalized
    .split(/\s+/)
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((token) => token.length > 0);
}

function tokenizeSearchSourceValue(value: unknown): string[] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const tokens = tokenizeSearchMirrorValue(value);
  return tokens.length > 0 ? tokens : undefined;
}

export function stripSearchMirrorFields(
  entity: AnyDefinedEntity,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...record };

  for (const sourceField of listSearchableStringFields(entity)) {
    Reflect.deleteProperty(next, searchMirrorFieldName(sourceField));
    Reflect.deleteProperty(next, legacySearchMirrorFieldName(sourceField));
  }

  return next;
}

export function prepareRecordSearchFields(
  entity: AnyDefinedEntity,
  record: Record<string, unknown>,
): Record<string, unknown> {
  if (!shouldPersistSearchMirrorFields(entity)) {
    return stripSearchMirrorFields(entity, record);
  }

  return applySearchMirrorFields(entity, record);
}

export function applySearchMirrorFields(
  entity: AnyDefinedEntity,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const searchableFields = listSearchableStringFields(entity);
  if (searchableFields.length === 0) {
    return record;
  }

  const next = { ...record };

  for (const sourceField of searchableFields) {
    const tokensField = searchMirrorFieldName(sourceField);
    const tokens = tokenizeSearchSourceValue(record[sourceField]);
    Reflect.deleteProperty(next, legacySearchMirrorFieldName(sourceField));
    if (tokens === undefined) {
      Reflect.deleteProperty(next, tokensField);
    } else {
      next[tokensField] = tokens;
    }
  }

  return next;
}

export function extendEntitySchemaWithSearchMirrors(
  entity: AnyDefinedEntity,
): AnyDefinedEntity {
  if (!shouldPersistSearchMirrorFields(entity)) {
    return entity;
  }

  const searchableFields = listSearchableStringFields(entity);
  if (searchableFields.length === 0) {
    return entity;
  }

  const mirrorShape: Record<string, z.ZodTypeAny> = {};
  for (const sourceField of searchableFields) {
    mirrorShape[searchMirrorFieldName(sourceField)] = z
      .array(z.string())
      .optional();
  }

  const baseSchema = entity.schema as unknown as z.ZodObject<
    Record<string, z.ZodTypeAny>
  >;
  const extendedSchema = baseSchema.extend(mirrorShape).strict();

  return {
    ...entity,
    schema: extendedSchema as unknown as typeof entity.schema,
    metadata: {
      ...entity.metadata,
      schema: extendedSchema as unknown as typeof entity.schema,
    },
  };
}
