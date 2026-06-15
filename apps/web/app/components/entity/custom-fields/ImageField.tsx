import { useState } from "react";
import { useTranslation } from "react-i18next";

import { FieldError, FieldLabel, PhotoUpload, toast } from "@repo/ui";

import { imagePhotoUploadLabels } from "../../../lib/photo-upload-labels";
import {
  isEntityFileReferenceWithDownload,
  readFileAsBase64,
  uploadEntityFile,
} from "../../../lib/entity-file-client";
import type { FieldComponentProps } from "../field-component-registry";

export function ImageField({
  entityName,
  fieldName,
  value,
  label,
  required,
  error,
  readOnly = false,
  recordId,
  maxSizeBytes,
  defaultImageUrl,
  hideLabel = false,
  onChange,
}: FieldComponentProps) {
  const { t } = useTranslation("common");
  const [uploading, setUploading] = useState(false);
  const fileRef = isEntityFileReferenceWithDownload(value) ? value : null;
  const previewUrl = fileRef?.downloadUrl ?? null;

  async function handleUpload(params: {
    readonly file: File;
    readonly uploadId: string;
  }) {
    setUploading(true);
    try {
      const data = await readFileAsBase64(params.file);
      const file = await uploadEntityFile({
        entityName,
        fieldName,
        contentType: params.file.type || "image/jpeg",
        fileName: params.file.name,
        data,
        recordId,
      });
      onChange(fieldName, file);
      toast.success(t("entity.fileUploadSuccess"));
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : t("entity.fileUploadFailed"),
      );
      throw uploadError;
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel
        className={hideLabel ? "sr-only" : undefined}
        required={required}
      >
        {label}
      </FieldLabel>
      <PhotoUpload
        value={previewUrl}
        placeholderUrl={previewUrl ? null : defaultImageUrl}
        alt={label}
        cropShape="rect"
        uploading={uploading}
        disabled={readOnly || uploading}
        maxSizeBytes={maxSizeBytes}
        labels={imagePhotoUploadLabels(t)}
        onUpload={handleUpload}
        onError={(message) => toast.error(message)}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
