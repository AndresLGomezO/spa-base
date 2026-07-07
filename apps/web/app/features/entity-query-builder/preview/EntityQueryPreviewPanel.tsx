import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { ItemListDesignerTreePanelShell } from "../../item-list-designer/ItemListDesignerTreePanelShell";
import {
  designerPreviewPanelBodyFillClassName,
  designerTreePanelShellClassName,
} from "../../ui-builder/designer-tree-workbench-classes";
import { useEntityQueryBuilder } from "../entity-query-builder-context";
import {
  EntityQueryDefinitionSummaryContent,
  type EntityQuerySummaryMode,
} from "./EntityQueryDefinitionSummaryContent.js";

export function EntityQueryPreviewPanel() {
  const { t } = useTranslation("common");
  const { editor } = useEntityQueryBuilder();
  const [tab, setTab] = useState<EntityQuerySummaryMode>("overview");

  const definition = editor.selectedDefinition;
  const draft = editor.draft;

  const collapsedContent = definition ? (
    <Text className="text-muted-foreground break-words text-xs font-medium">
      {definition.name}
    </Text>
  ) : null;

  return (
    <ItemListDesignerTreePanelShell
      title={t("queryBuilder.howItWorks.panelTitle")}
      expandLabel={t("queryBuilder.howItWorks.expandPanel")}
      collapseLabel={t("queryBuilder.howItWorks.collapsePanel")}
      expandedClassName={cn(
        designerTreePanelShellClassName,
        "w-[32rem] shrink-0 min-w-0",
      )}
      collapsedClassName={designerTreePanelShellClassName}
      expandedBodyClassName="flex w-full min-w-0 flex-col overflow-x-hidden"
      collapsedContent={collapsedContent}
    >
      {!definition || !draft ? (
        <Text className="text-muted-foreground px-2 py-3 text-sm">
          {t("queryBuilder.howItWorks.empty")}
        </Text>
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 px-1 py-1">
          <div className="min-w-0 px-1">
            <Text className="text-foreground text-base font-semibold">
              {definition.name}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {draft.queryMode === "aggregated"
                ? t("queryBuilder.queryMode.aggregated")
                : t("queryBuilder.queryMode.records")}
              {" · "}
              {definition.sourceEntity}
            </Text>
          </div>

          <div className="flex shrink-0 flex-wrap gap-1 px-1">
            {(["overview", "details", "advanced"] as const).map((entry) => (
              <Button
                key={entry}
                type="button"
                size="sm"
                variant={tab === entry ? "primary" : "outline"}
                onClick={() => setTab(entry)}
              >
                {t(`dataHooks.preview.tabs.${entry}`)}
              </Button>
            ))}
          </div>

          <div className={designerPreviewPanelBodyFillClassName}>
            <EntityQueryDefinitionSummaryContent
              name={definition.name}
              description={draft.description ?? definition.description}
              sourceEntity={definition.sourceEntity}
              draft={draft}
              status={draft.status}
              mode={tab}
            />
          </div>
        </div>
      )}
    </ItemListDesignerTreePanelShell>
  );
}
