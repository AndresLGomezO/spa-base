import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button, DataTable, Heading } from "@repo/ui";

import type { EntityDefinitionRecord } from "../../lib/api-client";
import { useDataViewWithPagination } from "@repo/data-view";
import { useTablePaginationLabels } from "../data-table/use-table-pagination-labels";
import {
  WebDataViewToolbar,
  type DataViewColumnDescriptor,
} from "../data-view";
import { DataModelsListSkeleton } from "../loading/DataModelsListSkeleton";

interface EntityDefinitionListProps {
  readonly items: readonly EntityDefinitionRecord[];
  readonly isLoading: boolean;
  readonly canCreate: boolean;
  readonly canUpdate?: boolean;
  readonly onCreate: () => void;
  readonly onEdit?: (id: string) => void;
}

export function EntityDefinitionList({
  items,
  isLoading,
  canCreate,
  canUpdate = false,
  onCreate,
  onEdit,
}: EntityDefinitionListProps) {
  const { t } = useTranslation("common");
  const paginationLabels = useTablePaginationLabels();

  const columns = useMemo<
    readonly DataViewColumnDescriptor<EntityDefinitionRecord>[]
  >(
    () => [
      {
        id: "name",
        label: t("dataModels.modelName"),
        getValue: (item) => item.name,
      },
      {
        id: "label",
        label: t("dataModels.modelLabel"),
        getValue: (item) => item.label,
      },
      {
        id: "fields",
        label: t("dataModels.fieldsTitle"),
        getValue: (item) => item.fields.length,
      },
      {
        id: "version",
        label: t("dataModels.version"),
        getValue: (item) => item.version,
      },
    ],
    [t],
  );

  const dataView = useDataViewWithPagination(items, columns);

  if (isLoading) {
    return <DataModelsListSkeleton />;
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Heading level={2}>{t("dataModels.listTitle")}</Heading>
        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            {t("dataModels.createModel")}
          </Button>
        ) : null}
      </div>

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
            header: t("dataModels.modelName"),
            cell: (item) => <span className="font-mono">{item.name}</span>,
          },
          {
            id: "label",
            header: t("dataModels.modelLabel"),
            cell: (item) => item.label,
          },
          {
            id: "fields",
            header: t("dataModels.fieldsTitle"),
            cell: (item) => item.fields.length,
          },
          {
            id: "version",
            header: t("dataModels.version"),
            cell: (item) => item.version,
          },
        ]}
        rows={dataView.pageItems}
        getRowId={(item) => item.id}
        page={dataView.page}
        totalCount={dataView.totalCount}
        onPageChange={dataView.setPage}
        emptyMessage={t("dataModels.empty")}
        loadingMessage={t("table.loading")}
        paginationLabels={paginationLabels}
        actionsColumn={
          canUpdate
            ? {
                id: "actions",
                header: t("entity.actions"),
                cell: (item) => (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(item.id)}
                  >
                    {t("entity.edit")}
                  </Button>
                ),
              }
            : undefined
        }
      />
    </div>
  );
}
