import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { ItemListDesignerTreePanelShell } from "../../item-list-designer/ItemListDesignerTreePanelShell";
import {
  designerPreviewPanelBodyFillClassName,
  designerTreePanelShellClassName,
} from "../../ui-builder/designer-tree-workbench-classes";
import { useFormulas } from "../formulas-context";
import {
  FormulaDefinitionSummaryContent,
  type FormulaSummaryMode,
} from "../FormulaDefinitionSummaryContent";

export function FormulaPreviewPanel() {
  const { t } = useTranslation("common");
  const { editor } = useFormulas();
  const [tab, setTab] = useState<FormulaSummaryMode>("overview");

  const definition = editor.selectedDefinition;

  const collapsedContent = definition ? (
    <Text className="text-muted-foreground break-words text-xs font-medium">
      {definition.name}
    </Text>
  ) : null;

  return (
    <ItemListDesignerTreePanelShell
      title={t("formulas.preview.panelTitle")}
      expandLabel={t("formulas.preview.expandPanel")}
      collapseLabel={t("formulas.preview.collapsePanel")}
      expandedClassName={cn(
        designerTreePanelShellClassName,
        "w-[32rem] shrink-0 min-w-0",
      )}
      collapsedClassName={designerTreePanelShellClassName}
      expandedBodyClassName="flex w-full min-w-0 flex-col overflow-x-hidden"
      collapsedContent={collapsedContent}
    >
      {!definition ? (
        <Text className="text-muted-foreground px-2 py-3 text-sm">
          {t("formulas.preview.empty")}
        </Text>
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 px-1 py-1">
          <div className="min-w-0 px-1">
            <Text className="text-foreground text-base font-semibold">
              {definition.name}
            </Text>
            {definition.description ? (
              <Text className="text-muted-foreground text-xs">
                {definition.description}
              </Text>
            ) : null}
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
            <FormulaDefinitionSummaryContent
              formulaName={definition.name}
              definition={definition}
              catalog={editor.definitions}
              isLoadingCatalog={false}
              navigationStack={[definition.name]}
              onNavigateToFormula={() => {}}
              onNavigateToStackIndex={() => {}}
              mode={tab}
              showNavigation={false}
            />
          </div>
        </div>
      )}
    </ItemListDesignerTreePanelShell>
  );
}
