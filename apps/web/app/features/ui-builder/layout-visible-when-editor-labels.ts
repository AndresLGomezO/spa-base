import type { TFunction } from "i18next";

import type { LayoutVisibleWhenEditorLabels } from "@repo/ui-builder-react";

export function layoutVisibleWhenEditorLabels(
  t: TFunction<"common">,
): LayoutVisibleWhenEditorLabels {
  return {
    title: t("entity.viewSettings.visibleWhen.title"),
    hint: t("entity.viewSettings.visibleWhen.hint"),
    compareField: t("entity.viewSettings.conditionalStyleCompareField"),
    compareFieldHint: t("entity.viewSettings.conditionalStyleCompareFieldHint"),
    dateDisplayFormat: t("entity.viewSettings.dateDisplayFormat"),
    matchValue: t("entity.viewSettings.matchValue"),
    matchPath: t("entity.viewSettings.conditionalStyleMatchPath"),
    matchPathPlaceholder: t(
      "entity.viewSettings.conditionalStyleMatchPathPlaceholder",
    ),
    conditionKind: t("entity.viewSettings.conditionalStyleConditionKind"),
    conditionKindField: t(
      "entity.viewSettings.conditionalStyleConditionKindField",
    ),
    conditionKindActivePath: t(
      "entity.viewSettings.conditionalStyleConditionKindActivePath",
    ),
    conditionKindDashboardDateFilter: t(
      "entity.viewSettings.visibleWhen.conditionKindDashboardDateFilter",
    ),
    dashboardDateFilterHint: t(
      "entity.viewSettings.visibleWhen.dashboardDateFilterHint",
    ),
    matchCurrentPeriod: t("entity.viewSettings.visibleWhen.matchCurrentPeriod"),
    preview: t("entity.viewSettings.conditionalStylePreview"),
    addRule: t("entity.viewSettings.addRule"),
    saveRule: t("entity.viewSettings.visibleWhen.saveRule"),
    cancel: t("entity.viewSettings.cancel"),
    removeRule: t("entity.viewSettings.remove"),
  };
}
