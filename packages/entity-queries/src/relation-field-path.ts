import {
  isOneToManyRelationField,
  resolveOneToManyForeignKeyField,
  type SerializableEntityDefinition,
} from "@repo/entities";

import type { EntityQueryFilterOperator } from "./types.js";

export interface EntityCatalogEntry {
  readonly name: string;
  readonly fields: SerializableEntityDefinition["fields"];
  readonly ui?: SerializableEntityDefinition["ui"];
}

export type QueryableRelationPath =
  | {
      readonly kind: "many-to-one";
      readonly path: string;
      readonly foreignKeyField: string;
      readonly targetEntity: string;
      readonly subField: string;
    }
  | {
      readonly kind: "one-to-many";
      readonly path: string;
      readonly childEntity: string;
      readonly foreignKeyField: string;
      readonly subField: string;
      readonly relationFieldName?: string;
    };

export interface QueryableFieldPathOption {
  readonly value: string;
  readonly label: string;
  readonly group: "direct" | "relation";
  readonly relationKind?: "many-to-one" | "one-to-one" | "one-to-many";
}

export interface QueryableFieldMeta {
  readonly entityName: string;
  readonly fieldName: string;
  readonly type: string;
  readonly enumValues?: readonly string[];
  readonly relationPath?: QueryableRelationPath;
}

const QUERYABLE_SYSTEM_FIELDS = new Set(["id", "createdAt"]);

const FILTER_OPERATORS_BY_TYPE: Record<
  string,
  readonly EntityQueryFilterOperator[] | null
> = {
  string: ["==", "!=", "in"],
  number: ["==", "!=", "<", "<=", ">", ">=", "in"],
  boolean: ["=="],
  date: ["==", "!=", "<", "<=", ">", ">="],
  relation: ["==", "in"],
  enum: ["==", "!=", "in"],
  image: null,
  document: null,
};

function resolveRelationFieldName(
  definition: EntityCatalogEntry,
  pathSegment: string,
): string | null {
  const segment = pathSegment.trim();
  if (!segment) {
    return null;
  }

  const directMeta = definition.fields[segment];
  if (
    directMeta?.relation &&
    (directMeta.relation.type === "many-to-one" ||
      directMeta.relation.type === "one-to-one")
  ) {
    return segment;
  }

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (
      meta.relation &&
      (meta.relation.type === "many-to-one" ||
        meta.relation.type === "one-to-one") &&
      meta.relation.target === segment
    ) {
      return fieldName;
    }
  }

  return null;
}

function isQueryableFieldMeta(
  meta: SerializableEntityDefinition["fields"][string] | undefined,
): boolean {
  if (!meta || meta.sensitive) {
    return false;
  }

  if (meta.type === "image" || meta.type === "document") {
    return false;
  }

  if (meta.isArray) {
    return false;
  }

  return FILTER_OPERATORS_BY_TYPE[meta.type] !== null;
}

