import {
  DatePicker,
  MonthYearPicker,
  YearPicker,
  buildIsoForMode,
  parseDayBucket,
  type DatePickerLabels,
} from "@repo/ui";
import type { ViewFilterDateGranularity } from "@repo/ui-builder-core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { getCurrentDateBucket } from "./use-dashboard-date-filter-url-state";

interface ViewFilterDateFieldProps {
  readonly granularity: ViewFilterDateGranularity;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly locale: string;
  readonly isExplicit?: boolean;
}

function bucketToIsoDate(value: string): string | undefined {
  const parts = parseDayBucket(value);
  if (!parts) {
    return undefined;
  }

  return buildIsoForMode("date", {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 0,
    minute: 0,
  });
}

function isoDateToBucket(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ViewFilterDateField({
  granularity,
  value,
  onChange,
  locale,
  isExplicit = false,
}: ViewFilterDateFieldProps) {
  const { t } = useTranslation("common");

  const defaultValue = useMemo(
    () => getCurrentDateBucket(granularity),
    [granularity],
  );

  const showClearButton = isExplicit || value !== defaultValue;

  const handleClear = () => {
    onChange(defaultValue);
  };

  const labels: DatePickerLabels = {
    placeholder: t("viewFilterComponents.dateFilterPlaceholder"),
    previous: t("viewFilterComponents.dateFilterPrevious"),
    next: t("viewFilterComponents.dateFilterNext"),
    selectYear: t("viewFilterComponents.dateFilterSelectYear"),
    selectMonth: t("viewFilterComponents.dateFilterSelectMonth"),
    openCalendar: t("viewFilterComponents.dateFilterOpenCalendar"),
    clear: t("viewFilterComponents.dateFilterClear"),
  };

  const clearAriaLabel = t("viewFilterComponents.dateFilterResetDefault");
  const clearProps = {
    showClearButton,
    onClear: handleClear,
    clearAriaLabel,
  };

  if (granularity === "year") {
    return (
      <YearPicker
        value={value}
        onChange={onChange}
        locale={locale}
        labels={labels}
        compact
        {...clearProps}
      />
    );
  }

  if (granularity === "month") {
    return (
      <MonthYearPicker
        value={value}
        onChange={onChange}
        locale={locale}
        labels={labels}
        compact
        {...clearProps}
      />
    );
  }

  return (
    <DatePicker
      mode="date"
      value={bucketToIsoDate(value) ?? null}
      onChange={(next) => {
        const bucket = isoDateToBucket(next);
        if (bucket) {
          onChange(bucket);
        }
      }}
      locale={locale}
      labels={labels}
      compact
      {...clearProps}
    />
  );
}
