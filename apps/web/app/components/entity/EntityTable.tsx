import { useEffect, useMemo, useRef, useState } from "react";
import type { QueryConfig, Sort } from "@repo/query-engine";
import {
  buildListQueryConfig,
  getTableColumns,
  getViewFilters,
  isFieldVisible,
} from "@repo/ui-builder";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Alert, Button, Input, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  formatFieldLabel,
  type EntityName,
} from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { useOneToManyColumnData } from "../../hooks/useOneToManyColumnData";
import {
  getFieldAccessLevel,
  useFieldAccess,
} from "../../hooks/useFieldAccess";
import type { useEntity } from "../../hooks/useEntity";
import { EntityPageSkeleton } from "../loading/EntityPageSkeleton";
import { resolveEntityCellValue } from "./resolve-entity-cell-value";

type EntityListState = Pick<
  ReturnType<typeof useEntity>,
  "items" | "isLoading" | "error" | "nextCursor" | "isLoadingMore" | "loadMore"
>;

interface EntityTableProps {
  readonly entityName: EntityName;
  readonly entityState: EntityListState;
  readonly onQueryConfigChange: (queryConfig: QueryConfig) => void;
  readonly onRequestDelete?: (id: string) => void;
  readonly onRequestEdit?: (id: string) => void;
}

const ROW_HEIGHT_PX = 48;

export function EntityTable({
  entityName,
  entityState,
  onQueryConfigChange,
  onRequestDelete,
  onRequestEdit,
}: EntityTableProps) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const { getDefinition } = useEntityCatalog();
  const permissions = useEntityPermissions(entityName);
  const fieldAccess = useFieldAccess(entityName);
  const columns = useMemo(
    () =>
      getTableColumns(definition).filter((column) =>
        isFieldVisible(
          definition.ui.fields?.[column],
          permissions.canRead,
          getFieldAccessLevel(fieldAccess, column),
        ),
      ),
    [definition, fieldAccess, permissions.canRead],
  );
  const filterDefinitions = useMemo(
    () => getViewFilters(definition),
    [definition],
  );
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const debouncedFilterValues = useDebouncedValue(filterValues, 300);
  const [sort, setSort] = useState<Sort | null>(
    definition.ui.views[0]?.defaultSort ?? null,
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const queryConfig = useMemo<QueryConfig>(
    () =>
      buildListQueryConfig({
        filters: filterDefinitions
          .filter((filter) => debouncedFilterValues[filter.field]?.trim())
          .map((filter) => ({
            field: filter.field,
            operator: filter.operator ?? "==",
            value: debouncedFilterValues[filter.field],
          })),
        sort,
        limit: 20,
      }),
    [debouncedFilterValues, filterDefinitions, sort],
  );

  useEffect(() => {
    onQueryConfigChange(queryConfig);
  }, [onQueryConfigChange, queryConfig]);

  const { items, isLoading, error, nextCursor, isLoadingMore, loadMore } =
    entityState;

  const { getCellValue: getOneToManyCellValue, isLoading: isLoadingRelations } =
    useOneToManyColumnData(definition, items, getDefinition);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 8,
  });

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
          </table>
          <div
            ref={scrollContainerRef}
            className="max-h-[480px] overflow-y-auto"
          >
            <table className="divide-border min-w-full divide-y text-left text-sm">
              <tbody
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = items[virtualRow.index];
                  if (!item) {
                    return null;
                  }

                  return (
                    <tr
                      key={item.id}
                      className="absolute left-0 top-0 w-full"
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {columns.map((column) => (
                        <td
                          key={column}
                          className="text-foreground border-border border-b px-4 py-3"
                        >
                          {resolveEntityCellValue(
                            item,
                            column,
                            definition,
                            getOneToManyCellValue,
                          )}
                        </td>
                      ))}
                      {permissions.canUpdate || permissions.canDelete ? (
                        <td className="border-border border-b px-4 py-3">
                          <div className="flex items-center gap-2">
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
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
