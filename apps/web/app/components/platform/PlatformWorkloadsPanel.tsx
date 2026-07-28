import { useCallback, useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Alert, Text } from "@repo/ui";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import { SettingsPanelSkeleton } from "../loading/SettingsPanelSkeleton";
import { listWorkloads } from "../../lib/admin-client";
import {
  designerPreviewColumnClassName,
  designerTreeTabRootClassName,
  designerTreeWorkbenchClassName,
} from "../../features/ui-builder/designer-tree-workbench-classes";
import { parseCsvParam, WorkloadListTreePanel } from "./WorkloadListTreePanel";
import { WorkloadDetailPanel } from "./WorkloadDetailPanel";
import {
  filterWorkloadsByScheduleMeta,
  isCatalogWorkload,
  partitionWorkloads,
  sortWorkloads,
  type WorkloadListSort,
} from "./workload-ui-shared";

function setOrDeleteParam(params: URLSearchParams, key: string, value: string) {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

function parseHourParam(value: string | null): number[] {
  return parseCsvParam(value)
    .map((part) => Number(part))
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23);
}

export function PlatformWorkloadsPanel() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const kindParam = searchParams.get("kind") ?? "";
  const sourceParam = searchParams.get("source") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const domainParam = searchParams.get("domain") ?? "";
  const frequencyParam = searchParams.get("frequency") ?? "";
  const hourParam = searchParams.get("hour") ?? "";
  const kinds = useMemo(() => parseCsvParam(kindParam), [kindParam]);
  const sources = useMemo(() => parseCsvParam(sourceParam), [sourceParam]);
  const statuses = useMemo(() => parseCsvParam(statusParam), [statusParam]);
  const domains = useMemo(() => parseCsvParam(domainParam), [domainParam]);
  const frequencies = useMemo(
    () => parseCsvParam(frequencyParam),
    [frequencyParam],
  );
  const hours = useMemo(() => parseHourParam(hourParam), [hourParam]);
  const sort = (searchParams.get("sort") as WorkloadListSort) || "name";
  const selectedId = searchParams.get("workload");
  const view = searchParams.get("view");
  const catalogView = view === "catalog" && !selectedId;

  // Kind/status/domain/schedule filtered client-side on ops only so catalog
  // handlers remain available for Catalog + related-handler lookup.
  const filters = useMemo(
    () => ({
      q: q || undefined,
      source: sourceParam || undefined,
    }),
    [q, sourceParam],
  );

  const workloadsQuery = useQuery({
    queryKey: ["platform-workloads", filters],
    queryFn: () => listWorkloads(filters),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  });

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            setOrDeleteParam(next, key, value);
          }
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );

  const selectWorkload = useCallback(
    (id: string) => {
      updateParams({ workload: id, view: "" });
    },
    [updateParams],
  );

  const clearSelection = useCallback(() => {
    updateParams({ workload: "", view: "" });
  }, [updateParams]);

  const openCatalog = useCallback(() => {
    updateParams({ workload: "", view: "catalog" });
  }, [updateParams]);

  const backFromDetail = useCallback(() => {
    const selected = (workloadsQuery.data ?? []).find(
      (workload) => workload.id === selectedId,
    );
    if (selected && isCatalogWorkload(selected)) {
      openCatalog();
      return;
    }
    clearSelection();
  }, [workloadsQuery.data, selectedId, openCatalog, clearSelection]);

  const clearFilters = useCallback(() => {
    updateParams({
      q: "",
      kind: "",
      source: "",
      status: "",
      domain: "",
      frequency: "",
      hour: "",
    });
  }, [updateParams]);

  const refreshWorkloads = useCallback(() => {
    void workloadsQuery.refetch();
  }, [workloadsQuery]);

  const { operational, catalog } = useMemo(() => {
    const all = workloadsQuery.data ?? [];
    return partitionWorkloads(all);
  }, [workloadsQuery.data]);

  const sortNow = useMemo(() => {
    // Bucket to the current minute so "Next to run" order stays stable across
    // 10s list refetches within the same minute.
    const date = new Date();
    date.setSeconds(0, 0);
    return date;
    // Recompute when list data updates (status/nextRunTime may change).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional bucket keyed by dataUpdatedAt
  }, [workloadsQuery.dataUpdatedAt]);

  const operationalFiltered = useMemo(() => {
    let items = operational;
    if (kinds.length > 0) {
      const kindSet = new Set(kinds);
      items = items.filter((w) => kindSet.has(w.kind));
    }
    if (statuses.length > 0) {
      const statusSet = new Set(statuses);
      items = items.filter((w) => statusSet.has(w.state.status));
    }
    items = filterWorkloadsByScheduleMeta(items, {
      domains,
      frequencies,
      hours,
    });
    return sortWorkloads(items, sort, sortNow);
  }, [
    operational,
    kinds,
    statuses,
    domains,
    frequencies,
    hours,
    sort,
    sortNow,
  ]);

  const catalogSorted = useMemo(
    () => sortWorkloads(catalog, sort, sortNow),
    [catalog, sort, sortNow],
  );

  const parentLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const workload of workloadsQuery.data ?? []) {
      map.set(workload.id, workload.displayName);
    }
    return map;
  }, [workloadsQuery.data]);

  if (workloadsQuery.isLoading && workloadsQuery.data == null) {
    return <SettingsPanelSkeleton />;
  }

  if (workloadsQuery.isError) {
    return <Alert>{t("platform.workloads.loadFailed")}</Alert>;
  }

  return (
    <div className={designerTreeTabRootClassName}>
      <div className={designerTreeWorkbenchClassName}>
        <WorkloadListTreePanel
          workloads={operationalFiltered}
          selectedId={selectedId}
          catalogSelected={catalogView}
          search={q}
          kinds={kinds}
          sources={sources}
          statuses={statuses}
          domains={domains}
          frequencies={frequencies}
          hours={hours}
          sort={sort}
          isRefreshing={workloadsQuery.isFetching}
          onSearchChange={(value) => updateParams({ q: value })}
          onKindsChange={(values) => updateParams({ kind: values.join(",") })}
          onSourcesChange={(values) =>
            updateParams({ source: values.join(",") })
          }
          onStatusesChange={(values) =>
            updateParams({ status: values.join(",") })
          }
          onDomainsChange={(values) =>
            updateParams({ domain: values.join(",") })
          }
          onFrequenciesChange={(values) =>
            updateParams({ frequency: values.join(",") })
          }
          onHoursChange={(values) => updateParams({ hour: values.join(",") })}
          onSortChange={(value) =>
            updateParams({ sort: value === "name" ? "" : value })
          }
          onSelect={selectWorkload}
          onClearSelection={clearSelection}
          onOpenCatalog={openCatalog}
          onRefresh={refreshWorkloads}
          onClearFilters={clearFilters}
        />
        <div className={designerPreviewColumnClassName}>
          {workloadsQuery.isFetching && !workloadsQuery.isLoading ? (
            <Text className="text-muted-foreground sr-only">
              {t("platform.workloads.refreshing")}
            </Text>
          ) : null}
          <WorkloadDetailPanel
            workloadId={selectedId}
            catalogView={catalogView}
            operationalWorkloads={operationalFiltered}
            catalogHandlers={catalogSorted}
            parentLabels={parentLabels}
            onClearSelection={backFromDetail}
            onSelect={selectWorkload}
            onRefresh={refreshWorkloads}
            isRefreshing={workloadsQuery.isFetching}
            lastUpdatedAt={workloadsQuery.dataUpdatedAt || null}
          />
        </div>
      </div>
    </div>
  );
}
