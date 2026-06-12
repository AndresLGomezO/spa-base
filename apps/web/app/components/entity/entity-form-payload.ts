import {
  isDocumentStoredField,
  isJoinCollectionRelationField,
  type SerializableEntityDefinition,
} from "@repo/entities";

import { fieldPathRoot } from "./validate-wizard-step-fields";
import { isFormDisplayCacheKey } from "./form-relation-display-cache";

function uniqueFieldRoots(fieldPaths: readonly string[]): readonly string[] {
  const roots: string[] = [];
  const seen = new Set<string>();
  for (const fieldPath of fieldPaths) {
    const root = fieldPathRoot(fieldPath);
    if (seen.has(root)) {
      continue;
    }
    seen.add(root);
    roots.push(root);
  }
  return roots;
}

function isEmptySubmitValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

export function buildFormSubmitValues(
  fieldPaths: readonly string[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const root of uniqueFieldRoots(fieldPaths)) {
    if (isFormDisplayCacheKey(root)) {
      continue;
    }
    if (!(root in values)) {
      continue;
    }
    const value = values[root];
    if (isEmptySubmitValue(value)) {
      continue;
    }
    payload[root] = value;
  }
  return payload;
}

export function getJoinRelationFieldNames(
  definition: SerializableEntityDefinition,
): readonly string[] {
  return Object.entries(definition.fields)
    .filter(([, meta]) => isJoinCollectionRelationField(meta))
    .map(([fieldName]) => fieldName);
}

export function splitEntityFormPayload(
  definition: SerializableEntityDefinition,
  values: Record<string, unknown>,
): {
  readonly documentPayload: Record<string, unknown>;
  readonly joinRelations: Record<string, readonly string[]>;
} {
  const documentPayload: Record<string, unknown> = {};
  const joinRelations: Record<string, readonly string[]> = {};

  for (const [fieldName, value] of Object.entries(values)) {
    if (isFormDisplayCacheKey(fieldName)) {
      continue;
    }
    const meta = definition.fields[fieldName];
    if (!meta) {
      continue;
    }

    if (isJoinCollectionRelationField(meta)) {
      joinRelations[fieldName] = Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : [];
      continue;
    }

    if (!isDocumentStoredField(meta)) {
      continue;
    }

    documentPayload[fieldName] = value;
  }

  return { documentPayload, joinRelations };
}
