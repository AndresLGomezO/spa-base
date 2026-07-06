import type { TFunction } from "i18next";
import type { MotionPresetEditorLabels } from "@repo/ui-builder-react";

export function motionPresetEditorLabels(
  t: TFunction,
): MotionPresetEditorLabels {
  return {
    entrance: t("entity.viewSettings.motionEntrance"),
    hoverSurface: t("entity.viewSettings.motionHoverSurface"),
    hoverTransform: t("entity.viewSettings.motionHoverTransform"),
    hoverRotateDeg: t("entity.viewSettings.motionHoverRotateDeg"),
    hoverDurationMs: t("entity.viewSettings.motionHoverDuration"),
    transition: t("entity.viewSettings.motionTransition"),
    durationMs: t("entity.viewSettings.motionDuration"),
    delayMs: t("entity.viewSettings.motionDelay"),
    staggerIndex: t("entity.viewSettings.motionStagger"),
    clearEffects: t("entity.viewSettings.motionClear"),
  };
}
