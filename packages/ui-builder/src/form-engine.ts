import type { FormLayout, SerializableEntityDefinition } from "@repo/entities";

export function resolveCreateForm(
  definition: SerializableEntityDefinition,
): FormLayout {
  return definition.ui.forms.create;
}

export function resolveEditForm(
  definition: SerializableEntityDefinition,
): FormLayout {
  return definition.ui.forms.edit;
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
