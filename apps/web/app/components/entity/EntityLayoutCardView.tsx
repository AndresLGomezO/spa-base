import { useCallback, useMemo } from "react";
import { cn } from "@repo/theme/utils";
import { resolveCardView } from "@repo/ui-builder";
import {
  Alert,
  CardActionsMenu,
  LayoutCard,
  LayoutRenderer,
  Pagination,
  SchemaCell,
  Text,
} from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  formatFieldLabel,
  getEntityLabel,
  tryGetEntityDefinition,
  type EntityName,
} from "../../entities/entity-catalog";
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
import { getEntityCellDisplayMeta } from "./resolve-entity-cell-value";
import { resolveEntityFieldPath } from "./resolve-entity-field-path";
import { renderEntityLayoutSlotPreview } from "./render-entity-layout-slot-preview";
import { getEntityCardListGridClass } from "./entity-card-list-grid";

type EntityListState = Pick<
  ReturnType<typeof useEntity>,
  "items" | "totalCount" | "isLoading" | "error" | "listError"
>;

interface EntityLayoutCardViewProps {
  readonly entityName: EntityName;
  readonly entityState: EntityListState;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly pageSize?: number;
  readonly onRequestDelete?: (id: string) => void;
  readonly onRequestEdit?: (id: string) => void;
  readonly onRequestShare?: (id: string) => void;
  readonly listFilters?: Readonly<Record<string, readonly string[]>>;
  readonly routeParams?: Readonly<Record<string, string | undefined>>;
}

export function EntityLayoutCardView({
  entityName,
  entityState,
  page,
  onPageChange,
  pageSize = 10,
  onRequestDelete,
  onRequestEdit,
  onRequestShare,
  listFilters,
  routeParams,
}: EntityLayoutCardViewProps) {
  const { t, i18n } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const { getDefinition: getDefinitionOrThrow, items: catalogItems } =
    useEntityCatalog();
  const getDefinition = useCallback(
    (name: string) => tryGetEntityDefinition(name, catalogItems),
    [catalogItems],
  );
  const { user } = useAuth();
  const permissions = useEntityPermissions(entityName);
  const cardView = useMemo(() => resolveCardView(definition), [definition]);
  const layout = cardView?.layout;
  const cardsPerRow = layout?.cardsPerRow;
  const listGridClass = getEntityCardListGridClass(cardsPerRow);

  const { items, isLoading, error, listError, totalCount } = entityState;
  const collection = definition.collection;
  const indexStatus = useIndexProvisioningStatus(collection, {
    entityName,
    listErrorCode: listError?.code ?? null,
  });

  const { getCellValue: getOneToManyCellValue, isLoading: isLoadingRelations } =
    useOneToManyColumnData(definition, items, getDefinitionOrThrow);

  const entityLabel = getEntityLabel(definition);
  const currentUserId = user?.uid ?? "";

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

  if (!layout) {
    return (
      <div className="flex w-full flex-col gap-4">
        {items.length === 0 ? (
          <Text>{t("entity.empty")}</Text>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="border-border flex flex-col gap-3 rounded-lg border p-4"
              >
                {(cardView?.fields ?? definition.ui.views[0]?.fields ?? []).map(
                  (column) => (
                    <div key={column} className="flex flex-col gap-1">
                      <Text className="text-muted-foreground text-xs">
                        {formatFieldLabel(column, definition)}
                      </Text>
                      <SchemaCell
                        value={resolveEntityFieldPath(
                          item as Record<string, unknown>,
                          column,
                          definition,
                          getOneToManyCellValue,
                        )}
                        {...getEntityCellDisplayMeta(column, definition)}
                        fieldName={column}
                        locale={i18n.language}
                        trueLabel={t("table.booleanYes")}
                        falseLabel={t("table.booleanNo")}
                      />
                    </div>
                  ),
                )}
              </article>
            ))}
          </div>
        )}
        <Pagination
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
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {items.length === 0 ? (
        <Text>{t("entity.empty")}</Text>
      ) : (
        <div className={cn("grid gap-4", listGridClass)}>
          {(items as readonly Record<string, unknown>[]).map((item) => {
            const shareCount = Object.keys(
              (item.sharedWith as Record<string, string> | undefined) ?? {},
            ).length;
            const cardActions =
              layout.showActions === false ? null : (
                <CardActionsMenu
                  triggerLabel={t("entity.actions")}
                  actions={[
                    ...(permissions.canUpdate &&
                    (!item.ownerId || canEditRow(item)) &&
                    onRequestEdit
                      ? [
                          {
                            id: "edit",
                            label: t("entity.edit"),
                            onSelect: () => onRequestEdit(String(item.id)),
                          },
                        ]
                      : []),
                    ...(canShareRow(item) && onRequestShare
                      ? [
                          {
                            id: "share",
                            label: t("entity.share"),
                            onSelect: () => onRequestShare(String(item.id)),
                            badgeCount: shareCount,
                          },
                        ]
                      : []),
                    ...(permissions.canDelete &&
                    canDeleteRow(item) &&
                    onRequestDelete
                      ? [
                          {
                            id: "delete",
                            label: t("entity.delete"),
                            onSelect: () => onRequestDelete(String(item.id)),
                            destructive: true,
                          },
                        ]
                      : []),
                  ]}
                />
              );

            return (
              <LayoutCard
                key={String(item.id)}
                interactive
                actions={cardActions}
              >
                <LayoutRenderer
                  layout={layout}
                  renderSlot={(_slotId, binding) => {
                    if (!binding) {
                      return null;
                    }

                    return renderEntityLayoutSlotPreview({
                      item,
                      binding,
                      definition,
                      locale: i18n.language,
                      getOneToManyCellValue,
                      getDefinition,
                      listFilters,
                      routeParams,
                    });
                  }}
                />
              </LayoutCard>
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        totalCount={totalCount}
        pageSize={pageSize}
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
