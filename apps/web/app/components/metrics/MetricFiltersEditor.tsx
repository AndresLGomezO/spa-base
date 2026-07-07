import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { formatFieldLabel } from "../../entities/entity-catalog";
import { EntityFieldConditionValueInput } from "../entity/EntityFieldConditionValueInput";
import { resolveEntityFieldMeta } from "../entity/entity-field-condition-utils";
import { MetricFieldLabel } from "./MetricFieldHelp";
import {
  createEmptyMetricFilterEditorRow,
  listMetricFilterFieldOptions,
  type MetricFilterEditorRow,
} from "./metric-field-utils";

interface MetricFiltersEditorProps {
  readonly entity: EntityCatalogEntry | undefined;
  readonly rows: readonly MetricFilterEditorRow[];
  readonly disabled?: boolean;
  readonly onChange: (rows: readonly MetricFilterEditorRow[]) => void;
}

const selectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

function updateRow(
  rows: readonly MetricFilterEditorRow[],
  id: string,
  patch: Partial<MetricFilterEditorRow>,
): MetricFilterEditorRow[] {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

function MetricFilterValueEditor({
  row,
  entity,
  disabled,
  onChange,
}: {
  readonly row: MetricFilterEditorRow;
  readonly entity: EntityCatalogEntry | undefined;
  readonly disabled?: boolean;
  readonly onChange: (patch: Partial<MetricFilterEditorRow>) => void;
}) {
  const fieldMeta = row.field
    ? resolveEntityFieldMeta(entity, row.field)
    : undefined;
  const operator = row.op === "in" ? "in" : "==";
  const value = row.op === "in" ? row.listValues : row.scalarValue;

  return (
    <EntityFieldConditionValueInput
      fieldMeta={fieldMeta}
      operator={operator}
      value={value}
      disabled={disabled}
      onChange={(nextValue) => {
        if (row.op === "in") {
          onChange({
            listValues: Array.isArray(nextValue) ? nextValue : [nextValue],
            scalarValue: Array.isArray(nextValue)
              ? nextValue.join(", ")
              : typeof nextValue === "string"
                ? nextValue
                : nextValue.join(", "),
          });
          return;
        }

        onChange({
          scalarValue: Array.isArray(nextValue)
            ? (nextValue[0] ?? "")
            : nextValue,
        });
      }}
    />
  );
}

export function MetricFiltersEditor({
  entity,
  rows,
  disabled = false,
  onChange,
}: MetricFiltersEditorProps) {
  const { t } = useTranslation("common");

  const fieldOptions = useMemo(
    () => listMetricFilterFieldOptions(entity),
    [entity],
  );

  return (
    <div className="space-y-3">
      <MetricFieldLabel
        htmlFor="metric-filters"
        label={t("metrics.filters.label")}
        fieldKey="filters"
      />

      {rows.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("metrics.filters.empty")}
        </Text>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="border-border space-y-2 rounded-md border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <Text className="text-sm font-medium">
                  {t("metrics.filters.rowLabel", { index: index + 1 })}
                </Text>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    onChange(
                      rows.filter((candidate) => candidate.id !== row.id),
                    )
                  }
                >
                  {t("metrics.filters.remove")}
                </Button>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">
                  {t("metrics.filters.field")}
                </span>
                <Select
                  className={selectClassName}
                  value={row.field}
                  disabled={disabled}
                  onChange={(event) => {
                    const nextField = event.target.value;
                    onChange(
                      updateRow(rows, row.id, {
                        field: nextField,
                        scalarValue: "",
                        listValues: [],
                      }),
                    );
                  }}
                >
                  <option value="">{t("metrics.selectField")}</option>
                  {fieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>

              {row.field ? (
                <Text className="text-muted-foreground text-xs">
                  {formatFieldLabel(row.field, entity)}
                </Text>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">
                  {t("metrics.filters.operator")}
                </span>
                <Select
                  className={selectClassName}
                  value={row.op}
                  disabled={disabled || !row.field}
                  onChange={(event) => {
                    const nextOp = event.target.value as "eq" | "in";
                    onChange(
                      updateRow(rows, row.id, {
                        op: nextOp,
                        scalarValue: "",
                        listValues: [],
                      }),
                    );
                  }}
                >
                  <option value="eq">
                    {t("metrics.filters.operators.eq")}
                  </option>
                  <option value="in">
                    {t("metrics.filters.operators.in")}
                  </option>
                </Select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">
                  {t("metrics.filters.value")}
                </span>
                <MetricFilterValueEditor
                  row={row}
                  entity={entity}
                  disabled={disabled || !row.field}
                  onChange={(patch) => onChange(updateRow(rows, row.id, patch))}
                />
              </label>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        disabled={disabled || !entity}
        onClick={() => onChange([...rows, createEmptyMetricFilterEditorRow()])}
      >
        {t("metrics.filters.add")}
      </Button>
    </div>
  );
}
