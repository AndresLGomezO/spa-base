import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { MetricComputationMode } from "@repo/metrics-engine/browser";

import {
  buildDraftFromMetricRecord,
  createDefaultComputedComputation,
  isDraftDirty,
  type MetricDefinitionDraft,
} from "../../components/metrics/metric-definition-draft";
import {
  mergeFieldsDependencyWithFilters,
  normalizeMetricFiltersForSave,
  operationRequiresNumericField,
  pruneDateFieldGranularity,
  validateClientDateFieldGranularity,
} from "../../components/metrics/metric-field-utils";
import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import {
  createMetricDefinition,
  listMetricDefinitions,
  patchMetricDefinition,
  type MetricDefinitionRecord,
} from "../../lib/api-client";
import { useEntityCatalog } from "../../entities/entity-catalog-context";

export const METRIC_SELECTION_SEARCH_PARAM = "metric";

export function getMetricSelectionId(searchParams: URLSearchParams): string {
  return searchParams.get(METRIC_SELECTION_SEARCH_PARAM)?.trim() ?? "";
}

export function applyMetricSelectionToSearchParams(
  searchParams: URLSearchParams,
  metricId: string,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  const trimmed = metricId.trim();
  if (trimmed.length === 0) {
    next.delete(METRIC_SELECTION_SEARCH_PARAM);
  } else {
    next.set(METRIC_SELECTION_SEARCH_PARAM, trimmed);
  }
  return next;
}

function buildAggregations(draft: MetricDefinitionDraft) {
  if (draft.computationMode === "computed") {
    return [{ operation: "COUNT" as const }];
  }

  if (draft.aggregationOperation === "COUNT") {
    return [{ operation: "COUNT" as const }];
  }

  return [
    {
      field: draft.aggregationField.trim(),
      operation: draft.aggregationOperation,
    },
  ];
}

function resolveFieldsDependency(
  draft: MetricDefinitionDraft,
  aggregations: ReturnType<typeof buildAggregations>,
): readonly string[] {
  if (draft.computationMode === "computed") {
    return [];
  }

  if (draft.fieldsDependency.length > 0) {
    return draft.fieldsDependency;
  }

  if (aggregations[0]?.operation === "COUNT") {
    return [];
  }

  return draft.aggregationField.trim() ? [draft.aggregationField.trim()] : [];
}

export function validateMetricDraftForSave(
  draft: MetricDefinitionDraft,
  selectedEntity: EntityCatalogEntry | undefined,
): string | null {
  if (!draft.name.trim()) {
    return "Name is required.";
  }

  if (!draft.sourceModel.trim()) {
    return "Source entity is required.";
  }

  if (draft.computationMode === "computed") {
    if (!draft.computation) {
      return "Computation is required for computed metrics.";
    }
    return null;
  }

  if (operationRequiresNumericField(draft.aggregationOperation)) {
    if (!draft.aggregationField.trim()) {
      return "Aggregation field is required.";
    }
  }

  const aggregations = buildAggregations(draft);
  const resolvedFieldsDependency = resolveFieldsDependency(draft, aggregations);
  if (
    aggregations[0]?.operation !== "COUNT" &&
    resolvedFieldsDependency.length === 0
  ) {
    return "Field dependencies are required.";
  }

  const missingDateGranularity = validateClientDateFieldGranularity(
    selectedEntity,
    draft.groupBy,
    draft.dimensions,
    draft.dateFieldGranularity,
  );
  if (missingDateGranularity) {
    return `Date split is required for ${missingDateGranularity}.`;
  }

  if (draft.sourceType !== "query") {
    const normalizedFilters = normalizeMetricFiltersForSave(
      draft.filterRows,
      selectedEntity,
    );
    if ("error" in normalizedFilters) {
      return `Enter a valid filter value for ${normalizedFilters.error}.`;
    }
  }

  return null;
}

