import type { CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SerializableEntityDefinition } from "@repo/entities";
import { CardFieldImage } from "@repo/ui";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { formatFieldLabel } from "../../entities/entity-catalog";
import {
  fetchEntityFileDownloadUrl,
  fetchEntityFileDownloadUrlByStoragePath,
  isEntityFileReferenceWithDownload,
} from "../../lib/entity-file-client";
import { parseLayoutStaticImageRef } from "../../lib/layout-static-image";
import { resolveEntityFieldRootName } from "./resolve-entity-field-path";
import { ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC } from "./entity-layout-image-placeholder.js";
import {
  readEntityLayoutImageSourceUrl,
  resolveEntityLayoutFieldDefaultImageSrc,
  resolveEntityLayoutImageDownloadTarget,
  resolveEntityLayoutImagePlaceholderSrc,
  shouldFetchEntityLayoutImageDownload,
} from "./resolve-entity-layout-image-src";

interface EntityLayoutImageFieldProps {
  readonly item: Record<string, unknown>;
  readonly fieldPath: string;
  readonly rawValue: unknown;
  readonly definition: SerializableEntityDefinition;
  readonly className?: string | undefined;
  readonly style?: CSSProperties;
  readonly imageSize?: number;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  /** Layout primary field; default image fallback uses this path, not resolved fallbacks. */
  readonly primaryFieldPath?: string;
  readonly usePreviewPlaceholder?: boolean;
}

export function EntityLayoutImageField({
  item,
  fieldPath,
  rawValue,
  definition,
  className,
  style,
  imageSize,
  getDefinition,
  primaryFieldPath,
  usePreviewPlaceholder = false,
}: EntityLayoutImageFieldProps) {
  const rootField = resolveEntityFieldRootName(fieldPath);
  const staticFileRef =
    typeof rawValue === "string" ? parseLayoutStaticImageRef(rawValue) : null;
  const directUrl = readEntityLayoutImageSourceUrl(rawValue);
  const downloadTarget =
    staticFileRef === null
      ? resolveEntityLayoutImageDownloadTarget({
          item,
          fieldPath,
          definition,
        })
      : null;
  const shouldFetchRecord =
    directUrl === null &&
    downloadTarget !== null &&
    shouldFetchEntityLayoutImageDownload({ item, fieldPath, rawValue });
  const shouldFetchStorage = directUrl === null && staticFileRef !== null;

  const defaultFieldPath = (primaryFieldPath ?? fieldPath).trim();
  const fieldDefaultSrc = resolveEntityLayoutFieldDefaultImageSrc({
    fieldPath: defaultFieldPath,
    definition,
    getDefinition,
  });

  const previewFallbackSrc =
    usePreviewPlaceholder && directUrl === null && !shouldFetchRecord
      ? resolveEntityLayoutImagePlaceholderSrc({
          fieldPath,
          definition,
          getDefinition,
        })
      : null;

  const downloadQuery = useQuery({
    queryKey: [
      "entity-file-download",
      downloadTarget?.entityName,
      downloadTarget?.recordId,
      downloadTarget?.fieldName,
    ],
    queryFn: () => fetchEntityFileDownloadUrl(downloadTarget!),
    enabled: shouldFetchRecord,
    staleTime: 5 * 60 * 1000,
  });

  const storageDownloadQuery = useQuery({
    queryKey: [
      "layout-static-image-download",
      definition.name,
      staticFileRef?.storagePath,
    ],
    queryFn: () =>
      fetchEntityFileDownloadUrlByStoragePath(
        definition.name,
        staticFileRef!.storagePath,
      ),
    enabled: shouldFetchStorage,
    staleTime: 5 * 60 * 1000,
  });

  const fileName =
    isEntityFileReferenceWithDownload(rawValue) && rawValue.fileName
      ? rawValue.fileName
      : formatFieldLabel(rootField, definition);

  const fetchedUrl =
    (shouldFetchRecord ? downloadQuery.data : null) ??
    (shouldFetchStorage ? storageDownloadQuery.data : null) ??
    null;

  const src = usePreviewPlaceholder
    ? (directUrl ??
      fetchedUrl ??
      previewFallbackSrc ??
      ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC)
    : (directUrl ?? fetchedUrl ?? fieldDefaultSrc ?? null);

  return (
    <CardFieldImage
      src={src}
      alt={fileName}
      className={className}
      style={style}
      sizePx={imageSize}
    />
  );
}
