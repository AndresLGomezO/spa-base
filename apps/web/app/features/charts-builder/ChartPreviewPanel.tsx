import { useEffect, useMemo, useState } from "react";
import { LineAreaChart } from "@repo/ui-charts";
import { Button, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { useChartData } from "../ui-builder/chart-data/useChartData.js";
import {
  areChartPreviewInputsComplete,
  buildChartPreviewRuntime,
} from "./chart-preview-input-model.js";
import { ChartPreviewInputsPanel } from "./ChartPreviewInputsPanel.js";
import type { ChartDefinitionDraft } from "./chart-definition-draft.js";
import { useChartDefinitionPreview } from "./use-chart-definition-preview.js";
import { useChartPreviewInputs } from "./use-chart-preview-inputs.js";

interface ChartPreviewSectionProps {
  readonly draft: ChartDefinitionDraft;
  readonly definitionId: string;
}

export function ChartPreviewSection({
  draft,
  definitionId,
}: ChartPreviewSectionProps) {
  const { t } = useTranslation("common");
  const { resolvedConfig, needsLiveFetch } = useChartDefinitionPreview(
    draft,
    definitionId,
  );
  const { fields, defaultValues } = useChartPreviewInputs(draft);
  const [inputValues, setInputValues] =
    useState<Record<string, string>>(defaultValues);
  const [hasRun, setHasRun] = useState(!needsLiveFetch);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setInputValues(defaultValues);
    setHasRun(!needsLiveFetch);
    setRefreshKey(0);
  }, [defaultValues, definitionId, needsLiveFetch]);

  const previewRuntime = useMemo(
    () => buildChartPreviewRuntime(draft, resolvedConfig, fields, inputValues),
    [draft, fields, inputValues, resolvedConfig],
  );

  const inputsComplete = areChartPreviewInputsComplete(fields, inputValues);

  const { series, loading, error } = useChartData({
    config: previewRuntime.config,
    context: previewRuntime.context,
    previewMode: needsLiveFetch && !hasRun,
    refreshKey,
  });

  const showPlaceholder = needsLiveFetch && !hasRun;

  function handleInputChange(key: string, value: string) {
    setInputValues((current) => ({ ...current, [key]: value }));
  }

  function handleRunOrRefresh() {
    if (!hasRun) {
      setHasRun(true);
      return;
    }
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <Text className="text-sm font-medium">
            {t("charts.workbench.preview.title")}
          </Text>
          {needsLiveFetch && showPlaceholder ? (
            <Text className="text-muted-foreground text-xs">
              {t("charts.workbench.preview.hint")}
            </Text>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={loading}
          disabled={needsLiveFetch && !inputsComplete}
          onClick={() => void handleRunOrRefresh()}
        >
          {hasRun
            ? t("charts.workbench.preview.refresh")
            : t("charts.workbench.preview.run")}
        </Button>
      </div>

      <ChartPreviewInputsPanel
        fields={fields}
        values={inputValues}
        onChange={handleInputChange}
      />

      {!inputsComplete && fields.length > 0 ? (
        <Text className="text-muted-foreground text-xs">
          {t("charts.workbench.previewInputs.incomplete")}
        </Text>
      ) : null}

      {error ? (
        <Text className="text-destructive shrink-0 text-sm">
          {error.message}
        </Text>
      ) : null}

      <div className="border-border bg-muted/20 h-48 shrink-0 overflow-hidden rounded-md border">
        <LineAreaChart
          chartType={previewRuntime.config.chartType}
          series={series}
          xAxis={previewRuntime.config.xAxis}
          yAxis={previewRuntime.config.yAxis}
          legend={previewRuntime.config.legend}
          grid={previewRuntime.config.grid}
          animation={previewRuntime.config.animation}
          ariaLabel={draft.name}
          loading={loading}
          className="h-full w-full"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Text className="text-sm font-medium">
          {t("charts.workbench.dataPreview.title")}
        </Text>
        <div className="space-y-3">
          <div>
            <Text className="text-muted-foreground mb-1 text-xs">
              {t("charts.workbench.dataPreview.source")}
            </Text>
            <pre className="bg-muted/30 overflow-x-auto rounded-md p-2 text-xs">
              {JSON.stringify(draft.dataSource, null, 2)}
            </pre>
          </div>
          <div>
            <Text className="text-muted-foreground mb-1 text-xs">
              {t("charts.workbench.dataPreview.context")}
            </Text>
            <pre className="bg-muted/30 overflow-x-auto rounded-md p-2 text-xs">
              {JSON.stringify(previewRuntime.context, null, 2)}
            </pre>
          </div>
          <div>
            <Text className="text-muted-foreground mb-1 text-xs">
              {t("charts.workbench.dataPreview.renderedSeries")}
            </Text>
            <pre className="bg-muted/30 overflow-x-auto rounded-md p-2 text-xs">
              {showPlaceholder
                ? t("charts.workbench.preview.notRunYet")
                : JSON.stringify(series, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
