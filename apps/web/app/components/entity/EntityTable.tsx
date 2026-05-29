import { useEffect, useMemo, useState } from "react";
import type { QueryConfig, Sort } from "@repo/query-engine";
import {
  buildListQueryConfig,
  getTableColumns,
  getViewFilters,
} from "@repo/ui-builder";
import { Alert, Button, Input, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import {
  formatFieldLabel,
  type EntityName,
} from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import type { useEntity } from "../../hooks/useEntity";
import { formatCellValue } from "./entity-field-utils";

type EntityListState = Pick<
  ReturnType<typeof useEntity>,
  "items" | "isLoading" | "error" | "nextCursor" | "isLoadingMore" | "loadMore"
>;

interface EntityTableProps {
  readonly entityName: EntityName;
  readonly entityState: EntityListState;
  readonly onQueryConfigChange: (queryConfig: QueryConfig) => void;
  readonly onRequestDelete?: (id: string) => void;
}

export function EntityTable({
  entityName,
  entityState,
  onQueryConfigChange,
  onRequestDelete,
}: EntityTableProps) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const permissions = useEntityPermissions(entityName);
  const columns = useMemo(() => getTableColumns(definition), [definition]);
  const filterDefinitions = useMemo(
    () => getViewFilters(definition),
    [definition],
  );
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<Sort | null>(
    definition.ui.views[0]?.defaultSort ?? null,
  );

  const queryConfig = useMemo<QueryConfig>(
    () =>
      buildListQueryConfig({
        filters: filterDefinitions
          .filter((filter) => filterValues[filter.field]?.trim())
          .map((filter) => ({
            field: filter.field,
            operator: filter.operator ?? "==",
            value: filterValues[filter.field],
          })),
        sort,
        limit: 20,
      }),
    [filterDefinitions, filterValues, sort],
  );

  useEffect(() => {
    onQueryConfigChange(queryConfig);
  }, [onQueryConfigChange, queryConfig]);

  const { items, isLoading, error, nextCursor, isLoadingMore, loadMore } =
    entityState;

  const toggleSort = (field: string) => {
    setSort((current) => {
      if (current?.field !== field) {
        return { field, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { field, direction: "desc" };
      }
      return null;
    });
  };

  if (isLoading) {
    return <Text>{t("entity.loading")}</Text>;
  }

  if (error) {
    return <Alert>{error}</Alert>;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {filterDefinitions.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {filterDefinitions.map((filter) => (
            <div key={filter.field} className="min-w-48 flex-1">
              <Input
                placeholder={
                  filter.label ?? formatFieldLabel(filter.field, definition)
                }
                value={filterValues[filter.field] ?? ""}
                onChange={(event) =>
                  setFilterValues((current) => ({
                    ...current,
                    [filter.field]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <Text>{t("entity.empty")}</Text>
      ) : (
        <div className="border-border w-full overflow-x-auto rounded-lg border">
          <table className="divide-border min-w-full divide-y text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="text-foreground px-4 py-3 font-medium"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="hover:underline h-auto px-0 py-0 font-medium"
                      onClick={() => toggleSort(column)}
                    >
                      {formatFieldLabel(column, definition)}
                      {sort?.field === column
                        ? sort.direction === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </Button>
                  </th>
                ))}
                {permissions.canUpdate || permissions.canDelete ? (
                  <th className="text-foreground px-4 py-3 font-medium">
                    {t("entity.actions")}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {items.map((item) => (
                <tr key={item.id}>
                  {columns.map((column) => (
                    <td key={column} className="text-foreground px-4 py-3">
                      {formatCellValue(item[column])}
                    </td>
                  ))}
                  {permissions.canUpdate || permissions.canDelete ? (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {permissions.canUpdate ? (
                          <Link
                            to={`/app/${entityName}/${item.id}`}
                            className="text-primary hover:underline"
                          >
                            {t("entity.edit")}
                          </Link>
                        ) : null}
                        {permissions.canDelete && onRequestDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:underline h-auto px-0 py-0"
                            onClick={() => onRequestDelete(item.id)}
                          >
                            {t("entity.delete")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor ? (
        <Button
          type="button"
          variant="outline"
          loading={isLoadingMore}
          onClick={() => void loadMore()}
        >
          {t("entity.loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
