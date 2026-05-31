import { useMemo } from "react";
import { getTableColumns, isFieldVisible } from "@repo/ui-builder";
import { Alert, DataTable, IconButton, SchemaCell } from "@repo/ui";
import { Lock, Pencil, Share2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  formatFieldLabel,
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
import { EntityPageSkeleton } from "../loading/EntityPageSkeleton";
import {
  getEntityCellDisplayMeta,
  getEntityCellRawValue,
} from "./resolve-entity-cell-value";

type EntityListState = Pick<
  ReturnType<typeof useEntity>,
  "items" | "totalCount" | "isLoading" | "error"
>;

interface EntityTableProps {
  readonly entityName: EntityName;
  readonly entityState: EntityListState;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly pageSize?: number;
  readonly onRequestDelete?: (id: string) => void;
  readonly onRequestEdit?: (id: string) => void;
  readonly onRequestShare?: (id: string) => void;
}

export function EntityTable({
  entityName,
  entityState,
  page,
  onPageChange,
  pageSize = 20,
  onRequestDelete,
  onRequestEdit,
  onRequestShare,
}: EntityTableProps) {
  const { t, i18n } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const { getDefinition } = useEntityCatalog();
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

  const { items, isLoading, error, totalCount } = entityState;

  const { getCellValue: getOneToManyCellValue, isLoading: isLoadingRelations } =
    useOneToManyColumnData(definition, items, getDefinition);

  if (isLoading || isLoadingRelations) {
    return <EntityPageSkeleton />;
  }

  if (error) {
    return <Alert>{error}</Alert>;
  }

  const currentUserId = user?.uid ?? "";
  const showActions =
    permissions.canUpdate || permissions.canDelete || !!onRequestShare;

  function canEditRow(item: Record<string, unknown>): boolean {
    if (item.ownerId === currentUserId) return true;
    const sharedWith = item.sharedWith as Record<string, string> | undefined;
    return sharedWith?.[currentUserId] === "write";
  }

  function canDeleteRow(item: Record<string, unknown>): boolean {
    return item.ownerId === currentUserId;
  }

  function canShareRow(item: Record<string, unknown>): boolean {
    if (permissions.canManageShares) return true;
    return item.ownerId === currentUserId;
  }

  return (
    <DataTable
      columns={columns.map((column) => {
        const { fieldType, displayFormat, dateDisplayFormat } =
          getEntityCellDisplayMeta(column, definition);

        const isSensitive = definition.fields[column]?.sensitive === true;

        return {
          id: column,
          header: isSensitive ? (
            <span className="inline-flex items-center gap-1">
              {formatFieldLabel(column, definition)}
              <Lock className="text-muted-foreground size-3.5" />
            </span>
          ) : (
            formatFieldLabel(column, definition)
          ),
          cell: (item) => (
            <SchemaCell
              value={getEntityCellRawValue(
                item as Record<string, unknown>,
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
          ),
        };
      })}
      rows={items as readonly Record<string, unknown>[]}
      getRowId={(item) => String(item.id)}
      page={page}
      totalCount={totalCount}
      pageSize={pageSize}
      onPageChange={onPageChange}
      emptyMessage={t("entity.empty")}
      loadingMessage={t("table.loading")}
      scrollClassName="max-h-[min(32rem,calc(100dvh-16rem))]"
      paginationLabels={{
        firstPage: t("table.paginationFirst"),
        previousPage: t("table.paginationPrevious"),
        nextPage: t("table.paginationNext"),
        lastPage: t("table.paginationLast"),
        page: (pageNumber) => t("table.paginationPage", { page: pageNumber }),
      }}
      actionsColumn={
        showActions
          ? {
              id: "actions",
              header: t("entity.actions"),
              headerClassName: "text-center",
              cell: (item) => {
                const row = item as Record<string, unknown>;
                const hasOwnership = row.ownerId !== undefined;
                const rowEditable = !hasOwnership || canEditRow(row);
                const rowDeletable = !hasOwnership || canDeleteRow(row);
                const rowShareable = hasOwnership && canShareRow(row);

                return (
                  <div className="flex items-center justify-center gap-1">
                    {permissions.canUpdate && rowEditable && onRequestEdit ? (
                      <IconButton
                        type="button"
                        label={t("entity.edit")}
                        onClick={() => onRequestEdit(String(item.id))}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                    ) : null}
                    {rowShareable && onRequestShare
                      ? (() => {
                          const sharedWith = row.sharedWith as
                            | Record<string, string>
                            | undefined;
                          const shareCount = sharedWith
                            ? Object.keys(sharedWith).length
                            : 0;

                          return (
                            <IconButton
                              type="button"
                              label={t("share.title")}
                              onClick={() => onRequestShare(String(item.id))}
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
                    rowDeletable &&
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
                );
              },
            }
          : undefined
      }
    />
  );
}
