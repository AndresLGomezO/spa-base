import {
  usesForeignKeyStorage,
  type DefinedEntity,
  type FieldDefinitions,
  type NormalizedFieldMeta,
} from "@repo/entities";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const DEFAULT_SORT_FIELD = "id";

function isQueryableListField(
  entity: AnyDefinedEntity,
  fieldName: string,
): boolean {
  if (fieldName === "id" || fieldName === "ownerId") {
    return true;
  }
  if (fieldName === "createdAt") {
    return true;
  }

  const meta = entity.metadata.fields[fieldName];
  if (!meta) {
    return false;
  }

  return isQueryableFieldMeta(meta);
}

function isQueryableFieldMeta(meta: NormalizedFieldMeta): boolean {
  if ("sensitive" in meta && meta.sensitive) {
    return false;
  }
  if (meta.type === "image" || meta.type === "document") {
    return false;
  }
  if (meta.type === "relation") {
    return meta.relation !== undefined && usesForeignKeyStorage(meta.relation);
  }
  return true;
}

function isSortableFieldMeta(meta: NormalizedFieldMeta): boolean {
  if (meta.isArray === true) {
    return false;
  }
  return isQueryableFieldMeta(meta);
}

export function collectFilterableFields(entity: AnyDefinedEntity): string[] {
  const fields = new Set<string>();
  const uiFields = entity.metadata.ui?.fields ?? {};

  for (const [fieldName, fieldUi] of Object.entries(uiFields)) {
    if (fieldUi?.filterable === false) {
      continue;
    }
    if (isQueryableListField(entity, fieldName)) {
      fields.add(fieldName);
    }
  }

  for (const view of entity.metadata.ui?.views ?? []) {
    for (const filter of view.filters ?? []) {
      if (isQueryableListField(entity, filter.field)) {
        fields.add(filter.field);
      }
    }
  }

  return [...fields].sort();
}

export function collectSortableFields(entity: AnyDefinedEntity): string[] {
  const fields = new Set<string>([DEFAULT_SORT_FIELD]);
  const uiFields = entity.metadata.ui?.fields ?? {};

  for (const [fieldName, fieldUi] of Object.entries(uiFields)) {
    if (fieldUi?.sortable === false) {
      continue;
    }
    const meta = entity.metadata.fields[fieldName];
    if (meta && isSortableFieldMeta(meta)) {
      fields.add(fieldName);
    }
  }

  for (const view of entity.metadata.ui?.views ?? []) {
    if (!view.defaultSort) {
      continue;
    }
    const meta = entity.metadata.fields[view.defaultSort.field];
    if (meta && isSortableFieldMeta(meta)) {
      fields.add(view.defaultSort.field);
    }
  }

  if (isQueryableListField(entity, "createdAt")) {
    fields.add("createdAt");
  }

  return [...fields].sort();
}
