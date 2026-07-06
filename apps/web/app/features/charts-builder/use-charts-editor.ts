import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { ChartType } from "@repo/ui-builder-core";

import {
  buildDraftFromChartRecord,
  createDefaultChartDefinitionDraft,
  isChartDraftDirty,
  type ChartDefinitionDraft,
} from "./chart-definition-draft.js";
import {
  createChartDefinition,
  listChartDefinitions,
  patchChartDefinition,
  type ChartDefinitionRecord,
  type CreateChartDefinitionInput,
  type PatchChartDefinitionInput,
} from "../../lib/api-client.js";

const CHART_SELECTION_SEARCH_PARAM = "chart";

function getChartSelectionId(searchParams: URLSearchParams): string {
  return searchParams.get(CHART_SELECTION_SEARCH_PARAM)?.trim() ?? "";
}

function applyChartSelectionToSearchParams(
  searchParams: URLSearchParams,
  chartId: string,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  const trimmed = chartId.trim();
  if (trimmed.length === 0) {
    next.delete(CHART_SELECTION_SEARCH_PARAM);
  } else {
    next.set(CHART_SELECTION_SEARCH_PARAM, trimmed);
  }
  return next;
}

function validateChartDraftForSave(draft: ChartDefinitionDraft): string | null {
  if (!draft.name.trim()) {
    return "Name is required.";
  }
  if (draft.dataSource.type === "entityQuery") {
    if (!draft.dataSource.entityQueryDefinitionId.trim()) {
      return "Entity query is required.";
    }
    if (
      !draft.dataSource.xFieldPath.trim() ||
      !draft.dataSource.yFieldPath.trim()
    ) {
      return "X and Y field paths are required.";
    }
  }
  if (
    draft.dataSource.type === "metricSeries" &&
    !draft.dataSource.metricDefinitionId.trim()
  ) {
    return "Metric definition is required.";
  }
  return null;
}

export function useChartsEditor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [definitions, setDefinitions] = useState<
    readonly ChartDefinitionRecord[]
  >([]);
  const [draft, setDraft] = useState<ChartDefinitionDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedId = getChartSelectionId(searchParams);

  const setSelectedId = useCallback(
    (chartId: string) => {
      const next = applyChartSelectionToSearchParams(searchParams, chartId);
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
    return isChartDraftDirty(draft, selectedDefinition);
  }, [draft, selectedDefinition]);

  const loadDefinitions = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listChartDefinitions();
      const items = [...result.items].sort((left, right) =>
        left.name.localeCompare(right.name),
      );
      setDefinitions(items);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load charts.",
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
        const next = applyChartSelectionToSearchParams(searchParams, "");
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
    const next = applyChartSelectionToSearchParams(searchParams, fallbackId);
    setSearchParams(next, { replace: true });
  }, [definitions, isLoading, searchParams, selectedId, setSearchParams]);

  useEffect(() => {
    if (!selectedDefinition) {
      setDraft(null);
      return;
    }
    setDraft(buildDraftFromChartRecord(selectedDefinition));
  }, [selectedDefinition]);

  const updateDraft = useCallback((patch: Partial<ChartDefinitionDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const saveSelectedChart = useCallback(async (): Promise<string | null> => {
    if (!selectedDefinition || !draft) {
      return null;
    }

    const validationError = validateChartDraftForSave(draft);
    if (validationError) {
      return validationError;
    }

    setIsSaving(true);
    try {
      const updated = await patchChartDefinition(selectedDefinition.id, {
        name: draft.name.trim(),
        ...(draft.description.trim()
          ? { description: draft.description.trim() }
          : { description: "" }),
        chartType: draft.chartType,
        ...(draft.displayMode !== undefined
          ? { displayMode: draft.displayMode }
          : {}),
        dataSource: draft.dataSource as PatchChartDefinitionInput["dataSource"],
        ...(draft.series !== undefined
          ? { series: draft.series as PatchChartDefinitionInput["series"] }
          : {}),
        ...(draft.xAxis !== undefined ? { xAxis: draft.xAxis } : {}),
        ...(draft.yAxis !== undefined ? { yAxis: draft.yAxis } : {}),
        ...(draft.legend !== undefined ? { legend: draft.legend } : {}),
        ...(draft.grid !== undefined ? { grid: draft.grid } : {}),
        ...(draft.animation !== undefined
          ? { animation: draft.animation }
          : {}),
        status: draft.status,
      });
      setDefinitions((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setDraft(buildDraftFromChartRecord(updated));
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to save chart.";
    } finally {
      setIsSaving(false);
    }
  }, [draft, selectedDefinition]);

  const createChart = useCallback(
    async (input: {
      readonly name: string;
      readonly chartType: ChartType;
    }): Promise<ChartDefinitionRecord | string> => {
      try {
        const draftInput = createDefaultChartDefinitionDraft(input);
        const created = await createChartDefinition({
          name: draftInput.name,
          chartType: draftInput.chartType,
          displayMode: draftInput.displayMode,
          dataSource:
            draftInput.dataSource as CreateChartDefinitionInput["dataSource"],
          series: draftInput.series as CreateChartDefinitionInput["series"],
          legend: draftInput.legend,
          xAxis: draftInput.xAxis,
          yAxis: draftInput.yAxis,
          grid: draftInput.grid,
          animation: draftInput.animation,
          status: draftInput.status,
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
          : "Failed to create chart.";
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
    saveSelectedChart,
    createChart,
  };
}
