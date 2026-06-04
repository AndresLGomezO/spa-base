import { useTranslation } from "react-i18next";
import { Lock, Pencil, Trash2 } from "lucide-react";

import {
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "@repo/ui";

import type { FieldDefinitionInput } from "../../lib/api-client";

import {
  computeFieldIndexContribution,
  formatFieldIndexContribution,
  type PlanEntityIndexesInput,
} from "./plan-entity-indexes";
import {
  sortIndexedFieldDefinitions,
  summarizeFieldDetails,
} from "./field-definition-utils";

interface FieldDefinitionTableProps {
  readonly fields: readonly FieldDefinitionInput[];
  readonly canEdit: boolean;
  readonly onEdit: (index: number) => void;
  readonly onDelete?: (index: number) => void;
  readonly planInput?: PlanEntityIndexesInput;
}

function isFilterableColumn(field: FieldDefinitionInput): boolean {
  return field.ui?.filterable !== false;
}

function isSortableColumn(field: FieldDefinitionInput): boolean {
  return field.ui?.sortable !== false;
}

export function FieldDefinitionTable({
  fields,
  canEdit,
  onEdit,
  onDelete,
  planInput,
}: FieldDefinitionTableProps) {
  const { t } = useTranslation("common");
  const sortedFields = sortIndexedFieldDefinitions(fields);

  if (fields.length === 0) {
    return (
      <Text className="text-muted-foreground py-8 text-center text-sm">
        {t("dataModels.fieldsTableEmpty")}
      </Text>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">
            {t("dataModels.fieldOrderColumn")}
          </TableHead>
          <TableHead>{t("dataModels.fieldNameColumn")}</TableHead>
          <TableHead className="w-32">
            {t("dataModels.fieldTypeColumn")}
          </TableHead>
          <TableHead className="w-24">
            {t("dataModels.fieldRequiredColumn")}
          </TableHead>
          <TableHead>{t("dataModels.fieldDetailsColumn")}</TableHead>
          {planInput ? (
            <>
              <TableHead className="w-24 text-center">
                {t("dataModels.indexPlan.filterableColumn")}
              </TableHead>
              <TableHead className="w-24 text-center">
                {t("dataModels.indexPlan.sortableColumn")}
              </TableHead>
              <TableHead className="w-28 text-center">
                {t("dataModels.indexPlan.contributionColumn")}
              </TableHead>
            </>
          ) : null}
          {canEdit ? (
            <TableHead className="w-24 text-center">
              {t("entity.actions")}
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedFields.map(({ field, index }) => {
          const details = summarizeFieldDetails(field, t);

          return (
            <TableRow key={`${field.name}-${index}`}>
              <TableCell>{field.ui?.order ?? index}</TableCell>
              <TableCell className="font-mono">
                <span className="inline-flex items-center gap-1">
                  {field.name || "—"}
                  {field.sensitive ? (
                    <Lock className="text-muted-foreground size-3.5" />
                  ) : null}
                </span>
              </TableCell>
              <TableCell>{t(`dataModels.fieldTypes.${field.type}`)}</TableCell>
              <TableCell>
                {field.required ? t("table.booleanYes") : t("table.booleanNo")}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {details || "—"}
              </TableCell>
              {planInput ? (
                <>
                  <TableCell className="text-center text-sm">
                    {isFilterableColumn(field)
                      ? t("table.booleanYes")
                      : t("table.booleanNo")}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {isSortableColumn(field)
                      ? t("table.booleanYes")
                      : t("table.booleanNo")}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {formatFieldIndexContribution(
                      computeFieldIndexContribution(planInput, index),
                    )}
                  </TableCell>
                </>
              ) : null}
              {canEdit ? (
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <IconButton
                      type="button"
                      label={t("dataModels.editField")}
                      onClick={() => onEdit(index)}
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    {onDelete && fields.length > 1 ? (
                      <IconButton
                        type="button"
                        label={t("dataModels.removeField")}
                        onClick={() => onDelete(index)}
                      >
                        <Trash2 className="text-destructive size-4" />
                      </IconButton>
                    ) : null}
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