function getFieldLabel(
  definition: EntityCatalogEntry,
  fieldName: string,
): string {
  const uiLabel = definition.ui?.fields?.[fieldName]?.label;
  if (uiLabel) {
    return uiLabel;
  }

  return fieldName
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getEntityLabel(definition: EntityCatalogEntry): string {
  return definition.ui?.nav?.label ?? definition.name;
}

export function getAllowedOperatorsForFieldMeta(
  meta: SerializableEntityDefinition["fields"][string] | undefined,
): readonly EntityQueryFilterOperator[] {
  if (!meta) {
    return ["=="];
  }

  const allowed = FILTER_OPERATORS_BY_TYPE[meta.type];
  return allowed ?? ["=="];
}

export function getAllowedOperatorsForFieldType(
  fieldType: string,
): readonly EntityQueryFilterOperator[] {
  const allowed = FILTER_OPERATORS_BY_TYPE[fieldType];
  return allowed ?? ["=="];
}

export function parseQueryableRelationPath(
  sourceDefinition: EntityCatalogEntry,
  catalog: readonly EntityCatalogEntry[],
  fieldPath: string,
): QueryableRelationPath | null {
  const trimmedPath = fieldPath.trim();
  if (!trimmedPath.includes(".")) {
    return null;
  }

  const [firstSegment, subField] = trimmedPath.split(".", 2);
  if (!firstSegment || !subField) {
    return null;
  }

  const manyToOneField = resolveRelationFieldName(
    sourceDefinition,
    firstSegment,
  );
  if (manyToOneField) {
    const relationMeta = sourceDefinition.fields[manyToOneField];
    const targetEntity = relationMeta?.relation?.target;
    if (!targetEntity) {
      return null;
    }

    const targetDefinition = catalog.find(
      (entry) => entry.name === targetEntity,
    );
    if (
      !targetDefinition ||
      !isQueryableFieldMeta(targetDefinition.fields[subField])
    ) {
      return null;
    }

    return {
      kind: "many-to-one",
      path: trimmedPath,
      foreignKeyField: manyToOneField,
      targetEntity,
      subField,
    };
  }

  for (const [fieldName, meta] of Object.entries(sourceDefinition.fields)) {
    if (!isOneToManyRelationField(meta)) {
      continue;
    }

    const targetEntity = meta.relation?.target;
    if (!targetEntity) {
      continue;
    }

    if (fieldName !== firstSegment && targetEntity !== firstSegment) {
      continue;
    }

    const childDefinition = catalog.find(
      (entry) => entry.name === targetEntity,
    );
    if (!childDefinition) {
      return null;
    }

    const relationInverse = (meta.relation as { inverse?: string }).inverse;
    const foreignKeyField = resolveOneToManyForeignKeyField(
      sourceDefinition.name,
      childDefinition as SerializableEntityDefinition,
      relationInverse ? { inverse: relationInverse } : undefined,
    );
    if (
      !foreignKeyField ||
      !isQueryableFieldMeta(childDefinition.fields[subField])
    ) {
      return null;
    }

    return {
      kind: "one-to-many",
      path: trimmedPath,
      childEntity: targetEntity,
      foreignKeyField,
      subField,
      relationFieldName: fieldName,
    };
  }

  const reverseChild = catalog.find((entry) => entry.name === firstSegment);
  if (!reverseChild) {
    return null;
  }

  for (const [fieldName, meta] of Object.entries(reverseChild.fields)) {
    if (
      meta.relation?.target === sourceDefinition.name &&
      (meta.relation.type === "many-to-one" ||
        meta.relation.type === "one-to-one")
    ) {
      if (!isQueryableFieldMeta(reverseChild.fields[subField])) {
        return null;
      }

      return {
        kind: "one-to-many",
        path: trimmedPath,
        childEntity: reverseChild.name,
        foreignKeyField: fieldName,
        subField,
      };
    }
  }

  return null;
}

function listDirectQueryableFields(
  definition: EntityCatalogEntry,
): QueryableFieldPathOption[] {
  const options: QueryableFieldPathOption[] = [];

  for (const systemField of QUERYABLE_SYSTEM_FIELDS) {
    options.push({
      value: systemField,
      label: getFieldLabel(definition, systemField),
      group: "direct",
    });
  }

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (!isQueryableFieldMeta(meta)) {
      continue;
    }

    options.push({
      value: fieldName,
      label: getFieldLabel(definition, fieldName),
      group: "direct",
    });
  }

  return options;
}

