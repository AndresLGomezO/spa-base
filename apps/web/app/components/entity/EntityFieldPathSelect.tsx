import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Select } from "@repo/ui";

import type { EntityCatalogEntry } from "../../entities/entity-catalog.js";
import { listDirectEntityFieldOptions } from "./entity-field-condition-utils.js";

const defaultSelectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

interface EntityFieldPathSelectProps {
  readonly entity: EntityCatalogEntry | undefined;
  readonly value: string;
  readonly onChange: (fieldPath: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function EntityFieldPathSelect({
  entity,
  value,
  onChange,
  disabled = false,
  className = defaultSelectClassName,
}: EntityFieldPathSelectProps) {
  const { t } = useTranslation("common");
  const options = useMemo(() => listDirectEntityFieldOptions(entity), [entity]);

  return (
    <Select
      className={className}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{t("queryBuilder.selectField")}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
