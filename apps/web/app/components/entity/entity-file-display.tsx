import type { ReactNode } from "react";

import { ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC } from "./entity-layout-image-placeholder.js";

export interface EntityFileDisplayValue {
  readonly fileName: string;
  readonly downloadUrl?: string;
}

export function readEntityFileDisplayValue(
  value: unknown,
): EntityFileDisplayValue | null {
  if (typeof value !== "object" || value === null || !("fileName" in value)) {
    return null;
  }
  const fileName = (value as { fileName: unknown }).fileName;
  if (typeof fileName !== "string" || fileName.trim().length === 0) {
    return null;
  }
  const downloadUrl =
    "downloadUrl" in value &&
    typeof (value as { downloadUrl: unknown }).downloadUrl === "string" &&
    (value as { downloadUrl: string }).downloadUrl.length > 0
      ? (value as { downloadUrl: string }).downloadUrl
      : undefined;
  return { fileName, downloadUrl };
}

export function renderEntityDocumentLink(value: unknown): ReactNode {
  const file = readEntityFileDisplayValue(value);
  if (!file) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (file.downloadUrl) {
    return (
      <a
        href={file.downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline"
      >
        {file.fileName}
      </a>
    );
  }
  return <span>{file.fileName}</span>;
}

export function resolveEntityDetailImagePlaceholderSrc(): string {
  return ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC;
}
