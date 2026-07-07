import { useEffect, useMemo, useState } from "react";
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
import {
  listEntityQueryDefinitions,
  type EntityQueryDefinitionRecord,
} from "../../../lib/api-client";
import { useMetrics } from "../metrics-context";
import { buildMetricPreviewModel } from "./build-metric-preview-model.js";
import {
  MetricDefinitionSummaryContent,
  type MetricSummaryMode,
} from "./MetricDefinitionSummaryContent.js";

export function MetricPreviewPanel() {
  const { t } = useTranslation("common");
  const { editor } = useMetrics();
  const { items: entities } = useEntityCatalog();
  const [tab, setTab] = useState<MetricSummaryMode>("overview");
  const [queryDefinitions, setQueryDefinitions] = useState<
    readonly EntityQueryDefinitionRecord[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    void listEntityQueryDefinitions()
      .then((result) => {
        if (!cancelled) {
          setQueryDefinitions(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQueryDefinitions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const definition = editor.selectedDefinition;
  const draft = editor.draft;

  const previewContext = useMemo(
    () => ({
      entityLabel: (name: string) => {
        const entry = entities.find((item) => item.name === name);
        return entry ? getEntityLabel(entry) : name;
      },
      fieldLabel: (entityName: string, fieldPath: string) => {
        const entry = entities.find((item) => item.name === entityName);
        return formatFieldLabel(fieldPath, entry);
      },
      queryLabel: (queryId: string) => {
        const query = queryDefinitions.find((entry) => entry.id === queryId);
        return query ? `${query.name} (${query.sourceEntity})` : queryId;
      },
      metricLabel: (metricId: string) => metricId,
      t: (key: string, options?: Record<string, unknown>) =>
        String(t(key as never, options as never)),
    }),
    [entities, queryDefinitions, t],
  );

  const model = useMemo(() => {
    if (!definition || !draft) {
      return null;
    }
    return buildMetricPreviewModel(
      {
        name: definition.name,
        description: draft.description.trim() || definition.description,
        draft,
        status: draft.status,
      },
      previewContext,
    );
  }, [definition, draft, previewContext]);

  const collapsedContent = definition ? (
    <Text className="text-muted-foreground break-words text-xs font-medium">
      {definition.name}
    </Text>
  ) : null;

  return (
    <ItemListDesignerTreePanelShell
      title={t("metrics.preview.panelTitle")}
      expandLabel={t("metrics.preview.expandPanel")}
      collapseLabel={t("metrics.preview.collapsePanel")}
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
          {t("metrics.preview.empty")}
        </Text>
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 px-1 py-1">
          <div className="min-w-0 px-1">
            <Text className="text-foreground text-base font-semibold">
              {model.name}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {draft.computationMode === "computed"
                ? t("metrics.workbench.list.modeComputed")
                : t("metrics.workbench.list.modeAggregated")}
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
            <MetricDefinitionSummaryContent
              name={definition.name}
              description={draft.description.trim() || definition.description}
              draft={draft}
              status={draft.status}
              metricDefinitions={editor.definitions}
              queryDefinitions={queryDefinitions}
              mode={tab}
            />
          </div>
        </div>
      )}
    </ItemListDesignerTreePanelShell>
  );
}
