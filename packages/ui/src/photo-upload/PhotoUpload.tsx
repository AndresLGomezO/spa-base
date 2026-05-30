import { useCallback, useRef, useState, type ChangeEvent } from "react";

import { PhotoCropDialog, type PhotoCropShape } from "./PhotoCropDialog";
import { PhotoExpandDialog } from "./PhotoExpandDialog";
import { PhotoUploadPreview } from "./PhotoUploadPreview";
import { createUploadId, validateFile } from "./photo-upload.utils";

export interface PhotoUploadLabels {
  readonly select?: string;
  readonly change?: string;
  readonly cropTitle?: string;
  readonly cropDescription?: string;
  readonly upload?: string;
  readonly cancel?: string;
  readonly reset?: string;
  readonly expand?: string;
}

export interface PhotoUploadProps {
  readonly value?: string | null;
  readonly alt: string;
  readonly uploading?: boolean;
  readonly disabled?: boolean;
  readonly cropShape?: PhotoCropShape;
  readonly previewClassName?: string;
  readonly uploadId?: string;
  readonly onUpload: (params: {
    readonly file: File;
    readonly uploadId: string;
  }) => void | Promise<void>;
  readonly onError?: (message: string) => void;
  readonly labels?: PhotoUploadLabels;
}

const ACCEPT = "image/jpeg,image/png,image/webp";

export function PhotoUpload({
  value,
  alt,
  uploading = false,
  disabled = false,
  cropShape = "rect",
  previewClassName,
  uploadId,
  onUpload,
  onError,
  labels,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const selectLabel = labels?.select ?? "Select photo";
  const changeLabel = labels?.change ?? "Change photo";
  const expandLabel = labels?.expand ?? "Expand photo";

  const openFilePicker = useCallback(() => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  }, [disabled, uploading]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        onError?.(validationError);
        return;
      }

      setPendingFile(file);
      setCropOpen(true);
    },
    [onError],
  );

  const handleCropComplete = useCallback(
    async (croppedFile: File) => {
      const nextUploadId = uploadId ?? createUploadId();
      try {
        await onUpload({ file: croppedFile, uploadId: nextUploadId });
        setCropOpen(false);
        setPendingFile(null);
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : "Unable to upload photo.",
        );
      }
    },
    [onError, onUpload, uploadId],
  );

  const handleCropOpenChange = useCallback(
    (open: boolean) => {
      if (uploading) return;
      setCropOpen(open);
      if (!open) {
        setPendingFile(null);
      }
    },
    [uploading],
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={handleFileChange}
      />

      <PhotoUploadPreview
        value={value}
        alt={alt}
        disabled={disabled || uploading}
        selectLabel={selectLabel}
        changeLabel={changeLabel}
        expandLabel={expandLabel}
        previewClassName={previewClassName}
        onSelectClick={openFilePicker}
        onExpandClick={() => {
          if (value) setExpandOpen(true);
        }}
      />

      <PhotoCropDialog
        open={cropOpen}
        file={pendingFile}
        cropShape={cropShape}
        uploading={uploading}
        labels={{
          title: labels?.cropTitle,
          description: labels?.cropDescription,
          upload: labels?.upload,
          cancel: labels?.cancel,
          reset: labels?.reset,
        }}
        onOpenChange={handleCropOpenChange}
        onCropComplete={(file) => void handleCropComplete(file)}
      />

      <PhotoExpandDialog
        open={expandOpen}
        imageUrl={value ?? null}
        alt={alt}
        title={expandLabel}
        onClose={() => setExpandOpen(false)}
      />
    </>
  );
}