function listRelationQueryableFields(
  sourceDefinition: EntityCatalogEntry,
  catalog: readonly EntityCatalogEntry[],
): QueryableFieldPathOption[] {
  const options: QueryableFieldPathOption[] = [];
  const seenPaths = new Set<string>();

  function addRelationPath(
    path: string,
    relationLabel: string,
    subFieldLabel: string,
    relationKind: "many-to-one" | "one-to-one" | "one-to-many",
  ): void {
    if (seenPaths.has(path)) {
      return;
    }
    seenPaths.add(path);
    options.push({
      value: path,
      label: `${relationLabel} → ${subFieldLabel}`,
      group: "relation",
      relationKind,
    });
  }

  for (const [fieldName, meta] of Object.entries(sourceDefinition.fields)) {
    if (
      meta.relation &&
      (meta.relation.type === "many-to-one" ||
        meta.relation.type === "one-to-one")
    ) {
      const targetEntity = meta.relation.target;
      if (!targetEntity) {
        continue;
      }

      const targetDefinition = catalog.find(
        (entry) => entry.name === targetEntity,
      );
      if (!targetDefinition) {
        continue;
      }

      const relationLabel = getEntityLabel(targetDefinition);
      for (const [subFieldName, subMeta] of Object.entries(
        targetDefinition.fields,
      )) {
        if (!isQueryableFieldMeta(subMeta)) {
          continue;
        }

        const path = `${targetEntity}.${subFieldName}`;
        addRelationPath(
          path,
          relationLabel,
          getFieldLabel(targetDefinition, subFieldName),
          meta.relation.type,
        );

        const aliasPath = `${fieldName}.${subFieldName}`;
        if (aliasPath !== path) {
          addRelationPath(
            aliasPath,
            relationLabel,
            getFieldLabel(targetDefinition, subFieldName),
            meta.relation.type,
          );
        }
      }
    }

    if (isOneToManyRelationField(meta)) {
      const targetEntity = meta.relation?.target;
      if (!targetEntity) {
        continue;
      }

      const childDefinition = catalog.find(
        (entry) => entry.name === targetEntity,
      );
      if (!childDefinition) {
        continue;
      }

      const relationLabel = getEntityLabel(childDefinition);
      for (const [subFieldName, subMeta] of Object.entries(
        childDefinition.fields,
      )) {
        if (!isQueryableFieldMeta(subMeta)) {
          continue;
        }

        const pathByField = `${fieldName}.${subFieldName}`;
        addRelationPath(
          pathByField,
          relationLabel,
          getFieldLabel(childDefinition, subFieldName),
          "one-to-many",
        );

        const pathByEntity = `${targetEntity}.${subFieldName}`;
        if (pathByEntity !== pathByField) {
          addRelationPath(
            pathByEntity,
            relationLabel,
            getFieldLabel(childDefinition, subFieldName),
            "one-to-many",
          );
        }
      }
    }
  }

  for (const childDefinition of catalog) {
    if (childDefinition.name === sourceDefinition.name) {
      continue;
    }

    for (const [foreignKeyField, meta] of Object.entries(
      childDefinition.fields,
    )) {
      if (
        meta.relation?.target !== sourceDefinition.name ||
        (meta.relation.type !== "many-to-one" &&
          meta.relation.type !== "one-to-one")
      ) {
        continue;
      }

      const hasExplicitO2m = Object.values(sourceDefinition.fields).some(
        (parentMeta) =>
          isOneToManyRelationField(parentMeta) &&
          parentMeta.relation?.target === childDefinition.name,
      );
      if (hasExplicitO2m) {
        continue;
      }

      const relationLabel = getEntityLabel(childDefinition);
      for (const [subFieldName, subMeta] of Object.entries(
        childDefinition.fields,
      )) {
        if (
          subFieldName === foreignKeyField ||
          !isQueryableFieldMeta(subMeta)
        ) {
          continue;
        }

        addRelationPath(
          `${childDefinition.name}.${subFieldName}`,
          relationLabel,
          getFieldLabel(childDefinition, subFieldName),
          "one-to-many",
        );
      }
    }
  }

  return options.sort((left, right) => left.label.localeCompare(right.label));
}

export function listQueryableFieldPaths(
  sourceDefinition: EntityCatalogEntry,
  catalog: readonly EntityCatalogEntry[],
): readonly QueryableFieldPathOption[] {
  const direct = listDirectQueryableFields(sourceDefinition);
  const relation = listRelationQueryableFields(sourceDefinition, catalog);
  return [...direct, ...relation];
}

export function resolveQueryableFieldMeta(
  sourceDefinition: EntityCatalogEntry,
  catalog: readonly EntityCatalogEntry[],
  fieldPath: string,
): QueryableFieldMeta | null {
  const trimmedPath = fieldPath.trim();
  if (!trimmedPath) {
    return null;
  }

  const relationPath = parseQueryableRelationPath(
    sourceDefinition,
    catalog,
    trimmedPath,
  );
  if (relationPath) {
    if (relationPath.kind === "many-to-one") {
      const targetDefinition = catalog.find(
        (entry) => entry.name === relationPath.targetEntity,
      );
      const meta = targetDefinition?.fields[relationPath.subField];
      if (!meta) {
        return null;
      }
      return {
        entityName: relationPath.targetEntity,
        fieldName: relationPath.subField,
        type: meta.type,
        ...(meta.enumValues ? { enumValues: meta.enumValues } : {}),
        relationPath,
      };
    }

    const childDefinition = catalog.find(
      (entry) => entry.name === relationPath.childEntity,
    );
    const meta = childDefinition?.fields[relationPath.subField];
    if (!meta) {
      return null;
    }
    return {
      entityName: relationPath.childEntity,
      fieldName: relationPath.subField,
      type: meta.type,
      ...(meta.enumValues ? { enumValues: meta.enumValues } : {}),
      relationPath,
    };
  }

  if (QUERYABLE_SYSTEM_FIELDS.has(trimmedPath)) {
    const type = trimmedPath === "createdAt" ? "date" : "string";
    return {
      entityName: sourceDefinition.name,
      fieldName: trimmedPath,
      type,
    };
  }

  const meta = sourceDefinition.fields[trimmedPath];
  if (!isQueryableFieldMeta(meta)) {
    return null;
  }

  return {
    entityName: sourceDefinition.name,
    fieldName: trimmedPath,
    type: meta.type,
    ...(meta.enumValues ? { enumValues: meta.enumValues } : {}),
  };
}
