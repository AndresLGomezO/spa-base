import { Alert, Button, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import {
  formatFieldLabel,
  getEditableFieldNames,
  getEntityDefinition,
  type EntityName,
} from "../../entities/entity-catalog";
import { formatCellValue } from "./entity-field-utils";

interface EntityRecord {
  readonly id: string;
  readonly [key: string]: unknown;
}

interface EntityTableProps {
  readonly entityName: EntityName;
  readonly items: readonly EntityRecord[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly nextCursor: string | null;
  readonly isLoadingMore: boolean;
  readonly onLoadMore: () => void;
  readonly onDelete: (id: string) => void;
}

export function EntityTable({
  entityName,
  items,
  isLoading,
  error,
  nextCursor,
  isLoadingMore,
  onLoadMore,
  onDelete,
}: EntityTableProps) {
  const { t } = useTranslation("common");
  const permissions = useEntityPermissions(entityName);
  const entity = getEntityDefinition(entityName).entity;
  const columns = ["id", ...getEditableFieldNames(entity)];

  if (isLoading) {
    return <Text>{t("entity.loading")}</Text>;
  }

  if (error) {
    return <Alert>{error}</Alert>;
  }

  if (items.length === 0) {
    return <Text>{t("entity.empty")}</Text>;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="border-border w-full overflow-x-auto rounded-lg border">
        <table className="divide-border min-w-full divide-y text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="text-foreground px-4 py-3 font-medium"
                >
                  {formatFieldLabel(column)}
                </th>
              ))}
              {permissions.canUpdate || permissions.canDelete ? (
                <th className="text-foreground px-4 py-3 font-medium">
                  {t("entity.actions")}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {items.map((item) => (
              <tr key={item.id}>
                {columns.map((column) => (
                  <td key={column} className="text-foreground px-4 py-3">
                    {formatCellValue(item[column])}
                  </td>
                ))}
                {permissions.canUpdate || permissions.canDelete ? (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {permissions.canUpdate ? (
                        <Link
                          to={`/app/${entityName}/${item.id}`}
                          className="text-primary-600 hover:underline"
                        >
                          {t("entity.edit")}
                        </Link>
                      ) : null}
                      {permissions.canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(item.id)}
                        >
                          {t("entity.delete")}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nextCursor ? (
        <Button
          type="button"
          variant="outline"
          loading={isLoadingMore}
          onClick={() => onLoadMore()}
        >
          {t("entity.loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
