import {
  DatePicker,
  MonthYearPicker,
  YearPicker,
  buildIsoForMode,
  parseDayBucket,
  type DatePickerLabels,
  type DatePickerPreset,
} from "@repo/ui";
import type { ViewFilterDateGranularity } from "@repo/ui-builder-core";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  getCurrentDateBucket,
  getRelativeDateBucket,
} from "./use-dashboard-date-filter-url-state";

interface ViewFilterDateFieldProps {
  readonly granularity: ViewFilterDateGranularity;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly locale: string;
  readonly isExplicit?: boolean;
  readonly inputClassName?: string;
  readonly inputStyle?: CSSProperties;
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

function buildPeriodPresets(
  granularity: ViewFilterDateGranularity,
  labels: {
    readonly thisPeriod: string;
    readonly lastPeriod: string;
  },
): readonly DatePickerPreset[] {
  return [
    {
      label: labels.thisPeriod,
      value: getRelativeDateBucket(granularity, 0),
    },
    {
      label: labels.lastPeriod,
      value: getRelativeDateBucket(granularity, -1),
    },
  ];
}

export function ViewFilterDateField({
  granularity,
  value,
  onChange,
  locale,
  isExplicit = false,
  inputClassName,
  inputStyle,
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

  const presets = useMemo((): readonly DatePickerPreset[] => {
    const thisPeriod =
      granularity === "year"
        ? t("viewFilterComponents.dateFilterPresetThisYear")
        : granularity === "month"
          ? t("viewFilterComponents.dateFilterPresetThisMonth")
          : t("viewFilterComponents.dateFilterPresetToday");
    const lastPeriod =
      granularity === "year"
        ? t("viewFilterComponents.dateFilterPresetLastYear")
        : granularity === "month"
          ? t("viewFilterComponents.dateFilterPresetLastMonth")
          : t("viewFilterComponents.dateFilterPresetYesterday");

    return buildPeriodPresets(granularity, { thisPeriod, lastPeriod });
  }, [granularity, t]);

  const dayPresets = useMemo((): readonly DatePickerPreset[] => {
    return presets.flatMap((preset) => {
      const iso = bucketToIsoDate(preset.value);
      return iso ? [{ label: preset.label, value: iso }] : [];
    });
  }, [presets]);

  const clearAriaLabel = t("viewFilterComponents.dateFilterResetDefault");
  const clearProps = {
    showClearButton,
    onClear: handleClear,
    clearAriaLabel,
  };

  const pickerProps = {
    value,
    onChange,
    locale,
    labels,
    compact: true as const,
    inputClassName,
    inputStyle,
    presets,
    ...clearProps,
  };

  if (granularity === "year") {
    return <YearPicker {...pickerProps} />;
  }

  if (granularity === "month") {
    return <MonthYearPicker {...pickerProps} />;
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
      inputClassName={inputClassName}
      inputStyle={inputStyle}
      presets={dayPresets}
      {...clearProps}
    />
  );
}
