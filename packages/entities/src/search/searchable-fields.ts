import type {
  DefinedEntity,
  FieldDefinitions,
  NormalizedFieldMeta,
} from "../types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

function getFieldMeta(
  entity: AnyDefinedEntity,
  fieldName: string,
): NormalizedFieldMeta | null {
  return entity.metadata.fields[fieldName] ?? null;
}

function getFieldUiSearchable(
  entity: AnyDefinedEntity,
  fieldName: string,
): boolean | undefined {
  return entity.metadata.ui?.fields?.[fieldName]?.searchable;
}

export function entityUsesExplicitSearchableFlags(
  entity: AnyDefinedEntity,
): boolean {
  const fields = entity.metadata.ui?.fields;
  if (!fields) {
    return false;
  }

  return Object.values(fields).some((field) => field.searchable !== undefined);
}

function isStringSearchCandidate(
  entity: AnyDefinedEntity,
  fieldName: string,
): boolean {
  const meta = getFieldMeta(entity, fieldName);
  if (!meta || meta.sensitive) {
    return false;
  }

  if (meta.isArray === true) {
    return meta.type === "string" || meta.type === "enum";
  }

  return meta.type === "string";
}

export function isSearchableField(
  entity: AnyDefinedEntity,
  fieldName: string,
): boolean {
  if (!isStringSearchCandidate(entity, fieldName)) {
    return false;
  }

  const uiSearchable = getFieldUiSearchable(entity, fieldName);
  if (entityUsesExplicitSearchableFlags(entity)) {
    return uiSearchable === true;
  }

  if (uiSearchable === false) {
    return false;
  }

  return true;
}

export function resolveSearchField(entity: AnyDefinedEntity): string | null {
  if (
    entity.metadata.displayField &&
    isSearchableField(entity, entity.metadata.displayField)
  ) {
    return entity.metadata.displayField;
  }

  for (const fieldName of Object.keys(entity.metadata.fields)) {
    if (isSearchableField(entity, fieldName)) {
      return fieldName;
    }
  }

  return null;
}

export function listSearchableStringFields(
  entity: AnyDefinedEntity,
): readonly string[] {
  return Object.keys(entity.metadata.fields).filter((fieldName) =>
    isSearchableField(entity, fieldName),
  );
}
