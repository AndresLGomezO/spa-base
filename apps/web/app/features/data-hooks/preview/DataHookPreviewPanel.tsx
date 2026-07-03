import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import {
  formatFieldLabel,
  getEntityLabel,
} from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { ItemListDesignerTreePanelShell } from "../../item-list-designer/ItemListDesignerTreePanelShell";
import {
  designerPreviewPanelBodyFillClassName,
  designerTreePanelShellClassName,
} from "../../ui-builder/designer-tree-workbench-classes";
import { useDataHooks } from "../data-hooks-context";
import { buildHookPreviewModel } from "./build-hook-preview-model.js";
import { HookPreviewFlow } from "./HookPreviewFlow.js";

type PreviewTab = "overview" | "details" | "advanced";

export function DataHookPreviewPanel() {
  const { t } = useTranslation("common");
  const { editor } = useDataHooks();
  const { items: entities } = useEntityCatalog();
  const [tab, setTab] = useState<PreviewTab>("overview");

  const definition = editor.selectedDefinition;
  const draft = editor.draft;

  const entityCatalogEntry = useMemo(
    () => entities.find((entry) => entry.name === editor.entityName),
    [entities, editor.entityName],
  );

  const model = useMemo(() => {
    if (!definition || !draft) {
      return null;
    }
    return buildHookPreviewModel(
      {
        name: definition.name,
        description: draft.description?.trim() || definition.description,
        entity: editor.entityName,
        phase: draft.phase,
        trigger: draft.trigger,
        condition: draft.condition,
        actions: draft.actions,
        chainHooks: draft.chainHooks,
        execution: draft.execution,
        enabled: draft.enabled,
      },
      {
        entityName: editor.entityName,
        entityLabel: (name) => {
          const entry = entities.find((item) => item.name === name);
          return entry ? getEntityLabel(entry) : name;
        },
        fieldLabel: (entityName, fieldPath) => {
          const entry = entities.find((item) => item.name === entityName);
          return formatFieldLabel(fieldPath, entry);
        },
        t: (key, options) => String(t(key as never, options as never)),
      },
    );
  }, [definition, draft, editor.entityName, entities, t]);

  const entityLabel = entityCatalogEntry
    ? getEntityLabel(entityCatalogEntry)
    : editor.entityName;

  const collapsedContent = definition ? (
    <Text className="text-muted-foreground break-words text-xs font-medium">
      {definition.name}
    </Text>
  ) : null;

  return (
    <ItemListDesignerTreePanelShell
      title={t("dataHooks.preview.panelTitle")}
      expandLabel={t("dataHooks.preview.expandPanel")}
      collapseLabel={t("dataHooks.preview.collapsePanel")}
      expandedClassName={cn(
        designerTreePanelShellClassName,
        "w-[32rem] shrink-0 min-w-0",
      )}
      collapsedClassName={designerTreePanelShellClassName}
      expandedBodyClassName="flex w-full min-w-0 flex-col overflow-x-hidden"
      collapsedContent={collapsedContent}
    >
      {!definition || !draft || !model ? (
        <Text className="text-muted-foreground px-2 py-3 text-sm">
          {t("dataHooks.preview.empty")}
        </Text>
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 px-1 py-1">
          <div className="min-w-0 px-1">
            <Text className="text-foreground text-base font-semibold">
              {model.name}
            </Text>
            <Text className="text-muted-foreground text-xs">{entityLabel}</Text>
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
            <HookPreviewFlow model={model} mode={tab} />
          </div>
        </div>
      )}
    </ItemListDesignerTreePanelShell>
  );
}
