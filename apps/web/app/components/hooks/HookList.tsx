import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { BooleanCell, Button, DataTable, Heading } from "@repo/ui";

import type { HookRecord } from "../../lib/api-client";
import { useDataViewWithPagination } from "@repo/data-view";
import { useTablePaginationLabels } from "../data-table/use-table-pagination-labels";
import {
  WebDataViewToolbar,
  type DataViewColumnDescriptor,
} from "../data-view";
import { HookListSkeleton } from "../loading/HookListSkeleton";

interface HookListProps {
  readonly items: readonly HookRecord[];
  readonly isLoading: boolean;
  readonly canCreate: boolean;
  readonly canUpdate?: boolean;
  readonly onCreate: () => void;
  readonly onEdit?: (id: string) => void;
}

export function HookList({
  items,
  isLoading,
  canCreate,
  canUpdate = false,
  onCreate,
  onEdit,
}: HookListProps) {
  const { t } = useTranslation("common");
  const paginationLabels = useTablePaginationLabels();

  const columns = useMemo<readonly DataViewColumnDescriptor<HookRecord>[]>(
    () => [
      {
        id: "name",
        label: t("hooks.name"),
        getValue: (item) => item.name,
      },
      {
        id: "entity",
        label: t("hooks.entity"),
        getValue: (item) => item.entity,
      },
      {
        id: "event",
        label: t("hooks.event"),
        getValue: (item) => item.event,
      },
      {
        id: "enabled",
        label: t("hooks.enabled"),
        getValue: (item) => item.enabled,
        filterKind: "boolean",
        formatValue: (value) =>
          value ? t("hooks.enabledOn") : t("hooks.enabledOff"),
      },
      {
        id: "actions",
        label: t("hooks.actionCount"),
        getValue: (item) => item.config.actions.length,
        filterable: false,
      },
    ],
    [t],
  );

  const dataView = useDataViewWithPagination(items, columns);

  if (isLoading) {
    return <HookListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Heading level={2}>{t("hooks.listTitle")}</Heading>
        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            {t("hooks.create")}
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
            header: t("hooks.name"),
            cell: (item) => item.name,
          },
          {
            id: "entity",
            header: t("hooks.entity"),
            cell: (item) => <span className="font-mono">{item.entity}</span>,
          },
          {
            id: "event",
            header: t("hooks.event"),
            cell: (item) => <span className="font-mono">{item.event}</span>,
          },
          {
            id: "enabled",
            header: t("hooks.enabled"),
            cell: (item) => (
              <BooleanCell
                value={item.enabled}
                trueLabel={t("hooks.enabledOn")}
                falseLabel={t("hooks.enabledOff")}
              />
            ),
          },
          {
            id: "actions",
            header: t("hooks.actionCount"),
            cell: (item) => item.config.actions.length,
          },
        ]}
        rows={dataView.pageItems}
        getRowId={(item) => item.id}
        page={dataView.page}
        totalCount={dataView.totalCount}
        onPageChange={dataView.setPage}
        emptyMessage={t("hooks.empty")}
        loadingMessage={t("table.loading")}
        scrollClassName="max-h-[min(32rem,calc(100dvh-16rem))]"
        paginationLabels={paginationLabels}
        actionsColumn={
          canUpdate
            ? {
                id: "edit",
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
