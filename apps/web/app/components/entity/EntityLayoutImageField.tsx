import { useState, type CSSProperties, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SerializableEntityDefinition } from "@repo/entities";
import { CardFieldImage, PhotoExpandDialog } from "@repo/ui";
import { cn } from "@repo/theme/utils";

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
  resolveEntityLayoutImageStorageDownloadTarget,
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
  readonly fillContainer?: boolean;
  readonly objectFit?: "contain" | "cover" | "fill";
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  /** Layout primary field; default image fallback uses this path, not resolved fallbacks. */
  readonly primaryFieldPath?: string;
  readonly usePreviewPlaceholder?: boolean;
  /** When true, clicking the image opens a full-size preview modal. */
  readonly expandOnClick?: boolean;
}

function isExpandableImageSrc(
  src: string | null,
  expandOnClick: boolean,
): src is string {
  return (
    expandOnClick &&
    src !== null &&
    src.length > 0 &&
    src !== ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC
  );
}

export function EntityLayoutImageField({
  item,
  fieldPath,
  rawValue,
  definition,
  className,
  style,
  imageSize,
  fillContainer,
  objectFit,
  getDefinition,
  primaryFieldPath,
  usePreviewPlaceholder = false,
  expandOnClick = false,
}: EntityLayoutImageFieldProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
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
          getDefinition,
        })
      : null;
  const storageDownloadTarget =
    directUrl === null && staticFileRef === null
      ? resolveEntityLayoutImageStorageDownloadTarget({
          fieldPath,
          definition,
          rawValue,
          getDefinition,
        })
      : null;
  const shouldFetchRecord =
    directUrl === null &&
    downloadTarget !== null &&
    shouldFetchEntityLayoutImageDownload({
      item,
      fieldPath,
      rawValue,
      definition,
      getDefinition,
    });
  const shouldFetchStorage = directUrl === null && staticFileRef !== null;
  const shouldFetchEntityFileByStorage =
    directUrl === null &&
    storageDownloadTarget !== null &&
    downloadTarget === null;

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

  const entityFileStorageDownloadQuery = useQuery({
    queryKey: [
      "entity-file-storage-download",
      storageDownloadTarget?.entityName,
      storageDownloadTarget?.storagePath,
    ],
    queryFn: () =>
      fetchEntityFileDownloadUrlByStoragePath(
        storageDownloadTarget!.entityName,
        storageDownloadTarget!.storagePath,
      ),
    enabled: shouldFetchEntityFileByStorage,
    staleTime: 5 * 60 * 1000,
  });

  const fileName =
    isEntityFileReferenceWithDownload(rawValue) && rawValue.fileName
      ? rawValue.fileName
      : formatFieldLabel(rootField, definition);

  const fetchedUrl =
    (shouldFetchRecord ? downloadQuery.data : null) ??
    (shouldFetchStorage ? storageDownloadQuery.data : null) ??
    (shouldFetchEntityFileByStorage
      ? entityFileStorageDownloadQuery.data
      : null) ??
    null;

  const src = usePreviewPlaceholder
    ? (directUrl ??
      fetchedUrl ??
      previewFallbackSrc ??
      ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC)
    : (directUrl ?? fetchedUrl ?? fieldDefaultSrc ?? null);

  const canExpand = isExpandableImageSrc(src, expandOnClick);

  const handleExpandClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setPreviewOpen(true);
  };

  const image = (
    <CardFieldImage
      src={src}
      alt={fileName}
      className={canExpand ? undefined : className}
      style={canExpand ? undefined : style}
      sizePx={imageSize}
      fillContainer={fillContainer}
      objectFit={objectFit}
    />
  );

  return (
    <>
      {canExpand ? (
        <button
          type="button"
          className={cn(
            "hover:ring-primary/40 inline-flex shrink-0 cursor-zoom-in rounded-md border-0 bg-transparent p-0 hover:ring-2 focus-visible:ring-2 focus-visible:outline-none",
            className,
          )}
          style={style}
          aria-label={`View ${fileName}`}
          onClick={handleExpandClick}
        >
          {image}
        </button>
      ) : (
        image
      )}
      {canExpand ? (
        <PhotoExpandDialog
          open={previewOpen}
          imageUrl={src}
          alt={fileName}
          title={fileName}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}
