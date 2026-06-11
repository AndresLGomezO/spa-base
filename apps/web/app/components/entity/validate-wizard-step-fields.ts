import {
  collectLayoutInputFieldPaths,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";
import type { SerializableFieldMeta } from "@repo/entities";

export function fieldPathRoot(fieldPath: string): string {
  return fieldPath.includes(".")
    ? (fieldPath.split(".")[0] ?? fieldPath)
    : fieldPath;
}

function uniqueStepFieldRoots(stepLayout: UiLayoutDocument): readonly string[] {
  const roots: string[] = [];
  const seen = new Set<string>();
  for (const path of collectLayoutInputFieldPaths(stepLayout)) {
    const root = fieldPathRoot(path);
    if (seen.has(root)) {
      continue;
    }
    seen.add(root);
    roots.push(root);
  }
  return roots;
}

export function isEmptyRequiredFieldValue(
  field: SerializableFieldMeta,
  value: unknown,
): boolean {
  if (field.type === "boolean") {
    return value === null || value === undefined;
  }
  if (value === null || value === undefined || value === "") {
    return true;
  }
  if (field.isArray && Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

export function collectStepFieldErrors(options: {
  readonly stepLayout: UiLayoutDocument;
  readonly values: Record<string, unknown>;
  readonly definition: SerializableEntityDefinition;
  readonly formatRequiredMessage: (fieldName: string) => string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const root of uniqueStepFieldRoots(options.stepLayout)) {
    const field = options.definition.fields[root];
    if (!field?.required) {
      continue;
    }
    if (!isEmptyRequiredFieldValue(field, options.values[root])) {
      continue;
    }
    errors[root] = options.formatRequiredMessage(root);
  }

  return errors;
}

export function stepHasValidationErrors(
  stepLayout: UiLayoutDocument,
  errors: Readonly<Record<string, string | undefined>>,
): boolean {
  for (const root of uniqueStepFieldRoots(stepLayout)) {
    if (errors[root]) {
      return true;
    }
  }
  return false;
}

export function mergeFieldErrors(
  ...sources: ReadonlyArray<Readonly<Record<string, string | undefined>>>
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const source of sources) {
    for (const [fieldName, message] of Object.entries(source)) {
      if (message) {
        merged[fieldName] = message;
      }
    }
  }
  return merged;
}

export function omitFieldErrorsForStep(
  errors: Readonly<Record<string, string>>,
  stepLayout: UiLayoutDocument,
): Record<string, string> {
  const stepRoots = new Set(uniqueStepFieldRoots(stepLayout));
  const next: Record<string, string> = {};
  for (const [fieldName, message] of Object.entries(errors)) {
    if (!stepRoots.has(fieldName)) {
      next[fieldName] = message;
    }
  }
  return next;
}
