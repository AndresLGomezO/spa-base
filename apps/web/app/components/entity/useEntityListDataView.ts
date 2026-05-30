import { useMemo } from "react";
import { getTableColumns, isFieldVisible } from "@repo/ui-builder";
import { useTranslation } from "react-i18next";

import type { EntityName } from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useDataViewWithPagination } from "../../hooks/useDataViewWithPagination";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import {
  getFieldAccessLevel,
  useFieldAccess,
} from "../../hooks/useFieldAccess";
import { useOneToManyColumnData } from "../../hooks/useOneToManyColumnData";
import type { DataViewColumnDescriptor } from "../data-view/types";
import { buildEntityColumnDescriptors } from "./build-entity-column-descriptors";
import type { UseDataViewWithPaginationResult } from "../../hooks/useDataViewWithPagination";

interface UseEntityListDataViewParams {
  readonly entityName: EntityName;
  readonly items: readonly Record<string, unknown>[];
}

interface UseEntityListDataViewResult {
  readonly dataView: UseDataViewWithPaginationResult<Record<string, unknown>>;
  readonly columnDescriptors: readonly DataViewColumnDescriptor<
    Record<string, unknown>
  >[];
  readonly isLoadingRelations: boolean;
}

export function useEntityListDataView({
  entityName,
  items,
}: UseEntityListDataViewParams): UseEntityListDataViewResult {
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

  const { getCellValue: getOneToManyCellValue, isLoading: isLoadingRelations } =
    useOneToManyColumnData(
      definition,
      items as readonly { readonly id: string }[],
      getDefinition,
    );

  const columnDescriptors = useMemo(() => {
    const base = buildEntityColumnDescriptors({
      definition,
      columns,
      getOneToManyCellValue,
    });

    return base.map((column) => {
      const fieldMeta = definition.fields[column.id];
      if (fieldMeta?.type !== "boolean") {
        return column;
      }

      return {
        ...column,
        getDisplayValue: (item: Record<string, unknown>) => {
          const raw = column.getValue(item);
          if (raw === true) {
            return t("table.booleanYes");
          }
          if (raw === false) {
            return t("table.booleanNo");
          }
          return "—";
        },
      };
    });
  }, [columns, definition, getOneToManyCellValue, t]);

  const dataView = useDataViewWithPagination(items, columnDescriptors);

  return {
    dataView,
    columnDescriptors,
    isLoadingRelations,
  };
}
