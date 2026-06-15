export const DEFAULT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const DEFAULT_DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_SIZE_BYTES_CAP = 50 * 1024 * 1024;

/** JSON body budget for base64 entity file uploads (cap + encoding overhead). */
export const MAX_ENTITY_FILE_UPLOAD_REQUEST_BODY_BYTES =
  Math.ceil(MAX_FILE_SIZE_BYTES_CAP * (4 / 3)) + 8192;

/** JSON body budget for base64 image uploads up to DEFAULT_IMAGE_MAX_SIZE_BYTES. */
export const MAX_IMAGE_UPLOAD_REQUEST_BODY_BYTES =
  Math.ceil(DEFAULT_IMAGE_MAX_SIZE_BYTES * (4 / 3)) + 8192;

export function resolveFileFieldMaxSizeBytes(
  type: "image" | "document",
  configured?: number,
): number {
  if (configured !== undefined && configured > 0) {
    return configured;
  }
  return type === "image"
    ? DEFAULT_IMAGE_MAX_SIZE_BYTES
    : DEFAULT_DOCUMENT_MAX_SIZE_BYTES;
}
