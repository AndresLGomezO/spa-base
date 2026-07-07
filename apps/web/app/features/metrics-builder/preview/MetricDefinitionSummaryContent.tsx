import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "@repo/ui";

import {
  formatFieldLabel,
  getEntityLabel,
} from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import type { MetricDefinitionDraft } from "../../../components/metrics/metric-definition-draft";
import { MetricComputationPreview } from "../../../components/metrics/MetricComputationPreview";
import type {
  EntityQueryDefinitionRecord,
  MetricDefinitionRecord,
} from "../../../lib/api-client";
import {
  formatMetricDefinitionOptionLabel,
  resolveMetricDefinitionDocumentId,
} from "../../../lib/resolve-metric-definition-reference";
import {
  buildMetricPreviewModel,
  formatMetricAdvancedPreview,
} from "./build-metric-preview-model.js";
import { MetricPreviewFlow } from "./MetricPreviewFlow.js";
import type {
  MetricPreviewBuildContext,
  MetricSummaryMode,
} from "./metric-preview-types.js";

interface MetricDefinitionSummaryContentProps {
  readonly name: string;
  readonly description?: string;
  readonly draft: MetricDefinitionDraft;
  readonly status: "ACTIVE" | "PAUSED";
  readonly metricDefinitions: readonly MetricDefinitionRecord[];
  readonly queryDefinitions: readonly EntityQueryDefinitionRecord[];
  readonly mode?: MetricSummaryMode;
}

export function MetricDefinitionSummaryContent({
  name,
  description,
  draft,
  status,
  metricDefinitions,
  queryDefinitions,
  mode = "overview",
}: MetricDefinitionSummaryContentProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();

  const previewContext = useMemo((): MetricPreviewBuildContext => {
    const metricLabelById = new Map<string, string>();
    for (const definition of metricDefinitions) {
      const label = formatMetricDefinitionOptionLabel(definition);
      metricLabelById.set(definition.id, label);
      metricLabelById.set(definition.metricId, label);
      metricLabelById.set(definition.name, label);
    }

    const queryLabelById = new Map<string, string>();
    for (const query of queryDefinitions) {
      queryLabelById.set(query.id, `${query.name} (${query.sourceEntity})`);
    }

    return {
      entityLabel: (entityName) => {
        const entry = entities.find((item) => item.name === entityName);
        return entry ? getEntityLabel(entry) : entityName;
      },
      fieldLabel: (entityName, fieldPath) => {
        const entry = entities.find((item) => item.name === entityName);
        return formatFieldLabel(fieldPath, entry);
      },
      queryLabel: (queryId) => queryLabelById.get(queryId) ?? queryId,
      metricLabel: (metricId) => {
        const resolvedId = resolveMetricDefinitionDocumentId(
          metricId,
          metricDefinitions,
        );
        if (resolvedId) {
          return metricLabelById.get(resolvedId) ?? metricId;
        }
        return metricLabelById.get(metricId) ?? metricId;
      },
      t: (key, options) => String(t(key as never, options as never)),
    };
  }, [entities, metricDefinitions, queryDefinitions, t]);

  const model = useMemo(
    () =>
      buildMetricPreviewModel(
        { name, description, draft, status },
        previewContext,
      ),
    [description, draft, name, previewContext, status],
  );

  const advancedPreview = useMemo(
    () => formatMetricAdvancedPreview(draft, previewContext),
    [draft, previewContext],
  );

  if (mode === "overview" || mode === "details") {
    return <MetricPreviewFlow model={model} mode={mode} />;
  }

  return (
    <div className="space-y-4">
      <Text className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {t("metrics.preview.advanced.title")}
      </Text>
      {draft.computationMode === "computed" && draft.computation ? (
        <MetricComputationPreview
          parameters={draft.parameters}
          computation={draft.computation}
          metricDefinitions={metricDefinitions}
          queryDefinitions={queryDefinitions}
          showTitle={false}
        />
      ) : (
        <pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
          {advancedPreview}
        </pre>
      )}
    </div>
  );
}

export type { MetricSummaryMode };
