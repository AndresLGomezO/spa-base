import type {
  CardFieldSlotComponentType,
  SerializableEntityDefinition,
} from "@repo/entities";

import { isEntityFileReferenceWithDownload } from "../../lib/entity-file-client";
import { resolveEntityFieldPath } from "./resolve-entity-field-path";
import {
  readEntityFileDownloadUrl,
  resolveEntityLayoutImageDownloadTarget,
} from "./resolve-entity-layout-image-src";

export interface ResolvedLayoutFieldBinding {
  readonly fieldPath: string;
  readonly rawValue: unknown;
}

export function listLayoutBindingFieldPaths(
  fieldPath: string,
  fallbackFieldPaths?: readonly string[],
): readonly string[] {
  const paths: string[] = [];
  const primary = fieldPath.trim();
  if (primary.length > 0) {
    paths.push(primary);
  }

  for (const fallback of fallbackFieldPaths ?? []) {
    const trimmed = fallback.trim();
    if (trimmed.length > 0 && !paths.includes(trimmed)) {
      paths.push(trimmed);
    }
  }

  return paths;
}

function isGenericFieldValuePresent(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

function isImageFieldValuePresent(options: {
  readonly item: Record<string, unknown>;
  readonly fieldPath: string;
  readonly rawValue: unknown;
  readonly definition: SerializableEntityDefinition;
}): boolean {
  if (readEntityFileDownloadUrl(options.rawValue)) {
    return true;
  }

  if (isEntityFileReferenceWithDownload(options.rawValue)) {
    return true;
  }

  return (
    resolveEntityLayoutImageDownloadTarget({
      item: options.item,
      fieldPath: options.fieldPath,
      definition: options.definition,
    }) !== null
  );
}

export function isLayoutFieldValuePresent(options: {
  readonly item: Record<string, unknown>;
  readonly fieldPath: string;
  readonly rawValue: unknown;
  readonly component: CardFieldSlotComponentType;
  readonly definition: SerializableEntityDefinition;
}): boolean {
  if (options.component === "image") {
    return isImageFieldValuePresent(options);
  }

  return isGenericFieldValuePresent(options.rawValue);
}

export function resolveLayoutFieldBinding(options: {
  readonly item: Record<string, unknown>;
  readonly fieldPath: string;
  readonly fallbackFieldPaths?: readonly string[];
  readonly component: CardFieldSlotComponentType;
  readonly definition: SerializableEntityDefinition;
  readonly getOneToManyCellValue: (
    recordId: string,
    columnName: string,
  ) => string | null;
}): ResolvedLayoutFieldBinding {
  const paths = listLayoutBindingFieldPaths(
    options.fieldPath,
    options.fallbackFieldPaths,
  );

  if (paths.length === 0) {
    return { fieldPath: options.fieldPath, rawValue: null };
  }

  for (const fieldPath of paths) {
    const rawValue = resolveEntityFieldPath(
      options.item,
      fieldPath,
      options.definition,
      options.getOneToManyCellValue,
    );

    if (
      isLayoutFieldValuePresent({
        item: options.item,
        fieldPath,
        rawValue,
        component: options.component,
        definition: options.definition,
      })
    ) {
      return { fieldPath, rawValue };
    }
  }

  const lastPath = paths[paths.length - 1]!;
  return {
    fieldPath: lastPath,
    rawValue: resolveEntityFieldPath(
      options.item,
      lastPath,
      options.definition,
      options.getOneToManyCellValue,
    ),
  };
}
