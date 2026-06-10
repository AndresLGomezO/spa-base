import type { FormLayout } from "@repo/entities";
import {
  isDocumentStoredField,
  isJoinCollectionRelationField,
  type SerializableEntityDefinition,
} from "@repo/entities";

import { fieldPathRoot } from "./validate-wizard-step-fields";

function uniqueFieldRootsFromSections(
  sections: FormLayout["sections"],
): readonly string[] {
  const roots: string[] = [];
  const seen = new Set<string>();
  for (const section of sections) {
    for (const fieldPath of section.fields) {
      const root = fieldPathRoot(fieldPath);
      if (seen.has(root)) {
        continue;
      }
      seen.add(root);
      roots.push(root);
    }
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
  sections: FormLayout["sections"],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const root of uniqueFieldRootsFromSections(sections)) {
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
