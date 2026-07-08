import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  DocumentUpload,
  FieldError,
  FieldLabel,
  Text,
  toast,
} from "@repo/ui";

import {
  isEntityFileReferenceWithDownload,
  readFileAsBase64,
  uploadEntityFile,
} from "../../../lib/entity-file-client";
import { coerceArrayValue, removeArrayItemAt } from "../array-field-value";
import type { FieldComponentProps } from "../field-component-registry";

export function DocumentField({
  entityName,
  fieldName,
  value,
  label,
  required,
  error,
  readOnly = false,
  recordId,
  maxSizeBytes,
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
      contentType: file.type || "application/pdf",
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
          <div className="flex flex-col gap-2">
            {items.map((fileRef, index) => (
              <div
                key={`${fileRef.storagePath}-${index}`}
                className="border-border flex flex-wrap items-center gap-2 rounded-md border px-3 py-2"
              >
                {fileRef.downloadUrl ? (
                  <a
                    href={fileRef.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-sm underline"
                  >
                    {fileRef.fileName}
                  </a>
                ) : (
                  <Text className="text-sm">{fileRef.fileName}</Text>
                )}
                {readOnly ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
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
          <DocumentUpload
            fileName={null}
            downloadUrl={null}
            uploading={uploading}
            disabled={uploading}
            maxSizeBytes={maxSizeBytes}
            labels={{
              select: t("entity.fileAddDocument"),
              change: t("entity.fileChangeDocument"),
              remove: t("entity.fileRemove"),
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

  function handleRemove() {
    onChange(fieldName, undefined);
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel
        className={hideLabel ? "sr-only" : undefined}
        required={required}
      >
        {label}
      </FieldLabel>
      <DocumentUpload
        fileName={fileRef?.fileName ?? null}
        downloadUrl={fileRef?.downloadUrl ?? null}
        uploading={uploading}
        disabled={readOnly || uploading}
        maxSizeBytes={maxSizeBytes}
        labels={{
          select: t("entity.fileSelectDocument"),
          change: t("entity.fileChangeDocument"),
          remove: t("entity.fileRemove"),
        }}
        onUpload={handleUpload}
        onRemove={readOnly ? undefined : handleRemove}
        onError={(message) => toast.error(message)}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
