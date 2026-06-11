import type { TFunction } from "i18next";

import type { ResponsiveGridEditorLabels } from "@repo/ui-builder-react";

export function responsiveGridEditorLabels(
  t: TFunction<"common">,
): ResponsiveGridEditorLabels {
  return {
    title: t("entity.viewSettings.responsiveGrid.title"),
    mode: t("entity.viewSettings.responsiveGrid.mode"),
    modeAuto: t("entity.viewSettings.responsiveGrid.modeAuto"),
    modeCustom: t("entity.viewSettings.responsiveGrid.modeCustom"),
    modeAutoFit: t("entity.viewSettings.responsiveGrid.modeAutoFit"),
    modeFixed: t("entity.viewSettings.responsiveGrid.modeFixed"),
    autoFitMinWidth: t("entity.viewSettings.responsiveGrid.autoFitMinWidth"),
    breakpointBase: t("entity.viewSettings.responsiveGrid.breakpointBase"),
    breakpointSm: t("entity.viewSettings.responsiveGrid.breakpointSm"),
    breakpointMd: t("entity.viewSettings.responsiveGrid.breakpointMd"),
    breakpointLg: t("entity.viewSettings.responsiveGrid.breakpointLg"),
    breakpointXl: t("entity.viewSettings.responsiveGrid.breakpointXl"),
    stackOnMobilePreset: t(
      "entity.viewSettings.responsiveGrid.stackOnMobilePreset",
    ),
  };
}
