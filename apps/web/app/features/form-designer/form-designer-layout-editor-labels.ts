import type { TFunction } from "i18next";

import { componentDisplayRangeEditorLabels } from "../ui-builder/component-display-range-editor-labels";
import { motionPresetEditorLabels } from "../ui-builder/ui-builder-motion-labels";
import { responsiveGridEditorLabels } from "../ui-builder/responsive-grid-editor-labels";
import { layoutJsonImportLabels } from "../ui-builder/layout-json-import-labels";

export function formDesignerLayoutEditorLabels(t: TFunction<"common">) {
  return {
    structure: t("entity.viewSettings.structure"),
    layoutColumns: t("entity.viewSettings.layoutColumns"),
    showActions: t("entity.viewSettings.showActions"),
    columnStyles: t("entity.viewSettings.columnStyles"),
    stackDirection: {
      title: t("entity.viewSettings.stackDirection"),
      vertical: t("entity.viewSettings.stackVertical"),
      horizontal: t("entity.viewSettings.stackHorizontal"),
    },
    responsiveGrid: responsiveGridEditorLabels(t),
    displayRange: componentDisplayRangeEditorLabels(t),
    rowLayoutStyles: t("entity.viewSettings.responsiveGrid.rowLayoutStyles"),
    styleRules: {
      addStyleRule: t("entity.viewSettings.addStyleRule"),
      saveStyleRule: t("entity.viewSettings.save"),
      removeStyleRule: t("entity.viewSettings.removeStyleRule"),
      styleProperty: t("entity.viewSettings.styleProperty"),
      styleValue: t("entity.viewSettings.styleValue"),
      styleColorTheme: t("entity.viewSettings.styleColorTheme"),
      styleColorCustom: t("entity.viewSettings.styleColorCustom"),
      styleColorThemeTokens: t("entity.viewSettings.styleColorThemeTokens"),
      styleColorSemanticTokens: t(
        "entity.viewSettings.styleColorSemanticTokens",
      ),
      styleColorCustomInput: t("entity.viewSettings.styleColorCustomInput"),
      styleColorInvalid: t("entity.viewSettings.styleColorInvalid"),
    },
    motion: motionPresetEditorLabels(t),
    layoutEffects: t("entity.viewSettings.layoutEffects"),
    rowStyles: t("entity.viewSettings.rowStyles"),
    rowEffects: t("entity.viewSettings.rowEffects"),
    columnTab: (column: number) =>
      t("entity.viewSettings.columnTab", { column }),
    columnWidthPercent: t("entity.viewSettings.columnWidthPercent"),
    columnWidthAutoHint: (percent: number) =>
      t("entity.viewSettings.columnWidthAutoHint", { percent }),
    moveColumnLeft: t("entity.viewSettings.moveColumnLeft"),
    moveColumnRight: t("entity.viewSettings.moveColumnRight"),
    deleteColumn: (column: number) =>
      t("entity.viewSettings.deleteColumn", { column }),
    layoutJsonImport: {
      ...layoutJsonImportLabels(t),
      titleColumn: t("formDesigner.layout.columnPanel.jsonTitleColumn"),
      viewTitleColumn: t("formDesigner.layout.columnPanel.jsonViewTitleColumn"),
    },
  };
}
