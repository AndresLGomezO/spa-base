import { useCallback, useMemo } from "react";
import { normalizeListItemLayout } from "@repo/entities";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  Alert,
  Button,
  CardActionsMenu,
  LayoutCard,
  Pagination,
  Text,
} from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";

import {
  getEntityLabel,
  tryGetEntityDefinition,
  type EntityName,
} from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useAuth } from "../../auth/AuthContext";
import { useAnyPermission } from "../../auth/useAnyPermission";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { useOneToManyColumnData } from "../../hooks/useOneToManyColumnData";
import type { useEntity } from "../../hooks/useEntity";
import { useIndexProvisioningStatus } from "../../hooks/useIndexProvisioningStatus";
import { EntityPageSkeleton } from "../loading/EntityPageSkeleton";
import { IndexProvisioningPanel } from "./IndexProvisioningPanel";
import { createEntityLayoutRenderContext } from "../../features/ui-builder";
import { designLayoutEntityPath } from "../../routing/design-layout-nav";

type EntityListState = Pick<
  ReturnType<typeof useEntity>,
  "items" | "totalCount" | "isLoading" | "error" | "listError"
>;

interface EntityLayoutCompactListViewProps {
  readonly entityName: EntityName;
  readonly entityState: EntityListState;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly pageSize?: number;
  readonly onRequestDelete?: (id: string) => void;
  readonly onRequestEdit?: (id: string) => void;
  readonly onRequestShare?: (id: string) => void;
}

export function EntityLayoutCompactListView({
  entityName,
  entityState,
  page,
  onPageChange,
  pageSize = 10,
  onRequestDelete,
  onRequestEdit,
  onRequestShare,
}: EntityLayoutCompactListViewProps) {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const definition = useEntityDefinition(entityName);
  const canConfigureLayout = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );
  const { getDefinition: getDefinitionOrThrow, items: catalogItems } =
    useEntityCatalog();
  const getDefinition = useCallback(
    (name: string) => tryGetEntityDefinition(name, catalogItems),
    [catalogItems],
  );
  const { user } = useAuth();
  const permissions = useEntityPermissions(entityName);
  const layout = useMemo(
    () => normalizeListItemLayout(definition.ui),
    [definition.ui],
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
      <Alert className="flex flex-col gap-3">
        <Text>{t("entity.cardLayoutMissing")}</Text>
        {canConfigureLayout ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              navigate(designLayoutEntityPath("list", entityName))
            }
          >
            {t("entity.cardLayoutMissingAction")}
          </Button>
        ) : null}
      </Alert>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {items.length === 0 ? (
        <Text>{t("entity.empty")}</Text>
      ) : (
        (items as readonly Record<string, unknown>[]).map((item, index) => {
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
              className={
                layout.motion?.staggerIndex
                  ? `ui-motion-stagger-${index}`
                  : undefined
              }
            >
              <RecursiveLayoutRenderer
                layout={layout}
                context={createEntityLayoutRenderContext({
                  item,
                  definition,
                  locale: i18n.language,
                  getOneToManyCellValue,
                  getDefinition,
                })}
              />
            </LayoutCard>
          );
        })
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
