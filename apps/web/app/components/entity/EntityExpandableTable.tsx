import { Fragment, useCallback, useMemo, useState } from "react";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  getExpandableTableColumns,
  getExpandableTableRowExpandLayout,
  getExpandableTableShowActions,
  getExpandableTableViewConfig,
} from "@repo/ui-builder";
import {
  expandableTableHasExpandFieldContent,
  resolveExpandableTableImageFieldPath,
} from "@repo/entities";
import {
  Alert,
  CursorPagination,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCard,
  Text,
} from "@repo/ui";
import { ChevronRight } from "lucide-react";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";

import {
  getEntityLabel,
  tryGetEntityDefinition,
  type EntityName,
} from "../../entities/entity-catalog";
import { resolveExpandableTableGroupedColumnDisplayLabel } from "../../features/ui-builder/expandable-table-grouped-column-label";
import {
  groupedTableColumnVisibilityClassName,
  shouldRenderGroupedTableColumn,
} from "../../features/ui-builder/grouped-table-column-display-range";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useAuth } from "../../auth/AuthContext";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { useOneToManyColumnData } from "../../hooks/useOneToManyColumnData";
import type { useEntity } from "../../hooks/useEntity";
import { useIndexProvisioningStatus } from "../../hooks/useIndexProvisioningStatus";
import { EntityPageSkeleton } from "../loading/EntityPageSkeleton";
import { IndexProvisioningPanel } from "./IndexProvisioningPanel";
import { createEntityLayoutRenderContext } from "../../features/ui-builder";
import { useEntityReturnNavigation } from "../../routing/entity-navigation";
import { ExpandableTableRowActions } from "./ExpandableTableRowActions";
import { ExpandableTableRowExpandPanel } from "./ExpandableTableRowExpandPanel";

type EntityListState = Pick<
  ReturnType<typeof useEntity>,
  "items" | "totalCount" | "isLoading" | "error" | "listError"
>;

interface EntityExpandableTableProps {
  readonly entityName: EntityName;
  readonly entityState: EntityListState;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly pageSize?: number;
  readonly hasNextPage?: boolean;
  readonly hasPreviousPage?: boolean;
  readonly onRequestDelete?: (id: string) => void;
  readonly onRequestEdit?: (id: string) => void;
  readonly onRequestShare?: (id: string) => void;
}

function toggleExpandedId(
  expandedIds: ReadonlySet<string>,
  rowId: string,
): ReadonlySet<string> {
  const next = new Set(expandedIds);
  if (next.has(rowId)) {
    next.delete(rowId);
  } else {
    next.add(rowId);
  }
  return next;
}

