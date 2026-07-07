import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";

import type { MetricDefinitionsCatalogEnvelope } from "@repo/metrics-engine/browser";
import { useDataViewWithPagination } from "@repo/data-view";
import { Button, DataTable, IconButton, Text, toast } from "@repo/ui";

import {
  isApiClientError,
  putMetricDefinitionsCatalog,
  type MetricDefinitionRecord,
} from "../../lib/api-client";
import { useTablePaginationLabels } from "../data-table/use-table-pagination-labels";
import {
  WebDataViewToolbar,
  type DataViewColumnDescriptor,
} from "../data-view";
import { formatAggregationLabel } from "./metric-field-utils";
import { useJsonActionTriggerLabels } from "../json/json-action-trigger-labels";
import { metricDefinitionsCatalogJsonLabels } from "./json/metric-definition-json-labels";
import { MetricDefinitionsCatalogJsonImportDialog } from "./json/MetricDefinitionsCatalogJsonImportDialog";
import { MetricDefinitionsCatalogJsonViewDialog } from "./json/MetricDefinitionsCatalogJsonViewDialog";
import { IndexEnvironmentBlockedNotice } from "../index-provisioning/IndexEnvironmentBlockedNotice";
import { useTenantIndexReadiness } from "../../hooks/useTenantIndexReadiness";

function formatMetricStatus(
  status: MetricDefinitionRecord["status"],
  t: (
    key: "metrics.statusValues.ACTIVE" | "metrics.statusValues.PAUSED",
  ) => string,
): string {
  return status === "ACTIVE"
    ? t("metrics.statusValues.ACTIVE")
    : t("metrics.statusValues.PAUSED");
}

interface MetricDefinitionListProps {
  readonly items: readonly MetricDefinitionRecord[];
  readonly isLoading: boolean;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canBackfill?: boolean;
  readonly onCreate: () => void;
  readonly onEdit: (id: string) => void;
  readonly onCatalogReplaced?: () => void;
}

export function MetricDefinitionList({
  items,
  isLoading,
  canCreate,
  canUpdate,
  canBackfill = false,
  onCreate,
  onEdit,
  onCatalogReplaced,
}: MetricDefinitionListProps) {
  const { t } = useTranslation("common");
  const paginationLabels = useTablePaginationLabels();
  const catalogLabels = useMemo(
    () => metricDefinitionsCatalogJsonLabels(t),
    [t],
  );
  const triggerLabels = useJsonActionTriggerLabels();
  const canReplaceCatalog = canCreate && canUpdate && canBackfill;
  const { isEnvironmentReady, buildingCollections } = useTenantIndexReadiness();

  const handleCatalogImport = useCallback(
    async (catalog: MetricDefinitionsCatalogEnvelope) => {
      try {
        await putMetricDefinitionsCatalog(catalog);
        toast.success(catalogLabels.importSuccess);
        onCatalogReplaced?.();
      } catch (importError) {
        toast.error(
          isApiClientError(importError)
            ? importError.message
            : catalogLabels.importFailed,
        );
      }
    },
    [
      catalogLabels.importFailed,
      catalogLabels.importSuccess,
      onCatalogReplaced,
    ],
  );

  const columns = useMemo<
    readonly DataViewColumnDescriptor<MetricDefinitionRecord>[]
  >(
    () => [
      {
        id: "name",
        label: t("metrics.name"),
        getValue: (item) => item.name,
      },
      {
        id: "description",
        label: t("metrics.descriptionLabel"),
        getValue: (item) => item.description ?? "",
      },
      {
        id: "sourceModel",
        label: t("metrics.sourceModel"),
        getValue: (item) =>
          item.sourceQueryDefinitionId
            ? `${item.sourceModel} (${t("metrics.sourceTypes.query")})`
            : item.sourceModel,
      },
      {
        id: "operation",
        label: t("metrics.operation"),
        getValue: (item) => formatAggregationLabel(item.aggregations),
      },
      {
        id: "version",
        label: t("metrics.version"),
        getValue: (item) => item.version,
      },
      {
        id: "status",
        label: t("metrics.status"),
        getValue: (item) => item.status,
        formatValue: (value) =>
          formatMetricStatus(value as MetricDefinitionRecord["status"], t),
      },
    ],
    [t],
  );

  const dataView = useDataViewWithPagination(items, columns);

  if (isLoading) {
    return (
      <Text className="text-muted-foreground text-sm">{t("loading")}</Text>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <MetricDefinitionsCatalogJsonViewDialog
          items={items}
          labels={catalogLabels}
          triggerLabels={triggerLabels}
        />
        <MetricDefinitionsCatalogJsonImportDialog
          existingItems={items}
          canApply={canReplaceCatalog}
          importDisabled={!isEnvironmentReady}
          labels={catalogLabels}
          triggerLabels={triggerLabels}
          onApply={(catalog) => void handleCatalogImport(catalog)}
        />
        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            {t("metrics.create")}
          </Button>
        ) : null}
      </div>

      {!isEnvironmentReady ? (
        <IndexEnvironmentBlockedNotice
          feature="import"
          buildingCollections={buildingCollections}
        />
      ) : null}

      <WebDataViewToolbar
        {...dataView}
        columns={columns}
        filtersOpen={dataView.filtersOpen}
        onFiltersOpenChange={dataView.setFiltersOpen}
      />

      <DataTable
        columns={[
          {
            id: "name",
            header: t("metrics.name"),
            cell: (item) => item.name,
          },
          {
            id: "description",
            header: t("metrics.descriptionLabel"),
            cell: (item) => item.description ?? "—",
          },
          {
            id: "sourceModel",
            header: t("metrics.sourceModel"),
            cell: (item) => (
              <span className="font-mono">
                {item.sourceQueryDefinitionId
                  ? `${item.sourceModel} (${t("metrics.sourceTypes.query")})`
                  : item.sourceModel}
              </span>
            ),
          },
          {
            id: "operation",
            header: t("metrics.operation"),
            cell: (item) => (
              <span className="font-mono">
                {formatAggregationLabel(item.aggregations)}
              </span>
            ),
          },
          {
            id: "version",
            header: t("metrics.version"),
            cell: (item) => (
              <span className="tabular-nums">{item.version}</span>
            ),
          },
          {
            id: "status",
            header: t("metrics.status"),
            cell: (item) => formatMetricStatus(item.status, t),
          },
        ]}
        rows={dataView.pageItems}
        getRowId={(item) => item.id}
        page={dataView.page}
        totalCount={dataView.totalCount}
        onPageChange={dataView.setPage}
        emptyMessage={t("metrics.empty")}
        loadingMessage={t("table.loading")}
        paginationLabels={paginationLabels}
        aria-label={t("metrics.title")}
        actionsColumn={
          canUpdate
            ? {
                id: "actions",
                header: t("entity.actions"),
                headerClassName: "text-center",
                cell: (item) => (
                  <IconButton
                    type="button"
                    label={t("entity.edit")}
                    onClick={() => onEdit(item.id)}
                  >
                    <Pencil className="size-4" />
                  </IconButton>
                ),
              }
            : undefined
        }
      />
    </div>
  );
}
