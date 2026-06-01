import { useCallback, useRef, type ChangeEvent } from "react";

import { Button } from "../button/Button";
import { Text } from "../typography/Text";
import {
  createUploadId,
  DEFAULT_DOCUMENT_MAX_SIZE_BYTES,
  validateDocumentFile,
} from "./document-upload.utils";

export interface DocumentUploadLabels {
  readonly select?: string;
  readonly change?: string;
  readonly remove?: string;
}

export interface DocumentUploadProps {
  readonly fileName?: string | null;
  readonly downloadUrl?: string | null;
  readonly uploading?: boolean;
  readonly disabled?: boolean;
  readonly uploadId?: string;
  readonly maxSizeBytes?: number;
  readonly onUpload: (params: {
    readonly file: File;
    readonly uploadId: string;
  }) => void | Promise<void>;
  readonly onRemove?: () => void;
  readonly onError?: (message: string) => void;
  readonly labels?: DocumentUploadLabels;
}

const ACCEPT = "application/pdf";

export function DocumentUpload({
  fileName,
  downloadUrl,
  uploading = false,
  disabled = false,
  uploadId,
  maxSizeBytes = DEFAULT_DOCUMENT_MAX_SIZE_BYTES,
  onUpload,
  onRemove,
  onError,
  labels,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectLabel = labels?.select ?? "Select document";
  const changeLabel = labels?.change ?? "Change document";
  const removeLabel = labels?.remove ?? "Remove";

  const openFilePicker = useCallback(() => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  }, [disabled, uploading]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      const validationError = validateDocumentFile(file, maxSizeBytes);
      if (validationError) {
        onError?.(validationError);
        return;
      }

      const nextUploadId = uploadId ?? createUploadId();
      void (async () => {
        try {
          await onUpload({ file, uploadId: nextUploadId });
        } catch (error) {
          onError?.(
            error instanceof Error
              ? error.message
              : "Unable to upload document.",
          );
        }
      })();
    },
    [maxSizeBytes, onError, onUpload, uploadId],
  );

  const hasFile = Boolean(fileName?.trim());

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={handleFileChange}
      />

      {hasFile ? (
        <div className="border-border flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-sm underline"
            >
              {fileName}
            </a>
          ) : (
            <Text className="text-sm">{fileName}</Text>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={openFilePicker}
            >
              {changeLabel}
            </Button>
            {onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || uploading}
                onClick={onRemove}
              >
                {removeLabel}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={openFilePicker}
        >
          {uploading ? "Uploading…" : selectLabel}
        </Button>
      )}
    </div>
  );
}
