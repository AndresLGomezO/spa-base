import { useCallback, useMemo } from "react";
import { getListToolbarFields, isFieldVisible } from "@repo/ui-builder";
import { useTranslation } from "react-i18next";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import {
  getFieldAccessLevel,
  useFieldAccess,
} from "../../hooks/useFieldAccess";
import type { DataViewColumnDescriptor } from "@repo/data-view";
import { buildEntityColumnDescriptors } from "./build-entity-column-descriptors";

export function useEntityColumnDescriptors(
  entityName: EntityName,
): readonly DataViewColumnDescriptor<Record<string, unknown>>[] {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const permissions = useEntityPermissions(entityName);
  const fieldAccess = useFieldAccess(entityName);

  const noopOneToManyCellValue = useCallback(
    (_recordId: string, _columnName: string) => {
      void _recordId;
      void _columnName;
      return null;
    },
    [],
  );

  const columns = useMemo(
    () =>
      getListToolbarFields(definition).filter((column) =>
        isFieldVisible(
          definition.ui.fields?.[column],
          permissions.canRead,
          getFieldAccessLevel(fieldAccess, column),
        ),
      ),
    [definition, fieldAccess, permissions.canRead],
  );

  return useMemo(() => {
    const base = buildEntityColumnDescriptors({
      definition,
      columns,
      getOneToManyCellValue: noopOneToManyCellValue,
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
  }, [columns, definition, noopOneToManyCellValue, t]);
}
