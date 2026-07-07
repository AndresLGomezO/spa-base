import { useTranslation } from "react-i18next";

import {
  ENTITY_QUERY_MODE_BADGE_CLASS,
  ENTITY_QUERY_STATUS_BADGE_CLASS,
  entityQueryModeLabelKey,
  entityQueryStatusLabelKey,
  type EntityQueryModeFilter,
  type EntityQueryStatusFilter,
} from "../entity-query-list-styles";

export function EntityQueryStatusSummary({
  statusCounts,
  queryModeCounts,
  total,
}: {
  readonly statusCounts: Readonly<
    Partial<Record<EntityQueryStatusFilter, number>>
  >;
  readonly queryModeCounts: Readonly<
    Partial<Record<EntityQueryModeFilter, number>>
  >;
  readonly total: number;
}) {
  const { t } = useTranslation("common");

  const statusEntries = (
    Object.entries(statusCounts) as [EntityQueryStatusFilter, number][]
  ).filter(([, count]) => count > 0);

  const modeEntries = (
    Object.entries(queryModeCounts) as [EntityQueryModeFilter, number][]
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
                  ENTITY_QUERY_MODE_BADGE_CLASS[mode]
                }`}
              >
                {t("queryBuilder.list.summary", {
                  count,
                  status: t(entityQueryModeLabelKey(mode)),
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
              ENTITY_QUERY_STATUS_BADGE_CLASS[status]
            }`}
          >
            {t("queryBuilder.list.summary", {
              count,
              status: t(entityQueryStatusLabelKey(status)),
              percent,
            })}
          </span>
        );
      })}
    </div>
  );
}
