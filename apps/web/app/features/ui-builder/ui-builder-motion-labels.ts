import type { TFunction } from "i18next";
import type { MotionPresetEditorLabels } from "@repo/ui-builder-react";

export function motionPresetEditorLabels(
  t: TFunction,
): MotionPresetEditorLabels {
  return {
    entrance: t("entity.viewSettings.motionEntrance"),
    hover: t("entity.viewSettings.motionHover"),
    transition: t("entity.viewSettings.motionTransition"),
    durationMs: t("entity.viewSettings.motionDuration"),
    delayMs: t("entity.viewSettings.motionDelay"),
    staggerIndex: t("entity.viewSettings.motionStagger"),
    clearEffects: t("entity.viewSettings.motionClear"),
  };
}
