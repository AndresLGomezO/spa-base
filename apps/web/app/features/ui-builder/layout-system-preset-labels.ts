import type { TFunction } from "i18next";
import type { BuiltInComponentTemplateId } from "@repo/ui-builder-core";

interface LayoutSystemPresetLabels {
  readonly label: string;
  readonly selectPreset: string;
  readonly platformGroup: string;
  readonly tenantGroup: string;
  readonly custom: string;
  readonly confirmTitle: string;
  readonly confirmBody: string;
  readonly confirmApply: string;
  readonly cancel: string;
  readonly mapFields: string;
  readonly slotLabel: string;
  readonly invalid: string;
  readonly readOnlyHint: string;
  readonly noPresets: string;
  readonly apply: string;
  readonly tenantPresetTitle: string;
}

export function layoutSystemPresetLabels(
  t: TFunction,
): LayoutSystemPresetLabels {
  return {
    label: t("designLayout.systemPresets.label"),
    selectPreset: t("designLayout.systemPresets.selectPreset"),
    platformGroup: t("designLayout.systemPresets.platformGroup"),
    tenantGroup: t("designLayout.systemPresets.tenantGroup"),
    custom: t("designLayout.systemPresets.custom"),
    confirmTitle: t("designLayout.systemPresets.confirmTitle"),
    confirmBody: t("designLayout.systemPresets.confirmBody"),
    confirmApply: t("designLayout.systemPresets.confirmApply"),
    cancel: t("designLayout.presets.cancel"),
    mapFields: t("designLayout.presets.mapFields"),
    slotLabel: t("designLayout.presets.slotLabel"),
    invalid: t("designLayout.presets.invalid"),
    readOnlyHint: t("designLayout.presets.readOnlyHint"),
    noPresets: t("designLayout.presets.noPresets"),
    apply: t("designLayout.presets.apply"),
    tenantPresetTitle: t("designLayout.systemPresets.tenantPresetTitle"),
  };
}

const BUILTIN_LABEL_KEYS: Record<
  BuiltInComponentTemplateId,
  | "designLayout.systemPresets.builtin.plainForm"
  | "designLayout.systemPresets.builtin.cardList"
  | "designLayout.systemPresets.builtin.expandableTableList"
  | "designLayout.systemPresets.builtin.wizardForm"
  | "designLayout.systemPresets.builtin.kpiStrip"
> = {
  "plain-form": "designLayout.systemPresets.builtin.plainForm",
  "card-list": "designLayout.systemPresets.builtin.cardList",
  "expandable-table-list":
    "designLayout.systemPresets.builtin.expandableTableList",
  "wizard-form": "designLayout.systemPresets.builtin.wizardForm",
  "kpi-strip": "designLayout.systemPresets.builtin.kpiStrip",
};

const BUILTIN_DESCRIPTION_KEYS: Partial<
  Record<BuiltInComponentTemplateId, string>
> = {
  "plain-form": "designLayout.systemPresets.builtin.plainFormDescription",
  "card-list": "designLayout.systemPresets.builtin.cardListDescription",
  "expandable-table-list":
    "designLayout.systemPresets.builtin.expandableTableListDescription",
  "wizard-form": "designLayout.systemPresets.builtin.wizardFormDescription",
  "kpi-strip": "designLayout.systemPresets.builtin.kpiStripDescription",
};

export function builtinPresetLabel(
  t: TFunction,
  id: BuiltInComponentTemplateId,
): string {
  return t(BUILTIN_LABEL_KEYS[id]);
}

export function builtinPresetDescription(
  t: TFunction,
  id: BuiltInComponentTemplateId,
): string | undefined {
  const key = BUILTIN_DESCRIPTION_KEYS[id];
  return key
    ? t(key as "designLayout.systemPresets.builtin.plainFormDescription")
    : undefined;
}