export function useMetricsEditor() {
  const { items: entities } = useEntityCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [definitions, setDefinitions] = useState<
    readonly MetricDefinitionRecord[]
  >([]);
  const [draft, setDraft] = useState<MetricDefinitionDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedId = getMetricSelectionId(searchParams);

  const setSelectedId = useCallback(
    (metricId: string) => {
      const next = applyMetricSelectionToSearchParams(searchParams, metricId);
      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, { replace: true });
      }
    },
    [searchParams, setSearchParams],
  );

  const selectedDefinition = useMemo(
    () => definitions.find((entry) => entry.id === selectedId) ?? null,
    [definitions, selectedId],
  );

  const isDirty = useMemo(() => {
    if (!selectedDefinition || !draft) {
      return false;
    }
    return isDraftDirty(draft, selectedDefinition);
  }, [draft, selectedDefinition]);

  const loadDefinitions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listMetricDefinitions();
      const items = [...result.items].sort((left, right) =>
        left.name.localeCompare(right.name),
      );
      setDefinitions(items);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load metrics.",
      );
      setDefinitions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDefinitions();
  }, [loadDefinitions]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (definitions.length === 0) {
      if (selectedId.length > 0) {
        const next = applyMetricSelectionToSearchParams(searchParams, "");
        setSearchParams(next, { replace: true });
      }
      return;
    }

    const hasValidSelection = definitions.some(
      (definition) => definition.id === selectedId,
    );
    if (hasValidSelection) {
      return;
    }

    const fallbackId = definitions[0]?.id ?? "";
    const next = applyMetricSelectionToSearchParams(searchParams, fallbackId);
    setSearchParams(next, { replace: true });
  }, [definitions, isLoading, searchParams, selectedId, setSearchParams]);

  useEffect(() => {
    if (!selectedDefinition) {
      setDraft(null);
      return;
    }
    setDraft(buildDraftFromMetricRecord(selectedDefinition));
  }, [selectedDefinition]);

  const updateDraft = useCallback((patch: Partial<MetricDefinitionDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveSelectedMetric = useCallback(async (): Promise<string | null> => {
    if (!selectedDefinition || !draft) {
      return null;
    }

    const selectedEntity = entities.find(
      (entity) => entity.name === draft.sourceModel,
    );
    const validationError = validateMetricDraftForSave(draft, selectedEntity);
    if (validationError) {
      return validationError;
    }

    setIsSaving(true);
    try {
      const aggregations = buildAggregations(draft);
      const resolvedFieldsDependency = resolveFieldsDependency(
        draft,
        aggregations,
      );
      const resolvedDateFieldGranularity = pruneDateFieldGranularity(
        draft.dateFieldGranularity,
        draft.groupBy,
        draft.dimensions,
        selectedEntity,
      );

      if (draft.computationMode === "computed") {
        const updated = await patchMetricDefinition(selectedDefinition.id, {
          name: draft.name.trim(),
          ...(draft.description.trim()
            ? { description: draft.description.trim() }
            : { description: "" }),
          computationMode: "computed",
          parameters: [...draft.parameters],
          computation: draft.computation,
          aggregations,
          filters: [],
          groupBy: [],
          dimensions: [],
          dateFieldGranularity: {},
          valueDisplayFormat: draft.valueDisplayFormat,
          fieldsDependency: [],
          status: draft.status,
          version: selectedDefinition.version + 1,
        });
        setDefinitions((current) =>
          current.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        setDraft(buildDraftFromMetricRecord(updated));
        return null;
      }

      const normalizedFilters =
        draft.sourceType === "query"
          ? { filters: [] as const }
          : normalizeMetricFiltersForSave(draft.filterRows, selectedEntity);
      if ("error" in normalizedFilters) {
        return `Enter a valid filter value for ${normalizedFilters.error}.`;
      }

      const resolvedFilters = normalizedFilters.filters;
      const mergedFieldsDependency = mergeFieldsDependencyWithFilters(
        resolvedFieldsDependency,
        resolvedFilters,
      );

      const updated = await patchMetricDefinition(selectedDefinition.id, {
        name: draft.name.trim(),
        ...(draft.description.trim()
          ? { description: draft.description.trim() }
          : { description: "" }),
        computationMode: "aggregated",
        ...(draft.sourceType === "query" && draft.sourceQueryDefinitionId
          ? { sourceQueryDefinitionId: draft.sourceQueryDefinitionId }
          : {}),
        filters: [...resolvedFilters],
        groupBy: [...draft.groupBy],
        dimensions: [...draft.dimensions],
        dateFieldGranularity: resolvedDateFieldGranularity,
        valueDisplayFormat: draft.valueDisplayFormat,
        aggregations,
        fieldsDependency: [...mergedFieldsDependency],
        parameters: [],
        status: draft.status,
        version: selectedDefinition.version + 1,
      });
      setDefinitions((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setDraft(buildDraftFromMetricRecord(updated));
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to save metric.";
    } finally {
      setIsSaving(false);
    }
  }, [draft, entities, selectedDefinition]);

  const createMetric = useCallback(
    async (input: {
      readonly name: string;
      readonly description?: string;
      readonly computationMode: MetricComputationMode;
      readonly sourceModel: string;
    }): Promise<MetricDefinitionRecord | string> => {
      try {
        const isComputed = input.computationMode === "computed";
        const created = await createMetricDefinition({
          name: input.name.trim(),
          ...(input.description?.trim()
            ? { description: input.description.trim() }
            : {}),
          computationMode: input.computationMode,
          sourceModel: input.sourceModel,
          filters: [],
          groupBy: [],
          dimensions: [],
          dateFieldGranularity: {},
          valueDisplayFormat: isComputed ? "percent" : "number",
          aggregations: [{ operation: "COUNT" }],
          schemaVersionDependency: 1,
          fieldsDependency: [],
          parameters: isComputed ? [] : [],
          ...(isComputed
            ? { computation: createDefaultComputedComputation() }
            : {}),
          status: "ACTIVE",
          version: 1,
        });
        setDefinitions((current) =>
          [...current, created].sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );
        setSelectedId(created.id);
        return created;
      } catch (error) {
        return error instanceof Error
          ? error.message
          : "Failed to create metric.";
      }
    },
    [setSelectedId],
  );

  return {
    definitions,
    selectedId,
    setSelectedId,
    selectedDefinition,
    draft,
    updateDraft,
    isLoading,
    isSaving,
    isDirty,
    loadError,
    reloadDefinitions: loadDefinitions,
    saveSelectedMetric,
    createMetric,
  };
}
