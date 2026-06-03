import { FieldLabel, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { formatFieldLabel } from "../../entities/entity-catalog";
import type { MetricDateGranularity } from "@repo/metrics-engine/browser";

import { listDateFieldsInKeys } from "./metric-field-utils";

const SELECT_CLASS =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

const GRANULARITIES: readonly MetricDateGranularity[] = [
  "day",
  "month",
  "year",
];

interface DateFieldGranularityPickerProps {
  readonly entity: EntityCatalogEntry | undefined;
  readonly groupBy: readonly string[];
  readonly dimensions: readonly string[];
  readonly dateFieldGranularity: Readonly<
    Record<string, MetricDateGranularity>
  >;
  readonly onChange: (
    next: Readonly<Record<string, MetricDateGranularity>>,
  ) => void;
}

export function DateFieldGranularityPicker({
  entity,
  groupBy,
  dimensions,
  dateFieldGranularity,
  onChange,
}: DateFieldGranularityPickerProps) {
  const { t } = useTranslation("common");
  const dateFields = listDateFieldsInKeys(entity, groupBy, dimensions);

  if (dateFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Text className="text-sm font-medium">
        {t("metrics.dateGranularity.title")}
      </Text>
      <Text className="text-muted-foreground text-sm">
        {t("metrics.dateGranularity.description")}
      </Text>
      {dateFields.map((field) => (
        <div key={field}>
          <FieldLabel htmlFor={`metric-date-granularity-${field}`}>
            {formatFieldLabel(field, entity)}
          </FieldLabel>
          <select
            id={`metric-date-granularity-${field}`}
            className={SELECT_CLASS}
            value={dateFieldGranularity[field] ?? ""}
            onChange={(event) => {
              const value = event.target.value as MetricDateGranularity | "";
              if (!value) {
                const { [field]: _removed, ...rest } = dateFieldGranularity;
                void _removed;
                onChange(rest);
                return;
              }
              onChange({ ...dateFieldGranularity, [field]: value });
            }}
            required
          >
            <option value="">{t("metrics.dateGranularity.select")}</option>
            {GRANULARITIES.map((granularity) => (
              <option key={granularity} value={granularity}>
                {t(`metrics.dateGranularity.options.${granularity}`)}
              </option>
            ))}
          </select>
          {dateFieldGranularity[field] ? (
            <Text className="text-muted-foreground mt-1 text-xs">
              {t("metrics.dateGranularity.hint", {
                format: t(
                  `metrics.dateGranularity.formats.${dateFieldGranularity[field]}`,
                ),
              })}
            </Text>
          ) : null}
        </div>
      ))}
    </div>
  );
}
