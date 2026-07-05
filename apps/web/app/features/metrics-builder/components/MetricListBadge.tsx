import { useTranslation } from "react-i18next";

import {
  METRIC_MODE_BADGE_CLASS,
  METRIC_SOURCE_TYPE_BADGE_CLASS,
  METRIC_STATUS_BADGE_CLASS,
  metricModeLabelKey,
  metricSourceTypeLabelKey,
  metricStatusLabelKey,
  type MetricModeFilter,
  type MetricSourceTypeFilter,
  type MetricStatusFilter,
} from "../metric-list-styles";

export function MetricListBadge({
  kind,
  value,
  size = "default",
}: {
  readonly kind: "sourceType" | "mode" | "status";
  readonly value:
    | MetricSourceTypeFilter
    | MetricModeFilter
    | MetricStatusFilter;
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");

  const label =
    kind === "sourceType"
      ? t(metricSourceTypeLabelKey(value as MetricSourceTypeFilter))
      : kind === "mode"
        ? t(metricModeLabelKey(value as MetricModeFilter))
        : t(metricStatusLabelKey(value as MetricStatusFilter));

  const badgeClass =
    kind === "sourceType"
      ? METRIC_SOURCE_TYPE_BADGE_CLASS[value as MetricSourceTypeFilter]
      : kind === "mode"
        ? METRIC_MODE_BADGE_CLASS[value as MetricModeFilter]
        : METRIC_STATUS_BADGE_CLASS[value as MetricStatusFilter];

  const sizeClass =
    size === "compact"
      ? "px-1.5 py-0 text-[10px] leading-4"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full font-medium ${sizeClass} ${badgeClass}`}
    >
      {label}
    </span>
  );
}
