import type { PhotoUploadLabels } from "@repo/ui";
import type { TFunction } from "i18next";

export function imagePhotoUploadLabels(t: TFunction): PhotoUploadLabels {
  return {
    select: t("entity.fileSelectImage"),
    change: t("entity.fileChangeImage"),
    cropTitle: t("platform.appearance.photoAdjustTitle"),
    cropDescription: t("platform.appearance.photoAdjustDescription"),
    upload: t("platform.appearance.photoUpload"),
    uploadOriginal: t("platform.appearance.photoUploadOriginal"),
    uploadCropped: t("platform.appearance.photoUploadCropped"),
    cancel: t("platform.appearance.photoCancel"),
    reset: t("platform.appearance.photoReset"),
    expand: t("platform.appearance.photoExpandGeneric"),
    cropFrameSquare: t("platform.appearance.photoCropFrameSquare"),
    cropFrameLandscape43: t("platform.appearance.photoCropFrame43"),
    cropFrameLandscape169: t("platform.appearance.photoCropFrame169"),
    cropMaskCircle: t("platform.appearance.photoCropMaskCircle"),
    cropMaskRect: t("platform.appearance.photoCropMaskRect"),
    cropFrameAriaLabel: t("platform.appearance.photoCropFrameAriaLabel"),
    cropMaskAriaLabel: t("platform.appearance.photoCropMaskAriaLabel"),
  };
}
