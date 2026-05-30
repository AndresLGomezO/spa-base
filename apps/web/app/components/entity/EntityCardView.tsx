import { useEffect, useMemo, useState } from "react";
import type { QueryConfig } from "@repo/query-engine";
import {
  buildListQueryConfig,
  getTableColumns,
  getViewFilters,
  resolveActiveView,
} from "@repo/ui-builder";
import { Alert, Button, Input, Pagination, SchemaCell, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  formatFieldLabel,
  type EntityName,
} from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { useOneToManyColumnData } from "../../hooks/useOneToManyColumnData";
import type { useEntity } from "../../hooks/useEntity";
import { EntityPageSkeleton } from "../loading/EntityPageSkeleton";
import {
  getEntityCellDisplayMeta,
  getEntityCellRawValue,
} from "./resolve-entity-cell-value";

type EntityListState = Pick<
  ReturnType<typeof useEntity>,
  "items" | "totalCount" | "isLoading" | "error"
>;

interface EntityCardViewProps {
  readonly entityName: EntityName;
  readonly entityState: EntityListState;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly onQueryConfigChange: (queryConfig: QueryConfig) => void;
  readonly onRequestDelete?: (id: string) => void;
  readonly onRequestEdit?: (id: string) => void;
}

export function EntityCardView({
  entityName,
  entityState,
  page,
  onPageChange,
  onQueryConfigChange,
  onRequestDelete,
  onRequestEdit,
}: EntityCardViewProps) {
  const { t, i18n } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const { getDefinition } = useEntityCatalog();
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

  const { items, isLoading, error, totalCount } = entityState;

  const { getCellValue: getOneToManyCellValue, isLoading: isLoadingRelations } =
    useOneToManyColumnData(definition, items, getDefinition);

  if (isLoading || isLoadingRelations) {
    return <EntityPageSkeleton />;
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
              {columns.map((column) => {
                const { fieldType, displayFormat, dateDisplayFormat } =
                  getEntityCellDisplayMeta(column, definition);

                return (
                  <div key={column} className="flex flex-col gap-1">
                    <Text className="text-muted-foreground text-xs">
                      {formatFieldLabel(column, definition)}
                    </Text>
                    <SchemaCell
                      value={getEntityCellRawValue(
                        item,
                        column,
                        definition,
                        getOneToManyCellValue,
                      )}
                      fieldType={fieldType}
                      displayFormat={displayFormat}
                      dateDisplayFormat={dateDisplayFormat}
                      fieldName={column}
                      locale={i18n.language}
                      trueLabel={t("table.booleanYes")}
                      falseLabel={t("table.booleanNo")}
                    />
                  </div>
                );
              })}
              {permissions.canUpdate || permissions.canDelete ? (
                <div className="flex items-center gap-2 pt-2">
                  {permissions.canUpdate && onRequestEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:underline h-auto px-0 py-0"
                      onClick={() => onRequestEdit(item.id)}
                    >
                      {t("entity.edit")}
                    </Button>
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

      <Pagination
        page={page}
        totalCount={totalCount}
        onPageChange={onPageChange}
        labels={{
          firstPage: t("table.paginationFirst"),
          previousPage: t("table.paginationPrevious"),
          nextPage: t("table.paginationNext"),
          lastPage: t("table.paginationLast"),
          page: (pageNumber) => t("table.paginationPage", { page: pageNumber }),
        }}
      />
    </div>
  );
}
