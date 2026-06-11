import type { TFunction } from "i18next";

import type { ComponentDisplayRangeEditorLabels } from "@repo/ui-builder-react";

export function componentDisplayRangeEditorLabels(
  t: TFunction<"common">,
): ComponentDisplayRangeEditorLabels {
  return {
    title: t("entity.viewSettings.displayRange.title"),
    from: t("entity.viewSettings.displayRange.from"),
    to: t("entity.viewSettings.displayRange.to"),
    allScreens: t("entity.viewSettings.displayRange.allScreens"),
    presetMobileOnly: t("entity.viewSettings.displayRange.presetMobileOnly"),
    presetTabletUp: t("entity.viewSettings.displayRange.presetTabletUp"),
    presetDesktopOnly: t("entity.viewSettings.displayRange.presetDesktopOnly"),
    breakpointBase: t("entity.viewSettings.responsiveGrid.breakpointBase"),
    breakpointSm: t("entity.viewSettings.responsiveGrid.breakpointSm"),
    breakpointMd: t("entity.viewSettings.responsiveGrid.breakpointMd"),
    breakpointLg: t("entity.viewSettings.responsiveGrid.breakpointLg"),
    breakpointXl: t("entity.viewSettings.responsiveGrid.breakpointXl"),
  };
}
