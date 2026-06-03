import { useMemo } from "react";
import { getTableColumns } from "@repo/ui-builder";
import {
  SchemaCell,
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "@repo/ui";
import type { SerializableEntityDefinition } from "@repo/entities";
import { useTranslation } from "react-i18next";

import { formatFieldLabel } from "../../entities/entity-catalog";
import {
  getEntityCellDisplayMeta,
  getEntityCellSchemaValue,
} from "../../components/entity/resolve-entity-cell-value";

interface EntityListTableLayoutPreviewProps {
  readonly definition: SerializableEntityDefinition;
  readonly tableFields: readonly string[];
  readonly showActions?: boolean;
  readonly previewItem: Record<string, unknown> | null;
  readonly title: string;
  readonly locale: string;
}

export function EntityListTableLayoutPreview({
  definition,
  tableFields,
  showActions = true,
  previewItem,
  title,
  locale,
}: EntityListTableLayoutPreviewProps) {
  const { t } = useTranslation("common");

  const columns = useMemo(() => {
    if (tableFields.length > 0) {
      return tableFields;
    }
    return getTableColumns(definition);
  }, [definition, tableFields]);

  const item = previewItem ?? {};

  return (
    <div className="flex flex-col gap-2">
      <Text className="font-medium">{title}</Text>
      <TableCard className="w-full overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>
                    {formatFieldLabel(column, definition)}
                  </TableHead>
                ))}
                {showActions ? (
                  <TableHead className="text-center">
                    {t("entity.actions")}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {columns.map((column) => {
                  const {
                    fieldType,
                    displayFormat,
                    dateDisplayFormat,
                    fallbackImageUrl,
                  } = getEntityCellDisplayMeta(column, definition);
                  return (
                    <TableCell key={column}>
                      <SchemaCell
                        value={getEntityCellSchemaValue(
                          item,
                          column,
                          definition,
                          () => null,
                        )}
                        fieldType={fieldType}
                        displayFormat={displayFormat}
                        dateDisplayFormat={dateDisplayFormat}
                        fieldName={column}
                        fallbackImageUrl={fallbackImageUrl}
                        locale={locale}
                        trueLabel={t("table.booleanYes")}
                        falseLabel={t("table.booleanNo")}
                      />
                    </TableCell>
                  );
                })}
                {showActions ? (
                  <TableCell className="text-muted-foreground text-center text-sm">
                    …
                  </TableCell>
                ) : null}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </TableCard>
    </div>
  );
}
