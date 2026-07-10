import type { SerializableEntityDefinition } from "@repo/entities";
import {
  formatFieldPathLabel,
  listEntityFieldSelectorFieldOptions,
  listFormFieldOptions,
} from "@repo/ui-builder-core";

import type {
  EntityCardViewAdapterResult,
  FieldDescriptor,
} from "./entity-card-view-adapter.js";

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

function resolveFormValueType(
  meta: SerializableEntityDefinition["fields"][string],
): FieldDescriptor["valueType"] {
  if (meta.type === "image") {
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
  if (meta.type === "enum") {
    return "enum";
  }
  if (meta.type === "relation") {
    return "string";
  }
  return "string";
}

/** Form designer field list: direct entity fields (includes relation FKs). */
export function entityFormFieldAdapter(
  definition: SerializableEntityDefinition,
): EntityCardViewAdapterResult {
  const fieldOptions = listFormFieldOptions(definition);

  const fieldDescriptors: FieldDescriptor[] = fieldOptions.map((path) => {
    const meta = definition.fields[path];
    const fieldUi = definition.ui.fields?.[path];

    const enumValues =
      meta?.type === "enum" && meta.enumValues && meta.enumValues.length > 0
        ? meta.enumValues
        : undefined;

    return {
      path,
      label: resolveFieldLabel(definition, path),
      valueType: meta ? resolveFormValueType(meta) : "unknown",
      displayFormat: fieldUi?.displayFormat,
      dateDisplayFormat: fieldUi?.dateDisplayFormat,
      ...(enumValues ? { enumValues } : {}),
    };
  });

  return { fieldDescriptors, fieldOptions };
}

/** Form designer field list for entity-field-selector slots (relation + enum). */
export function entityFieldSelectorFieldAdapter(
  definition: SerializableEntityDefinition,
): EntityCardViewAdapterResult {
  const fieldOptions = listEntityFieldSelectorFieldOptions(definition);

  const fieldDescriptors: FieldDescriptor[] = fieldOptions.map((path) => {
    const meta = definition.fields[path];
    const fieldUi = definition.ui.fields?.[path];

    const enumValues =
      meta?.type === "enum" && meta.enumValues && meta.enumValues.length > 0
        ? meta.enumValues
        : undefined;

    return {
      path,
      label: resolveFieldLabel(definition, path),
      valueType: meta ? resolveFormValueType(meta) : "unknown",
      displayFormat: fieldUi?.displayFormat,
      dateDisplayFormat: fieldUi?.dateDisplayFormat,
      ...(enumValues ? { enumValues } : {}),
    };
  });

  return { fieldDescriptors, fieldOptions };
}
