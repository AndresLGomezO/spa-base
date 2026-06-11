import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DocumentUpload, FieldError, FieldLabel, toast } from "@repo/ui";

import {
  isEntityFileReferenceWithDownload,
  readFileAsBase64,
  uploadEntityFile,
} from "../../../lib/entity-file-client";
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
  onChange,
}: FieldComponentProps & { readonly recordId?: string }) {
  const { t } = useTranslation("common");
  const [uploading, setUploading] = useState(false);
  const fileRef = isEntityFileReferenceWithDownload(value) ? value : null;

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
        contentType: params.file.type || "application/pdf",
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
