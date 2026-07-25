import { Fragment, useCallback, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  getExpandableTableColumns,
  getExpandableTableRowExpandLayout,
  getExpandableTableShowActions,
  getExpandableTableSummaryField,
  getExpandableTableViewConfig,
} from "@repo/ui-builder";
import {
  expandableTableHasExpandFieldContent,
  resolveExpandableTableImageFieldPath,
} from "@repo/entities";
import { resolvesFromAiRecordSummary } from "@repo/ai-context/storage";
import {
  Alert,
  CursorPagination,
  Markdown,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCard,
  Text,
  useThirdRail,
} from "@repo/ui";
import { ChevronRight } from "lucide-react";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";

import { summaryChartBlockRenderers } from "../../features/entity-summary/summary-chart-renderers";
import { SummaryCopyMarkdownButton } from "../../features/entity-summary/SummaryCopyMarkdownButton";
import { SummaryOutOfSyncBanner } from "../../features/entity-summary/SummaryOutOfSyncBanner";
import {
  isAiNarrativeStale,
  narrativeVariantFromSummaryField,
  resolveSummaryFieldText,
} from "../../features/entity-summary/resolve-summary-tabs";
import { getAiRecordSummary } from "../../lib/api-client";
import { formatRecordDisplayLabel } from "./format-record-display-label";

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
  const { open: openThirdRail } = useThirdRail();
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
  const summaryField = getExpandableTableSummaryField(definition);
  const needsAiSummary =
    Boolean(summaryField) && resolvesFromAiRecordSummary(summaryField ?? "");
  const recordRows = items as readonly Record<string, unknown>[];
  const aiSummaryQueries = useQueries({
    queries: recordRows.map((item) => {
      const recordId = typeof item.id === "string" ? item.id : "";
      return {
        queryKey: ["ai-record-summary", entityName, recordId] as const,
        queryFn: () => getAiRecordSummary(entityName, recordId),
        enabled: needsAiSummary && recordId.length > 0,
      };
    }),
  });
  const aiSummaryByRecordId = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<(typeof aiSummaryQueries)[number]["data"]>
    >();
    recordRows.forEach((item, index) => {
      const recordId = typeof item.id === "string" ? item.id : "";
      const data = aiSummaryQueries[index]?.data;
      if (recordId && data) {
        map.set(recordId, data);
      }
    });
    return map;
  }, [aiSummaryQueries, recordRows]);
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
  const showCrudActions =
    getExpandableTableShowActions(definition) &&
    (permissions.canRead ||
      permissions.canUpdate ||
      permissions.canDelete ||
      !!onRequestShare);
  const showRowActions = showCrudActions || !!summaryField;
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

  function openRowSummary(item: Record<string, unknown>, summaryText: string) {
    const recordLabel = formatRecordDisplayLabel(item, definition.displayField);
    const recordId = typeof item.id === "string" ? item.id : "";
    const aiDoc = recordId ? (aiSummaryByRecordId.get(recordId) ?? null) : null;
    const variant = narrativeVariantFromSummaryField(summaryField);
    const stale = isAiNarrativeStale(aiDoc, variant);
    openThirdRail({
      title: t("entity.summary.title"),
      subtitle: recordLabel,
      headerActions: <SummaryCopyMarkdownButton getText={() => summaryText} />,
      body: (
        <div className="flex flex-col gap-4">
          {recordId ? (
            <SummaryOutOfSyncBanner
              entityName={entityName}
              recordId={recordId}
              variant={variant}
              stale={stale}
            />
          ) : null}
          {summaryText.length > 0 ? (
            <Markdown blockRenderers={summaryChartBlockRenderers}>
              {summaryText}
            </Markdown>
          ) : (
            <Text className="text-muted-foreground text-sm">
              {t("entity.summary.emptyDescription")}
            </Text>
          )}
        </div>
      ),
      widths: { base: "full", md: "1/2", lg: "1/3" },
      tone: "ai",
    });
  }

  function renderRowActions(item: Record<string, unknown>) {
    if (!showRowActions) {
      return null;
    }

    const recordId = typeof item.id === "string" ? item.id : "";
    const aiDoc = recordId ? (aiSummaryByRecordId.get(recordId) ?? null) : null;
    const variant = narrativeVariantFromSummaryField(summaryField);
    const summaryStale = isAiNarrativeStale(aiDoc, variant);

    return (
      <ExpandableTableRowActions
        canRead={showCrudActions && permissions.canRead}
        canUpdate={showCrudActions && permissions.canUpdate}
        canDelete={showCrudActions && permissions.canDelete}
        canEditRow={canEditRow(item)}
        canDeleteRow={canDeleteRow(item)}
        canShareRow={showCrudActions && canShareRow(item)}
        item={item}
        summaryField={summaryField}
        summaryText={resolveSummaryFieldText(summaryField, item, aiDoc)}
        summaryStale={summaryStale}
        labels={{
          view: t("entity.view"),
          edit: t("entity.edit"),
          share: t("share.title"),
          delete: t("entity.delete"),
          summary: t("entity.summary.button"),
          summaryOutOfSync: t("entity.summary.outOfSyncHint"),
        }}
        onView={(id) => navigateToDetail(id)}
        onEdit={showCrudActions ? onRequestEdit : undefined}
        onShare={showCrudActions ? onRequestShare : undefined}
        onDelete={showCrudActions ? onRequestDelete : undefined}
        onSummary={summaryField ? openRowSummary : undefined}
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
