import type { SerializableEntityDefinition } from "@repo/entities";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  isEntityFileReferenceWithDownload,
  type EntityFileDownloadTarget,
} from "../../lib/entity-file-client";
import { getEntityCellDisplayMeta } from "./resolve-entity-cell-value";
import { parseRelationFieldPath } from "./resolve-relation-field-path";

export function readEntityFileDownloadUrl(value: unknown): string | null {
  if (!isEntityFileReferenceWithDownload(value)) {
    return null;
  }

  if (typeof value.downloadUrl === "string" && value.downloadUrl.length > 0) {
    return value.downloadUrl;
  }

  return null;
}

function readFieldDefaultImageUrl(
  fieldMeta:
    | {
        readonly defaultImage?: {
          readonly downloadUrl?: string;
        };
      }
    | undefined,
): string | null {
  const defaultImage = fieldMeta?.defaultImage;
  if (
    defaultImage &&
    "downloadUrl" in defaultImage &&
    typeof defaultImage.downloadUrl === "string" &&
    defaultImage.downloadUrl.length > 0
  ) {
    return defaultImage.downloadUrl;
  }

  return null;
}

/** Default image from the field definition (`defaultImage`), not layout preview assets. */
export function resolveEntityLayoutFieldDefaultImageSrc(options: {
  readonly fieldPath: string;
  readonly definition: SerializableEntityDefinition;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
}): string | null {
  const trimmedPath = options.fieldPath.trim();
  if (!trimmedPath) {
    return null;
  }

  const parsed = parseRelationFieldPath(options.definition, trimmedPath);
  if (parsed) {
    const relationMeta =
      options.definition.fields[parsed.relationField]?.relation;

    if (relationMeta && options.getDefinition) {
      const targetDefinition = options.getDefinition(relationMeta.target);
      const targetFieldMeta = targetDefinition?.fields[parsed.subField];
      return readFieldDefaultImageUrl(targetFieldMeta);
    }
  }

  const rootField = trimmedPath.includes(".")
    ? (trimmedPath.split(".", 1)[0] ?? trimmedPath)
    : trimmedPath;

  return readFieldDefaultImageUrl(options.definition.fields[rootField]);
}

/** Default / field-level fallback when the record has no file to resolve. */
export function resolveEntityLayoutImagePlaceholderSrc(options: {
  readonly fieldPath: string;
  readonly definition: SerializableEntityDefinition;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
}): string | null {
  const trimmedPath = options.fieldPath.trim();
  const parsed = parseRelationFieldPath(options.definition, trimmedPath);
  if (parsed) {
    const relationMeta =
      options.definition.fields[parsed.relationField]?.relation;

    if (relationMeta && options.getDefinition) {
      const targetDefinition = options.getDefinition(relationMeta.target);
      const subField = parsed.subField;
      const targetFieldMeta = targetDefinition?.fields[subField];
      const defaultImageUrl = readFieldDefaultImageUrl(targetFieldMeta);
      if (defaultImageUrl) {
        return defaultImageUrl;
      }

      const subDisplayMeta = targetDefinition
        ? getEntityCellDisplayMeta(subField, targetDefinition)
        : {};
      if (subDisplayMeta.fallbackImageUrl) {
        return subDisplayMeta.fallbackImageUrl;
      }
    }
  }

  const rootField = trimmedPath.includes(".")
    ? (trimmedPath.split(".", 1)[0] ?? trimmedPath)
    : trimmedPath;

  return (
    getEntityCellDisplayMeta(rootField, options.definition).fallbackImageUrl ??
    null
  );
}

/** Inline URL on the record value, or null when a per-record file must be fetched. */
export function resolveEntityLayoutImageSrc(options: {
  readonly rawValue: unknown;
  readonly fieldPath: string;
  readonly definition: SerializableEntityDefinition;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
}): string | null {
  const directUrl = readEntityFileDownloadUrl(options.rawValue);
  if (directUrl) {
    return directUrl;
  }

  if (isEntityFileReferenceWithDownload(options.rawValue)) {
    return null;
  }

  return resolveEntityLayoutImagePlaceholderSrc({
    fieldPath: options.fieldPath,
    definition: options.definition,
    getDefinition: options.getDefinition,
  });
}

export function resolveEntityLayoutImageDownloadTarget(options: {
  readonly item: Record<string, unknown>;
  readonly fieldPath: string;
  readonly definition: SerializableEntityDefinition;
}): EntityFileDownloadTarget | null {
  const trimmedPath = options.fieldPath.trim();
  if (!trimmedPath) {
    return null;
  }

  const parsed = parseRelationFieldPath(options.definition, trimmedPath);
  if (parsed) {
    const { relationField, subField } = parsed;
    const relationMeta = options.definition.fields[relationField]?.relation;
    const foreignKey = options.item[relationField];
    if (
      !relationMeta ||
      typeof foreignKey !== "string" ||
      foreignKey.length === 0
    ) {
      return null;
    }

    return {
      entityName: relationMeta.target,
      recordId: foreignKey,
      fieldName: subField,
    };
  }

  const recordId = options.item.id;
  if (typeof recordId !== "string" || recordId.length === 0) {
    return null;
  }

  const fieldMeta = options.definition.fields[trimmedPath];
  if (fieldMeta?.type !== "image" && fieldMeta?.type !== "document") {
    return null;
  }

  return {
    entityName: options.definition.name,
    recordId,
    fieldName: trimmedPath,
  };
}
