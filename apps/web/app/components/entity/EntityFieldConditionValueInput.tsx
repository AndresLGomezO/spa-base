import { useTranslation } from "react-i18next";

import { Input, SearchableMultiSelectDropdown } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";

import type {
  EntityFieldConditionFieldMeta,
  EntityFieldConditionOperator,
} from "./entity-field-condition-utils.js";

const defaultSelectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

interface EntityFieldConditionValueInputProps {
  readonly fieldMeta: EntityFieldConditionFieldMeta | undefined;
  readonly operator: EntityFieldConditionOperator;
  readonly value: string | readonly string[];
  readonly onChange: (value: string | readonly string[]) => void;
  readonly disabled?: boolean;
  readonly selectClassName?: string;
  readonly listPlaceholderKey?:
    | "metrics.filters.listPlaceholder"
    | "queryBuilder.filters.listPlaceholder";
  readonly valuePlaceholderKey?:
    | "metrics.filters.valuePlaceholder"
    | "queryBuilder.filters.valuePlaceholder";
  readonly relationPlaceholderKey?: "metrics.filters.relationPlaceholder";
}

export function EntityFieldConditionValueInput({
  fieldMeta,
  operator,
  value,
  onChange,
  disabled = false,
  selectClassName = defaultSelectClassName,
  listPlaceholderKey = "metrics.filters.listPlaceholder",
  valuePlaceholderKey = "metrics.filters.valuePlaceholder",
  relationPlaceholderKey = "metrics.filters.relationPlaceholder",
}: EntityFieldConditionValueInputProps) {
  const { t } = useTranslation("common");
  const fieldType = fieldMeta?.type ?? "string";

  const multiselectLabels = {
    placeholder: t("metrics.multiselect.placeholder"),
    selectedCountLabel: (count: number) =>
      t("metrics.multiselect.selectedCount", { count }),
    searchPlaceholder: t("metrics.multiselect.searchPlaceholder"),
    noResultsLabel: t("metrics.multiselect.noResults"),
    removeAriaLabel: (label: string) =>
      t("metrics.multiselect.removeBadge", { label }),
  };

  if (operator === "in") {
    if (fieldType === "enum" && fieldMeta?.enumValues) {
      const enumOptions = fieldMeta.enumValues.map((entry) => ({
        value: entry,
        label: entry,
      }));
      const selected = Array.isArray(value)
        ? value
        : typeof value === "string" && value.trim()
          ? [value]
          : [];

      return (
        <SearchableMultiSelectDropdown
          options={enumOptions}
          selected={selected}
          onChange={(values) => onChange(values)}
          disabled={disabled}
          ariaLabel={t("metrics.filters.value")}
          {...multiselectLabels}
        />
      );
    }

    if (fieldType === "boolean") {
      const selected = Array.isArray(value)
        ? value
        : typeof value === "string" && value.trim()
          ? [value]
          : [];

      return (
        <SearchableMultiSelectDropdown
          options={[
            { value: "true", label: t("entity.arrayBooleanTrue") },
            { value: "false", label: t("entity.arrayBooleanFalse") },
          ]}
          selected={selected}
          onChange={(values) => onChange(values)}
          disabled={disabled}
          ariaLabel={t("metrics.filters.value")}
          {...multiselectLabels}
        />
      );
    }

    const listText = Array.isArray(value) ? value.join(", ") : value;

    return (
      <Input
        value={listText}
        disabled={disabled}
        placeholder={t(listPlaceholderKey)}
        onChange={(event) => {
          const next = event.target.value;
          onChange(
            next
              .split(",")
              .map((part) => part.trim())
              .filter((part) => part.length > 0),
          );
        }}
      />
    );
  }

  const scalarValue = Array.isArray(value) ? (value[0] ?? "") : value;

  if (fieldType === "enum" && fieldMeta?.enumValues) {
    return (
      <Select
        className={selectClassName}
        value={scalarValue}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{t("queryBuilder.filters.selectValue")}</option>
        {fieldMeta.enumValues.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </Select>
    );
  }

  if (fieldType === "boolean") {
    return (
      <Select
        className={selectClassName}
        value={scalarValue}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{t("queryBuilder.filters.selectValue")}</option>
        <option value="true">{t("entity.arrayBooleanTrue")}</option>
        <option value="false">{t("entity.arrayBooleanFalse")}</option>
      </Select>
    );
  }

  return (
    <Input
      value={scalarValue}
      disabled={disabled}
      type={fieldType === "number" ? "number" : "text"}
      placeholder={
        fieldType === "relation"
          ? t(relationPlaceholderKey)
          : t(valuePlaceholderKey)
      }
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
