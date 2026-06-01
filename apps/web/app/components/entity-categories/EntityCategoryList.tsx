import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button, DataTable, Heading } from "@repo/ui";
import { useDataViewWithPagination } from "@repo/data-view";

import type { EntityCategoryRecord } from "../../lib/api-client";
import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";
import { useTablePaginationLabels } from "../data-table/use-table-pagination-labels";
import {
  WebDataViewToolbar,
  type DataViewColumnDescriptor,
} from "../data-view";

interface EntityCategoryListProps {
  readonly items: readonly EntityCategoryRecord[];
  readonly isLoading: boolean;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly onCreate: () => void;
  readonly onEdit: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

export function EntityCategoryList({
  items,
  isLoading,
  canCreate,
  canUpdate,
  onCreate,
  onEdit,
  onDelete,
}: EntityCategoryListProps) {
  const { t } = useTranslation("common");
  const paginationLabels = useTablePaginationLabels();

  const columns = useMemo<
    readonly DataViewColumnDescriptor<EntityCategoryRecord>[]
  >(
    () => [
      {
        id: "name",
        label: t("entityCategories.name"),
        getValue: (item) => item.name,
      },
      {
        id: "icon",
        label: t("entityCategories.icon"),
        getValue: (item) => item.icon,
        filterable: false,
      },
      {
        id: "order",
        label: t("entityCategories.order"),
        getValue: (item) => item.order,
      },
    ],
    [t],
  );

  const dataView = useDataViewWithPagination(items, columns);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("loading")}</p>;
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Heading level={2}>{t("entityCategories.listTitle")}</Heading>
        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            {t("entityCategories.create")}
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
            id: "icon",
            header: t("entityCategories.icon"),
            cell: (item) => {
              const Icon = resolveLucideIcon(item.icon);
              return <Icon className="size-4" aria-hidden />;
            },
          },
          {
            id: "name",
            header: t("entityCategories.name"),
            cell: (item) => item.name,
          },
          {
            id: "order",
            header: t("entityCategories.order"),
            cell: (item) => item.order,
          },
        ]}
        rows={dataView.pageItems}
        getRowId={(item) => item.id}
        page={dataView.page}
        totalCount={dataView.totalCount}
        onPageChange={dataView.setPage}
        emptyMessage={t("entityCategories.empty")}
        loadingMessage={t("table.loading")}
        paginationLabels={paginationLabels}
        actionsColumn={
          canUpdate
            ? {
                id: "actions",
                header: t("entity.actions"),
                cell: (item) => (
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(item.id)}
                    >
                      {t("entityCategories.edit")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(item.id)}
                    >
                      {t("entityCategories.delete")}
                    </Button>
                  </div>
                ),
              }
            : undefined
        }
      />
    </div>
  );
}
