import { useTranslation } from "react-i18next";

import { Button, DataTable, Heading } from "@repo/ui";

import type { EntityDefinitionRecord } from "../../lib/api-client";
import { useClientPagination } from "../../hooks/useClientPagination";
import { useTablePaginationLabels } from "../data-table/use-table-pagination-labels";
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
  const { page, pageItems, totalCount, setPage } = useClientPagination(items);

  if (isLoading) {
    return <DataModelsListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Heading level={2}>{t("dataModels.listTitle")}</Heading>
        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            {t("dataModels.createModel")}
          </Button>
        ) : null}
      </div>

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
        rows={pageItems}
        getRowId={(item) => item.id}
        page={page}
        totalCount={totalCount}
        onPageChange={setPage}
        emptyMessage={t("dataModels.empty")}
        loadingMessage={t("table.loading")}
        scrollClassName="max-h-[min(32rem,calc(100dvh-16rem))]"
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
