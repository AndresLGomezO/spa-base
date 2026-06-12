import { useMemo } from "react";
import { SegmentedSwitch, type SegmentedSwitchOption } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { ItemListColumnsScope } from "./item-list-designer-columns-scope";
import { useItemListDesigner } from "./item-list-designer-context";
import { formDesignerComponentsLabels } from "../form-designer/form-designer-components-labels";
import { ItemListDesignerColumnsScopeCollapsedMenu } from "./ItemListDesignerColumnsScopeCollapsedMenu";
import { ItemListDesignerExpandableRowTreePanel } from "./ItemListDesignerExpandableRowTreePanel";
import { ItemListDesignerGroupedColumnsTreePanel } from "./ItemListDesignerGroupedColumnsTreePanel";
import { ItemListDesignerTreePanelShell } from "./ItemListDesignerTreePanelShell";

export function ItemListDesignerExpandableColumnsTreePanel() {
  const { t } = useTranslation("common");
  const { columnsScope, requestColumnsScopeChange } = useItemListDesigner();
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);

  const scopeOptions = useMemo(
    (): readonly SegmentedSwitchOption<ItemListColumnsScope>[] => [
      {
        value: "grouped",
        label: t("itemListDesigner.tabs.groupedColumns"),
        ariaLabel: t("itemListDesigner.tabs.groupedColumns"),
      },
      {
        value: "expanded",
        label: t("itemListDesigner.tabs.expandedRow"),
        ariaLabel: t("itemListDesigner.tabs.expandedRow"),
      },
    ],
    [t],
  );

  const scopeAriaLabel = t("itemListDesigner.columnsScope.ariaLabel");

  const expandedBody =
    columnsScope === "grouped" ? (
      <ItemListDesignerGroupedColumnsTreePanel
        embedded
        embeddedVariant="expanded"
      />
    ) : (
      <ItemListDesignerExpandableRowTreePanel
        embedded
        embeddedVariant="expanded"
      />
    );

  const collapsedBody =
    columnsScope === "grouped" ? (
      <ItemListDesignerGroupedColumnsTreePanel
        embedded
        embeddedVariant="collapsed"
      />
    ) : (
      <ItemListDesignerExpandableRowTreePanel
        embedded
        embeddedVariant="collapsed"
      />
    );

  return (
    <ItemListDesignerTreePanelShell
      title={t("itemListDesigner.columnsPanelTitle")}
      expandLabel={labels.expandPanel}
      collapseLabel={labels.collapsePanel}
      expandedBodyClassName="pt-2"
      scopeSection={
        <SegmentedSwitch
          ariaLabel={scopeAriaLabel}
          value={columnsScope}
          options={scopeOptions}
          onChange={requestColumnsScopeChange}
        />
      }
      collapsedHeaderContent={
        <ItemListDesignerColumnsScopeCollapsedMenu
          value={columnsScope}
          options={scopeOptions}
          onChange={requestColumnsScopeChange}
          ariaLabel={scopeAriaLabel}
        />
      }
      collapsedContent={collapsedBody}
    >
      {expandedBody}
    </ItemListDesignerTreePanelShell>
  );
}
