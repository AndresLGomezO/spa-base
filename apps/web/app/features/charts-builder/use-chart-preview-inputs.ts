import { useMemo } from "react";

import { useActiveMetricDefinitions } from "../../hooks/metrics/useActiveMetricDefinitions.js";
import { useEntityQueryDefinitions } from "../../hooks/useEntityQueryDefinitions.js";
import { resolveEntityQueryDefinitionDocumentId } from "../../lib/resolve-entity-query-definition-reference.js";
import { resolveMetricDefinitionDocumentId } from "../../lib/resolve-metric-definition-reference.js";
import {
  createDefaultPreviewInputValues,
  resolveChartPreviewInputFields,
} from "./chart-preview-input-model.js";
import type { ChartDefinitionDraft } from "./chart-definition-draft.js";

export function useChartPreviewInputs(draft: ChartDefinitionDraft) {
  const entityQueryDefinitionsQuery = useEntityQueryDefinitions(true);
  const metricDefinitionsQuery = useActiveMetricDefinitions(true);
  const entityQueryDefinitions = useMemo(
    () => entityQueryDefinitionsQuery.data ?? [],
    [entityQueryDefinitionsQuery.data],
  );
  const metricDefinitions = useMemo(
    () => metricDefinitionsQuery.data ?? [],
    [metricDefinitionsQuery.data],
  );

  const entityQueryDefinition = useMemo(() => {
    if (draft.dataSource.type !== "entityQuery") {
      return undefined;
    }
    const resolvedId = resolveEntityQueryDefinitionDocumentId(
      draft.dataSource.entityQueryDefinitionId,
      entityQueryDefinitions,
    );
    return entityQueryDefinitions.find((entry) => entry.id === resolvedId);
  }, [draft.dataSource, entityQueryDefinitions]);

  const metricDefinition = useMemo(() => {
    if (draft.dataSource.type !== "metricSeries") {
      return undefined;
    }
    const resolvedId = resolveMetricDefinitionDocumentId(
      draft.dataSource.metricDefinitionId,
      metricDefinitions,
    );
    return metricDefinitions.find((entry) => entry.id === resolvedId);
  }, [draft.dataSource, metricDefinitions]);

  const fields = useMemo(
    () =>
      resolveChartPreviewInputFields(
        draft,
        entityQueryDefinition,
        metricDefinition,
      ),
    [draft, entityQueryDefinition, metricDefinition],
  );

  const defaultValues = useMemo(
    () => createDefaultPreviewInputValues(fields, draft),
    [draft, fields],
  );

  return {
    fields,
    defaultValues,
    isLoading:
      (draft.dataSource.type === "entityQuery" &&
        entityQueryDefinitionsQuery.isLoading) ||
      (draft.dataSource.type === "metricSeries" &&
        metricDefinitionsQuery.isLoading),
  };
}
