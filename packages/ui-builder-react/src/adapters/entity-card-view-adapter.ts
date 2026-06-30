import {
  isOneToManyRelationField,
  type SerializableEntityDefinition,
} from "@repo/entities";
import {
  formatFieldPathLabel,
  listLayoutFieldOptions,
  type UiComponentKind,
} from "@repo/ui-builder-core";

export interface FieldDescriptor {
  readonly path: string;
  readonly label: string;
  readonly valueType:
    | "string"
    | "number"
    | "date"
    | "boolean"
    | "image"
    | "unknown";
  readonly displayFormat?: "currency" | "plain" | "percentage";
  readonly dateDisplayFormat?: "date" | "datetime" | "time";
}

export interface EntityCardViewAdapterResult {
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly fieldOptions: readonly string[];
}

export type EntityDefinitionLookup = (
  entityName: string,
) => SerializableEntityDefinition | undefined;

function resolveRelationFieldName(
  definition: SerializableEntityDefinition,
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

function resolveOneToManyRelationFieldName(
  definition: SerializableEntityDefinition,
  pathSegment: string,
): string | null {
  const segment = pathSegment.trim();
  if (!segment) {
    return null;
  }

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (!isOneToManyRelationField(meta)) {
      continue;
    }

    const targetEntity = meta.relation?.target;
    if (!targetEntity) {
      continue;
    }

    if (fieldName === segment || targetEntity === segment) {
      return fieldName;
    }
  }

  return null;
}

function parseRelationFieldPath(
  definition: SerializableEntityDefinition,
  fieldPath: string,
  getDefinition?: EntityDefinitionLookup,
): {
  readonly relationField: string;
  readonly subField: string;
  readonly relationKind: "many-to-one" | "one-to-one" | "one-to-many";
} | null {
  const trimmedPath = fieldPath.trim();
  if (!trimmedPath.includes(".")) {
    return null;
  }

  const [firstSegment, subField] = trimmedPath.split(".", 2);
  if (!firstSegment || !subField) {
    return null;
  }

  const relationField = resolveRelationFieldName(definition, firstSegment);
  if (relationField) {
    const relationKind = definition.fields[relationField]?.relation?.type;
    if (relationKind !== "many-to-one" && relationKind !== "one-to-one") {
      return null;
    }

    return { relationField, subField, relationKind };
  }

  const oneToManyField = resolveOneToManyRelationFieldName(
    definition,
    firstSegment,
  );
  if (!oneToManyField) {
    if (getDefinition) {
      const reverseChild = getDefinition(firstSegment);
      if (reverseChild && subField in reverseChild.fields) {
        for (const meta of Object.values(reverseChild.fields)) {
          if (
            meta.relation?.target === definition.name &&
            (meta.relation.type === "many-to-one" ||
              meta.relation.type === "one-to-one")
          ) {
            return {
              relationField: firstSegment,
              subField,
              relationKind: "one-to-many",
            };
          }
        }
      }
    }

    return null;
  }

  const childEntity = definition.fields[oneToManyField]?.relation?.target;
  if (childEntity && getDefinition) {
    const childDefinition = getDefinition(childEntity);
    if (childDefinition && !(subField in childDefinition.fields)) {
      return null;
    }
  }

  return {
    relationField: oneToManyField,
    subField,
    relationKind: "one-to-many",
  };
}

function isImageField(
  definition: SerializableEntityDefinition,
  fieldName: string,
): boolean {
  const meta = definition.fields[fieldName];
  if (meta?.type === "image") {
    return true;
  }

  return definition.ui.fields?.[fieldName]?.component === "image";
}

function resolveFieldLabel(
  definition: SerializableEntityDefinition,
  fieldName: string,
): string {
  const uiLabel = definition.ui.fields?.[fieldName]?.label;
  if (uiLabel) {
    return uiLabel;
  }

  return formatFieldPathLabel(fieldName);
}

function resolveRelationTargetLabel(
  targetEntityName: string,
  targetDefinition?: SerializableEntityDefinition,
): string {
  if (targetDefinition?.ui.nav?.label) {
    return formatFieldPathLabel(targetEntityName);
  }

  return formatFieldPathLabel(targetEntityName);
}

function isValidLayoutFieldPathForAdapter(
  definition: SerializableEntityDefinition,
  path: string,
  getDefinition?: EntityDefinitionLookup,
): boolean {
  const parsed = parseRelationFieldPath(definition, path, getDefinition);
  if (!parsed) {
    return (
      path in definition.fields || path === "createdAt" || path === "updatedAt"
    );
  }

  if (parsed.relationKind === "one-to-many") {
    const childEntity =
      definition.fields[parsed.relationField]?.relation?.target ??
      parsed.relationField;
    const childDefinition = getDefinition?.(childEntity);
    if (!childDefinition) {
      return true;
    }
    return parsed.subField in childDefinition.fields;
  }

  const target = definition.fields[parsed.relationField]?.relation?.target;
  if (!target) {
    return false;
  }

  const targetDefinition = getDefinition?.(target);
  if (!targetDefinition) {
    return false;
  }

  return parsed.subField in targetDefinition.fields;
}

function collectLayoutFieldPaths(
  definition: SerializableEntityDefinition,
  getDefinition?: EntityDefinitionLookup,
  catalog?: readonly SerializableEntityDefinition[],
): readonly string[] {
  const options = new Set<string>();

  for (const path of listLayoutFieldOptions(definition, {
    resolveTarget: (target) => getDefinition?.(target),
    catalog,
  })) {
    if (isValidLayoutFieldPathForAdapter(definition, path, getDefinition)) {
      options.add(path);
    }
  }

  for (const [fieldName] of Object.entries(definition.fields)) {
    if (isImageField(definition, fieldName)) {
      options.add(fieldName);
    }
  }

  return [...options].sort((a, b) => a.localeCompare(b));
}

