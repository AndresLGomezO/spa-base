import type { TFunction } from "i18next";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { GridTemplateColumnsErrorCode } from "@repo/ui-builder-core";
import type { SemanticColorOption } from "@repo/ui-builder-react";

import { componentDisplayRangeEditorLabels } from "../ui-builder/component-display-range-editor-labels";
import { layoutVisibleWhenEditorLabels } from "../ui-builder/layout-visible-when-editor-labels";
import { motionPresetEditorLabels } from "../ui-builder/ui-builder-motion-labels";
import { responsiveGridEditorLabels } from "../ui-builder/responsive-grid-editor-labels";
import { layoutJsonImportLabels } from "../ui-builder/layout-json-import-labels";
import { useCustomTokenColorOptions } from "../../theme/use-custom-token-color-options";
import { styleRulesEditorLabels } from "../ui-builder/style-rules-editor-labels";

export function formDesignerLayoutEditorLabels(
  t: TFunction<"common">,
  customColorOptions: readonly SemanticColorOption[] = [],
) {
  return {
    structure: t("entity.viewSettings.structure"),
    layoutColumns: t("entity.viewSettings.layoutColumns"),
    gridGap: t("entity.viewSettings.gridGap"),
    gridTemplateColumns: t("entity.viewSettings.gridTemplateColumns"),
    gridTemplateColumnsHint: (trackCount: number) =>
      t("entity.viewSettings.gridTemplateColumnsHint", { count: trackCount }),
    gridTemplateColumnsPreview: (preview: string, hasDynamicRepeat: boolean) =>
      hasDynamicRepeat
        ? t("entity.viewSettings.gridTemplateColumnsPreviewDynamic", {
            preview,
          })
        : t("entity.viewSettings.gridTemplateColumnsPreview", { preview }),
    gridTemplateColumnsPreviewFlexible: () =>
      t("entity.viewSettings.gridTemplateColumnsPreviewFlexible"),
    gridTemplateColumnsError: (
      errorCode: GridTemplateColumnsErrorCode,
      details?: { readonly defined?: number; readonly expected?: number },
    ) =>
      t(`entity.viewSettings.gridTemplateColumnsErrors.${errorCode}`, {
        defined: details?.defined,
        expected: details?.expected,
      }),
    showActions: t("entity.viewSettings.showActions"),
    columnStyles: t("entity.viewSettings.columnStyles"),
    stackDirection: {
      title: t("entity.viewSettings.stackDirection"),
      vertical: t("entity.viewSettings.stackVertical"),
      horizontal: t("entity.viewSettings.stackHorizontal"),
    },
    responsiveGrid: responsiveGridEditorLabels(t),
    displayRange: componentDisplayRangeEditorLabels(t),
    visibleWhen: layoutVisibleWhenEditorLabels(t),
    rowLayoutStyles: t("entity.viewSettings.responsiveGrid.rowLayoutStyles"),
    styleRules: styleRulesEditorLabels(t, customColorOptions),
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

export function useFormDesignerLayoutEditorLabels() {
  const { t } = useTranslation("common");
  const customColorOptions = useCustomTokenColorOptions();
  return useMemo(
    () => formDesignerLayoutEditorLabels(t, customColorOptions),
    [customColorOptions, t],
  );
}
