import { collectLayoutInputFieldPaths } from "@repo/ui-builder-core";

import type { SerializableEntityDefinition } from "./types.js";
import { resolvePlainFormLayout } from "./resolve-form-config.js";

function fieldPathRoot(fieldPath: string): string {
  const dotIndex = fieldPath.indexOf(".");
  return dotIndex === -1 ? fieldPath : fieldPath.slice(0, dotIndex);
}

function applyFieldDefault(
  definition: SerializableEntityDefinition,
  fieldName: string,
  values: Record<string, unknown>,
): void {
  if (values[fieldName] !== undefined) {
    return;
  }

  const meta = definition.fields[fieldName];
  if (!meta) {
    return;
  }

  if (meta.default !== undefined) {
    values[fieldName] = meta.default;
  } else if (meta.isArray) {
    values[fieldName] = [];
  } else if (meta.type === "boolean") {
    values[fieldName] = false;
  } else if (meta.type === "number") {
    values[fieldName] = "";
  } else {
    values[fieldName] = "";
  }
}

export function buildInitialValuesFromLayout(
  definition: SerializableEntityDefinition,
  mode: "create" | "edit",
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  void mode;
  const layout = resolvePlainFormLayout(definition);
  const values: Record<string, unknown> = { ...(existing ?? {}) };
  const seenRoots = new Set<string>();

  for (const fieldPath of collectLayoutInputFieldPaths(layout)) {
    const root = fieldPathRoot(fieldPath);
    if (seenRoots.has(root)) {
      continue;
    }
    seenRoots.add(root);
    applyFieldDefault(definition, root, values);
  }

  return values;
}
