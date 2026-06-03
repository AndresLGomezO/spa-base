import { useQuery } from "@tanstack/react-query";
import type { SerializableEntityDefinition } from "@repo/entities";
import { CardFieldImage } from "@repo/ui";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { formatFieldLabel } from "../../entities/entity-catalog";
import {
  fetchEntityFileDownloadUrl,
  isEntityFileReferenceWithDownload,
} from "../../lib/entity-file-client";
import { resolveEntityFieldRootName } from "./resolve-entity-field-path";
import { ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC } from "./entity-layout-image-placeholder.js";
import {
  readEntityFileDownloadUrl,
  resolveEntityLayoutFieldDefaultImageSrc,
  resolveEntityLayoutImageDownloadTarget,
  resolveEntityLayoutImagePlaceholderSrc,
} from "./resolve-entity-layout-image-src";

interface EntityLayoutImageFieldProps {
  readonly item: Record<string, unknown>;
  readonly fieldPath: string;
  readonly rawValue: unknown;
  readonly definition: SerializableEntityDefinition;
  readonly className?: string | undefined;
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
  imageSize,
  getDefinition,
  primaryFieldPath,
  usePreviewPlaceholder = false,
}: EntityLayoutImageFieldProps) {
  const rootField = resolveEntityFieldRootName(fieldPath);
  const directUrl = readEntityFileDownloadUrl(rawValue);
  const downloadTarget = resolveEntityLayoutImageDownloadTarget({
    item,
    fieldPath,
    definition,
  });
  const shouldFetch = directUrl === null && downloadTarget !== null;

  const defaultFieldPath = (primaryFieldPath ?? fieldPath).trim();
  const fieldDefaultSrc = resolveEntityLayoutFieldDefaultImageSrc({
    fieldPath: defaultFieldPath,
    definition,
    getDefinition,
  });

  const previewFallbackSrc =
    usePreviewPlaceholder && directUrl === null && !shouldFetch
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
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
  });

  const fileName =
    isEntityFileReferenceWithDownload(rawValue) && rawValue.fileName
      ? rawValue.fileName
      : formatFieldLabel(rootField, definition);

  const src = usePreviewPlaceholder
    ? (directUrl ??
      (shouldFetch ? downloadQuery.data : null) ??
      previewFallbackSrc ??
      ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC)
    : (directUrl ??
      (shouldFetch ? downloadQuery.data : null) ??
      fieldDefaultSrc ??
      null);

  return (
    <CardFieldImage
      src={src}
      alt={fileName}
      className={className}
      sizePx={imageSize}
    />
  );
}
