import type { TFunction } from "i18next";
import type {
  LayoutPresetInsertLabels,
  LayoutPresetLabels,
} from "@repo/ui-builder-react";

export function layoutPresetLabels(t: TFunction): LayoutPresetLabels {
  return {
    saveTrigger: t("designLayout.presets.saveTrigger"),
    saveTitle: t("designLayout.presets.saveTitle"),
    name: t("designLayout.presets.name"),
    description: t("designLayout.presets.descriptionField"),
    save: t("designLayout.presets.save"),
    cancel: t("designLayout.presets.cancel"),
    saveFailed: t("designLayout.presets.saveFailed"),
    readOnlyHint: t("designLayout.presets.readOnlyHint"),
  };
}

export function layoutPresetInsertLabels(
  t: TFunction,
): LayoutPresetInsertLabels {
  return {
    insertTrigger: t("designLayout.presets.insertTrigger"),
    insertTitle: t("designLayout.presets.insertTitle"),
    selectPreset: t("designLayout.presets.selectPreset"),
    mapFields: t("designLayout.presets.mapFields"),
    apply: t("designLayout.presets.apply"),
    cancel: t("designLayout.presets.cancel"),
    invalid: t("designLayout.presets.invalid"),
    readOnlyHint: t("designLayout.presets.readOnlyHint"),
    noPresets: t("designLayout.presets.noPresets"),
    slotLabel: t("designLayout.presets.slotLabel"),
  };
}
