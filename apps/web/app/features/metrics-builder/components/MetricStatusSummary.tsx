import { useTranslation } from "react-i18next";

import {
  METRIC_MODE_BADGE_CLASS,
  METRIC_STATUS_BADGE_CLASS,
  metricModeLabelKey,
  metricStatusLabelKey,
  type MetricModeFilter,
  type MetricStatusFilter,
} from "../metric-list-styles";

export function MetricStatusSummary({
  modeCounts,
  statusCounts,
  total,
}: {
  readonly modeCounts: Readonly<Partial<Record<MetricModeFilter, number>>>;
  readonly statusCounts: Readonly<Partial<Record<MetricStatusFilter, number>>>;
  readonly total: number;
}) {
  const { t } = useTranslation("common");

  const modeEntries = (
    Object.entries(modeCounts) as [MetricModeFilter, number][]
  ).filter(([, count]) => count > 0);

  const statusEntries = (
    Object.entries(statusCounts) as [MetricStatusFilter, number][]
  ).filter(([, count]) => count > 0);

  const showModeSummary = modeEntries.length > 1;

  if (total <= 0 || (statusEntries.length === 0 && !showModeSummary)) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 pb-1">
      {showModeSummary
        ? modeEntries.map(([mode, count]) => {
            const percent =
              total > 0 ? Math.round((count / total) * 100) : undefined;

            return (
              <span
                key={`mode:${mode}`}
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  METRIC_MODE_BADGE_CLASS[mode]
                }`}
              >
                {t("metrics.workbench.list.summary", {
                  count,
                  status: t(metricModeLabelKey(mode)),
                  percent,
                })}
              </span>
            );
          })
        : null}
      {statusEntries.map(([status, count]) => {
        const percent =
          total > 0 ? Math.round((count / total) * 100) : undefined;

        return (
          <span
            key={`status:${status}`}
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
              METRIC_STATUS_BADGE_CLASS[status]
            }`}
          >
            {t("metrics.workbench.list.summary", {
              count,
              status: t(metricStatusLabelKey(status)),
              percent,
            })}
          </span>
        );
      })}
    </div>
  );
}
