import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  FieldError,
  FieldLabel,
  PhotoUpload,
  Text,
  toast,
} from "@repo/ui";

import { imagePhotoUploadLabels } from "../../../lib/photo-upload-labels";
import {
  isEntityFileReferenceWithDownload,
  readFileAsBase64,
  uploadEntityFile,
} from "../../../lib/entity-file-client";
import { coerceArrayValue, removeArrayItemAt } from "../array-field-value";
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
  isArray = false,
  onChange,
}: FieldComponentProps) {
  const { t } = useTranslation("common");
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File) {
    const data = await readFileAsBase64(file);
    return uploadEntityFile({
      entityName,
      fieldName,
      contentType: file.type || "image/jpeg",
      fileName: file.name,
      data,
      recordId,
    });
  }

  if (isArray) {
    const items = coerceArrayValue(value).filter(
      isEntityFileReferenceWithDownload,
    );

    async function handleUpload(params: {
      readonly file: File;
      readonly uploadId: string;
    }) {
      void params.uploadId;
      setUploading(true);
      try {
        const file = await uploadFile(params.file);
        onChange(fieldName, [...items, file]);
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
      <div className="flex flex-col gap-2">
        <FieldLabel
          className={hideLabel ? "sr-only" : undefined}
          required={required}
        >
          {label}
        </FieldLabel>
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {items.map((fileRef, index) => (
              <div
                key={`${fileRef.storagePath}-${index}`}
                className="border-border flex flex-col gap-2 rounded-lg border p-2"
              >
                {fileRef.downloadUrl ? (
                  <img
                    src={fileRef.downloadUrl}
                    alt={fileRef.fileName}
                    className="block h-24 w-32 object-contain"
                  />
                ) : (
                  <Text className="text-sm">{fileRef.fileName}</Text>
                )}
                {readOnly ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploading}
                    onClick={() =>
                      onChange(fieldName, removeArrayItemAt(items, index))
                    }
                  >
                    {t("entity.fileRemove")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : null}
        {readOnly ? null : (
          <PhotoUpload
            value={null}
            alt={label}
            cropShape="rect"
            uploading={uploading}
            disabled={uploading}
            maxSizeBytes={maxSizeBytes}
            labels={{
              ...imagePhotoUploadLabels(t),
              select: t("entity.fileAddImage"),
            }}
            onUpload={handleUpload}
            onError={(message) => toast.error(message)}
          />
        )}
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  const fileRef = isEntityFileReferenceWithDownload(value) ? value : null;
  const previewUrl = fileRef?.downloadUrl ?? null;

  async function handleUpload(params: {
    readonly file: File;
    readonly uploadId: string;
  }) {
    void params.uploadId;
    setUploading(true);
    try {
      const file = await uploadFile(params.file);
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
