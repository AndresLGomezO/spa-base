import { useMemo } from "react";
import { getTableColumns, isFieldVisible } from "@repo/ui-builder";
import { Alert, Button, Pagination, SchemaCell, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  formatFieldLabel,
  getEntityLabel,
  type EntityName,
} from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { useOneToManyColumnData } from "../../hooks/useOneToManyColumnData";
import {
  getFieldAccessLevel,
  useFieldAccess,
} from "../../hooks/useFieldAccess";
import type { useEntity } from "../../hooks/useEntity";
import { useIndexProvisioningStatus } from "../../hooks/useIndexProvisioningStatus";
import { EntityPageSkeleton } from "../loading/EntityPageSkeleton";
import { IndexProvisioningPanel } from "./IndexProvisioningPanel";
import {
  getEntityCellDisplayMeta,
  getEntityCellRawValue,
} from "./resolve-entity-cell-value";

type EntityListState = Pick<
  ReturnType<typeof useEntity>,
  "items" | "totalCount" | "isLoading" | "error" | "listError"
>;

interface EntityCardViewProps {
  readonly entityName: EntityName;
  readonly entityState: EntityListState;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly pageSize?: number;
  readonly onRequestDelete?: (id: string) => void;
  readonly onRequestEdit?: (id: string) => void;
}

export function EntityCardView({
  entityName,
  entityState,
  page,
  onPageChange,
  onRequestDelete,
  onRequestEdit,
}: EntityCardViewProps) {
  const { t, i18n } = useTranslation("common");
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

  const { items, isLoading, error, listError, totalCount } = entityState;
  const collection = definition.collection;
  const indexStatus = useIndexProvisioningStatus(collection, {
    entityName,
    listErrorCode: listError?.code ?? null,
  });

  const { getCellValue: getOneToManyCellValue, isLoading: isLoadingRelations } =
    useOneToManyColumnData(definition, items, getDefinition);

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
