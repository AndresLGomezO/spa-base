import type { SerializableEntityDefinition } from "@repo/entities";
import { formatFieldPathLabel } from "@repo/ui-builder-core";

import type { FieldDescriptor } from "./adapters/entity-card-view-adapter.js";

function resolveFieldLabel(
  definition: SerializableEntityDefinition,
  fieldName: string,
): string {
  return (
    definition.ui.fields?.[fieldName]?.label ?? formatFieldPathLabel(fieldName)
  );
}

/** Ensures root id and relation FK fields are available as prefill sources. */
export function listCreateFormPrefillSourceFieldDescriptors(
  definition: SerializableEntityDefinition,
  fieldDescriptors: readonly FieldDescriptor[],
): readonly FieldDescriptor[] {
  const byPath = new Map<string, FieldDescriptor>();

  for (const descriptor of fieldDescriptors) {
    byPath.set(descriptor.path, descriptor);
  }

  const ensureField = (path: string) => {
    if (byPath.has(path)) {
      return;
    }

    byPath.set(path, {
      path,
      label: resolveFieldLabel(definition, path),
      valueType: "string",
    });
  };

  ensureField("id");

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (
      meta.relation &&
      (meta.relation.type === "many-to-one" ||
        meta.relation.type === "one-to-one")
    ) {
      ensureField(fieldName);
      continue;
    }

    if (meta.type === "enum") {
      if (!byPath.has(fieldName)) {
        const enumValues = meta.enumValues ?? [];
        byPath.set(fieldName, {
          path: fieldName,
          label: resolveFieldLabel(definition, fieldName),
          valueType: "enum",
          ...(enumValues.length > 0 ? { enumValues } : {}),
        });
      }
    }
  }

  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}
