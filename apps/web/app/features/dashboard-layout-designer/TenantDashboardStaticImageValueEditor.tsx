import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_IMAGE_MAX_SIZE_BYTES } from "@repo/entities";
import { Button, Input, PhotoUpload, Text, toast } from "@repo/ui";

import { useAnyPermission } from "../../auth/useAnyPermission";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { readFileAsBase64 } from "../../lib/entity-file-client";
import { uploadTenantDashboardLayoutImage } from "../../lib/api-client";

interface TenantDashboardStaticImageValueEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function TenantDashboardStaticImageValueEditor({
  value,
  onChange,
}: TenantDashboardStaticImageValueEditorProps) {
  const { t } = useTranslation("common");
  const [uploading, setUploading] = useState(false);
  const canEdit = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const previewUrl = value.startsWith("http") ? value : null;

  async function handleUpload(params: {
    readonly file: File;
    readonly uploadId: string;
  }) {
    void params.uploadId;
    if (!canEdit) {
      return;
    }
    setUploading(true);
    try {
      const data = await readFileAsBase64(params.file);
      const { imageUrl } = await uploadTenantDashboardLayoutImage({
        contentType: params.file.type || "image/jpeg",
        data,
      });
      onChange(imageUrl);
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
          value={value}
          placeholder="https://"
          onChange={(event) => onChange(event.target.value)}
          disabled={!canEdit}
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
          disabled={!canEdit || uploading}
          maxSizeBytes={DEFAULT_IMAGE_MAX_SIZE_BYTES}
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
        {previewUrl && canEdit ? (
          <Button type="button" variant="outline" onClick={() => onChange("")}>
            {t("designLayout.staticImageClear")}
          </Button>
        ) : null}
        {!canEdit ? (
          <Text className="text-muted-foreground text-sm">
            {t("designLayout.readOnly")}
          </Text>
        ) : null}
      </div>
    </div>
  );
}
