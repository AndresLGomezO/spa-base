import type { EntityFileReference } from "./schema/entityFileReference.js";
import { LAYOUT_STATIC_IMAGE_FIELD_NAME } from "./layout-static-image-field.js";

export { LAYOUT_STATIC_IMAGE_FIELD_NAME };

type LayoutStaticImageRef = EntityFileReference & {
  readonly downloadUrl?: string;
};

function isLayoutStaticImageRefShape(
  value: unknown,
): value is LayoutStaticImageRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "storagePath" in value &&
    typeof (value as EntityFileReference).storagePath === "string" &&
    "fileName" in value &&
    typeof (value as EntityFileReference).fileName === "string" &&
    "contentType" in value &&
    typeof (value as EntityFileReference).contentType === "string"
  );
}

export function serializeLayoutStaticImageRef(
  file: EntityFileReference & { readonly downloadUrl?: string },
): string {
  return JSON.stringify({
    storagePath: file.storagePath,
    fileName: file.fileName,
    contentType: file.contentType,
    ...(file.downloadUrl ? { downloadUrl: file.downloadUrl } : {}),
  });
}

export function parseLayoutStaticImageRef(
  value: string,
): EntityFileReference | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isLayoutStaticImageRefShape(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function readLayoutStaticImageUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const ref = parseLayoutStaticImageRef(trimmed);
  if (ref) {
    const downloadUrl = (ref as EntityFileReference & { downloadUrl?: string })
      .downloadUrl;
    if (typeof downloadUrl === "string" && downloadUrl.length > 0) {
      return downloadUrl;
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function resolveStaticImageSrc(rawValue: unknown): string | undefined {
  if (rawValue === null || rawValue === undefined) {
    return undefined;
  }

  if (typeof rawValue === "object") {
    if ("downloadUrl" in rawValue) {
      const downloadUrl = (rawValue as { downloadUrl?: unknown }).downloadUrl;
      if (typeof downloadUrl === "string" && downloadUrl.trim().length > 0) {
        return downloadUrl.trim();
      }
    }
    return undefined;
  }

  if (typeof rawValue === "string") {
    return readLayoutStaticImageUrl(rawValue) ?? undefined;
  }

  return undefined;
}

export function findFirstImageFieldName(
  fields: Readonly<Record<string, { readonly type?: string }>>,
): string | undefined {
  return Object.keys(fields).find((name) => fields[name]?.type === "image");
}

export function resolveLayoutStaticUploadFieldName(
  fields: Readonly<Record<string, { readonly type?: string }>>,
): string {
  return findFirstImageFieldName(fields) ?? LAYOUT_STATIC_IMAGE_FIELD_NAME;
}
