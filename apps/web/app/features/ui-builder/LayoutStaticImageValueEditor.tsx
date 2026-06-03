import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SerializableEntityDefinition } from "@repo/entities";
import {
  DEFAULT_IMAGE_MAX_SIZE_BYTES,
  resolveFileFieldMaxSizeBytes,
} from "@repo/entities";
import { Button, Input, PhotoUpload, Text, toast } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";

import type { EntityName } from "../../entities/entity-catalog";
import {
  fetchEntityFileDownloadUrlByStoragePath,
  readFileAsBase64,
  uploadEntityFile,
} from "../../lib/entity-file-client";
import {
  parseLayoutStaticImageRef,
  readLayoutStaticImageUrl,
  resolveLayoutStaticUploadFieldName,
  serializeLayoutStaticImageRef,
} from "../../lib/layout-static-image";

interface LayoutStaticImageValueEditorProps {
  readonly entityName: EntityName;
  readonly definition: SerializableEntityDefinition;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function LayoutStaticImageValueEditor({
  entityName,
  definition,
  value,
  onChange,
}: LayoutStaticImageValueEditorProps) {
  const { t } = useTranslation("common");
  const [uploading, setUploading] = useState(false);
  const uploadFieldName = useMemo(
    () => resolveLayoutStaticUploadFieldName(definition.fields),
    [definition.fields],
  );
  const fileRef = useMemo(() => parseLayoutStaticImageRef(value), [value]);
  const directUrl = readLayoutStaticImageUrl(value);
  const urlInputValue = fileRef ? "" : value;

  const storageDownloadQuery = useQuery({
    queryKey: ["layout-static-image", entityName, fileRef?.storagePath],
    queryFn: () =>
      fetchEntityFileDownloadUrlByStoragePath(entityName, fileRef!.storagePath),
    enabled: Boolean(fileRef && !directUrl),
    staleTime: 5 * 60 * 1000,
  });

  const previewUrl = directUrl ?? storageDownloadQuery.data ?? null;

  const imageFieldName = useMemo(
    () =>
      Object.keys(definition.fields).find(
        (name) => definition.fields[name]?.type === "image",
      ),
    [definition.fields],
  );

  const maxSizeBytes = imageFieldName
    ? resolveFileFieldMaxSizeBytes(
        "image",
        definition.fields[imageFieldName]?.maxSizeBytes,
      )
    : DEFAULT_IMAGE_MAX_SIZE_BYTES;

  async function handleUpload(params: {
    readonly file: File;
    readonly uploadId: string;
  }) {
    setUploading(true);
    try {
      const data = await readFileAsBase64(params.file);
      const file = await uploadEntityFile({
        entityName,
        fieldName: uploadFieldName,
        contentType: params.file.type || "image/jpeg",
        fileName: params.file.name,
        data,
        purpose: "layoutStatic",
      });
      onChange(serializeLayoutStaticImageRef(file));
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
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("designLayout.staticImageUrl")}</span>
        <Input
          value={urlInputValue}
          placeholder="https://"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>

      <div className="flex flex-col gap-2">
        <Text className="text-sm font-medium">
          {t("designLayout.staticImageUpload")}
        </Text>
        <PhotoUpload
          value={previewUrl}
          alt={t("designLayout.staticImage")}
          cropShape="rect"
          uploading={uploading}
          disabled={uploading}
          maxSizeBytes={maxSizeBytes}
          labels={{
            select: t("entity.fileSelectImage"),
            change: t("entity.fileChangeImage"),
            cropTitle: t("platform.appearance.photoCropTitle"),
            cropDescription: t("platform.appearance.photoCropDescription"),
            upload: t("platform.appearance.photoUpload"),
            cancel: t("platform.appearance.photoCancel"),
            reset: t("platform.appearance.photoReset"),
            expand: t("platform.appearance.photoExpand"),
          }}
          onUpload={handleUpload}
          onError={(message) => toast.error(message)}
        />
        {fileRef ? (
          <Button type="button" variant="outline" onClick={() => onChange("")}>
            {t("designLayout.staticImageClear")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
