import {
  isOneToManyRelationField,
  type SerializableEntityDefinition,
} from "@repo/entities";
import {
  formatFieldPathLabel,
  listLayoutFieldOptions,
  resolveLayoutFieldLeaf,
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
    | "enum"
    | "unknown";
  readonly displayFormat?: "currency" | "plain" | "percentage";
  readonly dateDisplayFormat?: "date" | "datetime" | "time" | "daysRemaining";
  readonly enumValues?: readonly string[];
}

export interface EntityCardViewAdapterResult {
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly fieldOptions: readonly string[];
}

export type EntityDefinitionLookup = (
  entityName: string,
) => SerializableEntityDefinition | undefined;

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
  return (
    resolveLayoutFieldLeaf(definition, path, getDefinition) != null ||
    path in definition.fields ||
    path === "createdAt" ||
    path === "updatedAt"
  );
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

function resolveValueTypeFromLeaf(
  leafDefinition: SerializableEntityDefinition,
  leafFieldName: string,
): FieldDescriptor["valueType"] {
  if (isImageField(leafDefinition, leafFieldName)) {
    return "image";
  }

  const meta = leafDefinition.fields[leafFieldName];
  if (meta?.type === "date") {
    return "date";
  }
  if (meta?.type === "number") {
    return "number";
  }
  if (meta?.type === "boolean") {
    return "boolean";
  }
  if (meta?.type === "string") {
    return "string";
  }
  if (meta?.type === "enum") {
    return "enum";
  }

  return "unknown";
}

function resolveEnumValuesFromLeaf(
  leafDefinition: SerializableEntityDefinition,
  leafFieldName: string,
): readonly string[] | undefined {
  const meta = leafDefinition.fields[leafFieldName];
  if (meta?.type !== "enum") {
    return undefined;
  }

  const values = meta.enumValues ?? [];
  return values.length > 0 ? values : undefined;
}

function resolveEnumValuesForPath(
  definition: SerializableEntityDefinition,
  path: string,
  getDefinition?: EntityDefinitionLookup,
): readonly string[] | undefined {
  const leaf = resolveLayoutFieldLeaf(definition, path, getDefinition);
  if (leaf) {
    return resolveEnumValuesFromLeaf(
      leaf.leafDefinition as SerializableEntityDefinition,
      leaf.leafFieldName,
    );
  }

  const meta = definition.fields[path];
  if (meta?.type !== "enum") {
    return undefined;
  }

  const values = meta.enumValues ?? [];
  return values.length > 0 ? values : undefined;
}

function resolveValueType(
  definition: SerializableEntityDefinition,
  path: string,
  getDefinition?: EntityDefinitionLookup,
): FieldDescriptor["valueType"] {
  const leaf = resolveLayoutFieldLeaf(definition, path, getDefinition);
  if (leaf) {
    if (
      leaf.leafFieldName === "createdAt" ||
      leaf.leafFieldName === "updatedAt"
    ) {
      return "date";
    }
    return resolveValueTypeFromLeaf(
      leaf.leafDefinition as SerializableEntityDefinition,
      leaf.leafFieldName,
    );
  }

  return "unknown";
}

function resolveDescriptorLabel(
  definition: SerializableEntityDefinition,
  path: string,
  getDefinition?: EntityDefinitionLookup,
): string {
  const leaf = resolveLayoutFieldLeaf(definition, path, getDefinition);
  if (!leaf || !leaf.pathPrefix) {
    return resolveFieldLabel(definition, path.trim());
  }

  const segments = leaf.pathPrefix.split(".");
  let currentDefinition = definition;
  const labels: string[] = [];

  for (const segment of segments) {
    for (const [fieldName, meta] of Object.entries(currentDefinition.fields)) {
      if (
        meta.relation &&
        (meta.relation.type === "many-to-one" ||
          meta.relation.type === "one-to-one") &&
        (fieldName === segment || meta.relation.target === segment)
      ) {
        const target = meta.relation.target;
        const targetDefinition =
          target && getDefinition ? getDefinition(target) : undefined;
        labels.push(
          resolveRelationTargetLabel(target ?? segment, targetDefinition),
        );
        if (targetDefinition) {
          currentDefinition = targetDefinition;
        }
        break;
      }

      if (
        isOneToManyRelationField(meta) &&
        (fieldName === segment || meta.relation?.target === segment)
      ) {
        const childEntity = meta.relation?.target ?? fieldName;
        const childDefinition = getDefinition?.(childEntity);
        labels.push(resolveRelationTargetLabel(childEntity, childDefinition));
        if (childDefinition) {
          currentDefinition = childDefinition;
        }
        break;
      }
    }
  }

  const leafDefinition = leaf.leafDefinition as SerializableEntityDefinition;
  labels.push(resolveFieldLabel(leafDefinition, leaf.leafFieldName));
  return labels.join(" ");
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
    const leaf = resolveLayoutFieldLeaf(definition, path, getDefinition);
    const leafDefinition = leaf?.leafDefinition as
      | SerializableEntityDefinition
      | undefined;
    const targetFieldUi =
      leafDefinition?.ui.fields?.[leaf?.leafFieldName ?? ""];
    const root = path.includes(".") ? path.split(".")[0]! : path;
    const fieldUi = definition.ui.fields?.[root];

    const enumValues = resolveEnumValuesForPath(
      definition,
      path,
      getDefinition,
    );

    return {
      path,
      label: resolveDescriptorLabel(definition, path, getDefinition),
      valueType: resolveValueType(definition, path, getDefinition),
      displayFormat: targetFieldUi?.displayFormat ?? fieldUi?.displayFormat,
      dateDisplayFormat:
        targetFieldUi?.dateDisplayFormat ?? fieldUi?.dateDisplayFormat,
      ...(enumValues ? { enumValues } : {}),
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
          field.valueType === "enum" ||
          field.valueType === "unknown",
      );
    case "metric-kpi":
    case "metric-derived-kpi":
      return descriptors;
    default:
      return descriptors;
  }
}
