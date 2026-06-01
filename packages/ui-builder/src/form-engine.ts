import type { FormLayout, SerializableEntityDefinition } from "@repo/entities";

import { augmentFormLayoutWithFieldNames } from "./form-layout-sync.js";

function resolveFormLayout(
  definition: SerializableEntityDefinition,
  mode: "create" | "edit",
): FormLayout {
  const layout =
    mode === "create" ? definition.ui.forms.create : definition.ui.forms.edit;
  return augmentFormLayoutWithFieldNames(
    layout,
    Object.keys(definition.fields),
  );
}

export function resolveCreateForm(
  definition: SerializableEntityDefinition,
): FormLayout {
  return resolveFormLayout(definition, "create");
}

export function resolveEditForm(
  definition: SerializableEntityDefinition,
): FormLayout {
  return resolveFormLayout(definition, "edit");
}

export function buildInitialValues(
  definition: SerializableEntityDefinition,
  mode: "create" | "edit",
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const layout =
    mode === "create"
      ? resolveCreateForm(definition)
      : resolveEditForm(definition);
  const values: Record<string, unknown> = { ...(existing ?? {}) };

  for (const section of layout.sections) {
    for (const fieldName of section.fields) {
      if (values[fieldName] !== undefined) continue;
      const meta = definition.fields[fieldName];
      if (!meta) continue;
      if (meta.default !== undefined) {
        values[fieldName] = meta.default;
      } else if (meta.type === "boolean") {
        values[fieldName] = false;
      } else if (meta.type === "number") {
        values[fieldName] = "";
      } else {
        values[fieldName] = "";
      }
    }
  }

  return values;
}
