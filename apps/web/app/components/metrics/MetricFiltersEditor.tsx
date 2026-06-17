import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Input,
  SearchableMultiSelectDropdown,
  Select,
  Text,
} from "@repo/ui";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { formatFieldLabel } from "../../entities/entity-catalog";
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
  multiselectLabels,
  onChange,
}: {
  readonly row: MetricFilterEditorRow;
  readonly entity: EntityCatalogEntry | undefined;
  readonly disabled?: boolean;
  readonly multiselectLabels: {
    readonly placeholder: string;
    readonly selectedCountLabel: (count: number) => string;
    readonly searchPlaceholder: string;
    readonly noResultsLabel: string;
    readonly removeAriaLabel: (label: string) => string;
  };
  readonly onChange: (patch: Partial<MetricFilterEditorRow>) => void;
}) {
  const { t } = useTranslation("common");
  const fieldMeta = row.field ? entity?.fields[row.field] : undefined;
  const fieldType = fieldMeta?.type ?? "string";

  if (row.op === "in") {
    if (fieldType === "enum" && fieldMeta?.enumValues) {
      const enumOptions = fieldMeta.enumValues.map((value) => ({
        value,
        label: value,
      }));

      return (
        <SearchableMultiSelectDropdown
          options={enumOptions}
          selected={row.listValues}
          onChange={(values) => onChange({ listValues: values })}
          disabled={disabled}
          ariaLabel={t("metrics.filters.value")}
          {...multiselectLabels}
        />
      );
    }

    if (fieldType === "boolean") {
      return (
        <SearchableMultiSelectDropdown
          options={[
            { value: "true", label: t("entity.arrayBooleanTrue") },
            { value: "false", label: t("entity.arrayBooleanFalse") },
          ]}
          selected={row.listValues}
          onChange={(values) => onChange({ listValues: values })}
          disabled={disabled}
          ariaLabel={t("metrics.filters.value")}
          {...multiselectLabels}
        />
      );
    }

    return (
      <Input
        value={
          row.listValues.length > 0
            ? row.listValues.join(", ")
            : row.scalarValue
        }
        disabled={disabled}
        placeholder={t("metrics.filters.listPlaceholder")}
        onChange={(event) => {
          const next = event.target.value;
          onChange({
            scalarValue: next,
            listValues: next
              .split(",")
              .map((part) => part.trim())
              .filter(Boolean),
          });
        }}
      />
    );
  }

  if (fieldType === "enum" && fieldMeta?.enumValues) {
    return (
      <Select
        className={selectClassName}
        value={row.scalarValue}
        disabled={disabled}
        onChange={(event) => onChange({ scalarValue: event.target.value })}
      >
        <option value="">{t("metrics.filters.selectValue")}</option>
        {fieldMeta.enumValues.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </Select>
    );
  }

  if (fieldType === "boolean") {
    return (
      <Select
        className={selectClassName}
        value={row.scalarValue}
        disabled={disabled}
        onChange={(event) => onChange({ scalarValue: event.target.value })}
      >
        <option value="">{t("metrics.filters.selectValue")}</option>
        <option value="true">{t("entity.arrayBooleanTrue")}</option>
        <option value="false">{t("entity.arrayBooleanFalse")}</option>
      </Select>
    );
  }

  return (
    <Input
      value={row.scalarValue}
      disabled={disabled}
      type={fieldType === "number" ? "number" : "text"}
      placeholder={
        fieldType === "relation"
          ? t("metrics.filters.relationPlaceholder")
          : t("metrics.filters.valuePlaceholder")
      }
      onChange={(event) => onChange({ scalarValue: event.target.value })}
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

  const multiselectLabels = {
    placeholder: t("metrics.multiselect.placeholder"),
    selectedCountLabel: (count: number) =>
      t("metrics.multiselect.selectedCount", { count }),
    searchPlaceholder: t("metrics.multiselect.searchPlaceholder"),
    noResultsLabel: t("metrics.multiselect.noResults"),
    removeAriaLabel: (label: string) =>
      t("metrics.multiselect.removeBadge", { label }),
  };

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
                  multiselectLabels={multiselectLabels}
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