function resolveValueType(
  definition: SerializableEntityDefinition,
  path: string,
  getDefinition?: EntityDefinitionLookup,
): FieldDescriptor["valueType"] {
  const parsed = parseRelationFieldPath(definition, path, getDefinition);
  if (parsed) {
    if (parsed.relationKind === "one-to-many") {
      const childEntity =
        definition.fields[parsed.relationField]?.relation?.target ??
        parsed.relationField;
      const childDefinition = getDefinition?.(childEntity);

      if (childDefinition) {
        if (isImageField(childDefinition, parsed.subField)) {
          return "image";
        }
        const subMeta = childDefinition.fields[parsed.subField];
        if (subMeta?.type === "date") {
          return "date";
        }
        if (subMeta?.type === "number") {
          return "number";
        }
        if (subMeta?.type === "boolean") {
          return "boolean";
        }
        if (subMeta?.type === "string") {
          return "string";
        }
      }

      return "unknown";
    }

    const relationMeta = definition.fields[parsed.relationField]?.relation;
    const targetDefinition =
      relationMeta?.target && getDefinition
        ? getDefinition(relationMeta.target)
        : undefined;

    if (targetDefinition) {
      if (isImageField(targetDefinition, parsed.subField)) {
        return "image";
      }
      const subMeta = targetDefinition.fields[parsed.subField];
      if (subMeta?.type === "date") {
        return "date";
      }
      if (subMeta?.type === "number") {
        return "number";
      }
      if (subMeta?.type === "boolean") {
        return "boolean";
      }
      if (subMeta?.type === "string") {
        return "string";
      }
    }

    return "unknown";
  }

  const root = path.includes(".") ? path.split(".")[0]! : path;
  const meta = definition.fields[root];
  if (!meta) {
    if (path === "createdAt" || path === "updatedAt") {
      return "date";
    }
    return "unknown";
  }

  if (isImageField(definition, root)) {
    return "image";
  }
  if (meta.type === "date") {
    return "date";
  }
  if (meta.type === "number") {
    return "number";
  }
  if (meta.type === "boolean") {
    return "boolean";
  }
  return "string";
}

function resolveDescriptorLabel(
  definition: SerializableEntityDefinition,
  path: string,
  getDefinition?: EntityDefinitionLookup,
): string {
  const parsed = parseRelationFieldPath(definition, path, getDefinition);
  if (parsed) {
    if (parsed.relationKind === "one-to-many") {
      const childEntity =
        definition.fields[parsed.relationField]?.relation?.target ??
        parsed.relationField;
      const childDefinition = getDefinition?.(childEntity);
      const subLabel = childDefinition
        ? resolveFieldLabel(childDefinition, parsed.subField)
        : formatFieldPathLabel(parsed.subField);

      return `${resolveRelationTargetLabel(childEntity, childDefinition)} ${subLabel}`;
    }

    const target = definition.fields[parsed.relationField]?.relation?.target;
    const targetDefinition =
      target && getDefinition ? getDefinition(target) : undefined;
    const subLabel = targetDefinition
      ? resolveFieldLabel(targetDefinition, parsed.subField)
      : formatFieldPathLabel(parsed.subField);

    if (target) {
      return `${resolveRelationTargetLabel(target, targetDefinition)} ${subLabel}`;
    }

    return subLabel;
  }

  return resolveFieldLabel(definition, path.trim());
}

export function entityCardViewAdapter(
  definition: SerializableEntityDefinition,
  getDefinition?: EntityDefinitionLookup,
  catalog?: readonly SerializableEntityDefinition[],
): EntityCardViewAdapterResult {
  const fieldOptions = collectLayoutFieldPaths(
    definition,
    getDefinition,
    catalog,
  );

  const fieldDescriptors: FieldDescriptor[] = fieldOptions.map((path) => {
    const root = path.includes(".") ? path.split(".")[0]! : path;
    const fieldUi = definition.ui.fields?.[root];
    const parsed = parseRelationFieldPath(definition, path, getDefinition);
    const targetDefinition =
      parsed && getDefinition
        ? parsed.relationKind === "one-to-many"
          ? getDefinition(
              definition.fields[parsed.relationField]?.relation?.target ??
                parsed.relationField,
            )
          : getDefinition(
              definition.fields[parsed.relationField]?.relation?.target ?? "",
            )
        : undefined;
    const targetFieldUi = parsed
      ? targetDefinition?.ui.fields?.[parsed.subField]
      : undefined;

    return {
      path,
      label: resolveDescriptorLabel(definition, path, getDefinition),
      valueType: resolveValueType(definition, path, getDefinition),
      displayFormat: targetFieldUi?.displayFormat ?? fieldUi?.displayFormat,
      dateDisplayFormat:
        targetFieldUi?.dateDisplayFormat ?? fieldUi?.dateDisplayFormat,
    };
  });

  return { fieldDescriptors, fieldOptions };
}

export function filterFieldsForComponentKind(
  descriptors: readonly FieldDescriptor[],
  kind: UiComponentKind,
): readonly FieldDescriptor[] {
  switch (kind) {
    case "image":
      return descriptors.filter((field) => field.valueType === "image");
    case "date":
      return descriptors.filter((field) => field.valueType === "date");
    case "numeric":
      return descriptors.filter((field) => field.valueType === "number");
    case "text":
    case "badge":
      return descriptors.filter(
        (field) =>
          field.valueType === "string" ||
          field.valueType === "number" ||
          field.valueType === "boolean" ||
          field.valueType === "unknown",
      );
    case "metric-kpi":
    case "metric-derived-kpi":
      return descriptors;
    default:
      return descriptors;
  }
}