export function EntityExpandableTable({
  entityName,
  entityState,
  page,
  onPageChange,
  pageSize = 10,
  hasNextPage,
  hasPreviousPage,
  onRequestDelete,
  onRequestEdit,
  onRequestShare,
}: EntityExpandableTableProps) {
  const { t, i18n } = useTranslation("common");
  const { navigateToDetail } = useEntityReturnNavigation(entityName);
  const definition = useEntityDefinition(entityName);
  const { getDefinition: getDefinitionOrThrow, items: catalogItems } =
    useEntityCatalog();
  const getDefinition = useCallback(
    (name: string) => tryGetEntityDefinition(name, catalogItems),
    [catalogItems],
  );
  const { user } = useAuth();
  const permissions = useEntityPermissions(entityName);
  const expandableView = useMemo(
    () => getExpandableTableViewConfig(definition),
    [definition],
  );
  const groupedColumns = useMemo(
    () => getExpandableTableColumns(definition),
    [definition],
  );
  const rowExpandLayout = useMemo(
    () => getExpandableTableRowExpandLayout(definition),
    [definition],
  );
  const imageFieldPath = useMemo(
    () =>
      resolveExpandableTableImageFieldPath({
        imageFieldPath: expandableView.imageFieldPath,
        fieldPaths: expandableView.fields,
        fields: definition.fields,
      }),
    [definition.fields, expandableView.fields, expandableView.imageFieldPath],
  );
  const hasExpandFieldContent = useMemo(
    () =>
      expandableTableHasExpandFieldContent({
        rowExpandLayout,
        columns: groupedColumns,
        imageFieldPath,
      }),
    [groupedColumns, imageFieldPath, rowExpandLayout],
  );
  const [expandedRowIds, setExpandedRowIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const { items, isLoading, error, listError, totalCount } = entityState;
  const collection = definition.collection;
  const indexStatus = useIndexProvisioningStatus(collection, {
    entityName,
    listErrorCode: listError?.code ?? null,
  });

  const { getCellValue: getOneToManyCellValue, isLoading: isLoadingRelations } =
    useOneToManyColumnData(definition, items, getDefinitionOrThrow);

  const entityLabel = getEntityLabel(definition);

  if (indexStatus.phase === "building" || indexStatus.phase === "error") {
    return (
      <IndexProvisioningPanel
        entityLabel={entityLabel}
        phase={indexStatus.phase === "error" ? "error" : "building"}
        summary={indexStatus.summary}
        listErrorMessage={listError?.message ?? null}
      />
    );
  }

  if ((isLoading || isLoadingRelations) && !indexStatus.isBlocking) {
    return <EntityPageSkeleton />;
  }

  if (error && !indexStatus.isBlocking) {
    return <Alert>{error}</Alert>;
  }

  const currentUserId = user?.uid ?? "";
  const showRowActions =
    getExpandableTableShowActions(definition) &&
    (permissions.canRead ||
      permissions.canUpdate ||
      permissions.canDelete ||
      !!onRequestShare);
  const useCursorPagination =
    hasNextPage !== undefined || hasPreviousPage !== undefined;

  function canEditRow(item: Record<string, unknown>): boolean {
    if (item.ownerId === currentUserId) return true;
    const sharedWith = item.sharedWith as Record<string, string> | undefined;
    return sharedWith?.[currentUserId] === "write";
  }

  function canDeleteRow(item: Record<string, unknown>): boolean {
    return item.ownerId === currentUserId;
  }

  function canShareRow(item: Record<string, unknown>): boolean {
    return permissions.canShare && item.ownerId === currentUserId;
  }

  const leadingColumnCount = 1 + (imageFieldPath ? 1 : 0);
  const columnCount = leadingColumnCount + groupedColumns.length;

  function toggleRow(rowId: string) {
    setExpandedRowIds((current) => toggleExpandedId(current, rowId));
  }

  function renderRowActions(item: Record<string, unknown>) {
    if (!showRowActions) {
      return null;
    }

    return (
      <ExpandableTableRowActions
        canRead={permissions.canRead}
        canUpdate={permissions.canUpdate}
        canDelete={permissions.canDelete}
        canEditRow={canEditRow(item)}
        canDeleteRow={canDeleteRow(item)}
        canShareRow={canShareRow(item)}
        item={item}
        labels={{
          view: t("entity.view"),
          edit: t("entity.edit"),
          share: t("share.title"),
          delete: t("entity.delete"),
        }}
        onView={(id) => navigateToDetail(id)}
        onEdit={onRequestEdit}
        onShare={onRequestShare}
        onDelete={onRequestDelete}
      />
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <TableCard className="w-full overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-2" aria-hidden />
              {imageFieldPath ? (
                <TableHead className="w-14 px-2" aria-hidden />
              ) : null}
              {groupedColumns.map((column, columnIndex) =>
                shouldRenderGroupedTableColumn(column) ? (
                  <TableHead
                    key={column.id}
                    className={groupedTableColumnVisibilityClassName(column)}
                  >
                    {resolveExpandableTableGroupedColumnDisplayLabel(
                      column,
                      columnIndex,
                      definition,
                      (oneBasedIndex) =>
                        t("entity.viewSettings.columnTab", {
                          column: oneBasedIndex,
                        }),
                    )}
                  </TableHead>
                ) : null,
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32 text-center">
                  <Text className="text-muted-foreground">
                    {t("entity.empty")}
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              (items as readonly Record<string, unknown>[]).map((item) => {
                const rowId = String(item.id);
                const isExpanded = expandedRowIds.has(rowId);
                const renderContext = createEntityLayoutRenderContext({
                  item,
                  definition,
                  locale: i18n.language,
                  getOneToManyCellValue,
                  getDefinition,
                  relationLinkAppearance: true,
                });

                return (
                  <Fragment key={rowId}>
                    <TableRow
                      className="relative cursor-pointer"
                      aria-expanded={isExpanded}
                      onClick={() => toggleRow(rowId)}
                    >
                      <TableCell className="w-10 px-2">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md"
                          aria-label={
                            isExpanded
                              ? t("entity.expandableTable.collapseRow")
                              : t("entity.expandableTable.expandRow")
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRow(rowId);
                          }}
                        >
                          <ChevronRight
                            className={cn(
                              "size-4 transition-transform duration-300 ease-out motion-reduce:transition-none",
                              isExpanded && "rotate-90",
                            )}
                          />
                        </button>
                      </TableCell>
                      {imageFieldPath ? (
                        <TableCell className="w-14 px-2">
                          {renderContext.resolveImage?.(
                            imageFieldPath,
                            item[imageFieldPath],
                            {
                              primaryFieldPath: imageFieldPath,
                              imageSize: 40,
                              objectFit: "cover",
                              expandOnClick: true,
                            },
                          ) ?? null}
                        </TableCell>
                      ) : null}
                      {groupedColumns.map((column) =>
                        shouldRenderGroupedTableColumn(column) ? (
                          <TableCell
                            key={column.id}
                            className={groupedTableColumnVisibilityClassName(
                              column,
                            )}
                          >
                            <RecursiveLayoutRenderer
                              layout={column.cellLayout}
                              context={renderContext}
                            />
                          </TableCell>
                        ) : null,
                      )}
                    </TableRow>
                    <TableRow key={`${rowId}-expand`}>
                      <TableCell colSpan={columnCount} className="p-0">
                        <ExpandableTableRowExpandPanel
                          expanded={isExpanded}
                          contentClassName="bg-muted/30 p-4"
                        >
                          {hasExpandFieldContent ? (
                            <RecursiveLayoutRenderer
                              layout={rowExpandLayout}
                              context={renderContext}
                            />
                          ) : null}
                          {showRowActions ? (
                            <div
                              className={cn(
                                "flex justify-end gap-1",
                                hasExpandFieldContent &&
                                  "border-border mt-4 border-t pt-3",
                              )}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {renderRowActions(item)}
                            </div>
                          ) : null}
                        </ExpandableTableRowExpandPanel>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableCard>

      {useCursorPagination ? (
        <CursorPagination
          className="shrink-0"
          page={page}
          hasNextPage={hasNextPage ?? false}
          hasPreviousPage={hasPreviousPage ?? false}
          onNextPage={() => onPageChange(page + 1)}
          onPreviousPage={() => onPageChange(page - 1)}
          labels={{
            previousPage: t("table.paginationPrevious"),
            nextPage: t("table.paginationNext"),
            pageIndicator: (p) => t("table.paginationPage", { page: p }),
          }}
        />
      ) : totalCount > 0 ? (
        <Pagination
          className="shrink-0"
          page={page}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={onPageChange}
          labels={{
            firstPage: t("table.paginationFirst"),
            previousPage: t("table.paginationPrevious"),
            nextPage: t("table.paginationNext"),
            lastPage: t("table.paginationLast"),
            page: (pageNumber) =>
              t("table.paginationPage", { page: pageNumber }),
          }}
        />
      ) : null}
    </div>
  );
}
