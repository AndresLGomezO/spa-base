import { useEffect, useMemo, useState } from "react";
import type { QueryConfig } from "@repo/query-engine";
import {
  buildListQueryConfig,
  getTableColumns,
  getViewFilters,
  resolveActiveView,
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

interface EntityCardViewProps {
  readonly entityName: EntityName;
  readonly entityState: EntityListState;
  readonly onQueryConfigChange: (queryConfig: QueryConfig) => void;
  readonly onRequestDelete?: (id: string) => void;
}

export function EntityCardView({
  entityName,
  entityState,
  onQueryConfigChange,
  onRequestDelete,
}: EntityCardViewProps) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const permissions = useEntityPermissions(entityName);
  const view = useMemo(() => resolveActiveView(definition), [definition]);
  const columns = useMemo(() => getTableColumns(definition), [definition]);
  const filterDefinitions = useMemo(
    () => getViewFilters(definition),
    [definition],
  );
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const sort = view.defaultSort ?? null;

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="border-border flex flex-col gap-3 rounded-lg border p-4"
            >
              {columns.map((column) => (
                <div key={column} className="flex flex-col gap-1">
                  <Text className="text-muted-foreground text-xs">
                    {formatFieldLabel(column, definition)}
                  </Text>
                  <Text>{formatCellValue(item[column])}</Text>
                </div>
              ))}
              {permissions.canUpdate || permissions.canDelete ? (
                <div className="flex items-center gap-2 pt-2">
                  {permissions.canUpdate ? (
                    <Link
                      to={`/app/${entityName}/${item.id}`}
                      className="text-primary hover:underline text-sm"
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
              ) : null}
            </article>
          ))}
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
