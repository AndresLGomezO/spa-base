import type { SerializableEntityDefinition } from "@repo/entities";
import { resolveLayoutFieldLeaf } from "@repo/ui-builder-core";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  isEntityFileReferenceWithDownload,
  type EntityFileDownloadTarget,
} from "../../lib/entity-file-client";
import {
  parseLayoutStaticImageRef,
  readLayoutStaticImageUrl,
} from "../../lib/layout-static-image";
import { getEntityCellDisplayMeta } from "./resolve-entity-cell-value";
import { resolveLayoutFieldRecord } from "./resolve-layout-field-leaf";
import type { RelationDefinitionLookup } from "./resolve-relation-field-path";

export function readEntityFileDownloadUrl(value: unknown): string | null {
  if (!isEntityFileReferenceWithDownload(value)) {
    return null;
  }

  if (typeof value.downloadUrl === "string" && value.downloadUrl.length > 0) {
    return value.downloadUrl;
  }

  return null;
}

/** Entity file download URL or a layout-configured static image URL string. */
export function readEntityLayoutImageSourceUrl(value: unknown): string | null {
  const fileUrl = readEntityFileDownloadUrl(value);
  if (fileUrl) {
    return fileUrl;
  }

  if (typeof value === "string") {
    const url = readLayoutStaticImageUrl(value);
    if (url) {
      return url;
    }
    if (parseLayoutStaticImageRef(value)) {
      return null;
    }
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

  const leaf = resolveLayoutFieldLeaf(
    options.definition,
    trimmedPath,
    options.getDefinition,
  );
  if (leaf) {
    const leafDefinition =
      options.getDefinition?.(leaf.leafEntityName) ??
      (leaf.leafDefinition as SerializableEntityDefinition);
    const targetFieldMeta = leafDefinition.fields[leaf.leafFieldName];
    return readFieldDefaultImageUrl(targetFieldMeta);
  }

  return readFieldDefaultImageUrl(options.definition.fields[trimmedPath]);
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
  const leaf = resolveLayoutFieldLeaf(
    options.definition,
    trimmedPath,
    options.getDefinition,
  );
  if (leaf) {
    const leafDefinition =
      options.getDefinition?.(leaf.leafEntityName) ??
      (leaf.leafDefinition as SerializableEntityDefinition);
    const targetFieldMeta = leafDefinition.fields[leaf.leafFieldName];
    const defaultImageUrl = readFieldDefaultImageUrl(targetFieldMeta);
    if (defaultImageUrl) {
      return defaultImageUrl;
    }

    const subDisplayMeta = getEntityCellDisplayMeta(
      leaf.leafFieldName,
      leaf.leafDefinition as SerializableEntityDefinition,
    );
    if (subDisplayMeta.fallbackImageUrl) {
      return subDisplayMeta.fallbackImageUrl;
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

/** True when the client should call `/api/entity-files/download` for this field value. */
export function shouldFetchEntityLayoutImageDownload(options: {
  readonly item: Record<string, unknown>;
  readonly fieldPath: string;
  readonly rawValue: unknown;
  readonly definition: SerializableEntityDefinition;
  readonly getDefinition?: RelationDefinitionLookup;
}): boolean {
  if (readEntityFileDownloadUrl(options.rawValue)) {
    return false;
  }

  if (isEntityFileReferenceWithDownload(options.rawValue)) {
    return true;
  }

  const trimmedPath = options.fieldPath.trim();
  if (!trimmedPath.includes(".")) {
    return false;
  }

  const resolved = resolveLayoutFieldRecord(
    options.item,
    options.definition,
    trimmedPath,
    options.getDefinition,
  );
  if (resolved) {
    const fieldValue = resolved.record[resolved.leaf.leafFieldName];
    if (readEntityFileDownloadUrl(fieldValue)) {
      return false;
    }
    return isEntityFileReferenceWithDownload(fieldValue);
  }

  const leaf = resolveLayoutFieldLeaf(
    options.definition,
    trimmedPath,
    options.getDefinition,
  );
  if (
    !leaf?.rootRelationField ||
    !canFetchUnpopulatedRelationImage(
      options.definition,
      leaf,
      options.getDefinition,
    )
  ) {
    return false;
  }

  const foreignKey = options.item[leaf.rootRelationField];
  return typeof foreignKey === "string" && foreignKey.length > 0;
}

export function resolveEntityLayoutImageStorageDownloadTarget(options: {
  readonly fieldPath: string;
  readonly definition: SerializableEntityDefinition;
  readonly rawValue: unknown;
  readonly getDefinition?: RelationDefinitionLookup;
}): { readonly entityName: string; readonly storagePath: string } | null {
  if (!isEntityFileReferenceWithDownload(options.rawValue)) {
    return null;
  }

  if (readEntityFileDownloadUrl(options.rawValue)) {
    return null;
  }

  const storagePath = options.rawValue.storagePath.trim();
  if (storagePath.length === 0) {
    return null;
  }

  const trimmedPath = options.fieldPath.trim();
  const leaf = resolveLayoutFieldLeaf(
    options.definition,
    trimmedPath,
    options.getDefinition,
  );
  if (leaf) {
    return {
      entityName: leaf.leafEntityName,
      storagePath,
    };
  }

  const rootField = trimmedPath.includes(".")
    ? (trimmedPath.split(".", 1)[0] ?? trimmedPath)
    : trimmedPath;
  const fieldMeta = options.definition.fields[rootField];
  if (fieldMeta?.type !== "image" && fieldMeta?.type !== "document") {
    return null;
  }

  return {
    entityName: options.definition.name,
    storagePath,
  };
}

function relationLeafFieldMeta(
  definition: SerializableEntityDefinition,
  relationField: string,
  leafFieldName: string,
  getDefinition?: RelationDefinitionLookup,
): SerializableEntityDefinition["fields"][string] | undefined {
  const targetEntity = definition.fields[relationField]?.relation?.target;
  if (!targetEntity) {
    return undefined;
  }

  const targetDefinition = getDefinition?.(targetEntity);
  return targetDefinition?.fields[leafFieldName];
}

function isFileImageFieldMeta(
  meta: SerializableEntityDefinition["fields"][string] | undefined,
): boolean {
  return meta?.type === "image" || meta?.type === "document";
}

function canFetchUnpopulatedRelationImage(
  definition: SerializableEntityDefinition,
  leaf: import("@repo/ui-builder-core").ResolvedLayoutFieldLeaf,
  getDefinition?: RelationDefinitionLookup,
): boolean {
  if (!leaf.rootRelationField) {
    return false;
  }

  if (leaf.pathPrefix.includes(".")) {
    return false;
  }

  if (!getDefinition) {
    return true;
  }

  return isFileImageFieldMeta(
    relationLeafFieldMeta(
      definition,
      leaf.rootRelationField,
      leaf.leafFieldName,
      getDefinition,
    ),
  );
}

export function resolveEntityLayoutImageDownloadTarget(options: {
  readonly item: Record<string, unknown>;
  readonly fieldPath: string;
  readonly definition: SerializableEntityDefinition;
  readonly getDefinition?: RelationDefinitionLookup;
}): EntityFileDownloadTarget | null {
  const trimmedPath = options.fieldPath.trim();
  if (!trimmedPath) {
    return null;
  }

  const resolved = resolveLayoutFieldRecord(
    options.item,
    options.definition,
    trimmedPath,
    options.getDefinition,
  );
  if (resolved) {
    const recordId = resolved.record.id;
    if (typeof recordId !== "string" || recordId.length === 0) {
      return null;
    }

    return {
      entityName: resolved.leaf.leafEntityName,
      recordId,
      fieldName: resolved.leaf.leafFieldName,
    };
  }

  const leaf = resolveLayoutFieldLeaf(
    options.definition,
    trimmedPath,
    options.getDefinition,
  );
  if (leaf?.rootRelationField) {
    if (
      !canFetchUnpopulatedRelationImage(
        options.definition,
        leaf,
        options.getDefinition,
      )
    ) {
      return null;
    }

    const foreignKey = options.item[leaf.rootRelationField];
    if (typeof foreignKey !== "string" || foreignKey.length === 0) {
      return null;
    }

    const relationMeta =
      options.definition.fields[leaf.rootRelationField]?.relation;
    if (!relationMeta) {
      return null;
    }

    return {
      entityName: relationMeta.target,
      recordId: foreignKey,
      fieldName: leaf.leafFieldName,
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
