import { useMemo } from "react";
import {
  getTableColumns,
  getTableViewShowActions,
  isFieldVisible,
} from "@repo/ui-builder";
import {
  Alert,
  CursorPagination,
  IconButton,
  Pagination,
  SchemaCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCard,
  Text,
} from "@repo/ui";
import { Eye, Lock, Pencil, Share2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  formatFieldLabel,
  getEntityLabel,
  type EntityName,
} from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useAuth } from "../../auth/AuthContext";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { useOneToManyColumnData } from "../../hooks/useOneToManyColumnData";
import {
  getFieldAccessLevel,
  useFieldAccess,
} from "../../hooks/useFieldAccess";
import type { useEntity } from "../../hooks/useEntity";
import { useIndexProvisioningStatus } from "../../hooks/useIndexProvisioningStatus";
import { EntityPageSkeleton } from "../loading/EntityPageSkeleton";
import {
  entityListTableCellClassName,
  entityListTableClassName,
  entityListTableScrollClassName,
} from "./entity-list-table-layout";
import { IndexProvisioningPanel } from "./IndexProvisioningPanel";
import {
  getEntityCellDisplayMeta,
  getEntityCellSchemaValue,
} from "./resolve-entity-cell-value";

type EntityListState = Pick<
  ReturnType<typeof useEntity>,
  "items" | "totalCount" | "isLoading" | "error" | "listError"
>;

interface EntityTableProps {
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

export function EntityTable({
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
}: EntityTableProps) {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const definition = useEntityDefinition(entityName);
  const { getDefinition: getDefinitionOrThrow } = useEntityCatalog();
  const { user } = useAuth();
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
  const showActionsColumn =
    getTableViewShowActions(definition) &&
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

  const columnCount = columns.length + (showActionsColumn ? 1 : 0);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4">
      <TableCard className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className={entityListTableScrollClassName}>
          <Table className={entityListTableClassName}>
            <TableHeader>
              <TableRow>
                {columns.map((column) => {
                  const isSensitive =
                    definition.fields[column]?.sensitive === true;
                  return (
                    <TableHead key={column}>
                      <span className="inline-flex items-center gap-1">
                        {formatFieldLabel(column, definition)}
                        {isSensitive ? (
                          <Lock className="text-muted-foreground size-3.5" />
                        ) : null}
                      </span>
                    </TableHead>
                  );
                })}
                {showActionsColumn ? (
                  <TableHead className="text-center">
                    {t("entity.actions")}
                  </TableHead>
                ) : null}
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
                (items as readonly Record<string, unknown>[]).map((item) => (
                  <TableRow key={String(item.id)}>
                    {columns.map((column) => {
                      const {
                        fieldType,
                        displayFormat,
                        dateDisplayFormat,
                        fallbackImageUrl,
                      } = getEntityCellDisplayMeta(column, definition);
                      return (
                        <TableCell
                          key={column}
                          className={entityListTableCellClassName}
                        >
                          <SchemaCell
                            value={getEntityCellSchemaValue(
                              item,
                              column,
                              definition,
                              getOneToManyCellValue,
                            )}
                            fieldType={fieldType}
                            displayFormat={displayFormat}
                            dateDisplayFormat={dateDisplayFormat}
                            fieldName={column}
                            fallbackImageUrl={fallbackImageUrl}
                            locale={i18n.language}
                            trueLabel={t("table.booleanYes")}
                            falseLabel={t("table.booleanNo")}
                          />
                        </TableCell>
                      );
                    })}
                    {showActionsColumn ? (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {permissions.canRead ? (
                            <IconButton
                              type="button"
                              label={t("entity.view")}
                              onClick={() =>
                                navigate(
                                  `/app/${entityName}/${String(item.id)}`,
                                )
                              }
                            >
                              <Eye className="size-4" />
                            </IconButton>
                          ) : null}
                          {permissions.canUpdate &&
                          (!item.ownerId || canEditRow(item)) &&
                          onRequestEdit ? (
                            <IconButton
                              type="button"
                              label={t("entity.edit")}
                              onClick={() => onRequestEdit(String(item.id))}
                            >
                              <Pencil className="size-4" />
                            </IconButton>
                          ) : null}
                          {item.ownerId !== undefined &&
                          canShareRow(item) &&
                          onRequestShare
                            ? (() => {
                                const sharedWith = item.sharedWith as
                                  | Record<string, string>
                                  | undefined;
                                const shareCount = sharedWith
                                  ? Object.keys(sharedWith).length
                                  : 0;
                                return (
                                  <IconButton
                                    type="button"
                                    label={t("share.title")}
                                    onClick={() =>
                                      onRequestShare(String(item.id))
                                    }
                                  >
                                    <span className="relative inline-flex">
                                      <Share2 className="size-4" />
                                      {shareCount > 0 ? (
                                        <span className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full text-[10px] font-medium leading-none">
                                          {shareCount}
                                        </span>
                                      ) : null}
                                    </span>
                                  </IconButton>
                                );
                              })()
                            : null}
                          {permissions.canDelete &&
                          (!item.ownerId || canDeleteRow(item)) &&
                          onRequestDelete ? (
                            <IconButton
                              type="button"
                              label={t("entity.delete")}
                              onClick={() => onRequestDelete(String(item.id))}
                            >
                              <Trash2 className="text-destructive size-4" />
                            </IconButton>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
