const ALLOWED_MIME_TYPES = new Set(["application/pdf"]);
export const DEFAULT_DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

function formatMaxSizeMb(maxSizeBytes: number): string {
  const mb = maxSizeBytes / (1024 * 1024);
  return Number.isInteger(mb) ? String(mb) : mb.toFixed(1);
}

export function validateDocumentFile(
  file: File,
  maxSizeBytes: number = DEFAULT_DOCUMENT_MAX_SIZE_BYTES,
): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Please choose a PDF document.";
  }
  if (file.size > maxSizeBytes) {
    return `Document must be ${formatMaxSizeMb(maxSizeBytes)} MB or smaller.`;
  }
  return null;
}

export { createUploadId } from "../photo-upload/photo-upload.utils.js";
