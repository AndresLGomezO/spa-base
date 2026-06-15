import { useCallback, useRef, useState, type ChangeEvent } from "react";

import { PhotoCropDialog, type PhotoCropShape } from "./PhotoCropDialog";
import { PhotoExpandDialog } from "./PhotoExpandDialog";
import { PhotoUploadPreview } from "./PhotoUploadPreview";
import {
  createUploadId,
  DEFAULT_IMAGE_MAX_SIZE_BYTES,
  validateFile,
  type PhotoCropFrame,
} from "./photo-upload.utils";

export type { PhotoCropFrame, PhotoCropShape };

export interface PhotoUploadLabels {
  readonly select?: string;
  readonly change?: string;
  readonly cropTitle?: string;
  readonly cropDescription?: string;
  readonly upload?: string;
  readonly uploadOriginal?: string;
  readonly uploadCropped?: string;
  readonly cancel?: string;
  readonly reset?: string;
  readonly expand?: string;
  readonly cropFrameSquare?: string;
  readonly cropFrameLandscape43?: string;
  readonly cropFrameLandscape169?: string;
  readonly cropMaskCircle?: string;
  readonly cropMaskRect?: string;
  readonly cropFrameAriaLabel?: string;
  readonly cropMaskAriaLabel?: string;
}

export interface PhotoUploadProps {
  readonly value?: string | null;
  readonly placeholderUrl?: string | null;
  readonly alt: string;
  readonly uploading?: boolean;
  readonly disabled?: boolean;
  readonly cropShape?: PhotoCropShape;
  readonly defaultCropFrame?: PhotoCropFrame;
  readonly allowOriginalUpload?: boolean;
  readonly allowCrop?: boolean;
  readonly previewClassName?: string;
  readonly uploadId?: string;
  readonly maxSizeBytes?: number;
  readonly dialogLayer?: "default" | "nested";
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
  placeholderUrl,
  alt,
  uploading = false,
  disabled = false,
  cropShape = "rect",
  defaultCropFrame = "square",
  allowOriginalUpload = true,
  allowCrop = true,
  previewClassName,
  uploadId,
  maxSizeBytes = DEFAULT_IMAGE_MAX_SIZE_BYTES,
  dialogLayer = "nested",
  onUpload,
  onError,
  labels,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const selectLabel = labels?.select ?? "Select photo";
  const changeLabel = labels?.change ?? "Change photo";
  const expandLabel = labels?.expand ?? "Expand photo";
  const showDialog = allowCrop || allowOriginalUpload;

  const openFilePicker = useCallback(() => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  }, [disabled, uploading]);

  const handleUploadFile = useCallback(
    async (file: File) => {
      const nextUploadId = uploadId ?? createUploadId();
      try {
        await onUpload({ file, uploadId: nextUploadId });
        setDialogOpen(false);
        setPendingFile(null);
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : "Unable to upload photo.",
        );
      }
    },
    [onError, onUpload, uploadId],
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      const validationError = validateFile(file, maxSizeBytes);
      if (validationError) {
        onError?.(validationError);
        return;
      }

      if (!showDialog) {
        void handleUploadFile(file);
        return;
      }

      setPendingFile(file);
      setDialogOpen(true);
    },
    [handleUploadFile, maxSizeBytes, onError, showDialog],
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (uploading) return;
      setDialogOpen(open);
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
        placeholderUrl={placeholderUrl}
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
        open={dialogOpen && showDialog}
        file={pendingFile}
        cropShape={cropShape}
        defaultCropFrame={defaultCropFrame}
        allowOriginalUpload={allowOriginalUpload}
        allowCrop={allowCrop}
        uploading={uploading}
        layer={dialogLayer}
        labels={{
          title: labels?.cropTitle,
          description: labels?.cropDescription,
          upload: labels?.upload,
          uploadOriginal: labels?.uploadOriginal,
          uploadCropped: labels?.uploadCropped,
          cancel: labels?.cancel,
          reset: labels?.reset,
          cropFrameSquare: labels?.cropFrameSquare,
          cropFrameLandscape43: labels?.cropFrameLandscape43,
          cropFrameLandscape169: labels?.cropFrameLandscape169,
          cropMaskCircle: labels?.cropMaskCircle,
          cropMaskRect: labels?.cropMaskRect,
          cropFrameAriaLabel: labels?.cropFrameAriaLabel,
          cropMaskAriaLabel: labels?.cropMaskAriaLabel,
        }}
        onOpenChange={handleDialogOpenChange}
        onCropComplete={(file) => void handleUploadFile(file)}
        onOriginalUpload={(file) => void handleUploadFile(file)}
      />

      <PhotoExpandDialog
        open={expandOpen}
        imageUrl={value ?? null}
        alt={alt}
        title={expandLabel}
        layer={dialogLayer}
        onClose={() => setExpandOpen(false)}
      />
    </>
  );
}
